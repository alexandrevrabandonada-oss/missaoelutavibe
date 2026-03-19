-- =============================================
-- REPLICAÇÃO v0: Transform top items into replicable missions/tasks
-- =============================================

-- A) replicacoes table - tracks what has been replicated
CREATE TABLE public.replicacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  scope_tipo TEXT NOT NULL CHECK (scope_tipo IN ('celula', 'cidade')),
  scope_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('mission', 'mural_post')),
  source_id UUID NOT NULL,
  created_mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  created_task_id UUID REFERENCES public.squad_tasks(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_start, scope_tipo, scope_id, source_type, source_id)
);

-- Indexes
CREATE INDEX idx_replicacoes_week_scope ON public.replicacoes(week_start, scope_tipo, scope_id);
CREATE INDEX idx_replicacoes_source ON public.replicacoes(source_type, source_id);

-- Enable RLS
ALTER TABLE public.replicacoes ENABLE ROW LEVEL SECURITY;

-- RLS: coord/admin can view replicacoes for their scope
CREATE POLICY "Coord can view replicacoes"
ON public.replicacoes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
  )
  OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

-- RLS: coord/admin can insert replicacoes
CREATE POLICY "Coord can create replicacoes"
ON public.replicacoes FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
    )
    OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  )
);

-- =============================================
-- RPC: Get active cycle for a scope
-- =============================================
CREATE OR REPLACE FUNCTION public.get_active_cycle_for_scope(
  _scope_tipo TEXT,
  _scope_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cycle_id UUID;
BEGIN
  -- Try to find cycle for celula first
  IF _scope_tipo = 'celula' THEN
    SELECT id INTO _cycle_id
    FROM ciclos_semanais
    WHERE celula_id = _scope_id::uuid
      AND status = 'ativo'
      AND now() BETWEEN inicio AND fim
    LIMIT 1;
    
    IF _cycle_id IS NOT NULL THEN
      RETURN _cycle_id;
    END IF;
    
    -- Fallback to city cycle
    SELECT cs.id INTO _cycle_id
    FROM ciclos_semanais cs
    JOIN cells c ON c.id = _scope_id::uuid
    WHERE cs.cidade = c.city
      AND cs.celula_id IS NULL
      AND cs.status = 'ativo'
      AND now() BETWEEN cs.inicio AND cs.fim
    LIMIT 1;
    
    RETURN _cycle_id;
  END IF;
  
  -- City scope
  IF _scope_tipo = 'cidade' THEN
    SELECT id INTO _cycle_id
    FROM ciclos_semanais
    WHERE cidade = _scope_id
      AND celula_id IS NULL
      AND status = 'ativo'
      AND now() BETWEEN inicio AND fim
    LIMIT 1;
    
    RETURN _cycle_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- =============================================
-- RPC: Create replicable mission from top item
-- =============================================
CREATE OR REPLACE FUNCTION public.create_replicable_mission_from_top(
  _week_start DATE,
  _scope_tipo TEXT,
  _scope_id TEXT,
  _source_type TEXT,
  _source_id UUID,
  _options_json JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _cycle_id UUID;
  _mission_id UUID;
  _mural_post_id UUID;
  _titulo TEXT;
  _descricao TEXT;
  _publicar_no_mural BOOLEAN;
  _cell_id UUID;
  _existing_id UUID;
BEGIN
  -- Check authorization (must be coord/admin)
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
  ) AND NOT EXISTS (SELECT 1 FROM admins WHERE user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autorizado');
  END IF;

  -- Check for existing replication (dedupe)
  SELECT id INTO _existing_id
  FROM replicacoes
  WHERE week_start = _week_start
    AND scope_tipo = _scope_tipo
    AND scope_id = _scope_id
    AND source_type = _source_type
    AND source_id = _source_id
    AND created_mission_id IS NOT NULL;
  
  IF _existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já existe missão replicável para este item nesta semana');
  END IF;

  -- Get active cycle
  _cycle_id := get_active_cycle_for_scope(_scope_tipo, _scope_id);

  -- Parse options
  _titulo := COALESCE(_options_json->>'titulo', 'Missão Replicável');
  _descricao := COALESCE(_options_json->>'descricao', '');
  _publicar_no_mural := COALESCE((_options_json->>'publicar_no_mural')::boolean, false);

  -- Determine cell_id if scope is celula
  IF _scope_tipo = 'celula' THEN
    _cell_id := _scope_id::uuid;
  END IF;

  -- Create the mission with meta_json
  INSERT INTO missions (
    title,
    description,
    type,
    status,
    ciclo_id,
    cell_id,
    created_by,
    meta_json
  ) VALUES (
    _titulo,
    _descricao,
    'divulgacao',
    'publicada',
    _cycle_id,
    _cell_id,
    _user_id,
    jsonb_build_object(
      'oficial', true,
      'kind', 'replicavel',
      'source_type', _source_type,
      'source_id', _source_id
    )
  )
  RETURNING id INTO _mission_id;

  -- Create replicacoes record
  INSERT INTO replicacoes (
    week_start,
    scope_tipo,
    scope_id,
    source_type,
    source_id,
    created_mission_id,
    created_by
  ) VALUES (
    _week_start,
    _scope_tipo,
    _scope_id,
    _source_type,
    _source_id,
    _mission_id,
    _user_id
  );

  -- Optionally publish to mural
  IF _publicar_no_mural THEN
    INSERT INTO mural_posts (
      autor_user_id,
      escopo_tipo,
      escopo_id,
      ciclo_id,
      mission_id,
      tipo,
      titulo,
      corpo_markdown,
      status
    ) VALUES (
      _user_id,
      _scope_tipo,
      _scope_id,
      _cycle_id,
      _mission_id,
      'chamado',
      _titulo,
      'Nova missão replicável disponível! Confira os detalhes e participe.',
      'publicado'
    )
    RETURNING id INTO _mural_post_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'mission_id', _mission_id,
    'mural_post_id', _mural_post_id,
    'cycle_id', _cycle_id
  );
END;
$$;

-- =============================================
-- RPC: Create task from top item
-- =============================================
CREATE OR REPLACE FUNCTION public.create_task_from_top(
  _week_start DATE,
  _scope_tipo TEXT,
  _scope_id TEXT,
  _source_type TEXT,
  _source_id UUID,
  _squad_id UUID,
  _options_json JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _cycle_id UUID;
  _task_id UUID;
  _titulo TEXT;
  _descricao TEXT;
  _prioridade TEXT;
  _prazo_em TIMESTAMPTZ;
  _assigned_to UUID;
  _existing_id UUID;
  _replicacao_id UUID;
BEGIN
  -- Check authorization
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
  ) AND NOT EXISTS (SELECT 1 FROM admins WHERE user_id = _user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autorizado');
  END IF;

  -- Check for existing task replication (dedupe)
  SELECT id INTO _existing_id
  FROM replicacoes
  WHERE week_start = _week_start
    AND scope_tipo = _scope_tipo
    AND scope_id = _scope_id
    AND source_type = _source_type
    AND source_id = _source_id
    AND created_task_id IS NOT NULL;
  
  IF _existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já existe tarefa para este item nesta semana');
  END IF;

  -- Get active cycle
  _cycle_id := get_active_cycle_for_scope(_scope_tipo, _scope_id);

  -- Parse options
  _titulo := COALESCE(_options_json->>'titulo', 'Tarefa de Replicação');
  _descricao := COALESCE(_options_json->>'descricao', '');
  _prioridade := COALESCE(_options_json->>'prioridade', 'media');
  
  IF _options_json->>'prazo_em' IS NOT NULL THEN
    _prazo_em := (_options_json->>'prazo_em')::timestamptz;
  END IF;
  
  IF _options_json->>'assigned_to' IS NOT NULL THEN
    _assigned_to := (_options_json->>'assigned_to')::uuid;
  END IF;

  -- Create the task
  INSERT INTO squad_tasks (
    squad_id,
    titulo,
    descricao,
    prioridade,
    prazo_em,
    assigned_to,
    ciclo_id,
    status,
    created_by
  ) VALUES (
    _squad_id,
    _titulo,
    _descricao,
    _prioridade::squad_task_prioridade,
    _prazo_em,
    _assigned_to,
    _cycle_id,
    'aberta',
    _user_id
  )
  RETURNING id INTO _task_id;

  -- Check if replicacao record exists (may have been created by mission)
  SELECT id INTO _replicacao_id
  FROM replicacoes
  WHERE week_start = _week_start
    AND scope_tipo = _scope_tipo
    AND scope_id = _scope_id
    AND source_type = _source_type
    AND source_id = _source_id;

  IF _replicacao_id IS NOT NULL THEN
    -- Update existing record
    UPDATE replicacoes
    SET created_task_id = _task_id
    WHERE id = _replicacao_id;
  ELSE
    -- Create new record
    INSERT INTO replicacoes (
      week_start,
      scope_tipo,
      scope_id,
      source_type,
      source_id,
      created_task_id,
      created_by
    ) VALUES (
      _week_start,
      _scope_tipo,
      _scope_id,
      _source_type,
      _source_id,
      _task_id,
      _user_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', _task_id,
    'cycle_id', _cycle_id
  );
END;
$$;

-- =============================================
-- RPC: Get replicacoes metrics
-- =============================================
CREATE OR REPLACE FUNCTION public.get_replicacoes_metrics(
  _week_start DATE,
  _scope_tipo TEXT,
  _scope_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _criadas_missao INT;
  _criadas_tarefa INT;
  _concluidas_missao INT;
  _pendentes INT;
BEGIN
  -- Count missions created
  SELECT COUNT(*) INTO _criadas_missao
  FROM replicacoes
  WHERE week_start = _week_start
    AND scope_tipo = _scope_tipo
    AND scope_id = _scope_id
    AND created_mission_id IS NOT NULL;

  -- Count tasks created
  SELECT COUNT(*) INTO _criadas_tarefa
  FROM replicacoes
  WHERE week_start = _week_start
    AND scope_tipo = _scope_tipo
    AND scope_id = _scope_id
    AND created_task_id IS NOT NULL;

  -- Count completed missions
  SELECT COUNT(*) INTO _concluidas_missao
  FROM replicacoes r
  JOIN missions m ON m.id = r.created_mission_id
  WHERE r.week_start = _week_start
    AND r.scope_tipo = _scope_tipo
    AND r.scope_id = _scope_id
    AND m.status = 'concluida';

  -- Pending = created but not completed
  _pendentes := _criadas_missao - _concluidas_missao;

  RETURN jsonb_build_object(
    'criadas_missao', _criadas_missao,
    'criadas_tarefa', _criadas_tarefa,
    'concluidas_missao', _concluidas_missao,
    'pendentes', _pendentes,
    'total', _criadas_missao + _criadas_tarefa
  );
END;
$$;

-- =============================================
-- RPC: Check if item is already replicated
-- =============================================
CREATE OR REPLACE FUNCTION public.check_replicacao_exists(
  _week_start DATE,
  _scope_tipo TEXT,
  _scope_id TEXT,
  _source_type TEXT,
  _source_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec RECORD;
BEGIN
  SELECT 
    created_mission_id,
    created_task_id
  INTO _rec
  FROM replicacoes
  WHERE week_start = _week_start
    AND scope_tipo = _scope_tipo
    AND scope_id = _scope_id
    AND source_type = _source_type
    AND source_id = _source_id;

  IF _rec IS NULL THEN
    RETURN jsonb_build_object(
      'exists', false,
      'has_mission', false,
      'has_task', false
    );
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'has_mission', _rec.created_mission_id IS NOT NULL,
    'has_task', _rec.created_task_id IS NOT NULL,
    'mission_id', _rec.created_mission_id,
    'task_id', _rec.created_task_id
  );
END;
$$;