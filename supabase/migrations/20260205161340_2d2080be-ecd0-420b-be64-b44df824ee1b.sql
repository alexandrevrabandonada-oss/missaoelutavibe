-- PATCH 1: Fix approve_and_assign_request to use correct status values
-- cell_memberships.status constraint expects: pendente, aprovado, recusado, removido
-- NOT: approved, ACTIVE, etc.

CREATE OR REPLACE FUNCTION public.approve_and_assign_request(
  p_request_id UUID,
  p_cell_id UUID DEFAULT NULL,
  p_coordinator_note TEXT DEFAULT NULL,
  p_make_cell_coordinator BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_can_operate BOOLEAN;
  v_new_status TEXT;
  v_promoted_to_coord BOOLEAN := false;
BEGIN
  -- Get request
  SELECT * INTO v_request
  FROM public.cell_assignment_requests
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido já foi processado');
  END IF;
  
  -- Check permission
  SELECT public.can_operate_coord(v_request.city_id, p_cell_id) INTO v_can_operate;
  IF NOT v_can_operate THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para operar neste escopo');
  END IF;
  
  -- Determine new request status (cell_assignment_requests.status - separate from membership)
  v_new_status := CASE WHEN p_cell_id IS NOT NULL THEN 'assigned' ELSE 'approved_no_cell' END;
  
  -- Update request
  UPDATE public.cell_assignment_requests SET
    status = v_new_status,
    assigned_cell_id = p_cell_id,
    notes = COALESCE(p_coordinator_note, notes),
    resolved_at = now(),
    resolved_by = auth.uid(),
    updated_at = now()
  WHERE id = p_request_id;
  
  -- Update profile
  UPDATE public.profiles SET
    cell_id = p_cell_id,
    needs_cell_assignment = false,
    updated_at = now()
  WHERE id = v_request.profile_id;
  
  -- Create cell membership if assigned
  -- FIXED: Use 'aprovado' to match cell_memberships_status_check constraint
  IF p_cell_id IS NOT NULL THEN
    INSERT INTO public.cell_memberships (user_id, cell_id, status, decided_by, decided_at, is_active)
    VALUES (v_request.profile_id, p_cell_id, 'aprovado', auth.uid(), now(), true)
    ON CONFLICT (user_id, cell_id) DO UPDATE SET
      status = 'aprovado',
      decided_by = auth.uid(),
      decided_at = now(),
      is_active = true;
  END IF;
  
  -- Promote to CELL_COORD if requested
  IF p_make_cell_coordinator AND p_cell_id IS NOT NULL THEN
    INSERT INTO public.coord_roles (user_id, role, cell_id, created_by)
    VALUES (v_request.profile_id, 'CELL_COORD', p_cell_id, auth.uid())
    ON CONFLICT DO NOTHING;
    
    IF FOUND THEN
      v_promoted_to_coord := true;
    END IF;
  END IF;
  
  -- Log to audit
  PERFORM public.log_coord_audit(
    'APPROVE_ASSIGNMENT'::public.coord_audit_action,
    'CITY',
    v_request.city_id,
    p_cell_id,
    v_request.profile_id,
    jsonb_build_object(
      'status', v_new_status,
      'membership_status', 'aprovado',
      'promoted_to_coordinator', v_promoted_to_coord
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'status', v_new_status,
    'promoted_to_coordinator', v_promoted_to_coord
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.approve_and_assign_request(uuid, uuid, text, boolean) TO authenticated;