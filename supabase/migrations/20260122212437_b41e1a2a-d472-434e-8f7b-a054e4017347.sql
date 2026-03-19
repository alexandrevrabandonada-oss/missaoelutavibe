-- Step 1: Add receipt columns to atividades table
ALTER TABLE public.atividades
ADD COLUMN IF NOT EXISTS concluida_em timestamptz,
ADD COLUMN IF NOT EXISTS concluida_por uuid,
ADD COLUMN IF NOT EXISTS recibo_json jsonb;

-- Step 2: Update ops_overview to include activity receipt metrics
CREATE OR REPLACE FUNCTION public.ops_overview(
  _scope_type text DEFAULT 'global',
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
  v_ciclo_ativo record;
  v_now timestamptz := now();
  v_7d_ago timestamptz := now() - interval '7 days';
  v_48h_future timestamptz := now() + interval '48 hours';
BEGIN
  -- Security check
  IF NOT is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get active cycle for scope
  SELECT id, titulo, status, inicio, fim, metas_json, fechamento_json
  INTO v_ciclo_ativo
  FROM ciclos_semanais
  WHERE status = 'ativo'
    AND (
      (_scope_type = 'global') OR
      (_scope_type = 'cidade' AND cidade = _scope_cidade) OR
      (_scope_type = 'celula' AND celula_id = _scope_celula_id)
    )
  ORDER BY inicio DESC
  LIMIT 1;

  SELECT json_build_object(
    'ciclo_ativo', CASE WHEN v_ciclo_ativo.id IS NOT NULL THEN
      json_build_object(
        'id', v_ciclo_ativo.id,
        'titulo', v_ciclo_ativo.titulo,
        'status', v_ciclo_ativo.status,
        'inicio', v_ciclo_ativo.inicio,
        'fim', v_ciclo_ativo.fim,
        'metas_count', COALESCE(jsonb_array_length(v_ciclo_ativo.metas_json), 0),
        'tem_plano', EXISTS(
          SELECT 1 FROM anuncios 
          WHERE ciclo_id = v_ciclo_ativo.id 
          AND status = 'PUBLICADO' 
          AND fixado = true
        ),
        'tem_recibo', v_ciclo_ativo.fechamento_json IS NOT NULL
      )
    ELSE NULL END,
    
    'voluntarios', json_build_object(
      'aprovados_total', (
        SELECT COUNT(*) FROM profiles 
        WHERE volunteer_status = 'aprovado'
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND city = _scope_cidade) OR
          (_scope_type = 'celula' AND id IN (
            SELECT user_id FROM cell_memberships WHERE cell_id = _scope_celula_id AND is_active = true
          ))
        )
      ),
      'pendentes_validacao', (
        SELECT COUNT(*) FROM profiles 
        WHERE volunteer_status = 'pendente'
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND city = _scope_cidade)
        )
      ),
      'ativos_7d', (
        SELECT COUNT(DISTINCT user_id) FROM (
          SELECT user_id FROM evidences WHERE created_at >= v_7d_ago
          UNION
          SELECT user_id FROM atividade_rsvp WHERE updated_at >= v_7d_ago AND status IN ('vou', 'talvez')
          UNION
          SELECT criado_por FROM tickets WHERE criado_em >= v_7d_ago
        ) active_users
        WHERE (
          _scope_type = 'global' OR
          user_id IN (
            SELECT id FROM profiles WHERE 
              (_scope_type = 'cidade' AND city = _scope_cidade) OR
              (_scope_type = 'celula' AND id IN (
                SELECT user_id FROM cell_memberships WHERE cell_id = _scope_celula_id
              ))
          )
        )
      )
    ),
    
    'missoes', json_build_object(
      'abertas', (
        SELECT COUNT(*) FROM missions 
        WHERE status = 'aberta'
        AND (ciclo_id = v_ciclo_ativo.id OR (v_ciclo_ativo.id IS NULL AND created_at >= v_7d_ago))
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND cell_id IN (SELECT id FROM cells WHERE city = _scope_cidade)) OR
          (_scope_type = 'celula' AND cell_id = _scope_celula_id)
        )
      ),
      'em_execucao', (
        SELECT COUNT(*) FROM missions 
        WHERE status = 'em_execucao'
        AND (ciclo_id = v_ciclo_ativo.id OR (v_ciclo_ativo.id IS NULL AND created_at >= v_7d_ago))
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND cell_id IN (SELECT id FROM cells WHERE city = _scope_cidade)) OR
          (_scope_type = 'celula' AND cell_id = _scope_celula_id)
        )
      ),
      'concluidas', (
        SELECT COUNT(*) FROM missions 
        WHERE status = 'concluida'
        AND (ciclo_id = v_ciclo_ativo.id OR (v_ciclo_ativo.id IS NULL AND created_at >= v_7d_ago))
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND cell_id IN (SELECT id FROM cells WHERE city = _scope_cidade)) OR
          (_scope_type = 'celula' AND cell_id = _scope_celula_id)
        )
      ),
      'pendentes_validacao', (
        SELECT COUNT(*) FROM evidences e
        JOIN missions m ON e.mission_id = m.id
        WHERE e.status = 'pendente'
        AND (m.ciclo_id = v_ciclo_ativo.id OR (v_ciclo_ativo.id IS NULL AND e.created_at >= v_7d_ago))
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND m.cell_id IN (SELECT id FROM cells WHERE city = _scope_cidade)) OR
          (_scope_type = 'celula' AND m.cell_id = _scope_celula_id)
        )
      )
    ),
    
    'demandas', json_build_object(
      'novas', (SELECT COUNT(*) FROM demandas WHERE status = 'nova' AND created_at >= v_7d_ago),
      'em_triagem', (SELECT COUNT(*) FROM demandas WHERE status = 'em_analise' AND created_at >= v_7d_ago),
      'virou_missao', (SELECT COUNT(*) FROM demandas WHERE status = 'em_andamento' AND created_at >= v_7d_ago),
      'arquivadas', (SELECT COUNT(*) FROM demandas WHERE status = 'arquivada' AND created_at >= v_7d_ago)
    ),
    
    'agenda_7d', json_build_object(
      'atividades_publicadas', (
        SELECT COUNT(*) FROM atividades 
        WHERE status = 'publicada'
        AND inicio_em >= v_now AND inicio_em <= v_now + interval '7 days'
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND celula_id = _scope_celula_id)
        )
      ),
      'proximas_48h', (
        SELECT COUNT(*) FROM atividades 
        WHERE status = 'publicada'
        AND inicio_em >= v_now AND inicio_em <= v_48h_future
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND celula_id = _scope_celula_id)
        )
      ),
      'rsvp_vou', (
        SELECT COUNT(*) FROM atividade_rsvp r
        JOIN atividades a ON r.atividade_id = a.id
        WHERE r.status = 'vou'
        AND a.inicio_em >= v_now AND a.inicio_em <= v_now + interval '7 days'
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND a.cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND a.celula_id = _scope_celula_id)
        )
      ),
      'rsvp_talvez', (
        SELECT COUNT(*) FROM atividade_rsvp r
        JOIN atividades a ON r.atividade_id = a.id
        WHERE r.status = 'talvez'
        AND a.inicio_em >= v_now AND a.inicio_em <= v_now + interval '7 days'
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND a.cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND a.celula_id = _scope_celula_id)
        )
      ),
      'concluidas_7d', (
        SELECT COUNT(*) FROM atividades 
        WHERE status = 'concluida'
        AND concluida_em >= v_7d_ago
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND celula_id = _scope_celula_id)
        )
      ),
      'pendente_recibo', (
        SELECT COUNT(*) FROM atividades 
        WHERE status = 'concluida'
        AND recibo_json IS NULL
        AND concluida_em >= v_7d_ago
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND celula_id = _scope_celula_id)
        )
      ),
      'checkins_7d', (
        SELECT COUNT(*) FROM atividade_rsvp r
        JOIN atividades a ON r.atividade_id = a.id
        WHERE r.checkin_em IS NOT NULL
        AND r.checkin_em >= v_7d_ago
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND a.cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND a.celula_id = _scope_celula_id)
        )
      )
    ),
    
    'tickets', json_build_object(
      'abertos', (
        SELECT COUNT(*) FROM tickets 
        WHERE status IN ('ABERTO', 'EM_ATENDIMENTO')
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND celula_id = _scope_celula_id)
        )
      ),
      'mais_antigo_dias', (
        SELECT EXTRACT(DAY FROM (v_now - MIN(criado_em)))::int
        FROM tickets 
        WHERE status IN ('ABERTO', 'EM_ATENDIMENTO')
        AND (
          _scope_type = 'global' OR
          (_scope_type = 'cidade' AND cidade = _scope_cidade) OR
          (_scope_type = 'celula' AND celula_id = _scope_celula_id)
        )
      )
    ),
    
    'funil', json_build_object(
      'convites_7d', (SELECT COUNT(*) FROM convites WHERE criado_em >= v_7d_ago),
      'leads_7d', (SELECT COUNT(*) FROM profiles WHERE created_at >= v_7d_ago),
      'aprovados_7d', (SELECT COUNT(*) FROM profiles WHERE approved_at >= v_7d_ago)
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Step 3: Update ops_cycle to include receipt info
CREATE OR REPLACE FUNCTION public.ops_cycle(_cycle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_ciclo record;
BEGIN
  -- Security check
  IF NOT is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get cycle info
  SELECT * INTO v_ciclo FROM ciclos_semanais WHERE id = _cycle_id;
  
  IF v_ciclo IS NULL THEN
    RAISE EXCEPTION 'Cycle not found';
  END IF;

  SELECT json_build_object(
    'ciclo', json_build_object(
      'id', v_ciclo.id,
      'titulo', v_ciclo.titulo,
      'status', v_ciclo.status,
      'inicio', v_ciclo.inicio,
      'fim', v_ciclo.fim,
      'metas_json', v_ciclo.metas_json,
      'fechamento_json', v_ciclo.fechamento_json
    ),
    'missoes', json_build_object(
      'total', (SELECT COUNT(*) FROM missions WHERE ciclo_id = _cycle_id),
      'abertas', (SELECT COUNT(*) FROM missions WHERE ciclo_id = _cycle_id AND status = 'aberta'),
      'em_execucao', (SELECT COUNT(*) FROM missions WHERE ciclo_id = _cycle_id AND status = 'em_execucao'),
      'concluidas', (SELECT COUNT(*) FROM missions WHERE ciclo_id = _cycle_id AND status = 'concluida'),
      'validadas', (SELECT COUNT(*) FROM missions WHERE ciclo_id = _cycle_id AND status = 'validada')
    ),
    'evidencias', json_build_object(
      'total', (SELECT COUNT(*) FROM evidences e JOIN missions m ON e.mission_id = m.id WHERE m.ciclo_id = _cycle_id),
      'pendentes', (SELECT COUNT(*) FROM evidences e JOIN missions m ON e.mission_id = m.id WHERE m.ciclo_id = _cycle_id AND e.status = 'pendente'),
      'aprovadas', (SELECT COUNT(*) FROM evidences e JOIN missions m ON e.mission_id = m.id WHERE m.ciclo_id = _cycle_id AND e.status = 'aprovada'),
      'rejeitadas', (SELECT COUNT(*) FROM evidences e JOIN missions m ON e.mission_id = m.id WHERE m.ciclo_id = _cycle_id AND e.status = 'rejeitada')
    ),
    'atividades', json_build_object(
      'total', (SELECT COUNT(*) FROM atividades WHERE ciclo_id = _cycle_id),
      'publicadas', (SELECT COUNT(*) FROM atividades WHERE ciclo_id = _cycle_id AND status = 'publicada'),
      'concluidas', (SELECT COUNT(*) FROM atividades WHERE ciclo_id = _cycle_id AND status = 'concluida'),
      'com_recibo', (SELECT COUNT(*) FROM atividades WHERE ciclo_id = _cycle_id AND status = 'concluida' AND recibo_json IS NOT NULL),
      'sem_recibo', (SELECT COUNT(*) FROM atividades WHERE ciclo_id = _cycle_id AND status = 'concluida' AND recibo_json IS NULL),
      'rsvp_vou', (SELECT COUNT(*) FROM atividade_rsvp r JOIN atividades a ON r.atividade_id = a.id WHERE a.ciclo_id = _cycle_id AND r.status = 'vou'),
      'rsvp_talvez', (SELECT COUNT(*) FROM atividade_rsvp r JOIN atividades a ON r.atividade_id = a.id WHERE a.ciclo_id = _cycle_id AND r.status = 'talvez'),
      'checkins', (SELECT COUNT(*) FROM atividade_rsvp r JOIN atividades a ON r.atividade_id = a.id WHERE a.ciclo_id = _cycle_id AND r.checkin_em IS NOT NULL)
    )
  ) INTO result;

  RETURN result;
END;
$$;