-- ============================================
-- MISSÕES DE RUA v0 - Street micro-actions
-- ============================================

-- No new mission_type needed - "rua" already exists in the enum

-- Create RPC to generate street mission with daily dedupe
CREATE OR REPLACE FUNCTION public.generate_street_mission(
  _acao text DEFAULT 'panfletar',
  _tempo_estimado int DEFAULT 10,
  _bairro text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _today date := current_date;
  _existing_mission_id uuid;
  _new_mission_id uuid;
  _active_cycle_id uuid;
  _user_city text;
  _user_cell_id uuid;
  _user_bairro text;
  _mission_title text;
  _acao_label text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Get user scope info
  SELECT city, cell_id, bairro INTO _user_city, _user_cell_id, _user_bairro
  FROM public.profiles
  WHERE id = _user_id;

  -- Use provided bairro or fallback to user's bairro
  IF _bairro IS NULL THEN
    _bairro := _user_bairro;
  END IF;

  -- Check for existing street mission created by this user today (dedupe 1/day)
  SELECT id INTO _existing_mission_id
  FROM public.missions
  WHERE assigned_to = _user_id
    AND type = 'rua'
    AND DATE(created_at) = _today
    AND meta_json->>'kind' = 'street_micro'
  LIMIT 1;

  IF _existing_mission_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'mission_id', _existing_mission_id,
      'already_exists', true,
      'message', 'Você já gerou uma missão de rua hoje'
    );
  END IF;

  -- Find active cycle using scope priority: cell > city > global
  SELECT id INTO _active_cycle_id FROM public.ciclos_semanais
  WHERE status = 'ativo' AND celula_id = _user_cell_id
  LIMIT 1;
  
  IF _active_cycle_id IS NULL AND _user_city IS NOT NULL THEN
    SELECT id INTO _active_cycle_id FROM public.ciclos_semanais
    WHERE status = 'ativo' AND cidade = _user_city AND celula_id IS NULL
    LIMIT 1;
  END IF;
  
  IF _active_cycle_id IS NULL THEN
    SELECT id INTO _active_cycle_id FROM public.ciclos_semanais
    WHERE status = 'ativo' AND cidade IS NULL AND celula_id IS NULL
    LIMIT 1;
  END IF;

  -- Map acao to label
  CASE _acao
    WHEN 'panfletar' THEN _acao_label := 'Panfletagem';
    WHEN 'rodinha' THEN _acao_label := 'Rodinha de Conversa';
    WHEN 'visitar' THEN _acao_label := 'Visita Domiciliar';
    WHEN 'comercio' THEN _acao_label := 'Visita ao Comércio';
    ELSE _acao_label := 'Ação de Rua';
  END CASE;

  _mission_title := _acao_label || ' (' || _tempo_estimado || ' min)';

  -- Create the street mission
  INSERT INTO public.missions (
    title,
    description,
    instructions,
    type,
    status,
    assigned_to,
    created_by,
    ciclo_id,
    privado,
    requires_validation,
    meta_json
  ) VALUES (
    _mission_title,
    'Micro-ação de rua: ' || _acao_label || 
    CASE WHEN _bairro IS NOT NULL THEN ' no bairro ' || _bairro ELSE '' END ||
    '. Tempo estimado: ' || _tempo_estimado || ' minutos.',
    'Instruções:' || E'\n' ||
    '1. Vá até o local escolhido' || E'\n' ||
    '2. Realize a ação por ' || _tempo_estimado || ' minutos' || E'\n' ||
    '3. Use seu QR Code para convidar pessoas' || E'\n' ||
    '4. Ao concluir, marque as opções abaixo',
    'rua',
    'em_andamento',
    _user_id,
    _user_id,
    _active_cycle_id,
    true,  -- privado
    false, -- requires_validation = false (light proof)
    jsonb_build_object(
      'kind', 'street_micro',
      'acao', _acao,
      'tempo_estimado', _tempo_estimado,
      'bairro', _bairro,
      'cidade', _user_city,
      'cta_qr', true,
      'generated_at', now()
    )
  )
  RETURNING id INTO _new_mission_id;

  RETURN jsonb_build_object(
    'success', true,
    'mission_id', _new_mission_id,
    'already_exists', false
  );
END;
$$;

-- Create RPC to complete street mission with light proof
CREATE OR REPLACE FUNCTION public.complete_street_mission(
  _mission_id uuid,
  _checkboxes jsonb, -- e.g. {"conversas_iniciadas": true, "qr_mostrado": true, "panfletos_entregues": true}
  _photo_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _mission_record RECORD;
  _meta jsonb;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Get mission and verify ownership
  SELECT * INTO _mission_record
  FROM public.missions
  WHERE id = _mission_id AND assigned_to = _user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'mission_not_found');
  END IF;

  IF _mission_record.status NOT IN ('em_andamento', 'publicada') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  -- Update meta_json with completion data
  _meta := COALESCE(_mission_record.meta_json, '{}'::jsonb);
  _meta := _meta || jsonb_build_object(
    'completed_at', now(),
    'completion_checkboxes', _checkboxes,
    'has_photo', _photo_url IS NOT NULL
  );

  -- Update mission to concluida (no validation needed for light proof)
  UPDATE public.missions
  SET status = 'concluida',
      meta_json = _meta,
      updated_at = now()
  WHERE id = _mission_id;

  -- Log growth event (no PII - only aggregates)
  INSERT INTO public.growth_events (
    event_type,
    user_id,
    scope_cidade,
    meta
  ) VALUES (
    'street_mission_done',
    _user_id,
    (_mission_record.meta_json->>'cidade')::text,
    jsonb_build_object(
      'acao', _mission_record.meta_json->>'acao',
      'tempo_estimado', (_mission_record.meta_json->>'tempo_estimado')::int,
      'bairro', _mission_record.meta_json->>'bairro',
      'checkboxes', _checkboxes,
      'has_photo', _photo_url IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'mission_id', _mission_id
  );
END;
$$;

-- Create RPC to get street mission metrics for Ops (no PII)
CREATE OR REPLACE FUNCTION public.get_street_mission_metrics(
  _period_days int DEFAULT 7,
  _scope_cidade text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start_date timestamptz := now() - (_period_days || ' days')::interval;
  _result jsonb;
BEGIN
  -- Only allow coordinators/admins
  IF NOT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual')
  ) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  WITH generated AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'concluida') as concluidas,
      COUNT(*) FILTER (WHERE status = 'em_andamento') as em_andamento
    FROM public.missions
    WHERE type = 'rua'
      AND meta_json->>'kind' = 'street_micro'
      AND created_at >= _start_date
      AND (_scope_cidade IS NULL OR meta_json->>'cidade' = _scope_cidade)
  ),
  by_acao AS (
    SELECT 
      meta_json->>'acao' as acao,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'concluida') as concluidas
    FROM public.missions
    WHERE type = 'rua'
      AND meta_json->>'kind' = 'street_micro'
      AND created_at >= _start_date
      AND (_scope_cidade IS NULL OR meta_json->>'cidade' = _scope_cidade)
    GROUP BY meta_json->>'acao'
    ORDER BY total DESC
  ),
  top_bairros AS (
    SELECT 
      meta_json->>'bairro' as bairro,
      COUNT(*) as total
    FROM public.missions
    WHERE type = 'rua'
      AND meta_json->>'kind' = 'street_micro'
      AND meta_json->>'bairro' IS NOT NULL
      AND created_at >= _start_date
      AND (_scope_cidade IS NULL OR meta_json->>'cidade' = _scope_cidade)
    GROUP BY meta_json->>'bairro'
    ORDER BY total DESC
    LIMIT 5
  ),
  top_cidades AS (
    SELECT 
      meta_json->>'cidade' as cidade,
      COUNT(*) as total
    FROM public.missions
    WHERE type = 'rua'
      AND meta_json->>'kind' = 'street_micro'
      AND meta_json->>'cidade' IS NOT NULL
      AND created_at >= _start_date
    GROUP BY meta_json->>'cidade'
    ORDER BY total DESC
    LIMIT 5
  )
  SELECT jsonb_build_object(
    'periodo_dias', _period_days,
    'total_geradas', (SELECT total FROM generated),
    'total_concluidas', (SELECT concluidas FROM generated),
    'em_andamento', (SELECT em_andamento FROM generated),
    'taxa_conclusao', CASE 
      WHEN (SELECT total FROM generated) > 0 
      THEN ROUND(((SELECT concluidas FROM generated)::numeric / (SELECT total FROM generated)::numeric) * 100)
      ELSE 0 
    END,
    'por_acao', (SELECT COALESCE(jsonb_agg(jsonb_build_object('acao', acao, 'total', total, 'concluidas', concluidas)), '[]'::jsonb) FROM by_acao),
    'top_bairros', (SELECT COALESCE(jsonb_agg(jsonb_build_object('bairro', bairro, 'total', total)), '[]'::jsonb) FROM top_bairros),
    'top_cidades', (SELECT COALESCE(jsonb_agg(jsonb_build_object('cidade', cidade, 'total', total)), '[]'::jsonb) FROM top_cidades)
  ) INTO _result;

  RETURN _result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.generate_street_mission(text, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_street_mission(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_street_mission_metrics(int, text) TO authenticated;