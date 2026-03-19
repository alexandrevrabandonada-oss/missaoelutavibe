-- ============================================================================
-- TIJOLO 10: Anti-caos + Rate Limits v0
-- ============================================================================

-- 1) Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action_key, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON public.rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limits
CREATE POLICY "Users can view own rate limits" ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- No direct insert/update/delete - only via RPC
CREATE POLICY "No direct writes to rate_limits" ON public.rate_limits
  FOR ALL USING (false);

-- 2) Create guard_rate_limit RPC - returns {ok, error?, retry_after?}
CREATE OR REPLACE FUNCTION public.guard_rate_limit(
  _action_key TEXT,
  _limit INTEGER,
  _window_seconds INTEGER DEFAULT 3600
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_retry_after INTEGER;
  v_record_id UUID;
BEGIN
  -- Ensure authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  -- Calculate window start (current window based on window_seconds)
  v_window_start := date_trunc('second', now()) - 
                    ((EXTRACT(EPOCH FROM now())::INTEGER % _window_seconds) * INTERVAL '1 second');

  -- Check for existing rate limit record in current window
  SELECT id, count INTO v_record_id, v_current_count
  FROM public.rate_limits
  WHERE user_id = v_user_id
    AND action_key = _action_key
    AND window_start = v_window_start;

  IF FOUND THEN
    -- Check if over limit
    IF v_current_count >= _limit THEN
      v_retry_after := _window_seconds - EXTRACT(EPOCH FROM (now() - v_window_start))::INTEGER;
      RETURN jsonb_build_object(
        'ok', false, 
        'error', 'rate_limited',
        'retry_after', GREATEST(v_retry_after, 1),
        'current_count', v_current_count,
        'limit', _limit
      );
    END IF;
    
    -- Increment count
    UPDATE public.rate_limits
    SET count = count + 1, updated_at = now()
    WHERE id = v_record_id;
  ELSE
    -- Clean up old records for this user/action (older than 24h)
    DELETE FROM public.rate_limits
    WHERE user_id = v_user_id
      AND action_key = _action_key
      AND window_start < now() - INTERVAL '24 hours';
    
    -- Create new record
    INSERT INTO public.rate_limits (user_id, action_key, window_start, count)
    VALUES (v_user_id, _action_key, v_window_start, 1);
  END IF;

  RETURN jsonb_build_object('ok', true, 'current_count', COALESCE(v_current_count, 0) + 1, 'limit', _limit);
END;
$$;

-- 3) Create RPC to get rate limit metrics for admin dashboard (no PII)
CREATE OR REPLACE FUNCTION public.get_rate_limit_metrics(
  _period_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check admin
  SELECT EXISTS(SELECT 1 FROM public.admins WHERE user_id = v_user_id) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Get metrics grouped by action and city (from growth_events for rate_limited events)
  SELECT jsonb_build_object(
    'period_days', _period_days,
    'by_action', (
      SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
      FROM (
        SELECT 
          (meta->>'action_key')::text as action_key,
          COUNT(*) as blocked_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM public.growth_events
        WHERE event_type = 'rate_limited'
          AND created_at >= now() - (_period_days || ' days')::INTERVAL
        GROUP BY meta->>'action_key'
        ORDER BY blocked_count DESC
      ) r
    ),
    'by_city', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM (
        SELECT 
          COALESCE((meta->>'cidade')::text, 'unknown') as cidade,
          COUNT(*) as blocked_count
        FROM public.growth_events
        WHERE event_type = 'rate_limited'
          AND created_at >= now() - (_period_days || ' days')::INTERVAL
        GROUP BY meta->>'cidade'
        ORDER BY blocked_count DESC
        LIMIT 10
      ) c
    ),
    'total_7d', (
      SELECT COUNT(*) FROM public.growth_events
      WHERE event_type = 'rate_limited'
        AND created_at >= now() - INTERVAL '7 days'
    ),
    'total_30d', (
      SELECT COUNT(*) FROM public.growth_events
      WHERE event_type = 'rate_limited'
        AND created_at >= now() - INTERVAL '30 days'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 4) Update generate_street_mission to use rate limiting
CREATE OR REPLACE FUNCTION public.generate_street_mission(
  _acao TEXT DEFAULT 'panfletar',
  _tempo_estimado INTEGER DEFAULT 10,
  _bairro TEXT DEFAULT NULL
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
  v_today DATE;
  v_meta JSONB;
  v_rate_check JSONB;
BEGIN
  -- Rate limit check: 5 per hour
  v_rate_check := public.guard_rate_limit('generate_street_mission', 5, 3600);
  IF NOT (v_rate_check->>'ok')::boolean THEN
    -- Log rate limited event
    INSERT INTO public.growth_events (user_id, event_type, meta)
    VALUES (v_user_id, 'rate_limited', jsonb_build_object(
      'action_key', 'generate_street_mission',
      'retry_after', v_rate_check->>'retry_after'
    ));
    RETURN v_rate_check;
  END IF;

  -- Get user profile
  SELECT id, city, neighborhood INTO v_profile 
  FROM public.profiles WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  -- Check for existing today (deduplication)
  v_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  
  SELECT id INTO v_existing_id
  FROM public.missions
  WHERE assigned_to = v_user_id
    AND type = 'rua'
    AND (meta_json->>'kind') = 'street_micro'
    AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date = v_today
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true, 
      'success', true,
      'mission_id', v_existing_id, 
      'already_exists', true,
      'message', 'Você já tem uma missão de rua hoje'
    );
  END IF;

  -- Build meta
  v_meta := jsonb_build_object(
    'kind', 'street_micro',
    'acao', _acao,
    'tempo_estimado', _tempo_estimado,
    'bairro', COALESCE(_bairro, v_profile.neighborhood),
    'cidade', v_profile.city,
    'cta_qr', true,
    'generated_at', now()
  );

  -- Create mission
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
    CASE _acao
      WHEN 'panfletar' THEN 'Panfletagem no bairro'
      WHEN 'rodinha' THEN 'Rodinha de conversa'
      WHEN 'visitar' THEN 'Visita domiciliar'
      WHEN 'comercio' THEN 'Visita ao comércio'
      ELSE 'Missão de rua'
    END,
    'Missão de rua de ' || _tempo_estimado || ' minutos no bairro ' || COALESCE(_bairro, v_profile.neighborhood, 'próximo'),
    'Saia para a rua, converse com as pessoas e mostre seu QR Code de convite.',
    'rua',
    'publicada',
    v_user_id,
    v_user_id,
    v_meta
  )
  RETURNING id INTO v_mission_id;

  -- Log growth event
  INSERT INTO public.growth_events (user_id, event_type, meta)
  VALUES (v_user_id, 'street_mission_generated', jsonb_build_object(
    'mission_id', v_mission_id,
    'acao', _acao,
    'tempo', _tempo_estimado,
    'cidade', v_profile.city
  ));

  RETURN jsonb_build_object('ok', true, 'success', true, 'mission_id', v_mission_id);
END;
$$;

-- 5) Update generate_conversation_mission to use rate limiting
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

  -- Get matching roteiro
  SELECT id INTO v_roteiro_id
  FROM public.roteiros_conversa
  WHERE objetivo = _objective AND ativo = true
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

-- 6) Update upsert_quick_contact to use rate limiting
CREATE OR REPLACE FUNCTION public.upsert_quick_contact(
  _nome TEXT DEFAULT NULL,
  _whatsapp TEXT DEFAULT NULL,
  _tags TEXT[] DEFAULT '{}',
  _origem TEXT DEFAULT 'manual',
  _schedule_kind TEXT DEFAULT NULL,
  _schedule_in_hours INT DEFAULT NULL,
  _context JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile RECORD;
  v_whatsapp_norm TEXT;
  v_existing_id UUID;
  v_contact_id UUID;
  v_is_new BOOLEAN := false;
  v_scheduled_at TIMESTAMPTZ;
  v_rate_check JSONB;
BEGIN
  -- Rate limit check: 30 per hour (CRM can be more frequent)
  v_rate_check := public.guard_rate_limit('crm_quick_add', 30, 3600);
  IF NOT (v_rate_check->>'ok')::boolean THEN
    INSERT INTO public.growth_events (user_id, event_type, meta)
    VALUES (v_user_id, 'rate_limited', jsonb_build_object(
      'action_key', 'crm_quick_add',
      'retry_after', v_rate_check->>'retry_after'
    ));
    RETURN v_rate_check;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Get profile
  SELECT id, city, neighborhood INTO v_profile
  FROM public.profiles WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  -- Normalize whatsapp (digits only)
  IF _whatsapp IS NOT NULL AND _whatsapp != '' THEN
    v_whatsapp_norm := regexp_replace(_whatsapp, '[^0-9]', '', 'g');
    IF length(v_whatsapp_norm) < 8 THEN
      v_whatsapp_norm := NULL;
    END IF;
  END IF;

  -- Try to find existing contact by whatsapp
  IF v_whatsapp_norm IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM public.crm_contatos
    WHERE criado_por = v_user_id AND whatsapp_norm = v_whatsapp_norm
    LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.crm_contatos SET
      nome = COALESCE(NULLIF(_nome, ''), nome),
      tags = CASE 
        WHEN _tags IS NOT NULL AND array_length(_tags, 1) > 0 
        THEN array_cat(COALESCE(tags, '{}'), _tags)
        ELSE tags 
      END,
      updated_at = now()
    WHERE id = v_existing_id;

    v_contact_id := v_existing_id;
  ELSE
    -- Create new
    INSERT INTO public.crm_contatos (
      nome, whatsapp, whatsapp_norm, tags, origem_canal, 
      criado_por, escopo_tipo, escopo_id, cidade, bairro
    ) VALUES (
      COALESCE(NULLIF(_nome, ''), 'Contato'),
      _whatsapp,
      v_whatsapp_norm,
      _tags,
      CASE _origem
        WHEN 'rua' THEN 'panfleto'::crm_origem_canal
        WHEN 'conversa' THEN 'indicacao'::crm_origem_canal
        WHEN 'qr' THEN 'qr'::crm_origem_canal
        ELSE 'outros'::crm_origem_canal
      END,
      v_user_id,
      'user',
      v_user_id::text,
      v_profile.city,
      COALESCE((_context->>'bairro')::text, v_profile.neighborhood)
    )
    RETURNING id INTO v_contact_id;
    v_is_new := true;
  END IF;

  -- Schedule follow-up if requested
  IF _schedule_kind IS NOT NULL AND _schedule_in_hours IS NOT NULL THEN
    v_scheduled_at := now() + (_schedule_in_hours || ' hours')::INTERVAL;
    
    UPDATE public.crm_contatos SET
      next_action_kind = _schedule_kind,
      next_action_context = _context,
      proxima_acao_em = v_scheduled_at
    WHERE id = v_contact_id;

    -- Log followup scheduled
    INSERT INTO public.crm_followup_logs (contact_id, user_id, kind, scheduled_for, meta)
    VALUES (v_contact_id, v_user_id, _schedule_kind, v_scheduled_at, _context);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'contact_id', v_contact_id,
    'is_new', v_is_new,
    'whatsapp_norm', v_whatsapp_norm,
    'scheduled_at', v_scheduled_at
  );
END;
$$;

-- 7) Update mark_followup_done to use rate limiting
CREATE OR REPLACE FUNCTION public.mark_followup_done(_contact_id UUID, _meta JSONB DEFAULT '{}'::JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_contact RECORD;
  v_rate_check JSONB;
BEGIN
  -- Rate limit check: 60 per hour
  v_rate_check := public.guard_rate_limit('followup_done', 60, 3600);
  IF NOT (v_rate_check->>'ok')::boolean THEN
    INSERT INTO public.growth_events (user_id, event_type, meta)
    VALUES (v_user_id, 'rate_limited', jsonb_build_object(
      'action_key', 'followup_done',
      'retry_after', v_rate_check->>'retry_after'
    ));
    RETURN v_rate_check;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Get contact and verify ownership
  SELECT id, nome, cidade INTO v_contact
  FROM public.crm_contatos
  WHERE id = _contact_id AND criado_por = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'contact_not_found');
  END IF;

  -- Clear next action
  UPDATE public.crm_contatos SET
    next_action_kind = NULL,
    next_action_context = NULL,
    proxima_acao_em = NULL,
    updated_at = now()
  WHERE id = _contact_id;

  -- Log completion
  INSERT INTO public.crm_followup_logs (contact_id, user_id, kind, meta)
  VALUES (_contact_id, v_user_id, 'done', _meta);

  -- Log growth event (no PII)
  INSERT INTO public.growth_events (user_id, event_type, meta)
  VALUES (v_user_id, 'followup_completed', jsonb_build_object('cidade', v_contact.cidade));

  RETURN jsonb_build_object('ok', true, 'contact_id', _contact_id);
END;
$$;

-- 8) Update snooze_followup to use rate limiting
CREATE OR REPLACE FUNCTION public.snooze_followup(_contact_id UUID, _hours INT DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_contact RECORD;
  v_new_scheduled TIMESTAMPTZ;
  v_rate_check JSONB;
BEGIN
  -- Rate limit check: 30 per hour
  v_rate_check := public.guard_rate_limit('followup_snooze', 30, 3600);
  IF NOT (v_rate_check->>'ok')::boolean THEN
    INSERT INTO public.growth_events (user_id, event_type, meta)
    VALUES (v_user_id, 'rate_limited', jsonb_build_object(
      'action_key', 'followup_snooze',
      'retry_after', v_rate_check->>'retry_after'
    ));
    RETURN v_rate_check;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Get contact and verify ownership
  SELECT id, cidade INTO v_contact
  FROM public.crm_contatos
  WHERE id = _contact_id AND criado_por = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'contact_not_found');
  END IF;

  v_new_scheduled := now() + (_hours || ' hours')::INTERVAL;

  -- Update next action
  UPDATE public.crm_contatos SET
    proxima_acao_em = v_new_scheduled,
    updated_at = now()
  WHERE id = _contact_id;

  -- Log snooze
  INSERT INTO public.crm_followup_logs (contact_id, user_id, kind, scheduled_for, meta)
  VALUES (_contact_id, v_user_id, 'snoozed', v_new_scheduled, jsonb_build_object('hours', _hours));

  RETURN jsonb_build_object('ok', true, 'contact_id', _contact_id, 'scheduled_at', v_new_scheduled);
END;
$$;

-- 9) Add rate_limited to growth_event_types if not exists (for analytics)
DO $$
BEGIN
  -- This will fail silently if the type already exists or if there's no enum
  -- The growth_events table uses TEXT for event_type, so this is optional
  NULL;
END;
$$;