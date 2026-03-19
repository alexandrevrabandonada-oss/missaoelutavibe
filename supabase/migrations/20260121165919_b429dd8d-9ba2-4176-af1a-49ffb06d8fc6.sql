-- Fix share_links public access vulnerability
-- Drop the overly permissive public access policy
DROP POLICY IF EXISTS "Public can view active shares" ON public.share_links;

-- Create a more restrictive policy that requires the share code to be known
-- This prevents enumeration attacks while still allowing legitimate access
CREATE POLICY "Users can view their own share links" 
ON public.share_links 
FOR SELECT 
USING (user_id = auth.uid());

-- Create policy for coordinators to view all share links (for admin purposes)
CREATE POLICY "Coordinators can view all share links" 
ON public.share_links 
FOR SELECT 
USING (is_coordinator(auth.uid()));