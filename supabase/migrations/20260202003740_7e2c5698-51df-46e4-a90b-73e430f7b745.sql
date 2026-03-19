-- =============================================
-- Coordinator Alert Dismissals Table + RPCs
-- =============================================

-- 1) coordinator_alert_dismissals table
CREATE TABLE public.coordinator_alert_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_kind text NOT NULL CHECK (scope_kind IN ('city', 'cell', 'region', 'global')),
  scope_value text NOT NULL,
  alert_key text NOT NULL,
  dismissed_until timestamptz NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_coord_alert_dismiss_lookup 
  ON public.coordinator_alert_dismissals(scope_kind, scope_value, alert_key);
CREATE INDEX idx_coord_alert_dismiss_until 
  ON public.coordinator_alert_dismissals(dismissed_until);

-- Enable RLS
ALTER TABLE public.coordinator_alert_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS: Coordinators can manage dismissals in their scope
CREATE POLICY "Coordinators can view own scope dismissals"
  ON public.coordinator_alert_dismissals
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_coord_in_scope(auth.uid(), scope_kind, scope_value)
    OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Coordinators can insert own scope dismissals"
  ON public.coordinator_alert_dismissals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.is_coord_in_scope(auth.uid(), scope_kind, scope_value)
      OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Coordinators can update own dismissals"
  ON public.coordinator_alert_dismissals
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 2) RPC: get_my_coordinator_alerts
CREATE OR REPLACE FUNCTION public.get_my_coordinator_alerts(
  _window_days int DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_scope jsonb;
  v_scope_kind text;
  v_scope_value text;
  v_alerts jsonb;
  v_filtered jsonb := '[]'::jsonb;
  v_alert jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated', 'alerts', '[]'::jsonb);
  END IF;

  -- Get user scope
  SELECT 
    CASE 
      WHEN scope_type = 'global' THEN 'global'
      WHEN scope_type = 'estado' THEN 'region'
      WHEN scope_type = 'cidade' THEN 'city'
      WHEN scope_type = 'celula' THEN 'cell'
      ELSE 'city'
    END,
    COALESCE(scope_city, scope_state, scope_cell_id::text, 'global')
  INTO v_scope_kind, v_scope_value
  FROM public.get_user_scope(v_user_id) AS s;

  -- Build scope JSON for north star alerts
  v_scope := CASE 
    WHEN v_scope_kind = 'global' THEN NULL
    WHEN v_scope_kind = 'city' THEN jsonb_build_object('kind', 'city', 'value', v_scope_value)
    WHEN v_scope_kind = 'cell' THEN jsonb_build_object('kind', 'cell', 'value', v_scope_value)
    WHEN v_scope_kind = 'region' THEN jsonb_build_object('kind', 'region', 'value', v_scope_value)
    ELSE NULL
  END;

  -- Get north star alerts
  v_alerts := public.get_north_star_alerts(_window_days, v_scope);

  -- Filter out dismissed alerts
  FOR v_alert IN SELECT * FROM jsonb_array_elements(v_alerts)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.coordinator_alert_dismissals
      WHERE scope_kind = v_scope_kind
        AND scope_value = v_scope_value
        AND alert_key = v_alert->>'key'
        AND dismissed_until > now()
    ) THEN
      v_filtered := v_filtered || v_alert;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'alerts', v_filtered,
    'scope_kind', v_scope_kind,
    'scope_value', v_scope_value
  );
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_my_coordinator_alerts(int) TO authenticated;

-- 3) RPC: dismiss_coordinator_alert
CREATE OR REPLACE FUNCTION public.dismiss_coordinator_alert(
  _alert_key text,
  _hours int DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_scope_kind text;
  v_scope_value text;
  v_dismissed_until timestamptz;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Validate hours (1-168, max 1 week)
  IF _hours < 1 OR _hours > 168 THEN
    _hours := 24;
  END IF;

  -- Validate alert_key (max 64 chars, alphanumeric + underscore)
  IF _alert_key IS NULL OR length(_alert_key) > 64 
     OR _alert_key !~ '^[a-z_]+$' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_alert_key');
  END IF;

  -- Get user scope
  SELECT 
    CASE 
      WHEN scope_type = 'global' THEN 'global'
      WHEN scope_type = 'estado' THEN 'region'
      WHEN scope_type = 'cidade' THEN 'city'
      WHEN scope_type = 'celula' THEN 'cell'
      ELSE 'city'
    END,
    COALESCE(scope_city, scope_state, scope_cell_id::text, 'global')
  INTO v_scope_kind, v_scope_value
  FROM public.get_user_scope(v_user_id) AS s;

  v_dismissed_until := now() + (_hours || ' hours')::interval;

  -- Upsert dismissal
  INSERT INTO public.coordinator_alert_dismissals (
    scope_kind, scope_value, alert_key, dismissed_until, created_by
  )
  VALUES (v_scope_kind, v_scope_value, _alert_key, v_dismissed_until, v_user_id)
  ON CONFLICT (scope_kind, scope_value, alert_key) 
    WHERE created_by = v_user_id
  DO UPDATE SET 
    dismissed_until = EXCLUDED.dismissed_until;

  -- If no conflict matched, try regular upsert by deleting old and inserting
  IF NOT FOUND THEN
    DELETE FROM public.coordinator_alert_dismissals
    WHERE scope_kind = v_scope_kind
      AND scope_value = v_scope_value
      AND alert_key = _alert_key
      AND created_by = v_user_id;
    
    INSERT INTO public.coordinator_alert_dismissals (
      scope_kind, scope_value, alert_key, dismissed_until, created_by
    )
    VALUES (v_scope_kind, v_scope_value, _alert_key, v_dismissed_until, v_user_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'dismissed_until', v_dismissed_until,
    'alert_key', _alert_key
  );
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.dismiss_coordinator_alert(text, int) TO authenticated;

-- Add unique constraint for upsert
CREATE UNIQUE INDEX idx_coord_alert_dismiss_unique 
  ON public.coordinator_alert_dismissals(scope_kind, scope_value, alert_key, created_by);