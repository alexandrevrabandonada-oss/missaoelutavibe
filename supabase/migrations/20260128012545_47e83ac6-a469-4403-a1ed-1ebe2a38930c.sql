
-- RPC: get_my_impact_metrics
-- Aggregates volunteer impact metrics for the last N days
CREATE OR REPLACE FUNCTION public.get_my_impact_metrics(_window_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _start_date timestamptz;
  _actions_completed int := 0;
  _contacts_added int := 0;
  _invites_shared int := 0;
  _current_streak int := 0;
  _goal_target int := 3;
  _goal_progress int;
  _goal_label text := 'Meta da semana: 3 ações';
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Calculate start date in São Paulo timezone
  _start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo' - (_window_days || ' days')::interval)::date::timestamptz;

  -- Count actions completed (multiple event types)
  SELECT COALESCE(COUNT(*), 0) INTO _actions_completed
  FROM growth_events
  WHERE user_id = _user_id
    AND created_at >= _start_date
    AND event_type IN (
      'next_action_completed',
      'street_mission_completed',
      'conversation_mission_completed',
      'followup_done',
      'contact_created',
      'micro_action_completed'
    );

  -- Count contacts added
  SELECT COALESCE(COUNT(*), 0) INTO _contacts_added
  FROM growth_events
  WHERE user_id = _user_id
    AND created_at >= _start_date
    AND event_type = 'contact_created';

  -- Count invites shared
  SELECT COALESCE(COUNT(*), 0) INTO _invites_shared
  FROM growth_events
  WHERE user_id = _user_id
    AND created_at >= _start_date
    AND event_type = 'invite_shared';

  -- Get current streak from existing RPC
  SELECT COALESCE((get_my_streak_metrics()->>'current_streak')::int, 0) INTO _current_streak;

  -- Calculate goal progress (capped at target)
  _goal_progress := LEAST(_actions_completed, _goal_target);

  RETURN jsonb_build_object(
    'ok', true,
    'actions_completed', _actions_completed,
    'contacts_added', _contacts_added,
    'invites_shared', _invites_shared,
    'current_streak', _current_streak,
    'goal_label', _goal_label,
    'goal_progress', _goal_progress,
    'goal_target', _goal_target,
    'window_days', _window_days
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_impact_metrics(int) TO authenticated;

-- Add new event types to whitelist
DO $$
BEGIN
  -- These events should already be in the whitelist via log_growth_event
  -- We just document them here for clarity:
  -- impact_viewed, impact_share_opened, impact_shared, impact_cta_clicked, impact_info_opened
  NULL;
END $$;
