-- Fix: growth event allowlist was too restrictive and was breaking mission generation
-- (log_growth_event inserts into growth_events)

ALTER TABLE public.growth_events
DROP CONSTRAINT IF EXISTS growth_events_event_type_check;
