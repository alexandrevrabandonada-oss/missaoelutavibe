-- Admin RPCs for cell assignment queue
-- These functions are SECURITY DEFINER and check admin/coordinator roles

-- 1. List profiles needing cell assignment (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_cell_pending(p_limit INT DEFAULT 100)
RETURNS TABLE (
  profile_id UUID,
  display_name TEXT,
  city_id UUID,
  city_name TEXT,
  needs_cell_assignment BOOLEAN,
  cell_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin or coordinator
  IF NOT (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordenador_geral', 'coordenador_municipal'))
  ) THEN
    RAISE EXCEPTION 'Access denied: admin or coordinator role required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS profile_id,
    p.display_name,
    p.city_id,
    c.nome AS city_name,
    p.needs_cell_assignment,
    p.cell_id,
    p.created_at
  FROM profiles p
  LEFT JOIN cidades c ON c.id = p.city_id
  WHERE 
    p.city_id IS NOT NULL AND
    (p.needs_cell_assignment = true OR p.cell_id IS NULL) AND
    p.onboarding_complete = true AND
    EXISTS (SELECT 1 FROM voluntarios v WHERE v.user_id = p.id AND v.status = 'aprovado')
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 2. Assign a cell to a profile (admin only)
CREATE OR REPLACE FUNCTION public.admin_assign_cell(p_profile_id UUID, p_cell_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city_id UUID;
  v_cell_city_id UUID;
BEGIN
  -- Check if caller is admin or coordinator
  IF NOT (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordenador_geral', 'coordenador_municipal'))
  ) THEN
    RAISE EXCEPTION 'Access denied: admin or coordinator role required';
  END IF;

  -- Get profile's city
  SELECT city_id INTO v_city_id FROM profiles WHERE id = p_profile_id;
  IF v_city_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found or has no city';
  END IF;

  -- Get cell's city
  SELECT cidade_id INTO v_cell_city_id FROM cells WHERE id = p_cell_id;
  IF v_cell_city_id IS NULL THEN
    RAISE EXCEPTION 'Cell not found';
  END IF;

  -- Check city match
  IF v_city_id != v_cell_city_id THEN
    RAISE EXCEPTION 'Cell city does not match profile city';
  END IF;

  -- Update profile
  UPDATE profiles
  SET 
    cell_id = p_cell_id,
    needs_cell_assignment = false,
    updated_at = now()
  WHERE id = p_profile_id;

  -- Create cell membership if not exists
  INSERT INTO cell_memberships (user_id, cell_id, status, is_active)
  VALUES (p_profile_id, p_cell_id, 'aprovado', true)
  ON CONFLICT (user_id, cell_id) DO UPDATE SET is_active = true, status = 'aprovado';

  RETURN true;
END;
$$;

-- 3. Mark profile as "no cell needed" (stays solo/avulso)
CREATE OR REPLACE FUNCTION public.admin_mark_no_cell(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin or coordinator
  IF NOT (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('coordenador_geral', 'coordenador_municipal'))
  ) THEN
    RAISE EXCEPTION 'Access denied: admin or coordinator role required';
  END IF;

  -- Update profile to mark as handled (stays without cell)
  UPDATE profiles
  SET 
    needs_cell_assignment = false,
    updated_at = now()
  WHERE id = p_profile_id;

  RETURN true;
END;
$$;