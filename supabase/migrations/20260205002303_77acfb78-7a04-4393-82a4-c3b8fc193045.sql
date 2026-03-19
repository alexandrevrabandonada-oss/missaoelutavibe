-- P2: Safe Delegation Rules
-- Update grant/revoke hierarchy: COORD_GLOBAL cannot grant COORD_GLOBAL or Admin Master

-- 1. Replace grant_coord_role with proper hierarchy checks
CREATE OR REPLACE FUNCTION public.grant_coord_role(
  p_user_id UUID,
  p_role coord_role_type,
  p_city_id UUID DEFAULT NULL,
  p_cell_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_is_coord_global BOOLEAN;
  v_existing_id UUID;
  v_new_id UUID;
  v_target_city_name TEXT;
  v_target_cell_name TEXT;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE user_id = v_caller_id
  ) INTO v_is_admin;
  
  -- Check if caller is COORD_GLOBAL
  SELECT EXISTS (
    SELECT 1 FROM coord_roles 
    WHERE user_id = v_caller_id 
    AND role = 'COORD_GLOBAL'
  ) INTO v_is_coord_global;
  
  -- HIERARCHY RULES (P2 Safe Delegation):
  -- Only Admin Master can grant COORD_GLOBAL
  IF p_role = 'COORD_GLOBAL' AND NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Apenas Admin Master pode conceder Coordenação Global'
    );
  END IF;
  
  -- COORD_GLOBAL can grant COORD_CITY and CELL_COORD (but not COORD_GLOBAL)
  -- COORD_CITY can grant CELL_COORD in their city only
  IF NOT v_is_admin THEN
    IF NOT v_is_coord_global THEN
      -- Must be COORD_CITY - check they can only grant CELL_COORD in their city
      IF p_role != 'CELL_COORD' THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Coordenadores de cidade só podem conceder papel de célula'
        );
      END IF;
      
      -- Verify caller has COORD_CITY for the target city
      IF NOT EXISTS (
        SELECT 1 FROM coord_roles 
        WHERE user_id = v_caller_id 
        AND role = 'COORD_CITY' 
        AND city_id = COALESCE(p_city_id, (SELECT cidade_id FROM cells WHERE id = p_cell_id))
      ) THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Você não tem permissão para esta cidade'
        );
      END IF;
    END IF;
  END IF;

  -- Validate scope requirements
  IF p_role = 'COORD_CITY' AND p_city_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'city_id obrigatório para COORD_CITY');
  END IF;

  IF p_role = 'CELL_COORD' AND p_cell_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'cell_id obrigatório para CELL_COORD');
  END IF;

  -- Check for existing role
  SELECT id INTO v_existing_id
  FROM coord_roles
  WHERE user_id = p_user_id
    AND role = p_role
    AND (p_city_id IS NULL OR city_id = p_city_id)
    AND (p_cell_id IS NULL OR cell_id = p_cell_id);

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Papel já existe para este usuário',
      'role_id', v_existing_id
    );
  END IF;

  -- Get names for audit
  IF p_city_id IS NOT NULL THEN
    SELECT nome INTO v_target_city_name FROM cidades WHERE id = p_city_id;
  END IF;
  IF p_cell_id IS NOT NULL THEN
    SELECT name INTO v_target_cell_name FROM cells WHERE id = p_cell_id;
  END IF;

  -- Insert new role
  INSERT INTO coord_roles (user_id, role, city_id, cell_id, created_by)
  VALUES (p_user_id, p_role, p_city_id, p_cell_id, v_caller_id)
  RETURNING id INTO v_new_id;

  -- Log audit
  PERFORM log_coord_audit(
    'GRANT_ROLE',
    p_user_id,
    p_city_id,
    p_cell_id,
    NULL,
    jsonb_build_object(
      'role', p_role::text,
      'city_name', v_target_city_name,
      'cell_name', v_target_cell_name
    )
  );

  RETURN jsonb_build_object(
    'success', true, 
    'role_id', v_new_id,
    'message', 'Papel atribuído com sucesso'
  );
END;
$$;

-- 2. Replace revoke_coord_role with proper hierarchy checks
CREATE OR REPLACE FUNCTION public.revoke_coord_role(
  p_user_id UUID,
  p_role coord_role_type,
  p_city_id UUID DEFAULT NULL,
  p_cell_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_is_coord_global BOOLEAN;
  v_role_id UUID;
  v_city_name TEXT;
  v_cell_name TEXT;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM admins WHERE user_id = v_caller_id
  ) INTO v_is_admin;
  
  -- Check if caller is COORD_GLOBAL
  SELECT EXISTS (
    SELECT 1 FROM coord_roles 
    WHERE user_id = v_caller_id 
    AND role = 'COORD_GLOBAL'
  ) INTO v_is_coord_global;
  
  -- HIERARCHY RULES (P2 Safe Delegation):
  -- Only Admin Master can revoke COORD_GLOBAL
  IF p_role = 'COORD_GLOBAL' AND NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Apenas Admin Master pode revogar Coordenação Global'
    );
  END IF;
  
  -- COORD_GLOBAL can revoke COORD_CITY and CELL_COORD (but not COORD_GLOBAL)
  -- COORD_CITY can revoke CELL_COORD in their city only
  IF NOT v_is_admin THEN
    IF NOT v_is_coord_global THEN
      -- Must be COORD_CITY - check they can only revoke CELL_COORD in their city
      IF p_role != 'CELL_COORD' THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Coordenadores de cidade só podem revogar papel de célula'
        );
      END IF;
      
      -- Verify caller has COORD_CITY for the target city
      IF NOT EXISTS (
        SELECT 1 FROM coord_roles 
        WHERE user_id = v_caller_id 
        AND role = 'COORD_CITY' 
        AND city_id = COALESCE(p_city_id, (SELECT cidade_id FROM cells WHERE id = p_cell_id))
      ) THEN
        RETURN jsonb_build_object(
          'success', false, 
          'error', 'Você não tem permissão para esta cidade'
        );
      END IF;
    END IF;
  END IF;

  -- Find the role to revoke
  SELECT id INTO v_role_id
  FROM coord_roles
  WHERE user_id = p_user_id
    AND role = p_role
    AND (p_city_id IS NULL OR city_id = p_city_id)
    AND (p_cell_id IS NULL OR cell_id = p_cell_id);

  IF v_role_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Papel não encontrado');
  END IF;

  -- Get names for audit
  IF p_city_id IS NOT NULL THEN
    SELECT nome INTO v_city_name FROM cidades WHERE id = p_city_id;
  END IF;
  IF p_cell_id IS NOT NULL THEN
    SELECT name INTO v_cell_name FROM cells WHERE id = p_cell_id;
  END IF;

  -- Delete the role
  DELETE FROM coord_roles WHERE id = v_role_id;

  -- Log audit
  PERFORM log_coord_audit(
    'REVOKE_ROLE',
    p_user_id,
    p_city_id,
    p_cell_id,
    NULL,
    jsonb_build_object(
      'role', p_role::text,
      'city_name', v_city_name,
      'cell_name', v_cell_name
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3. Create a helper function to get caller's permission level
CREATE OR REPLACE FUNCTION public.get_caller_coord_level()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
BEGIN
  -- Check admin first
  IF EXISTS (SELECT 1 FROM admins WHERE user_id = v_caller_id) THEN
    RETURN 'ADMIN_MASTER';
  END IF;
  
  -- Check COORD_GLOBAL
  IF EXISTS (SELECT 1 FROM coord_roles WHERE user_id = v_caller_id AND role = 'COORD_GLOBAL') THEN
    RETURN 'COORD_GLOBAL';
  END IF;
  
  -- Check COORD_CITY
  IF EXISTS (SELECT 1 FROM coord_roles WHERE user_id = v_caller_id AND role = 'COORD_CITY') THEN
    RETURN 'COORD_CITY';
  END IF;
  
  -- Check CELL_COORD
  IF EXISTS (SELECT 1 FROM coord_roles WHERE user_id = v_caller_id AND role = 'CELL_COORD') THEN
    RETURN 'CELL_COORD';
  END IF;
  
  RETURN NULL;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_caller_coord_level() TO authenticated;