-- Cell Coordinators v0.1 - Part 2: Update RPCs
-- Need to drop and recreate list_city_cells due to return type change

-- Drop old function first
DROP FUNCTION IF EXISTS public.list_city_cells(UUID);

-- Recreate list_city_cells with coordinator_count
CREATE OR REPLACE FUNCTION public.list_city_cells(p_city_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  -- Check authorization
  IF NOT (
    public.is_admin(v_caller_id) 
    OR public.is_coordinator(v_caller_id)
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'neighborhood', c.neighborhood,
      'description', c.description,
      'is_active', c.is_active,
      'tipo', c.tipo,
      'tags', c.tags,
      'weekly_goal', c.weekly_goal,
      'created_at', c.created_at,
      'member_count', COALESCE(mc.cnt, 0),
      'pending_requests', COALESCE(pr.cnt, 0),
      'coordinator_count', COALESCE(cc.cnt, 0)
    )
    ORDER BY c.name
  )
  INTO v_result
  FROM cells c
  LEFT JOIN (
    SELECT cell_id, COUNT(*) AS cnt
    FROM cell_memberships
    WHERE is_active = true
    GROUP BY cell_id
  ) mc ON mc.cell_id = c.id
  LEFT JOIN (
    SELECT assigned_cell_id AS cell_id, COUNT(*) AS cnt
    FROM cell_assignment_requests
    WHERE status = 'pending'
    GROUP BY assigned_cell_id
  ) pr ON pr.cell_id = c.id
  LEFT JOIN (
    SELECT cell_id, COUNT(*) AS cnt
    FROM cell_coordinators
    GROUP BY cell_id
  ) cc ON cc.cell_id = c.id
  WHERE c.cidade_id = p_city_id OR (p_city_id IS NULL);

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.list_city_cells(UUID) TO authenticated;