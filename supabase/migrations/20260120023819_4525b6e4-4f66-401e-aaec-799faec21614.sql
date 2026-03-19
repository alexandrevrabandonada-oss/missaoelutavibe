-- Create enum for topic scope
CREATE TYPE public.topico_escopo AS ENUM ('global', 'celula');

-- Create topics table
CREATE TABLE public.topicos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tema TEXT NOT NULL,
    descricao TEXT,
    tags TEXT[] DEFAULT '{}',
    escopo public.topico_escopo NOT NULL DEFAULT 'global',
    celula_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
    criado_por UUID NOT NULL,
    oculto BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create posts table
CREATE TABLE public.posts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    topico_id UUID NOT NULL REFERENCES public.topicos(id) ON DELETE CASCADE,
    autor_id UUID NOT NULL,
    texto TEXT NOT NULL,
    oculto BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comments table
CREATE TABLE public.comentarios (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    autor_id UUID NOT NULL,
    texto TEXT NOT NULL,
    oculto BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for topicos
CREATE POLICY "Users can view visible topics"
ON public.topicos FOR SELECT TO authenticated
USING (oculto = false OR public.is_coordinator(auth.uid()));

CREATE POLICY "Approved users can create topics"
ON public.topicos FOR INSERT TO authenticated
WITH CHECK (
    public.is_approved_volunteer(auth.uid()) AND
    criado_por = auth.uid()
);

CREATE POLICY "Coordinators can update topics"
ON public.topicos FOR UPDATE TO authenticated
USING (public.is_coordinator(auth.uid()));

-- RLS Policies for posts
CREATE POLICY "Users can view visible posts"
ON public.posts FOR SELECT TO authenticated
USING (oculto = false OR public.is_coordinator(auth.uid()));

CREATE POLICY "Approved users can create posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (
    public.is_approved_volunteer(auth.uid()) AND
    autor_id = auth.uid()
);

CREATE POLICY "Coordinators can update posts"
ON public.posts FOR UPDATE TO authenticated
USING (public.is_coordinator(auth.uid()));

-- RLS Policies for comentarios
CREATE POLICY "Users can view visible comments"
ON public.comentarios FOR SELECT TO authenticated
USING (oculto = false OR public.is_coordinator(auth.uid()));

CREATE POLICY "Approved users can create comments"
ON public.comentarios FOR INSERT TO authenticated
WITH CHECK (
    public.is_approved_volunteer(auth.uid()) AND
    autor_id = auth.uid()
);

CREATE POLICY "Coordinators can update comments"
ON public.comentarios FOR UPDATE TO authenticated
USING (public.is_coordinator(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_topicos_escopo ON public.topicos(escopo);
CREATE INDEX idx_topicos_celula_id ON public.topicos(celula_id);
CREATE INDEX idx_posts_topico_id ON public.posts(topico_id);
CREATE INDEX idx_comentarios_post_id ON public.comentarios(post_id);

-- Triggers for updated_at
CREATE TRIGGER update_topicos_updated_at
    BEFORE UPDATE ON public.topicos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();