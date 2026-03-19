-- =============================================
-- CENTRAL DE MODERAÇÃO v0
-- Adiciona infraestrutura completa de moderação
-- =============================================

-- 1. Atualizar mural_reports com campos adicionais
ALTER TABLE public.mural_reports 
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS resolved_by UUID,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_note TEXT,
  ADD COLUMN IF NOT EXISTS action_taken TEXT CHECK (action_taken IS NULL OR action_taken IN ('ocultado', 'warning', 'mute', 'ban', 'nenhuma')),
  ADD COLUMN IF NOT EXISTS target_author_id UUID,
  ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'outro' CHECK (categoria IN ('spam', 'assedio', 'desinformacao', 'offtopic', 'outro'));

-- Atualizar check do status para incluir novos valores
ALTER TABLE public.mural_reports DROP CONSTRAINT IF EXISTS mural_reports_status_check;
ALTER TABLE public.mural_reports ADD CONSTRAINT mural_reports_status_check 
  CHECK (status IN ('pendente', 'aberto', 'em_analise', 'resolvido', 'descartado', 'revisado', 'ignorado'));

-- Preencher target_author_id em reports existentes
UPDATE public.mural_reports r
SET target_author_id = p.autor_user_id
FROM public.mural_posts p
WHERE r.post_id = p.id AND r.target_author_id IS NULL;

-- 2. Criar tabela moderacao_actions
CREATE TABLE IF NOT EXISTS public.moderacao_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_tipo TEXT NOT NULL CHECK (scope_tipo IN ('celula', 'cidade')),
  scope_id TEXT NOT NULL,
  report_id UUID REFERENCES public.mural_reports(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comentario', 'signal')),
  target_id UUID NOT NULL,
  target_author_id UUID,
  action_type TEXT NOT NULL CHECK (action_type IN ('ocultar', 'mostrar', 'resolver', 'descartar', 'warning', 'mute', 'ban', 'unmute', 'unban')),
  duration_hours INTEGER,
  note TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderacao_actions_scope 
  ON public.moderacao_actions(scope_tipo, scope_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderacao_actions_author 
  ON public.moderacao_actions(target_author_id, created_at DESC);

ALTER TABLE public.moderacao_actions ENABLE ROW LEVEL SECURITY;

-- 3. Criar tabela moderacao_sanctions
CREATE TABLE IF NOT EXISTS public.moderacao_sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_tipo TEXT NOT NULL CHECK (scope_tipo IN ('celula', 'cidade')),
  scope_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('warning', 'mute', 'ban')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scope_tipo, scope_id, user_id, kind, starts_at)
);

CREATE INDEX IF NOT EXISTS idx_moderacao_sanctions_active 
  ON public.moderacao_sanctions(scope_tipo, scope_id, user_id, ends_at);

ALTER TABLE public.moderacao_sanctions ENABLE ROW LEVEL SECURITY;

-- 4. Criar tabela moderacao_templates
CREATE TABLE IF NOT EXISTS public.moderacao_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_tipo TEXT NOT NULL CHECK (scope_tipo IN ('celula', 'cidade', 'global')),
  scope_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moderacao_templates_scope 
  ON public.moderacao_templates(scope_tipo, scope_id);

ALTER TABLE public.moderacao_templates ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNÇÃO is_sanctioned
-- Verifica se usuário tem sanção ativa no escopo
-- =============================================
CREATE OR REPLACE FUNCTION public.is_sanctioned(
  _scope_tipo TEXT,
  _scope_id TEXT,
  _user_id UUID,
  _kind TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM moderacao_sanctions
    WHERE scope_tipo = _scope_tipo
      AND scope_id = _scope_id
      AND user_id = _user_id
      AND (_kind IS NULL OR kind = _kind)
      AND starts_at <= now()
      AND (ends_at IS NULL OR ends_at > now())
  )
$$;

-- =============================================
-- FUNÇÃO can_moderate_scope
-- Verifica se usuário pode moderar um escopo
-- =============================================
CREATE OR REPLACE FUNCTION public.can_moderate_scope(
  _user_id UUID,
  _scope_tipo TEXT,
  _scope_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_admin(_user_id) OR
    (
      _scope_tipo = 'celula' AND 
      (can_moderate_cell(_user_id, _scope_id::uuid) OR 
       EXISTS (SELECT 1 FROM cells c WHERE c.id = _scope_id::uuid AND can_manage_cidade(_user_id, c.city)))
    ) OR
    (_scope_tipo = 'cidade' AND can_manage_cidade(_user_id, _scope_id))
$$;

-- =============================================
-- RPC get_moderation_queue
-- Retorna fila de reports por escopo
-- =============================================
CREATE OR REPLACE FUNCTION public.get_moderation_queue(
  _scope_tipo TEXT,
  _scope_id TEXT,
  _filters_json JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  report_id UUID,
  created_at TIMESTAMPTZ,
  motivo TEXT,
  categoria TEXT,
  status TEXT,
  target_type TEXT,
  target_id UUID,
  target_author_id UUID,
  author_nickname TEXT,
  report_count BIGINT,
  content_preview TEXT,
  assigned_to UUID,
  assigned_nickname TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status_filter TEXT;
  _target_type_filter TEXT;
  _assigned_filter BOOLEAN;
  _order_by TEXT;
BEGIN
  -- Verificar permissão
  IF NOT can_moderate_scope(auth.uid(), _scope_tipo, _scope_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Extrair filtros
  _status_filter := _filters_json->>'status';
  _target_type_filter := _filters_json->>'target_type';
  _assigned_filter := (_filters_json->>'my_assigned')::boolean;
  _order_by := COALESCE(_filters_json->>'order_by', 'recent');

  RETURN QUERY
  WITH report_counts AS (
    SELECT r.post_id, COUNT(*) as cnt
    FROM mural_reports r
    JOIN mural_posts p ON p.id = r.post_id
    WHERE p.escopo_tipo = _scope_tipo 
      AND p.escopo_id::text = _scope_id
    GROUP BY r.post_id
  ),
  ranked_reports AS (
    SELECT 
      r.id,
      r.created_at,
      r.motivo,
      r.categoria,
      r.status,
      'post'::text as target_type,
      r.post_id as target_id,
      COALESCE(r.target_author_id, p.autor_user_id) as target_author_id,
      LEFT(p.corpo_markdown, 100) as content_preview,
      r.assigned_to,
      rc.cnt as report_count,
      ROW_NUMBER() OVER (
        PARTITION BY r.post_id 
        ORDER BY r.created_at DESC
      ) as rn
    FROM mural_reports r
    JOIN mural_posts p ON p.id = r.post_id
    LEFT JOIN report_counts rc ON rc.post_id = r.post_id
    WHERE p.escopo_tipo = _scope_tipo 
      AND p.escopo_id::text = _scope_id
      AND (_status_filter IS NULL OR r.status = _status_filter OR 
           (_status_filter = 'open' AND r.status IN ('pendente', 'aberto', 'em_analise')))
      AND (_assigned_filter IS NOT TRUE OR r.assigned_to = auth.uid())
  )
  SELECT 
    rr.id as report_id,
    rr.created_at,
    rr.motivo,
    rr.categoria,
    rr.status,
    rr.target_type,
    rr.target_id,
    rr.target_author_id,
    pr.nickname as author_nickname,
    rr.report_count,
    rr.content_preview,
    rr.assigned_to,
    pa.nickname as assigned_nickname
  FROM ranked_reports rr
  LEFT JOIN profiles pr ON pr.id = rr.target_author_id
  LEFT JOIN profiles pa ON pa.id = rr.assigned_to
  WHERE rr.rn = 1
  ORDER BY 
    CASE WHEN _order_by = 'most_reported' THEN rr.report_count END DESC NULLS LAST,
    rr.created_at DESC
  LIMIT 100;
END;
$$;

-- =============================================
-- RPC moderate_action
-- Executa ação de moderação
-- =============================================
CREATE OR REPLACE FUNCTION public.moderate_action(
  _report_id UUID,
  _action_type TEXT,
  _payload_json JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _report RECORD;
  _post RECORD;
  _scope_tipo TEXT;
  _scope_id TEXT;
  _note TEXT;
  _duration_hours INTEGER;
  _template_id UUID;
  _set_status TEXT;
  _sanction_id UUID;
  _action_id UUID;
BEGIN
  -- Buscar report
  SELECT r.*, p.escopo_tipo, p.escopo_id, p.autor_user_id as post_author_id, p.corpo_markdown
  INTO _report
  FROM mural_reports r
  JOIN mural_posts p ON p.id = r.post_id
  WHERE r.id = _report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report não encontrado';
  END IF;

  _scope_tipo := _report.escopo_tipo;
  _scope_id := _report.escopo_id::text;

  -- Verificar permissão
  IF NOT can_moderate_scope(auth.uid(), _scope_tipo, _scope_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Extrair payload
  _note := _payload_json->>'note';
  _duration_hours := (_payload_json->>'duration_hours')::integer;
  _template_id := (_payload_json->>'template_id')::uuid;
  _set_status := _payload_json->>'set_status';

  -- Se tem template, buscar texto
  IF _template_id IS NOT NULL THEN
    SELECT body INTO _note FROM moderacao_templates WHERE id = _template_id;
  END IF;

  -- Executar ação
  CASE _action_type
    WHEN 'ocultar' THEN
      UPDATE mural_posts SET status = 'oculto', updated_at = now() WHERE id = _report.post_id;
      
    WHEN 'mostrar' THEN
      UPDATE mural_posts SET status = 'publicado', updated_at = now() WHERE id = _report.post_id;
      
    WHEN 'resolver' THEN
      UPDATE mural_reports 
      SET status = 'resolvido', 
          resolved_by = auth.uid(), 
          resolved_at = now(),
          resolution_note = _note,
          action_taken = COALESCE(_payload_json->>'action_taken', 'nenhuma')
      WHERE id = _report_id;
      
    WHEN 'descartar' THEN
      UPDATE mural_reports 
      SET status = 'descartado', 
          resolved_by = auth.uid(), 
          resolved_at = now(),
          resolution_note = _note
      WHERE id = _report_id;
      
    WHEN 'warning', 'mute', 'ban' THEN
      INSERT INTO moderacao_sanctions (
        scope_tipo, scope_id, user_id, kind, 
        starts_at, ends_at, reason, created_by
      ) VALUES (
        _scope_tipo, 
        _scope_id, 
        COALESCE(_report.target_author_id, _report.post_author_id),
        _action_type,
        now(),
        CASE WHEN _duration_hours IS NOT NULL THEN now() + (_duration_hours || ' hours')::interval END,
        _note,
        auth.uid()
      )
      RETURNING id INTO _sanction_id;
      
      -- Se mute/ban, também ocultar o post
      IF _action_type IN ('mute', 'ban') THEN
        UPDATE mural_posts SET status = 'oculto', updated_at = now() WHERE id = _report.post_id;
      END IF;
      
      -- Marcar report como resolvido
      UPDATE mural_reports 
      SET status = 'resolvido', 
          resolved_by = auth.uid(), 
          resolved_at = now(),
          resolution_note = _note,
          action_taken = _action_type
      WHERE id = _report_id;
      
    WHEN 'unmute', 'unban' THEN
      UPDATE moderacao_sanctions
      SET ends_at = now()
      WHERE scope_tipo = _scope_tipo
        AND scope_id = _scope_id
        AND user_id = COALESCE(_report.target_author_id, _report.post_author_id)
        AND kind = REPLACE(_action_type, 'un', '')
        AND (ends_at IS NULL OR ends_at > now());
        
    ELSE
      RAISE EXCEPTION 'Ação inválida: %', _action_type;
  END CASE;

  -- Registrar ação
  INSERT INTO moderacao_actions (
    scope_tipo, scope_id, report_id, target_type, target_id,
    target_author_id, action_type, duration_hours, note, created_by
  ) VALUES (
    _scope_tipo, 
    _scope_id, 
    _report_id, 
    'post', 
    _report.post_id,
    COALESCE(_report.target_author_id, _report.post_author_id),
    _action_type,
    _duration_hours,
    _note,
    auth.uid()
  )
  RETURNING id INTO _action_id;

  -- Registrar em audit_log
  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_data)
  VALUES (
    auth.uid(), 
    'moderation', 
    _report_id, 
    'moderate_' || _action_type,
    jsonb_build_object(
      'report_id', _report_id,
      'action_type', _action_type,
      'target_id', _report.post_id,
      'note', _note,
      'duration_hours', _duration_hours
    )
  );

  -- Assumir report se pedido
  IF (_payload_json->>'assign_to_me')::boolean = true THEN
    UPDATE mural_reports SET assigned_to = auth.uid() WHERE id = _report_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'action_id', _action_id,
    'sanction_id', _sanction_id
  );
END;
$$;

-- =============================================
-- RPC get_user_sanctions
-- Lista sanções de um usuário
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_sanctions(
  _scope_tipo TEXT,
  _scope_id TEXT,
  _user_id UUID
)
RETURNS TABLE (
  id UUID,
  kind TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  reason TEXT,
  is_active BOOLEAN,
  created_by UUID,
  moderator_nickname TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar permissão
  IF NOT can_moderate_scope(auth.uid(), _scope_tipo, _scope_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.kind,
    s.starts_at,
    s.ends_at,
    s.reason,
    (s.ends_at IS NULL OR s.ends_at > now()) as is_active,
    s.created_by,
    p.nickname as moderator_nickname,
    s.created_at
  FROM moderacao_sanctions s
  LEFT JOIN profiles p ON p.id = s.created_by
  WHERE s.scope_tipo = _scope_tipo
    AND s.scope_id = _scope_id
    AND s.user_id = _user_id
  ORDER BY s.created_at DESC
  LIMIT 50;
END;
$$;

-- =============================================
-- RPC get_moderation_metrics
-- Métricas para Ops
-- =============================================
CREATE OR REPLACE FUNCTION public.get_moderation_metrics(
  _scope_tipo TEXT,
  _scope_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _reports_open INTEGER;
  _hidden_posts INTEGER;
  _active_sanctions INTEGER;
BEGIN
  -- Verificar permissão
  IF NOT can_moderate_scope(auth.uid(), _scope_tipo, _scope_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Reports abertos
  SELECT COUNT(*) INTO _reports_open
  FROM mural_reports r
  JOIN mural_posts p ON p.id = r.post_id
  WHERE p.escopo_tipo = _scope_tipo 
    AND p.escopo_id::text = _scope_id
    AND r.status IN ('pendente', 'aberto', 'em_analise');

  -- Posts ocultos
  SELECT COUNT(*) INTO _hidden_posts
  FROM mural_posts
  WHERE escopo_tipo = _scope_tipo 
    AND escopo_id::text = _scope_id
    AND status = 'oculto';

  -- Sanções ativas
  SELECT COUNT(*) INTO _active_sanctions
  FROM moderacao_sanctions
  WHERE scope_tipo = _scope_tipo 
    AND scope_id = _scope_id
    AND (ends_at IS NULL OR ends_at > now());

  RETURN jsonb_build_object(
    'reports_open', _reports_open,
    'hidden_posts', _hidden_posts,
    'active_sanctions', _active_sanctions
  );
END;
$$;

-- =============================================
-- RPC direct_moderate_action (para ações fora de report)
-- =============================================
CREATE OR REPLACE FUNCTION public.direct_moderate_action(
  _scope_tipo TEXT,
  _scope_id TEXT,
  _target_type TEXT,
  _target_id UUID,
  _action_type TEXT,
  _payload_json JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_author_id UUID;
  _note TEXT;
  _duration_hours INTEGER;
  _sanction_id UUID;
  _action_id UUID;
BEGIN
  -- Verificar permissão
  IF NOT can_moderate_scope(auth.uid(), _scope_tipo, _scope_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Buscar autor do alvo
  IF _target_type = 'post' THEN
    SELECT autor_user_id INTO _target_author_id FROM mural_posts WHERE id = _target_id;
  ELSIF _target_type = 'comentario' THEN
    SELECT autor_user_id INTO _target_author_id FROM mural_comentarios WHERE id = _target_id;
  END IF;

  _note := _payload_json->>'note';
  _duration_hours := (_payload_json->>'duration_hours')::integer;

  -- Executar ação
  CASE _action_type
    WHEN 'ocultar' THEN
      IF _target_type = 'post' THEN
        UPDATE mural_posts SET status = 'oculto', updated_at = now() WHERE id = _target_id;
      ELSE
        UPDATE mural_comentarios SET status = 'oculto' WHERE id = _target_id;
      END IF;
      
    WHEN 'mostrar' THEN
      IF _target_type = 'post' THEN
        UPDATE mural_posts SET status = 'publicado', updated_at = now() WHERE id = _target_id;
      ELSE
        UPDATE mural_comentarios SET status = 'publicado' WHERE id = _target_id;
      END IF;
      
    WHEN 'warning', 'mute', 'ban' THEN
      INSERT INTO moderacao_sanctions (
        scope_tipo, scope_id, user_id, kind, 
        starts_at, ends_at, reason, created_by
      ) VALUES (
        _scope_tipo, _scope_id, _target_author_id, _action_type,
        now(),
        CASE WHEN _duration_hours IS NOT NULL THEN now() + (_duration_hours || ' hours')::interval END,
        _note,
        auth.uid()
      )
      RETURNING id INTO _sanction_id;
      
      -- Se mute/ban, também ocultar
      IF _action_type IN ('mute', 'ban') THEN
        IF _target_type = 'post' THEN
          UPDATE mural_posts SET status = 'oculto', updated_at = now() WHERE id = _target_id;
        ELSE
          UPDATE mural_comentarios SET status = 'oculto' WHERE id = _target_id;
        END IF;
      END IF;
      
    WHEN 'unmute', 'unban' THEN
      UPDATE moderacao_sanctions
      SET ends_at = now()
      WHERE scope_tipo = _scope_tipo
        AND scope_id = _scope_id
        AND user_id = _target_author_id
        AND kind = REPLACE(_action_type, 'un', '')
        AND (ends_at IS NULL OR ends_at > now());
        
    ELSE
      RAISE EXCEPTION 'Ação inválida: %', _action_type;
  END CASE;

  -- Registrar ação
  INSERT INTO moderacao_actions (
    scope_tipo, scope_id, report_id, target_type, target_id,
    target_author_id, action_type, duration_hours, note, created_by
  ) VALUES (
    _scope_tipo, _scope_id, NULL, _target_type, _target_id,
    _target_author_id, _action_type, _duration_hours, _note, auth.uid()
  )
  RETURNING id INTO _action_id;

  -- Audit log
  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_data)
  VALUES (
    auth.uid(), 'moderation', _target_id, 'direct_' || _action_type,
    jsonb_build_object(
      'target_type', _target_type,
      'target_id', _target_id,
      'action_type', _action_type,
      'note', _note
    )
  );

  RETURN jsonb_build_object('success', true, 'action_id', _action_id, 'sanction_id', _sanction_id);
END;
$$;

-- =============================================
-- RPC get_hidden_content
-- Lista conteúdo oculto
-- =============================================
CREATE OR REPLACE FUNCTION public.get_hidden_content(
  _scope_tipo TEXT,
  _scope_id TEXT,
  _target_type TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_preview TEXT,
  author_id UUID,
  author_nickname TEXT,
  hidden_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_moderate_scope(auth.uid(), _scope_tipo, _scope_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    'post'::text as content_type,
    LEFT(p.corpo_markdown, 100) as content_preview,
    p.autor_user_id as author_id,
    pr.nickname as author_nickname,
    p.updated_at as hidden_at,
    p.created_at
  FROM mural_posts p
  LEFT JOIN profiles pr ON pr.id = p.autor_user_id
  WHERE p.escopo_tipo = _scope_tipo 
    AND p.escopo_id::text = _scope_id
    AND p.status = 'oculto'
    AND (_target_type = 'all' OR _target_type = 'post')
  
  UNION ALL
  
  SELECT 
    c.id,
    'comentario'::text as content_type,
    LEFT(c.corpo_markdown, 100) as content_preview,
    c.autor_user_id as author_id,
    pr.nickname as author_nickname,
    c.created_at as hidden_at,
    c.created_at
  FROM mural_comentarios c
  JOIN mural_posts p ON p.id = c.post_id
  LEFT JOIN profiles pr ON pr.id = c.autor_user_id
  WHERE p.escopo_tipo = _scope_tipo 
    AND p.escopo_id::text = _scope_id
    AND c.status = 'oculto'
    AND (_target_type = 'all' OR _target_type = 'comentario')
  
  ORDER BY hidden_at DESC
  LIMIT 100;
END;
$$;

-- =============================================
-- RPC get_active_sanctions
-- Lista sanções ativas do escopo
-- =============================================
CREATE OR REPLACE FUNCTION public.get_active_sanctions(
  _scope_tipo TEXT,
  _scope_id TEXT
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_nickname TEXT,
  kind TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  reason TEXT,
  moderator_nickname TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT can_moderate_scope(auth.uid(), _scope_tipo, _scope_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    pu.nickname as user_nickname,
    s.kind,
    s.starts_at,
    s.ends_at,
    s.reason,
    pm.nickname as moderator_nickname
  FROM moderacao_sanctions s
  LEFT JOIN profiles pu ON pu.id = s.user_id
  LEFT JOIN profiles pm ON pm.id = s.created_by
  WHERE s.scope_tipo = _scope_tipo 
    AND s.scope_id = _scope_id
    AND (s.ends_at IS NULL OR s.ends_at > now())
  ORDER BY s.starts_at DESC;
END;
$$;

-- =============================================
-- RPC remove_sanction
-- Remove sanção ativa
-- =============================================
CREATE OR REPLACE FUNCTION public.remove_sanction(
  _sanction_id UUID,
  _note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sanction RECORD;
BEGIN
  SELECT * INTO _sanction FROM moderacao_sanctions WHERE id = _sanction_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sanção não encontrada';
  END IF;

  IF NOT can_moderate_scope(auth.uid(), _sanction.scope_tipo, _sanction.scope_id) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- Encerrar sanção
  UPDATE moderacao_sanctions SET ends_at = now() WHERE id = _sanction_id;

  -- Registrar ação
  INSERT INTO moderacao_actions (
    scope_tipo, scope_id, target_type, target_id,
    target_author_id, action_type, note, created_by
  ) VALUES (
    _sanction.scope_tipo, _sanction.scope_id, 'sanction', _sanction_id,
    _sanction.user_id, 'un' || _sanction.kind, _note, auth.uid()
  );

  -- Audit log
  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_data)
  VALUES (auth.uid(), 'moderation', _sanction_id, 'remove_sanction',
    jsonb_build_object('sanction_id', _sanction_id, 'kind', _sanction.kind, 'note', _note));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- moderacao_actions: só coord/admin pode ver/inserir
CREATE POLICY "Coordinators can view moderation actions"
  ON public.moderacao_actions FOR SELECT
  USING (can_moderate_scope(auth.uid(), scope_tipo, scope_id));

CREATE POLICY "Coordinators can insert moderation actions"
  ON public.moderacao_actions FOR INSERT
  WITH CHECK (can_moderate_scope(auth.uid(), scope_tipo, scope_id));

-- moderacao_sanctions: só coord/admin pode ver/inserir
CREATE POLICY "Coordinators can view sanctions"
  ON public.moderacao_sanctions FOR SELECT
  USING (can_moderate_scope(auth.uid(), scope_tipo, scope_id) OR user_id = auth.uid());

CREATE POLICY "Coordinators can insert sanctions"
  ON public.moderacao_sanctions FOR INSERT
  WITH CHECK (can_moderate_scope(auth.uid(), scope_tipo, scope_id));

CREATE POLICY "Coordinators can update sanctions"
  ON public.moderacao_sanctions FOR UPDATE
  USING (can_moderate_scope(auth.uid(), scope_tipo, scope_id));

-- moderacao_templates: coord/admin pode gerenciar
CREATE POLICY "Coordinators can manage templates"
  ON public.moderacao_templates FOR ALL
  USING (can_moderate_scope(auth.uid(), scope_tipo, COALESCE(scope_id, '')));

-- =============================================
-- BLOQUEIO DE SANÇÕES NAS TABELAS DO MURAL
-- Trigger para verificar sanção antes de INSERT
-- =============================================
CREATE OR REPLACE FUNCTION public.check_sanction_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _scope_tipo TEXT;
  _scope_id TEXT;
BEGIN
  -- Determinar escopo
  IF TG_TABLE_NAME = 'mural_posts' THEN
    _scope_tipo := NEW.escopo_tipo;
    _scope_id := NEW.escopo_id::text;
  ELSIF TG_TABLE_NAME = 'mural_comentarios' THEN
    SELECT p.escopo_tipo, p.escopo_id::text 
    INTO _scope_tipo, _scope_id
    FROM mural_posts p WHERE p.id = NEW.post_id;
  ELSIF TG_TABLE_NAME = 'mural_reacoes' THEN
    SELECT p.escopo_tipo, p.escopo_id::text 
    INTO _scope_tipo, _scope_id
    FROM mural_posts p WHERE p.id = NEW.post_id;
  ELSIF TG_TABLE_NAME = 'utility_signals' THEN
    IF NEW.target_type = 'mural_post' THEN
      SELECT p.escopo_tipo, p.escopo_id::text 
      INTO _scope_tipo, _scope_id
      FROM mural_posts p WHERE p.id = NEW.target_id;
    ELSE
      -- Para outros targets, não aplicar bloqueio do mural
      RETURN NEW;
    END IF;
  END IF;

  -- Verificar se usuário está com mute ou ban ativo
  IF is_sanctioned(_scope_tipo, _scope_id, auth.uid(), 'mute') OR
     is_sanctioned(_scope_tipo, _scope_id, auth.uid(), 'ban') THEN
    RAISE EXCEPTION 'Você está temporariamente impedido de interagir neste espaço.';
  END IF;

  RETURN NEW;
END;
$$;

-- Aplicar trigger nas tabelas
DROP TRIGGER IF EXISTS check_sanction_mural_posts ON public.mural_posts;
CREATE TRIGGER check_sanction_mural_posts
  BEFORE INSERT ON public.mural_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_sanction_before_insert();

DROP TRIGGER IF EXISTS check_sanction_mural_comentarios ON public.mural_comentarios;
CREATE TRIGGER check_sanction_mural_comentarios
  BEFORE INSERT ON public.mural_comentarios
  FOR EACH ROW
  EXECUTE FUNCTION public.check_sanction_before_insert();

DROP TRIGGER IF EXISTS check_sanction_mural_reacoes ON public.mural_reacoes;
CREATE TRIGGER check_sanction_mural_reacoes
  BEFORE INSERT ON public.mural_reacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_sanction_before_insert();

-- Trigger para target_author_id em novos reports
CREATE OR REPLACE FUNCTION public.set_report_target_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT autor_user_id INTO NEW.target_author_id
  FROM mural_posts WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_report_target_author_trigger ON public.mural_reports;
CREATE TRIGGER set_report_target_author_trigger
  BEFORE INSERT ON public.mural_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_report_target_author();