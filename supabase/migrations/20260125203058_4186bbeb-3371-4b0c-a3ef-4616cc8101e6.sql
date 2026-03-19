-- ============================================================
-- Hardening Hoje v0: Timezone fix + new growth events whitelist
-- ============================================================

-- A) Fix timezone for street mission dedupe - drop and recreate
DROP FUNCTION IF EXISTS public.generate_street_mission(text, integer, text);

CREATE OR REPLACE FUNCTION public.generate_street_mission(
  _acao TEXT DEFAULT 'panfletar',
  _tempo_estimado INTEGER DEFAULT 10,
  _bairro TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_mission_id UUID;
  v_existing_id UUID;
  v_cidade TEXT;
  v_ciclo_id UUID;
  v_today_sp DATE;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Calculate today in São Paulo timezone
  v_today_sp := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Check for existing street mission today (using SP timezone)
  SELECT m.id INTO v_existing_id
  FROM missions m
  WHERE m.assigned_to = v_user_id
    AND m.type = 'rua'
    AND (m.meta_json->>'kind') = 'street_micro'
    AND (m.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_today_sp
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_exists', true,
      'mission_id', v_existing_id,
      'message', 'Você já tem uma missão de rua hoje'
    );
  END IF;

  -- Get user city from profile
  SELECT city INTO v_cidade FROM profiles WHERE id = v_user_id;

  -- Find active cycle for scope (cell > city > global)
  SELECT id INTO v_ciclo_id
  FROM ciclos_semanais
  WHERE status = 'aberto'
    AND (
      cidade = v_cidade
      OR cidade IS NULL
    )
    AND v_today_sp BETWEEN inicio AND fim
  ORDER BY cidade NULLS LAST
  LIMIT 1;

  -- Generate new mission
  INSERT INTO missions (
    type,
    title,
    description,
    assigned_to,
    status,
    ciclo_id,
    requires_validation,
    meta_json
  ) VALUES (
    'rua',
    'Missão de Rua: ' || CASE _acao
      WHEN 'panfletar' THEN 'Panfletagem'
      WHEN 'rodinha' THEN 'Rodinha de Conversa'
      WHEN 'visitar' THEN 'Visita Domiciliar'
      WHEN 'comercio' THEN 'Visita ao Comércio'
      ELSE 'Ação Presencial'
    END,
    'Micro-ação presencial de ' || _tempo_estimado || ' minutos no território.',
    v_user_id,
    'em_andamento',
    v_ciclo_id,
    false,
    jsonb_build_object(
      'kind', 'street_micro',
      'acao', _acao,
      'tempo_estimado', _tempo_estimado,
      'bairro', COALESCE(_bairro, (SELECT bairro FROM profiles WHERE id = v_user_id)),
      'cidade', v_cidade,
      'cta_qr', true,
      'generated_at', now()
    )
  )
  RETURNING id INTO v_mission_id;

  -- Log growth event
  INSERT INTO growth_events (event_type, user_id, scope_cidade, meta)
  VALUES (
    'street_mission_generated',
    v_user_id,
    v_cidade,
    jsonb_build_object('acao', _acao, 'tempo_estimado', _tempo_estimado)
  );

  RETURN jsonb_build_object(
    'success', true,
    'mission_id', v_mission_id,
    'already_exists', false
  );
END;
$$;

-- B) Update complete_street_mission to also use SP timezone
DROP FUNCTION IF EXISTS public.complete_street_mission(uuid, jsonb, text);

CREATE OR REPLACE FUNCTION public.complete_street_mission(
  _mission_id UUID,
  _checkboxes JSONB DEFAULT '{}',
  _photo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_mission RECORD;
  v_cidade TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  -- Get mission and validate ownership
  SELECT * INTO v_mission
  FROM missions
  WHERE id = _mission_id
    AND assigned_to = v_user_id
    AND type = 'rua'
    AND (meta_json->>'kind') = 'street_micro';

  IF v_mission IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missão não encontrada');
  END IF;

  IF v_mission.status = 'concluida' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missão já foi concluída');
  END IF;

  -- Get cidade for event logging
  v_cidade := v_mission.meta_json->>'cidade';

  -- Update mission
  UPDATE missions
  SET 
    status = 'concluida',
    meta_json = meta_json || jsonb_build_object(
      'completed_at', now(),
      'completion_checkboxes', _checkboxes,
      'has_photo', _photo_url IS NOT NULL
    ),
    updated_at = now()
  WHERE id = _mission_id;

  -- Log growth event
  INSERT INTO growth_events (event_type, user_id, scope_cidade, meta)
  VALUES (
    'street_mission_completed',
    v_user_id,
    v_cidade,
    jsonb_build_object(
      'acao', v_mission.meta_json->>'acao',
      'tempo_estimado', (v_mission.meta_json->>'tempo_estimado')::int,
      'checkboxes', _checkboxes,
      'has_photo', _photo_url IS NOT NULL
    )
  );

  RETURN jsonb_build_object('success', true, 'mission_id', _mission_id);
END;
$$;

-- C) Update growth_events constraint to include new event types
ALTER TABLE growth_events DROP CONSTRAINT IF EXISTS growth_events_event_type_check;

ALTER TABLE growth_events ADD CONSTRAINT growth_events_event_type_check
  CHECK (event_type IN (
    'visit_comecar',
    'signup',
    'approved',
    'onboarding_complete',
    'first_action',
    'active_7d',
    'share_pack_download',
    'template_print_download',
    'street_mission_done',
    'street_mission_generated',
    'street_mission_opened',
    'street_mission_completed',
    'roteiro_opened',
    'checkin_error'
  ));

-- D) Update log_growth_event RPC to include new event types
DROP FUNCTION IF EXISTS public.log_growth_event(TEXT, TEXT, TEXT, UUID, JSONB);

CREATE OR REPLACE FUNCTION public.log_growth_event(
  _event_type TEXT,
  _event_value TEXT DEFAULT NULL,
  _session_id TEXT DEFAULT NULL,
  _referrer_user_id UUID DEFAULT NULL,
  _meta JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_cidade TEXT;
  v_template_id UUID;
  v_invite_code TEXT;
  v_allowed_events TEXT[] := ARRAY[
    'visit_comecar',
    'signup',
    'approved',
    'onboarding_complete',
    'first_action',
    'active_7d',
    'share_pack_download',
    'template_print_download',
    'street_mission_done',
    'street_mission_generated',
    'street_mission_opened',
    'street_mission_completed',
    'roteiro_opened',
    'checkin_error'
  ];
  v_sanitized_session TEXT;
  v_sanitized_value TEXT;
  v_recent_count INT;
BEGIN
  -- Validate event type
  IF NOT (_event_type = ANY(v_allowed_events)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid event type');
  END IF;

  -- Get current user (may be null for anonymous)
  v_user_id := auth.uid();

  -- Sanitize inputs (max 80 chars)
  v_sanitized_session := LEFT(COALESCE(_session_id, ''), 80);
  v_sanitized_value := LEFT(COALESCE(_event_value, ''), 80);

  -- Rate limit: max 10 events per minute per session/user
  SELECT COUNT(*) INTO v_recent_count
  FROM growth_events
  WHERE occurred_at > now() - interval '1 minute'
    AND (
      (user_id = v_user_id AND v_user_id IS NOT NULL)
      OR (session_id = v_sanitized_session AND v_sanitized_session != '')
    );

  IF v_recent_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded');
  END IF;

  -- Get user city if authenticated
  IF v_user_id IS NOT NULL THEN
    SELECT city INTO v_cidade FROM profiles WHERE id = v_user_id;
  ELSE
    v_cidade := LEFT(_meta->>'cidade', 80);
  END IF;

  -- Parse template_id and invite_code from meta or event_value
  IF _meta IS NOT NULL THEN
    IF _meta->>'template_id' IS NOT NULL THEN
      BEGIN
        v_template_id := (_meta->>'template_id')::UUID;
      EXCEPTION WHEN OTHERS THEN
        v_template_id := NULL;
      END;
    END IF;
    v_invite_code := LEFT(_meta->>'invite_code', 20);
  END IF;

  -- Insert event
  INSERT INTO growth_events (
    event_type,
    user_id,
    session_id,
    referrer_user_id,
    template_id,
    invite_code,
    scope_cidade,
    meta
  ) VALUES (
    _event_type,
    v_user_id,
    NULLIF(v_sanitized_session, ''),
    _referrer_user_id,
    v_template_id,
    v_invite_code,
    LEFT(v_cidade, 80),
    _meta
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute to both anon and authenticated
GRANT EXECUTE ON FUNCTION public.log_growth_event(TEXT, TEXT, TEXT, UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.log_growth_event(TEXT, TEXT, TEXT, UUID, JSONB) TO authenticated;