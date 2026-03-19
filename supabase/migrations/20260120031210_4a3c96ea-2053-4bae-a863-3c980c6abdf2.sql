-- Add new demanda_tipo value for suggestions from debates
ALTER TYPE public.demanda_tipo ADD VALUE IF NOT EXISTS 'sugestao_base';

-- Add traceability columns to missions table
ALTER TABLE public.missions 
ADD COLUMN IF NOT EXISTS debate_topico_id uuid REFERENCES public.topicos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS debate_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Add traceability columns to demandas table
ALTER TABLE public.demandas 
ADD COLUMN IF NOT EXISTS debate_topico_id uuid REFERENCES public.topicos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS debate_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_missions_debate_topico ON public.missions(debate_topico_id) WHERE debate_topico_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_missions_debate_post ON public.missions(debate_post_id) WHERE debate_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demandas_debate_topico ON public.demandas(debate_topico_id) WHERE debate_topico_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demandas_debate_post ON public.demandas(debate_post_id) WHERE debate_post_id IS NOT NULL;