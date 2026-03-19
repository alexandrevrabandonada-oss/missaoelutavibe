-- RPC get_db_contract_health()
-- Validates critical DB contracts (columns, RPCs, tables) for early drift detection

CREATE OR REPLACE FUNCTION public.get_db_contract_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_checks jsonb := '[]'::jsonb;
  v_ok boolean := true;
  v_check_ok boolean;
  v_detail text;
  v_ts_col text;
  v_rpc_name text;
  v_table_name text;
  v_failed_keys text[] := '{}';
BEGIN
  -- Auth check: admin or coordinator only
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE user_id = v_user_id
  ) OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = v_user_id 
      AND revoked_at IS NULL
      AND role IN ('admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_municipal', 'coordenador_celula')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden', 'checks', '[]'::jsonb, 'ts', now());
  END IF;

  -- CHECK A: growth_events has valid timestamp column
  SELECT column_name INTO v_ts_col
  FROM information_schema.columns
  WHERE table_schema = 'public' 
    AND table_name = 'growth_events'
    AND column_name IN ('occurred_at', 'inserted_at', 'created_at', 'ts')
  ORDER BY 
    CASE column_name 
      WHEN 'occurred_at' THEN 1
      WHEN 'inserted_at' THEN 2
      WHEN 'created_at' THEN 3
      WHEN 'ts' THEN 4
    END
  LIMIT 1;

  v_check_ok := v_ts_col IS NOT NULL;
  IF v_check_ok THEN
    v_detail := 'found: ' || v_ts_col;
  ELSE
    v_detail := 'no valid timestamp column found';
    v_ok := false;
    v_failed_keys := array_append(v_failed_keys, 'growth_events_ts');
  END IF;

  v_checks := v_checks || jsonb_build_object(
    'key', 'growth_events_ts',
    'ok', v_check_ok,
    'detail', v_detail
  );

  -- CHECK B: Critical RPCs exist
  FOREACH v_rpc_name IN ARRAY ARRAY[
    'get_my_daily_plan',
    'get_my_streak_metrics',
    'get_my_reactivation_status',
    'get_my_due_followups',
    'generate_street_mission',
    'generate_conversation_mission'
  ] LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = v_rpc_name
    ) INTO v_check_ok;

    IF v_check_ok THEN
      v_detail := 'exists';
    ELSE
      v_detail := 'missing';
      v_ok := false;
      v_failed_keys := array_append(v_failed_keys, 'rpc_' || v_rpc_name);
    END IF;

    v_checks := v_checks || jsonb_build_object(
      'key', 'rpc_' || v_rpc_name,
      'ok', v_check_ok,
      'detail', v_detail
    );
  END LOOP;

  -- CHECK C: Critical tables exist
  FOREACH v_table_name IN ARRAY ARRAY[
    'profiles',
    'crm_contatos',
    'crm_followup_logs',
    'daily_plan_steps',
    'app_errors'
  ] LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table_name
    ) INTO v_check_ok;

    IF v_check_ok THEN
      v_detail := 'exists';
    ELSE
      v_detail := 'missing';
      v_ok := false;
      v_failed_keys := array_append(v_failed_keys, 'table_' || v_table_name);
    END IF;

    v_checks := v_checks || jsonb_build_object(
      'key', 'table_' || v_table_name,
      'ok', v_check_ok,
      'detail', v_detail
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', v_ok,
    'checks', v_checks,
    'failed_keys', v_failed_keys,
    'ts', now()
  );
END;
$$;

-- Grant execute to authenticated users (RPC does its own auth check)
GRANT EXECUTE ON FUNCTION public.get_db_contract_health() TO authenticated;