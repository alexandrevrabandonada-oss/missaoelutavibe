
-- =====================================================
-- AGENDA v0 - Atividades com RSVP e escopo
-- =====================================================

-- 1. Create enum types for activities
CREATE TYPE public.atividade_tipo AS ENUM (
  'reuniao',
  'panfletagem',
  'visita',
  'mutirao',
  'plenaria',
  'formacao_presencial',
  'ato',
  'outro'
);

CREATE TYPE public.atividade_status AS ENUM (
  'rascunho',
  'publicada',
  'cancelada',
  'concluida'
);

CREATE TYPE public.rsvp_status AS ENUM (
  'vou',
  'talvez',
  'nao_vou'
);

-- 2. Create atividades table (same scope pattern as ciclos_semanais)
CREATE TABLE public.atividades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  tipo public.atividade_tipo NOT NULL DEFAULT 'outro',
  status public.atividade_status NOT NULL DEFAULT 'rascunho',
  -- Scope: same pattern as ciclos_semanais (cidade + celula_id, both null = global)
  cidade TEXT,
  celula_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
  -- Weekly cycle link
  ciclo_id UUID REFERENCES public.ciclos_semanais(id) ON DELETE SET NULL,
  -- Timing
  inicio_em TIMESTAMP WITH TIME ZONE NOT NULL,
  fim_em TIMESTAMP WITH TIME ZONE,
  -- Details
  local_texto TEXT,
  descricao TEXT,
  -- Responsible user
  responsavel_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_atividades_scope_inicio ON public.atividades (cidade, celula_id, inicio_em);
CREATE INDEX idx_atividades_ciclo ON public.atividades (ciclo_id);
CREATE INDEX idx_atividades_inicio ON public.atividades (inicio_em);
CREATE INDEX idx_atividades_status ON public.atividades (status);

-- 3. Create atividade_rsvp table
CREATE TABLE public.atividade_rsvp (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.rsvp_status NOT NULL DEFAULT 'vou',
  checkin_em TIMESTAMP WITH TIME ZONE, -- For v1 future use
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_rsvp_per_user UNIQUE (atividade_id, user_id)
);

-- Enable RLS
ALTER TABLE public.atividade_rsvp ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_rsvp_user ON public.atividade_rsvp (user_id);
CREATE INDEX idx_rsvp_atividade ON public.atividade_rsvp (atividade_id);

-- 4. Helper function to check if user can view atividade (scope-based)
CREATE OR REPLACE FUNCTION public.can_view_atividade(
  _user_id uuid,
  _atividade_cidade text,
  _atividade_celula_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Global activities (no scope) visible to all approved volunteers
    (_atividade_cidade IS NULL AND _atividade_celula_id IS NULL)
    -- City-scoped: user is from that city
    OR (
      _atividade_cidade IS NOT NULL 
      AND _atividade_celula_id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = _user_id AND p.city = _atividade_cidade
      )
    )
    -- Cell-scoped: user is a member of that cell
    OR (
      _atividade_celula_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.cell_memberships cm 
        WHERE cm.user_id = _user_id AND cm.cell_id = _atividade_celula_id
      )
    )
    -- Or user is in the same city as the cell
    OR (
      _atividade_celula_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.cells c ON c.city = p.city
        WHERE p.id = _user_id AND c.id = _atividade_celula_id
      )
    )
$$;

-- 5. Helper function to check if coordinator can manage atividade scope
CREATE OR REPLACE FUNCTION public.can_manage_atividade_scope(
  _user_id uuid,
  _target_cidade text,
  _target_celula_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins can manage everything
    is_admin(_user_id)
    -- Global scope: any coordinator can create
    OR (
      _target_cidade IS NULL AND _target_celula_id IS NULL 
      AND is_coordinator(_user_id)
    )
    -- City scope: must be able to manage that city
    OR (
      _target_cidade IS NOT NULL 
      AND can_manage_cidade(_user_id, _target_cidade)
    )
    -- Cell scope: must be cell moderator/coordinator
    OR (
      _target_celula_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.revoked_at IS NULL
          AND (
            ur.role IN ('admin', 'coordenador_estadual')
            OR ur.cell_id = _target_celula_id
          )
      )
    )
$$;

-- 6. RLS Policies for atividades

-- Volunteers: SELECT only published activities in their territory
CREATE POLICY "Volunteers can view published activities in scope"
ON public.atividades
FOR SELECT
USING (
  status = 'publicada'
  AND is_approved_volunteer(auth.uid())
  AND can_view_atividade(auth.uid(), cidade, celula_id)
);

-- Coordinators: SELECT all in their scope
CREATE POLICY "Coordinators can view all activities in scope"
ON public.atividades
FOR SELECT
USING (
  is_coordinator(auth.uid())
  AND can_manage_atividade_scope(auth.uid(), cidade, celula_id)
);

-- Coordinators: INSERT in their scope
CREATE POLICY "Coordinators can create activities in scope"
ON public.atividades
FOR INSERT
WITH CHECK (
  is_coordinator(auth.uid())
  AND created_by = auth.uid()
  AND can_manage_atividade_scope(auth.uid(), cidade, celula_id)
);

-- Coordinators: UPDATE in their scope
CREATE POLICY "Coordinators can update activities in scope"
ON public.atividades
FOR UPDATE
USING (
  is_coordinator(auth.uid())
  AND can_manage_atividade_scope(auth.uid(), cidade, celula_id)
);

-- Admins: DELETE
CREATE POLICY "Admins can delete activities"
ON public.atividades
FOR DELETE
USING (is_admin(auth.uid()));

-- 7. RLS Policies for atividade_rsvp

-- Users can view their own RSVPs
CREATE POLICY "Users can view own RSVPs"
ON public.atividade_rsvp
FOR SELECT
USING (user_id = auth.uid());

-- Approved volunteers can create/update their RSVP
CREATE POLICY "Volunteers can manage own RSVP"
ON public.atividade_rsvp
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND is_approved_volunteer(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.atividades a
    WHERE a.id = atividade_id
      AND a.status = 'publicada'
      AND can_view_atividade(auth.uid(), a.cidade, a.celula_id)
  )
);

CREATE POLICY "Volunteers can update own RSVP"
ON public.atividade_rsvp
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Volunteers can delete own RSVP"
ON public.atividade_rsvp
FOR DELETE
USING (user_id = auth.uid());

-- Coordinators can view RSVPs for activities in their scope
CREATE POLICY "Coordinators can view RSVPs in scope"
ON public.atividade_rsvp
FOR SELECT
USING (
  is_coordinator(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.atividades a
    WHERE a.id = atividade_id
      AND can_manage_atividade_scope(auth.uid(), a.cidade, a.celula_id)
  )
);

-- 8. Trigger for updated_at on atividades
CREATE TRIGGER update_atividades_updated_at
BEFORE UPDATE ON public.atividades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Trigger for updated_at on atividade_rsvp
CREATE TRIGGER update_rsvp_updated_at
BEFORE UPDATE ON public.atividade_rsvp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Notification function for activity published
CREATE OR REPLACE FUNCTION public.notify_atividade_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_tipo_label TEXT;
BEGIN
  -- Only trigger when status changes to 'publicada'
  IF NEW.status = 'publicada' AND (OLD.status IS NULL OR OLD.status != 'publicada') THEN
    -- Get tipo label
    v_tipo_label := CASE NEW.tipo
      WHEN 'reuniao' THEN 'Reunião'
      WHEN 'panfletagem' THEN 'Panfletagem'
      WHEN 'visita' THEN 'Visita'
      WHEN 'mutirao' THEN 'Mutirão'
      WHEN 'plenaria' THEN 'Plenária'
      WHEN 'formacao_presencial' THEN 'Formação Presencial'
      WHEN 'ato' THEN 'Ato'
      ELSE 'Atividade'
    END;
    
    -- Notify all approved volunteers in scope
    FOR v_user_record IN 
      SELECT DISTINCT p.id as user_id
      FROM public.profiles p
      WHERE p.volunteer_status = 'aprovado'
        AND can_view_atividade(p.id, NEW.cidade, NEW.celula_id)
        AND p.id != NEW.created_by
    LOOP
      INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, href, meta)
      VALUES (
        v_user_record.user_id,
        'atividade_nova',
        v_tipo_label || ': ' || NEW.titulo,
        'Nova atividade agendada para ' || to_char(NEW.inicio_em, 'DD/MM às HH24:MI'),
        '/voluntario/agenda/' || NEW.id,
        jsonb_build_object('atividade_id', NEW.id)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_atividade_published_trigger
AFTER INSERT OR UPDATE ON public.atividades
FOR EACH ROW
EXECUTE FUNCTION public.notify_atividade_published();

-- 11. Notification function for activity cancelled
CREATE OR REPLACE FUNCTION public.notify_atividade_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rsvp_record RECORD;
BEGIN
  -- Only trigger when status changes to 'cancelada'
  IF NEW.status = 'cancelada' AND OLD.status = 'publicada' THEN
    -- Notify all users with RSVP (vou or talvez)
    FOR v_rsvp_record IN 
      SELECT r.user_id
      FROM public.atividade_rsvp r
      WHERE r.atividade_id = NEW.id
        AND r.status IN ('vou', 'talvez')
    LOOP
      INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, href, meta)
      VALUES (
        v_rsvp_record.user_id,
        'atividade_cancelada',
        'Atividade cancelada: ' || NEW.titulo,
        'A atividade que você confirmou presença foi cancelada.',
        '/voluntario/agenda/' || NEW.id,
        jsonb_build_object('atividade_id', NEW.id)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_atividade_cancelled_trigger
AFTER UPDATE ON public.atividades
FOR EACH ROW
EXECUTE FUNCTION public.notify_atividade_cancelled();

-- 12. Add audit log trigger for atividades
CREATE OR REPLACE FUNCTION public.audit_atividade_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
    VALUES (
      auth.uid(),
      'atividade_created',
      'atividades',
      NEW.id,
      jsonb_build_object(
        'titulo', NEW.titulo,
        'tipo', NEW.tipo::text,
        'cidade', NEW.cidade,
        'celula_id', NEW.celula_id,
        'ciclo_id', NEW.ciclo_id
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
      auth.uid(),
      'atividade_updated',
      'atividades',
      NEW.id,
      jsonb_build_object(
        'status', OLD.status::text,
        'cidade', OLD.cidade,
        'celula_id', OLD.celula_id
      ),
      jsonb_build_object(
        'status', NEW.status::text,
        'cidade', NEW.cidade,
        'celula_id', NEW.celula_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_atividade_changes
AFTER INSERT OR UPDATE ON public.atividades
FOR EACH ROW
EXECUTE FUNCTION public.audit_atividade_change();
