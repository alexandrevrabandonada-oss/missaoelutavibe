-- =============================================================================
-- CADÊNCIA V0: Follow-up scheduling after conversation missions
-- =============================================================================

-- 1) Add fields to crm_contatos for follow-up scheduling
ALTER TABLE public.crm_contatos 
ADD COLUMN IF NOT EXISTS next_action_kind TEXT CHECK (next_action_kind IN ('followup', 'agendar', 'nutrir', 'encerrar'));

ALTER TABLE public.crm_contatos 
ADD COLUMN IF NOT EXISTS next_action_context JSONB DEFAULT '{}'::JSONB;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_crm_contatos_next_action_at ON public.crm_contatos(proxima_acao_em);
CREATE INDEX IF NOT EXISTS idx_crm_contatos_next_action_kind ON public.crm_contatos(next_action_kind);

-- 2) Create crm_followup_logs table
CREATE TABLE IF NOT EXISTS public.crm_followup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('created', 'done', 'snoozed')),
  scheduled_for TIMESTAMPTZ,
  meta JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for crm_followup_logs
CREATE INDEX IF NOT EXISTS idx_crm_followup_logs_contact ON public.crm_followup_logs(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_followup_logs_user ON public.crm_followup_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_followup_logs_kind ON public.crm_followup_logs(kind);

-- RLS for crm_followup_logs
ALTER TABLE public.crm_followup_logs ENABLE ROW LEVEL SECURITY;

-- Users can see their own logs
CREATE POLICY "Users can view own followup logs"
ON public.crm_followup_logs FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own logs
CREATE POLICY "Users can insert own followup logs"
ON public.crm_followup_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY "Admins can view all followup logs"
ON public.crm_followup_logs FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

-- Coordinators can view logs in their scope (using correct column names: cidade, cell_id)
CREATE POLICY "Coordinators can view scoped followup logs"
ON public.crm_followup_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.crm_contatos c ON c.id = crm_followup_logs.contact_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('coordenador_estadual', 'coordenador_regional', 'coordenador_celula')
    AND ur.revoked_at IS NULL
    AND (
      (ur.role = 'coordenador_estadual' AND ur.cidade = c.cidade) OR
      (ur.role = 'coordenador_regional' AND ur.cidade = c.cidade) OR
      (ur.role = 'coordenador_celula' AND ur.cell_id::TEXT = c.escopo_id)
    )
  )
);

-- 3) Add growth event types for follow-up tracking
ALTER TABLE public.growth_events 
DROP CONSTRAINT IF EXISTS growth_events_event_type_check;

ALTER TABLE public.growth_events 
ADD CONSTRAINT growth_events_event_type_check 
CHECK (event_type IN (
  -- Existing events
  'signup', 'mission_complete', 'evidence_submit', 'share_copy', 'share_download',
  'profile_updated', 'first_mission_completed', 'interest_selected', 'invite_created',
  'invite_used', 'invite_signup', 'share_pack_generated', 'share_pack_copied', 
  'share_pack_downloaded', 'street_mission_generated', 'street_mission_opened',
  'street_mission_completed', 'territory_link_copied', 'roteiro_track', 'visit_comecar',
  'conversation_mission_generated', 'conversation_mission_opened', 'conversation_mission_completed',
  'conversation_script_copied', 'conversation_whatsapp_opened', 'checkin_error',
  -- NEW: Follow-up events
  'followup_list_viewed', 'followup_whatsapp_opened', 'followup_done', 'followup_snoozed'
));

-- Update log_growth_event RPC to include new event types
CREATE OR REPLACE FUNCTION public.log_growth_event(
  _event_type TEXT,
  _meta JSONB DEFAULT '{}'::JSONB,
  _template_id UUID DEFAULT NULL,
  _invite_code TEXT DEFAULT NULL,
  _referrer_user_id UUID DEFAULT NULL,
  _session_id TEXT DEFAULT NULL,
  _scope_cidade TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id UUID;
  v_user_id UUID;
  v_allowed_types TEXT[] := ARRAY[
    'signup', 'mission_complete', 'evidence_submit', 'share_copy', 'share_download',
    'profile_updated', 'first_mission_completed', 'interest_selected', 'invite_created',
    'invite_used', 'invite_signup', 'share_pack_generated', 'share_pack_copied',
    'share_pack_downloaded', 'street_mission_generated', 'street_mission_opened',
    'street_mission_completed', 'territory_link_copied', 'roteiro_track', 'visit_comecar',
    'conversation_mission_generated', 'conversation_mission_opened', 'conversation_mission_completed',
    'conversation_script_copied', 'conversation_whatsapp_opened', 'checkin_error',
    'followup_list_viewed', 'followup_whatsapp_opened', 'followup_done', 'followup_snoozed'
  ];
BEGIN
  -- Validate event type
  IF NOT (_event_type = ANY(v_allowed_types)) THEN
    RAISE EXCEPTION 'Invalid event type: %', _event_type;
  END IF;

  -- Get current user (can be null for anonymous)
  v_user_id := auth.uid();

  -- Sanitize inputs
  _session_id := LEFT(COALESCE(_session_id, ''), 80);
  _scope_cidade := LEFT(COALESCE(_scope_cidade, ''), 80);
  _invite_code := LEFT(COALESCE(_invite_code, ''), 20);

  -- Rate limiting: 10 events per minute per session/user
  IF EXISTS (
    SELECT 1 FROM growth_events
    WHERE (
      (v_user_id IS NOT NULL AND user_id = v_user_id) OR
      (_session_id IS NOT NULL AND session_id = _session_id)
    )
    AND occurred_at > now() - interval '1 minute'
    GROUP BY COALESCE(user_id::TEXT, session_id)
    HAVING COUNT(*) >= 10
  ) THEN
    RETURN NULL;
  END IF;

  -- Insert event
  INSERT INTO growth_events (
    event_type, user_id, meta, template_id, invite_code,
    referrer_user_id, session_id, scope_cidade
  ) VALUES (
    _event_type, v_user_id, _meta, _template_id, NULLIF(_invite_code, ''),
    _referrer_user_id, NULLIF(_session_id, ''), NULLIF(_scope_cidade, '')
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- 4) Update complete_conversation_mission to schedule follow-ups
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
  v_next_action_at TIMESTAMPTZ;
  v_next_action_kind TEXT;
  v_now_sp TIMESTAMPTZ;
  v_context JSONB;
BEGIN
  -- Validate user
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get current time in São Paulo timezone
  v_now_sp := now() AT TIME ZONE 'America/Sao_Paulo';

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

    -- ============================================
    -- CADÊNCIA: Schedule next action based on outcome
    -- ============================================
    v_next_action_at := NULL;
    v_next_action_kind := NULL;

    CASE v_result.outcome
      WHEN 'topou' THEN
        -- Schedule to confirm/onboard in 24h
        v_next_action_at := v_now_sp + INTERVAL '24 hours';
        v_next_action_kind := 'agendar';
      WHEN 'talvez_depois' THEN
        -- Follow-up in 48h
        v_next_action_at := v_now_sp + INTERVAL '48 hours';
        v_next_action_kind := 'followup';
      WHEN 'sem_resposta' THEN
        -- Follow-up in 72h
        v_next_action_at := v_now_sp + INTERVAL '72 hours';
        v_next_action_kind := 'followup';
      WHEN 'convite_enviado' THEN
        -- Confirm receipt in 48h
        v_next_action_at := v_now_sp + INTERVAL '48 hours';
        v_next_action_kind := 'followup';
      WHEN 'nao_agora' THEN
        -- Nurture in 30 days
        v_next_action_at := v_now_sp + INTERVAL '30 days';
        v_next_action_kind := 'nutrir';
      WHEN 'numero_errado' THEN
        -- Mark as closed, no next action
        v_next_action_at := NULL;
        v_next_action_kind := 'encerrar';
      ELSE
        v_next_action_at := NULL;
        v_next_action_kind := NULL;
    END CASE;

    -- Build context
    v_context := jsonb_build_object(
      'objective', v_mission.meta_json->>'objective',
      'channel', v_mission.meta_json->>'channel',
      'outcome', v_result.outcome,
      'roteiro_id', v_mission.meta_json->>'roteiro_id',
      'mission_id', _mission_id,
      'updated_at', now()
    );

    -- Update contact with next action
    UPDATE crm_contatos
    SET 
      proxima_acao_em = v_next_action_at,
      next_action_kind = v_next_action_kind,
      next_action_context = v_context,
      updated_at = now()
    WHERE id = v_result.contact_id;

    -- Log followup creation (no PII)
    IF v_next_action_kind IS NOT NULL AND v_next_action_kind != 'encerrar' THEN
      INSERT INTO crm_followup_logs (contact_id, user_id, kind, scheduled_for, meta)
      VALUES (
        v_result.contact_id,
        v_user_id,
        'created',
        v_next_action_at,
        jsonb_build_object(
          'action_kind', v_next_action_kind,
          'outcome', v_result.outcome,
          'objective', v_mission.meta_json->>'objective'
        )
      );
    END IF;

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

-- 5) RPC: get_my_due_followups - Get follow-ups due for the current user
CREATE OR REPLACE FUNCTION public.get_my_due_followups(_limit INT DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '[]'::JSONB;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::JSONB)
  INTO v_result
  FROM (
    SELECT 
      c.id,
      LEFT(SPLIT_PART(c.nome, ' ', 1), 20) AS nome_curto, -- First name only, max 20 chars
      c.bairro,
      c.cidade,
      c.tags,
      c.status,
      c.proxima_acao_em AS scheduled_for,
      c.next_action_kind AS kind,
      c.next_action_context AS context
    FROM crm_contatos c
    WHERE c.atribuido_a = v_user_id
      AND c.proxima_acao_em IS NOT NULL
      AND c.proxima_acao_em <= now()
      AND c.next_action_kind IS NOT NULL
      AND c.next_action_kind != 'encerrar'
    ORDER BY c.proxima_acao_em ASC
    LIMIT _limit
  ) f;

  -- Log view event (no PII)
  INSERT INTO growth_events (event_type, user_id, meta)
  VALUES ('followup_list_viewed', v_user_id, jsonb_build_object('count', jsonb_array_length(v_result)));

  RETURN v_result;
END;
$$;

-- 6) RPC: mark_followup_done - Mark a follow-up as completed
CREATE OR REPLACE FUNCTION public.mark_followup_done(_contact_id UUID, _meta JSONB DEFAULT '{}'::JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_contact RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  -- Get contact and verify ownership
  SELECT id, atribuido_a, next_action_kind, next_action_context, cidade
  INTO v_contact
  FROM crm_contatos
  WHERE id = _contact_id;

  IF v_contact.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Contato não encontrado');
  END IF;

  IF v_contact.atribuido_a != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sem permissão para este contato');
  END IF;

  -- Clear next action
  UPDATE crm_contatos
  SET 
    proxima_acao_em = NULL,
    next_action_kind = NULL,
    next_action_context = '{}'::JSONB,
    updated_at = now()
  WHERE id = _contact_id;

  -- Log completion
  INSERT INTO crm_followup_logs (contact_id, user_id, kind, meta)
  VALUES (_contact_id, v_user_id, 'done', _meta);

  -- Log growth event (no PII)
  INSERT INTO growth_events (event_type, user_id, meta, scope_cidade)
  VALUES (
    'followup_done',
    v_user_id,
    jsonb_build_object(
      'kind', v_contact.next_action_kind,
      'objective', v_contact.next_action_context->>'objective'
    ),
    v_contact.cidade
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7) RPC: snooze_followup - Postpone a follow-up
CREATE OR REPLACE FUNCTION public.snooze_followup(_contact_id UUID, _hours INT DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_contact RECORD;
  v_new_date TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  -- Limit snooze to reasonable range (1-168 hours = 1 week)
  IF _hours < 1 OR _hours > 168 THEN
    _hours := 24;
  END IF;

  -- Get contact and verify ownership
  SELECT id, atribuido_a, next_action_kind, next_action_context, cidade
  INTO v_contact
  FROM crm_contatos
  WHERE id = _contact_id;

  IF v_contact.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Contato não encontrado');
  END IF;

  IF v_contact.atribuido_a != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sem permissão para este contato');
  END IF;

  -- Calculate new date in SP timezone
  v_new_date := (now() AT TIME ZONE 'America/Sao_Paulo') + (_hours || ' hours')::INTERVAL;

  -- Update next action date
  UPDATE crm_contatos
  SET 
    proxima_acao_em = v_new_date,
    updated_at = now()
  WHERE id = _contact_id;

  -- Log snooze
  INSERT INTO crm_followup_logs (contact_id, user_id, kind, scheduled_for, meta)
  VALUES (_contact_id, v_user_id, 'snoozed', v_new_date, jsonb_build_object('hours', _hours));

  -- Log growth event (no PII)
  INSERT INTO growth_events (event_type, user_id, meta, scope_cidade)
  VALUES (
    'followup_snoozed',
    v_user_id,
    jsonb_build_object(
      'kind', v_contact.next_action_kind,
      'hours', _hours,
      'objective', v_contact.next_action_context->>'objective'
    ),
    v_contact.cidade
  );

  RETURN jsonb_build_object('success', true, 'new_date', v_new_date);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_due_followups(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_followup_done(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.snooze_followup(UUID, INT) TO authenticated;