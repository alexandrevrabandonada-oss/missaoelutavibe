-- Add assignee_id to crm_contatos for follow-up delegation (lighter than separate table)
ALTER TABLE public.crm_contatos 
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES auth.users(id);

-- Index for coordinator queries
CREATE INDEX IF NOT EXISTS idx_crm_contatos_assignee_id ON public.crm_contatos(assignee_id);

-- RPC to get coordinator inbox metrics (scoped by city/cell)
CREATE OR REPLACE FUNCTION public.get_coordinator_inbox_metrics(
  _scope_type TEXT DEFAULT 'all',
  _scope_cidade TEXT DEFAULT NULL,
  _scope_cell_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_coordinator BOOLEAN;
  v_result JSON;
  v_overdue_followups INT := 0;
  v_at_risk_volunteers INT := 0;
  v_stalled_missions INT := 0;
BEGIN
  -- Check authorization
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id 
    AND role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
    AND revoked_at IS NULL
  ) INTO v_is_coordinator;
  
  IF NOT v_is_coordinator THEN
    RETURN json_build_object('error', 'unauthorized');
  END IF;
  
  -- Count overdue follow-ups (proxima_acao_em < now, status not encerrado)
  SELECT COUNT(*) INTO v_overdue_followups
  FROM public.crm_contatos c
  WHERE c.proxima_acao_em < NOW()
    AND c.status NOT IN ('encerrado', 'convertido')
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND c.cidade = _scope_cidade)
      OR (_scope_type = 'celula' AND c.escopo_id = _scope_cell_id::TEXT)
    );
  
  -- Count at-risk volunteers (first_action done, but no bring+1 in 48h window expired)
  SELECT COUNT(*) INTO v_at_risk_volunteers
  FROM public.profiles p
  WHERE p.first_action_at IS NOT NULL
    AND p.first_action_at < NOW() - INTERVAL '48 hours'
    AND p.volunteer_status = 'ativo'
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles referred
      WHERE referred.referrer_user_id = p.id
        AND referred.first_action_at IS NOT NULL
    )
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND p.city = _scope_cidade)
      OR (_scope_type = 'celula' AND EXISTS (
        SELECT 1 FROM public.cell_memberships cm
        WHERE cm.user_id = p.id
        AND cm.cell_id = _scope_cell_id
        AND cm.is_active = TRUE
      ))
    );
  
  -- Count stalled missions (em_andamento > 2 days)
  SELECT COUNT(*) INTO v_stalled_missions
  FROM public.missions m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.status = 'em_andamento'
    AND m.accepted_at < NOW() - INTERVAL '2 days'
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND p.city = _scope_cidade)
      OR (_scope_type = 'celula' AND m.cell_id = _scope_cell_id)
    );
  
  v_result := json_build_object(
    'overdue_followups', v_overdue_followups,
    'at_risk_volunteers', v_at_risk_volunteers,
    'stalled_missions', v_stalled_missions
  );
  
  RETURN v_result;
END;
$$;

-- RPC to list overdue follow-ups for coordinators (with priority sorting)
CREATE OR REPLACE FUNCTION public.get_coordinator_overdue_followups(
  _scope_type TEXT DEFAULT 'all',
  _scope_cidade TEXT DEFAULT NULL,
  _scope_cell_id UUID DEFAULT NULL,
  _limit INT DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  nome_curto TEXT,
  bairro TEXT,
  cidade TEXT,
  whatsapp TEXT,
  status TEXT,
  scheduled_for TIMESTAMPTZ,
  kind TEXT,
  days_overdue INT,
  owner_name TEXT,
  owner_id UUID,
  assignee_id UUID,
  assignee_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_coordinator BOOLEAN;
BEGIN
  -- Check authorization
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id 
    AND role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
    AND revoked_at IS NULL
  ) INTO v_is_coordinator;
  
  IF NOT v_is_coordinator THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    SPLIT_PART(c.nome, ' ', 1) AS nome_curto,
    c.bairro,
    c.cidade,
    c.whatsapp,
    c.status::TEXT,
    c.proxima_acao_em AS scheduled_for,
    COALESCE(c.next_action_kind, 'followup') AS kind,
    EXTRACT(DAY FROM NOW() - c.proxima_acao_em)::INT AS days_overdue,
    op.full_name AS owner_name,
    c.criado_por AS owner_id,
    c.assignee_id,
    ap.full_name AS assignee_name
  FROM public.crm_contatos c
  LEFT JOIN public.profiles op ON op.id = c.criado_por
  LEFT JOIN public.profiles ap ON ap.id = c.assignee_id
  WHERE c.proxima_acao_em < NOW()
    AND c.status NOT IN ('encerrado', 'convertido')
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND c.cidade = _scope_cidade)
      OR (_scope_type = 'celula' AND c.escopo_id = _scope_cell_id::TEXT)
    )
  ORDER BY c.proxima_acao_em ASC
  LIMIT _limit;
END;
$$;

-- RPC to list at-risk volunteers
CREATE OR REPLACE FUNCTION public.get_coordinator_at_risk_volunteers(
  _scope_type TEXT DEFAULT 'all',
  _scope_cidade TEXT DEFAULT NULL,
  _scope_cell_id UUID DEFAULT NULL,
  _limit INT DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  city TEXT,
  whatsapp TEXT,
  first_action_at TIMESTAMPTZ,
  first_action_kind TEXT,
  hours_since_first_action INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_coordinator BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id 
    AND role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
    AND revoked_at IS NULL
  ) INTO v_is_coordinator;
  
  IF NOT v_is_coordinator THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.city,
    p.whatsapp,
    p.first_action_at,
    p.first_action_kind,
    EXTRACT(EPOCH FROM NOW() - p.first_action_at)::INT / 3600 AS hours_since_first_action
  FROM public.profiles p
  WHERE p.first_action_at IS NOT NULL
    AND p.first_action_at < NOW() - INTERVAL '48 hours'
    AND p.volunteer_status = 'ativo'
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles referred
      WHERE referred.referrer_user_id = p.id
        AND referred.first_action_at IS NOT NULL
    )
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND p.city = _scope_cidade)
      OR (_scope_type = 'celula' AND EXISTS (
        SELECT 1 FROM public.cell_memberships cm
        WHERE cm.user_id = p.id
        AND cm.cell_id = _scope_cell_id
        AND cm.is_active = TRUE
      ))
    )
  ORDER BY p.first_action_at ASC
  LIMIT _limit;
END;
$$;

-- RPC to list stalled missions
CREATE OR REPLACE FUNCTION public.get_coordinator_stalled_missions(
  _scope_type TEXT DEFAULT 'all',
  _scope_cidade TEXT DEFAULT NULL,
  _scope_cell_id UUID DEFAULT NULL,
  _limit INT DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  mission_type TEXT,
  volunteer_name TEXT,
  volunteer_id UUID,
  volunteer_whatsapp TEXT,
  accepted_at TIMESTAMPTZ,
  days_stalled INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_coordinator BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id 
    AND role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
    AND revoked_at IS NULL
  ) INTO v_is_coordinator;
  
  IF NOT v_is_coordinator THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    m.id,
    m.title,
    m.mission_type::TEXT,
    p.full_name AS volunteer_name,
    p.id AS volunteer_id,
    p.whatsapp AS volunteer_whatsapp,
    m.accepted_at,
    EXTRACT(DAY FROM NOW() - m.accepted_at)::INT AS days_stalled
  FROM public.missions m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.status = 'em_andamento'
    AND m.accepted_at < NOW() - INTERVAL '2 days'
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND p.city = _scope_cidade)
      OR (_scope_type = 'celula' AND m.cell_id = _scope_cell_id)
    )
  ORDER BY m.accepted_at ASC
  LIMIT _limit;
END;
$$;

-- RPC to assign follow-up to another volunteer
CREATE OR REPLACE FUNCTION public.assign_followup_to_volunteer(
  _contact_id UUID,
  _assignee_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_coordinator BOOLEAN;
  v_contact_cidade TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id 
    AND role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
    AND revoked_at IS NULL
  ) INTO v_is_coordinator;
  
  IF NOT v_is_coordinator THEN
    RETURN json_build_object('success', FALSE, 'error', 'unauthorized');
  END IF;
  
  SELECT cidade INTO v_contact_cidade FROM public.crm_contatos WHERE id = _contact_id;
  
  IF v_contact_cidade IS NULL THEN
    RETURN json_build_object('success', FALSE, 'error', 'contact_not_found');
  END IF;
  
  UPDATE public.crm_contatos
  SET assignee_id = _assignee_id,
      updated_at = NOW()
  WHERE id = _contact_id;
  
  RETURN json_build_object('success', TRUE);
END;
$$;

-- Drop existing constraint if exists (to allow any event type - simpler approach)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'growth_events_event_type_check'
    AND table_name = 'growth_events'
  ) THEN
    ALTER TABLE public.growth_events DROP CONSTRAINT growth_events_event_type_check;
  END IF;
END $$;

-- Add updated constraint including all known event types plus new coordinator ones
ALTER TABLE public.growth_events ADD CONSTRAINT growth_events_event_type_check
CHECK (event_type IN (
  'visit', 'visit_comecar', 'signup', 'approved', 'onboarding_complete',
  'invite_shared', 'invite_submit_mini', 'territory_link_open',
  'template_share', 'first_action', 'followup_whatsapp_opened',
  'coordinator_inbox_viewed', 'coordinator_whatsapp_opened', 'coordinator_followup_assigned'
));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_coordinator_inbox_metrics(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coordinator_overdue_followups(TEXT, TEXT, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coordinator_at_risk_volunteers(TEXT, TEXT, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_coordinator_stalled_missions(TEXT, TEXT, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_followup_to_volunteer(UUID, UUID) TO authenticated;