-- Fix the can_view_ticket function to use existing role check
CREATE OR REPLACE FUNCTION public.can_view_ticket(_user_id uuid, _ticket_criado_por uuid, _ticket_cidade text, _ticket_celula_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Owner can always view their own tickets
    _user_id = _ticket_criado_por
    -- Coordinators can view tickets in their scope
    OR (
      is_coordinator(_user_id)
      AND (
        -- Admins can see everything
        is_admin(_user_id)
        -- Coordinators can see tickets from their managed cities
        OR (_ticket_cidade IS NOT NULL AND can_manage_cidade(_user_id, _ticket_cidade))
        -- Cell coordinators can see tickets from their cell
        OR (_ticket_celula_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.revoked_at IS NULL
            AND ur.cell_id = _ticket_celula_id
        ))
      )
    )
$$;

-- Also fix get_scoped_open_tickets_count to use is_admin
CREATE OR REPLACE FUNCTION public.get_scoped_open_tickets_count(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
BEGIN
  IF NOT is_coordinator(_user_id) THEN
    -- Regular users: count their own open tickets
    SELECT COUNT(*) INTO _count
    FROM public.tickets
    WHERE criado_por = _user_id
      AND status IN ('ABERTO', 'EM_ANDAMENTO');
  ELSIF is_admin(_user_id) THEN
    -- Admins: count all open tickets
    SELECT COUNT(*) INTO _count
    FROM public.tickets
    WHERE status IN ('ABERTO', 'EM_ANDAMENTO');
  ELSE
    -- Scoped coordinators: count tickets in their scope
    SELECT COUNT(*) INTO _count
    FROM public.tickets t
    WHERE t.status IN ('ABERTO', 'EM_ANDAMENTO')
      AND (
        (t.cidade IS NOT NULL AND can_manage_cidade(_user_id, t.cidade))
        OR (t.celula_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = _user_id
            AND ur.revoked_at IS NULL
            AND ur.cell_id = t.celula_id
        ))
      );
  END IF;
  
  RETURN COALESCE(_count, 0);
END;
$$;