-- =============================================
-- SQUADS + TASKS v0
-- =============================================

-- Enum for squad status
CREATE TYPE squad_status AS ENUM ('ativo', 'pausado', 'encerrado');

-- Enum for squad member role
CREATE TYPE squad_membro_papel AS ENUM ('membro', 'lider', 'apoio');

-- Enum for task status
CREATE TYPE squad_task_status AS ENUM ('a_fazer', 'fazendo', 'feito', 'bloqueado');

-- Enum for task priority
CREATE TYPE squad_task_prioridade AS ENUM ('baixa', 'media', 'alta');

-- Enum for task update type
CREATE TYPE squad_task_update_tipo AS ENUM ('comentario', 'evidencia', 'status', 'bloqueio');

-- =============================================
-- TABLE: squads
-- =============================================
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escopo_tipo TEXT NOT NULL CHECK (escopo_tipo IN ('celula', 'cidade')),
  escopo_id UUID NOT NULL,
  escopo_cidade TEXT,
  nome TEXT NOT NULL,
  objetivo TEXT,
  lider_user_id UUID NOT NULL,
  status squad_status NOT NULL DEFAULT 'ativo',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_squads_escopo_status ON public.squads(escopo_tipo, escopo_id, status);
CREATE INDEX idx_squads_lider ON public.squads(lider_user_id);

-- =============================================
-- TABLE: squad_members
-- =============================================
CREATE TABLE public.squad_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  papel squad_membro_papel NOT NULL DEFAULT 'membro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(squad_id, user_id)
);

CREATE INDEX idx_squad_members_user ON public.squad_members(user_id);

-- =============================================
-- TABLE: squad_tasks
-- =============================================
CREATE TABLE public.squad_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status squad_task_status NOT NULL DEFAULT 'a_fazer',
  prioridade squad_task_prioridade NOT NULL DEFAULT 'media',
  prazo_em TIMESTAMPTZ,
  assigned_to UUID,
  ligado_chamado_id UUID REFERENCES public.chamados_talentos(id) ON DELETE SET NULL,
  ligado_missao_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  ligado_atividade_id UUID REFERENCES public.atividades(id) ON DELETE SET NULL,
  mural_post_id UUID REFERENCES public.mural_posts(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_squad_tasks_squad_status ON public.squad_tasks(squad_id, status);
CREATE INDEX idx_squad_tasks_assigned ON public.squad_tasks(assigned_to);
CREATE INDEX idx_squad_tasks_prazo ON public.squad_tasks(prazo_em);
CREATE INDEX idx_squad_tasks_chamado ON public.squad_tasks(ligado_chamado_id);

-- =============================================
-- TABLE: squad_task_updates
-- =============================================
CREATE TABLE public.squad_task_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.squad_tasks(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL,
  tipo squad_task_update_tipo NOT NULL DEFAULT 'comentario',
  texto TEXT,
  anexo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_squad_task_updates_task ON public.squad_task_updates(task_id, created_at DESC);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Check if user is a member of a squad
CREATE OR REPLACE FUNCTION is_squad_member(_user_id UUID, _squad_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM squad_members
    WHERE squad_id = _squad_id AND user_id = _user_id
  );
$$;

-- Check if user is a leader of a squad
CREATE OR REPLACE FUNCTION is_squad_leader(_user_id UUID, _squad_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM squad_members
    WHERE squad_id = _squad_id AND user_id = _user_id AND papel = 'lider'
  ) OR EXISTS (
    SELECT 1 FROM squads
    WHERE id = _squad_id AND lider_user_id = _user_id
  );
$$;

-- Check if user can manage squad (leader, coordinator, or admin)
CREATE OR REPLACE FUNCTION can_manage_squad(_user_id UUID, _squad_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_squad_leader(_user_id, _squad_id)
    OR is_coordinator(_user_id)
    OR is_admin(_user_id);
$$;

-- Check if user can view squad based on scope
CREATE OR REPLACE FUNCTION can_view_squad(_user_id UUID, _escopo_tipo TEXT, _escopo_id UUID, _escopo_cidade TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _escopo_tipo = 'celula' THEN is_cell_member(_user_id, _escopo_id)
    WHEN _escopo_tipo = 'cidade' THEN (
      SELECT p.city = _escopo_cidade FROM profiles p WHERE p.id = _user_id
    )
    ELSE false
  END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_task_updates ENABLE ROW LEVEL SECURITY;

-- SQUADS RLS
CREATE POLICY "Members can view their squads"
  ON public.squads FOR SELECT
  USING (
    is_squad_member(auth.uid(), id)
    OR is_coordinator(auth.uid())
  );

CREATE POLICY "Coordinators can create squads"
  ON public.squads FOR INSERT
  WITH CHECK (
    is_coordinator(auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Leaders and coordinators can update squads"
  ON public.squads FOR UPDATE
  USING (can_manage_squad(auth.uid(), id));

CREATE POLICY "Admins can delete squads"
  ON public.squads FOR DELETE
  USING (is_admin(auth.uid()));

-- SQUAD_MEMBERS RLS
CREATE POLICY "Members can view squad members"
  ON public.squad_members FOR SELECT
  USING (
    is_squad_member(auth.uid(), squad_id)
    OR is_coordinator(auth.uid())
  );

CREATE POLICY "Leaders can manage squad members"
  ON public.squad_members FOR INSERT
  WITH CHECK (can_manage_squad(auth.uid(), squad_id));

CREATE POLICY "Leaders can update squad members"
  ON public.squad_members FOR UPDATE
  USING (can_manage_squad(auth.uid(), squad_id));

CREATE POLICY "Leaders can remove squad members"
  ON public.squad_members FOR DELETE
  USING (can_manage_squad(auth.uid(), squad_id));

-- SQUAD_TASKS RLS
CREATE POLICY "Members can view squad tasks"
  ON public.squad_tasks FOR SELECT
  USING (
    is_squad_member(auth.uid(), squad_id)
    OR is_coordinator(auth.uid())
  );

CREATE POLICY "Leaders can create tasks"
  ON public.squad_tasks FOR INSERT
  WITH CHECK (
    can_manage_squad(auth.uid(), squad_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Assigned users and leaders can update tasks"
  ON public.squad_tasks FOR UPDATE
  USING (
    assigned_to = auth.uid()
    OR can_manage_squad(auth.uid(), squad_id)
  );

CREATE POLICY "Leaders can delete tasks"
  ON public.squad_tasks FOR DELETE
  USING (can_manage_squad(auth.uid(), squad_id));

-- SQUAD_TASK_UPDATES RLS
CREATE POLICY "Members can view task updates"
  ON public.squad_task_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_tasks t
      WHERE t.id = task_id
      AND (is_squad_member(auth.uid(), t.squad_id) OR is_coordinator(auth.uid()))
    )
  );

CREATE POLICY "Members can create task updates"
  ON public.squad_task_updates FOR INSERT
  WITH CHECK (
    author_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM squad_tasks t
      WHERE t.id = task_id
      AND is_squad_member(auth.uid(), t.squad_id)
    )
  );

-- =============================================
-- AUDIT TRIGGERS
-- =============================================

-- Audit trigger for squads
CREATE OR REPLACE FUNCTION audit_squad_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
    VALUES (auth.uid(), 'squad_created', 'squad', NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (auth.uid(), 'squad_status_changed', 'squad', NEW.id, 
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tr_audit_squads
  AFTER INSERT OR UPDATE ON public.squads
  FOR EACH ROW EXECUTE FUNCTION audit_squad_changes();

-- Audit trigger for squad tasks
CREATE OR REPLACE FUNCTION audit_squad_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
    VALUES (auth.uid(), 'squad_task_created', 'squad_task', NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
      VALUES (auth.uid(), 'squad_task_status_changed', 'squad_task', NEW.id,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status));
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tr_audit_squad_tasks
  AFTER INSERT OR UPDATE ON public.squad_tasks
  FOR EACH ROW EXECUTE FUNCTION audit_squad_task_changes();

-- Audit trigger for squad members (track when members are added)
CREATE OR REPLACE FUNCTION audit_squad_member_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
    VALUES (auth.uid(), 'squad_member_added', 'squad_member', NEW.id,
      jsonb_build_object('squad_id', NEW.squad_id, 'user_id', NEW.user_id, 'papel', NEW.papel));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data)
    VALUES (auth.uid(), 'squad_member_removed', 'squad_member', OLD.id,
      jsonb_build_object('squad_id', OLD.squad_id, 'user_id', OLD.user_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tr_audit_squad_members
  AFTER INSERT OR DELETE ON public.squad_members
  FOR EACH ROW EXECUTE FUNCTION audit_squad_member_changes();

-- =============================================
-- OPS METRICS RPC
-- =============================================

CREATE OR REPLACE FUNCTION get_squad_metrics(_scope_type TEXT DEFAULT 'all', _scope_cidade TEXT DEFAULT NULL, _scope_celula_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT is_coordinator(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'squads_ativos', (
      SELECT COUNT(*) FROM squads s
      WHERE s.status = 'ativo'
      AND (
        _scope_type = 'all'
        OR (_scope_type = 'cidade' AND s.escopo_cidade = _scope_cidade)
        OR (_scope_type = 'celula' AND s.escopo_tipo = 'celula' AND s.escopo_id = _scope_celula_id)
      )
    ),
    'tarefas_abertas', (
      SELECT COUNT(*) FROM squad_tasks t
      JOIN squads s ON s.id = t.squad_id
      WHERE t.status IN ('a_fazer', 'fazendo')
      AND s.status = 'ativo'
      AND (
        _scope_type = 'all'
        OR (_scope_type = 'cidade' AND s.escopo_cidade = _scope_cidade)
        OR (_scope_type = 'celula' AND s.escopo_tipo = 'celula' AND s.escopo_id = _scope_celula_id)
      )
    ),
    'tarefas_bloqueadas', (
      SELECT COUNT(*) FROM squad_tasks t
      JOIN squads s ON s.id = t.squad_id
      WHERE t.status = 'bloqueado'
      AND s.status = 'ativo'
      AND (
        _scope_type = 'all'
        OR (_scope_type = 'cidade' AND s.escopo_cidade = _scope_cidade)
        OR (_scope_type = 'celula' AND s.escopo_tipo = 'celula' AND s.escopo_id = _scope_celula_id)
      )
    ),
    'tarefas_vencendo_7d', (
      SELECT COUNT(*) FROM squad_tasks t
      JOIN squads s ON s.id = t.squad_id
      WHERE t.status IN ('a_fazer', 'fazendo')
      AND t.prazo_em IS NOT NULL
      AND t.prazo_em <= now() + interval '7 days'
      AND t.prazo_em > now()
      AND s.status = 'ativo'
      AND (
        _scope_type = 'all'
        OR (_scope_type = 'cidade' AND s.escopo_cidade = _scope_cidade)
        OR (_scope_type = 'celula' AND s.escopo_tipo = 'celula' AND s.escopo_id = _scope_celula_id)
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- =============================================
-- FUNCTION: Accept candidatura and create task
-- =============================================

CREATE OR REPLACE FUNCTION accept_candidatura_create_task(
  _candidatura_id UUID,
  _squad_id UUID,
  _task_titulo TEXT,
  _task_prioridade squad_task_prioridade DEFAULT 'media',
  _task_prazo TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidatura RECORD;
  v_chamado RECORD;
  v_task_id UUID;
  v_member_exists BOOLEAN;
BEGIN
  -- Get candidatura info
  SELECT * INTO v_candidatura FROM candidaturas_chamados WHERE id = _candidatura_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidatura not found';
  END IF;

  -- Get chamado info
  SELECT * INTO v_chamado FROM chamados_talentos WHERE id = v_candidatura.chamado_id;
  
  -- Check if user can manage this chamado
  IF NOT can_manage_chamado(auth.uid(), v_chamado.escopo_tipo, v_chamado.escopo_id, v_chamado.escopo_cidade) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update candidatura status
  UPDATE candidaturas_chamados
  SET status = 'aceito', updated_at = now()
  WHERE id = _candidatura_id;

  -- Add user to squad if not already a member
  SELECT EXISTS (
    SELECT 1 FROM squad_members WHERE squad_id = _squad_id AND user_id = v_candidatura.user_id
  ) INTO v_member_exists;

  IF NOT v_member_exists THEN
    INSERT INTO squad_members (squad_id, user_id, papel)
    VALUES (_squad_id, v_candidatura.user_id, 'membro');
  END IF;

  -- Create task
  INSERT INTO squad_tasks (
    squad_id, titulo, status, prioridade, prazo_em, 
    assigned_to, ligado_chamado_id, created_by
  )
  VALUES (
    _squad_id, _task_titulo, 'a_fazer', _task_prioridade, _task_prazo,
    v_candidatura.user_id, v_chamado.id, auth.uid()
  )
  RETURNING id INTO v_task_id;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (auth.uid(), 'candidatura_accepted_task_created', 'candidatura', _candidatura_id,
    jsonb_build_object(
      'candidatura_id', _candidatura_id,
      'task_id', v_task_id,
      'squad_id', _squad_id,
      'volunteer_user_id', v_candidatura.user_id
    ));

  RETURN json_build_object(
    'success', true,
    'task_id', v_task_id,
    'member_added', NOT v_member_exists
  );
END;
$$;