-- ============================================
-- RBAC Escopo v0 - Expanded user_roles + helpers
-- ============================================

-- 1) Add new scope columns to user_roles (idempotent with IF NOT EXISTS)
ALTER TABLE public.user_roles 
  ADD COLUMN IF NOT EXISTS scope_type text DEFAULT 'global' CHECK (scope_type IN ('global', 'estado', 'cidade', 'celula', 'regional')),
  ADD COLUMN IF NOT EXISTS scope_state text NULL,
  ADD COLUMN IF NOT EXISTS scope_city text NULL,
  ADD COLUMN IF NOT EXISTS scope_cell_id uuid NULL,
  ADD COLUMN IF NOT EXISTS granted_by uuid NULL,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

-- Note: revoked_at, revoked_by, cidade, regiao already exist, renaming/merging would be destructive
-- We'll use scope_city as the canonical column and keep cidade for backwards compat

-- 2) Create index for scope queries
CREATE INDEX IF NOT EXISTS idx_user_roles_scope ON public.user_roles (scope_type, scope_state, scope_city, scope_cell_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles (user_id, role) WHERE revoked_at IS NULL;

-- 3) Helper: has_role_in_scope - unified scope check
DROP FUNCTION IF EXISTS public.has_role_in_scope(uuid, text[], text, text, uuid);

CREATE OR REPLACE FUNCTION public.has_role_in_scope(
  _user_id uuid,
  _roles text[],
  _target_state text DEFAULT NULL,
  _target_city text DEFAULT NULL,
  _target_cell_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role::text = ANY(_roles)
      AND ur.revoked_at IS NULL
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
      AND (
        -- Global scope matches everything
        ur.scope_type = 'global'
        OR
        -- Estado scope: matches if target is in same state or no target specified
        (ur.scope_type = 'estado' AND (
          _target_state IS NULL 
          OR COALESCE(ur.scope_state, ur.regiao) = _target_state
        ))
        OR
        -- Regional scope: matches if target city is in that region
        -- (for now, we assume region = state, can expand later)
        (ur.scope_type = 'regional' AND (
          _target_state IS NULL 
          OR COALESCE(ur.scope_state, ur.regiao) = _target_state
        ))
        OR
        -- Cidade scope: matches if target city equals scope city
        (ur.scope_type = 'cidade' AND (
          _target_city IS NULL 
          OR COALESCE(ur.scope_city, ur.cidade) = _target_city
        ))
        OR
        -- Celula scope: matches if target cell equals scope cell
        (ur.scope_type = 'celula' AND (
          _target_cell_id IS NULL 
          OR COALESCE(ur.scope_cell_id, ur.cell_id) = _target_cell_id
        ))
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role_in_scope(uuid, text[], text, text, uuid) TO authenticated;

-- 4) Wrapper: is_admin_global - check for global admin
DROP FUNCTION IF EXISTS public.is_admin_global(uuid);

CREATE OR REPLACE FUNCTION public.is_admin_global(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'coordenador_estadual')
      AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > now())
      AND scope_type IN ('global', 'estado')
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_global(uuid) TO authenticated;

-- 5) Wrapper: is_coord_in_scope - coordinator check with scope
DROP FUNCTION IF EXISTS public.is_coord_in_scope(uuid, text, text, uuid);

CREATE OR REPLACE FUNCTION public.is_coord_in_scope(
  _user_id uuid,
  _target_state text DEFAULT NULL,
  _target_city text DEFAULT NULL,
  _target_cell_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role_in_scope(
    _user_id,
    ARRAY['admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_municipal', 'coordenador_celula'],
    _target_state,
    _target_city,
    _target_cell_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_coord_in_scope(uuid, text, text, uuid) TO authenticated;

-- 6) RPC: get_user_scope - returns current user's scope info
DROP FUNCTION IF EXISTS public.get_user_scope(uuid);

CREATE OR REPLACE FUNCTION public.get_user_scope(_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := COALESCE(_user_id, auth.uid());
  v_result jsonb;
  v_role record;
BEGIN
  -- Get the highest-privilege active role
  SELECT INTO v_role
    ur.role::text as role,
    ur.scope_type,
    COALESCE(ur.scope_state, ur.regiao) as scope_state,
    COALESCE(ur.scope_city, ur.cidade) as scope_city,
    COALESCE(ur.scope_cell_id, ur.cell_id) as scope_cell_id,
    c.name as cell_name
  FROM public.user_roles ur
  LEFT JOIN public.cells c ON c.id = COALESCE(ur.scope_cell_id, ur.cell_id)
  WHERE ur.user_id = v_uid
    AND ur.revoked_at IS NULL
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  ORDER BY 
    CASE ur.role::text
      WHEN 'admin' THEN 1
      WHEN 'coordenador_estadual' THEN 2
      WHEN 'coordenador_regional' THEN 3
      WHEN 'coordenador_municipal' THEN 4
      WHEN 'coordenador_celula' THEN 5
      WHEN 'moderador_celula' THEN 6
      ELSE 7
    END
  LIMIT 1;

  IF v_role IS NULL THEN
    -- Check legacy admins table
    IF EXISTS (SELECT 1 FROM public.admins WHERE user_id = v_uid) THEN
      RETURN jsonb_build_object(
        'role', 'admin',
        'scope_type', 'global',
        'scope_state', null,
        'scope_city', null,
        'scope_cell_id', null,
        'scope_label', 'Admin Global'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'role', 'voluntario',
      'scope_type', 'none',
      'scope_state', null,
      'scope_city', null,
      'scope_cell_id', null,
      'scope_label', 'Voluntário'
    );
  END IF;

  v_result := jsonb_build_object(
    'role', v_role.role,
    'scope_type', COALESCE(v_role.scope_type, 'global'),
    'scope_state', v_role.scope_state,
    'scope_city', v_role.scope_city,
    'scope_cell_id', v_role.scope_cell_id,
    'scope_label', 
      CASE 
        WHEN v_role.role = 'admin' THEN 'Admin Global'
        WHEN v_role.role = 'coordenador_estadual' THEN 'Coord. Estadual'
        WHEN v_role.role = 'coordenador_regional' THEN 'Coord. Regional (' || COALESCE(v_role.scope_state, '—') || ')'
        WHEN v_role.role = 'coordenador_municipal' THEN 'Coord. Municipal (' || COALESCE(v_role.scope_city, '—') || ')'
        WHEN v_role.role = 'coordenador_celula' THEN 'Coord. Célula (' || COALESCE(v_role.cell_name, '—') || ')'
        WHEN v_role.role = 'moderador_celula' THEN 'Moderador (' || COALESCE(v_role.cell_name, '—') || ')'
        ELSE 'Voluntário'
      END
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_scope(uuid) TO authenticated;

-- 7) RPC: grant_scoped_role - with audit log
DROP FUNCTION IF EXISTS public.grant_scoped_role(uuid, text, text, text, text, uuid, timestamptz);

CREATE OR REPLACE FUNCTION public.grant_scoped_role(
  _target_user_id uuid,
  _role text,
  _scope_type text DEFAULT 'global',
  _scope_state text DEFAULT NULL,
  _scope_city text DEFAULT NULL,
  _scope_cell_id uuid DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_id uuid := auth.uid();
  v_new_role_id uuid;
  v_can_grant boolean := false;
BEGIN
  -- Permission check: operator must have higher or equal scope
  IF public.is_admin_global(v_operator_id) THEN
    v_can_grant := true;
  ELSIF _scope_type = 'estado' AND public.has_role_in_scope(v_operator_id, ARRAY['admin', 'coordenador_estadual'], _scope_state, NULL, NULL) THEN
    v_can_grant := true;
  ELSIF _scope_type = 'cidade' AND public.has_role_in_scope(v_operator_id, ARRAY['admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_municipal'], _scope_state, _scope_city, NULL) THEN
    v_can_grant := true;
  ELSIF _scope_type = 'celula' AND public.has_role_in_scope(v_operator_id, ARRAY['admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_municipal', 'coordenador_celula'], _scope_state, _scope_city, _scope_cell_id) THEN
    v_can_grant := true;
  END IF;

  IF NOT v_can_grant THEN
    -- Log denied attempt
    INSERT INTO public.audit_logs (user_id, entity_type, action, new_data)
    VALUES (v_operator_id, 'user_roles', 'grant_denied', jsonb_build_object(
      'target_user_id', _target_user_id,
      'role', _role,
      'scope_type', _scope_type,
      'reason', 'insufficient_permissions'
    ));
    
    RETURN jsonb_build_object('ok', false, 'reason', 'Permissão insuficiente para atribuir este papel neste escopo');
  END IF;

  -- Insert new role
  INSERT INTO public.user_roles (
    user_id, role, 
    scope_type, scope_state, scope_city, scope_cell_id,
    granted_by, expires_at, created_by
  ) VALUES (
    _target_user_id, _role::app_role,
    _scope_type, _scope_state, _scope_city, _scope_cell_id,
    v_operator_id, _expires_at, v_operator_id
  )
  RETURNING id INTO v_new_role_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, new_data)
  VALUES (v_operator_id, 'user_roles', v_new_role_id::text, 'grant', jsonb_build_object(
    'target_user_id', _target_user_id,
    'role', _role,
    'scope_type', _scope_type,
    'scope_state', _scope_state,
    'scope_city', _scope_city,
    'scope_cell_id', _scope_cell_id,
    'expires_at', _expires_at
  ));

  RETURN jsonb_build_object('ok', true, 'role_id', v_new_role_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_scoped_role(uuid, text, text, text, text, uuid, timestamptz) TO authenticated;

-- 8) RPC: revoke_scoped_role - with audit log
DROP FUNCTION IF EXISTS public.revoke_scoped_role(uuid, text);

CREATE OR REPLACE FUNCTION public.revoke_scoped_role(
  _role_id uuid,
  _reason text DEFAULT 'Revogado pelo coordenador'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_id uuid := auth.uid();
  v_role record;
  v_can_revoke boolean := false;
BEGIN
  -- Get the role to revoke
  SELECT * INTO v_role FROM public.user_roles WHERE id = _role_id;
  
  IF v_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Papel não encontrado');
  END IF;
  
  IF v_role.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Papel já foi revogado');
  END IF;

  -- Permission check
  IF public.is_admin_global(v_operator_id) THEN
    v_can_revoke := true;
  ELSIF public.has_role_in_scope(
    v_operator_id, 
    ARRAY['admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_municipal'],
    COALESCE(v_role.scope_state, v_role.regiao),
    COALESCE(v_role.scope_city, v_role.cidade),
    COALESCE(v_role.scope_cell_id, v_role.cell_id)
  ) THEN
    v_can_revoke := true;
  END IF;

  -- Prevent revoking last admin
  IF v_role.role::text = 'admin' THEN
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin' AND revoked_at IS NULL) <= 1 THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'Não é possível revogar o último admin');
    END IF;
  END IF;

  IF NOT v_can_revoke THEN
    INSERT INTO public.audit_logs (user_id, entity_type, action, new_data)
    VALUES (v_operator_id, 'user_roles', 'revoke_denied', jsonb_build_object(
      'role_id', _role_id,
      'target_user_id', v_role.user_id,
      'reason', 'insufficient_permissions'
    ));
    
    RETURN jsonb_build_object('ok', false, 'reason', 'Permissão insuficiente para revogar este papel');
  END IF;

  -- Revoke
  UPDATE public.user_roles
  SET revoked_at = now(), revoked_by = v_operator_id, reason = _reason
  WHERE id = _role_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, old_data, new_data)
  VALUES (v_operator_id, 'user_roles', _role_id::text, 'revoke', 
    jsonb_build_object('role', v_role.role, 'user_id', v_role.user_id),
    jsonb_build_object('reason', _reason)
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_scoped_role(uuid, text) TO authenticated;

-- 9) RPC: get_role_audit_history - for governance sheet
DROP FUNCTION IF EXISTS public.get_role_audit_history(uuid, int);

CREATE OR REPLACE FUNCTION public.get_role_audit_history(
  _target_user_id uuid,
  _limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  action text,
  role text,
  scope_type text,
  scope_city text,
  actor_nickname text,
  reason text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only coordinators can view history
  IF NOT public.is_coord_in_scope(auth.uid(), NULL, NULL, NULL) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    COALESCE(al.new_data->>'role', al.old_data->>'role', '—') as role,
    COALESCE(al.new_data->>'scope_type', '—') as scope_type,
    COALESCE(al.new_data->>'scope_city', '—') as scope_city,
    COALESCE(p.full_name, 'Sistema') as actor_nickname,
    COALESCE(al.new_data->>'reason', '—') as reason,
    al.created_at
  FROM public.audit_logs al
  LEFT JOIN public.profiles p ON p.id = al.user_id
  WHERE al.entity_type = 'user_roles'
    AND (
      al.new_data->>'target_user_id' = _target_user_id::text
      OR al.old_data->>'user_id' = _target_user_id::text
    )
  ORDER BY al.created_at DESC
  LIMIT _limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_role_audit_history(uuid, int) TO authenticated;

-- 10) Update get_app_health_metrics to use new scope helper
CREATE OR REPLACE FUNCTION public.get_app_health_metrics(
  _period_days int DEFAULT 7,
  _scope_city text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := now() - (_period_days || ' days')::interval;
  v_city text;
  v_is_coord boolean;
  v_result jsonb;
BEGIN
  -- Use new scope helper
  v_is_coord := public.is_coord_in_scope(auth.uid(), NULL, NULL, NULL);

  IF NOT v_is_coord THEN
    RETURN jsonb_build_object('error','forbidden');
  END IF;

  -- default scope for non-admin: own city
  IF _scope_city IS NULL THEN
    SELECT p.city INTO v_city FROM public.profiles p WHERE p.id = auth.uid();
  ELSE
    v_city := left(_scope_city, 80);
  END IF;

  WITH base AS (
    SELECT *
    FROM public.app_errors
    WHERE occurred_at >= v_start
      AND (v_city IS NULL OR scope_city = v_city)
  ),
  by_day AS (
    SELECT to_char(date_trunc('day', occurred_at), 'YYYY-MM-DD') AS day,
           count(*) AS total
    FROM base
    GROUP BY 1
    ORDER BY 1
  ),
  top_codes AS (
    SELECT error_code, count(*) AS total
    FROM base
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 8
  ),
  top_routes AS (
    SELECT route, count(*) AS total
    FROM base
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 8
  ),
  by_source AS (
    SELECT source, count(*) AS total
    FROM base
    GROUP BY 1
    ORDER BY total DESC
  )
  SELECT jsonb_build_object(
    'period_days', _period_days,
    'scope_city', v_city,
    'total', (SELECT count(*) FROM base),
    'by_day', (SELECT COALESCE(jsonb_agg(jsonb_build_object('day',day,'total',total)), '[]'::jsonb) FROM by_day),
    'top_codes', (SELECT COALESCE(jsonb_agg(jsonb_build_object('code',error_code,'total',total)), '[]'::jsonb) FROM top_codes),
    'top_routes', (SELECT COALESCE(jsonb_agg(jsonb_build_object('route',route,'total',total)), '[]'::jsonb) FROM top_routes),
    'by_source', (SELECT COALESCE(jsonb_agg(jsonb_build_object('source',source,'total',total)), '[]'::jsonb) FROM by_source)
  ) INTO v_result;

  RETURN v_result;
END;
$$;