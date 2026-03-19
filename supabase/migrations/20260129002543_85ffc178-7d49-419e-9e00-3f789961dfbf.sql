-- Create daily_plan_steps table
CREATE TABLE public.daily_plan_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day date NOT NULL,
  step_key text NOT NULL CHECK (step_key IN ('step_30s', 'step_5m', 'step_15m')),
  action_kind text NOT NULL,
  action_ref text NOT NULL DEFAULT 'none',
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_plan_steps_unique UNIQUE (user_id, day, step_key)
);

-- Enable RLS
ALTER TABLE public.daily_plan_steps ENABLE ROW LEVEL SECURITY;

-- RLS: user can only see their own steps
CREATE POLICY "Users can view own daily plan steps"
  ON public.daily_plan_steps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own daily plan steps"
  ON public.daily_plan_steps FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_daily_plan_steps_user_day ON public.daily_plan_steps(user_id, day);

-- RPC: Get or generate daily plan
CREATE OR REPLACE FUNCTION public.get_my_daily_plan(_day date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_day date;
  v_steps jsonb;
  v_has_overdue_followup boolean := false;
  v_contacts_this_week int := 0;
  v_foco_tipo text := 'nenhum';
  v_step_5m_kind text;
  v_step_15m_kind text;
BEGIN
  IF v_uid IS NULL THEN
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
  WHERE user_id = v_uid AND day = v_day;

  -- If plan exists, return it
  IF v_steps IS NOT NULL AND jsonb_array_length(v_steps) = 3 THEN
    RETURN jsonb_build_object(
      'day', v_day,
      'steps', v_steps,
      'generated', false
    );
  END IF;

  -- Generate new plan based on heuristics
  
  -- Check for overdue follow-ups (proxima_acao_em in the past)
  SELECT EXISTS(
    SELECT 1 FROM crm_contatos
    WHERE criado_por = v_uid
      AND deleted_at IS NULL
      AND proxima_acao_em IS NOT NULL
      AND proxima_acao_em < now()
    LIMIT 1
  ) INTO v_has_overdue_followup;

  -- Count contacts created this week
  SELECT COUNT(*) INTO v_contacts_this_week
  FROM crm_contatos
  WHERE criado_por = v_uid
    AND deleted_at IS NULL
    AND created_at >= date_trunc('week', v_day)
    AND created_at < date_trunc('week', v_day) + interval '7 days';

  -- Get user's focus from today's checkin
  SELECT foco_tipo INTO v_foco_tipo
  FROM daily_checkins
  WHERE user_id = v_uid
    AND day = v_day
  ORDER BY created_at DESC
  LIMIT 1;

  -- Determine step_5m action
  IF v_has_overdue_followup THEN
    v_step_5m_kind := 'followup';
  ELSIF v_contacts_this_week < 1 THEN
    v_step_5m_kind := 'crm_add';
  ELSE
    v_step_5m_kind := 'script_copy';
  END IF;

  -- Determine step_15m action based on focus
  IF v_foco_tipo = 'crm' THEN
    v_step_15m_kind := 'mission_conversa';
  ELSE
    v_step_15m_kind := 'mission_rua';
  END IF;

  -- Delete any partial existing steps for this day
  DELETE FROM daily_plan_steps WHERE user_id = v_uid AND day = v_day;

  -- Insert the 3 steps
  INSERT INTO daily_plan_steps (user_id, day, step_key, action_kind, action_ref)
  VALUES 
    (v_uid, v_day, 'step_30s', 'invite', 'present'),
    (v_uid, v_day, 'step_5m', v_step_5m_kind, CASE WHEN v_has_overdue_followup THEN 'present' ELSE 'none' END),
    (v_uid, v_day, 'step_15m', v_step_15m_kind, 'generated');

  -- Return the new plan
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
  WHERE user_id = v_uid AND day = v_day;

  RETURN jsonb_build_object(
    'day', v_day,
    'steps', v_steps,
    'generated', true
  );
END;
$$;

-- RPC: Complete a daily plan step
CREATE OR REPLACE FUNCTION public.complete_daily_plan_step(_day date, _step_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_step record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update the step
  UPDATE daily_plan_steps
  SET completed_at = now()
  WHERE user_id = v_uid 
    AND day = _day 
    AND step_key = _step_key
    AND completed_at IS NULL
  RETURNING * INTO v_step;

  IF v_step IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found_or_already_completed');
  END IF;

  -- Log growth event
  PERFORM log_growth_event(
    'daily_plan_step_completed',
    jsonb_build_object(
      'step_key', _step_key,
      'action_kind', v_step.action_kind
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'step_key', _step_key,
    'action_kind', v_step.action_kind,
    'completed_at', v_step.completed_at
  );
END;
$$;

-- RPC: Reset daily plan (optional, for testing/admin)
CREATE OR REPLACE FUNCTION public.reset_my_daily_plan(_day date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_day date;
  v_deleted int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_day := COALESCE(_day, (now() AT TIME ZONE 'America/Sao_Paulo')::date);

  DELETE FROM daily_plan_steps
  WHERE user_id = v_uid AND day = v_day;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Log if anything was deleted
  IF v_deleted > 0 THEN
    PERFORM log_growth_event(
      'daily_plan_regenerated',
      jsonb_build_object('reason', 'manual_reset')
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'deleted', v_deleted);
END;
$$;