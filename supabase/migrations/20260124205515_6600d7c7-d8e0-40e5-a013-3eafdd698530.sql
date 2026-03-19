-- =============================================
-- Security Hardening: Fix Function Search Paths
-- =============================================
-- This migration adds SET search_path = public to functions that are missing it
-- Using ALTER FUNCTION to avoid recreation issues

-- 1. approve_template - add search_path
ALTER FUNCTION public.approve_template(uuid) SET search_path = public;

-- 2. archive_template - add search_path
ALTER FUNCTION public.archive_template(uuid) SET search_path = public;

-- 3. generate_invite_token - add search_path
ALTER FUNCTION public.generate_invite_token() SET search_path = public;

-- 4. get_fabrica_metrics - add search_path
ALTER FUNCTION public.get_fabrica_metrics(text, text) SET search_path = public;

-- 5. list_templates_for_user - add search_path
ALTER FUNCTION public.list_templates_for_user() SET search_path = public;

-- 6. publish_template_to_mural - add search_path
ALTER FUNCTION public.publish_template_to_mural(uuid, text, text) SET search_path = public;

-- 7. request_review_template - add search_path
ALTER FUNCTION public.request_review_template(uuid) SET search_path = public;

-- 8. track_template_action - add search_path
ALTER FUNCTION public.track_template_action(uuid, text) SET search_path = public;

-- 9. user_can_manage_fabrica_scope - add search_path
ALTER FUNCTION public.user_can_manage_fabrica_scope(uuid, text, text) SET search_path = public;

-- 10. user_has_fabrica_scope_access - add search_path
ALTER FUNCTION public.user_has_fabrica_scope_access(uuid, text, text) SET search_path = public;

-- =============================================
-- Restrict growth_events to admins only
-- =============================================
-- Drop the existing policy that allows coordinators to view growth events
DROP POLICY IF EXISTS "Admins and coordinators can view growth events" ON public.growth_events;

-- Create new policy that only allows admins to view growth events
-- This restricts user behavior tracking data to system administrators only
CREATE POLICY "Only admins can view growth events"
ON public.growth_events
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);