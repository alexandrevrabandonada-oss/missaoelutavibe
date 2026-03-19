-- Privacy Pack for convites_usos: Restrict social graph exposure
-- The current RLS allows mapping user recruitment networks via usado_por field

-- Create a secure RPC that returns aggregated invite stats without exposing individual user IDs
-- This allows coordinators to see metrics without revealing the social graph

CREATE OR REPLACE FUNCTION get_invite_usage_stats(
  p_convite_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_convite_criado_por uuid;
  v_caller_id uuid := auth.uid();
BEGIN
  -- Get invite creator
  SELECT criado_por INTO v_convite_criado_por
  FROM convites 
  WHERE id = p_convite_id;
  
  IF v_convite_criado_por IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;
  
  -- Only allow:
  -- 1. The invite creator
  -- 2. Admins
  -- 3. Coordinators in scope
  IF v_caller_id = v_convite_criado_por THEN
    -- Creator can see full usage details including user names
    SELECT jsonb_build_object(
      'total_uses', COUNT(*),
      'uses', jsonb_agg(
        jsonb_build_object(
          'used_at', cu.usado_em,
          'user_name', p.full_name,
          'user_city', p.city
        )
        ORDER BY cu.usado_em DESC
      )
    ) INTO v_result
    FROM convites_usos cu
    LEFT JOIN profiles p ON p.id = cu.usado_por
    WHERE cu.convite_id = p_convite_id;
  ELSIF has_role(v_caller_id, 'admin') THEN
    -- Admin gets full stats
    SELECT jsonb_build_object(
      'total_uses', COUNT(*),
      'uses', jsonb_agg(
        jsonb_build_object(
          'used_at', cu.usado_em,
          'user_name', p.full_name,
          'user_city', p.city
        )
        ORDER BY cu.usado_em DESC
      )
    ) INTO v_result
    FROM convites_usos cu
    LEFT JOIN profiles p ON p.id = cu.usado_por
    WHERE cu.convite_id = p_convite_id;
  ELSIF is_coordinator(v_caller_id) THEN
    -- Coordinators only get aggregated stats (no user IDs or names)
    SELECT jsonb_build_object(
      'total_uses', COUNT(*),
      'cities', jsonb_agg(DISTINCT p.city) FILTER (WHERE p.city IS NOT NULL),
      'uses_by_date', jsonb_agg(
        jsonb_build_object(
          'date', cu.usado_em::date,
          'count', 1
        )
        ORDER BY cu.usado_em DESC
      )
    ) INTO v_result
    FROM convites_usos cu
    LEFT JOIN profiles p ON p.id = cu.usado_por
    LEFT JOIN convites c ON c.id = cu.convite_id
    WHERE cu.convite_id = p_convite_id
    AND (
      c.escopo_cidade IN (SELECT cidade FROM get_managed_cities(v_caller_id))
      OR c.escopo_cidade IS NULL -- Global invites
    );
  ELSE
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  
  RETURN COALESCE(v_result, '{"total_uses": 0, "uses": []}'::jsonb);
END;
$$;

-- Drop the existing coordinator policy that exposes user relationships
DROP POLICY IF EXISTS "Coordinators can view scoped usage" ON convites_usos;

-- Create a more restrictive policy for coordinators
-- They can only see their own invites' usage, not all scoped usage
-- For aggregate stats, they must use the RPC above
CREATE POLICY "Coordinators can view own invites usage"
ON convites_usos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM convites c
    WHERE c.id = convites_usos.convite_id
    AND c.criado_por = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- Add comment for documentation
COMMENT ON FUNCTION get_invite_usage_stats IS 'Returns invite usage statistics with privacy controls. Creators/admins see full details, coordinators only see aggregates to prevent social graph mapping.';