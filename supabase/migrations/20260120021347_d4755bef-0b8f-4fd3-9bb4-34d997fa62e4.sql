-- Add new columns to demandas table
ALTER TABLE public.demandas 
ADD COLUMN IF NOT EXISTS prazo TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolucao TEXT;

-- Add demanda_id to missions table to link demands to missions
ALTER TABLE public.missions 
ADD COLUMN IF NOT EXISTS demanda_id UUID REFERENCES public.demandas(id);

-- Create demandas_updates table for history/comments
CREATE TABLE public.demandas_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demanda_id UUID NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL,
  mensagem TEXT NOT NULL,
  visivel_para_voluntario BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demandas_updates ENABLE ROW LEVEL SECURITY;

-- Volunteers can see updates that are visible to them on their own demandas
CREATE POLICY "Volunteers can view visible updates on their demandas"
ON public.demandas_updates
FOR SELECT
USING (
  visivel_para_voluntario = true 
  AND EXISTS (
    SELECT 1 FROM public.demandas 
    WHERE demandas.id = demandas_updates.demanda_id 
    AND demandas.criada_por = auth.uid()
  )
);

-- Coordinators can view all updates
CREATE POLICY "Coordinators can view all updates"
ON public.demandas_updates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
  )
);

-- Coordinators can create updates
CREATE POLICY "Coordinators can create updates"
ON public.demandas_updates
FOR INSERT
WITH CHECK (
  autor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
  )
);

-- Volunteers can create updates on their own demandas (for replies)
CREATE POLICY "Volunteers can create updates on their demandas"
ON public.demandas_updates
FOR INSERT
WITH CHECK (
  autor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.demandas 
    WHERE demandas.id = demandas_updates.demanda_id 
    AND demandas.criada_por = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_demandas_updates_demanda_id ON public.demandas_updates(demanda_id);
CREATE INDEX idx_missions_demanda_id ON public.missions(demanda_id);