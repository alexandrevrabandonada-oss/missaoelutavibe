-- =====================================================
-- Post-Event Follow-ups v0
-- Adds automatic follow-up scheduling after event attendance
-- =====================================================

-- 1) Extend crm_event_invites with follow-up columns
ALTER TABLE public.crm_event_invites
ADD COLUMN IF NOT EXISTS post_followup_due_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS post_followup_done_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS post_followup_kind text NULL;

-- Add check constraint for allowlisted kinds
ALTER TABLE public.crm_event_invites
ADD CONSTRAINT crm_event_invites_post_followup_kind_check 
CHECK (post_followup_kind IS NULL OR post_followup_kind IN ('thank_you', 'qualify', 'ask_referral'));

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_crm_event_invites_event_followup 
ON public.crm_event_invites(event_id, post_followup_due_at) 
WHERE post_followup_due_at IS NOT NULL AND post_followup_done_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_event_invites_contact_followup 
ON public.crm_event_invites(contact_id, post_followup_due_at) 
WHERE post_followup_due_at IS NOT NULL AND post_followup_done_at IS NULL;

-- =====================================================
-- 2) RPC: Generate post-event follow-ups
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_post_event_followups(_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _invite RECORD;
  _contact RECORD;
  _kind text;
  _due_at timestamptz;
  _total int := 0;
  _thank_you int := 0;
  _qualify int := 0;
  _ask_referral int := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Set due time to 12 hours from now in São Paulo timezone
  _due_at := (now() AT TIME ZONE 'America/Sao_Paulo' + interval '12 hours') AT TIME ZONE 'America/Sao_Paulo';

  -- Process each attended invite without a scheduled follow-up
  FOR _invite IN
    SELECT ei.id, ei.contact_id
    FROM crm_event_invites ei
    WHERE ei.event_id = _event_id
      AND ei.user_id = _user_id
      AND ei.status = 'attended'
      AND ei.post_followup_done_at IS NULL
      AND ei.post_followup_due_at IS NULL
  LOOP
    -- Get contact's support level
    SELECT support_level INTO _contact
    FROM crm_contatos
    WHERE id = _invite.contact_id;

    -- Determine follow-up kind based on support level
    IF _contact.support_level IS NULL OR _contact.support_level IN ('unknown', 'no', 'undecided') THEN
      _kind := 'qualify';
      _qualify := _qualify + 1;
    ELSIF _contact.support_level IN ('yes', 'mobilizer') THEN
      _kind := 'ask_referral';
      _ask_referral := _ask_referral + 1;
    ELSE
      _kind := 'thank_you';
      _thank_you := _thank_you + 1;
    END IF;

    -- Update the invite with follow-up info
    UPDATE crm_event_invites
    SET 
      post_followup_due_at = _due_at,
      post_followup_kind = _kind,
      updated_at = now()
    WHERE id = _invite.id;

    -- Update contact's next action (only if not already more urgent)
    UPDATE crm_contatos
    SET 
      next_action_kind = 'event_followup',
      next_action_context = jsonb_build_object('event_id', _event_id, 'kind', _kind),
      proxima_acao_em = _due_at,
      updated_at = now()
    WHERE id = _invite.contact_id
      AND (
        next_action_kind IS NULL 
        OR proxima_acao_em IS NULL 
        OR proxima_acao_em > _due_at
      );

    _total := _total + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'scheduled_total', _total,
    'kind_breakdown', jsonb_build_object(
      'thank_you', _thank_you,
      'qualify', _qualify,
      'ask_referral', _ask_referral
    )
  );
END;
$$;

-- =====================================================
-- 3) RPC: Complete a post-event follow-up
-- =====================================================
CREATE OR REPLACE FUNCTION public.complete_post_event_followup(_event_id uuid, _contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _invite_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find and update the invite
  UPDATE crm_event_invites
  SET 
    post_followup_done_at = now(),
    updated_at = now()
  WHERE event_id = _event_id
    AND contact_id = _contact_id
    AND user_id = _user_id
    AND post_followup_done_at IS NULL
  RETURNING id INTO _invite_id;

  IF _invite_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  -- Clear contact's next_action if it matches this event
  UPDATE crm_contatos
  SET 
    next_action_kind = NULL,
    next_action_context = NULL,
    proxima_acao_em = NULL,
    updated_at = now()
  WHERE id = _contact_id
    AND next_action_kind = 'event_followup'
    AND (next_action_context->>'event_id')::uuid = _event_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =====================================================
-- 4) RPC: Get pending post-event follow-ups for current user
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_my_post_event_followups(_limit int DEFAULT 10)
RETURNS TABLE(
  invite_id uuid,
  event_id uuid,
  event_title text,
  contact_id uuid,
  contact_nome text,
  contact_cidade text,
  contact_bairro text,
  followup_kind text,
  due_at timestamptz,
  is_overdue boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    ei.id as invite_id,
    ei.event_id,
    a.titulo as event_title,
    ei.contact_id,
    c.nome as contact_nome,
    c.cidade as contact_cidade,
    c.bairro as contact_bairro,
    ei.post_followup_kind as followup_kind,
    ei.post_followup_due_at as due_at,
    ei.post_followup_due_at < now() as is_overdue
  FROM crm_event_invites ei
  JOIN crm_contatos c ON c.id = ei.contact_id
  JOIN atividades a ON a.id = ei.event_id
  WHERE ei.user_id = _user_id
    AND ei.post_followup_due_at IS NOT NULL
    AND ei.post_followup_done_at IS NULL
  ORDER BY ei.post_followup_due_at ASC
  LIMIT _limit;
END;
$$;

-- =====================================================
-- 5) RPC: Coordinator metrics (no PII)
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_scope_post_event_followup_metrics(_days int DEFAULT 14)
RETURNS TABLE(
  event_id uuid,
  event_title text,
  event_date timestamptz,
  attended_total bigint,
  followups_scheduled_total bigint,
  followups_done_total bigint,
  followups_overdue_total bigint
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
    COUNT(DISTINCT CASE WHEN ei.status = 'attended' THEN ei.id END) as attended_total,
    COUNT(DISTINCT CASE WHEN ei.post_followup_due_at IS NOT NULL THEN ei.id END) as followups_scheduled_total,
    COUNT(DISTINCT CASE WHEN ei.post_followup_done_at IS NOT NULL THEN ei.id END) as followups_done_total,
    COUNT(DISTINCT CASE WHEN ei.post_followup_due_at IS NOT NULL 
                        AND ei.post_followup_done_at IS NULL 
                        AND ei.post_followup_due_at < now() THEN ei.id END) as followups_overdue_total
  FROM atividades a
  LEFT JOIN crm_event_invites ei ON ei.event_id = a.id
  WHERE a.inicio_em >= now() - (_days || ' days')::interval
    AND a.inicio_em <= now()
  GROUP BY a.id, a.titulo, a.inicio_em
  ORDER BY a.inicio_em DESC;
END;
$$;