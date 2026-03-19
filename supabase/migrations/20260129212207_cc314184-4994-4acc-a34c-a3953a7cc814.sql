-- Fix generate_conversation_mission RPC: replace 'ativo = true' with 'status = ''aprovado'''
-- The roteiros_conversa table has 'status' column (not 'ativo')

CREATE OR REPLACE FUNCTION public.generate_conversation_mission(
  _objective TEXT DEFAULT 'convidar',
  _channel TEXT DEFAULT 'whatsapp',
  _target_count INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile RECORD;
  v_mission_id UUID;
  v_existing_id UUID;
  v_roteiro_id UUID;
  v_contact_ids UUID[];
  v_actual_count INT;
  v_today DATE;
  v_rate_check JSONB;
BEGIN
  -- Rate limit check: 5 per hour
  v_rate_check := public.guard_rate_limit('generate_conversation_mission', 5, 3600);
  IF NOT (v_rate_check->>'ok')::boolean THEN
    INSERT INTO public.growth_events (user_id, event_type, meta)
    VALUES (v_user_id, 'rate_limited', jsonb_build_object(
      'action_key', 'generate_conversation_mission',
      'retry_after', v_rate_check->>'retry_after'
    ));
    RETURN v_rate_check;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'success', false, 'error', 'User not authenticated');
  END IF;

  -- Get user profile
  SELECT id, city, neighborhood INTO v_profile
  FROM public.profiles WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'success', false, 'error', 'Profile not found');
  END IF;

  -- Check for existing today
  v_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  
  SELECT id INTO v_existing_id
  FROM public.missions
  WHERE assigned_to = v_user_id
    AND type = 'conversa'
    AND (meta_json->>'kind') = 'conversa_v0'
    AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = v_today
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'success', true,
      'mission_id', v_existing_id,
      'already_exists', true,
      'message', 'Você já tem uma missão de conversa hoje'
    );
  END IF;

  -- Get matching roteiro (FIX: use 'status = aprovado' instead of 'ativo = true')
  SELECT id INTO v_roteiro_id
  FROM public.roteiros_conversa
  WHERE objetivo = _objective AND status = 'aprovado'
  ORDER BY random()
  LIMIT 1;

  -- Get contacts that need follow-up
  SELECT array_agg(id) INTO v_contact_ids
  FROM (
    SELECT id FROM public.crm_contatos
    WHERE criado_por = v_user_id
      AND status NOT IN ('convertido', 'descartado')
      AND (proxima_acao_em IS NULL OR proxima_acao_em <= now())
    ORDER BY 
      CASE WHEN next_action_kind = 'followup' THEN 0 ELSE 1 END,
      proxima_acao_em NULLS LAST,
      created_at DESC
    LIMIT _target_count
  ) sub;

  v_actual_count := COALESCE(array_length(v_contact_ids, 1), 0);

  -- Create mission even with 0 contacts (user can add)
  INSERT INTO public.missions (
    title,
    description,
    instructions,
    type,
    status,
    assigned_to,
    created_by,
    meta_json
  ) VALUES (
    'Conversas do dia',
    'Entre em contato com ' || GREATEST(v_actual_count, 1) || ' pessoa(s) da sua lista.',
    'Use o roteiro sugerido para guiar a conversa.',
    'conversa',
    'publicada',
    v_user_id,
    v_user_id,
    jsonb_build_object(
      'kind', 'conversa_v0',
      'target_count', _target_count,
      'actual_count', v_actual_count,
      'objective', _objective,
      'channel', _channel,
      'roteiro_id', v_roteiro_id,
      'contact_ids', COALESCE(v_contact_ids, ARRAY[]::UUID[]),
      'cidade', v_profile.city,
      'bairro', v_profile.neighborhood,
      'generated_at', now()
    )
  )
  RETURNING id INTO v_mission_id;

  -- Link contacts to mission
  IF v_contact_ids IS NOT NULL AND array_length(v_contact_ids, 1) > 0 THEN
    INSERT INTO public.conversa_mission_contacts (mission_id, contact_id)
    SELECT v_mission_id, unnest(v_contact_ids);
  END IF;

  -- Log growth event
  INSERT INTO public.growth_events (user_id, event_type, meta)
  VALUES (v_user_id, 'conversation_mission_generated', jsonb_build_object(
    'mission_id', v_mission_id,
    'objective', _objective,
    'channel', _channel,
    'target_count', _target_count,
    'actual_count', v_actual_count,
    'cidade', v_profile.city
  ));

  RETURN jsonb_build_object(
    'ok', true,
    'success', true,
    'mission_id', v_mission_id,
    'contact_count', v_actual_count,
    'roteiro_id', v_roteiro_id
  );
END;
$$;