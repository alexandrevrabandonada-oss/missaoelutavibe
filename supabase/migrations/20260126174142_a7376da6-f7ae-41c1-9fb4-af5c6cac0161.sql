
-- Drop the old 3-parameter version that uses _approved_by
DROP FUNCTION IF EXISTS public.approve_volunteer(uuid, uuid, uuid);

-- Recreate the 2-parameter version (uses auth.uid() as approved_by)
CREATE OR REPLACE FUNCTION public.approve_volunteer(_user_id uuid, _cell_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is coordinator
    IF NOT is_coordinator(auth.uid()) THEN
        RAISE EXCEPTION 'Apenas coordenadores podem aprovar voluntários';
    END IF;

    -- Update profile status using actual caller ID
    UPDATE public.profiles 
    SET volunteer_status = 'ativo',
        approved_at = NOW(),
        approved_by = auth.uid(),
        rejection_reason = NULL
    WHERE id = _user_id;
    
    -- If cell_id provided, add cell membership
    IF _cell_id IS NOT NULL THEN
        INSERT INTO public.cell_memberships (user_id, cell_id)
        VALUES (_user_id, _cell_id)
        ON CONFLICT (user_id, cell_id) DO NOTHING;
    END IF;
END;
$$;

-- Also fix reject_volunteer to match the pattern
DROP FUNCTION IF EXISTS public.reject_volunteer(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.reject_volunteer(_user_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify caller is coordinator
    IF NOT is_coordinator(auth.uid()) THEN
        RAISE EXCEPTION 'Apenas coordenadores podem recusar voluntários';
    END IF;

    -- Update profile status
    UPDATE public.profiles 
    SET volunteer_status = 'recusado',
        rejection_reason = _reason,
        approved_by = auth.uid()
    WHERE id = _user_id;
END;
$$;
