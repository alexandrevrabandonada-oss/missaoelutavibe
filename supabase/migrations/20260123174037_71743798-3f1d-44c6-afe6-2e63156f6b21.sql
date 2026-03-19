-- =============================================
-- PLENÁRIA DO COMUM v0 - Tables & RLS & RPCs
-- =============================================

-- A) plenarias - Main assembly table
CREATE TABLE public.plenarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_tipo TEXT NOT NULL CHECK (scope_tipo IN ('celula', 'cidade')),
  scope_id TEXT NOT NULL,
  ciclo_id UUID REFERENCES public.ciclos_semanais(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  resumo TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'encerrada')),
  abre_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  encerra_em TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recibo_json JSONB,
  mural_post_id UUID REFERENCES public.mural_posts(id) ON DELETE SET NULL
);

ALTER TABLE public.plenarias ENABLE ROW LEVEL SECURITY;

-- B) plenaria_opcoes - Voting options
CREATE TABLE public.plenaria_opcoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plenaria_id UUID NOT NULL REFERENCES public.plenarias(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plenaria_opcoes ENABLE ROW LEVEL SECURITY;

-- C) plenaria_votos - User votes (unique per user per plenaria)
CREATE TABLE public.plenaria_votos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plenaria_id UUID NOT NULL REFERENCES public.plenarias(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opcao_id UUID NOT NULL REFERENCES public.plenaria_opcoes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plenaria_id, user_id)
);

ALTER TABLE public.plenaria_votos ENABLE ROW LEVEL SECURITY;

-- D) plenaria_comentarios - Comments thread
CREATE TABLE public.plenaria_comentarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plenaria_id UUID NOT NULL REFERENCES public.plenarias(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plenaria_comentarios ENABLE ROW LEVEL SECURITY;

-- E) plenaria_encaminhamentos - Action items from decisions
CREATE TABLE public.plenaria_encaminhamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plenaria_id UUID NOT NULL REFERENCES public.plenarias(id) ON DELETE CASCADE,
  ordem INT NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL,
  descricao TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('tarefa_squad', 'missao_replicavel', 'plano_semana')),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'criado')),
  created_task_id UUID REFERENCES public.squad_tasks(id) ON DELETE SET NULL,
  created_mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plenaria_encaminhamentos ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_plenarias_scope ON public.plenarias(scope_tipo, scope_id);
CREATE INDEX idx_plenarias_status ON public.plenarias(status);
CREATE INDEX idx_plenarias_ciclo ON public.plenarias(ciclo_id);
CREATE INDEX idx_plenaria_votos_plenaria ON public.plenaria_votos(plenaria_id);
CREATE INDEX idx_plenaria_comentarios_plenaria ON public.plenaria_comentarios(plenaria_id);
CREATE INDEX idx_plenaria_encaminhamentos_plenaria ON public.plenaria_encaminhamentos(plenaria_id);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Helper function to check if user is in scope
CREATE OR REPLACE FUNCTION public.user_in_plenaria_scope(p_scope_tipo TEXT, p_scope_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile RECORD;
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;
  
  SELECT cidade, celula_id INTO v_profile FROM profiles WHERE user_id = v_user_id;
  
  IF p_scope_tipo = 'cidade' THEN
    RETURN v_profile.cidade = p_scope_id;
  ELSIF p_scope_tipo = 'celula' THEN
    RETURN v_profile.celula_id::text = p_scope_id;
  END IF;
  
  RETURN false;
END;
$$;

-- Helper to check coordinator role
CREATE OR REPLACE FUNCTION public.is_plenaria_coordinator()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin', 'coordenador_celula', 'coordenador_regional', 'coordenador_estadual')
  );
END;
$$;

-- plenarias policies
CREATE POLICY "Volunteers can view plenarias in their scope"
  ON public.plenarias FOR SELECT
  USING (
    public.user_in_plenaria_scope(scope_tipo, scope_id)
    OR public.is_plenaria_coordinator()
  );

CREATE POLICY "Coordinators can manage plenarias"
  ON public.plenarias FOR ALL
  USING (public.is_plenaria_coordinator())
  WITH CHECK (public.is_plenaria_coordinator());

-- plenaria_opcoes policies
CREATE POLICY "Anyone can view options for visible plenarias"
  ON public.plenaria_opcoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plenarias p 
      WHERE p.id = plenaria_id 
      AND (public.user_in_plenaria_scope(p.scope_tipo, p.scope_id) OR public.is_plenaria_coordinator())
    )
  );

CREATE POLICY "Coordinators can manage options"
  ON public.plenaria_opcoes FOR ALL
  USING (public.is_plenaria_coordinator())
  WITH CHECK (public.is_plenaria_coordinator());

-- plenaria_votos policies
CREATE POLICY "Users can view votes on plenarias in their scope"
  ON public.plenaria_votos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plenarias p 
      WHERE p.id = plenaria_id 
      AND public.user_in_plenaria_scope(p.scope_tipo, p.scope_id)
    )
  );

CREATE POLICY "Users can insert their own vote"
  ON public.plenaria_votos FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM plenarias p 
      WHERE p.id = plenaria_id 
      AND p.status = 'aberta'
      AND public.user_in_plenaria_scope(p.scope_tipo, p.scope_id)
    )
  );

-- plenaria_comentarios policies
CREATE POLICY "Users can view non-hidden comments"
  ON public.plenaria_comentarios FOR SELECT
  USING (
    hidden = false
    AND EXISTS (
      SELECT 1 FROM plenarias p 
      WHERE p.id = plenaria_id 
      AND public.user_in_plenaria_scope(p.scope_tipo, p.scope_id)
    )
  );

CREATE POLICY "Coordinators can view all comments"
  ON public.plenaria_comentarios FOR SELECT
  USING (public.is_plenaria_coordinator());

CREATE POLICY "Users can insert their own comment"
  ON public.plenaria_comentarios FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM plenarias p 
      WHERE p.id = plenaria_id 
      AND p.status = 'aberta'
      AND public.user_in_plenaria_scope(p.scope_tipo, p.scope_id)
    )
  );

CREATE POLICY "Coordinators can update comments (hide)"
  ON public.plenaria_comentarios FOR UPDATE
  USING (public.is_plenaria_coordinator());

-- plenaria_encaminhamentos policies
CREATE POLICY "Anyone can view encaminhamentos for visible plenarias"
  ON public.plenaria_encaminhamentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plenarias p 
      WHERE p.id = plenaria_id 
      AND (public.user_in_plenaria_scope(p.scope_tipo, p.scope_id) OR public.is_plenaria_coordinator())
    )
  );

CREATE POLICY "Coordinators can manage encaminhamentos"
  ON public.plenaria_encaminhamentos FOR ALL
  USING (public.is_plenaria_coordinator())
  WITH CHECK (public.is_plenaria_coordinator());

-- =============================================
-- RPCs
-- =============================================

-- 1) get_active_plenarias - List plenarias for user's scope
CREATE OR REPLACE FUNCTION public.get_active_plenarias(
  p_scope_tipo TEXT DEFAULT NULL,
  p_scope_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  scope_tipo TEXT,
  scope_id TEXT,
  ciclo_id UUID,
  titulo TEXT,
  resumo TEXT,
  status TEXT,
  abre_em TIMESTAMPTZ,
  encerra_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  total_votos BIGINT,
  total_comentarios BIGINT,
  user_voted BOOLEAN,
  opcoes JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.scope_tipo,
    p.scope_id,
    p.ciclo_id,
    p.titulo,
    p.resumo,
    p.status,
    p.abre_em,
    p.encerra_em,
    p.created_at,
    (SELECT COUNT(*) FROM plenaria_votos pv WHERE pv.plenaria_id = p.id) AS total_votos,
    (SELECT COUNT(*) FROM plenaria_comentarios pc WHERE pc.plenaria_id = p.id AND pc.hidden = false) AS total_comentarios,
    EXISTS(SELECT 1 FROM plenaria_votos pv WHERE pv.plenaria_id = p.id AND pv.user_id = v_user_id) AS user_voted,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', po.id,
          'ordem', po.ordem,
          'texto', po.texto,
          'votos', (SELECT COUNT(*) FROM plenaria_votos pv WHERE pv.opcao_id = po.id)
        ) ORDER BY po.ordem
      )
      FROM plenaria_opcoes po
      WHERE po.plenaria_id = p.id
    ) AS opcoes
  FROM plenarias p
  WHERE 
    (p_scope_tipo IS NULL OR p.scope_tipo = p_scope_tipo)
    AND (p_scope_id IS NULL OR p.scope_id = p_scope_id)
    AND (public.user_in_plenaria_scope(p.scope_tipo, p.scope_id) OR public.is_plenaria_coordinator())
  ORDER BY 
    CASE WHEN p.status = 'aberta' THEN 0 ELSE 1 END,
    p.encerra_em DESC;
END;
$$;

-- 2) cast_vote - Vote on a plenaria (ensures unique vote)
CREATE OR REPLACE FUNCTION public.cast_vote(
  p_plenaria_id UUID,
  p_opcao_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_plenaria RECORD;
  v_existing_vote UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;
  
  SELECT * INTO v_plenaria FROM plenarias WHERE id = p_plenaria_id;
  
  IF v_plenaria IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plenária não encontrada');
  END IF;
  
  IF v_plenaria.status != 'aberta' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plenária já encerrada');
  END IF;
  
  IF NOT public.user_in_plenaria_scope(v_plenaria.scope_tipo, v_plenaria.scope_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não tem acesso a esta plenária');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM plenaria_opcoes WHERE id = p_opcao_id AND plenaria_id = p_plenaria_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Opção inválida');
  END IF;
  
  SELECT id INTO v_existing_vote FROM plenaria_votos 
  WHERE plenaria_id = p_plenaria_id AND user_id = v_user_id;
  
  IF v_existing_vote IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você já votou nesta plenária');
  END IF;
  
  INSERT INTO plenaria_votos (plenaria_id, user_id, opcao_id)
  VALUES (p_plenaria_id, v_user_id, p_opcao_id);
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3) close_plenaria - Close plenaria, generate recibo, create encaminhamentos
CREATE OR REPLACE FUNCTION public.close_plenaria(
  p_plenaria_id UUID,
  p_recibo_json JSONB DEFAULT NULL,
  p_publish_to_mural BOOLEAN DEFAULT false,
  p_encaminhamentos_json JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_plenaria RECORD;
  v_mural_post_id UUID;
  v_enc JSONB;
  v_resultado JSONB;
  v_total_votos INT;
BEGIN
  IF NOT public.is_plenaria_coordinator() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  
  SELECT * INTO v_plenaria FROM plenarias WHERE id = p_plenaria_id;
  
  IF v_plenaria IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plenária não encontrada');
  END IF;
  
  IF v_plenaria.status = 'encerrada' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plenária já encerrada');
  END IF;
  
  SELECT COUNT(*) INTO v_total_votos FROM plenaria_votos WHERE plenaria_id = p_plenaria_id;
  
  SELECT jsonb_build_object(
    'total_votos', v_total_votos,
    'total_comentarios', (SELECT COUNT(*) FROM plenaria_comentarios WHERE plenaria_id = p_plenaria_id),
    'opcoes', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'texto', po.texto,
          'votos', (SELECT COUNT(*) FROM plenaria_votos pv WHERE pv.opcao_id = po.id),
          'percentual', CASE WHEN v_total_votos > 0 
            THEN ROUND(((SELECT COUNT(*) FROM plenaria_votos pv WHERE pv.opcao_id = po.id)::numeric / v_total_votos) * 100, 1)
            ELSE 0 END
        ) ORDER BY po.ordem
      )
      FROM plenaria_opcoes po WHERE po.plenaria_id = p_plenaria_id
    ),
    'encerrado_em', now(),
    'encerrado_por', v_user_id
  ) INTO v_resultado;
  
  IF p_recibo_json IS NOT NULL THEN
    v_resultado := v_resultado || p_recibo_json;
  END IF;
  
  IF p_publish_to_mural THEN
    INSERT INTO mural_posts (celula_id, author_id, tipo, conteudo)
    VALUES (
      CASE WHEN v_plenaria.scope_tipo = 'celula' THEN v_plenaria.scope_id::uuid ELSE NULL END,
      v_user_id,
      'recibo',
      '📋 **Recibo da Plenária: ' || v_plenaria.titulo || '**

Participação: ' || v_total_votos || ' votos
Decisão coletiva registrada. Confira os encaminhamentos!'
    )
    RETURNING id INTO v_mural_post_id;
  END IF;
  
  UPDATE plenarias SET 
    status = 'encerrada',
    recibo_json = v_resultado,
    mural_post_id = v_mural_post_id,
    updated_at = now()
  WHERE id = p_plenaria_id;
  
  FOR v_enc IN SELECT * FROM jsonb_array_elements(p_encaminhamentos_json)
  LOOP
    INSERT INTO plenaria_encaminhamentos (plenaria_id, ordem, titulo, descricao, kind)
    VALUES (
      p_plenaria_id,
      COALESCE((v_enc->>'ordem')::int, 0),
      v_enc->>'titulo',
      v_enc->>'descricao',
      COALESCE(v_enc->>'kind', 'tarefa_squad')
    );
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'recibo', v_resultado, 'mural_post_id', v_mural_post_id);
END;
$$;

-- 4) create_encaminhamento_as_task - Create squad task from encaminhamento
CREATE OR REPLACE FUNCTION public.create_encaminhamento_as_task(
  p_encaminhamento_id UUID,
  p_squad_id UUID,
  p_responsavel_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_enc RECORD;
  v_plenaria RECORD;
  v_task_id UUID;
BEGIN
  IF NOT public.is_plenaria_coordinator() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  
  SELECT * INTO v_enc FROM plenaria_encaminhamentos WHERE id = p_encaminhamento_id;
  
  IF v_enc IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Encaminhamento não encontrado');
  END IF;
  
  IF v_enc.status = 'criado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Encaminhamento já criado');
  END IF;
  
  SELECT * INTO v_plenaria FROM plenarias WHERE id = v_enc.plenaria_id;
  
  INSERT INTO squad_tasks (squad_id, ciclo_id, titulo, descricao, status, responsavel_id)
  VALUES (
    p_squad_id,
    v_plenaria.ciclo_id,
    v_enc.titulo,
    COALESCE(v_enc.descricao, '') || E'\n\n[Origem: Plenária "' || v_plenaria.titulo || '"]',
    'pendente',
    p_responsavel_id
  )
  RETURNING id INTO v_task_id;
  
  UPDATE plenaria_encaminhamentos SET 
    status = 'criado',
    created_task_id = v_task_id
  WHERE id = p_encaminhamento_id;
  
  RETURN jsonb_build_object('success', true, 'task_id', v_task_id);
END;
$$;

-- 5) create_encaminhamento_as_mission - Create mission from encaminhamento
CREATE OR REPLACE FUNCTION public.create_encaminhamento_as_mission(
  p_encaminhamento_id UUID,
  p_tipo TEXT DEFAULT 'acao_direta',
  p_pontos INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_enc RECORD;
  v_plenaria RECORD;
  v_mission_id UUID;
BEGIN
  IF NOT public.is_plenaria_coordinator() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  
  SELECT * INTO v_enc FROM plenaria_encaminhamentos WHERE id = p_encaminhamento_id;
  
  IF v_enc IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Encaminhamento não encontrado');
  END IF;
  
  IF v_enc.status = 'criado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Encaminhamento já criado');
  END IF;
  
  SELECT * INTO v_plenaria FROM plenarias WHERE id = v_enc.plenaria_id;
  
  INSERT INTO missions (
    title, 
    description, 
    type, 
    points, 
    official, 
    cycle_id,
    meta_json
  )
  VALUES (
    v_enc.titulo,
    COALESCE(v_enc.descricao, '') || E'\n\n[Origem: Plenária "' || v_plenaria.titulo || '"]',
    p_tipo,
    p_pontos,
    true,
    v_plenaria.ciclo_id,
    jsonb_build_object('kind', 'replicavel', 'plenaria_id', v_plenaria.id)
  )
  RETURNING id INTO v_mission_id;
  
  UPDATE plenaria_encaminhamentos SET 
    status = 'criado',
    created_mission_id = v_mission_id
  WHERE id = p_encaminhamento_id;
  
  RETURN jsonb_build_object('success', true, 'mission_id', v_mission_id);
END;
$$;

-- 6) get_plenarias_metrics - For Ops dashboard
CREATE OR REPLACE FUNCTION public.get_plenarias_metrics(
  p_scope_tipo TEXT DEFAULT 'all',
  p_scope_cidade TEXT DEFAULT NULL,
  p_scope_celula_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_abertas INT;
  v_encerradas_7d INT;
  v_encaminhamentos_7d INT;
BEGIN
  SELECT COUNT(*) INTO v_abertas
  FROM plenarias p
  WHERE p.status = 'aberta'
    AND (p_scope_tipo = 'all' 
      OR (p_scope_tipo = 'cidade' AND p.scope_tipo = 'cidade' AND p.scope_id = p_scope_cidade)
      OR (p_scope_tipo = 'celula' AND p.scope_tipo = 'celula' AND p.scope_id = p_scope_celula_id));
  
  SELECT COUNT(*) INTO v_encerradas_7d
  FROM plenarias p
  WHERE p.status = 'encerrada'
    AND p.updated_at >= now() - interval '7 days'
    AND (p_scope_tipo = 'all' 
      OR (p_scope_tipo = 'cidade' AND p.scope_tipo = 'cidade' AND p.scope_id = p_scope_cidade)
      OR (p_scope_tipo = 'celula' AND p.scope_tipo = 'celula' AND p.scope_id = p_scope_celula_id));
  
  SELECT COUNT(*) INTO v_encaminhamentos_7d
  FROM plenaria_encaminhamentos pe
  JOIN plenarias p ON p.id = pe.plenaria_id
  WHERE pe.status = 'criado'
    AND pe.created_at >= now() - interval '7 days'
    AND (p_scope_tipo = 'all' 
      OR (p_scope_tipo = 'cidade' AND p.scope_tipo = 'cidade' AND p.scope_id = p_scope_cidade)
      OR (p_scope_tipo = 'celula' AND p.scope_tipo = 'celula' AND p.scope_id = p_scope_celula_id));
  
  RETURN jsonb_build_object(
    'abertas', v_abertas,
    'encerradas_7d', v_encerradas_7d,
    'encaminhamentos_7d', v_encaminhamentos_7d
  );
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_plenarias_updated_at
  BEFORE UPDATE ON public.plenarias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();