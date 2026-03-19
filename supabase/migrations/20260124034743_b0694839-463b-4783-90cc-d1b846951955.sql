-- Remove the old check constraint that conflicts with the RPC whitelist
-- The validation is now handled in the log_growth_event function
ALTER TABLE public.growth_events DROP CONSTRAINT IF EXISTS growth_events_event_type_check;

-- Add updated check constraint with all valid event types
ALTER TABLE public.growth_events ADD CONSTRAINT growth_events_event_type_check 
CHECK (event_type IN (
  'visit', 'signup', 'territory_link_open', 'invite_form_open', 
  'invite_shared', 'invite_qr_opened', 'approved', 'onboarding_complete', 
  'first_action', 'template_share', 'visit_comecar', 'active_7d',
  'invite_submit_mini', 'missions_view'
));