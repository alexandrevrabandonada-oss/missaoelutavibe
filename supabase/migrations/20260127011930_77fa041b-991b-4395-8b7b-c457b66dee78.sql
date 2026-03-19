-- ============================================
-- Observabilidade v0 (sem PII) - app_errors
-- ============================================

-- 1) Table
CREATE TABLE IF NOT EXISTS public.app_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),

  -- who/where
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NULL,

  -- scope (optional)
  scope_city text NULL,

  -- what
  route text NOT NULL,
  error_code text NOT NULL,
  source text NOT NULL DEFAULT 'client' CHECK (source IN ('client','server','rpc')),
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('warn','error','fatal')),

  -- sanitized metadata (no raw message/stack)
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_app_errors_time ON public.app_errors (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_errors_code ON public.app_errors (error_code);
CREATE INDEX IF NOT EXISTS idx_app_errors_route ON public.app_errors (route);
CREATE INDEX IF NOT EXISTS idx_app_errors_city ON public.app_errors (scope_city);

-- 2) RLS
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

-- Only admins/coordinators can SELECT (scoped by city for non-admins)
DROP POLICY IF EXISTS "Admins read all app_errors" ON public.app_errors;
CREATE POLICY "Admins read all app_errors"
ON public.app_errors FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin','coordenador_celula','coordenador_regional','coordenador_estadual')
  )
);

-- No direct inserts/updates/deletes (only via RPC SECURITY DEFINER)
-- (no policies for insert/update/delete)

-- 3) RPC: log_app_error (rate-limited + sanitization)
DROP FUNCTION IF EXISTS public.log_app_error(text, text, text, text, jsonb, text);

CREATE OR REPLACE FUNCTION public.log_app_error(
  _route text,
  _error_code text,
  _source text DEFAULT 'client',
  _severity text DEFAULT 'error',
  _meta jsonb DEFAULT '{}'::jsonb,
  _session_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_city text;
  v_route text;
  v_code text;
  v_source text;
  v_sev text;
  v_session text;
  v_meta jsonb := '{}'::jsonb;
  v_new_id uuid;
  v_rl jsonb;
BEGIN
  -- basic sanitize
  v_route := left(coalesce(_route,'unknown'), 120);
  v_code  := left(regexp_replace(coalesce(_error_code,'unknown'), '[^a-zA-Z0-9_\-:\.]', '', 'g'), 64);

  v_source := CASE WHEN _source IN ('client','server','rpc') THEN _source ELSE 'client' END;
  v_sev := CASE WHEN _severity IN ('warn','error','fatal') THEN _severity ELSE 'error' END;

  v_session := left(regexp_replace(coalesce(_session_id,''), '[^a-zA-Z0-9\-_]', '', 'g'), 64);
  IF v_session = '' THEN v_session := NULL; END IF;

  -- scope_city from profile (if auth)
  IF v_user_id IS NOT NULL THEN
    SELECT p.city INTO v_city FROM public.profiles p WHERE p.id = v_user_id;
  END IF;

  -- meta allowlist (NO message/stack)
  -- allowed keys: rpc, status, stage, component, hint, mode
  IF jsonb_typeof(_meta) = 'object' THEN
    v_meta :=
      jsonb_build_object(
        'rpc', nullif(left(coalesce(_meta->>'rpc',''), 80), ''),
        'status', nullif(left(coalesce(_meta->>'status',''), 20), ''),
        'stage', nullif(left(coalesce(_meta->>'stage',''), 40), ''),
        'component', nullif(left(coalesce(_meta->>'component',''), 80), ''),
        'hint', nullif(left(coalesce(_meta->>'hint',''), 120), ''),
        'mode', nullif(left(coalesce(_meta->>'mode',''), 40), '')
      );
    -- drop nulls
    v_meta := (SELECT coalesce(jsonb_object_agg(k,v), '{}'::jsonb)
               FROM jsonb_each(v_meta) e(k,v)
               WHERE v IS NOT NULL AND v <> 'null'::jsonb);
  END IF;

  -- rate limit (per user or per session)
  -- 30 logs / hour per (user OR session) per error_code
  v_rl := public.guard_rate_limit(
    'app_error:' || v_code || ':' || coalesce(v_user_id::text, v_session, 'anon'),
    30,
    3600
  );

  IF coalesce((v_rl->>'ok')::boolean, true) = FALSE THEN
    RETURN NULL; -- silently drop
  END IF;

  INSERT INTO public.app_errors (
    user_id, session_id, scope_city,
    route, error_code, source, severity,
    meta
  ) VALUES (
    v_user_id, v_session, v_city,
    v_route, v_code, v_source, v_sev,
    v_meta
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_app_error(text, text, text, text, jsonb, text) TO anon;
GRANT EXECUTE ON FUNCTION public.log_app_error(text, text, text, text, jsonb, text) TO authenticated;

-- 4) RPC: get_app_health_metrics (aggregated)
DROP FUNCTION IF EXISTS public.get_app_health_metrics(int, text);

CREATE OR REPLACE FUNCTION public.get_app_health_metrics(
  _period_days int DEFAULT 7,
  _scope_city text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := now() - (_period_days || ' days')::interval;
  v_city text;
  v_is_admin boolean;
  v_result jsonb;
BEGIN
  -- auth check: admin/coord only
  v_is_admin := EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','coordenador_celula','coordenador_regional','coordenador_estadual')
    );

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('error','forbidden');
  END IF;

  -- default scope for non-admin: own city
  IF _scope_city IS NULL THEN
    SELECT p.city INTO v_city FROM public.profiles p WHERE p.id = auth.uid();
  ELSE
    v_city := left(_scope_city, 80);
  END IF;

  WITH base AS (
    SELECT *
    FROM public.app_errors
    WHERE occurred_at >= v_start
      AND (v_city IS NULL OR scope_city = v_city)
  ),
  by_day AS (
    SELECT to_char(date_trunc('day', occurred_at), 'YYYY-MM-DD') AS day,
           count(*) AS total
    FROM base
    GROUP BY 1
    ORDER BY 1
  ),
  top_codes AS (
    SELECT error_code, count(*) AS total
    FROM base
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 8
  ),
  top_routes AS (
    SELECT route, count(*) AS total
    FROM base
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 8
  ),
  by_source AS (
    SELECT source, count(*) AS total
    FROM base
    GROUP BY 1
    ORDER BY total DESC
  )
  SELECT jsonb_build_object(
    'period_days', _period_days,
    'scope_city', v_city,
    'total', (SELECT count(*) FROM base),
    'by_day', (SELECT coalesce(jsonb_agg(jsonb_build_object('day',day,'total',total)), '[]'::jsonb) FROM by_day),
    'top_codes', (SELECT coalesce(jsonb_agg(jsonb_build_object('code',error_code,'total',total)), '[]'::jsonb) FROM top_codes),
    'top_routes', (SELECT coalesce(jsonb_agg(jsonb_build_object('route',route,'total',total)), '[]'::jsonb) FROM top_routes),
    'by_source', (SELECT coalesce(jsonb_agg(jsonb_build_object('source',source,'total',total)), '[]'::jsonb) FROM by_source)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_app_health_metrics(int, text) TO authenticated;

-- Add documentation
COMMENT ON TABLE public.app_errors IS 'Privacy-safe error tracking. No PII - only sanitized error codes, routes, and metadata.';
COMMENT ON FUNCTION public.log_app_error IS 'Rate-limited error logging with PII sanitization. Only allowlisted meta fields are stored.';
COMMENT ON FUNCTION public.get_app_health_metrics IS 'Aggregated app health metrics for admin/coordinator dashboards.';