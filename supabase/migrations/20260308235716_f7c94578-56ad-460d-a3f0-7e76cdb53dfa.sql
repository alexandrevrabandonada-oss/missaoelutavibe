
-- F1.1 Part 1: Add new evidence_status enum values only
ALTER TYPE public.evidence_status ADD VALUE IF NOT EXISTS 'rascunho';
ALTER TYPE public.evidence_status ADD VALUE IF NOT EXISTS 'enviado';
ALTER TYPE public.evidence_status ADD VALUE IF NOT EXISTS 'precisa_ajuste';
ALTER TYPE public.evidence_status ADD VALUE IF NOT EXISTS 'validado';
ALTER TYPE public.evidence_status ADD VALUE IF NOT EXISTS 'rejeitado';
