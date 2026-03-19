-- ============================================
-- FIX: log_growth_event - Drop old and recreate with new signature
-- ============================================

-- Drop the old function (with 4 parameters)
DROP FUNCTION IF EXISTS public.log_growth_event(TEXT, UUID, TEXT, JSONB);

-- Add session_id column to growth_events for anonymous deduplication (if not exists)
ALTER TABLE growth_events ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Create index for rate limiting by session
CREATE INDEX IF NOT EXISTS idx_growth_events_session_rate 
  ON growth_events (session_id, event_type, occurred_at DESC);

-- 1) Recreate log_growth_event with full anonymous support, whitelist, sanitization, and rate limiting
CREATE OR REPLACE FUNCTION public.log_growth_event(
  _event_type TEXT,
  _template_id UUID DEFAULT NULL,
  _invite_code TEXT DEFAULT NULL,
  _meta JSONB DEFAULT '{}'::jsonb,
  _session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_referrer_user_id UUID;
  v_scope_cidade TEXT;
  v_event_id UUID;
  v_existing_count INT;
  v_rate_count INT;
  v_sanitized_cidade TEXT;
  v_sanitized_meta JSONB;
  v_clean_session TEXT;
  v_allowed_events TEXT[] := ARRAY[
    'visit', 'visit_comecar', 'signup', 'territory_link_open', 
    'invite_form_open', 'invite_shared', 'invite_qr_opened', 
    'approved', 'onboarding_complete', 'first_action', 'template_share'
  ];
BEGIN
  v_user_id := auth.uid();
  
  -- 1) Whitelist event types - silently ignore invalid ones (no error)
  IF NOT (_event_type = ANY(v_allowed_events)) THEN
    RETURN NULL;
  END IF;
  
  -- 2) Sanitize session_id (max 64 chars, alphanumeric + hyphen only)
  IF _session_id IS NOT NULL THEN
    v_clean_session := LEFT(regexp_replace(_session_id, '[^a-zA-Z0-9\-_]', '', 'g'), 64);
  ELSE
    v_clean_session := NULL;
  END IF;
  
  -- 3) Sanitize meta fields (cidade, utm_*, etc - max 80 chars each)
  v_sanitized_meta := _meta;
  
  -- Sanitize cidade
  IF v_sanitized_meta->>'cidade' IS NOT NULL THEN
    v_sanitized_cidade := LEFT(regexp_replace(v_sanitized_meta->>'cidade', '[^\w\s\-áéíóúàèìòùâêîôûãõñç]', '', 'gi'), 80);
    v_sanitized_meta := jsonb_set(v_sanitized_meta, '{cidade}', to_jsonb(v_sanitized_cidade));
  END IF;
  
  -- Sanitize UTM fields
  IF v_sanitized_meta->>'utm_source' IS NOT NULL THEN
    v_sanitized_meta := jsonb_set(v_sanitized_meta, '{utm_source}', 
      to_jsonb(LEFT(regexp_replace(v_sanitized_meta->>'utm_source', '[^\w\-_]', '', 'g'), 80)));
  END IF;
  IF v_sanitized_meta->>'utm_medium' IS NOT NULL THEN
    v_sanitized_meta := jsonb_set(v_sanitized_meta, '{utm_medium}', 
      to_jsonb(LEFT(regexp_replace(v_sanitized_meta->>'utm_medium', '[^\w\-_]', '', 'g'), 80)));
  END IF;
  IF v_sanitized_meta->>'utm_campaign' IS NOT NULL THEN
    v_sanitized_meta := jsonb_set(v_sanitized_meta, '{utm_campaign}', 
      to_jsonb(LEFT(regexp_replace(v_sanitized_meta->>'utm_campaign', '[^\w\-_]', '', 'g'), 80)));
  END IF;
  
  -- 4) Rate limiting: max 10 events per session_id + event_type per minute
  IF v_clean_session IS NOT NULL THEN
    SELECT COUNT(*) INTO v_rate_count
    FROM growth_events
    WHERE session_id = v_clean_session
      AND event_type = _event_type
      AND occurred_at > NOW() - INTERVAL '1 minute';
    
    IF v_rate_count >= 10 THEN
      RETURN NULL; -- Silently drop rate-limited events
    END IF;
  END IF;
  
  -- 5) Deduplication logic
  -- For anonymous users with session_id
  IF v_user_id IS NULL AND v_clean_session IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM growth_events
    WHERE session_id = v_clean_session
      AND event_type = _event_type
      AND occurred_at > NOW() - INTERVAL '1 hour';
    
    IF v_existing_count > 0 THEN
      RETURN NULL;
    END IF;
  -- For visit events without session_id (legacy behavior)
  ELSIF v_user_id IS NULL AND _event_type IN ('visit', 'visit_comecar', 'territory_link_open') THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM growth_events
    WHERE event_type = _event_type
      AND occurred_at > NOW() - INTERVAL '1 hour'
      AND COALESCE(template_id::text, '') = COALESCE(_template_id::text, '')
      AND COALESCE(invite_code, '') = COALESCE(_invite_code, '');
    
    IF v_existing_count > 0 THEN
      RETURN NULL;
    END IF;
  -- For authenticated users: one event per type per user (except some)
  ELSIF v_user_id IS NOT NULL AND _event_type NOT IN ('invite_shared', 'invite_qr_opened', 'template_share') THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM growth_events
    WHERE user_id = v_user_id AND event_type = _event_type;
    
    IF v_existing_count > 0 THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- 6) Get referrer info from invite code
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT c.criado_por INTO v_referrer_user_id
    FROM convites c
    WHERE c.code = _invite_code
    LIMIT 1;
  END IF;
  
  -- 7) Get scope cidade from meta or user profile
  v_scope_cidade := v_sanitized_meta->>'cidade';
  IF v_scope_cidade IS NULL AND v_user_id IS NOT NULL THEN
    SELECT p.city INTO v_scope_cidade
    FROM profiles p
    WHERE p.id = v_user_id;
  END IF;
  
  -- 8) Insert the event
  INSERT INTO growth_events (
    event_type,
    user_id,
    template_id,
    invite_code,
    referrer_user_id,
    scope_cidade,
    meta,
    session_id,
    occurred_at
  )
  VALUES (
    _event_type,
    v_user_id, -- Can be NULL for anonymous
    _template_id,
    LEFT(_invite_code, 80), -- Sanitize invite code length
    v_referrer_user_id,
    v_scope_cidade,
    v_sanitized_meta,
    v_clean_session,
    NOW()
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- Grant to both authenticated AND anon for anonymous tracking
GRANT EXECUTE ON FUNCTION public.log_growth_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_growth_event TO anon;

-- 2) Secure get_territory_funnel_by_city - require coordinator/admin
CREATE OR REPLACE FUNCTION public.get_territory_funnel_by_city(
  p_period_days INT DEFAULT 7,
  p_scope_cidade TEXT DEFAULT NULL
)
RETURNS TABLE (
  cidade TEXT,
  link_open BIGINT,
  form_open BIGINT,
  signup BIGINT,
  approved BIGINT,
  first_action BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_start_date TIMESTAMPTZ;
BEGIN
  -- Require coordinator or admin access
  IF NOT is_coordinator(v_user_id) AND NOT is_admin(v_user_id) THEN
    RAISE EXCEPTION 'Acesso negado: apenas coordenadores podem acessar o funil territorial';
  END IF;
  
  v_start_date := NOW() - (p_period_days || ' days')::INTERVAL;
  
  RETURN QUERY
  WITH events_by_city AS (
    SELECT 
      COALESCE(
        ge.scope_cidade,
        (ge.meta->>'cidade')::TEXT,
        'Não identificada'
      ) AS cidade_name,
      ge.event_type
    FROM growth_events ge
    WHERE ge.occurred_at >= v_start_date
      AND (
        p_scope_cidade IS NULL 
        OR COALESCE(ge.scope_cidade, (ge.meta->>'cidade')::TEXT) = p_scope_cidade
      )
  ),
  aggregated AS (
    SELECT 
      e.cidade_name,
      COUNT(*) FILTER (WHERE e.event_type = 'territory_link_open') AS link_open_count,
      COUNT(*) FILTER (WHERE e.event_type = 'invite_form_open') AS form_open_count,
      COUNT(*) FILTER (WHERE e.event_type = 'signup') AS signup_count,
      COUNT(*) FILTER (WHERE e.event_type = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE e.event_type = 'first_action') AS first_action_count
    FROM events_by_city e
    WHERE e.cidade_name IS NOT NULL AND e.cidade_name != ''
    GROUP BY e.cidade_name
  )
  SELECT 
    a.cidade_name AS cidade,
    a.link_open_count AS link_open,
    a.form_open_count AS form_open,
    a.signup_count AS signup,
    a.approved_count AS approved,
    a.first_action_count AS first_action
  FROM aggregated a
  WHERE a.link_open_count > 0 OR a.form_open_count > 0 OR a.signup_count > 0
  ORDER BY a.link_open_count DESC, a.signup_count DESC;
END;
$$;

-- Only authenticated can call (internal check enforces coordinator)
REVOKE ALL ON FUNCTION public.get_territory_funnel_by_city FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_territory_funnel_by_city TO authenticated;