-- =============================================
-- MURAL DA CÉLULA v0 - Database Schema (CORRECTED)
-- =============================================

-- 1. Create mural_posts table
CREATE TABLE public.mural_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escopo_tipo TEXT NOT NULL DEFAULT 'celula' CHECK (escopo_tipo IN ('celula', 'cidade')),
  escopo_id UUID NOT NULL, -- celula_id for v0
  tipo TEXT NOT NULL CHECK (tipo IN ('debate', 'chamado', 'relato', 'evidencia', 'material', 'recibo_atividade', 'recibo_semana')),
  titulo TEXT,
  corpo_markdown TEXT NOT NULL,
  autor_user_id UUID NOT NULL,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  atividade_id UUID REFERENCES public.atividades(id) ON DELETE SET NULL,
  ciclo_id UUID REFERENCES public.ciclos_semanais(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'oculto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create mural_comentarios table
CREATE TABLE public.mural_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.mural_posts(id) ON DELETE CASCADE,
  autor_user_id UUID NOT NULL,
  corpo_markdown TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'oculto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create mural_reacoes table with unique constraint
CREATE TABLE public.mural_reacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.mural_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('confirmar', 'apoiar', 'replicar', 'convocar', 'gratidao')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, tipo)
);

-- 4. Create indexes for performance
CREATE INDEX idx_mural_posts_escopo ON public.mural_posts(escopo_tipo, escopo_id, created_at DESC);
CREATE INDEX idx_mural_posts_autor ON public.mural_posts(autor_user_id);
CREATE INDEX idx_mural_comentarios_post ON public.mural_comentarios(post_id, created_at);
CREATE INDEX idx_mural_reacoes_post ON public.mural_reacoes(post_id);

-- 5. Enable RLS
ALTER TABLE public.mural_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_reacoes ENABLE ROW LEVEL SECURITY;

-- 6. Helper function: check if user is member of cell
CREATE OR REPLACE FUNCTION public.is_cell_member(_user_id UUID, _cell_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cell_memberships
    WHERE user_id = _user_id
      AND cell_id = _cell_id
      AND is_active = true
  )
$$;

-- 7. Helper function: check if user can moderate cell (coord/mod/admin)
-- Fixed: has_scoped_role signature is (_user_id, _role, _cidade, _regiao, _cell_id)
CREATE OR REPLACE FUNCTION public.can_moderate_cell(_user_id UUID, _cell_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_admin(_user_id) OR 
    is_coordinator(_user_id) OR
    has_scoped_role(_user_id, 'coordenador_celula', NULL, NULL, _cell_id)
$$;

-- 8. Rate limit function for mural posts (1 post per 30 seconds)
CREATE OR REPLACE FUNCTION public.check_mural_post_rate_limit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.mural_posts
    WHERE autor_user_id = _user_id
      AND created_at > now() - interval '30 seconds'
  )
$$;

-- 9. Rate limit function for mural comments (1 comment per 10 seconds)
CREATE OR REPLACE FUNCTION public.check_mural_comment_rate_limit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.mural_comentarios
    WHERE autor_user_id = _user_id
      AND created_at > now() - interval '10 seconds'
  )
$$;

-- =============================================
-- RLS POLICIES FOR mural_posts
-- =============================================

-- Members can view published posts in their cell
CREATE POLICY "Members can view published posts in their cell"
ON public.mural_posts FOR SELECT
USING (
  (status = 'publicado' AND escopo_tipo = 'celula' AND is_cell_member(auth.uid(), escopo_id))
  OR is_coordinator(auth.uid())
  OR autor_user_id = auth.uid()
);

-- Members can create posts in their cell (with rate limit)
CREATE POLICY "Members can create posts in their cell"
ON public.mural_posts FOR INSERT
WITH CHECK (
  autor_user_id = auth.uid()
  AND escopo_tipo = 'celula'
  AND is_cell_member(auth.uid(), escopo_id)
  AND is_approved_volunteer(auth.uid())
  AND check_mural_post_rate_limit(auth.uid())
);

-- Moderators can update posts (for hiding)
CREATE POLICY "Moderators can update posts"
ON public.mural_posts FOR UPDATE
USING (
  can_moderate_cell(auth.uid(), escopo_id)
  OR autor_user_id = auth.uid()
);

-- Admins can delete posts
CREATE POLICY "Admins can delete posts"
ON public.mural_posts FOR DELETE
USING (is_admin(auth.uid()));

-- =============================================
-- RLS POLICIES FOR mural_comentarios
-- =============================================

-- Members can view published comments on posts they can see
CREATE POLICY "Members can view comments"
ON public.mural_comentarios FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mural_posts p
    WHERE p.id = mural_comentarios.post_id
      AND (
        (p.status = 'publicado' AND p.escopo_tipo = 'celula' AND is_cell_member(auth.uid(), p.escopo_id))
        OR is_coordinator(auth.uid())
      )
  )
  AND (status = 'publicado' OR is_coordinator(auth.uid()) OR autor_user_id = auth.uid())
);

-- Members can create comments (with rate limit)
CREATE POLICY "Members can create comments"
ON public.mural_comentarios FOR INSERT
WITH CHECK (
  autor_user_id = auth.uid()
  AND is_approved_volunteer(auth.uid())
  AND check_mural_comment_rate_limit(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.mural_posts p
    WHERE p.id = mural_comentarios.post_id
      AND p.status = 'publicado'
      AND p.escopo_tipo = 'celula'
      AND is_cell_member(auth.uid(), p.escopo_id)
  )
);

-- Moderators can update comments (for hiding)
CREATE POLICY "Moderators can update comments"
ON public.mural_comentarios FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mural_posts p
    WHERE p.id = mural_comentarios.post_id
      AND can_moderate_cell(auth.uid(), p.escopo_id)
  )
  OR autor_user_id = auth.uid()
);

-- =============================================
-- RLS POLICIES FOR mural_reacoes
-- =============================================

-- Members can view reactions on posts they can see
CREATE POLICY "Members can view reactions"
ON public.mural_reacoes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mural_posts p
    WHERE p.id = mural_reacoes.post_id
      AND (
        (p.status = 'publicado' AND p.escopo_tipo = 'celula' AND is_cell_member(auth.uid(), p.escopo_id))
        OR is_coordinator(auth.uid())
      )
  )
);

-- Members can add reactions
CREATE POLICY "Members can add reactions"
ON public.mural_reacoes FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND is_approved_volunteer(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.mural_posts p
    WHERE p.id = mural_reacoes.post_id
      AND p.status = 'publicado'
      AND p.escopo_tipo = 'celula'
      AND is_cell_member(auth.uid(), p.escopo_id)
  )
);

-- Members can remove their own reactions
CREATE POLICY "Members can remove own reactions"
ON public.mural_reacoes FOR DELETE
USING (user_id = auth.uid());

-- =============================================
-- AUDIT TRIGGER FOR MODERATION ACTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.audit_mural_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'mural_posts' AND OLD.status = 'publicado' AND NEW.status = 'oculto' THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, old_data, new_data)
    VALUES (auth.uid(), 'mural_post', NEW.id, 'hide', jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
  ELSIF TG_TABLE_NAME = 'mural_comentarios' AND OLD.status = 'publicado' AND NEW.status = 'oculto' THEN
    INSERT INTO public.audit_logs (user_id, entity_type, entity_id, action, old_data, new_data)
    VALUES (auth.uid(), 'mural_comment', NEW.id, 'hide', jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_mural_posts_moderation
AFTER UPDATE ON public.mural_posts
FOR EACH ROW
EXECUTE FUNCTION public.audit_mural_moderation();

CREATE TRIGGER audit_mural_comentarios_moderation
AFTER UPDATE ON public.mural_comentarios
FOR EACH ROW
EXECUTE FUNCTION public.audit_mural_moderation();