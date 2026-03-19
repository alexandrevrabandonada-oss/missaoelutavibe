-- ================================================
-- COORD AUDIT LOG — Auditoria mínima (re-criação)
-- ================================================

-- 1) Create enum for audit actions (if not exists)
DO $$ BEGIN
  CREATE TYPE public.coord_audit_action AS ENUM (
    'GRANT_ROLE',
    'REVOKE_ROLE',
    'UPSERT_CELL',
    'APPROVE_ASSIGNMENT',
    'CANCEL_ASSIGNMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) Create coord_audit_log table (if not exists)
CREATE TABLE IF NOT EXISTS public.coord_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_profile_id UUID NOT NULL,
  action public.coord_audit_action NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('GLOBAL', 'CITY', 'CELL')),
  city_id UUID REFERENCES public.cidades(id) ON DELETE SET NULL,
  cell_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
  target_profile_id UUID,
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for common queries (if not exist)
CREATE INDEX IF NOT EXISTS idx_coord_audit_log_created_at ON public.coord_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coord_audit_log_city ON public.coord_audit_log(city_id) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coord_audit_log_action ON public.coord_audit_log(action);

-- 3) Enable RLS
ALTER TABLE public.coord_audit_log ENABLE ROW LEVEL SECURITY;

-- 4) Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.coord_audit_log;
DROP POLICY IF EXISTS "Coord city can view own city audit logs" ON public.coord_audit_log;
DROP POLICY IF EXISTS "No direct writes to audit log" ON public.coord_audit_log;

-- Recreate RLS Policies
CREATE POLICY "Admins can view all audit logs"
  ON public.coord_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.coord_roles WHERE user_id = auth.uid() AND role = 'COORD_GLOBAL')
  );

CREATE POLICY "Coord city can view own city audit logs"
  ON public.coord_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coord_roles cr
      WHERE cr.user_id = auth.uid()
        AND cr.role = 'COORD_CITY'
        AND cr.city_id = coord_audit_log.city_id
    )
  );

-- 5) Helper function to log audit events
CREATE OR REPLACE FUNCTION public.log_coord_audit(
  p_action public.coord_audit_action,
  p_scope_type TEXT,
  p_city_id UUID DEFAULT NULL,
  p_cell_id UUID DEFAULT NULL,
  p_target_profile_id UUID DEFAULT NULL,
  p_meta_json JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.coord_audit_log (
    actor_profile_id,
    action,
    scope_type,
    city_id,
    cell_id,
    target_profile_id,
    meta_json
  ) VALUES (
    auth.uid(),
    p_action,
    p_scope_type,
    p_city_id,
    p_cell_id,
    p_target_profile_id,
    p_meta_json
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 6) RPC to list audit logs (no PII, scoped)
CREATE OR REPLACE FUNCTION public.list_coord_audit_log(
  p_days INT DEFAULT 14,
  p_city_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  actor_profile_id UUID,
  action public.coord_audit_action,
  scope_type TEXT,
  city_id UUID,
  cell_id UUID,
  target_profile_id UUID,
  meta_json JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_coord_global BOOLEAN;
  v_user_city_id UUID;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) INTO v_is_admin;
  
  SELECT EXISTS (
    SELECT 1 FROM public.coord_roles 
    WHERE user_id = auth.uid() AND role = 'COORD_GLOBAL'
  ) INTO v_is_coord_global;
  
  SELECT cr.city_id INTO v_user_city_id
  FROM public.coord_roles cr
  WHERE cr.user_id = auth.uid() AND cr.role = 'COORD_CITY'
  LIMIT 1;
  
  IF NOT (v_is_admin OR v_is_coord_global OR v_user_city_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Acesso negado: requer permissão de coordenação';
  END IF;
  
  IF v_user_city_id IS NOT NULL AND NOT v_is_admin AND NOT v_is_coord_global THEN
    p_city_id := v_user_city_id;
  END IF;
  
  RETURN QUERY
  SELECT 
    cal.id,
    cal.created_at,
    cal.actor_profile_id,
    cal.action,
    cal.scope_type,
    cal.city_id,
    cal.cell_id,
    cal.target_profile_id,
    cal.meta_json
  FROM public.coord_audit_log cal
  WHERE cal.created_at >= (now() - (p_days || ' days')::INTERVAL)
    AND (p_city_id IS NULL OR cal.city_id = p_city_id)
  ORDER BY cal.created_at DESC
  LIMIT 100;
END;
$$;