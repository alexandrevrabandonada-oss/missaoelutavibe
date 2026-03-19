-- =============================================
-- Roteiros de Conversa v0
-- =============================================

-- 1. Tabela principal de roteiros
CREATE TABLE public.roteiros_conversa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  objetivo TEXT NOT NULL CHECK (objetivo IN ('convidar', 'explicar', 'objecao', 'fechamento')),
  texto_base TEXT NOT NULL,
  versoes_json JSONB NOT NULL DEFAULT '{"curta": "", "media": "", "longa": ""}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'revisao', 'aprovado', 'arquivado')),
  -- Escopo: global > estado > cidade > celula
  escopo_tipo TEXT NOT NULL DEFAULT 'global' CHECK (escopo_tipo IN ('global', 'estado', 'cidade', 'celula')),
  escopo_estado TEXT,
  escopo_cidade TEXT,
  escopo_celula_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de tracking de ações
CREATE TABLE public.roteiros_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roteiro_id UUID NOT NULL REFERENCES public.roteiros_conversa(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('copiou', 'abriu_whatsapp', 'usei')),
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Dedupe diário: uma ação por tipo por usuário por roteiro por dia
  CONSTRAINT unique_daily_action UNIQUE (roteiro_id, user_id, action_type, action_date)
);

-- 3. Índices
CREATE INDEX idx_roteiros_status ON public.roteiros_conversa(status);
CREATE INDEX idx_roteiros_objetivo ON public.roteiros_conversa(objetivo);
CREATE INDEX idx_roteiros_escopo ON public.roteiros_conversa(escopo_tipo, escopo_estado, escopo_cidade, escopo_celula_id);
CREATE INDEX idx_roteiros_actions_roteiro ON public.roteiros_actions(roteiro_id);
CREATE INDEX idx_roteiros_actions_user ON public.roteiros_actions(user_id);
CREATE INDEX idx_roteiros_actions_date ON public.roteiros_actions(action_date);

-- 4. Trigger para updated_at
CREATE TRIGGER update_roteiros_conversa_updated_at
  BEFORE UPDATE ON public.roteiros_conversa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE public.roteiros_conversa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roteiros_actions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies para roteiros_conversa

-- Voluntários podem ler roteiros aprovados no seu território
CREATE POLICY "Volunteers read approved scripts in territory"
ON public.roteiros_conversa FOR SELECT TO authenticated
USING (
  status = 'aprovado'
  AND (
    escopo_tipo = 'global'
    OR (escopo_tipo = 'estado' AND escopo_estado IN (
      SELECT p.state FROM public.profiles p WHERE p.id = auth.uid()
    ))
    OR (escopo_tipo = 'cidade' AND escopo_cidade IN (
      SELECT p.city FROM public.profiles p WHERE p.id = auth.uid()
    ))
    OR (escopo_tipo = 'celula' AND escopo_celula_id IN (
      SELECT cm.cell_id FROM public.cell_memberships cm 
      WHERE cm.user_id = auth.uid() AND cm.status = 'aprovado'
    ))
  )
);

-- Coordenadores e admins podem ver todos no seu escopo
CREATE POLICY "Coordinators read all scripts in scope"
ON public.roteiros_conversa FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_celula')
  )
);

-- Coordenadores podem criar roteiros
CREATE POLICY "Coordinators create scripts"
ON public.roteiros_conversa FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_celula')
  )
);

-- Coordenadores podem atualizar roteiros no seu escopo
CREATE POLICY "Coordinators update scripts in scope"
ON public.roteiros_conversa FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_celula')
  )
);

-- Admins podem deletar
CREATE POLICY "Admins delete scripts"
ON public.roteiros_conversa FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

-- 7. RLS Policies para roteiros_actions

-- Usuários podem registrar suas próprias ações
CREATE POLICY "Users track own actions"
ON public.roteiros_actions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Usuários podem ver suas próprias ações
CREATE POLICY "Users view own actions"
ON public.roteiros_actions FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admins e coords podem ver todas as ações para métricas
CREATE POLICY "Coordinators view all actions"
ON public.roteiros_actions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_celula')
  )
);

-- 8. Função para tracking com dedupe
CREATE OR REPLACE FUNCTION public.track_roteiro_action(
  p_roteiro_id UUID,
  p_action_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.roteiros_actions (roteiro_id, user_id, action_type, action_date)
  VALUES (p_roteiro_id, auth.uid(), p_action_type, CURRENT_DATE)
  ON CONFLICT (roteiro_id, user_id, action_type, action_date) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- 9. Função para métricas de roteiros
CREATE OR REPLACE FUNCTION public.get_roteiros_metrics(
  p_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verificar se é coord/admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_celula')
  ) THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT jsonb_build_object(
    'total_roteiros', (SELECT COUNT(*) FROM roteiros_conversa WHERE status = 'aprovado'),
    'roteiros_revisao', (SELECT COUNT(*) FROM roteiros_conversa WHERE status = 'revisao'),
    'acoes_periodo', (
      SELECT COUNT(*) FROM roteiros_actions 
      WHERE action_date >= CURRENT_DATE - p_days
    ),
    'usuarios_ativos', (
      SELECT COUNT(DISTINCT user_id) FROM roteiros_actions 
      WHERE action_date >= CURRENT_DATE - p_days
    ),
    'top_roteiros', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT 
          r.id,
          r.titulo,
          r.objetivo,
          COUNT(ra.id) as total_acoes,
          COUNT(CASE WHEN ra.action_type = 'usei' THEN 1 END) as usos
        FROM roteiros_conversa r
        LEFT JOIN roteiros_actions ra ON ra.roteiro_id = r.id 
          AND ra.action_date >= CURRENT_DATE - p_days
        WHERE r.status = 'aprovado'
        GROUP BY r.id, r.titulo, r.objetivo
        ORDER BY total_acoes DESC
        LIMIT 5
      ) t
    ),
    'por_objetivo', (
      SELECT COALESCE(jsonb_object_agg(objetivo, cnt), '{}'::jsonb)
      FROM (
        SELECT objetivo, COUNT(*) as cnt
        FROM roteiros_conversa
        WHERE status = 'aprovado'
        GROUP BY objetivo
      ) t
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 10. Função para publicar roteiro no mural como material
CREATE OR REPLACE FUNCTION public.publish_roteiro_to_mural(
  p_roteiro_id UUID,
  p_cell_id UUID,
  p_titulo_override TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roteiro roteiros_conversa%ROWTYPE;
  v_post_id UUID;
BEGIN
  -- Buscar roteiro
  SELECT * INTO v_roteiro FROM roteiros_conversa WHERE id = p_roteiro_id;
  
  IF v_roteiro IS NULL THEN
    RAISE EXCEPTION 'Roteiro não encontrado';
  END IF;

  -- Criar post no mural
  INSERT INTO mural_posts (
    cell_id,
    author_id,
    tipo,
    titulo,
    corpo,
    is_hidden
  ) VALUES (
    p_cell_id,
    auth.uid(),
    'material',
    COALESCE(p_titulo_override, v_roteiro.titulo),
    v_roteiro.texto_base,
    false
  )
  RETURNING id INTO v_post_id;

  RETURN v_post_id;
END;
$$;