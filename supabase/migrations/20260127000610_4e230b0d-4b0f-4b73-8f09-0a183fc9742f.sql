-- App Config table (single-row pattern)
CREATE TABLE public.app_config (
  id TEXT PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  mode TEXT NOT NULL DEFAULT 'pre' CHECK (mode IN ('pre', 'campanha', 'pos')),
  brand_pack TEXT NOT NULL DEFAULT 'eluta',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default row
INSERT INTO public.app_config (id, mode, brand_pack) VALUES ('singleton', 'pre', 'eluta');

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can read
CREATE POLICY "Anyone can read app_config"
ON public.app_config
FOR SELECT
USING (true);

-- RLS: Only admins can update
CREATE POLICY "Admins can update app_config"
ON public.app_config
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

-- RPC: Get app config (public)
CREATE OR REPLACE FUNCTION public.get_app_config()
RETURNS TABLE (
  mode TEXT,
  brand_pack TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT ac.mode, ac.brand_pack, ac.updated_at
  FROM public.app_config ac
  WHERE ac.id = 'singleton';
END;
$$;

-- RPC: Set app config (admin only, with audit logging)
CREATE OR REPLACE FUNCTION public.set_app_config(
  p_mode TEXT,
  p_brand_pack TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_mode TEXT;
  v_old_brand_pack TEXT;
  v_actor_nickname TEXT;
BEGIN
  -- Check admin permission
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  -- Validate mode
  IF p_mode NOT IN ('pre', 'campanha', 'pos') THEN
    RAISE EXCEPTION 'Invalid mode: must be pre, campanha, or pos';
  END IF;

  -- Get old values for audit
  SELECT mode, brand_pack INTO v_old_mode, v_old_brand_pack
  FROM public.app_config WHERE id = 'singleton';

  -- Get actor nickname
  SELECT COALESCE(apelido, 'Admin') INTO v_actor_nickname
  FROM public.profiles WHERE id = auth.uid();

  -- Update config
  UPDATE public.app_config
  SET 
    mode = p_mode,
    brand_pack = p_brand_pack,
    updated_at = now(),
    updated_by = auth.uid()
  WHERE id = 'singleton';

  -- Log to governance audit
  INSERT INTO public.governance_audit_log (
    entity_type,
    entity_id,
    action,
    old_status,
    new_status,
    actor_id,
    actor_nickname,
    meta
  ) VALUES (
    'app_config',
    'singleton',
    'status_change',
    v_old_mode,
    p_mode,
    auth.uid(),
    v_actor_nickname,
    jsonb_build_object(
      'old_brand_pack', v_old_brand_pack,
      'new_brand_pack', p_brand_pack
    )
  );

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_app_config() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_app_config(TEXT, TEXT) TO authenticated;