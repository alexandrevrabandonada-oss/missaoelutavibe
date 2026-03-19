-- Add recommended and estimated time fields to cursos_formacao
ALTER TABLE public.cursos_formacao
ADD COLUMN IF NOT EXISTS recomendado boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS estimativa_min integer;