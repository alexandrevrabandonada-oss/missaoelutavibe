-- Fix topicos table public access vulnerability
-- Drop the overly permissive policy that allows unauthenticated access
DROP POLICY IF EXISTS "Users can view topics based on scope" ON public.topicos;

-- The "Approved users can view visible topicos" policy already exists and properly restricts
-- access to approved volunteers only. We just need to remove the duplicate permissive policy.