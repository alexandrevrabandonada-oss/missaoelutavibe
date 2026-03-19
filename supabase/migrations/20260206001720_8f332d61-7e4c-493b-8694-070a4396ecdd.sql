-- ============================================================
-- SECURITY: Complete RLS lockdown on cell_memberships
-- Only coordinators/admins can INSERT/UPDATE/DELETE
-- Volunteers must use request_cell_allocation RPC
-- ============================================================

-- 1. Add UPDATE policy - only coordinators/admins
CREATE POLICY "Only coordinators can update memberships"
ON public.cell_memberships
FOR UPDATE
USING (
  public.is_coordinator(auth.uid())
  OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
)
WITH CHECK (
  public.is_coordinator(auth.uid())
  OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

-- 2. Add DELETE policy - only coordinators/admins
CREATE POLICY "Only coordinators can delete memberships"
ON public.cell_memberships
FOR DELETE
USING (
  public.is_coordinator(auth.uid())
  OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

-- 3. Create RPC for volunteers to request cell allocation
-- This creates a pending request, NOT a membership
CREATE OR REPLACE FUNCTION public.request_cell_allocation(p_cell_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile RECORD;
  v_cell RECORD;
  v_request_id uuid;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;
  
  -- Get user profile
  SELECT id, city_id, volunteer_status, neighborhood INTO v_profile
  FROM profiles WHERE id = v_user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil não encontrado');
  END IF;
  
  -- Check user is approved (ativo)
  IF v_profile.volunteer_status != 'ativo' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas voluntários aprovados podem solicitar alocação');
  END IF;
  
  -- Validate cell exists and is active
  SELECT id, name, cidade_id, is_active INTO v_cell
  FROM cells WHERE id = p_cell_id;
  
  IF v_cell IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Célula não encontrada');
  END IF;
  
  IF NOT v_cell.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Célula não está ativa');
  END IF;
  
  -- Check if user already has a pending request
  IF EXISTS (
    SELECT 1 FROM cell_assignment_requests 
    WHERE profile_id = v_user_id AND status = 'pending'
  ) THEN
    -- Update existing request with new cell preference
    UPDATE cell_assignment_requests
    SET assigned_cell_id = NULL,
        updated_at = NOW(),
        notes = COALESCE(notes, '') || E'\nSolicitação atualizada para célula: ' || v_cell.name
    WHERE profile_id = v_user_id AND status = 'pending'
    RETURNING id INTO v_request_id;
    
    -- Update preferred cell on profile
    UPDATE profiles
    SET preferred_cell_id = p_cell_id,
        needs_cell_assignment = true
    WHERE id = v_user_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'request_id', v_request_id,
      'message', 'Solicitação atualizada',
      'cell_name', v_cell.name
    );
  END IF;
  
  -- Check if user already has active membership in this cell
  IF EXISTS (
    SELECT 1 FROM cell_memberships
    WHERE user_id = v_user_id AND cell_id = p_cell_id AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já é membro desta célula');
  END IF;
  
  -- Create new assignment request
  INSERT INTO cell_assignment_requests (
    profile_id,
    city_id,
    bairro,
    status,
    notes
  ) VALUES (
    v_user_id,
    COALESCE(v_cell.cidade_id, v_profile.city_id),
    v_profile.neighborhood,
    'pending',
    'Solicitação para célula: ' || v_cell.name
  )
  RETURNING id INTO v_request_id;
  
  -- Update profile with preferred cell
  UPDATE profiles
  SET preferred_cell_id = p_cell_id,
      needs_cell_assignment = true
  WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Solicitação enviada para a coordenação',
    'cell_name', v_cell.name
  );
END;
$$;

-- 4. Create RPC to cancel own pending request
CREATE OR REPLACE FUNCTION public.cancel_cell_allocation_request()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cancelled_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;
  
  -- Cancel pending requests
  UPDATE cell_assignment_requests
  SET status = 'cancelled',
      resolved_at = NOW(),
      notes = COALESCE(notes, '') || E'\nCancelado pelo voluntário'
  WHERE profile_id = v_user_id AND status = 'pending';
  
  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
  
  -- Clear preferred cell on profile
  UPDATE profiles
  SET preferred_cell_id = NULL,
      needs_cell_assignment = false
  WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'cancelled_count', v_cancelled_count
  );
END;
$$;

-- 5. Add comments for documentation
COMMENT ON FUNCTION public.request_cell_allocation(uuid) IS 
'Volunteer requests allocation to a specific cell. Creates pending request for coordinator approval. Does NOT create membership directly.';

COMMENT ON FUNCTION public.cancel_cell_allocation_request() IS 
'Volunteer cancels their pending cell allocation request.';

COMMENT ON POLICY "Only coordinators can update memberships" ON public.cell_memberships IS 
'Prevents volunteers from modifying their own memberships. Only coordinators/admins can update.';

COMMENT ON POLICY "Only coordinators can delete memberships" ON public.cell_memberships IS 
'Prevents volunteers from removing themselves from cells. Only coordinators/admins can delete.';