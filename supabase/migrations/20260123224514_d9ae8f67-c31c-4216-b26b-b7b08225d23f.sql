-- =====================================================
-- TERRITÓRIO v0: Estrutura territorial para operação estadual
-- =====================================================

-- 1. CIDADES - Tabela mestre de cidades do território
CREATE TABLE IF NOT EXISTS public.cidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  uf text NOT NULL DEFAULT 'RJ',
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'piloto', 'prioritaria', 'pausada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nome, uf),
  UNIQUE(slug)
);

-- Index para buscas
CREATE INDEX IF NOT EXISTS idx_cidades_uf ON public.cidades(uf);
CREATE INDEX IF NOT EXISTS idx_cidades_status ON public.cidades(status);
CREATE INDEX IF NOT EXISTS idx_cidades_slug ON public.cidades(slug);

-- Trigger para updated_at
CREATE TRIGGER update_cidades_updated_at
  BEFORE UPDATE ON public.cidades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS para cidades
ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cidades"
  ON public.cidades FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and coord estadual can manage cidades"
  ON public.cidades FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_coordinator(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_coordinator(auth.uid()));

-- 2. Adicionar cidade_id à cells (FK opcional, não quebra dados existentes)
ALTER TABLE public.cells 
  ADD COLUMN IF NOT EXISTS cidade_id uuid REFERENCES public.cidades(id),
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_cells_cidade_id ON public.cells(cidade_id);

-- 3. Estender cell_memberships com status de aprovação
-- Adicionar novas colunas mantendo compatibilidade
ALTER TABLE public.cell_memberships
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'aprovado' CHECK (status IN ('pendente', 'aprovado', 'recusado', 'removido')),
  ADD COLUMN IF NOT EXISTS requested_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS decided_by uuid;

-- Migrar dados existentes: memberships ativas viram "aprovado", inativas viram "removido"
UPDATE public.cell_memberships 
SET status = CASE WHEN is_active = true THEN 'aprovado' ELSE 'removido' END
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_cell_memberships_status ON public.cell_memberships(status);

-- 4. TERRITORIO_COORD_INTEREST - Fila de interesse em coordenação
CREATE TABLE IF NOT EXISTS public.territorio_coord_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cidade_id uuid NOT NULL REFERENCES public.cidades(id) ON DELETE CASCADE,
  celula_id uuid REFERENCES public.cells(id) ON DELETE SET NULL,
  disponibilidade text,
  msg text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'contatado', 'aprovado', 'recusado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, cidade_id)
);

CREATE INDEX IF NOT EXISTS idx_coord_interest_status ON public.territorio_coord_interest(status);
CREATE INDEX IF NOT EXISTS idx_coord_interest_cidade ON public.territorio_coord_interest(cidade_id);

CREATE TRIGGER update_coord_interest_updated_at
  BEFORE UPDATE ON public.territorio_coord_interest
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- RLS para coord_interest
ALTER TABLE public.territorio_coord_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own coord interest"
  ON public.territorio_coord_interest FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all coord interest"
  ON public.territorio_coord_interest FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_coordinator(auth.uid()));

CREATE POLICY "Admins can update coord interest status"
  ON public.territorio_coord_interest FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_coordinator(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_coordinator(auth.uid()));

-- 5. RPC: get_territorio_overview - Visão geral territorial
CREATE OR REPLACE FUNCTION public.get_territorio_overview(period_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  period_start timestamptz := now() - (period_days || ' days')::interval;
BEGIN
  -- Verificar se é admin/coord
  IF NOT (is_admin(auth.uid()) OR is_coordinator(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  WITH cidade_stats AS (
    SELECT 
      c.id as cidade_id,
      c.nome,
      c.uf,
      c.slug,
      c.status as cidade_status,
      -- Has coordinator (user_roles with scope_cidade)
      EXISTS(
        SELECT 1 FROM user_roles ur 
        WHERE ur.role IN ('coordenador_cidade', 'coordenador_regional', 'coordenador_estadual')
        AND ur.scope_cidade = c.nome
        AND ur.revoked_at IS NULL
      ) as has_coord,
      -- Celulas count
      (SELECT COUNT(*) FROM cells cl WHERE cl.city = c.nome AND cl.is_active = true) as celulas_count,
      -- Membros aprovados total
      (
        SELECT COUNT(DISTINCT cm.user_id)
        FROM cell_memberships cm
        JOIN cells cl ON cl.id = cm.cell_id
        WHERE cl.city = c.nome AND cm.status = 'aprovado'
      ) as membros_aprovados,
      -- Voluntarios aprovados na cidade (do profile)
      (
        SELECT COUNT(*) FROM profiles p
        WHERE p.cidade = c.nome AND p.volunteer_status = 'aprovado'
      ) as voluntarios_aprovados,
      -- Ativos 7d (checkins, missões, agenda)
      (
        SELECT COUNT(DISTINCT dc.user_id)
        FROM daily_checkins dc
        JOIN profiles p ON p.id = dc.user_id
        WHERE p.cidade = c.nome
        AND dc.created_at > period_start
      ) as ativos_7d,
      -- Growth events
      (
        SELECT COUNT(*) FROM growth_events ge
        WHERE ge.scope_cidade = c.nome
        AND ge.event_type = 'signup'
        AND ge.created_at > period_start
      ) as signups_7d,
      (
        SELECT COUNT(*) FROM growth_events ge
        WHERE ge.scope_cidade = c.nome
        AND ge.event_type = 'approved'
        AND ge.created_at > period_start
      ) as approved_7d,
      (
        SELECT COUNT(*) FROM growth_events ge
        WHERE ge.scope_cidade = c.nome
        AND ge.event_type = 'first_action'
        AND ge.created_at > period_start
      ) as first_action_7d,
      -- Shares 7d
      (
        SELECT COUNT(*) FROM fabrica_downloads fd
        JOIN fabrica_templates ft ON ft.id = fd.template_id
        WHERE ft.scope_tipo = 'cidade' AND ft.scope_id = c.nome
        AND fd.action = 'share'
        AND fd.created_at > period_start
      ) as shares_7d,
      -- Semana ativa
      EXISTS(
        SELECT 1 FROM ciclos_semanais cs
        WHERE cs.cidade = c.nome
        AND cs.status = 'ativo'
        AND now() BETWEEN cs.inicio AND cs.fim
      ) as semana_ativa,
      -- Atividades 7d
      (
        SELECT COUNT(*) FROM atividades a
        WHERE a.cidade = c.nome
        AND a.status = 'publicada'
        AND a.inicio_em > period_start
      ) as atividades_7d
    FROM cidades c
    WHERE c.status != 'pausada'
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'cidade_id', cs.cidade_id,
      'nome', cs.nome,
      'uf', cs.uf,
      'slug', cs.slug,
      'status', cs.cidade_status,
      'has_coord', cs.has_coord,
      'celulas_count', cs.celulas_count,
      'membros_aprovados', cs.membros_aprovados,
      'voluntarios_aprovados', cs.voluntarios_aprovados,
      'ativos_7d', cs.ativos_7d,
      'signups_7d', cs.signups_7d,
      'approved_7d', cs.approved_7d,
      'first_action_7d', cs.first_action_7d,
      'shares_7d', cs.shares_7d,
      'semana_ativa', cs.semana_ativa,
      'atividades_7d', cs.atividades_7d,
      'alerts', (
        SELECT jsonb_agg(alert)
        FROM (
          SELECT 'sem_coord' as alert WHERE NOT cs.has_coord
          UNION ALL
          SELECT 'sem_celula' WHERE cs.celulas_count = 0 AND cs.voluntarios_aprovados > 0
          UNION ALL
          SELECT 'crescendo_sem_estrutura' WHERE cs.signups_7d > 5 AND NOT cs.has_coord
          UNION ALL
          SELECT 'sem_semana_ativa' WHERE NOT cs.semana_ativa AND cs.has_coord
        ) alerts
      )
    )
    ORDER BY cs.voluntarios_aprovados DESC
  ) INTO result
  FROM cidade_stats cs;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- 6. RPC: get_cidade_celulas - Células de uma cidade com métricas
CREATE OR REPLACE FUNCTION public.get_cidade_celulas(p_cidade_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  cidade_nome text;
  period_start timestamptz := now() - interval '7 days';
BEGIN
  -- Buscar nome da cidade
  SELECT nome INTO cidade_nome FROM cidades WHERE id = p_cidade_id;
  
  IF cidade_nome IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH celula_stats AS (
    SELECT 
      cl.id,
      cl.name,
      cl.neighborhood,
      cl.description,
      cl.city,
      cl.is_active,
      cl.tipo,
      cl.tags,
      -- Membros aprovados
      (SELECT COUNT(*) FROM cell_memberships cm WHERE cm.cell_id = cl.id AND cm.status = 'aprovado') as membros_aprovados,
      -- Pendentes
      (SELECT COUNT(*) FROM cell_memberships cm WHERE cm.cell_id = cl.id AND cm.status = 'pendente') as pendentes,
      -- Has moderador
      EXISTS(
        SELECT 1 FROM user_roles ur 
        WHERE ur.role IN ('coordenador_celula', 'moderador_celula')
        AND ur.cell_id = cl.id
        AND ur.revoked_at IS NULL
      ) as has_moderador,
      -- Missões 7d
      (
        SELECT COUNT(*) FROM missions m 
        WHERE m.cell_id = cl.id 
        AND m.created_at > period_start
      ) as missoes_7d,
      -- Atividades 7d
      (
        SELECT COUNT(*) FROM atividades a 
        WHERE a.celula_id = cl.id 
        AND a.inicio_em > period_start
      ) as atividades_7d,
      -- Recibos 7d (atividades concluídas)
      (
        SELECT COUNT(*) FROM atividades a 
        WHERE a.celula_id = cl.id 
        AND a.concluida_em > period_start
      ) as recibos_7d
    FROM cells cl
    WHERE (cl.city = cidade_nome OR cl.cidade_id = p_cidade_id)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cs.id,
      'name', cs.name,
      'neighborhood', cs.neighborhood,
      'description', cs.description,
      'is_active', cs.is_active,
      'tipo', cs.tipo,
      'tags', cs.tags,
      'membros_aprovados', cs.membros_aprovados,
      'pendentes', cs.pendentes,
      'has_moderador', cs.has_moderador,
      'missoes_7d', cs.missoes_7d,
      'atividades_7d', cs.atividades_7d,
      'recibos_7d', cs.recibos_7d,
      'alerts', (
        SELECT jsonb_agg(alert)
        FROM (
          SELECT 'sem_moderador' as alert WHERE NOT cs.has_moderador AND cs.is_active
          UNION ALL
          SELECT 'sem_atividade' WHERE cs.atividades_7d = 0 AND cs.membros_aprovados > 3
          UNION ALL
          SELECT 'pendencias' WHERE cs.pendentes > 0
        ) alerts
      )
    )
    ORDER BY cs.membros_aprovados DESC
  ) INTO result
  FROM celula_stats cs;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- 7. RPC: request_join_celula - Voluntário pede entrada em célula
CREATE OR REPLACE FUNCTION public.request_join_celula(p_celula_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_cidade text;
  v_celula_cidade text;
  v_existing_id uuid;
BEGIN
  -- Buscar cidade do usuário
  SELECT cidade INTO v_user_cidade FROM profiles WHERE id = auth.uid();
  
  -- Buscar cidade da célula
  SELECT city INTO v_celula_cidade FROM cells WHERE id = p_celula_id;
  
  IF v_celula_cidade IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Célula não encontrada');
  END IF;
  
  -- Verificar se é da mesma cidade
  IF v_user_cidade IS DISTINCT FROM v_celula_cidade THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você só pode pedir entrada em células da sua cidade');
  END IF;
  
  -- Verificar se já existe membership
  SELECT id INTO v_existing_id 
  FROM cell_memberships 
  WHERE user_id = auth.uid() AND cell_id = p_celula_id;
  
  IF v_existing_id IS NOT NULL THEN
    -- Atualizar para pendente se estava removido/recusado
    UPDATE cell_memberships
    SET status = 'pendente', requested_at = now(), decided_at = NULL, decided_by = NULL
    WHERE id = v_existing_id AND status IN ('removido', 'recusado');
    
    RETURN jsonb_build_object('success', true, 'message', 'Solicitação reenviada');
  END IF;
  
  -- Criar nova membership pendente
  INSERT INTO cell_memberships (user_id, cell_id, status, is_active, requested_at)
  VALUES (auth.uid(), p_celula_id, 'pendente', false, now());
  
  RETURN jsonb_build_object('success', true, 'message', 'Solicitação enviada');
END;
$$;

-- 8. RPC: decide_membership - Coord decide sobre pedido
CREATE OR REPLACE FUNCTION public.decide_membership(p_membership_id uuid, p_decision text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cell_id uuid;
  v_cell_cidade text;
BEGIN
  IF p_decision NOT IN ('aprovado', 'recusado') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decisão inválida');
  END IF;
  
  -- Buscar célula
  SELECT cell_id INTO v_cell_id FROM cell_memberships WHERE id = p_membership_id;
  
  IF v_cell_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;
  
  SELECT city INTO v_cell_cidade FROM cells WHERE id = v_cell_id;
  
  -- Verificar permissão (coord da cidade ou admin)
  IF NOT (
    is_admin(auth.uid()) OR
    is_coord_for_scope(auth.uid(), 'cidade', v_cell_cidade) OR
    is_coord_for_scope(auth.uid(), 'celula', v_cell_id::text)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  
  -- Atualizar membership
  UPDATE cell_memberships
  SET 
    status = p_decision,
    is_active = (p_decision = 'aprovado'),
    decided_at = now(),
    decided_by = auth.uid()
  WHERE id = p_membership_id;
  
  -- Audit log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (auth.uid(), 'decide_membership', 'cell_membership', p_membership_id, 
    jsonb_build_object('decision', p_decision));
  
  RETURN jsonb_build_object('success', true, 'decision', p_decision);
END;
$$;

-- 9. RPC: upsert_coord_interest - Voluntário se oferece para organizar
CREATE OR REPLACE FUNCTION public.upsert_coord_interest(
  p_cidade_id uuid,
  p_celula_id uuid DEFAULT NULL,
  p_disponibilidade text DEFAULT NULL,
  p_msg text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO territorio_coord_interest (user_id, cidade_id, celula_id, disponibilidade, msg)
  VALUES (auth.uid(), p_cidade_id, p_celula_id, p_disponibilidade, p_msg)
  ON CONFLICT (user_id, cidade_id) 
  DO UPDATE SET
    celula_id = COALESCE(p_celula_id, territorio_coord_interest.celula_id),
    disponibilidade = COALESCE(p_disponibilidade, territorio_coord_interest.disponibilidade),
    msg = COALESCE(p_msg, territorio_coord_interest.msg),
    updated_at = now();
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. RPC: get_territorio_kpis - KPIs para card do Ops
CREATE OR REPLACE FUNCTION public.get_territorio_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'cidades_sem_coord', (
      SELECT COUNT(*) FROM cidades c
      WHERE c.status != 'pausada'
      AND NOT EXISTS(
        SELECT 1 FROM user_roles ur 
        WHERE ur.role IN ('coordenador_cidade', 'coordenador_regional')
        AND ur.scope_cidade = c.nome
        AND ur.revoked_at IS NULL
      )
    ),
    'celulas_sem_moderador', (
      SELECT COUNT(*) FROM cells cl
      WHERE cl.is_active = true
      AND NOT EXISTS(
        SELECT 1 FROM user_roles ur 
        WHERE ur.role IN ('coordenador_celula', 'moderador_celula')
        AND ur.cell_id = cl.id
        AND ur.revoked_at IS NULL
      )
    ),
    'cidades_crescendo_sem_estrutura', (
      SELECT COUNT(*) FROM cidades c
      WHERE c.status != 'pausada'
      AND NOT EXISTS(
        SELECT 1 FROM user_roles ur 
        WHERE ur.role IN ('coordenador_cidade', 'coordenador_regional')
        AND ur.scope_cidade = c.nome
        AND ur.revoked_at IS NULL
      )
      AND (
        SELECT COUNT(*) FROM growth_events ge
        WHERE ge.scope_cidade = c.nome
        AND ge.event_type = 'signup'
        AND ge.created_at > now() - interval '7 days'
      ) > 5
    ),
    'interesses_pendentes', (
      SELECT COUNT(*) FROM territorio_coord_interest
      WHERE status = 'pendente'
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 11. Popular cidades iniciais do RJ (baseado na lista já usada no app)
INSERT INTO cidades (nome, uf, slug) VALUES
  ('Angra dos Reis', 'RJ', 'angra-dos-reis'),
  ('Barra Mansa', 'RJ', 'barra-mansa'),
  ('Belford Roxo', 'RJ', 'belford-roxo'),
  ('Cabo Frio', 'RJ', 'cabo-frio'),
  ('Campos dos Goytacazes', 'RJ', 'campos-dos-goytacazes'),
  ('Duque de Caxias', 'RJ', 'duque-de-caxias'),
  ('Itaboraí', 'RJ', 'itaborai'),
  ('Itaguaí', 'RJ', 'itaguai'),
  ('Macaé', 'RJ', 'macae'),
  ('Magé', 'RJ', 'mage'),
  ('Maricá', 'RJ', 'marica'),
  ('Mesquita', 'RJ', 'mesquita'),
  ('Niterói', 'RJ', 'niteroi'),
  ('Nova Friburgo', 'RJ', 'nova-friburgo'),
  ('Nova Iguaçu', 'RJ', 'nova-iguacu'),
  ('Petrópolis', 'RJ', 'petropolis'),
  ('Resende', 'RJ', 'resende'),
  ('Rio de Janeiro', 'RJ', 'rio-de-janeiro'),
  ('São Gonçalo', 'RJ', 'sao-goncalo'),
  ('São João de Meriti', 'RJ', 'sao-joao-de-meriti'),
  ('Teresópolis', 'RJ', 'teresopolis'),
  ('Volta Redonda', 'RJ', 'volta-redonda')
ON CONFLICT (nome, uf) DO NOTHING;