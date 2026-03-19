-- ============================================
-- Missões de Conversa v0: Database Schema
-- ============================================

-- 1) Table: conversa_mission_contacts (join for tracking outcomes)
CREATE TABLE IF NOT EXISTS public.conversa_mission_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  outcome TEXT CHECK (outcome IN ('convite_enviado', 'topou', 'talvez_depois', 'nao_agora', 'numero_errado', 'sem_resposta')) DEFAULT 'sem_resposta',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.conversa_mission_contacts ENABLE ROW LEVEL SECURITY;

-- 2) RLS Policies for conversa_mission_contacts (drop if exists first)
DROP POLICY IF EXISTS "Owner can view conversation contacts" ON public.conversa_mission_contacts;
DROP POLICY IF EXISTS "Owner can update conversation contacts" ON public.conversa_mission_contacts;
DROP POLICY IF EXISTS "Owner can insert conversation contacts" ON public.conversa_mission_contacts;

CREATE POLICY "Owner can view conversation contacts"
ON public.conversa_mission_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.missions m
    WHERE m.id = mission_id AND m.assigned_to = auth.uid()
  )
  OR public.is_admin(auth.uid())
  OR public.is_coordinator(auth.uid())
);

CREATE POLICY "Owner can update conversation contacts"
ON public.conversa_mission_contacts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.missions m
    WHERE m.id = mission_id AND m.assigned_to = auth.uid()
  )
);

CREATE POLICY "Owner can insert conversation contacts"
ON public.conversa_mission_contacts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.missions m
    WHERE m.id = mission_id AND m.assigned_to = auth.uid()
  )
);

-- 3) Update growth_events whitelist (INCLUDING existing visit_comecar)
ALTER TABLE public.growth_events DROP CONSTRAINT IF EXISTS growth_events_event_type_check;
ALTER TABLE public.growth_events ADD CONSTRAINT growth_events_event_type_check
CHECK (event_type IN (
  'signup', 'profile_completed', 'approved', 'first_share', 'first_mission_completed',
  'invite_shared', 'invite_clicked', 'share_pack_opened', 'share_pack_item_copied',
  'share_pack_whatsapp_opened', 'share_pack_downloaded', 'template_shared',
  'territory_link_visited', 'territory_signup', 'street_mission_generated',
  'street_mission_opened', 'street_mission_completed', 'checkin_error',
  'roteiro_opened', 'first_mission_assigned', 'template_print_download',
  'street_mission_done', 'visit_comecar',
  'conversation_mission_generated', 'conversation_mission_opened',
  'conversation_mission_completed', 'conversation_script_copied', 'conversation_whatsapp_opened'
));

-- 4) Drop existing log_growth_event overloads to avoid conflicts
DROP FUNCTION IF EXISTS public.log_growth_event(TEXT, JSONB);
DROP FUNCTION IF EXISTS public.log_growth_event(TEXT, TEXT, JSONB);

-- 5) Recreate log_growth_event with both overloads
CREATE OR REPLACE FUNCTION public.log_growth_event(
  _event_type TEXT,
  _meta JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _id UUID;
BEGIN
  -- Validate event_type against whitelist
  IF _event_type NOT IN (
    'signup', 'profile_completed', 'approved', 'first_share', 'first_mission_completed',
    'invite_shared', 'invite_clicked', 'share_pack_opened', 'share_pack_item_copied',
    'share_pack_whatsapp_opened', 'share_pack_downloaded', 'template_shared',
    'territory_link_visited', 'territory_signup', 'street_mission_generated',
    'street_mission_opened', 'street_mission_completed', 'checkin_error',
    'roteiro_opened', 'first_mission_assigned', 'template_print_download',
    'street_mission_done', 'visit_comecar',
    'conversation_mission_generated', 'conversation_mission_opened',
    'conversation_mission_completed', 'conversation_script_copied', 'conversation_whatsapp_opened'
  ) THEN
    RAISE EXCEPTION 'Invalid event_type: %', _event_type;
  END IF;

  INSERT INTO growth_events (event_type, user_id, meta)
  VALUES (_event_type, auth.uid(), _meta)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- Overload with event_value
CREATE OR REPLACE FUNCTION public.log_growth_event(
  _event_type TEXT,
  _event_value TEXT,
  _meta JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _id UUID;
  _merged_meta JSONB;
BEGIN
  -- Validate event_type against whitelist
  IF _event_type NOT IN (
    'signup', 'profile_completed', 'approved', 'first_share', 'first_mission_completed',
    'invite_shared', 'invite_clicked', 'share_pack_opened', 'share_pack_item_copied',
    'share_pack_whatsapp_opened', 'share_pack_downloaded', 'template_shared',
    'territory_link_visited', 'territory_signup', 'street_mission_generated',
    'street_mission_opened', 'street_mission_completed', 'checkin_error',
    'roteiro_opened', 'first_mission_assigned', 'template_print_download',
    'street_mission_done', 'visit_comecar',
    'conversation_mission_generated', 'conversation_mission_opened',
    'conversation_mission_completed', 'conversation_script_copied', 'conversation_whatsapp_opened'
  ) THEN
    RAISE EXCEPTION 'Invalid event_type: %', _event_type;
  END IF;

  _merged_meta := COALESCE(_meta, '{}'::JSONB) || jsonb_build_object('event_value', _event_value);

  INSERT INTO growth_events (event_type, user_id, meta)
  VALUES (_event_type, auth.uid(), _merged_meta)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- 6) RPC: generate_conversation_mission
CREATE OR REPLACE FUNCTION public.generate_conversation_mission(
  _objective TEXT DEFAULT 'convidar',
  _channel TEXT DEFAULT 'whatsapp',
  _target_count INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today_sp DATE;
  v_existing_id UUID;
  v_profile RECORD;
  v_roteiro RECORD;
  v_contact RECORD;
  v_mission_id UUID;
  v_ciclo_id UUID;
  v_contact_ids UUID[] := '{}';
  v_contact_count INT := 0;
BEGIN
  -- Validate user
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Calculate today in São Paulo timezone for deduplication
  v_today_sp := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Check for existing conversation mission today
  SELECT m.id INTO v_existing_id
  FROM missions m
  WHERE m.assigned_to = v_user_id
    AND m.type = 'conversa'
    AND (m.meta_json->>'kind')::TEXT = 'conversa_v0'
    AND (m.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_today_sp;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'already_exists', true,
      'mission_id', v_existing_id,
      'message', 'Você já gerou uma missão de conversa hoje'
    );
  END IF;

  -- Get user profile
  SELECT city, neighborhood INTO v_profile
  FROM profiles
  WHERE id = v_user_id;

  IF v_profile.city IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Complete seu perfil com cidade antes de gerar missões'
    );
  END IF;

  -- Find active cycle
  SELECT id INTO v_ciclo_id
  FROM ciclos_semanais
  WHERE status = 'ativo'
    AND (cidade = v_profile.city OR cidade IS NULL)
    AND v_today_sp BETWEEN inicio AND fim
  ORDER BY 
    CASE WHEN cidade IS NOT NULL THEN 1 ELSE 2 END
  LIMIT 1;

  -- Find an approved roteiro matching the objective and territory
  SELECT r.id, r.titulo, r.texto_base INTO v_roteiro
  FROM roteiros_conversa r
  LEFT JOIN roteiros_actions ra ON ra.roteiro_id = r.id AND ra.action_date > (now() - interval '7 days')
  WHERE r.status = 'aprovado'
    AND r.objetivo = _objective
    AND (
      r.escopo_tipo = 'global'
      OR (r.escopo_tipo = 'cidade' AND r.escopo_cidade = v_profile.city)
      OR (r.escopo_tipo = 'estado' AND r.escopo_estado = (SELECT state FROM profiles WHERE id = v_user_id))
    )
  GROUP BY r.id, r.titulo, r.texto_base
  ORDER BY COUNT(ra.id) DESC NULLS LAST, r.updated_at DESC
  LIMIT 1;

  IF v_roteiro.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Nenhum roteiro aprovado encontrado para o objetivo: ' || _objective
    );
  END IF;

  -- Find eligible CRM contacts (status 'novo', 'contatar', 'em_conversa')
  FOR v_contact IN
    SELECT c.id, c.nome, c.bairro
    FROM crm_contatos c
    WHERE c.atribuido_a = v_user_id
      AND c.status IN ('novo', 'contatar', 'em_conversa')
      AND c.consentimento_lgpd = true
      -- Avoid contacts already in a conversation mission today
      AND NOT EXISTS (
        SELECT 1 FROM conversa_mission_contacts cmc
        JOIN missions m ON m.id = cmc.mission_id
        WHERE cmc.contact_id = c.id
          AND m.type = 'conversa'
          AND (m.created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_today_sp
      )
    ORDER BY
      CASE WHEN c.proxima_acao_em IS NOT NULL AND c.proxima_acao_em::DATE <= v_today_sp THEN 0 ELSE 1 END,
      c.proxima_acao_em NULLS LAST,
      c.created_at
    LIMIT _target_count
  LOOP
    v_contact_ids := v_contact_ids || v_contact.id;
    v_contact_count := v_contact_count + 1;
  END LOOP;

  IF v_contact_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Nenhum contato elegível encontrado no seu CRM. Adicione contatos primeiro.'
    );
  END IF;

  -- Create the mission
  INSERT INTO missions (
    title,
    description,
    instructions,
    type,
    status,
    assigned_to,
    created_by,
    ciclo_id,
    privado,
    requires_validation,
    meta_json
  ) VALUES (
    v_contact_count || ' conversas (' || CASE WHEN v_contact_count <= 3 THEN '10' ELSE '15' END || ' min)',
    'Use o roteiro "' || v_roteiro.titulo || '" para conversar com ' || v_contact_count || ' pessoas.',
    'Abra o roteiro, copie ou envie por WhatsApp, depois marque o resultado de cada conversa.',
    'conversa',
    'publicada',
    v_user_id,
    v_user_id,
    v_ciclo_id,
    true,
    false,
    jsonb_build_object(
      'kind', 'conversa_v0',
      'target_count', _target_count,
      'actual_count', v_contact_count,
      'objective', _objective,
      'channel', _channel,
      'roteiro_id', v_roteiro.id,
      'contact_ids', v_contact_ids,
      'cidade', v_profile.city,
      'bairro', v_profile.neighborhood,
      'generated_at', now()
    )
  )
  RETURNING id INTO v_mission_id;

  -- Insert contact links
  INSERT INTO conversa_mission_contacts (mission_id, contact_id)
  SELECT v_mission_id, unnest(v_contact_ids);

  -- Log growth event (no PII)
  INSERT INTO growth_events (event_type, user_id, meta)
  VALUES (
    'conversation_mission_generated',
    v_user_id,
    jsonb_build_object(
      'objective', _objective,
      'channel', _channel,
      'target_count', _target_count,
      'actual_count', v_contact_count,
      'cidade', v_profile.city
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'mission_id', v_mission_id,
    'contact_count', v_contact_count,
    'roteiro_id', v_roteiro.id
  );
END;
$$;

-- 7) RPC: complete_conversation_mission
CREATE OR REPLACE FUNCTION public.complete_conversation_mission(
  _mission_id UUID,
  _results JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_mission RECORD;
  v_result RECORD;
  v_done_count INT := 0;
  v_outcomes_counts JSONB := '{}'::JSONB;
  v_outcome_val TEXT;
BEGIN
  -- Validate user
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get and validate mission ownership
  SELECT id, assigned_to, status, meta_json INTO v_mission
  FROM missions
  WHERE id = _mission_id;

  IF v_mission.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Missão não encontrada');
  END IF;

  IF v_mission.assigned_to != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Você não tem permissão para esta missão');
  END IF;

  IF v_mission.status = 'concluida' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Missão já foi concluída');
  END IF;

  -- Process results: array of {contact_id, outcome, notes}
  FOR v_result IN SELECT * FROM jsonb_to_recordset(_results) AS x(contact_id UUID, outcome TEXT, notes TEXT)
  LOOP
    -- Validate outcome
    IF v_result.outcome NOT IN ('convite_enviado', 'topou', 'talvez_depois', 'nao_agora', 'numero_errado', 'sem_resposta') THEN
      CONTINUE;
    END IF;

    -- Sanitize notes (max 240 chars, no phone/email patterns)
    v_result.notes := LEFT(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          COALESCE(v_result.notes, ''),
          '\d{10,}', '[TEL]', 'g'
        ),
        '\S+@\S+\.\S+', '[EMAIL]', 'g'
      ),
      240
    );

    -- Upsert outcome
    INSERT INTO conversa_mission_contacts (mission_id, contact_id, outcome, notes)
    VALUES (_mission_id, v_result.contact_id, v_result.outcome, NULLIF(v_result.notes, ''))
    ON CONFLICT (mission_id, contact_id)
    DO UPDATE SET 
      outcome = EXCLUDED.outcome,
      notes = EXCLUDED.notes;

    -- Count outcomes
    IF v_result.outcome != 'sem_resposta' THEN
      v_done_count := v_done_count + 1;
    END IF;

    v_outcome_val := COALESCE((v_outcomes_counts->>v_result.outcome)::INT, 0)::TEXT;
    v_outcomes_counts := v_outcomes_counts || jsonb_build_object(v_result.outcome, (v_outcome_val::INT + 1));
  END LOOP;

  -- Require at least 1 outcome different from sem_resposta
  IF v_done_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Registre pelo menos 1 resultado de conversa antes de concluir'
    );
  END IF;

  -- Update mission status
  UPDATE missions
  SET 
    status = 'concluida',
    updated_at = now()
  WHERE id = _mission_id;

  -- Log growth event (no PII)
  INSERT INTO growth_events (event_type, user_id, meta)
  VALUES (
    'conversation_mission_completed',
    v_user_id,
    jsonb_build_object(
      'objective', v_mission.meta_json->>'objective',
      'channel', v_mission.meta_json->>'channel',
      'target_count', (v_mission.meta_json->>'target_count')::INT,
      'done_count', v_done_count,
      'outcomes_counts', v_outcomes_counts
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'done_count', v_done_count,
    'outcomes_counts', v_outcomes_counts
  );
END;
$$;

-- 8) RPC: get_conversation_mission_metrics (Admin)
CREATE OR REPLACE FUNCTION public.get_conversation_mission_metrics(
  _days INT DEFAULT 7,
  _scope_cidade TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_generated INT := 0;
  v_completed INT := 0;
  v_outcomes JSONB := '{}'::JSONB;
  v_by_objective JSONB := '{}'::JSONB;
  v_top_cidades JSONB;
BEGIN
  v_start_date := now() - (_days || ' days')::INTERVAL;

  -- Count generated
  SELECT COUNT(*) INTO v_generated
  FROM missions m
  WHERE m.type = 'conversa'
    AND (m.meta_json->>'kind')::TEXT = 'conversa_v0'
    AND m.created_at >= v_start_date
    AND (_scope_cidade IS NULL OR (m.meta_json->>'cidade')::TEXT = _scope_cidade);

  -- Count completed
  SELECT COUNT(*) INTO v_completed
  FROM missions m
  WHERE m.type = 'conversa'
    AND (m.meta_json->>'kind')::TEXT = 'conversa_v0'
    AND m.status = 'concluida'
    AND m.created_at >= v_start_date
    AND (_scope_cidade IS NULL OR (m.meta_json->>'cidade')::TEXT = _scope_cidade);

  -- Aggregate outcomes
  SELECT jsonb_object_agg(outcome, cnt) INTO v_outcomes
  FROM (
    SELECT cmc.outcome, COUNT(*) as cnt
    FROM conversa_mission_contacts cmc
    JOIN missions m ON m.id = cmc.mission_id
    WHERE m.type = 'conversa'
      AND (m.meta_json->>'kind')::TEXT = 'conversa_v0'
      AND m.created_at >= v_start_date
      AND cmc.outcome != 'sem_resposta'
      AND (_scope_cidade IS NULL OR (m.meta_json->>'cidade')::TEXT = _scope_cidade)
    GROUP BY cmc.outcome
  ) sub;

  -- By objective
  SELECT jsonb_object_agg(objective, cnt) INTO v_by_objective
  FROM (
    SELECT (m.meta_json->>'objective')::TEXT as objective, COUNT(*) as cnt
    FROM missions m
    WHERE m.type = 'conversa'
      AND (m.meta_json->>'kind')::TEXT = 'conversa_v0'
      AND m.created_at >= v_start_date
      AND (_scope_cidade IS NULL OR (m.meta_json->>'cidade')::TEXT = _scope_cidade)
    GROUP BY objective
  ) sub;

  -- Top cities (if no scope filter)
  IF _scope_cidade IS NULL THEN
    SELECT jsonb_agg(city_data) INTO v_top_cidades
    FROM (
      SELECT jsonb_build_object('cidade', cidade, 'count', cnt) as city_data
      FROM (
        SELECT (m.meta_json->>'cidade')::TEXT as cidade, COUNT(*) as cnt
        FROM missions m
        WHERE m.type = 'conversa'
          AND (m.meta_json->>'kind')::TEXT = 'conversa_v0'
          AND m.created_at >= v_start_date
        GROUP BY cidade
        ORDER BY cnt DESC
        LIMIT 5
      ) cities
    ) agg;
  END IF;

  RETURN jsonb_build_object(
    'period_days', _days,
    'generated', v_generated,
    'completed', v_completed,
    'completion_rate', CASE WHEN v_generated > 0 THEN ROUND((v_completed::NUMERIC / v_generated) * 100, 1) ELSE 0 END,
    'outcomes', COALESCE(v_outcomes, '{}'::JSONB),
    'by_objective', COALESCE(v_by_objective, '{}'::JSONB),
    'top_cities', COALESCE(v_top_cidades, '[]'::JSONB)
  );
END;
$$;