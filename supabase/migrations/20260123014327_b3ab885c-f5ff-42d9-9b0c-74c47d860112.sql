-- Origin Trail Part B: Chain tracking + Funnel analytics
-- Non-destructive: adds to existing structure

-- 1) Add referrer_user_id to profiles (direct reference to who invited)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referrer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for efficient chain queries
CREATE INDEX IF NOT EXISTS idx_profiles_referrer ON public.profiles(referrer_user_id) WHERE referrer_user_id IS NOT NULL;

-- 2) Update register_invite_usage to also set referrer_user_id
CREATE OR REPLACE FUNCTION public.register_invite_usage(_code text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Get invite with creator info
  SELECT id, criado_por INTO invite_record 
  FROM public.convites 
  WHERE code = _code AND ativo = true;
  
  IF invite_record.id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if already used by this user
  IF EXISTS (SELECT 1 FROM public.convites_usos WHERE convite_id = invite_record.id AND usado_por = _user_id) THEN
    RETURN true; -- Already registered
  END IF;
  
  -- Check usage limit
  IF (SELECT limite_uso FROM public.convites WHERE id = invite_record.id) IS NOT NULL THEN
    IF (SELECT COUNT(*) FROM public.convites_usos WHERE convite_id = invite_record.id) >= 
       (SELECT limite_uso FROM public.convites WHERE id = invite_record.id) THEN
      RETURN false; -- Limit reached
    END IF;
  END IF;
  
  -- Prevent self-referral
  IF invite_record.criado_por = _user_id THEN
    RETURN false;
  END IF;
  
  -- Register usage
  INSERT INTO public.convites_usos (convite_id, usado_por) VALUES (invite_record.id, _user_id);
  
  -- Update profile with origin AND referrer
  UPDATE public.profiles 
  SET origem_convite_id = invite_record.id,
      referrer_user_id = invite_record.criado_por
  WHERE id = _user_id;
  
  RETURN true;
END;
$$;

-- 3) RPC: Get invite chain (admin-only, limit 10 to prevent deep recursion)
CREATE OR REPLACE FUNCTION public.get_invite_chain(_target_user_id uuid)
RETURNS TABLE (
  depth integer,
  user_id uuid,
  user_name text,
  user_city text,
  invited_by uuid,
  invite_code text,
  invite_channel text,
  joined_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: only admin can view full chain
  IF NOT (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'coordenador_estadual')) THEN
    RAISE EXCEPTION 'Acesso negado: apenas admins podem ver cadeia completa';
  END IF;

  RETURN QUERY
  WITH RECURSIVE chain AS (
    -- Start with target user
    SELECT 
      0 as depth,
      p.id as user_id,
      p.full_name as user_name,
      p.city as user_city,
      p.referrer_user_id as invited_by,
      c.code as invite_code,
      c.canal_declarado as invite_channel,
      p.created_at as joined_at
    FROM public.profiles p
    LEFT JOIN public.convites c ON c.id = p.origem_convite_id
    WHERE p.id = _target_user_id
    
    UNION ALL
    
    -- Recursively get referrers (up the chain)
    SELECT 
      ch.depth + 1,
      p.id,
      p.full_name,
      p.city,
      p.referrer_user_id,
      cv.code,
      cv.canal_declarado,
      p.created_at
    FROM chain ch
    JOIN public.profiles p ON p.id = ch.invited_by
    LEFT JOIN public.convites cv ON cv.id = p.origem_convite_id
    WHERE ch.depth < 10 -- Limit depth to prevent infinite loops
      AND ch.invited_by IS NOT NULL
  )
  SELECT * FROM chain ORDER BY depth;
END;
$$;

-- 4) RPC: Get downstream referrals (who did this user invite)
CREATE OR REPLACE FUNCTION public.get_user_referrals(_referrer_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_city text,
  invite_code text,
  invite_channel text,
  joined_at timestamptz,
  volunteer_status text,
  downstream_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: user can see own referrals, admin/coord can see any
  IF auth.uid() != _referrer_id AND NOT public.is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name as user_name,
    p.city as user_city,
    c.code as invite_code,
    c.canal_declarado as invite_channel,
    p.created_at as joined_at,
    p.volunteer_status,
    (SELECT COUNT(*) FROM public.profiles p2 WHERE p2.referrer_user_id = p.id) as downstream_count
  FROM public.profiles p
  LEFT JOIN public.convites c ON c.id = p.origem_convite_id
  WHERE p.referrer_user_id = _referrer_id
  ORDER BY p.created_at DESC;
END;
$$;

-- 5) RPC: Origin funnel metrics with scope
CREATE OR REPLACE FUNCTION public.origin_funnel(
  _scope_type text DEFAULT 'global',
  _scope_cidade text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_7d_ago timestamptz := now() - interval '7 days';
  v_30d_ago timestamptz := now() - interval '30 days';
BEGIN
  -- Security check
  IF NOT public.is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT json_build_object(
    -- 7-day metrics
    'convites_7d', (
      SELECT COUNT(*) FROM public.convites 
      WHERE criado_em >= v_7d_ago
      AND (_scope_type = 'global' OR escopo_cidade = _scope_cidade)
    ),
    'cadastros_7d', (
      SELECT COUNT(*) FROM public.profiles 
      WHERE created_at >= v_7d_ago
      AND (_scope_type = 'global' OR city = _scope_cidade)
    ),
    'cadastros_com_convite_7d', (
      SELECT COUNT(*) FROM public.profiles 
      WHERE created_at >= v_7d_ago
      AND origem_convite_id IS NOT NULL
      AND (_scope_type = 'global' OR city = _scope_cidade)
    ),
    'aprovados_7d', (
      SELECT COUNT(*) FROM public.profiles 
      WHERE approved_at >= v_7d_ago
      AND (_scope_type = 'global' OR city = _scope_cidade)
    ),
    'ativos_7d', (
      SELECT COUNT(DISTINCT user_id) FROM (
        SELECT user_id FROM public.evidences WHERE created_at >= v_7d_ago
        UNION
        SELECT user_id FROM public.atividade_rsvp WHERE updated_at >= v_7d_ago
        UNION
        SELECT criado_por FROM public.tickets WHERE criado_em >= v_7d_ago
      ) active_users
      WHERE _scope_type = 'global' OR user_id IN (
        SELECT id FROM public.profiles WHERE city = _scope_cidade
      )
    ),
    
    -- Channel breakdown (30 days)
    'por_canal_30d', (
      SELECT json_object_agg(canal, total) FROM (
        SELECT 
          COALESCE(c.canal_declarado, 'direto') as canal,
          COUNT(*) as total
        FROM public.profiles p
        LEFT JOIN public.convites c ON c.id = p.origem_convite_id
        WHERE p.created_at >= v_30d_ago
        AND (_scope_type = 'global' OR p.city = _scope_cidade)
        GROUP BY COALESCE(c.canal_declarado, 'direto')
      ) channels
    ),
    
    -- Top referrers (30 days)
    'top_referrers_30d', (
      SELECT json_agg(referrer_data) FROM (
        SELECT 
          p.id as user_id,
          p.full_name as user_name,
          p.city as user_city,
          COUNT(r.id) as total_referrals,
          COUNT(CASE WHEN r.volunteer_status = 'aprovado' THEN 1 END) as aprovados
        FROM public.profiles p
        JOIN public.profiles r ON r.referrer_user_id = p.id
        WHERE r.created_at >= v_30d_ago
        AND (_scope_type = 'global' OR p.city = _scope_cidade)
        GROUP BY p.id, p.full_name, p.city
        ORDER BY total_referrals DESC
        LIMIT 10
      ) referrer_data
    ),
    
    -- Conversion funnel
    'funil', json_build_object(
      'total_convites', (SELECT COUNT(*) FROM public.convites WHERE (_scope_type = 'global' OR escopo_cidade = _scope_cidade)),
      'convites_usados', (SELECT COUNT(DISTINCT convite_id) FROM public.convites_usos cu JOIN public.convites c ON c.id = cu.convite_id WHERE (_scope_type = 'global' OR c.escopo_cidade = _scope_cidade)),
      'total_cadastros', (SELECT COUNT(*) FROM public.profiles WHERE (_scope_type = 'global' OR city = _scope_cidade)),
      'com_origem', (SELECT COUNT(*) FROM public.profiles WHERE origem_convite_id IS NOT NULL AND (_scope_type = 'global' OR city = _scope_cidade)),
      'aprovados', (SELECT COUNT(*) FROM public.profiles WHERE volunteer_status = 'aprovado' AND (_scope_type = 'global' OR city = _scope_cidade))
    )
  ) INTO result;

  RETURN result;
END;
$$;