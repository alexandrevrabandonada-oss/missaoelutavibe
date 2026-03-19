-- Cell Operations v0: Secure RPCs for coordinator cell management
-- No direct SELECT access - all data goes through these RPCs

-- 1. List city assignment requests (returns WITHOUT PII)
CREATE OR REPLACE FUNCTION public.list_city_assignment_requests(
  p_city_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  city_id UUID,
  bairro TEXT,
  disponibilidade TEXT,
  interesses TEXT[],
  status TEXT,
  notes TEXT,
  assigned_cell_id UUID,
  assigned_cell_name TEXT,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  -- Minimal profile info (no PII)
  profile_first_name TEXT,
  profile_neighborhood TEXT,
  days_waiting INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.profile_id,
    r.city_id,
    r.bairro,
    r.disponibilidade,
    r.interesses,
    r.status,
    r.notes,
    r.assigned_cell_id,
    c.name AS assigned_cell_name,
    r.created_at,
    r.resolved_at,
    -- Only first name, no full name or contact info
    SPLIT_PART(p.full_name, ' ', 1) AS profile_first_name,
    p.neighborhood AS profile_neighborhood,
    EXTRACT(DAY FROM NOW() - r.created_at)::INTEGER AS days_waiting
  FROM cell_assignment_requests r
  LEFT JOIN profiles p ON p.id = r.profile_id
  LEFT JOIN cells c ON c.id = r.assigned_cell_id
  WHERE r.city_id = p_city_id
    AND (p_status IS NULL OR r.status = p_status)
  ORDER BY 
    CASE r.status 
      WHEN 'pending' THEN 1 
      WHEN 'assigned' THEN 2 
      ELSE 3 
    END,
    r.created_at DESC;
END;
$$;

-- 2. List cells for a city (coordinator view)
CREATE OR REPLACE FUNCTION public.list_city_cells(
  p_city_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  neighborhood TEXT,
  description TEXT,
  is_active BOOLEAN,
  tipo TEXT,
  tags TEXT[],
  weekly_goal INTEGER,
  member_count BIGINT,
  pending_requests BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.neighborhood,
    c.description,
    c.is_active,
    c.tipo::TEXT,
    c.tags,
    c.weekly_goal,
    (SELECT COUNT(*) FROM cell_memberships cm 
     WHERE cm.cell_id = c.id AND cm.status = 'aprovado')::BIGINT AS member_count,
    (SELECT COUNT(*) FROM cell_assignment_requests car 
     WHERE car.assigned_cell_id = c.id AND car.status = 'pending')::BIGINT AS pending_requests,
    c.created_at
  FROM cells c
  WHERE c.cidade_id = p_city_id
  ORDER BY c.is_active DESC, c.name;
END;
$$;

-- 3. Upsert cell (create or update)
CREATE OR REPLACE FUNCTION public.upsert_cell(
  p_city_id UUID,
  p_name TEXT,
  p_notes TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE,
  p_neighborhood TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_cell_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_city_name TEXT;
  v_city_uf TEXT;
  v_cell_id UUID;
BEGIN
  -- Get city info
  SELECT nome, uf INTO v_city_name, v_city_uf
  FROM cidades WHERE id = p_city_id;
  
  IF v_city_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Cidade não encontrada');
  END IF;
  
  IF p_cell_id IS NOT NULL THEN
    -- Update existing cell
    UPDATE cells SET
      name = p_name,
      description = p_notes,
      is_active = p_is_active,
      neighborhood = p_neighborhood,
      tags = p_tags,
      updated_at = NOW()
    WHERE id = p_cell_id AND cidade_id = p_city_id;
    
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Célula não encontrada');
    END IF;
    
    v_cell_id := p_cell_id;
  ELSE
    -- Create new cell
    INSERT INTO cells (
      cidade_id, city, state, name, description, 
      is_active, neighborhood, tags, created_by
    )
    VALUES (
      p_city_id, v_city_name, v_city_uf, p_name, p_notes,
      p_is_active, p_neighborhood, p_tags, auth.uid()
    )
    RETURNING id INTO v_cell_id;
  END IF;
  
  RETURN json_build_object('success', true, 'cell_id', v_cell_id);
END;
$$;

-- 4. Approve and assign request
CREATE OR REPLACE FUNCTION public.approve_and_assign_request(
  p_request_id UUID,
  p_cell_id UUID DEFAULT NULL,
  p_coordinator_note TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_cell RECORD;
BEGIN
  -- Get request
  SELECT * INTO v_request
  FROM cell_assignment_requests
  WHERE id = p_request_id AND status = 'pending';
  
  IF v_request IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Pedido não encontrado ou já processado');
  END IF;
  
  -- If cell provided, validate it
  IF p_cell_id IS NOT NULL THEN
    SELECT * INTO v_cell
    FROM cells
    WHERE id = p_cell_id AND cidade_id = v_request.city_id AND is_active = true;
    
    IF v_cell IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'Célula não encontrada ou inativa');
    END IF;
    
    -- Update profile with cell assignment
    UPDATE profiles SET
      cell_id = p_cell_id,
      needs_cell_assignment = false,
      updated_at = NOW()
    WHERE id = v_request.profile_id;
    
    -- Create cell membership
    INSERT INTO cell_memberships (user_id, cell_id, status, is_active)
    VALUES (v_request.profile_id, p_cell_id, 'aprovado', true)
    ON CONFLICT (user_id, cell_id) 
    DO UPDATE SET status = 'aprovado', is_active = true, decided_at = NOW(), decided_by = auth.uid();
  END IF;
  
  -- Update request status
  UPDATE cell_assignment_requests SET
    status = CASE WHEN p_cell_id IS NOT NULL THEN 'assigned' ELSE 'approved_no_cell' END,
    assigned_cell_id = p_cell_id,
    notes = COALESCE(p_coordinator_note, notes),
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'success', true, 
    'status', CASE WHEN p_cell_id IS NOT NULL THEN 'assigned' ELSE 'approved_no_cell' END,
    'cell_id', p_cell_id
  );
END;
$$;

-- 5. Cancel/reject request
CREATE OR REPLACE FUNCTION public.cancel_assignment_request(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cell_assignment_requests SET
    status = 'cancelled',
    notes = COALESCE(p_reason, notes),
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Pedido não encontrado ou já processado');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;

-- 6. Get cell ops KPIs (for diagnostics)
CREATE OR REPLACE FUNCTION public.get_cell_ops_kpis()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_cities', (SELECT COUNT(*) FROM cidades WHERE status = 'ativa'),
    'total_cells', (SELECT COUNT(*) FROM cells WHERE is_active = true),
    'pending_requests', (SELECT COUNT(*) FROM cell_assignment_requests WHERE status = 'pending'),
    'cities_with_cells', (
      SELECT COUNT(DISTINCT cidade_id) FROM cells WHERE is_active = true AND cidade_id IS NOT NULL
    ),
    'cities_without_cells', (
      SELECT COUNT(*) FROM cidades c 
      WHERE c.status = 'ativa' 
      AND NOT EXISTS (SELECT 1 FROM cells cl WHERE cl.cidade_id = c.id AND cl.is_active = true)
    ),
    'pending_by_city', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT 
          ci.nome AS city_name,
          ci.uf,
          COUNT(car.id) AS pending_count
        FROM cidades ci
        LEFT JOIN cell_assignment_requests car ON car.city_id = ci.id AND car.status = 'pending'
        WHERE ci.status = 'ativa'
        GROUP BY ci.id, ci.nome, ci.uf
        HAVING COUNT(car.id) > 0
        ORDER BY COUNT(car.id) DESC
        LIMIT 10
      ) t
    ),
    'cells_by_city', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT 
          ci.nome AS city_name,
          ci.uf,
          COUNT(c.id) AS cell_count
        FROM cidades ci
        LEFT JOIN cells c ON c.cidade_id = ci.id AND c.is_active = true
        WHERE ci.status = 'ativa'
        GROUP BY ci.id, ci.nome, ci.uf
        ORDER BY COUNT(c.id) DESC
        LIMIT 10
      ) t
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;