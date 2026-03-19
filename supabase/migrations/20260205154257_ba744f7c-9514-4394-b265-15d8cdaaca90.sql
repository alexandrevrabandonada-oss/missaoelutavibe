-- Fix: register_invite_usage should reopen rejected users for review
-- When a rejected user uses a new valid invite, status should return to 'pendente'

CREATE OR REPLACE FUNCTION public.register_invite_usage(_code text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
  current_status text;
BEGIN
  -- Get invite with creator info
  SELECT id, criado_por INTO invite_record 
  FROM public.convites 
  WHERE code = _code AND ativo = true;
  
  IF invite_record.id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if already used by this user
  IF EXISTS (SELECT 1 FROM public.convites_usos WHERE convite_id = invite_record.id AND usado_por = _user_id) THEN
    RETURN true; -- Already registered
  END IF;
  
  -- Check usage limit
  IF (SELECT limite_uso FROM public.convites WHERE id = invite_record.id) IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM public.convites_usos WHERE convite_id = invite_record.id) >= 
       (SELECT limite_uso FROM public.convites WHERE id = invite_record.id) THEN
      RETURN false; -- Limit reached
    END IF;
  END IF;
  
  -- Prevent self-referral
  IF invite_record.criado_por = _user_id THEN
    RETURN false;
  END IF;
  
  -- Register usage
  INSERT INTO public.convites_usos (convite_id, usado_por) VALUES (invite_record.id, _user_id);
  
  -- Get current volunteer status
  SELECT volunteer_status INTO current_status FROM public.profiles WHERE id = _user_id;
  
  -- Update profile with origin AND referrer
  -- If user was previously rejected, reopen for review by setting status back to 'pendente'
  UPDATE public.profiles 
  SET origem_convite_id = invite_record.id,
      referrer_user_id = invite_record.criado_por,
      volunteer_status = CASE 
        WHEN current_status = 'recusado' THEN 'pendente'::text
        ELSE volunteer_status 
      END,
      rejection_reason = CASE 
        WHEN current_status = 'recusado' THEN NULL 
        ELSE rejection_reason 
      END
  WHERE id = _user_id;
  
  RETURN true;
END;
$$;