-- Create enums for materiais_base
CREATE TYPE material_categoria AS ENUM ('arte', 'video', 'panfleto', 'logo', 'texto', 'outro');
CREATE TYPE material_formato AS ENUM ('png', 'jpg', 'pdf', 'mp4', 'link', 'texto');
CREATE TYPE material_status AS ENUM ('rascunho', 'aprovado', 'arquivado');

-- Create materiais_base table
CREATE TABLE public.materiais_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria material_categoria NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tags TEXT[] DEFAULT '{}',
  formato material_formato NOT NULL,
  arquivo_url TEXT,
  legenda_pronta TEXT,
  status material_status NOT NULL DEFAULT 'rascunho',
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.materiais_base ENABLE ROW LEVEL SECURITY;

-- RLS: Only approved volunteers can view approved materials
CREATE POLICY "Approved users can view approved materials"
ON public.materiais_base FOR SELECT
USING (
  (status = 'aprovado' AND public.is_approved_volunteer(auth.uid()))
  OR public.is_coordinator(auth.uid())
);

-- RLS: Coordinators can manage materials
CREATE POLICY "Coordinators can manage materials"
ON public.materiais_base FOR ALL
USING (public.is_coordinator(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_materiais_base_updated_at
BEFORE UPDATE ON public.materiais_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create storage bucket for materials
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materiais', 'materiais', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for materials
CREATE POLICY "Public can view material files"
ON storage.objects FOR SELECT
USING (bucket_id = 'materiais');

CREATE POLICY "Coordinators can upload material files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'materiais' AND public.is_coordinator(auth.uid()));

CREATE POLICY "Coordinators can delete material files"
ON storage.objects FOR DELETE
USING (bucket_id = 'materiais' AND public.is_coordinator(auth.uid()));