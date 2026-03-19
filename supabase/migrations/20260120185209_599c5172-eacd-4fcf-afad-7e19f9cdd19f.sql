-- Create cell type enum
CREATE TYPE public.cell_tipo AS ENUM ('territorial', 'tema', 'regional');

-- Add tipo column to cells table
ALTER TABLE public.cells 
ADD COLUMN tipo public.cell_tipo NOT NULL DEFAULT 'territorial';

-- Update can_view_topico to be more robust
CREATE OR REPLACE FUNCTION public.can_view_topico(_user_id uuid, _topico_escopo topico_escopo, _celula_id uuid, _oculto boolean)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;