-- Add new event types to growth_events check constraint
ALTER TABLE public.growth_events DROP CONSTRAINT IF EXISTS growth_events_event_type_check;
ALTER TABLE public.growth_events ADD CONSTRAINT growth_events_event_type_check 
CHECK (event_type IN (
  'visit', 'signup', 'territory_link_open', 'invite_form_open', 
  'invite_shared', 'invite_qr_opened', 'approved', 'onboarding_complete', 
  'first_action', 'template_share', 'visit_comecar', 'active_7d',
  'invite_submit_mini', 'missions_view',
  'first_mission_assigned', 'first_share_opened', 'first_share_completed'
));

-- Update log_growth_event RPC to whitelist new events
CREATE OR REPLACE FUNCTION public.log_growth_event(
  _event_type text,
  _template_id uuid DEFAULT NULL,
  _invite_code text DEFAULT NULL,
  _session_id text DEFAULT NULL,
  _meta jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _referrer_user_id uuid;
  _result_id uuid;
  _allowed_types text[] := ARRAY[
    'visit', 'signup', 'territory_link_open', 'invite_form_open',
    'invite_shared', 'invite_qr_opened', 'approved', 'onboarding_complete',
    'first_action', 'template_share', 'visit_comecar', 'active_7d',
    'invite_submit_mini', 'missions_view',
    'first_mission_assigned', 'first_share_opened', 'first_share_completed'
  ];
BEGIN
  -- Validate event type
  IF _event_type IS NULL OR _event_type = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'event_type is required');
  END IF;
  
  IF NOT (_event_type = ANY(_allowed_types)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid event_type');
  END IF;

  -- Get authenticated user (can be null for anonymous events)
  _user_id := auth.uid();

  -- Lookup referrer if invite_code provided
  IF _invite_code IS NOT NULL AND _invite_code != '' THEN
    SELECT criado_por INTO _referrer_user_id
    FROM public.convites
    WHERE code = _invite_code
    LIMIT 1;
  END IF;

  -- Insert the event
  INSERT INTO public.growth_events (
    event_type,
    user_id,
    template_id,
    invite_code,
    session_id,
    referrer_user_id,
    meta
  ) VALUES (
    _event_type,
    _user_id,
    _template_id,
    NULLIF(trim(_invite_code), ''),
    NULLIF(trim(_session_id), ''),
    _referrer_user_id,
    COALESCE(_meta, '{}'::jsonb)
  )
  RETURNING id INTO _result_id;

  RETURN jsonb_build_object('success', true, 'id', _result_id);
END;
$$;

-- Create RPC to assign first mission on approval
-- Returns mission_type: 'invite' (if they haven't shared) or 'checkin' (if already shared)
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

  -- Get user's city and cell for scope
  SELECT city, cell_id INTO _user_city, _user_cell_id
  FROM public.profiles
  WHERE id = _user_id;

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
  VALUES ('first_mission_assigned', _user_id, jsonb_build_object('mission_type', _mission_type, 'mission_id', _mission_id));

  RETURN jsonb_build_object(
    'success', true,
    'mission_id', _mission_id,
    'mission_type', _mission_type,
    'already_exists', false
  );
END;
$$;

-- Create trigger to auto-assign first mission when user is approved
CREATE OR REPLACE FUNCTION public.trigger_assign_first_mission_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when status changes to 'ativo' (approved)
  IF NEW.volunteer_status = 'ativo' AND (OLD.volunteer_status IS NULL OR OLD.volunteer_status != 'ativo') THEN
    -- Assign first mission asynchronously (non-blocking)
    PERFORM public.assign_first_mission_on_approval(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_approval_assign_first_mission ON public.profiles;
CREATE TRIGGER on_approval_assign_first_mission
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_assign_first_mission_on_approval();

-- Grant execute on the RPC
GRANT EXECUTE ON FUNCTION public.assign_first_mission_on_approval(uuid) TO authenticated;