-- Add onboarding_prefs JSONB column to profiles (for direcionador preferences)
-- Stores: interesses[], habilidades[], tempo, conforto

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_prefs IS 'Stores onboarding direcionador preferences: interesses[], habilidades[], tempo, conforto';

-- No new RLS needed - existing "user updates own profile" policy covers this column