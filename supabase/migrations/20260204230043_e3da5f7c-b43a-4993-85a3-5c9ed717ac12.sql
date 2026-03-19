-- Drop existing functions that need return type changes first
DROP FUNCTION IF EXISTS public.upsert_cell(uuid,text,text,boolean,text,text[],uuid);
DROP FUNCTION IF EXISTS public.grant_coord_role(uuid,public.coord_role_type,uuid,uuid);
DROP FUNCTION IF EXISTS public.revoke_coord_role(uuid,public.coord_role_type,uuid,uuid);
DROP FUNCTION IF EXISTS public.approve_and_assign_request(uuid,uuid,text,boolean);
DROP FUNCTION IF EXISTS public.cancel_assignment_request(uuid,text);

-- 9) Recreate upsert_cell to log to audit
CREATE OR REPLACE FUNCTION public.upsert_cell(
  p_city_id UUID,
  p_name TEXT,
  p_notes TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true,
  p_neighborhood TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}',
  p_cell_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_operate BOOLEAN;
  v_result_cell_id UUID;
  v_is_update BOOLEAN := false;
  v_city_name TEXT;
  v_city_state TEXT;
BEGIN
  -- Check permission
  SELECT public.can_operate_coord(p_city_id, p_cell_id) INTO v_can_operate;
  IF NOT v_can_operate THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para operar neste escopo');
  END IF;
  
  -- Get city info
  SELECT nome, uf INTO v_city_name, v_city_state
  FROM public.cidades WHERE id = p_city_id;
  
  IF v_city_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cidade não encontrada');
  END IF;
  
  IF p_cell_id IS NOT NULL THEN
    v_is_update := true;
    -- Update existing cell
    UPDATE public.cells SET
      name = p_name,
      description = p_notes,
      is_active = p_is_active,
      neighborhood = p_neighborhood,
      tags = p_tags,
      updated_at = now()
    WHERE id = p_cell_id AND cidade_id = p_city_id
    RETURNING id INTO v_result_cell_id;
    
    IF v_result_cell_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Célula não encontrada ou não pertence à cidade');
    END IF;
  ELSE
    -- Insert new cell
    INSERT INTO public.cells (cidade_id, city, state, name, description, neighborhood, tags, is_active, created_by)
    VALUES (p_city_id, v_city_name, v_city_state, p_name, p_notes, p_neighborhood, p_tags, p_is_active, auth.uid())
    RETURNING id INTO v_result_cell_id;
  END IF;
  
  -- Log to audit
  PERFORM public.log_coord_audit(
    'UPSERT_CELL'::public.coord_audit_action,
    'CITY',
    p_city_id,
    v_result_cell_id,
    NULL,
    jsonb_build_object(
      'operation', CASE WHEN v_is_update THEN 'UPDATE' ELSE 'CREATE' END,
      'cell_name', p_name,
      'is_active', p_is_active
    )
  );
  
  RETURN jsonb_build_object('success', true, 'cell_id', v_result_cell_id);
END;
$$;

-- 7) Recreate grant_coord_role to log to audit
CREATE OR REPLACE FUNCTION public.grant_coord_role(
  p_user_id UUID,
  p_role public.coord_role_type,
  p_city_id UUID DEFAULT NULL,
  p_cell_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_operate BOOLEAN;
  v_role_id UUID;
  v_scope_type TEXT;
BEGIN
  -- Check permission
  SELECT public.can_operate_coord(p_city_id, p_cell_id) INTO v_can_operate;
  IF NOT v_can_operate THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para operar neste escopo');
  END IF;
  
  -- Validate role-scope consistency
  IF p_role = 'COORD_GLOBAL' AND (p_city_id IS NOT NULL OR p_cell_id IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'COORD_GLOBAL não aceita city_id ou cell_id');
  END IF;
  
  IF p_role = 'COORD_CITY' AND p_city_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'COORD_CITY requer city_id');
  END IF;
  
  IF p_role = 'CELL_COORD' AND p_cell_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'CELL_COORD requer cell_id');
  END IF;
  
  -- Check if role already exists
  IF EXISTS (
    SELECT 1 FROM public.coord_roles
    WHERE user_id = p_user_id
      AND role = p_role
      AND (city_id IS NOT DISTINCT FROM p_city_id)
      AND (cell_id IS NOT DISTINCT FROM p_cell_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Papel já existe para este usuário');
  END IF;
  
  -- Insert new role
  INSERT INTO public.coord_roles (user_id, role, city_id, cell_id, created_by)
  VALUES (p_user_id, p_role, p_city_id, p_cell_id, auth.uid())
  RETURNING id INTO v_role_id;
  
  -- Determine scope type for audit
  v_scope_type := CASE
    WHEN p_role = 'COORD_GLOBAL' THEN 'GLOBAL'
    WHEN p_role = 'COORD_CITY' THEN 'CITY'
    WHEN p_role = 'CELL_COORD' THEN 'CELL'
    ELSE 'GLOBAL'
  END;
  
  -- Log to audit
  PERFORM public.log_coord_audit(
    'GRANT_ROLE'::public.coord_audit_action,
    v_scope_type,
    p_city_id,
    p_cell_id,
    p_user_id,
    jsonb_build_object('role', p_role::TEXT, 'role_id', v_role_id)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'role_id', v_role_id,
    'message', 'Papel atribuído com sucesso'
  );
END;
$$;

-- 8) Recreate revoke_coord_role to log to audit
CREATE OR REPLACE FUNCTION public.revoke_coord_role(
  p_user_id UUID,
  p_role public.coord_role_type,
  p_city_id UUID DEFAULT NULL,
  p_cell_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_operate BOOLEAN;
  v_deleted_count INT;
  v_scope_type TEXT;
BEGIN
  -- Check permission
  SELECT public.can_operate_coord(p_city_id, p_cell_id) INTO v_can_operate;
  IF NOT v_can_operate THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para operar neste escopo');
  END IF;
  
  -- Delete matching role
  DELETE FROM public.coord_roles
  WHERE user_id = p_user_id
    AND role = p_role
    AND (city_id IS NOT DISTINCT FROM p_city_id)
    AND (cell_id IS NOT DISTINCT FROM p_cell_id);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  IF v_deleted_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Papel não encontrado');
  END IF;
  
  -- Determine scope type for audit
  v_scope_type := CASE
    WHEN p_role = 'COORD_GLOBAL' THEN 'GLOBAL'
    WHEN p_role = 'COORD_CITY' THEN 'CITY'
    WHEN p_role = 'CELL_COORD' THEN 'CELL'
    ELSE 'GLOBAL'
  END;
  
  -- Log to audit
  PERFORM public.log_coord_audit(
    'REVOKE_ROLE'::public.coord_audit_action,
    v_scope_type,
    p_city_id,
    p_cell_id,
    p_user_id,
    jsonb_build_object('role', p_role::TEXT)
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10) Recreate approve_and_assign_request to log to audit
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
  
  -- Determine new status
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
  IF p_cell_id IS NOT NULL THEN
    INSERT INTO public.cell_memberships (user_id, cell_id, status, decided_by, decided_at)
    VALUES (v_request.profile_id, p_cell_id, 'approved', auth.uid(), now())
    ON CONFLICT (user_id, cell_id) DO UPDATE SET
      status = 'approved',
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

-- 11) Recreate cancel_assignment_request to log to audit
CREATE OR REPLACE FUNCTION public.cancel_assignment_request(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_can_operate BOOLEAN;
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
  SELECT public.can_operate_coord(v_request.city_id, NULL) INTO v_can_operate;
  IF NOT v_can_operate THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para operar neste escopo');
  END IF;
  
  -- Update request
  UPDATE public.cell_assignment_requests SET
    status = 'cancelled',
    notes = COALESCE(p_reason, notes),
    resolved_at = now(),
    resolved_by = auth.uid(),
    updated_at = now()
  WHERE id = p_request_id;
  
  -- Log to audit
  PERFORM public.log_coord_audit(
    'CANCEL_ASSIGNMENT'::public.coord_audit_action,
    'CITY',
    v_request.city_id,
    NULL,
    v_request.profile_id,
    jsonb_build_object('reason', COALESCE(p_reason, 'sem motivo informado'))
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;