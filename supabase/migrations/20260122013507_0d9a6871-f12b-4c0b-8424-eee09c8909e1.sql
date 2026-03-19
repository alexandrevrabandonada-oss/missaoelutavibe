-- Function to count active admin_estadual roles
CREATE OR REPLACE FUNCTION public.count_active_admins()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_roles
  WHERE role IN ('admin', 'coordenador_estadual')
    AND revoked_at IS NULL
$$;

-- Function to check if user can promote to a specific role
-- Returns: { allowed: boolean, reason: text }
CREATE OR REPLACE FUNCTION public.can_promote_to_role(
  _operator_id uuid,
  _target_role text,
  _target_cidade text DEFAULT NULL,
  _target_regiao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _operator_role text;
  _operator_regiao text;
  _operator_cidade text;
  _role_hierarchy text[] := ARRAY['voluntario', 'moderador_celula', 'coordenador_celula', 'coordenador_municipal', 'coordenador_regional', 'coordenador_estadual', 'admin'];
  _target_idx integer;
  _max_allowed_idx integer;
BEGIN
  -- Get operator's highest active role with scope
  SELECT ur.role, ur.regiao, ur.cidade
  INTO _operator_role, _operator_regiao, _operator_cidade
  FROM public.user_roles ur
  WHERE ur.user_id = _operator_id
    AND ur.revoked_at IS NULL
  ORDER BY array_position(_role_hierarchy, ur.role::text) DESC
  LIMIT 1;

  IF _operator_role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Operador não possui papel ativo');
  END IF;

  -- admin can do anything
  IF _operator_role = 'admin' THEN
    RETURN jsonb_build_object('allowed', true, 'reason', NULL);
  END IF;

  -- coordenador_estadual can promote/revoke any role except admin
  IF _operator_role = 'coordenador_estadual' THEN
    IF _target_role = 'admin' THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Apenas admin pode promover outro admin');
    END IF;
    RETURN jsonb_build_object('allowed', true, 'reason', NULL);
  END IF;

  -- coordenador_regional: can promote up to coordenador_municipal within their region
  IF _operator_role = 'coordenador_regional' THEN
    _max_allowed_idx := array_position(_role_hierarchy, 'coordenador_municipal');
    _target_idx := array_position(_role_hierarchy, _target_role);
    
    IF _target_idx IS NULL OR _target_idx > _max_allowed_idx THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Coordenador regional só pode promover até coordenador municipal');
    END IF;
    
    -- Check region scope
    IF _operator_regiao IS NULL THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Coordenador regional sem região definida');
    END IF;
    
    -- For municipal/cell roles, the target city must be in operator's region
    -- (simplified: just check if a region is specified and matches)
    IF _target_regiao IS NOT NULL AND _target_regiao != _operator_regiao THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Alvo fora da sua região');
    END IF;
    
    RETURN jsonb_build_object('allowed', true, 'reason', NULL);
  END IF;

  -- coordenador_municipal: can promote moderador_celula and coordenador_celula in their city
  IF _operator_role = 'coordenador_municipal' THEN
    IF _target_role NOT IN ('moderador_celula', 'coordenador_celula') THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Coordenador municipal só pode promover moderador ou coordenador de célula');
    END IF;
    
    IF _operator_cidade IS NULL THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Coordenador municipal sem cidade definida');
    END IF;
    
    IF _target_cidade IS NOT NULL AND _target_cidade != _operator_cidade THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Alvo fora da sua cidade');
    END IF;
    
    RETURN jsonb_build_object('allowed', true, 'reason', NULL);
  END IF;

  -- Other roles cannot promote
  RETURN jsonb_build_object('allowed', false, 'reason', 'Você não tem permissão para promover usuários');
END;
$$;

-- Function to check if user can revoke a specific role
CREATE OR REPLACE FUNCTION public.can_revoke_role(
  _operator_id uuid,
  _role_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_role record;
  _operator_role text;
  _operator_regiao text;
  _operator_cidade text;
  _active_admin_count integer;
  _role_hierarchy text[] := ARRAY['voluntario', 'moderador_celula', 'coordenador_celula', 'coordenador_municipal', 'coordenador_regional', 'coordenador_estadual', 'admin'];
  _target_idx integer;
  _max_allowed_idx integer;
BEGIN
  -- Get target role details
  SELECT * INTO _target_role
  FROM public.user_roles
  WHERE id = _role_id;

  IF _target_role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Papel não encontrado');
  END IF;

  IF _target_role.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Papel já foi revogado');
  END IF;

  -- Check if this is the last admin/coordenador_estadual
  IF _target_role.role IN ('admin', 'coordenador_estadual') THEN
    SELECT count_active_admins() INTO _active_admin_count;
    IF _active_admin_count <= 1 THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Não é possível revogar o último administrador estadual ativo');
    END IF;
  END IF;

  -- Get operator's highest active role with scope
  SELECT ur.role, ur.regiao, ur.cidade
  INTO _operator_role, _operator_regiao, _operator_cidade
  FROM public.user_roles ur
  WHERE ur.user_id = _operator_id
    AND ur.revoked_at IS NULL
  ORDER BY array_position(_role_hierarchy, ur.role::text) DESC
  LIMIT 1;

  IF _operator_role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Operador não possui papel ativo');
  END IF;

  -- admin can revoke anything (except last admin, already checked)
  IF _operator_role = 'admin' THEN
    RETURN jsonb_build_object('allowed', true, 'reason', NULL);
  END IF;

  -- coordenador_estadual can revoke any role except admin
  IF _operator_role = 'coordenador_estadual' THEN
    IF _target_role.role = 'admin' THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Apenas admin pode revogar outro admin');
    END IF;
    RETURN jsonb_build_object('allowed', true, 'reason', NULL);
  END IF;

  -- coordenador_regional: can revoke up to coordenador_municipal within their region
  IF _operator_role = 'coordenador_regional' THEN
    _max_allowed_idx := array_position(_role_hierarchy, 'coordenador_municipal');
    _target_idx := array_position(_role_hierarchy, _target_role.role::text);
    
    IF _target_idx IS NULL OR _target_idx > _max_allowed_idx THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Coordenador regional só pode revogar até coordenador municipal');
    END IF;
    
    IF _operator_regiao IS NOT NULL AND _target_role.regiao IS NOT NULL AND _target_role.regiao != _operator_regiao THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Alvo fora da sua região');
    END IF;
    
    RETURN jsonb_build_object('allowed', true, 'reason', NULL);
  END IF;

  -- coordenador_municipal: can revoke moderador_celula and coordenador_celula in their city
  IF _operator_role = 'coordenador_municipal' THEN
    IF _target_role.role NOT IN ('moderador_celula', 'coordenador_celula') THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Coordenador municipal só pode revogar moderador ou coordenador de célula');
    END IF;
    
    IF _operator_cidade IS NOT NULL AND _target_role.cidade IS NOT NULL AND _target_role.cidade != _operator_cidade THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Alvo fora da sua cidade');
    END IF;
    
    RETURN jsonb_build_object('allowed', true, 'reason', NULL);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'reason', 'Você não tem permissão para revogar papéis');
END;
$$;

-- Function to log denied role operations
CREATE OR REPLACE FUNCTION public.log_role_denied(
  _operator_id uuid,
  _target_user_id uuid,
  _attempted_action text,
  _attempted_role text,
  _denial_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    entity_type,
    action,
    entity_id,
    new_data
  ) VALUES (
    _operator_id,
    'user_roles',
    'role.assign_denied',
    _target_user_id,
    jsonb_build_object(
      'attempted_action', _attempted_action,
      'attempted_role', _attempted_role,
      'target_user_id', _target_user_id,
      'denial_reason', _denial_reason
    )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.count_active_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_promote_to_role(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_revoke_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_role_denied(uuid, uuid, text, text, text) TO authenticated;