
-- Fix first mission assignment: profiles no longer has cell_id; use cell_memberships
CREATE OR REPLACE FUNCTION public.assign_first_mission_on_approval(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_mission_id uuid;
  _has_shared boolean;
  _mission_id uuid;
  _mission_type text;
  _active_cycle_id uuid;
  _user_city text;
  _user_cell_id uuid;
BEGIN
  -- Check if user already has a first mission (dedupe)
  SELECT id INTO _existing_mission_id
  FROM public.missions
  WHERE assigned_to = _user_id AND is_first_mission = true
  LIMIT 1;

  IF _existing_mission_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'mission_id', _existing_mission_id,
      'already_exists', true
    );
  END IF;

  -- Get user's city (from profiles) and primary cell (from memberships)
  SELECT p.city INTO _user_city
  FROM public.profiles p
  WHERE p.id = _user_id;

  SELECT cm.cell_id INTO _user_cell_id
  FROM public.cell_memberships cm
  WHERE cm.user_id = _user_id
    AND (cm.is_active IS NULL OR cm.is_active = true)
  ORDER BY cm.joined_at DESC
  LIMIT 1;

  -- Find active cycle using scope priority: cell > city > global
  SELECT id INTO _active_cycle_id FROM public.ciclos_semanais
  WHERE status = 'ativo' AND celula_id = _user_cell_id
  LIMIT 1;

  IF _active_cycle_id IS NULL AND _user_city IS NOT NULL THEN
    SELECT id INTO _active_cycle_id FROM public.ciclos_semanais
    WHERE status = 'ativo' AND cidade = _user_city AND celula_id IS NULL
    LIMIT 1;
  END IF;

  IF _active_cycle_id IS NULL THEN
    SELECT id INTO _active_cycle_id FROM public.ciclos_semanais
    WHERE status = 'ativo' AND cidade IS NULL AND celula_id IS NULL
    LIMIT 1;
  END IF;

  -- Check if user has shared an invite
  SELECT EXISTS (
    SELECT 1 FROM public.growth_events
    WHERE user_id = _user_id AND event_type = 'invite_shared'
    LIMIT 1
  ) INTO _has_shared;

  -- Determine mission type and create appropriate mission
  IF _has_shared THEN
    _mission_type := 'checkin';

    INSERT INTO public.missions (
      title,
      description,
      instructions,
      type,
      status,
      assigned_to,
      is_first_mission,
      requires_validation,
      ciclo_id
    ) VALUES (
      'Seu primeiro check-in',
      'Faça seu primeiro check-in do dia e entre na engrenagem do movimento.',
      '1. Vá até "Check-in do Dia"' || E'\n' ||
      '2. Informe sua disponibilidade' || E'\n' ||
      '3. Escolha seu foco do dia' || E'\n' ||
      '4. Pronto! Você está na engrenagem',
      'formacao',
      'publicada',
      _user_id,
      true,
      false,
      _active_cycle_id
    )
    RETURNING id INTO _mission_id;
  ELSE
    _mission_type := 'invite';

    INSERT INTO public.missions (
      title,
      description,
      instructions,
      type,
      status,
      assigned_to,
      is_first_mission,
      requires_validation,
      ciclo_id
    ) VALUES (
      'Convide 1 pessoa',
      'Sua primeira missão: convidar 1 pessoa para entrar no movimento. Use seu link único!',
      '1. Vá em "Meu Convite" no menu' || E'\n' ||
      '2. Copie seu link ou gere um QR Code' || E'\n' ||
      '3. Envie para alguém de confiança' || E'\n' ||
      '4. Quando a pessoa entrar, sua missão está cumprida!',
      'conteudo',
      'publicada',
      _user_id,
      true,
      false,
      _active_cycle_id
    )
    RETURNING id INTO _mission_id;
  END IF;

  -- Log the growth event
  INSERT INTO public.growth_events (event_type, user_id, meta)
  VALUES (
    'first_mission_assigned',
    _user_id,
    jsonb_build_object('mission_type', _mission_type, 'mission_id', _mission_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'mission_id', _mission_id,
    'mission_type', _mission_type,
    'already_exists', false
  );
END;
$$;

-- Make approval non-blocking if mission assignment fails for any reason
CREATE OR REPLACE FUNCTION public.trigger_assign_first_mission_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.volunteer_status = 'ativo' AND (OLD.volunteer_status IS NULL OR OLD.volunteer_status != 'ativo') THEN
    BEGIN
      PERFORM public.assign_first_mission_on_approval(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      -- don't block approval
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;
