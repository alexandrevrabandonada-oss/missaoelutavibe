-- Add invite_submit_mini to the event whitelist in log_growth_event
CREATE OR REPLACE FUNCTION public.log_growth_event(
  _event_type TEXT,
  _template_id UUID DEFAULT NULL,
  _invite_code TEXT DEFAULT NULL,
  _meta JSONB DEFAULT '{}'::jsonb,
  _session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_referrer_user_id UUID;
  v_clean_session TEXT;
  v_clean_invite TEXT;
  v_clean_cidade TEXT;
  v_rate_count INT;
  v_new_id UUID;
  v_allowed_events TEXT[] := ARRAY[
    'visit', 'signup', 'territory_link_open', 'invite_form_open', 
    'invite_shared', 'invite_qr_opened', 'approved', 'onboarding_complete', 
    'first_action', 'template_share', 'visit_comecar', 'active_7d',
    'invite_submit_mini', 'missions_view'
  ];
BEGIN
  -- Get current user if authenticated
  v_user_id := auth.uid();
  
  -- Validate event type against whitelist
  IF NOT (_event_type = ANY(v_allowed_events)) THEN
    -- Silently drop invalid event types
    RETURN NULL;
  END IF;
  
  -- Sanitize session_id (max 64 chars, alphanumeric + dash/underscore only)
  v_clean_session := LEFT(regexp_replace(COALESCE(_session_id, ''), '[^a-zA-Z0-9\-_]', '', 'g'), 64);
  IF v_clean_session = '' THEN
    v_clean_session := NULL;
  END IF;
  
  -- Sanitize invite code (max 80 chars)
  v_clean_invite := LEFT(regexp_replace(COALESCE(_invite_code, ''), '[^a-zA-Z0-9\-_]', '', 'g'), 80);
  IF v_clean_invite = '' THEN
    v_clean_invite := NULL;
  END IF;
  
  -- Extract and sanitize cidade from meta
  v_clean_cidade := LEFT(regexp_replace(COALESCE(_meta->>'cidade', ''), '[^a-zA-ZÀ-ÿ0-9\s\-'']', '', 'g'), 80);
  IF v_clean_cidade = '' THEN
    v_clean_cidade := NULL;
  END IF;
  
  -- Rate limiting: max 10 events per session per event_type per minute
  IF v_clean_session IS NOT NULL THEN
    SELECT COUNT(*) INTO v_rate_count
    FROM growth_events
    WHERE session_id = v_clean_session
      AND event_type = _event_type
      AND occurred_at > NOW() - INTERVAL '1 minute';
    
    IF v_rate_count >= 10 THEN
      -- Rate limited, silently drop
      RETURN NULL;
    END IF;
  END IF;
  
  -- Deduplication for visit events (1 per hour per session for anonymous)
  IF _event_type IN ('visit', 'territory_link_open', 'visit_comecar') AND v_user_id IS NULL AND v_clean_session IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM growth_events
      WHERE session_id = v_clean_session
        AND event_type = _event_type
        AND occurred_at > NOW() - INTERVAL '1 hour'
    ) THEN
      RETURN NULL;
    END IF;
  END IF;
  
  -- Look up referrer from invite code
  IF v_clean_invite IS NOT NULL THEN
    SELECT criado_por INTO v_referrer_user_id
    FROM convites
    WHERE code = v_clean_invite
    LIMIT 1;
  END IF;
  
  -- Insert the event
  INSERT INTO growth_events (
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
    v_clean_session,
    _template_id,
    v_clean_invite,
    v_referrer_user_id,
    v_clean_cidade,
    _meta
  )
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

-- Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.log_growth_event TO anon;
GRANT EXECUTE ON FUNCTION public.log_growth_event TO authenticated;