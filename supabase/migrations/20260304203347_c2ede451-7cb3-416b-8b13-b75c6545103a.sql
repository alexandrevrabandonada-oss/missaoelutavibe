
-- 1. Drop all existing overloads of log_growth_event
DROP FUNCTION IF EXISTS public.log_growth_event(text, jsonb);
DROP FUNCTION IF EXISTS public.log_growth_event(text, text, jsonb);
DROP FUNCTION IF EXISTS public.log_growth_event(text, text, text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.log_growth_event(text, uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS public.log_growth_event(text, uuid, text, jsonb, text);
DROP FUNCTION IF EXISTS public.log_growth_event(text, jsonb, uuid, text, uuid, text, text);

-- 2. Create single canonical version
CREATE OR REPLACE FUNCTION public.log_growth_event(
  _event_type text,
  _meta jsonb DEFAULT '{}'::jsonb,
  _template_id uuid DEFAULT NULL,
  _invite_code text DEFAULT NULL,
  _referrer_user_id uuid DEFAULT NULL,
  _session_id text DEFAULT NULL,
  _scope_cidade text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  INSERT INTO public.growth_events (
    event_type,
    user_id,
    occurred_at,
    template_id,
    invite_code,
    referrer_user_id,
    scope_cidade,
    meta,
    session_id
  ) VALUES (
    _event_type,
    v_user_id,
    now(),
    _template_id,
    _invite_code,
    _referrer_user_id,
    _scope_cidade,
    _meta,
    _session_id
  );
END;
$$;

-- 3. Fix get_daily_suggestions: remove 'cancelada' from enum filter
CREATE OR REPLACE FUNCTION public.get_daily_suggestions(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result JSON;
  _task_suggestion JSON;
  _crm_suggestion JSON;
  _agenda_suggestion JSON;
  _mission_suggestion JSON;
BEGIN
  SELECT json_build_object(
    'id', st.id, 'titulo', st.titulo, 'prioridade', st.prioridade,
    'prazo_em', st.prazo_em, 'status', st.status,
    'squad_id', st.squad_id, 'squad_nome', s.nome
  ) INTO _task_suggestion
  FROM squad_tasks st JOIN squads s ON s.id = st.squad_id
  WHERE st.assigned_to = _user_id AND st.status NOT IN ('feito')
  ORDER BY 
    CASE WHEN st.prazo_em IS NOT NULL AND st.prazo_em <= now() + interval '7 days' THEN 0 ELSE 1 END,
    CASE WHEN st.prioridade = 'alta' THEN 0 WHEN st.prioridade = 'media' THEN 1 ELSE 2 END,
    st.prazo_em NULLS LAST
  LIMIT 1;

  SELECT json_build_object(
    'id', c.id, 'nome', c.nome, 'telefone', c.telefone,
    'proxima_acao_em', c.proxima_acao_em, 'status', c.status
  ) INTO _crm_suggestion
  FROM crm_contatos c
  WHERE c.atribuido_a = _user_id
    AND c.proxima_acao_em IS NOT NULL
    AND c.proxima_acao_em::date <= CURRENT_DATE
    AND c.status NOT IN ('convertido', 'perdido')
  ORDER BY c.proxima_acao_em LIMIT 1;

  SELECT json_build_object(
    'id', a.id, 'titulo', a.titulo, 'inicio_em', a.inicio_em,
    'local_texto', a.local_texto, 'tipo', a.tipo
  ) INTO _agenda_suggestion
  FROM atividades a
  WHERE a.status = 'publicada'
    AND a.inicio_em >= now()
    AND a.inicio_em <= now() + interval '48 hours'
    AND (
      a.celula_id IN (SELECT cell_id FROM cell_memberships WHERE user_id = _user_id AND is_active = true)
      OR a.cidade IN (SELECT p.city FROM profiles p WHERE p.id = _user_id)
    )
  ORDER BY a.inicio_em LIMIT 1;

  -- FIXED: removed 'cancelada' which is not a valid mission_status enum value
  SELECT json_build_object(
    'id', m.id, 'title', m.title, 'type', m.type,
    'deadline', m.deadline, 'status', m.status
  ) INTO _mission_suggestion
  FROM missions m
  WHERE (m.assigned_to = _user_id OR m.cell_id IN (SELECT cell_id FROM cell_memberships WHERE user_id = _user_id AND is_active = true))
    AND m.status NOT IN ('concluida', 'reprovada')
  ORDER BY 
    CASE WHEN m.deadline IS NOT NULL AND m.deadline <= now() + interval '7 days' THEN 0 ELSE 1 END,
    m.deadline NULLS LAST
  LIMIT 1;

  _result := json_build_object(
    'task', _task_suggestion, 'crm', _crm_suggestion,
    'agenda', _agenda_suggestion, 'mission', _mission_suggestion,
    'generated_at', now()
  );
  RETURN _result;
END;
$$;

-- 4. Fix get_my_weekly_share_pack: replace created_at with occurred_at
CREATE OR REPLACE FUNCTION public.get_my_weekly_share_pack()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_week_key text;
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_actions_count int := 0;
  v_eligible bool := false;
  v_reason text := null;
  v_invite_code text;
  v_already_shared bool := false;
  v_share_text text;
  v_app_mode text;
  v_streak_milestone bool := false;
  v_return_complete bool := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'error', 'not_authenticated');
  END IF;

  v_week_key := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'IYYY-"W"IW');
  v_week_start := date_trunc('week', (now() AT TIME ZONE 'America/Sao_Paulo'))::date;
  v_week_end := v_week_start + interval '7 days';

  -- FIXED: occurred_at instead of created_at
  SELECT count(DISTINCT date_trunc('day', ge.occurred_at AT TIME ZONE 'America/Sao_Paulo'))
  INTO v_actions_count
  FROM growth_events ge
  WHERE ge.user_id = v_user_id
    AND ge.occurred_at >= v_week_start AND ge.occurred_at < v_week_end
    AND ge.event_type IN (
      'next_action_completed', 'street_mission_completed', 
      'conversation_mission_completed', 'followup_done',
      'contact_created', 'micro_action_completed'
    );

  SELECT EXISTS(
    SELECT 1 FROM growth_events ge
    WHERE ge.user_id = v_user_id AND ge.event_type = 'streak_goal3_completed'
      AND ge.occurred_at >= v_week_start AND ge.occurred_at < v_week_end
  ) INTO v_streak_milestone;

  SELECT EXISTS(
    SELECT 1 FROM growth_events ge
    WHERE ge.user_id = v_user_id AND ge.event_type = 'return_mode_complete'
      AND ge.occurred_at >= v_week_start AND ge.occurred_at < v_week_end
  ) INTO v_return_complete;

  IF v_actions_count >= 3 THEN
    v_eligible := true; v_reason := 'goal3';
  ELSIF v_streak_milestone THEN
    v_eligible := true; v_reason := 'streak_milestone';
  ELSIF v_return_complete THEN
    v_eligible := true; v_reason := 'return_complete';
  END IF;

  SELECT c.code INTO v_invite_code
  FROM convites c WHERE c.criado_por = v_user_id AND c.ativo = true
  ORDER BY c.criado_em DESC LIMIT 1;

  IF v_invite_code IS NULL THEN
    v_invite_code := substr(md5(v_user_id::text || now()::text), 1, 8);
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM growth_events ge
    WHERE ge.user_id = v_user_id AND ge.event_type = 'weekly_sharepack_shared'
      AND ge.occurred_at >= v_week_start AND ge.occurred_at < v_week_end
  ) INTO v_already_shared;

  SELECT ac.mode INTO v_app_mode FROM app_config ac LIMIT 1;
  v_app_mode := COALESCE(v_app_mode, 'pre');

  IF v_reason = 'goal3' THEN
    v_share_text := 'Fechei 3 ações essa semana no #ÉLUTA! 💪

Quer somar? Entra por aqui: https://missaoeluta.lovable.app/r/' || v_invite_code;
  ELSIF v_reason = 'streak_milestone' THEN
    v_share_text := 'Completei 3 dias seguidos de luta no #ÉLUTA! 🔥

Quer somar? Entra por aqui: https://missaoeluta.lovable.app/r/' || v_invite_code;
  ELSIF v_reason = 'return_complete' THEN
    v_share_text := 'Voltei pra luta no #ÉLUTA! ✊

Quer somar? Entra por aqui: https://missaoeluta.lovable.app/r/' || v_invite_code;
  ELSE
    v_share_text := 'Faço parte do #ÉLUTA — Escutar • Cuidar • Organizar

Quer somar? Entra por aqui: https://missaoeluta.lovable.app/r/' || v_invite_code;
  END IF;

  IF v_app_mode = 'pre' THEN
    v_share_text := v_share_text || '

Pré-campanha — Escutar • Cuidar • Organizar';
  ELSIF v_app_mode = 'campanha' THEN
    v_share_text := v_share_text || '

Campanha — Juntos na luta!';
  END IF;

  RETURN jsonb_build_object(
    'week_key', v_week_key, 'eligible', v_eligible, 'reason', v_reason,
    'invite_code', v_invite_code, 'share_text', v_share_text,
    'share_card_kind', 'impact', 'already_shared', v_already_shared,
    'actions_count', v_actions_count
  );
END;
$$;
