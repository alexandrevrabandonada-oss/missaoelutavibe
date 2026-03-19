-- Add RLS policy to allow first user to self-promote when no admins exist
-- This enables a bootstrap flow without requiring manual SQL

CREATE POLICY "First user can bootstrap admin when table is empty"
ON public.admins
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND NOT EXISTS (SELECT 1 FROM public.admins LIMIT 1)
);

-- Create a function to safely count admins (for UI use)
CREATE OR REPLACE FUNCTION public.get_admin_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.admins;
$$;

-- Grant execute to authenticated users so they can check if bootstrap is needed
GRANT EXECUTE ON FUNCTION public.get_admin_count() TO authenticated;