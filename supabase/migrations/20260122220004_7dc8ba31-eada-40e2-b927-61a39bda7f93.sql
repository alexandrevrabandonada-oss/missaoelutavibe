-- =============================================
-- BANCO DE TALENTOS v0 - Skills, Chamados, Candidaturas
-- =============================================

-- 1. Create enum for skill levels
CREATE TYPE public.skill_nivel AS ENUM ('iniciante', 'intermediario', 'avancado');

-- 2. Create enum for chamado urgency
CREATE TYPE public.chamado_urgencia AS ENUM ('baixa', 'media', 'alta');

-- 3. Create enum for chamado status
CREATE TYPE public.chamado_status AS ENUM ('aberto', 'em_andamento', 'fechado');

-- 4. Create enum for candidatura status
CREATE TYPE public.candidatura_status AS ENUM ('pendente', 'aceito', 'recusado', 'cancelado');

-- 5. Create enum for chamado scope type
CREATE TYPE public.chamado_escopo_tipo AS ENUM ('celula', 'cidade');

-- =============================================
-- TABLE: perfil_skills
-- =============================================
CREATE TABLE public.perfil_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill TEXT NOT NULL,
  nivel skill_nivel DEFAULT 'iniciante',
  disponibilidade_horas INTEGER DEFAULT NULL,
  disponibilidade_tags TEXT[] DEFAULT '{}',
  portfolio_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT perfil_skills_user_skill_unique UNIQUE (user_id, skill)
);

-- Enable RLS
ALTER TABLE public.perfil_skills ENABLE ROW LEVEL SECURITY;

-- Index for skill search
CREATE INDEX idx_perfil_skills_skill ON public.perfil_skills (skill);
CREATE INDEX idx_perfil_skills_user_id ON public.perfil_skills (user_id);

-- RLS Policies for perfil_skills
-- Volunteers: CRUD only their own
CREATE POLICY "Users can view own skills"
  ON public.perfil_skills FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own skills"
  ON public.perfil_skills FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_approved_volunteer(auth.uid()));

CREATE POLICY "Users can update own skills"
  ON public.perfil_skills FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own skills"
  ON public.perfil_skills FOR DELETE
  USING (user_id = auth.uid());

-- Coordinators: SELECT skills in their scope (for matching)
CREATE POLICY "Coordinators can view skills for matching"
  ON public.perfil_skills FOR SELECT
  USING (is_coordinator(auth.uid()));

-- =============================================
-- TABLE: chamados_talentos
-- =============================================
CREATE TABLE public.chamados_talentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo_tipo chamado_escopo_tipo NOT NULL,
  escopo_id UUID NOT NULL, -- cell_id or cidade lookup
  escopo_cidade TEXT DEFAULT NULL, -- denormalized for city scope
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  skills_requeridas TEXT[] NOT NULL DEFAULT '{}',
  urgencia chamado_urgencia NOT NULL DEFAULT 'media',
  status chamado_status NOT NULL DEFAULT 'aberto',
  created_by UUID NOT NULL,
  mural_post_id UUID DEFAULT NULL,
  mission_id UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chamados_talentos ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_chamados_escopo ON public.chamados_talentos (escopo_tipo, escopo_id, status);
CREATE INDEX idx_chamados_skills ON public.chamados_talentos USING GIN (skills_requeridas);
CREATE INDEX idx_chamados_status ON public.chamados_talentos (status);

-- Helper function to check if user can manage a chamado based on scope
CREATE OR REPLACE FUNCTION public.can_manage_chamado(_user_id UUID, _escopo_tipo chamado_escopo_tipo, _escopo_id UUID, _escopo_cidade TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_admin(_user_id) OR
    (
      _escopo_tipo = 'celula' AND 
      (can_moderate_cell(_user_id, _escopo_id) OR 
       EXISTS (SELECT 1 FROM cells c WHERE c.id = _escopo_id AND can_manage_cidade(_user_id, c.city)))
    ) OR
    (_escopo_tipo = 'cidade' AND _escopo_cidade IS NOT NULL AND can_manage_cidade(_user_id, _escopo_cidade))
$$;

-- Helper function to check if volunteer can view a chamado
CREATE OR REPLACE FUNCTION public.can_view_chamado(_user_id UUID, _escopo_tipo chamado_escopo_tipo, _escopo_id UUID, _escopo_cidade TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_coordinator(_user_id) OR
    (
      is_approved_volunteer(_user_id) AND (
        (_escopo_tipo = 'celula' AND is_cell_member(_user_id, _escopo_id)) OR
        (_escopo_tipo = 'cidade' AND _escopo_cidade IS NOT NULL AND EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = _user_id AND p.city = _escopo_cidade
        ))
      )
    )
$$;

-- RLS Policies for chamados_talentos
-- Coordinators: CRUD in their scope
CREATE POLICY "Coordinators can view chamados in scope"
  ON public.chamados_talentos FOR SELECT
  USING (can_manage_chamado(auth.uid(), escopo_tipo, escopo_id, escopo_cidade));

CREATE POLICY "Coordinators can create chamados in scope"
  ON public.chamados_talentos FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    is_coordinator(auth.uid()) AND
    can_manage_chamado(auth.uid(), escopo_tipo, escopo_id, escopo_cidade)
  );

CREATE POLICY "Coordinators can update chamados in scope"
  ON public.chamados_talentos FOR UPDATE
  USING (can_manage_chamado(auth.uid(), escopo_tipo, escopo_id, escopo_cidade));

CREATE POLICY "Admins can delete chamados"
  ON public.chamados_talentos FOR DELETE
  USING (is_admin(auth.uid()));

-- Volunteers: SELECT open chamados in their territory
CREATE POLICY "Volunteers can view open chamados in territory"
  ON public.chamados_talentos FOR SELECT
  USING (
    status = 'aberto' AND
    can_view_chamado(auth.uid(), escopo_tipo, escopo_id, escopo_cidade)
  );

-- =============================================
-- TABLE: candidaturas_chamados
-- =============================================
CREATE TABLE public.candidaturas_chamados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chamado_id UUID NOT NULL REFERENCES chamados_talentos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  mensagem TEXT DEFAULT NULL,
  status candidatura_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT candidaturas_unique UNIQUE (chamado_id, user_id)
);

-- Enable RLS
ALTER TABLE public.candidaturas_chamados ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_candidaturas_chamado ON public.candidaturas_chamados (chamado_id, status);
CREATE INDEX idx_candidaturas_user ON public.candidaturas_chamados (user_id);

-- RLS Policies for candidaturas_chamados
-- Volunteers: manage only their own candidaturas
CREATE POLICY "Users can view own candidaturas"
  ON public.candidaturas_chamados FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create candidatura"
  ON public.candidaturas_chamados FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    is_approved_volunteer(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM chamados_talentos c
      WHERE c.id = chamado_id 
        AND c.status = 'aberto'
        AND can_view_chamado(auth.uid(), c.escopo_tipo, c.escopo_id, c.escopo_cidade)
    )
  );

CREATE POLICY "Users can update own candidatura"
  ON public.candidaturas_chamados FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel own candidatura"
  ON public.candidaturas_chamados FOR DELETE
  USING (user_id = auth.uid());

-- Coordinators: view and manage candidaturas for chamados in scope
CREATE POLICY "Coordinators can view candidaturas in scope"
  ON public.candidaturas_chamados FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chamados_talentos c
      WHERE c.id = chamado_id
        AND can_manage_chamado(auth.uid(), c.escopo_tipo, c.escopo_id, c.escopo_cidade)
    )
  );

CREATE POLICY "Coordinators can update candidatura status"
  ON public.candidaturas_chamados FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chamados_talentos c
      WHERE c.id = chamado_id
        AND can_manage_chamado(auth.uid(), c.escopo_tipo, c.escopo_id, c.escopo_cidade)
    )
  );

-- =============================================
-- TRIGGERS: updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_perfil_skills_updated_at ON public.perfil_skills;
CREATE TRIGGER update_perfil_skills_updated_at
  BEFORE UPDATE ON public.perfil_skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chamados_updated_at ON public.chamados_talentos;
CREATE TRIGGER update_chamados_updated_at
  BEFORE UPDATE ON public.chamados_talentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_candidaturas_updated_at ON public.candidaturas_chamados;
CREATE TRIGGER update_candidaturas_updated_at
  BEFORE UPDATE ON public.candidaturas_chamados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- AUDIT: Log candidatura status changes
-- =============================================
CREATE OR REPLACE FUNCTION public.audit_candidatura_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (entity_type, entity_id, action, user_id, old_data, new_data)
    VALUES (
      'candidatura_chamado',
      NEW.id,
      'status_change',
      auth.uid(),
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_candidatura_changes ON public.candidaturas_chamados;
CREATE TRIGGER audit_candidatura_changes
  AFTER UPDATE ON public.candidaturas_chamados
  FOR EACH ROW EXECUTE FUNCTION public.audit_candidatura_status_change();