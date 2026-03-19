-- Add new columns to profiles for city/cell onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS city_id uuid REFERENCES public.cidades(id),
ADD COLUMN IF NOT EXISTS cell_id uuid REFERENCES public.cells(id),
ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS needs_cell_assignment boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_city_id ON public.profiles(city_id);
CREATE INDEX IF NOT EXISTS idx_profiles_cell_id ON public.profiles(cell_id);

-- Drop and recreate policies safely
DROP POLICY IF EXISTS "Users can read active cities" ON public.cidades;
CREATE POLICY "Users can read active cities"
ON public.cidades FOR SELECT
USING (status = 'ativa');

DROP POLICY IF EXISTS "Users can read active cells" ON public.cells;
CREATE POLICY "Users can read active cells"
ON public.cells FOR SELECT
USING (is_active = true);

-- Comments for documentation
COMMENT ON COLUMN public.profiles.city_id IS 'Reference to cidades table for user city selection';
COMMENT ON COLUMN public.profiles.cell_id IS 'Reference to cells table for user cell membership';
COMMENT ON COLUMN public.profiles.onboarding_complete IS 'True when user has completed city/cell onboarding wizard';
COMMENT ON COLUMN public.profiles.needs_cell_assignment IS 'True when user chose to skip cell selection';