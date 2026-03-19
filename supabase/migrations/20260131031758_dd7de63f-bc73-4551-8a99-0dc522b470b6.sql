-- Fix get_my_daily_plan: replace ge.created_at with ge.occurred_at
-- The growth_events table has occurred_at, not created_at

CREATE OR REPLACE FUNCTION public.get_my_daily_plan(_day date DEFAULT NULL::date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_day date;
  v_result jsonb;
  v_steps jsonb := '[]'::jsonb;
  v_step_30s jsonb;
  v_step_5m jsonb;
  v_step_15m jsonb;
  v_has_overdue_followup boolean;
  v_contacts_this_week int;
  v_unknown_support_count int;
  v_yes_without_referral int;
  v_foco_tipo text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Default to today in São Paulo timezone
  v_day := COALESCE(_day, (now() AT TIME ZONE 'America/Sao_Paulo')::date);

  -- Check if plan already exists for this day
  SELECT jsonb_agg(
    jsonb_build_object(
      'step_key', step_key,
      'action_kind', action_kind,
      'action_ref', action_ref,
      'completed_at', completed_at
    ) ORDER BY 
      CASE step_key 
        WHEN 'step_30s' THEN 1 
        WHEN 'step_5m' THEN 2 
        WHEN 'step_15m' THEN 3 
      END
  )
  INTO v_steps
  FROM daily_plan_steps
  WHERE user_id = v_user_id AND day = v_day;

  -- If steps exist, return them
  IF v_steps IS NOT NULL AND jsonb_array_length(v_steps) = 3 THEN
    RETURN jsonb_build_object(
      'day', v_day,
      'steps', v_steps,
      'generated', false
    );
  END IF;

  -- Generate new plan using heuristics
  
  -- Check for overdue follow-ups
  SELECT EXISTS(
    SELECT 1 FROM crm_contatos
    WHERE criado_por = v_user_id
      AND deleted_at IS NULL
      AND proxima_acao_em IS NOT NULL
      AND proxima_acao_em <= now()
  ) INTO v_has_overdue_followup;

  -- Count contacts created this week
  SELECT COUNT(*) INTO v_contacts_this_week
  FROM crm_contatos
  WHERE criado_por = v_user_id
    AND deleted_at IS NULL
    AND created_at >= date_trunc('week', now() AT TIME ZONE 'America/Sao_Paulo');

  -- Count contacts with unknown support level
  SELECT COUNT(*) INTO v_unknown_support_count
  FROM crm_contatos
  WHERE criado_por = v_user_id
    AND deleted_at IS NULL
    AND support_level = 'unknown';

  -- Count "yes" contacts without recent referral ask (7 days)
  -- FIX: Use occurred_at instead of created_at (growth_events uses occurred_at)
  SELECT COUNT(*) INTO v_yes_without_referral
  FROM crm_contatos c
  WHERE c.criado_por = v_user_id
    AND c.deleted_at IS NULL
    AND c.support_level = 'yes'
    AND NOT EXISTS (
      SELECT 1 FROM growth_events ge
      WHERE ge.user_id = v_user_id
        AND ge.event_type = 'crm_support_script_copied'
        AND (ge.meta->>'type') = 'ask_referral'
        AND ge.occurred_at >= now() - interval '7 days'
    );

  -- Get user's focus type from today's checkin
  SELECT foco_tipo INTO v_foco_tipo
  FROM daily_checkins
  WHERE user_id = v_user_id AND day = v_day
  ORDER BY created_at DESC LIMIT 1;

  -- STEP 30s: Quick wins
  -- Priority: ask referral from confirmed supporters > invite
  IF v_yes_without_referral > 0 THEN
    v_step_30s := jsonb_build_object(
      'step_key', 'step_30s',
      'action_kind', 'ask_referral',
      'action_ref', 'generated',
      'completed_at', null
    );
  ELSE
    v_step_30s := jsonb_build_object(
      'step_key', 'step_30s',
      'action_kind', 'invite',
      'action_ref', 'generated',
      'completed_at', null
    );
  END IF;

  -- STEP 5m: Follow-up or qualify contacts
  IF v_has_overdue_followup THEN
    v_step_5m := jsonb_build_object(
      'step_key', 'step_5m',
      'action_kind', 'followup',
      'action_ref', 'generated',
      'completed_at', null
    );
  ELSIF v_unknown_support_count >= 3 THEN
    -- Many unknown contacts - suggest qualifying
    v_step_5m := jsonb_build_object(
      'step_key', 'step_5m',
      'action_kind', 'qualify_contact',
      'action_ref', 'generated',
      'completed_at', null
    );
  ELSIF v_contacts_this_week < 1 THEN
    v_step_5m := jsonb_build_object(
      'step_key', 'step_5m',
      'action_kind', 'crm_add',
      'action_ref', 'generated',
      'completed_at', null
    );
  ELSE
    v_step_5m := jsonb_build_object(
      'step_key', 'step_5m',
      'action_kind', 'script_copy',
      'action_ref', 'generated',
      'completed_at', null
    );
  END IF;

  -- STEP 15m: Mission based on focus
  IF v_foco_tipo = 'conversa' THEN
    v_step_15m := jsonb_build_object(
      'step_key', 'step_15m',
      'action_kind', 'mission_conversa',
      'action_ref', 'generated',
      'completed_at', null
    );
  ELSIF v_foco_tipo = 'evento' THEN
    v_step_15m := jsonb_build_object(
      'step_key', 'step_15m',
      'action_kind', 'invite_event',
      'action_ref', 'generated',
      'completed_at', null
    );
  ELSE
    v_step_15m := jsonb_build_object(
      'step_key', 'step_15m',
      'action_kind', 'mission_rua',
      'action_ref', 'generated',
      'completed_at', null
    );
  END IF;

  -- Build steps array
  v_steps := jsonb_build_array(v_step_30s, v_step_5m, v_step_15m);

  -- Insert new steps
  INSERT INTO daily_plan_steps (user_id, day, step_key, action_kind, action_ref)
  SELECT 
    v_user_id,
    v_day,
    (s->>'step_key')::text,
    (s->>'action_kind')::text,
    (s->>'action_ref')::text
  FROM jsonb_array_elements(v_steps) AS s
  ON CONFLICT (user_id, day, step_key) DO NOTHING;

  RETURN jsonb_build_object(
    'day', v_day,
    'steps', v_steps,
    'generated', true
  );
END;
$function$;