-- Security Hardening Migration: Fix warn-level issues
-- 1. Create IP-masked view for audit logs
-- 2. Scope coordinator access to perfil_skills by managed cities  
-- 3. Add rate limiting for missing endpoints

-- =====================================================
-- 1. AUDIT LOGS: Create safe view with masked IPs
-- =====================================================

-- Create a view that masks the last two octets of IP addresses
CREATE OR REPLACE VIEW public.audit_logs_safe AS
SELECT 
  id,
  user_id,
  entity_type,
  entity_id,
  action,
  old_data,
  new_data,
  CASE 
    WHEN ip_address IS NOT NULL THEN 
      regexp_replace(ip_address, '(\d+\.\d+)\.\d+\.\d+', '\1.x.x')
    ELSE NULL
  END as ip_address_masked,
  created_at
FROM public.audit_logs;

-- RLS on the view (inherits from base table, but let's be explicit)
ALTER VIEW public.audit_logs_safe SET (security_invoker = true);

-- Function to log when someone accesses audit logs (meta-auditing)
CREATE OR REPLACE FUNCTION public.log_audit_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, entity_type, action, ip_address)
  VALUES (auth.uid(), 'audit_logs', 'access', NULL);
  RETURN NEW;
END;
$$;

-- =====================================================
-- 2. PERFIL_SKILLS: Scope coordinator access by city
-- =====================================================

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Coordinators can view skills for matching" ON public.perfil_skills;

-- Create new scoped policy for coordinators - only see skills for users in their managed cities
CREATE POLICY "Coordinators can view skills in their scope"
ON public.perfil_skills
FOR SELECT
USING (
  -- Users can always see their own skills
  auth.uid() = user_id
  OR
  -- Admins can see all skills
  public.has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Coordinators can only see skills for users in their managed cities
  (
    public.is_coordinator(auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = perfil_skills.user_id
      AND p.city IN (SELECT cidade FROM public.get_managed_cities(auth.uid()))
    )
  )
);

-- =====================================================
-- 3. RATE LIMITING: Add missing rate limit functions
-- =====================================================

-- Rate limit for evidence submissions (5 per hour per user)
CREATE OR REPLACE FUNCTION public.check_evidence_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < 5
    FROM public.evidences
    WHERE user_id = auth.uid()
    AND created_at > now() - interval '1 hour'
  );
END;
$$;

-- Rate limit for demandas creation (10 per day per user) - using correct column name criada_por
CREATE OR REPLACE FUNCTION public.check_demanda_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < 10
    FROM public.demandas
    WHERE criada_por = auth.uid()
    AND created_at > now() - interval '24 hours'
  );
END;
$$;

-- Rate limit for convites creation (5 per day per user) - using criado_em for timestamp
CREATE OR REPLACE FUNCTION public.check_convite_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < 5
    FROM public.convites
    WHERE criado_por = auth.uid()
    AND criado_em > now() - interval '24 hours'
  );
END;
$$;

-- Rate limit for CRM contacts creation (20 per day per user)
CREATE OR REPLACE FUNCTION public.check_crm_contato_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < 20
    FROM public.crm_contatos
    WHERE criado_por = auth.uid()
    AND created_at > now() - interval '24 hours'
  );
END;
$$;

-- Rate limit for role invites creation (10 per day per user)
CREATE OR REPLACE FUNCTION public.check_role_invite_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < 10
    FROM public.role_invites
    WHERE created_by = auth.uid()
    AND created_at > now() - interval '24 hours'
  );
END;
$$;

-- Rate limit for perfil_skills operations (10 per hour per user)
CREATE OR REPLACE FUNCTION public.check_skill_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < 10
    FROM public.perfil_skills
    WHERE user_id = auth.uid()
    AND created_at > now() - interval '1 hour'
  );
END;
$$;

-- =====================================================
-- 4. UPDATE RLS POLICIES TO USE RATE LIMITS
-- =====================================================

-- Evidence: Add rate limit to insert policy
DROP POLICY IF EXISTS "Users can create own evidence" ON public.evidences;
CREATE POLICY "Users can create own evidence with rate limit"
ON public.evidences
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.check_evidence_rate_limit()
);

-- Demandas: Add rate limit to insert policy - using correct column name criada_por
DROP POLICY IF EXISTS "Users can create demandas" ON public.demandas;
DROP POLICY IF EXISTS "Authenticated users can create demandas" ON public.demandas;
CREATE POLICY "Users can create demandas with rate limit"
ON public.demandas
FOR INSERT
WITH CHECK (
  auth.uid() = criada_por
  AND public.check_demanda_rate_limit()
);

-- Convites: Add rate limit to insert policy  
DROP POLICY IF EXISTS "Users can create convites" ON public.convites;
DROP POLICY IF EXISTS "Authenticated users can create convites" ON public.convites;
CREATE POLICY "Users can create convites with rate limit"
ON public.convites
FOR INSERT
WITH CHECK (
  auth.uid() = criado_por
  AND public.check_convite_rate_limit()
);

-- CRM Contatos: Add rate limit to insert policy
DROP POLICY IF EXISTS "Users can create contacts" ON public.crm_contatos;
DROP POLICY IF EXISTS "Authenticated users can create contacts" ON public.crm_contatos;
CREATE POLICY "Users can create contacts with rate limit"
ON public.crm_contatos
FOR INSERT
WITH CHECK (
  auth.uid() = criado_por
  AND public.check_crm_contato_rate_limit()
);

-- Role Invites: Add rate limit to insert policy
DROP POLICY IF EXISTS "Coordinators can create role invites" ON public.role_invites;
CREATE POLICY "Coordinators can create role invites with rate limit"
ON public.role_invites
FOR INSERT
WITH CHECK (
  public.is_coordinator(auth.uid())
  AND public.check_role_invite_rate_limit()
);

-- Perfil Skills: Add rate limit to insert policy
DROP POLICY IF EXISTS "Users can add own skills" ON public.perfil_skills;
CREATE POLICY "Users can add own skills with rate limit"
ON public.perfil_skills
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND public.check_skill_rate_limit()
);