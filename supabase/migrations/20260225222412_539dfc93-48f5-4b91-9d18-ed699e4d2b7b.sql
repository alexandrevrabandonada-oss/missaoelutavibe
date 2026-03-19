
-- =============================================================
-- Simplify Cell Entry: Auto-allocate to "Geral" on approval
-- =============================================================

-- 1. Update approve_volunteer to auto-allocate to "Geral" cell
CREATE OR REPLACE FUNCTION public.approve_volunteer(_user_id uuid, _cell_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_final_cell_id uuid;
BEGIN
  -- Get profile info
  SELECT id, city_id, full_name INTO v_profile 
  FROM public.profiles WHERE id = _user_id;
  
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Voluntário não encontrado');
  END IF;

  -- Check permission using coord helper
  IF NOT public.can_operate_coord(v_profile.city_id, _cell_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para aprovar este voluntário');
  END IF;

  -- Priority: explicit cell_id > find "Geral" cell for the city
  IF _cell_id IS NOT NULL THEN
    v_final_cell_id := _cell_id;
  ELSE
    -- Auto-find "Geral" cell for the volunteer's city
    SELECT id INTO v_final_cell_id
    FROM public.cells
    WHERE cidade_id = v_profile.city_id
      AND LOWER(name) = 'geral'
      AND is_active = true
    LIMIT 1;
  END IF;

  -- Update profile status - always set cell_id, deprecate needs_cell_assignment
  UPDATE public.profiles 
  SET volunteer_status = 'ativo',
      approved_at = NOW(),
      approved_by = auth.uid(),
      rejection_reason = NULL,
      needs_cell_assignment = false,
      cell_id = v_final_cell_id
  WHERE id = _user_id;
  
  -- Create cell membership if we have a cell
  IF v_final_cell_id IS NOT NULL THEN
    INSERT INTO public.cell_memberships (user_id, cell_id, status, is_active, decided_by, decided_at)
    VALUES (_user_id, v_final_cell_id, 'aprovado', true, auth.uid(), now())
    ON CONFLICT (user_id, cell_id) DO UPDATE SET
      status = 'aprovado',
      is_active = true,
      decided_by = auth.uid(),
      decided_at = now();
  END IF;
  
  -- Close any pending assignment requests
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
      'auto_geral', _cell_id IS NULL AND v_final_cell_id IS NOT NULL
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'assigned_cell_id', v_final_cell_id,
    'auto_allocated', _cell_id IS NULL AND v_final_cell_id IS NOT NULL
  );
END;
$$;

-- 2. Simplify volunteer_save_city_selection: no more preferred_cell_id
CREATE OR REPLACE FUNCTION public.volunteer_save_city_selection(
  p_city_id uuid,
  p_preferred_cell_id uuid DEFAULT NULL,
  p_skip_cell boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_city_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;
  
  -- Get city name
  SELECT nome INTO v_city_name FROM cidades WHERE id = p_city_id;
  
  -- Update profile with city only (cell assigned on approval)
  UPDATE profiles
  SET city_id = p_city_id,
      city = v_city_name,
      preferred_cell_id = NULL,
      needs_cell_assignment = false,
      onboarding_complete = true,
      onboarding_status = 'concluido',
      onboarding_completed_at = NOW()
  WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'city_id', p_city_id
  );
END;
$$;

-- 3. Fix existing data: clear stale needs_cell_assignment flags
UPDATE profiles 
SET needs_cell_assignment = false 
WHERE needs_cell_assignment = true AND cell_id IS NOT NULL;
