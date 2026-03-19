-- Create RPC for territory funnel by city (7d and 30d)
-- Returns aggregated growth events per city with conversion metrics
-- Respects admin scope: state-level admins see all, city coordinators see only their city

CREATE OR REPLACE FUNCTION public.get_territory_funnel_by_city(
  p_period_days INTEGER DEFAULT 7,
  p_scope_cidade TEXT DEFAULT NULL
)
RETURNS TABLE (
  cidade TEXT,
  link_open BIGINT,
  form_open BIGINT,
  signup BIGINT,
  approved BIGINT,
  first_action BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  v_start_date := NOW() - (p_period_days || ' days')::INTERVAL;
  
  RETURN QUERY
  WITH events_by_city AS (
    SELECT 
      COALESCE(
        ge.scope_cidade,
        (ge.meta->>'cidade')::TEXT,
        'Não identificada'
      ) AS cidade_name,
      ge.event_type
    FROM growth_events ge
    WHERE ge.occurred_at >= v_start_date
      AND (
        p_scope_cidade IS NULL 
        OR COALESCE(ge.scope_cidade, (ge.meta->>'cidade')::TEXT) = p_scope_cidade
      )
  ),
  aggregated AS (
    SELECT 
      e.cidade_name,
      COUNT(*) FILTER (WHERE e.event_type = 'territory_link_open') AS link_open_count,
      COUNT(*) FILTER (WHERE e.event_type = 'invite_form_open') AS form_open_count,
      COUNT(*) FILTER (WHERE e.event_type = 'signup') AS signup_count,
      COUNT(*) FILTER (WHERE e.event_type = 'approved') AS approved_count,
      COUNT(*) FILTER (WHERE e.event_type = 'first_action') AS first_action_count
    FROM events_by_city e
    WHERE e.cidade_name IS NOT NULL AND e.cidade_name != ''
    GROUP BY e.cidade_name
  )
  SELECT 
    a.cidade_name AS cidade,
    a.link_open_count AS link_open,
    a.form_open_count AS form_open,
    a.signup_count AS signup,
    a.approved_count AS approved,
    a.first_action_count AS first_action
  FROM aggregated a
  WHERE a.link_open_count > 0 OR a.form_open_count > 0 OR a.signup_count > 0
  ORDER BY a.link_open_count DESC, a.signup_count DESC;
END;
$$;

-- Add index on growth_events for faster aggregation by city and time
CREATE INDEX IF NOT EXISTS idx_growth_events_occurred_at 
  ON growth_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_growth_events_scope_cidade 
  ON growth_events (scope_cidade);

CREATE INDEX IF NOT EXISTS idx_growth_events_event_type_occurred 
  ON growth_events (event_type, occurred_at DESC);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_territory_funnel_by_city TO authenticated;