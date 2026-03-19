-- RPC: get_my_weekly_share_pack
-- Returns eligibility and share data for weekly share pack feature
-- No new tables - calculates from growth_events + convites

CREATE OR REPLACE FUNCTION public.get_my_weekly_share_pack()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Get week key and boundaries (São Paulo timezone)
  v_week_key := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'IYYY-"W"IW');
  v_week_start := date_trunc('week', (now() AT TIME ZONE 'America/Sao_Paulo'))::date;
  v_week_end := v_week_start + interval '7 days';

  -- Count qualifying actions this week
  SELECT count(DISTINCT date_trunc('day', ge.created_at AT TIME ZONE 'America/Sao_Paulo'))
  INTO v_actions_count
  FROM growth_events ge
  WHERE ge.user_id = v_user_id
    AND ge.created_at >= v_week_start
    AND ge.created_at < v_week_end
    AND ge.event_type IN (
      'next_action_completed',
      'street_mission_completed', 
      'conversation_mission_completed',
      'followup_done',
      'contact_created',
      'micro_action_completed'
    );

  -- Check for streak milestone this week (streak_goal3_completed)
  SELECT EXISTS(
    SELECT 1 FROM growth_events ge
    WHERE ge.user_id = v_user_id
      AND ge.event_type = 'streak_goal3_completed'
      AND ge.created_at >= v_week_start
      AND ge.created_at < v_week_end
  ) INTO v_streak_milestone;

  -- Check for return mode complete this week
  SELECT EXISTS(
    SELECT 1 FROM growth_events ge
    WHERE ge.user_id = v_user_id
      AND ge.event_type = 'return_mode_complete'
      AND ge.created_at >= v_week_start
      AND ge.created_at < v_week_end
  ) INTO v_return_complete;

  -- Determine eligibility and reason
  IF v_actions_count >= 3 THEN
    v_eligible := true;
    v_reason := 'goal3';
  ELSIF v_streak_milestone THEN
    v_eligible := true;
    v_reason := 'streak_milestone';
  ELSIF v_return_complete THEN
    v_eligible := true;
    v_reason := 'return_complete';
  END IF;

  -- Get user's invite code (reuse existing)
  SELECT c.code INTO v_invite_code
  FROM convites c
  WHERE c.criado_por = v_user_id
    AND c.ativo = true
  ORDER BY c.criado_em DESC
  LIMIT 1;

  -- If no invite code exists, generate one
  IF v_invite_code IS NULL THEN
    v_invite_code := substr(md5(v_user_id::text || now()::text), 1, 8);
  END IF;

  -- Check if already shared this week
  SELECT EXISTS(
    SELECT 1 FROM growth_events ge
    WHERE ge.user_id = v_user_id
      AND ge.event_type = 'weekly_sharepack_shared'
      AND ge.created_at >= v_week_start
      AND ge.created_at < v_week_end
  ) INTO v_already_shared;

  -- Get app mode for branding
  SELECT ac.mode INTO v_app_mode
  FROM app_config ac
  LIMIT 1;
  
  v_app_mode := COALESCE(v_app_mode, 'pre');

  -- Build share text based on reason
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

  -- Add context line based on mode
  IF v_app_mode = 'pre' THEN
    v_share_text := v_share_text || '

Pré-campanha — Escutar • Cuidar • Organizar';
  ELSIF v_app_mode = 'campanha' THEN
    v_share_text := v_share_text || '

Campanha — Juntos na luta!';
  END IF;

  RETURN jsonb_build_object(
    'week_key', v_week_key,
    'eligible', v_eligible,
    'reason', v_reason,
    'invite_code', v_invite_code,
    'share_text', v_share_text,
    'share_card_kind', 'impact',
    'already_shared', v_already_shared,
    'actions_count', v_actions_count
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_my_weekly_share_pack() TO authenticated;