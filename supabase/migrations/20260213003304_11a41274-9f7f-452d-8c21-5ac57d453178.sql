
-- Add template fields to missions table
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS porque_importa TEXT,
  ADD COLUMN IF NOT EXISTS como_fazer TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS como_provar TEXT,
  ADD COLUMN IF NOT EXISTS share_message TEXT;

-- variacoes_tempo lives in meta_json as:
-- { "variacoes_tempo": [{ "minutes": 10, "como_fazer": ["..."], "como_provar": "..." }, ...] }
-- No extra column needed for variations.

COMMENT ON COLUMN public.missions.porque_importa IS 'Why this mission matters (1 sentence)';
COMMENT ON COLUMN public.missions.como_fazer IS 'How to do it (3 bullets)';
COMMENT ON COLUMN public.missions.como_provar IS 'Minimum proof to validate';
COMMENT ON COLUMN public.missions.share_message IS 'Pre-built share text with branding';
