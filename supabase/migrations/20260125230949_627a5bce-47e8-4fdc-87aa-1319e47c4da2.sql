-- Add new event types for onboarding direcionador tracking
-- Update the check constraint on growth_events to include new event types

ALTER TABLE public.growth_events DROP CONSTRAINT IF EXISTS growth_events_event_type_check;

ALTER TABLE public.growth_events ADD CONSTRAINT growth_events_event_type_check CHECK (
  event_type IN (
    'signup', 'profile_completed', 'approved', 'first_share', 'first_mission_completed',
    'invite_shared', 'invite_clicked', 'share_pack_opened', 'share_pack_item_copied',
    'share_pack_whatsapp_opened', 'share_pack_downloaded', 'template_shared',
    'territory_link_visited', 'territory_signup', 'street_mission_generated',
    'street_mission_opened', 'street_mission_completed', 'checkin_error',
    'roteiro_opened', 'first_mission_assigned', 'template_print_download',
    'street_mission_done', 'visit_comecar',
    'conversation_mission_generated', 'conversation_mission_opened',
    'conversation_mission_completed', 'conversation_script_copied', 'conversation_whatsapp_opened',
    'crm_quick_add_opened', 'crm_quick_add_saved', 'crm_quick_add_whatsapp_opened',
    'followup_list_viewed', 'followup_whatsapp_opened', 'followup_done', 'followup_snoozed',
    'onboarding_prefs_saved', 'recommended_path_started', 'recommended_path_completed'
  )
);

-- Also update the log_growth_event RPC whitelist
CREATE OR REPLACE FUNCTION public.log_growth_event(
  _event_type TEXT,
  _template_id UUID DEFAULT NULL,
  _invite_code TEXT DEFAULT NULL,
  _meta JSONB DEFAULT '{}',
  _session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_event_id UUID;
  v_session_id TEXT;
  v_scope_cidade TEXT;
  v_referrer_user_id UUID;
  v_rate_limit_key TEXT;
  v_recent_count INT;
  v_allowed_types TEXT[] := ARRAY[
    'signup', 'mission_complete', 'evidence_submit', 'share_copy', 'share_download',
    'profile_updated', 'first_mission_completed', 'interest_selected', 'invite_created',
    'invite_used', 'invite_signup', 'share_pack_generated', 'share_pack_copied',
    'share_pack_downloaded', 'street_mission_generated', 'street_mission_opened',
    'street_mission_completed', 'territory_link_copied', 'roteiro_track', 'visit_comecar',
    'conversation_mission_generated', 'conversation_mission_opened', 'conversation_mission_completed',
    'conversation_script_copied', 'conversation_whatsapp_opened', 'checkin_error',
    'followup_list_viewed', 'followup_whatsapp_opened', 'followup_done', 'followup_snoozed',
    'crm_quick_add_opened', 'crm_quick_add_saved', 'crm_quick_add_whatsapp_opened',
    'onboarding_prefs_saved', 'recommended_path_started', 'recommended_path_completed'
  ];
BEGIN
  -- Validate event type
  IF NOT (_event_type = ANY(v_allowed_types)) THEN
    RETURN NULL; -- Silently reject unknown event types
  END IF;
  
  -- Sanitize session_id
  v_session_id := LEFT(COALESCE(_session_id, ''), 64);
  
  -- Rate limiting: max 10 events per minute per session/user
  v_rate_limit_key := COALESCE(v_user_id::text, v_session_id);
  IF v_rate_limit_key IS NOT NULL THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM public.growth_events
    WHERE (user_id = v_user_id OR session_id = v_session_id)
      AND occurred_at > NOW() - INTERVAL '1 minute';
    
    IF v_recent_count >= 10 THEN
      RETURN NULL; -- Rate limited
    END IF;
  END IF;
  
  -- Get user's cidade if authenticated
  IF v_user_id IS NOT NULL THEN
    SELECT cidade INTO v_scope_cidade
    FROM public.profiles
    WHERE id = v_user_id;
  END IF;
  
  -- Get referrer from invite code if provided
  IF _invite_code IS NOT NULL THEN
    SELECT criado_por INTO v_referrer_user_id
    FROM public.convites
    WHERE code = LEFT(_invite_code, 20)
    LIMIT 1;
  END IF;
  
  -- Insert event
  INSERT INTO public.growth_events (
    event_type,
    user_id,
    session_id,
    template_id,
    invite_code,
    referrer_user_id,
    scope_cidade,
    meta
  ) VALUES (
    _event_type,
    v_user_id,
    v_session_id,
    _template_id,
    LEFT(_invite_code, 20),
    v_referrer_user_id,
    LEFT(v_scope_cidade, 80),
    _meta
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_growth_event(TEXT, UUID, TEXT, JSONB, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.log_growth_event(TEXT, UUID, TEXT, JSONB, TEXT) TO authenticated;