-- =====================================================
-- Ciclo de Atividade v0: Event Participation + Post-Event
-- =====================================================

-- 1) Create event_participations table
CREATE TABLE public.event_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'checked_in', 'completed', 'skipped')),
  checkin_at timestamptz NULL,
  completed_at timestamptz NULL,
  actions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

-- Indices
CREATE INDEX idx_event_participations_event_status ON public.event_participations(event_id, status);
CREATE INDEX idx_event_participations_user_updated ON public.event_participations(user_id, updated_at DESC);

-- Enable RLS
ALTER TABLE public.event_participations ENABLE ROW LEVEL SECURITY;

-- RLS: user can only see their own participations
CREATE POLICY "Users can view own participations"
  ON public.event_participations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own participations"
  ON public.event_participations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participations"
  ON public.event_participations FOR UPDATE
  USING (auth.uid() = user_id);

-- 2) Add attended_at to crm_event_invites
ALTER TABLE public.crm_event_invites 
  ADD COLUMN IF NOT EXISTS attended_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS attendance_marked_by text DEFAULT 'self' CHECK (attendance_marked_by IN ('self'));

-- =====================================================
-- RPCs
-- =====================================================

-- 2.1 Get my next event prompt (for banner in Hoje)
CREATE OR REPLACE FUNCTION public.get_my_next_event_prompt(_window_hours int DEFAULT 36)
RETURNS TABLE (
  event_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  title text,
  location text,
  has_any_invites boolean,
  my_participation_status text,
  suggested_stage text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _now timestamptz := now() AT TIME ZONE 'America/Sao_Paulo';
  _window_end timestamptz := _now + (_window_hours || ' hours')::interval;
BEGIN
  RETURN QUERY
  WITH next_event AS (
    SELECT 
      a.id,
      a.inicio_em,
      a.fim_em,
      a.titulo,
      a.local_texto,
      -- Check if user has any invites for this event
      EXISTS (
        SELECT 1 FROM crm_event_invites cei 
        WHERE cei.event_id = a.id AND cei.user_id = _user_id
      ) as has_invites,
      -- Get participation status
      (
        SELECT ep.status FROM event_participations ep 
        WHERE ep.event_id = a.id AND ep.user_id = _user_id
      ) as participation_status
    FROM atividades a
    WHERE a.status NOT IN ('cancelada')
      AND a.inicio_em >= _now - interval '6 hours' -- include events that started up to 6h ago (for post-event)
      AND a.inicio_em <= _window_end
    ORDER BY a.inicio_em ASC
    LIMIT 1
  )
  SELECT 
    ne.id,
    ne.inicio_em,
    ne.fim_em,
    ne.titulo,
    ne.local_texto,
    ne.has_invites,
    COALESCE(ne.participation_status, 'none'),
    CASE
      -- Already completed
      WHEN ne.participation_status = 'completed' THEN 'none'
      -- Event hasn't started yet
      WHEN ne.inicio_em > _now THEN 'pre'
      -- Event is happening now (started but not ended)
      WHEN ne.inicio_em <= _now AND (ne.fim_em IS NULL OR ne.fim_em > _now) THEN 'day_of'
      -- Event ended (post-event phase)
      WHEN ne.fim_em IS NOT NULL AND ne.fim_em <= _now THEN 'post'
      WHEN ne.inicio_em <= _now - interval '3 hours' THEN 'post'
      ELSE 'day_of'
    END
  FROM next_event ne;
END;
$$;

-- 2.2 Upsert event participation
CREATE OR REPLACE FUNCTION public.upsert_event_participation(_event_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _participation_id uuid;
BEGIN
  INSERT INTO event_participations (user_id, event_id, status)
  VALUES (_user_id, _event_id, 'planned')
  ON CONFLICT (user_id, event_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO _participation_id;
  
  RETURN _participation_id;
END;
$$;

-- 2.3 Check-in to event
CREATE OR REPLACE FUNCTION public.checkin_event(_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  INSERT INTO event_participations (user_id, event_id, status, checkin_at)
  VALUES (_user_id, _event_id, 'checked_in', now())
  ON CONFLICT (user_id, event_id) DO UPDATE SET 
    status = 'checked_in',
    checkin_at = COALESCE(event_participations.checkin_at, now()),
    updated_at = now();
END;
$$;

-- 2.4 Complete event participation (with allowlisted actions)
CREATE OR REPLACE FUNCTION public.complete_event_participation(_event_id uuid, _actions_json jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _allowed_keys text[] := ARRAY['brought_plus1', 'qualified_contacts', 'new_contacts'];
  _key text;
  _sanitized_actions jsonb := '{}'::jsonb;
BEGIN
  -- Validate and sanitize actions_json (only allow specific keys with correct types)
  FOR _key IN SELECT jsonb_object_keys(_actions_json) LOOP
    IF _key = ANY(_allowed_keys) THEN
      IF _key = 'brought_plus1' THEN
        -- Boolean only
        IF jsonb_typeof(_actions_json->_key) = 'boolean' THEN
          _sanitized_actions := _sanitized_actions || jsonb_build_object(_key, _actions_json->_key);
        END IF;
      ELSE
        -- Integer only (0-5 range)
        IF jsonb_typeof(_actions_json->_key) = 'number' THEN
          _sanitized_actions := _sanitized_actions || jsonb_build_object(
            _key, 
            LEAST(5, GREATEST(0, (_actions_json->>_key)::int))
          );
        END IF;
      END IF;
    END IF;
  END LOOP;

  INSERT INTO event_participations (user_id, event_id, status, completed_at, actions_json)
  VALUES (_user_id, _event_id, 'completed', now(), _sanitized_actions)
  ON CONFLICT (user_id, event_id) DO UPDATE SET 
    status = 'completed',
    completed_at = COALESCE(event_participations.completed_at, now()),
    actions_json = _sanitized_actions,
    updated_at = now();
END;
$$;

-- 2.5 Mark event invite as attended (for contacts)
CREATE OR REPLACE FUNCTION public.mark_event_invite_attended(_event_id uuid, _contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  -- Validate contact ownership via crm_contatos
  IF NOT EXISTS (
    SELECT 1 FROM crm_contatos 
    WHERE id = _contact_id AND criado_por = _user_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Contact not found or not owned by user';
  END IF;

  UPDATE crm_event_invites
  SET 
    status = 'attended',
    attended_at = now(),
    attendance_marked_by = 'self',
    updated_at = now()
  WHERE event_id = _event_id 
    AND contact_id = _contact_id 
    AND user_id = _user_id;
END;
$$;

-- 2.6 Get my participation for a specific event
CREATE OR REPLACE FUNCTION public.get_my_event_participation(_event_id uuid)
RETURNS TABLE (
  participation_id uuid,
  status text,
  checkin_at timestamptz,
  completed_at timestamptz,
  actions_json jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.id,
    ep.status,
    ep.checkin_at,
    ep.completed_at,
    ep.actions_json
  FROM event_participations ep
  WHERE ep.event_id = _event_id AND ep.user_id = auth.uid();
END;
$$;

-- 2.7 Get my invites for an event (for marking attendance)
CREATE OR REPLACE FUNCTION public.get_my_event_invites_for_attendance(_event_id uuid)
RETURNS TABLE (
  invite_id uuid,
  contact_id uuid,
  contact_name text,
  status text,
  attended_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cei.id,
    cei.contact_id,
    c.nome,
    cei.status,
    cei.attended_at
  FROM crm_event_invites cei
  JOIN crm_contatos c ON c.id = cei.contact_id
  WHERE cei.event_id = _event_id 
    AND cei.user_id = auth.uid()
    AND c.deleted_at IS NULL
  ORDER BY c.nome;
END;
$$;

-- 2.8 Coordinator metrics (aggregated, no PII)
CREATE OR REPLACE FUNCTION public.get_scope_event_participation_metrics(_days int DEFAULT 14)
RETURNS TABLE (
  event_id uuid,
  event_title text,
  event_date timestamptz,
  participations_planned bigint,
  participations_checked_in bigint,
  participations_completed bigint,
  invites_attended_total bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _scope_city text;
BEGIN
  -- Get user's scope city
  SELECT p.city INTO _scope_city
  FROM profiles p
  WHERE p.id = _user_id;

  RETURN QUERY
  SELECT 
    a.id,
    a.titulo,
    a.inicio_em,
    COUNT(*) FILTER (WHERE ep.status = 'planned'),
    COUNT(*) FILTER (WHERE ep.status = 'checked_in'),
    COUNT(*) FILTER (WHERE ep.status = 'completed'),
    (
      SELECT COUNT(*) FROM crm_event_invites cei 
      WHERE cei.event_id = a.id AND cei.status = 'attended'
    )
  FROM atividades a
  LEFT JOIN event_participations ep ON ep.event_id = a.id
  WHERE a.inicio_em >= now() - (_days || ' days')::interval
    AND a.inicio_em <= now() + interval '7 days'
    AND (a.cidade = _scope_city OR a.cidade IS NULL)
    AND a.status NOT IN ('cancelada')
  GROUP BY a.id, a.titulo, a.inicio_em
  ORDER BY a.inicio_em DESC;
END;
$$;