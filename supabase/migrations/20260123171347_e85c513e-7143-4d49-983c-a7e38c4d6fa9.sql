-- =============================================
-- FIX: Update get_completed_missions_count to use correct enum value
-- =============================================
CREATE OR REPLACE FUNCTION public.get_completed_missions_count(p_user_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM evidences e
  WHERE e.user_id = p_user_id
    AND e.status = 'aprovada';
$$;