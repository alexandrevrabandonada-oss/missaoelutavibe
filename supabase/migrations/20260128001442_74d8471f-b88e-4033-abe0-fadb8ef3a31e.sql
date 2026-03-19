-- RPC: get_my_streak_metrics
-- Returns streak data for current user without PII
-- Considers timezone America/Sao_Paulo

CREATE OR REPLACE FUNCTION public.get_my_streak_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _today date;
  _yesterday date;
  _active_days date[];
  _current_streak int := 0;
  _last_active_date date := NULL;
  _days_in_last_7 int := 0;
  _goal3_progress int := 0;
  _goal3_completed_before boolean := false;
  _d date;
BEGIN
  -- Get current date in Sao Paulo timezone
  _today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
  _yesterday := _today - INTERVAL '1 day';

  -- Get distinct active days from growth_events in last 30 days
  -- Active = next_action_completed OR micro_action_completed
  SELECT ARRAY_AGG(DISTINCT active_day ORDER BY active_day DESC)
  INTO _active_days
  FROM (
    SELECT ((ge.occurred_at AT TIME ZONE 'America/Sao_Paulo')::date) AS active_day
    FROM growth_events ge
    WHERE ge.user_id = _user_id
      AND ge.occurred_at >= (NOW() - INTERVAL '30 days')
      AND (
        ge.event_type = 'next_action_completed' OR
        ge.event_type = 'micro_action_completed'
      )
  ) sub;

  -- Handle null case
  IF _active_days IS NULL THEN
    _active_days := ARRAY[]::date[];
  END IF;

  -- Calculate current streak
  -- Start from today or yesterday, count consecutive days backwards
  IF _today = ANY(_active_days) THEN
    _current_streak := 1;
    _last_active_date := _today;
    _d := _today - INTERVAL '1 day';
  ELSIF _yesterday = ANY(_active_days) THEN
    _current_streak := 1;
    _last_active_date := _yesterday;
    _d := _yesterday - INTERVAL '1 day';
  ELSE
    _current_streak := 0;
    _last_active_date := NULL;
    _d := NULL;
  END IF;

  -- Count consecutive days backwards
  WHILE _d IS NOT NULL AND _d = ANY(_active_days) LOOP
    _current_streak := _current_streak + 1;
    _d := _d - INTERVAL '1 day';
  END LOOP;

  -- Days in last 7
  SELECT COUNT(*)
  INTO _days_in_last_7
  FROM UNNEST(_active_days) AS d
  WHERE d >= (_today - INTERVAL '6 days');

  -- Goal 3 progress (capped at 3)
  _goal3_progress := LEAST(_current_streak, 3);

  -- Check if goal3 was completed before (has any streak >= 3 event)
  SELECT EXISTS(
    SELECT 1 FROM growth_events
    WHERE user_id = _user_id
      AND event_type = 'streak_goal3_completed'
    LIMIT 1
  ) INTO _goal3_completed_before;

  RETURN json_build_object(
    'current_streak', _current_streak,
    'last_active_date', _last_active_date,
    'days_in_last_7', _days_in_last_7,
    'goal3_progress', _goal3_progress,
    'goal3_completed_before', _goal3_completed_before,
    'is_active_today', (_today = ANY(_active_days))
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_streak_metrics() TO authenticated;

-- Add index for performance on growth_events if not exists
CREATE INDEX IF NOT EXISTS idx_growth_events_user_type_occurred 
ON growth_events(user_id, event_type, occurred_at DESC);