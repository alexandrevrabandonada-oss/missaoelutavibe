-- ==============================================
-- CADÊNCIA v1: Daily Check-in + Day Roadmap
-- ==============================================

-- Enum for focus type
CREATE TYPE public.checkin_foco_tipo AS ENUM ('task', 'mission', 'crm', 'agenda', 'none');

-- Enum for plan item status
CREATE TYPE public.plan_item_status AS ENUM ('sugerido', 'assumido', 'feito', 'ignorado');

-- A) daily_checkins table
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  escopo_tipo TEXT NOT NULL DEFAULT 'celula', -- 'celula' or 'cidade'
  escopo_id TEXT NOT NULL,
  disponibilidade INTEGER NOT NULL DEFAULT 30, -- minutes: 15, 30, 60, 120
  foco_tipo public.checkin_foco_tipo NOT NULL DEFAULT 'none',
  foco_id UUID,
  trava_texto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_checkins_user_day_unique UNIQUE (user_id, day)
);

-- Indexes for daily_checkins
CREATE INDEX idx_daily_checkins_day_scope ON public.daily_checkins (day, escopo_tipo, escopo_id);
CREATE INDEX idx_daily_checkins_user_id ON public.daily_checkins (user_id);

-- B) daily_plan_items table (persist roadmap)
CREATE TABLE public.daily_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID NOT NULL REFERENCES public.daily_checkins(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'task', 'crm', 'agenda', 'mission'
  ref_id UUID NOT NULL,
  status public.plan_item_status NOT NULL DEFAULT 'sugerido',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for daily_plan_items
CREATE INDEX idx_daily_plan_items_checkin ON public.daily_plan_items (checkin_id, tipo);

-- Enable RLS
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plan_items ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS Policies for daily_checkins
-- ==============================================

-- Users can view their own check-ins
CREATE POLICY "Users can view own checkins"
  ON public.daily_checkins FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own check-ins
CREATE POLICY "Users can create own checkins"
  ON public.daily_checkins FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_approved_volunteer(auth.uid()));

-- Users can update their own check-ins
CREATE POLICY "Users can update own checkins"
  ON public.daily_checkins FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Coordinators can view check-ins in scope (for aggregates/travas)
CREATE POLICY "Coordinators can view scoped checkins"
  ON public.daily_checkins FOR SELECT
  USING (
    is_coordinator(auth.uid()) AND (
      (escopo_tipo = 'cidade' AND escopo_id IN (SELECT cidade FROM get_managed_cities(auth.uid())))
      OR (escopo_tipo = 'celula' AND escopo_id::uuid IN (
        SELECT cell_id FROM cell_memberships WHERE user_id = auth.uid()
        UNION
        SELECT cell_id FROM user_roles WHERE user_id = auth.uid() AND role = 'coordenador_celula'
      ))
      OR has_role(auth.uid(), 'admin')
    )
  );

-- ==============================================
-- RLS Policies for daily_plan_items
-- ==============================================

-- Users can view their own plan items
CREATE POLICY "Users can view own plan items"
  ON public.daily_plan_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_checkins dc
      WHERE dc.id = daily_plan_items.checkin_id AND dc.user_id = auth.uid()
    )
  );

-- Users can create their own plan items
CREATE POLICY "Users can create own plan items"
  ON public.daily_plan_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_checkins dc
      WHERE dc.id = daily_plan_items.checkin_id AND dc.user_id = auth.uid()
    )
  );

-- Users can update their own plan items
CREATE POLICY "Users can update own plan items"
  ON public.daily_plan_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_checkins dc
      WHERE dc.id = daily_plan_items.checkin_id AND dc.user_id = auth.uid()
    )
  );

-- Coordinators can view plan items in scope
CREATE POLICY "Coordinators can view scoped plan items"
  ON public.daily_plan_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_checkins dc
      WHERE dc.id = daily_plan_items.checkin_id
      AND is_coordinator(auth.uid())
      AND (
        (dc.escopo_tipo = 'cidade' AND dc.escopo_id IN (SELECT cidade FROM get_managed_cities(auth.uid())))
        OR (dc.escopo_tipo = 'celula' AND dc.escopo_id::uuid IN (
          SELECT cell_id FROM cell_memberships WHERE user_id = auth.uid()
          UNION
          SELECT cell_id FROM user_roles WHERE user_id = auth.uid() AND role = 'coordenador_celula'
        ))
        OR has_role(auth.uid(), 'admin')
      )
    )
  );

-- ==============================================
-- RPC: Get daily suggestions (roadmap)
-- ==============================================

CREATE OR REPLACE FUNCTION public.get_daily_suggestions(_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSON;
  _task_suggestion JSON;
  _crm_suggestion JSON;
  _agenda_suggestion JSON;
  _mission_suggestion JSON;
BEGIN
  -- Get task suggestion: assigned to user, not done, prioritizing overdue/due soon, high priority
  SELECT json_build_object(
    'id', st.id,
    'titulo', st.titulo,
    'prioridade', st.prioridade,
    'prazo_em', st.prazo_em,
    'status', st.status,
    'squad_id', st.squad_id,
    'squad_nome', s.nome
  ) INTO _task_suggestion
  FROM squad_tasks st
  JOIN squads s ON s.id = st.squad_id
  WHERE st.assigned_to = _user_id
    AND st.status NOT IN ('feito')
  ORDER BY 
    CASE WHEN st.prazo_em IS NOT NULL AND st.prazo_em <= now() + interval '7 days' THEN 0 ELSE 1 END,
    CASE WHEN st.prioridade = 'alta' THEN 0 WHEN st.prioridade = 'media' THEN 1 ELSE 2 END,
    st.prazo_em NULLS LAST
  LIMIT 1;

  -- Get CRM suggestion: contact assigned to user with proxima_acao_em <= today
  SELECT json_build_object(
    'id', c.id,
    'nome', c.nome,
    'telefone', c.telefone,
    'proxima_acao_em', c.proxima_acao_em,
    'status', c.status
  ) INTO _crm_suggestion
  FROM crm_contatos c
  WHERE c.atribuido_a = _user_id
    AND c.proxima_acao_em IS NOT NULL
    AND c.proxima_acao_em::date <= CURRENT_DATE
    AND c.status NOT IN ('convertido', 'perdido')
  ORDER BY c.proxima_acao_em
  LIMIT 1;

  -- Get agenda suggestion: next published activity in 48h for user's cells/city
  SELECT json_build_object(
    'id', a.id,
    'titulo', a.titulo,
    'inicio_em', a.inicio_em,
    'local_texto', a.local_texto,
    'tipo', a.tipo
  ) INTO _agenda_suggestion
  FROM atividades a
  WHERE a.status = 'publicada'
    AND a.inicio_em >= now()
    AND a.inicio_em <= now() + interval '48 hours'
    AND (
      a.celula_id IN (SELECT cell_id FROM cell_memberships WHERE user_id = _user_id AND is_active = true)
      OR a.cidade IN (SELECT p.city FROM profiles p WHERE p.id = _user_id)
    )
  ORDER BY a.inicio_em
  LIMIT 1;

  -- Get mission suggestion: assigned to user or in user's cells, not completed
  SELECT json_build_object(
    'id', m.id,
    'title', m.title,
    'type', m.type,
    'deadline', m.deadline,
    'status', m.status
  ) INTO _mission_suggestion
  FROM missions m
  WHERE (m.assigned_to = _user_id OR m.cell_id IN (SELECT cell_id FROM cell_memberships WHERE user_id = _user_id AND is_active = true))
    AND m.status NOT IN ('concluida', 'cancelada')
  ORDER BY 
    CASE WHEN m.deadline IS NOT NULL AND m.deadline <= now() + interval '7 days' THEN 0 ELSE 1 END,
    m.deadline NULLS LAST
  LIMIT 1;

  _result := json_build_object(
    'task', _task_suggestion,
    'crm', _crm_suggestion,
    'agenda', _agenda_suggestion,
    'mission', _mission_suggestion,
    'generated_at', now()
  );

  RETURN _result;
END;
$$;

-- ==============================================
-- RPC: Get checkin metrics for ops
-- ==============================================

CREATE OR REPLACE FUNCTION public.get_checkin_metrics(
  _scope_type TEXT DEFAULT 'all',
  _scope_cidade TEXT DEFAULT NULL,
  _scope_celula_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSON;
  _today DATE := CURRENT_DATE;
  _checkins_hoje INTEGER;
  _com_foco_task INTEGER;
  _com_foco_crm INTEGER;
  _com_foco_mission INTEGER;
  _com_foco_agenda INTEGER;
  _travas_hoje INTEGER;
BEGIN
  -- Count check-ins today
  SELECT COUNT(*) INTO _checkins_hoje
  FROM daily_checkins dc
  WHERE dc.day = _today
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND dc.escopo_tipo = 'cidade' AND dc.escopo_id = _scope_cidade)
      OR (_scope_type = 'celula' AND dc.escopo_tipo = 'celula' AND dc.escopo_id = _scope_celula_id::text)
    );

  -- Count by focus type
  SELECT 
    COUNT(*) FILTER (WHERE foco_tipo = 'task'),
    COUNT(*) FILTER (WHERE foco_tipo = 'crm'),
    COUNT(*) FILTER (WHERE foco_tipo = 'mission'),
    COUNT(*) FILTER (WHERE foco_tipo = 'agenda'),
    COUNT(*) FILTER (WHERE trava_texto IS NOT NULL AND trava_texto != '')
  INTO _com_foco_task, _com_foco_crm, _com_foco_mission, _com_foco_agenda, _travas_hoje
  FROM daily_checkins dc
  WHERE dc.day = _today
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND dc.escopo_tipo = 'cidade' AND dc.escopo_id = _scope_cidade)
      OR (_scope_type = 'celula' AND dc.escopo_tipo = 'celula' AND dc.escopo_id = _scope_celula_id::text)
    );

  _result := json_build_object(
    'checkins_hoje', _checkins_hoje,
    'com_foco_task', _com_foco_task,
    'com_foco_crm', _com_foco_crm,
    'com_foco_mission', _com_foco_mission,
    'com_foco_agenda', _com_foco_agenda,
    'travas_hoje', _travas_hoje,
    'date', _today
  );

  RETURN _result;
END;
$$;

-- ==============================================
-- Trigger: Notify coord on trava
-- ==============================================

CREATE OR REPLACE FUNCTION public.notify_coord_on_trava()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _coord_id UUID;
  _user_name TEXT;
BEGIN
  -- Only notify on new trava or updated trava
  IF NEW.trava_texto IS NOT NULL AND NEW.trava_texto != '' AND (OLD IS NULL OR OLD.trava_texto IS DISTINCT FROM NEW.trava_texto) THEN
    -- Get user name
    SELECT full_name INTO _user_name FROM profiles WHERE id = NEW.user_id;
    
    -- Get coordinator for scope
    IF NEW.escopo_tipo = 'celula' THEN
      SELECT ur.user_id INTO _coord_id
      FROM user_roles ur
      WHERE ur.role = 'coordenador_celula' 
        AND ur.cell_id = NEW.escopo_id::uuid
        AND ur.revoked_at IS NULL
      LIMIT 1;
    ELSIF NEW.escopo_tipo = 'cidade' THEN
      SELECT ur.user_id INTO _coord_id
      FROM user_roles ur
      WHERE ur.role IN ('coordenador_regional', 'coordenador_estadual', 'admin')
        AND ur.cidade = NEW.escopo_id
        AND ur.revoked_at IS NULL
      LIMIT 1;
    END IF;
    
    -- Create notification if coordinator found
    IF _coord_id IS NOT NULL THEN
      INSERT INTO notificacoes (user_id, tipo, titulo, corpo, href)
      VALUES (
        _coord_id,
        'trava_checkin',
        'Bloqueio reportado',
        COALESCE(_user_name, 'Voluntário') || ' reportou um bloqueio: ' || LEFT(NEW.trava_texto, 100),
        '/admin/hoje'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_coord_on_trava
  AFTER INSERT OR UPDATE ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_coord_on_trava();

-- ==============================================
-- Audit trigger for check-ins
-- ==============================================

CREATE OR REPLACE FUNCTION public.audit_checkin_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_data)
    VALUES (NEW.user_id, 'daily_checkin', NEW.id, 'checkin_created', 
      jsonb_build_object('day', NEW.day, 'foco_tipo', NEW.foco_tipo, 'disponibilidade', NEW.disponibilidade, 'has_trava', NEW.trava_texto IS NOT NULL));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, old_data, new_data)
    VALUES (NEW.user_id, 'daily_checkin', NEW.id, 'checkin_updated',
      jsonb_build_object('foco_tipo', OLD.foco_tipo, 'disponibilidade', OLD.disponibilidade),
      jsonb_build_object('foco_tipo', NEW.foco_tipo, 'disponibilidade', NEW.disponibilidade, 'has_trava', NEW.trava_texto IS NOT NULL));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_checkin
  AFTER INSERT OR UPDATE ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_checkin_changes();