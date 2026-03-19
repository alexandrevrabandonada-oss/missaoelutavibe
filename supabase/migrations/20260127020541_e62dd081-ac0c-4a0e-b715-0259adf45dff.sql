-- Fix trigger_growth_first_action_checkin to use correct column name (city instead of cidade)
CREATE OR REPLACE FUNCTION trigger_growth_first_action_checkin()
RETURNS TRIGGER AS $$
DECLARE
  _cidade TEXT;
  _invite_code TEXT;
  _referrer_user_id UUID;
  _template_id UUID;
  _existing INT;
BEGIN
  -- Check if first_action already exists
  SELECT COUNT(*) INTO _existing
  FROM growth_events
  WHERE user_id = NEW.user_id AND event_type = 'first_action';
  
  IF _existing > 0 THEN
    RETURN NEW;
  END IF;
  
  -- Get city from profile (column is 'city' not 'cidade')
  SELECT p.city INTO _cidade
  FROM profiles p WHERE p.id = NEW.user_id;
  
  -- Get invite code and referrer
  SELECT cu.convite_id, c.criado_por 
  INTO _invite_code, _referrer_user_id
  FROM convites_usos cu
  LEFT JOIN convites c ON c.id = cu.convite_id
  WHERE cu.usado_por = NEW.user_id
  LIMIT 1;
  
  -- Get template_id if exists
  SELECT template_id INTO _template_id
  FROM growth_events
  WHERE user_id = NEW.user_id AND template_id IS NOT NULL
  LIMIT 1;
  
  -- Insert first_action event
  INSERT INTO growth_events (
    event_type, user_id, template_id, invite_code, referrer_user_id, scope_cidade
  ) VALUES (
    'first_action', NEW.user_id, _template_id, _invite_code::text, _referrer_user_id, _cidade
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;