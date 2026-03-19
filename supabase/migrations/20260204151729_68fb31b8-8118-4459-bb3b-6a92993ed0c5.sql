-- ============================================================
-- Coord Roles v1: COORD_GLOBAL, COORD_CITY, CELL_COORD
-- ============================================================

-- 1) Enum for coordination role types
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coord_role_type') THEN
    CREATE TYPE coord_role_type AS ENUM ('COORD_GLOBAL', 'COORD_CITY', 'CELL_COORD');
  END IF;
END $$;

-- 2) coord_roles table
CREATE TABLE IF NOT EXISTS public.coord_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role coord_role_type NOT NULL,
  city_id uuid REFERENCES public.cidades(id) ON DELETE CASCADE,
  cell_id uuid REFERENCES public.cells(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  
  -- Unique constraint per user/role/city/cell combination
  CONSTRAINT uq_coord_role UNIQUE (user_id, role, city_id, cell_id),
  
  -- Validation: city_id required for COORD_CITY, cell_id required for CELL_COORD
  CONSTRAINT chk_coord_role_scope CHECK (
    (role = 'COORD_GLOBAL' AND city_id IS NULL AND cell_id IS NULL)
    OR (role = 'COORD_CITY' AND city_id IS NOT NULL AND cell_id IS NULL)
    OR (role = 'CELL_COORD' AND cell_id IS NOT NULL)
  )
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_coord_roles_user ON public.coord_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_coord_roles_city ON public.coord_roles(city_id) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coord_roles_cell ON public.coord_roles(cell_id) WHERE cell_id IS NOT NULL;

-- 3) Enable RLS
ALTER TABLE public.coord_roles ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policies - using valid app_role values only
CREATE POLICY "coord_roles_admin_select" ON public.coord_roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.revoked_at IS NULL
        AND ur.role IN ('admin', 'coordenador_estadual', 'coordenador_regional')
    )
    OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "coord_roles_admin_insert" ON public.coord_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.revoked_at IS NULL
        AND ur.role IN ('admin', 'coordenador_estadual')
    )
    OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

CREATE POLICY "coord_roles_admin_delete" ON public.coord_roles
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.revoked_at IS NULL
        AND ur.role IN ('admin', 'coordenador_estadual')
    )
    OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  );

-- 5) Helper function: can_operate_coord
CREATE OR REPLACE FUNCTION public.can_operate_coord(
  _target_city_id uuid DEFAULT NULL,
  _target_cell_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _cell_city_id uuid;
BEGIN
  -- Check if master admin
  IF EXISTS (SELECT 1 FROM public.admins WHERE user_id = _user_id) THEN
    RETURN true;
  END IF;
  
  -- Check if admin role in user_roles
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
      AND revoked_at IS NULL 
      AND role IN ('admin', 'coordenador_estadual')
  ) THEN
    RETURN true;
  END IF;
  
  -- Check COORD_GLOBAL
  IF EXISTS (
    SELECT 1 FROM public.coord_roles
    WHERE user_id = _user_id AND role = 'COORD_GLOBAL'
  ) THEN
    RETURN true;
  END IF;
  
  -- Check COORD_CITY for specific city
  IF _target_city_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.coord_roles
      WHERE user_id = _user_id 
        AND role = 'COORD_CITY' 
        AND city_id = _target_city_id
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Check CELL_COORD for specific cell
  IF _target_cell_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.coord_roles
      WHERE user_id = _user_id 
        AND role = 'CELL_COORD' 
        AND cell_id = _target_cell_id
    ) THEN
      RETURN true;
    END IF;
    
    -- Also check COORD_CITY for the cell's city
    SELECT cidade_id INTO _cell_city_id FROM public.cells WHERE id = _target_cell_id;
    IF _cell_city_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.coord_roles
      WHERE user_id = _user_id 
        AND role = 'COORD_CITY' 
        AND city_id = _cell_city_id
    ) THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- 6) RPC: list_coord_roles (no PII - only user_id, role, scopes)
CREATE OR REPLACE FUNCTION public.list_coord_roles(
  p_scope_city_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_code text,
  role text,
  city_id uuid,
  city_name text,
  cell_id uuid,
  cell_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller has permission
  IF NOT public.can_operate_coord(p_scope_city_id, NULL) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    cr.id,
    cr.user_id,
    'V#' || UPPER(LEFT(cr.user_id::text, 6)) AS user_code,
    cr.role::text,
    cr.city_id,
    ci.nome AS city_name,
    cr.cell_id,
    c.name AS cell_name,
    cr.created_at
  FROM public.coord_roles cr
  LEFT JOIN public.cidades ci ON ci.id = cr.city_id
  LEFT JOIN public.cells c ON c.id = cr.cell_id
  WHERE 
    p_scope_city_id IS NULL 
    OR cr.city_id = p_scope_city_id
    OR (cr.role = 'COORD_GLOBAL')
    OR EXISTS (
      SELECT 1 FROM public.cells cl 
      WHERE cl.id = cr.cell_id AND cl.cidade_id = p_scope_city_id
    )
  ORDER BY cr.created_at DESC;
END;
$$;

-- 7) RPC: grant_coord_role
CREATE OR REPLACE FUNCTION public.grant_coord_role(
  p_user_id uuid,
  p_role text,
  p_city_id uuid DEFAULT NULL,
  p_cell_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role coord_role_type;
  _target_city uuid;
  _new_id uuid;
BEGIN
  -- Validate role
  BEGIN
    _role := p_role::coord_role_type;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Papel inválido: ' || p_role);
  END;
  
  -- Determine target city for permission check
  IF _role = 'COORD_CITY' THEN
    _target_city := p_city_id;
  ELSIF _role = 'CELL_COORD' AND p_cell_id IS NOT NULL THEN
    SELECT cidade_id INTO _target_city FROM public.cells WHERE id = p_cell_id;
  END IF;
  
  -- Check caller permission
  IF NOT public.can_operate_coord(_target_city, NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado para este escopo');
  END IF;
  
  -- Validate scope requirements
  IF _role = 'COORD_CITY' AND p_city_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'city_id obrigatório para COORD_CITY');
  END IF;
  
  IF _role = 'CELL_COORD' AND p_cell_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'cell_id obrigatório para CELL_COORD');
  END IF;
  
  -- Upsert (prevent duplicates)
  INSERT INTO public.coord_roles (user_id, role, city_id, cell_id, created_by)
  VALUES (
    p_user_id, 
    _role, 
    CASE WHEN _role IN ('COORD_CITY', 'CELL_COORD') THEN p_city_id ELSE NULL END,
    CASE WHEN _role = 'CELL_COORD' THEN p_cell_id ELSE NULL END,
    auth.uid()
  )
  ON CONFLICT ON CONSTRAINT uq_coord_role 
  DO NOTHING
  RETURNING id INTO _new_id;
  
  IF _new_id IS NULL THEN
    -- Already exists
    RETURN jsonb_build_object('success', true, 'message', 'Papel já atribuído');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'role_id', _new_id);
END;
$$;

-- 8) RPC: revoke_coord_role
CREATE OR REPLACE FUNCTION public.revoke_coord_role(
  p_user_id uuid,
  p_role text,
  p_city_id uuid DEFAULT NULL,
  p_cell_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role coord_role_type;
  _target_city uuid;
  _deleted_count int;
BEGIN
  -- Validate role
  BEGIN
    _role := p_role::coord_role_type;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Papel inválido: ' || p_role);
  END;
  
  -- Determine target city for permission check
  IF _role = 'COORD_CITY' THEN
    _target_city := p_city_id;
  ELSIF _role = 'CELL_COORD' AND p_cell_id IS NOT NULL THEN
    SELECT cidade_id INTO _target_city FROM public.cells WHERE id = p_cell_id;
  END IF;
  
  -- Check caller permission
  IF NOT public.can_operate_coord(_target_city, NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado para este escopo');
  END IF;
  
  -- Delete
  DELETE FROM public.coord_roles
  WHERE user_id = p_user_id
    AND role = _role
    AND (city_id IS NOT DISTINCT FROM CASE WHEN _role IN ('COORD_CITY', 'CELL_COORD') THEN p_city_id ELSE NULL END)
    AND (cell_id IS NOT DISTINCT FROM CASE WHEN _role = 'CELL_COORD' THEN p_cell_id ELSE NULL END);
  
  GET DIAGNOSTICS _deleted_count = ROW_COUNT;
  
  IF _deleted_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Papel não encontrado');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9) Update list_city_cells to use coord_roles for coordinator_count
DROP FUNCTION IF EXISTS public.list_city_cells(uuid);

CREATE OR REPLACE FUNCTION public.list_city_cells(p_city_id uuid DEFAULT NULL)
RETURNS SETOF jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'neighborhood', c.neighborhood,
    'description', c.description,
    'is_active', c.is_active,
    'tipo', c.tipo,
    'tags', c.tags,
    'weekly_goal', c.weekly_goal,
    'created_at', c.created_at,
    'member_count', (
      SELECT COUNT(*)::int 
      FROM cell_memberships cm 
      WHERE cm.cell_id = c.id AND cm.is_active = true
    ),
    'pending_requests', (
      SELECT COUNT(*)::int 
      FROM cell_assignment_requests car 
      WHERE car.assigned_cell_id = c.id AND car.status = 'pending'
    ),
    'coordinator_count', (
      SELECT COUNT(*)::int 
      FROM coord_roles cr 
      WHERE cr.cell_id = c.id AND cr.role = 'CELL_COORD'
    )
  )
  FROM cells c
  WHERE 
    p_city_id IS NULL 
    OR c.cidade_id = p_city_id
  ORDER BY c.name;
END;
$$;

-- 10) Update approve_and_assign_request to use coord_roles
CREATE OR REPLACE FUNCTION public.approve_and_assign_request(
  p_request_id uuid,
  p_cell_id uuid DEFAULT NULL,
  p_coordinator_note text DEFAULT NULL,
  p_make_cell_coordinator boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request RECORD;
  _profile_id uuid;
  _city_id uuid;
BEGIN
  -- Get the request
  SELECT * INTO _request 
  FROM cell_assignment_requests 
  WHERE id = p_request_id;
  
  IF _request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;
  
  IF _request.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido já processado');
  END IF;
  
  _profile_id := _request.profile_id;
  _city_id := _request.city_id;
  
  -- Check permission
  IF NOT public.can_operate_coord(_city_id, p_cell_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;
  
  -- Update request
  UPDATE cell_assignment_requests
  SET 
    status = 'assigned',
    assigned_cell_id = p_cell_id,
    notes = p_coordinator_note,
    resolved_at = now(),
    resolved_by = auth.uid(),
    updated_at = now()
  WHERE id = p_request_id;
  
  -- Update profile cidade (if has cidade column)
  UPDATE profiles 
  SET cidade = (SELECT nome FROM cidades WHERE id = _city_id),
      cell_id = p_cell_id,
      updated_at = now()
  WHERE id = _profile_id;
  
  -- Create cell membership if cell_id provided
  IF p_cell_id IS NOT NULL THEN
    INSERT INTO cell_memberships (cell_id, user_id, is_active, status)
    VALUES (p_cell_id, _profile_id, true, 'active')
    ON CONFLICT (cell_id, user_id) 
    DO UPDATE SET is_active = true, status = 'active';
    
    -- Promote to coordinator if requested
    IF p_make_cell_coordinator THEN
      -- Insert into coord_roles (primary source now)
      INSERT INTO coord_roles (user_id, role, city_id, cell_id, created_by)
      VALUES (_profile_id, 'CELL_COORD', _city_id, p_cell_id, auth.uid())
      ON CONFLICT ON CONSTRAINT uq_coord_role DO NOTHING;
      
      -- Also keep legacy cell_coordinators for backward compat (if exists)
      BEGIN
        INSERT INTO cell_coordinators (city_id, cell_id, profile_id, created_by)
        VALUES (_city_id, p_cell_id, _profile_id, auth.uid())
        ON CONFLICT (cell_id, profile_id) DO NOTHING;
      EXCEPTION WHEN undefined_table THEN
        NULL;
      END;
      
      -- Grant coordenador_celula role in user_roles
      INSERT INTO user_roles (user_id, role, cidade, cell_id)
      VALUES (_profile_id, 'coordenador_celula', (SELECT nome FROM cidades WHERE id = _city_id), p_cell_id)
      ON CONFLICT DO NOTHING;
      
      RETURN jsonb_build_object('success', true, 'status', 'assigned', 'promoted_to_coordinator', true);
    END IF;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'status', 'assigned', 'promoted_to_coordinator', false);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.can_operate_coord(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_coord_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_coord_role(uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_coord_role(uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_city_cells(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_and_assign_request(uuid, uuid, text, boolean) TO authenticated;