-- ============================================================
-- Fix 1: Scope-based profile visibility for coordinators
-- Coordinators can only view profiles in their managed cities
-- ============================================================

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON profiles;

-- Create scope-based profile view policy
-- Users can view their own profile
-- Admins can view all profiles
-- Coordinators can ONLY view profiles in their managed cities/cells
CREATE POLICY "Users can view profiles in scope"
ON profiles FOR SELECT
TO authenticated
USING (
  -- Users can always view their own profile
  auth.uid() = id
  OR
  -- Admins can view all profiles
  has_role(auth.uid(), 'admin')
  OR
  -- Coordinators can only view profiles within their managed scope
  (
    is_coordinator(auth.uid())
    AND
    (
      -- State-level coordinators can view all profiles in their state (only state is checked)
      has_role(auth.uid(), 'coordenador_estadual')
      OR
      -- Regional/municipal coordinators: profile city must be in their managed cities
      city IN (SELECT cidade FROM get_managed_cities(auth.uid()))
      OR
      -- Cell coordinators: profile must be member of a cell they coordinate
      EXISTS (
        SELECT 1 FROM cell_memberships cm
        JOIN user_roles ur ON ur.cell_id = cm.cell_id AND ur.user_id = auth.uid()
        WHERE cm.user_id = profiles.id
        AND ur.role = 'coordenador_celula'
        AND ur.revoked_at IS NULL
        AND cm.status = 'aprovado'
      )
    )
  )
);

-- Also fix the UPDATE policy to be scope-based
DROP POLICY IF EXISTS "Users can update own profile or admins can update all" ON profiles;

CREATE POLICY "Users can update profiles in scope"
ON profiles FOR UPDATE
TO authenticated
USING (
  -- Users can update their own profile
  auth.uid() = id
  OR
  -- Admins can update all profiles
  has_role(auth.uid(), 'admin')
  OR
  -- Coordinators can only update profiles within their managed scope
  (
    is_coordinator(auth.uid())
    AND
    (
      has_role(auth.uid(), 'coordenador_estadual')
      OR
      city IN (SELECT cidade FROM get_managed_cities(auth.uid()))
      OR
      EXISTS (
        SELECT 1 FROM cell_memberships cm
        JOIN user_roles ur ON ur.cell_id = cm.cell_id AND ur.user_id = auth.uid()
        WHERE cm.user_id = profiles.id
        AND ur.role = 'coordenador_celula'
        AND ur.revoked_at IS NULL
        AND cm.status = 'aprovado'
      )
    )
  )
)
WITH CHECK (
  auth.uid() = id
  OR
  has_role(auth.uid(), 'admin')
  OR
  (
    is_coordinator(auth.uid())
    AND
    (
      has_role(auth.uid(), 'coordenador_estadual')
      OR
      city IN (SELECT cidade FROM get_managed_cities(auth.uid()))
      OR
      EXISTS (
        SELECT 1 FROM cell_memberships cm
        JOIN user_roles ur ON ur.cell_id = cm.cell_id AND ur.user_id = auth.uid()
        WHERE cm.user_id = profiles.id
        AND ur.role = 'coordenador_celula'
        AND ur.revoked_at IS NULL
        AND cm.status = 'aprovado'
      )
    )
  )
);

-- ============================================================
-- Fix 2: Scope-based CRM contact visibility
-- Replace can_view_crm_contato function to be more restrictive
-- ============================================================

-- Drop existing policies that use can_view_crm_contato
DROP POLICY IF EXISTS "Users can view CRM contacts in scope" ON crm_contatos;
DROP POLICY IF EXISTS "Users can add interactions to accessible contacts" ON crm_interacoes;
DROP POLICY IF EXISTS "Users can view interactions of accessible contacts" ON crm_interacoes;

-- Create a new, more restrictive function for CRM contact visibility
-- Only allows access if:
-- 1. User created the contact
-- 2. Contact is assigned to the user
-- 3. User is admin
-- 4. User is a coordinator AND the contact's escopo matches their managed scope
CREATE OR REPLACE FUNCTION can_view_crm_contato_scoped(
  _user_id uuid,
  _escopo_tipo text,
  _escopo_id text,
  _criado_por uuid,
  _atribuido_a uuid,
  _cidade text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Creator can always view
    _criado_por = _user_id
    OR
    -- Assigned user can view
    _atribuido_a = _user_id
    OR
    -- Admin can view all
    has_role(_user_id, 'admin')
    OR
    -- State coordinator can view all
    has_role(_user_id, 'coordenador_estadual')
    OR
    -- Scoped coordinators: contact city must be in their managed cities
    (
      is_coordinator(_user_id)
      AND _cidade IN (SELECT cidade FROM get_managed_cities(_user_id))
    )
    OR
    -- Cell scope: coordinator must manage that specific cell
    (
      _escopo_tipo = 'celula'
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = _user_id
        AND cell_id = _escopo_id::uuid
        AND role = 'coordenador_celula'
        AND revoked_at IS NULL
      )
    )
$$;

-- Recreate CRM contact view policy with scoped access
CREATE POLICY "Users can view CRM contacts in scope"
ON crm_contatos FOR SELECT
TO authenticated
USING (
  can_view_crm_contato_scoped(auth.uid(), escopo_tipo, escopo_id, criado_por, atribuido_a, cidade)
);

-- Recreate interaction policies with the new scoped function
CREATE POLICY "Users can view interactions of accessible contacts"
ON crm_interacoes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm_contatos c
    WHERE c.id = crm_interacoes.contato_id
    AND can_view_crm_contato_scoped(auth.uid(), c.escopo_tipo, c.escopo_id, c.criado_por, c.atribuido_a, c.cidade)
  )
);

CREATE POLICY "Users can add interactions to accessible contacts"
ON crm_interacoes FOR INSERT
TO authenticated
WITH CHECK (
  autor_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM crm_contatos c
    WHERE c.id = crm_interacoes.contato_id
    AND can_view_crm_contato_scoped(auth.uid(), c.escopo_tipo, c.escopo_id, c.criado_por, c.atribuido_a, c.cidade)
  )
);

-- Also update the manage function for CRM contacts to be scope-aware
CREATE OR REPLACE FUNCTION can_manage_crm_contato(
  _user_id uuid,
  _escopo_tipo text,
  _escopo_id text,
  _criado_por uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Creator can always manage
    _criado_por = _user_id
    OR
    -- Admin can manage all
    has_role(_user_id, 'admin')
    OR
    -- State coordinator can manage all
    has_role(_user_id, 'coordenador_estadual')
    OR
    -- Cell coordinator can manage contacts in their cell
    (
      _escopo_tipo = 'celula'
      AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = _user_id
        AND cell_id = _escopo_id::uuid
        AND role = 'coordenador_celula'
        AND revoked_at IS NULL
      )
    )
    OR
    -- City coordinator can manage contacts in their city
    (
      _escopo_tipo = 'cidade'
      AND _escopo_id IN (SELECT cidade FROM get_managed_cities(_user_id))
    )
$$;