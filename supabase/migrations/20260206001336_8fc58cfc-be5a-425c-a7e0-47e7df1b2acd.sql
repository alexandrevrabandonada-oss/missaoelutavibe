-- ============================================================
-- FIX: Onboarding flow - Enforce PENDENTE status and remove direct cell_membership creation
-- ============================================================

-- 1. Add preferred_cell_id column to profiles (volunteer preference, NOT membership)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_cell_id uuid REFERENCES public.cells(id);

-- 2. Remove the dangerous "Users can join cells" INSERT policy
DROP POLICY IF EXISTS "Users can join cells" ON public.cell_memberships;

-- 3. Create a new INSERT policy that only allows SECURITY DEFINER functions (via service role)
-- This blocks direct inserts from authenticated users
CREATE POLICY "Only coordinators can create memberships via RPC"
ON public.cell_memberships
FOR INSERT
WITH CHECK (
  -- Only allow via SECURITY DEFINER RPCs (auth.uid() will be set but direct inserts blocked)
  EXISTS (
    SELECT 1 FROM public.coord_roles cr
    WHERE cr.user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.user_id = auth.uid()
  )
);

-- 4. Create RPC for volunteers to request cell allocation (creates request, NOT membership)
CREATE OR REPLACE FUNCTION public.volunteer_request_cell_allocation(
  p_city_id uuid,
  p_preferred_cell_id uuid DEFAULT NULL,
  p_bairro text DEFAULT NULL,
  p_disponibilidade text DEFAULT NULL,
  p_interesses text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;
  
  -- Check if user already has a pending request
  IF EXISTS (
    SELECT 1 FROM cell_assignment_requests 
    WHERE profile_id = v_user_id AND status = 'pending'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já tem uma solicitação pendente');
  END IF;
  
  -- Update profile with preferred cell and city
  UPDATE profiles
  SET city_id = p_city_id,
      preferred_cell_id = p_preferred_cell_id,
      needs_cell_assignment = true
  WHERE id = v_user_id;
  
  -- Create assignment request
  INSERT INTO cell_assignment_requests (
    profile_id,
    city_id,
    bairro,
    disponibilidade,
    interesses,
    status
  ) VALUES (
    v_user_id,
    p_city_id,
    p_bairro,
    p_disponibilidade,
    p_interesses,
    'pending'
  )
  RETURNING id INTO v_request_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id
  );
END;
$$;

-- 5. Create RPC to save city selection (for volunteers, without creating membership)
CREATE OR REPLACE FUNCTION public.volunteer_save_city_selection(
  p_city_id uuid,
  p_preferred_cell_id uuid DEFAULT NULL,
  p_skip_cell boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_city_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;
  
  -- Get city name for backwards compatibility
  SELECT nome INTO v_city_name FROM cidades WHERE id = p_city_id;
  
  -- Update profile with city and preference (NOT membership)
  UPDATE profiles
  SET city_id = p_city_id,
      city = v_city_name,
      preferred_cell_id = p_preferred_cell_id,
      needs_cell_assignment = p_skip_cell OR p_preferred_cell_id IS NOT NULL,
      onboarding_complete = true,
      onboarding_status = 'concluido',
      onboarding_completed_at = NOW()
  WHERE id = v_user_id;
  
  -- NOTE: Cell membership is NOT created here
  -- Coordinator must approve via approve_volunteer RPC to create membership
  
  RETURN jsonb_build_object(
    'success', true,
    'city_id', p_city_id,
    'preferred_cell_id', p_preferred_cell_id,
    'needs_assignment', p_skip_cell OR p_preferred_cell_id IS NOT NULL
  );
END;
$$;

-- 6. Update approve_volunteer to use preferred_cell_id if no cell specified
CREATE OR REPLACE FUNCTION public.approve_volunteer(_user_id uuid, _cell_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_final_cell_id uuid;
  v_needs_cell BOOLEAN;
BEGIN
  -- Get profile info including preferred cell
  SELECT id, city_id, full_name, preferred_cell_id INTO v_profile 
  FROM public.profiles WHERE id = _user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voluntário não encontrado');
  END IF;

  -- Check permission using coord helper
  IF NOT public.can_operate_coord(v_profile.city_id, _cell_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para aprovar este voluntário');
  END IF;

  -- Use provided cell_id, or fall back to preferred_cell_id
  v_final_cell_id := COALESCE(_cell_id, v_profile.preferred_cell_id);
  
  -- Determine if volunteer needs cell assignment
  v_needs_cell := (v_final_cell_id IS NULL);

  -- Update profile status
  UPDATE public.profiles 
  SET volunteer_status = 'ativo',
      approved_at = NOW(),
      approved_by = auth.uid(),
      rejection_reason = NULL,
      needs_cell_assignment = v_needs_cell,
      cell_id = v_final_cell_id
  WHERE id = _user_id;
  
  -- If cell_id provided or preferred, add cell membership NOW (only on approval)
  IF v_final_cell_id IS NOT NULL THEN
    INSERT INTO public.cell_memberships (user_id, cell_id, status, is_active, decided_by, decided_at)
    VALUES (_user_id, v_final_cell_id, 'aprovado', true, auth.uid(), now())
    ON CONFLICT (user_id, cell_id) DO UPDATE SET
      status = 'aprovado',
      is_active = true,
      decided_by = auth.uid(),
      decided_at = now();
  END IF;
  
  -- Close any pending assignment requests
  UPDATE cell_assignment_requests
  SET status = 'resolved',
      resolved_at = NOW(),
      resolved_by = auth.uid(),
      assigned_cell_id = v_final_cell_id
  WHERE profile_id = _user_id AND status = 'pending';
  
  -- Log to audit
  PERFORM public.log_coord_audit(
    'APPROVE_VOLUNTEER'::public.coord_audit_action,
    'CITY',
    v_profile.city_id,
    v_final_cell_id,
    _user_id,
    jsonb_build_object(
      'assigned_cell', v_final_cell_id IS NOT NULL,
      'needs_cell_assignment', v_needs_cell,
      'used_preferred_cell', _cell_id IS NULL AND v_final_cell_id IS NOT NULL
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'needs_cell_assignment', v_needs_cell,
    'assigned_cell_id', v_final_cell_id
  );
END;
$$;

-- Add comment explaining the security model
COMMENT ON POLICY "Only coordinators can create memberships via RPC" ON public.cell_memberships IS 
'Volunteers cannot directly create cell_memberships. They must be approved by a coordinator via approve_volunteer RPC.';

COMMENT ON COLUMN public.profiles.preferred_cell_id IS 
'Volunteer preference for cell assignment. NOT actual membership - membership is only created via coordinator approval.';