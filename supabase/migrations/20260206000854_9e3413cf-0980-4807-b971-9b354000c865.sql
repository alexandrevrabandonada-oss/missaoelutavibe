-- Add 90-day retention policy for growth_events table
-- This limits data exposure window and implements privacy-by-design

-- Insert retention policy for growth_events (90 days)
INSERT INTO public.retention_policies (nome, tabela, dias_reter, ativo)
VALUES ('Growth Events Cleanup', 'growth_events', 90, true);

-- Create function to clean old growth events based on retention policy
CREATE OR REPLACE FUNCTION public.cleanup_old_growth_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count integer;
  v_retention_days integer;
BEGIN
  -- Get retention period from policy
  SELECT dias_reter INTO v_retention_days
  FROM retention_policies
  WHERE tabela = 'growth_events' AND ativo = true
  LIMIT 1;
  
  -- Default to 90 days if no policy
  IF v_retention_days IS NULL THEN
    v_retention_days := 90;
  END IF;
  
  -- Delete old events
  DELETE FROM growth_events
  WHERE occurred_at < NOW() - (v_retention_days || ' days')::interval;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Revoke execute from public (cleanup should be run by service role only)
REVOKE ALL ON FUNCTION public.cleanup_old_growth_events() FROM PUBLIC;

-- Add comment documenting the retention policy
COMMENT ON FUNCTION public.cleanup_old_growth_events() IS 
'Removes growth_events older than dias_reter (default 90 days). Run via scheduled job for LGPD/privacy compliance.';