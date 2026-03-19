
-- Link table: up to 6 curated missions per cycle
CREATE TABLE public.ciclo_missoes_ativas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_semanais(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ciclo_id, mission_id)
);

-- Enable RLS
ALTER TABLE public.ciclo_missoes_ativas ENABLE ROW LEVEL SECURITY;

-- Everyone can read (volunteers need to see which missions are active)
CREATE POLICY "Anyone authenticated can view cycle missions"
ON public.ciclo_missoes_ativas FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins/coordinators can manage (checked at app level)
CREATE POLICY "Authenticated users can insert cycle missions"
ON public.ciclo_missoes_ativas FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete cycle missions"
ON public.ciclo_missoes_ativas FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Index for fast lookup
CREATE INDEX idx_ciclo_missoes_ativas_ciclo ON public.ciclo_missoes_ativas(ciclo_id);
