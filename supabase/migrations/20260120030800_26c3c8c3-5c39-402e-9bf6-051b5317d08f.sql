-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view visible topics" ON public.topicos;

-- Create a function to check if user can access a topic based on scope
CREATE OR REPLACE FUNCTION public.can_view_topico(_user_id uuid, _topico_escopo topico_escopo, _celula_id uuid, _oculto boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      -- Admins/Coordinators can see everything
      WHEN is_coordinator(_user_id) THEN true
      -- Hidden topics only visible to coordinators
      WHEN _oculto = true THEN false
      -- Global topics visible to all authenticated users
      WHEN _topico_escopo = 'global' THEN true
      -- Cell topics visible to members of that cell
      WHEN _topico_escopo = 'celula' THEN EXISTS (
        SELECT 1 
        FROM public.cell_memberships 
        WHERE user_id = _user_id 
          AND cell_id = _celula_id 
          AND is_active = true
      )
      ELSE false
    END
$$;

-- Create improved SELECT policy for topics
CREATE POLICY "Users can view topics based on scope"
ON public.topicos
FOR SELECT
USING (
  can_view_topico(auth.uid(), escopo, celula_id, oculto)
);

-- Also create a function to get user's cells for frontend filtering
CREATE OR REPLACE FUNCTION public.get_user_cell_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cell_id 
  FROM public.cell_memberships 
  WHERE user_id = _user_id 
    AND is_active = true
$$;