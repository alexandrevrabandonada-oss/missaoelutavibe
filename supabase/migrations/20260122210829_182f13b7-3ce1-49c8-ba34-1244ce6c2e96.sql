-- =====================================================
-- ADMIN OPS PANEL v0 - Aggregated operational metrics
-- Returns JSON metrics by scope, no personal data
-- =====================================================

-- Create ops_overview RPC - main operational dashboard
CREATE OR REPLACE FUNCTION public.ops_overview(
  _scope_type text DEFAULT 'all',
  _scope_cidade text DEFAULT NULL,
  _scope_celula_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  week_ago timestamp with time zone;
  _now timestamp with time zone;
  _ciclo_ativo json;
  _voluntarios json;
  _missoes json;
  _demandas json;
  _agenda_7d json;
  _tickets json;
  _origem_funil json;
BEGIN
  -- Verify caller is coordinator
  IF NOT is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  
  week_ago := NOW() - INTERVAL '7 days';
  _now := NOW();

  -- 1. Get active cycle for scope (priority: cell > city > global)
  SELECT json_build_object(
    'id', c.id,
    'titulo', c.titulo,
    'status', c.status,
    'inicio', c.inicio,
    'fim', c.fim,
    'metas_count', COALESCE(jsonb_array_length(c.metas_json::jsonb), 0),
    'tem_plano', EXISTS (
      SELECT 1 FROM anuncios a 
      WHERE a.ciclo_id = c.id 
        AND a.fixado = true 
        AND a.status = 'PUBLICADO'
    ),
    'tem_recibo', c.fechado_em IS NOT NULL
  ) INTO _ciclo_ativo
  FROM ciclos_semanais c
  WHERE c.status = 'ativo'
    AND (
      (_scope_type = 'all') OR
      (_scope_type = 'celula' AND c.celula_id = _scope_celula_id) OR
      (_scope_type = 'cidade' AND c.cidade = _scope_cidade AND c.celula_id IS NULL) OR
      (_scope_type = 'global' AND c.cidade IS NULL AND c.celula_id IS NULL)
    )
  ORDER BY 
    CASE WHEN c.celula_id IS NOT NULL THEN 1 
         WHEN c.cidade IS NOT NULL THEN 2 
         ELSE 3 END
  LIMIT 1;

  -- 2. Volunteer metrics
  SELECT json_build_object(
    'aprovados_total', (
      SELECT COUNT(*) FROM profiles p
      WHERE p.volunteer_status = 'ativo'
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND p.city = _scope_cidade) OR
          (_scope_type = 'celula' AND EXISTS (
            SELECT 1 FROM cell_memberships cm 
            WHERE cm.user_id = p.id AND cm.cell_id = _scope_celula_id AND cm.is_active = true
          ))
        )
    ),
    'pendentes_validacao', (
      SELECT COUNT(*) FROM profiles p
      WHERE p.volunteer_status = 'pendente'
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND p.city = _scope_cidade)
        )
    ),
    'ativos_7d', (
      SELECT COUNT(DISTINCT user_id) FROM (
        -- Evidence submitted
        SELECT e.user_id FROM evidences e WHERE e.created_at >= week_ago
        UNION
        -- RSVP vou/talvez
        SELECT r.user_id FROM atividade_rsvp r 
        WHERE r.updated_at >= week_ago AND r.status IN ('vou', 'talvez')
        UNION
        -- Ticket created
        SELECT t.criado_por FROM tickets t WHERE t.criado_em >= week_ago
      ) active_users
    )
  ) INTO _voluntarios;

  -- 3. Mission metrics (cycle if exists, else 7d)
  SELECT json_build_object(
    'abertas', (
      SELECT COUNT(*) FROM missions m
      WHERE m.status IN ('publicada', 'rascunho')
        AND (
          (_ciclo_ativo IS NOT NULL AND m.ciclo_id = (_ciclo_ativo->>'id')::uuid) OR
          (_ciclo_ativo IS NULL AND m.created_at >= week_ago)
        )
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'celula' AND m.cell_id = _scope_celula_id)
        )
    ),
    'em_execucao', (
      SELECT COUNT(*) FROM missions m
      WHERE m.status = 'em_andamento'
        AND (
          (_ciclo_ativo IS NOT NULL AND m.ciclo_id = (_ciclo_ativo->>'id')::uuid) OR
          (_ciclo_ativo IS NULL AND m.created_at >= week_ago)
        )
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'celula' AND m.cell_id = _scope_celula_id)
        )
    ),
    'concluidas', (
      SELECT COUNT(*) FROM missions m
      WHERE m.status IN ('concluida', 'validada')
        AND (
          (_ciclo_ativo IS NOT NULL AND m.ciclo_id = (_ciclo_ativo->>'id')::uuid) OR
          (_ciclo_ativo IS NULL AND m.created_at >= week_ago)
        )
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'celula' AND m.cell_id = _scope_celula_id)
        )
    ),
    'pendentes_validacao', (
      SELECT COUNT(*) FROM evidences e
      JOIN missions m ON m.id = e.mission_id
      WHERE e.status = 'pendente'
        AND (
          (_ciclo_ativo IS NOT NULL AND m.ciclo_id = (_ciclo_ativo->>'id')::uuid) OR
          (_ciclo_ativo IS NULL AND e.created_at >= week_ago)
        )
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'celula' AND m.cell_id = _scope_celula_id)
        )
    )
  ) INTO _missoes;

  -- 4. Demandas metrics (simplified - no scope filter as demandas are global-ish)
  SELECT json_build_object(
    'novas', (SELECT COUNT(*) FROM demandas WHERE status = 'nova'),
    'em_triagem', (SELECT COUNT(*) FROM demandas WHERE status = 'triagem'),
    'virou_missao', (
      SELECT COUNT(DISTINCT d.id) FROM demandas d
      JOIN missions m ON m.demanda_origem_id = d.id OR m.demanda_id = d.id
      WHERE d.created_at >= week_ago
    ),
    'arquivadas_7d', (
      SELECT COUNT(*) FROM demandas 
      WHERE status = 'arquivada' AND updated_at >= week_ago
    )
  ) INTO _demandas;

  -- 5. Agenda 7d metrics
  SELECT json_build_object(
    'atividades_publicadas', (
      SELECT COUNT(*) FROM atividades a
      WHERE a.status = 'publicada'
        AND a.inicio_em >= _now
        AND a.inicio_em < _now + INTERVAL '7 days'
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND a.cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND a.celula_id = _scope_celula_id)
        )
    ),
    'proximas_48h', (
      SELECT COUNT(*) FROM atividades a
      WHERE a.status = 'publicada'
        AND a.inicio_em >= _now
        AND a.inicio_em < _now + INTERVAL '48 hours'
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND a.cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND a.celula_id = _scope_celula_id)
        )
    ),
    'rsvp_vou', (
      SELECT COUNT(*) FROM atividade_rsvp r
      JOIN atividades a ON a.id = r.atividade_id
      WHERE r.status = 'vou'
        AND a.inicio_em >= _now
        AND a.inicio_em < _now + INTERVAL '7 days'
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND a.cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND a.celula_id = _scope_celula_id)
        )
    ),
    'rsvp_talvez', (
      SELECT COUNT(*) FROM atividade_rsvp r
      JOIN atividades a ON a.id = r.atividade_id
      WHERE r.status = 'talvez'
        AND a.inicio_em >= _now
        AND a.inicio_em < _now + INTERVAL '7 days'
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND a.cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND a.celula_id = _scope_celula_id)
        )
    )
  ) INTO _agenda_7d;

  -- 6. Tickets metrics
  SELECT json_build_object(
    'abertos', (
      SELECT COUNT(*) FROM tickets t
      WHERE t.status = 'ABERTO'
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND t.cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND t.celula_id = _scope_celula_id)
        )
    ),
    'aguardando_resposta', (
      SELECT COUNT(*) FROM tickets t
      WHERE t.status = 'EM_ANDAMENTO'
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND t.cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND t.celula_id = _scope_celula_id)
        )
    ),
    'mais_antigo_dias', (
      SELECT COALESCE(
        EXTRACT(DAY FROM (_now - MIN(t.criado_em))),
        0
      )::integer
      FROM tickets t
      WHERE t.status IN ('ABERTO', 'EM_ANDAMENTO')
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND t.cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND t.celula_id = _scope_celula_id)
        )
    )
  ) INTO _tickets;

  -- 7. Origem/Funnel metrics (invites)
  SELECT json_build_object(
    'convites_7d', (
      SELECT COUNT(*) FROM convites c
      WHERE c.criado_em >= week_ago
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND c.escopo_cidade = _scope_cidade)
        )
    ),
    'leads_7d', (
      SELECT COUNT(*) FROM profiles p
      WHERE p.created_at >= week_ago
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND p.city = _scope_cidade)
        )
    ),
    'aprovados_7d', (
      SELECT COUNT(*) FROM profiles p
      WHERE p.approved_at >= week_ago
        AND p.volunteer_status = 'ativo'
        AND (
          _scope_type = 'all' OR
          (_scope_type = 'cidade' AND p.city = _scope_cidade)
        )
    )
  ) INTO _origem_funil;

  -- Build final result
  result := json_build_object(
    'ciclo_ativo', _ciclo_ativo,
    'voluntarios', _voluntarios,
    'missoes', _missoes,
    'demandas', _demandas,
    'agenda_7d', _agenda_7d,
    'tickets', _tickets,
    'origem_funil', _origem_funil,
    'generated_at', _now
  );

  RETURN result;
END;
$$;

-- Create ops_cycle RPC - detailed cycle view
CREATE OR REPLACE FUNCTION public.ops_cycle(_cycle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  _cycle record;
BEGIN
  -- Verify caller is coordinator
  IF NOT is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Get cycle data
  SELECT * INTO _cycle FROM ciclos_semanais WHERE id = _cycle_id;
  
  IF _cycle IS NULL THEN
    RAISE EXCEPTION 'Ciclo não encontrado';
  END IF;

  SELECT json_build_object(
    'ciclo', json_build_object(
      'id', _cycle.id,
      'titulo', _cycle.titulo,
      'status', _cycle.status,
      'inicio', _cycle.inicio,
      'fim', _cycle.fim,
      'cidade', _cycle.cidade,
      'celula_id', _cycle.celula_id,
      'metas_json', _cycle.metas_json,
      'fechamento_json', _cycle.fechamento_json,
      'fechado_em', _cycle.fechado_em
    ),
    'missoes', (
      SELECT json_build_object(
        'total', COUNT(*),
        'por_status', json_object_agg(COALESCE(status::text, 'unknown'), cnt)
      ) FROM (
        SELECT status, COUNT(*) as cnt
        FROM missions
        WHERE ciclo_id = _cycle_id
        GROUP BY status
      ) s
    ),
    'evidencias_pendentes', (
      SELECT COUNT(*) FROM evidences e
      JOIN missions m ON m.id = e.mission_id
      WHERE m.ciclo_id = _cycle_id AND e.status = 'pendente'
    ),
    'atividades', (
      SELECT json_build_object(
        'total', COUNT(*),
        'publicadas', COUNT(*) FILTER (WHERE status = 'publicada'),
        'rsvp_vou', (
          SELECT COUNT(*) FROM atividade_rsvp r
          JOIN atividades a ON a.id = r.atividade_id
          WHERE a.ciclo_id = _cycle_id AND r.status = 'vou'
        ),
        'rsvp_talvez', (
          SELECT COUNT(*) FROM atividade_rsvp r
          JOIN atividades a ON a.id = r.atividade_id
          WHERE a.ciclo_id = _cycle_id AND r.status = 'talvez'
        )
      )
      FROM atividades WHERE ciclo_id = _cycle_id
    ),
    'anuncios', (
      SELECT COUNT(*) FROM anuncios 
      WHERE ciclo_id = _cycle_id AND status = 'PUBLICADO'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute to authenticated users (security is in the functions)
GRANT EXECUTE ON FUNCTION public.ops_overview TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_cycle TO authenticated;