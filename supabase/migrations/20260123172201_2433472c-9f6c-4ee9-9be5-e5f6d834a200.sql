-- Fix search_path for onboarding functions
ALTER FUNCTION public.get_onboarding_status() SET search_path = public;
ALTER FUNCTION public.mark_onboarding_step_done(INT) SET search_path = public;
ALTER FUNCTION public.get_onboarding_metrics(TEXT, TEXT, UUID) SET search_path = public;