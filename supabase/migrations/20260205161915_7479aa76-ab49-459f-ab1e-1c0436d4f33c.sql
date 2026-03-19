-- Drop old functions with different return types
DROP FUNCTION IF EXISTS public.approve_volunteer(uuid, uuid);
DROP FUNCTION IF EXISTS public.reject_volunteer(uuid, text);

-- Add new audit action types if not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'APPROVE_VOLUNTEER' AND enumtypid = 'public.coord_audit_action'::regtype) THEN
    ALTER TYPE public.coord_audit_action ADD VALUE 'APPROVE_VOLUNTEER';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REJECT_VOLUNTEER' AND enumtypid = 'public.coord_audit_action'::regtype) THEN
    ALTER TYPE public.coord_audit_action ADD VALUE 'REJECT_VOLUNTEER';
  END IF;
END $$;

-- Update approve_volunteer to log to coord_audit_log
CREATE OR REPLACE FUNCTION public.approve_volunteer(_user_id uuid, _cell_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_needs_cell BOOLEAN;
BEGIN
  -- Get profile info
  SELECT id, city_id, full_name INTO v_profile 
  FROM public.profiles WHERE id = _user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voluntário não encontrado');
  END IF;

  -- Check permission using coord helper
  IF NOT public.can_operate_coord(v_profile.city_id, _cell_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para aprovar este voluntário');
  END IF;

  -- Determine if volunteer needs cell assignment
  v_needs_cell := (_cell_id IS NULL);

  -- Update profile status
  UPDATE public.profiles 
  SET volunteer_status = 'ativo',
      approved_at = NOW(),
      approved_by = auth.uid(),
      rejection_reason = NULL,
      needs_cell_assignment = v_needs_cell,
      cell_id = _cell_id
  WHERE id = _user_id;
  
  -- If cell_id provided, add cell membership with correct status
  IF _cell_id IS NOT NULL THEN
    INSERT INTO public.cell_memberships (user_id, cell_id, status, is_active, decided_by, decided_at)
    VALUES (_user_id, _cell_id, 'aprovado', true, auth.uid(), now())
    ON CONFLICT (user_id, cell_id) DO UPDATE SET
      status = 'aprovado',
      is_active = true,
      decided_by = auth.uid(),
      decided_at = now();
  END IF;
  
  -- Log to audit
  PERFORM public.log_coord_audit(
    'APPROVE_VOLUNTEER'::public.coord_audit_action,
    'CITY',
    v_profile.city_id,
    _cell_id,
    _user_id,
    jsonb_build_object(
      'assigned_cell', _cell_id IS NOT NULL,
      'needs_cell_assignment', v_needs_cell
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'needs_cell_assignment', v_needs_cell
  );
END;
$$;

-- Update reject_volunteer to log to coord_audit_log  
CREATE OR REPLACE FUNCTION public.reject_volunteer(_user_id uuid, _reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Get profile info
  SELECT id, city_id INTO v_profile 
  FROM public.profiles WHERE id = _user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voluntário não encontrado');
  END IF;

  -- Check permission
  IF NOT public.can_operate_coord(v_profile.city_id, NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para recusar este voluntário');
  END IF;

  -- Update profile status
  UPDATE public.profiles 
  SET volunteer_status = 'recusado',
      rejection_reason = _reason,
      approved_by = auth.uid()
  WHERE id = _user_id;
  
  -- Log to audit
  PERFORM public.log_coord_audit(
    'REJECT_VOLUNTEER'::public.coord_audit_action,
    'CITY',
    v_profile.city_id,
    NULL,
    _user_id,
    jsonb_build_object('reason', _reason)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.approve_volunteer(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_volunteer(uuid, text) TO authenticated;