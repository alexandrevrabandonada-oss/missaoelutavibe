
-- RPC: Full funnel metrics (7 days) with drill-down lists
CREATE OR REPLACE FUNCTION public.get_full_funnel_7d(
  _scope_cidade TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID;
  _is_admin BOOLEAN;
  _cutoff TIMESTAMPTZ;
  _result JSONB;
BEGIN
  _caller_id := auth.uid();
  IF _caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Check admin or coordinator
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = _caller_id 
      AND role IN ('admin', 'coordenador_geral', 'coordenador_cidade')
      AND revoked_at IS NULL
  ) INTO _is_admin;

  IF NOT _is_admin THEN
    RETURN jsonb_build_object('error', 'not_authorized');
  END IF;

  _cutoff := NOW() - INTERVAL '7 days';

  SELECT jsonb_build_object(
    'cadastros', (
      SELECT jsonb_build_object(
        'count', count(*),
        'items', COALESCE(jsonb_agg(jsonb_build_object(
          'id', p.id, 'name', p.full_name, 'city', p.city, 'at', p.created_at
        ) ORDER BY p.created_at DESC) FILTER (WHERE true), '[]'::jsonb)
      )
      FROM profiles p
      WHERE p.created_at >= _cutoff
        AND (_scope_cidade IS NULL OR p.city = _scope_cidade)
    ),
    'aprovados', (
      SELECT jsonb_build_object(
        'count', count(*),
        'items', COALESCE(jsonb_agg(jsonb_build_object(
          'id', p.id, 'name', p.full_name, 'city', p.city, 'at', p.approved_at
        ) ORDER BY p.approved_at DESC) FILTER (WHERE true), '[]'::jsonb)
      )
      FROM profiles p
      WHERE p.approved_at >= _cutoff
        AND p.volunteer_status = 'ativo'
        AND (_scope_cidade IS NULL OR p.city = _scope_cidade)
    ),
    'checkins', (
      SELECT jsonb_build_object(
        'count', count(*),
        'items', COALESCE(jsonb_agg(jsonb_build_object(
          'id', dc.id, 'user_id', dc.user_id, 'name', p.full_name, 'at', dc.created_at
        ) ORDER BY dc.created_at DESC) FILTER (WHERE true), '[]'::jsonb)
      )
      FROM daily_checkins dc
      JOIN profiles p ON p.id = dc.user_id
      WHERE dc.created_at >= _cutoff
        AND (_scope_cidade IS NULL OR p.city = _scope_cidade)
    ),
    'missoes_iniciadas', (
      SELECT jsonb_build_object(
        'count', count(*),
        'items', COALESCE(jsonb_agg(jsonb_build_object(
          'id', m.id, 'user_id', m.assigned_to, 'name', p.full_name, 'title', m.title, 'at', m.created_at
        ) ORDER BY m.created_at DESC) FILTER (WHERE true), '[]'::jsonb)
      )
      FROM missions m
      JOIN profiles p ON p.id = m.assigned_to
      WHERE m.created_at >= _cutoff
        AND (_scope_cidade IS NULL OR p.city = _scope_cidade)
    ),
    'evidencias_enviadas', (
      SELECT jsonb_build_object(
        'count', count(*),
        'items', COALESCE(jsonb_agg(jsonb_build_object(
          'id', e.id, 'user_id', e.user_id, 'name', p.full_name, 'status', e.status, 'at', e.created_at
        ) ORDER BY e.created_at DESC) FILTER (WHERE true), '[]'::jsonb)
      )
      FROM evidences e
      JOIN profiles p ON p.id = e.user_id
      WHERE e.created_at >= _cutoff
        AND (_scope_cidade IS NULL OR p.city = _scope_cidade)
    ),
    'evidencias_validadas', (
      SELECT jsonb_build_object(
        'count', count(*),
        'items', COALESCE(jsonb_agg(jsonb_build_object(
          'id', e.id, 'user_id', e.user_id, 'name', p.full_name, 'at', e.validated_at
        ) ORDER BY e.validated_at DESC) FILTER (WHERE true), '[]'::jsonb)
      )
      FROM evidences e
      JOIN profiles p ON p.id = e.user_id
      WHERE e.status = 'validated'
        AND e.validated_at >= _cutoff
        AND (_scope_cidade IS NULL OR p.city = _scope_cidade)
    ),
    'convites_gerados', (
      SELECT jsonb_build_object(
        'count', count(*),
        'items', COALESCE(jsonb_agg(jsonb_build_object(
          'id', c.id, 'code', c.code, 'name', p.full_name, 'at', c.criado_em
        ) ORDER BY c.criado_em DESC) FILTER (WHERE true), '[]'::jsonb)
      )
      FROM convites c
      JOIN profiles p ON p.id = c.criado_por
      WHERE c.criado_em >= _cutoff
        AND (_scope_cidade IS NULL OR p.city = _scope_cidade)
    ),
    'convites_convertidos', (
      SELECT jsonb_build_object(
        'count', count(*),
        'items', COALESCE(jsonb_agg(jsonb_build_object(
          'id', cu.id, 'used_by_name', p.full_name, 'at', cu.usado_em
        ) ORDER BY cu.usado_em DESC) FILTER (WHERE true), '[]'::jsonb)
      )
      FROM convites_usos cu
      JOIN profiles p ON p.id = cu.usado_por
      WHERE cu.usado_em >= _cutoff
    )
  ) INTO _result;

  RETURN _result;
END;
$$;
