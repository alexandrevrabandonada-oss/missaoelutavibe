
-- =============================================
-- ORIGIN TRAIL: Invite Tracking System
-- =============================================

-- Table: convites (invite codes)
CREATE TABLE public.convites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  criado_por uuid NOT NULL,
  escopo_cidade text NULL,
  escopo_regiao text NULL,
  escopo_celula uuid NULL,
  campanha_tag text DEFAULT 'pre-campanha',
  canal_declarado text NULL,
  limite_uso integer NULL,
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: convites_usos (invite usage tracking)
CREATE TABLE public.convites_usos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  convite_id uuid NOT NULL REFERENCES public.convites(id) ON DELETE CASCADE,
  usado_por uuid NOT NULL,
  usado_em timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(convite_id, usado_por)
);

-- Add origem_convite_id to profiles for easy audit
ALTER TABLE public.profiles 
ADD COLUMN origem_convite_id uuid NULL REFERENCES public.convites(id);

-- Enable RLS
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convites_usos ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to generate short invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to check if invite is valid (active, within limit)
CREATE OR REPLACE FUNCTION public.is_invite_valid(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.convites c
    WHERE c.code = _code
      AND c.ativo = true
      AND (c.limite_uso IS NULL OR (
        SELECT COUNT(*) FROM public.convites_usos cu WHERE cu.convite_id = c.id
      ) < c.limite_uso)
  )
$$;

-- Function to get invite id by code
CREATE OR REPLACE FUNCTION public.get_invite_id_by_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.convites WHERE code = _code AND ativo = true LIMIT 1
$$;

-- Function to register invite usage (called after signup/onboarding)
CREATE OR REPLACE FUNCTION public.register_invite_usage(_code text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_id uuid;
BEGIN
  -- Get invite id
  SELECT id INTO invite_id FROM public.convites 
  WHERE code = _code AND ativo = true;
  
  IF invite_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if already used by this user
  IF EXISTS (SELECT 1 FROM public.convites_usos WHERE convite_id = invite_id AND usado_por = _user_id) THEN
    RETURN true; -- Already registered
  END IF;
  
  -- Check usage limit
  IF (SELECT limite_uso FROM public.convites WHERE id = invite_id) IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM public.convites_usos WHERE convite_id = invite_id) >= 
       (SELECT limite_uso FROM public.convites WHERE id = invite_id) THEN
      RETURN false; -- Limit reached
    END IF;
  END IF;
  
  -- Register usage
  INSERT INTO public.convites_usos (convite_id, usado_por) VALUES (invite_id, _user_id);
  
  -- Update profile with origin
  UPDATE public.profiles SET origem_convite_id = invite_id WHERE id = _user_id;
  
  RETURN true;
END;
$$;

-- Function to check if user can view invite chain (admin only)
CREATE OR REPLACE FUNCTION public.can_view_full_chain(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Function to get invite stats for coordinators (scoped)
CREATE OR REPLACE FUNCTION public.get_invite_stats_for_scope(_user_id uuid)
RETURNS TABLE(
  total_convites bigint,
  total_usos bigint,
  cadastros_com_convite bigint,
  cadastros_sem_convite bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  managed_cities text[];
BEGIN
  -- Get managed cities for coordinator
  SELECT ARRAY(SELECT DISTINCT cidade FROM public.get_managed_cities(_user_id)) INTO managed_cities;
  
  IF public.has_role(_user_id, 'admin') THEN
    -- Admin sees everything
    RETURN QUERY
    SELECT 
      (SELECT COUNT(*) FROM public.convites)::bigint,
      (SELECT COUNT(*) FROM public.convites_usos)::bigint,
      (SELECT COUNT(*) FROM public.profiles WHERE origem_convite_id IS NOT NULL)::bigint,
      (SELECT COUNT(*) FROM public.profiles WHERE origem_convite_id IS NULL)::bigint;
  ELSE
    -- Coordinator sees only their scope
    RETURN QUERY
    SELECT 
      (SELECT COUNT(*) FROM public.convites c 
       WHERE c.escopo_cidade = ANY(managed_cities) OR c.criado_por = _user_id)::bigint,
      (SELECT COUNT(*) FROM public.convites_usos cu
       JOIN public.convites c ON c.id = cu.convite_id
       WHERE c.escopo_cidade = ANY(managed_cities) OR c.criado_por = _user_id)::bigint,
      (SELECT COUNT(*) FROM public.profiles p 
       WHERE p.origem_convite_id IS NOT NULL AND p.city = ANY(managed_cities))::bigint,
      (SELECT COUNT(*) FROM public.profiles p 
       WHERE p.origem_convite_id IS NULL AND p.city = ANY(managed_cities))::bigint;
  END IF;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- CONVITES POLICIES

-- Users can view their own invites
CREATE POLICY "Users can view own invites"
ON public.convites
FOR SELECT
USING (criado_por = auth.uid());

-- Coordinators can view invites in their scope
CREATE POLICY "Coordinators can view scoped invites"
ON public.convites
FOR SELECT
USING (
  is_coordinator(auth.uid()) AND (
    escopo_cidade IN (SELECT cidade FROM public.get_managed_cities(auth.uid()))
    OR has_role(auth.uid(), 'admin')
  )
);

-- Approved users can create invites
CREATE POLICY "Approved users can create invites"
ON public.convites
FOR INSERT
WITH CHECK (
  criado_por = auth.uid() AND is_approved_volunteer(auth.uid())
);

-- Users can update their own invites
CREATE POLICY "Users can update own invites"
ON public.convites
FOR UPDATE
USING (criado_por = auth.uid())
WITH CHECK (criado_por = auth.uid());

-- CONVITES_USOS POLICIES

-- Users can view their own usage
CREATE POLICY "Users can view own invite usage"
ON public.convites_usos
FOR SELECT
USING (usado_por = auth.uid());

-- Invite creators can view usage of their invites
CREATE POLICY "Creators can view their invite usage"
ON public.convites_usos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.convites c 
    WHERE c.id = convite_id AND c.criado_por = auth.uid()
  )
);

-- Coordinators can view usage in their scope
CREATE POLICY "Coordinators can view scoped usage"
ON public.convites_usos
FOR SELECT
USING (
  is_coordinator(auth.uid()) AND (
    EXISTS (
      SELECT 1 FROM public.convites c 
      WHERE c.id = convite_id 
      AND (c.escopo_cidade IN (SELECT cidade FROM public.get_managed_cities(auth.uid()))
           OR has_role(auth.uid(), 'admin'))
    )
  )
);

-- System can insert usage (via function)
CREATE POLICY "System can insert usage"
ON public.convites_usos
FOR INSERT
WITH CHECK (usado_por = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_convites_code ON public.convites(code);
CREATE INDEX idx_convites_criado_por ON public.convites(criado_por);
CREATE INDEX idx_convites_escopo_cidade ON public.convites(escopo_cidade);
CREATE INDEX idx_convites_usos_convite_id ON public.convites_usos(convite_id);
CREATE INDEX idx_convites_usos_usado_por ON public.convites_usos(usado_por);
CREATE INDEX idx_profiles_origem_convite ON public.profiles(origem_convite_id);
