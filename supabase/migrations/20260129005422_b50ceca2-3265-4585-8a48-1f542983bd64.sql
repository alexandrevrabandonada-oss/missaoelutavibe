-- ============================================
-- Agenda RSVP + Convite pra Atividade v0
-- Fluxo: Contato qualificado → Convite → RSVP → Follow-up
-- ============================================

-- 1) Tabela de convites de eventos para contatos CRM
CREATE TABLE public.crm_event_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'going', 'maybe', 'declined', 'no_answer', 'attended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_outreach_at timestamptz,
  next_followup_at timestamptz,
  source text NOT NULL DEFAULT 'crm_drawer',
  
  -- Prevent duplicate invites
  CONSTRAINT crm_event_invites_unique UNIQUE (user_id, contact_id, event_id)
);

-- Indexes for common queries
CREATE INDEX idx_crm_event_invites_user_followup ON public.crm_event_invites(user_id, next_followup_at);
CREATE INDEX idx_crm_event_invites_event_status ON public.crm_event_invites(event_id, status);
CREATE INDEX idx_crm_event_invites_contact ON public.crm_event_invites(contact_id);

-- RLS: Users can only see/manage their own invites
ALTER TABLE public.crm_event_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own event invites"
  ON public.crm_event_invites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create event invites for their contacts"
  ON public.crm_event_invites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own event invites"
  ON public.crm_event_invites FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event invites"
  ON public.crm_event_invites FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER set_crm_event_invites_updated_at
  BEFORE UPDATE ON public.crm_event_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2) RPCs
-- ============================================

-- 2.1 Upsert event invite
CREATE OR REPLACE FUNCTION public.upsert_event_invite(
  _contact_id uuid,
  _event_id uuid,
  _next_followup_at timestamptz DEFAULT NULL,
  _source text DEFAULT 'crm_drawer'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _invite_id uuid;
BEGIN
  -- Validate user owns the contact
  IF NOT EXISTS (
    SELECT 1 FROM crm_contatos 
    WHERE id = _contact_id 
    AND criado_por = _user_id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Contact not found or not owned by user';
  END IF;

  -- Validate event exists and is upcoming
  IF NOT EXISTS (
    SELECT 1 FROM atividades 
    WHERE id = _event_id 
    AND status = 'publicada'
  ) THEN
    RAISE EXCEPTION 'Event not found or not published';
  END IF;

  -- Upsert invite
  INSERT INTO crm_event_invites (user_id, contact_id, event_id, next_followup_at, source)
  VALUES (_user_id, _contact_id, _event_id, COALESCE(_next_followup_at, now() + interval '2 days'), _source)
  ON CONFLICT (user_id, contact_id, event_id) DO UPDATE
  SET updated_at = now(),
      next_followup_at = COALESCE(_next_followup_at, crm_event_invites.next_followup_at)
  RETURNING id INTO _invite_id;

  RETURN _invite_id;
END;
$$;

-- 2.2 Set event invite status
CREATE OR REPLACE FUNCTION public.set_event_invite_status(
  _invite_id uuid,
  _status text,
  _next_followup_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _auto_followup timestamptz;
BEGIN
  -- Validate ownership
  IF NOT EXISTS (
    SELECT 1 FROM crm_event_invites 
    WHERE id = _invite_id 
    AND user_id = _user_id
  ) THEN
    RAISE EXCEPTION 'Invite not found or not owned by user';
  END IF;

  -- Validate status
  IF _status NOT IN ('invited', 'going', 'maybe', 'declined', 'no_answer', 'attended') THEN
    RAISE EXCEPTION 'Invalid status: %', _status;
  END IF;

  -- Calculate auto followup based on status if not provided
  IF _next_followup_at IS NULL THEN
    CASE _status
      WHEN 'going' THEN _auto_followup := now() + interval '12 hours'; -- Reminder
      WHEN 'maybe' THEN _auto_followup := now() + interval '1 day';
      WHEN 'invited' THEN _auto_followup := now() + interval '2 days';
      WHEN 'no_answer' THEN _auto_followup := now() + interval '2 days';
      ELSE _auto_followup := NULL;
    END CASE;
  ELSE
    _auto_followup := _next_followup_at;
  END IF;

  UPDATE crm_event_invites
  SET status = _status,
      next_followup_at = _auto_followup,
      updated_at = now()
  WHERE id = _invite_id;
END;
$$;

-- 2.3 Mark outreach (when WhatsApp opened or text copied)
CREATE OR REPLACE FUNCTION public.mark_event_outreach(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  UPDATE crm_event_invites
  SET last_outreach_at = now(),
      updated_at = now()
  WHERE id = _invite_id
    AND user_id = _user_id;
END;
$$;

-- 2.4 Get user's invites for a specific contact
CREATE OR REPLACE FUNCTION public.get_contact_event_invites(_contact_id uuid)
RETURNS TABLE (
  invite_id uuid,
  event_id uuid,
  event_title text,
  event_date timestamptz,
  event_location text,
  status text,
  last_outreach_at timestamptz,
  next_followup_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    ei.id as invite_id,
    ei.event_id,
    a.titulo as event_title,
    a.inicio_em as event_date,
    a.local_texto as event_location,
    ei.status,
    ei.last_outreach_at,
    ei.next_followup_at,
    ei.created_at
  FROM crm_event_invites ei
  JOIN atividades a ON a.id = ei.event_id
  WHERE ei.contact_id = _contact_id
    AND ei.user_id = _user_id
  ORDER BY a.inicio_em ASC;
END;
$$;

-- 2.5 Get upcoming events for picker (user's scope)
CREATE OR REPLACE FUNCTION public.get_upcoming_events_for_invite(_limit int DEFAULT 10)
RETURNS TABLE (
  event_id uuid,
  title text,
  event_date timestamptz,
  event_end timestamptz,
  location text,
  tipo text,
  city text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as event_id,
    a.titulo as title,
    a.inicio_em as event_date,
    a.fim_em as event_end,
    a.local_texto as location,
    a.tipo::text,
    a.cidade as city
  FROM atividades a
  WHERE a.status = 'publicada'
    AND a.inicio_em > now()
  ORDER BY a.inicio_em ASC
  LIMIT _limit;
END;
$$;

-- 2.6 Get metrics for coordinator/admin (aggregated, no PII)
CREATE OR REPLACE FUNCTION public.get_scope_event_invite_metrics(_days int DEFAULT 30)
RETURNS TABLE (
  event_id uuid,
  event_title text,
  event_date timestamptz,
  total_invited bigint,
  going bigint,
  maybe bigint,
  declined bigint,
  no_answer bigint,
  attended bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as event_id,
    a.titulo as event_title,
    a.inicio_em as event_date,
    COUNT(*)::bigint as total_invited,
    COUNT(*) FILTER (WHERE ei.status = 'going')::bigint as going,
    COUNT(*) FILTER (WHERE ei.status = 'maybe')::bigint as maybe,
    COUNT(*) FILTER (WHERE ei.status = 'declined')::bigint as declined,
    COUNT(*) FILTER (WHERE ei.status = 'no_answer')::bigint as no_answer,
    COUNT(*) FILTER (WHERE ei.status = 'attended')::bigint as attended
  FROM atividades a
  LEFT JOIN crm_event_invites ei ON ei.event_id = a.id
  WHERE a.inicio_em >= now() - (_days || ' days')::interval
    AND a.status IN ('publicada', 'concluida')
  GROUP BY a.id, a.titulo, a.inicio_em
  HAVING COUNT(ei.id) > 0
  ORDER BY a.inicio_em ASC
  LIMIT 20;
END;
$$;

-- 2.7 Get user's own invite summary per event
CREATE OR REPLACE FUNCTION public.get_my_event_invite_summary(_event_id uuid)
RETURNS TABLE (
  total_invited bigint,
  going bigint,
  maybe bigint,
  declined bigint,
  no_answer bigint,
  attended bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_invited,
    COUNT(*) FILTER (WHERE status = 'going')::bigint as going,
    COUNT(*) FILTER (WHERE status = 'maybe')::bigint as maybe,
    COUNT(*) FILTER (WHERE status = 'declined')::bigint as declined,
    COUNT(*) FILTER (WHERE status = 'no_answer')::bigint as no_answer,
    COUNT(*) FILTER (WHERE status = 'attended')::bigint as attended
  FROM crm_event_invites
  WHERE event_id = _event_id
    AND user_id = _user_id;
END;
$$;