
-- =============================================================
-- Harden approve_volunteer: auto-create Geral + upsert + no dupes
-- =============================================================

CREATE OR REPLACE FUNCTION public.approve_volunteer(_user_id uuid, _cell_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_final_cell_id uuid;
  v_existing_membership_id uuid;
BEGIN
  -- Get profile info
  SELECT id, city_id, full_name INTO v_profile 
  FROM public.profiles WHERE id = _user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voluntário não encontrado');
  END IF;

  -- Check permission
  IF NOT public.can_operate_coord(v_profile.city_id, _cell_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para aprovar este voluntário');
  END IF;

  -- Priority: explicit cell_id > existing membership in city > find/create "Geral"
  IF _cell_id IS NOT NULL THEN
    v_final_cell_id := _cell_id;
  ELSE
    -- Check if volunteer already has active membership in this city
    SELECT cm.cell_id INTO v_existing_membership_id
    FROM public.cell_memberships cm
    JOIN public.cells c ON c.id = cm.cell_id
    WHERE cm.user_id = _user_id
      AND c.cidade_id = v_profile.city_id
      AND cm.is_active = true
    LIMIT 1;

    IF v_existing_membership_id IS NOT NULL THEN
      -- Already has a cell in this city - keep it
      v_final_cell_id := v_existing_membership_id;
    ELSE
      -- Find "Geral" cell
      SELECT id INTO v_final_cell_id
      FROM public.cells
      WHERE cidade_id = v_profile.city_id
        AND LOWER(name) = 'geral'
        AND is_active = true
      LIMIT 1;

      -- Auto-create "Geral" if it doesn't exist (idempotent)
      IF v_final_cell_id IS NULL AND v_profile.city_id IS NOT NULL THEN
        INSERT INTO public.cells (name, city, state, cidade_id, is_active, tipo)
        SELECT 'Geral', c.nome, c.uf, c.id, true, 'operacional'
        FROM public.cidades c WHERE c.id = v_profile.city_id
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_final_cell_id;

        -- If INSERT didn't return (race condition), fetch it
        IF v_final_cell_id IS NULL THEN
          SELECT id INTO v_final_cell_id
          FROM public.cells
          WHERE cidade_id = v_profile.city_id
            AND LOWER(name) = 'geral'
            AND is_active = true
          LIMIT 1;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Update profile
  UPDATE public.profiles 
  SET volunteer_status = 'ativo',
      approved_at = NOW(),
      approved_by = auth.uid(),
      rejection_reason = NULL,
      needs_cell_assignment = false,
      cell_id = v_final_cell_id
  WHERE id = _user_id;
  
  -- Upsert cell membership (unique on user_id, cell_id)
  IF v_final_cell_id IS NOT NULL THEN
    INSERT INTO public.cell_memberships (user_id, cell_id, status, is_active, decided_by, decided_at)
    VALUES (_user_id, v_final_cell_id, 'aprovado', true, auth.uid(), now())
    ON CONFLICT (user_id, cell_id) DO UPDATE SET
      status = 'aprovado',
      is_active = true,
      decided_by = auth.uid(),
      decided_at = now();
  END IF;
  
  -- Close pending assignment requests
  UPDATE cell_assignment_requests
  SET status = 'resolved',
      resolved_at = NOW(),
      resolved_by = auth.uid(),
      assigned_cell_id = v_final_cell_id
  WHERE profile_id = _user_id AND status = 'pending';
  
  -- Log to audit
  PERFORM public.log_coord_audit(
    'APPROVE_VOLUNTEER'::public.coord_audit_action,
    'CITY',
    v_profile.city_id,
    v_final_cell_id,
    _user_id,
    jsonb_build_object(
      'assigned_cell', v_final_cell_id IS NOT NULL,
      'auto_geral', _cell_id IS NULL AND v_final_cell_id IS NOT NULL,
      'reused_existing', v_existing_membership_id IS NOT NULL
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'assigned_cell_id', v_final_cell_id,
    'auto_allocated', _cell_id IS NULL AND v_final_cell_id IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_volunteer(uuid, uuid) TO authenticated;
