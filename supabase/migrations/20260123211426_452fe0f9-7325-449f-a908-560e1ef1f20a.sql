-- =============================================
-- FÁBRICA DE BASE v0 - Content Template Library
-- =============================================

-- 1. Tabela principal: fabrica_templates
CREATE TABLE public.fabrica_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope_tipo TEXT NOT NULL CHECK (scope_tipo IN ('global', 'estado', 'cidade', 'celula')),
  scope_id TEXT, -- null when global
  titulo TEXT NOT NULL,
  tema_tags TEXT[] DEFAULT '{}',
  objetivo TEXT NOT NULL DEFAULT 'outro' CHECK (objetivo IN ('denuncia', 'convite', 'mobilizacao', 'servico', 'formacao', 'outro')),
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'revisao', 'aprovado', 'arquivado')),
  texto_base TEXT,
  variacoes_json JSONB DEFAULT '{}',
  instrucoes TEXT,
  hashtags TEXT[] DEFAULT '{}',
  attachments_json JSONB DEFAULT '[]',
  aprovado_por UUID,
  aprovado_em TIMESTAMPTZ,
  mural_post_id UUID REFERENCES public.mural_posts(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT hashtags_max_5 CHECK (array_length(hashtags, 1) IS NULL OR array_length(hashtags, 1) <= 5)
);

-- Indexes for fabrica_templates
CREATE INDEX idx_fabrica_templates_scope ON public.fabrica_templates(scope_tipo, scope_id, status);
CREATE INDEX idx_fabrica_templates_objetivo ON public.fabrica_templates(objetivo);
CREATE INDEX idx_fabrica_templates_tags ON public.fabrica_templates USING GIN(tema_tags);
CREATE INDEX idx_fabrica_templates_created_by ON public.fabrica_templates(created_by);
CREATE INDEX idx_fabrica_templates_status ON public.fabrica_templates(status);

-- 2. Tabela de tracking: fabrica_downloads
CREATE TABLE public.fabrica_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.fabrica_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('copiou_texto', 'baixou_imagem', 'compartilhou')),
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index for one action per day
CREATE UNIQUE INDEX idx_fabrica_downloads_unique_daily 
ON public.fabrica_downloads(template_id, user_id, action, action_date);

CREATE INDEX idx_fabrica_downloads_template ON public.fabrica_downloads(template_id);
CREATE INDEX idx_fabrica_downloads_user ON public.fabrica_downloads(user_id);
CREATE INDEX idx_fabrica_downloads_created ON public.fabrica_downloads(created_at);

-- 3. Enable RLS
ALTER TABLE public.fabrica_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabrica_downloads ENABLE ROW LEVEL SECURITY;

-- 4. Helper function: check if user has access to template scope
CREATE OR REPLACE FUNCTION public.user_has_fabrica_scope_access(
  p_user_id UUID,
  p_scope_tipo TEXT,
  p_scope_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_profile RECORD;
BEGIN
  IF p_scope_tipo = 'global' THEN
    RETURN EXISTS (
      SELECT 1 FROM profiles WHERE user_id = p_user_id AND status = 'aprovado'
    );
  END IF;
  
  SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id AND status = 'aprovado';
  IF NOT FOUND THEN RETURN FALSE; END IF;
  
  IF p_scope_tipo = 'estado' THEN
    IF v_profile.estado = p_scope_id THEN RETURN TRUE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM cell_memberships cm
      JOIN cells c ON c.id = cm.cell_id
      WHERE cm.user_id = p_user_id AND cm.is_active = TRUE AND c.state = p_scope_id
    );
  END IF;
  
  IF p_scope_tipo = 'cidade' THEN
    IF v_profile.cidade = p_scope_id THEN RETURN TRUE; END IF;
    RETURN EXISTS (
      SELECT 1 FROM cell_memberships cm
      JOIN cells c ON c.id = cm.cell_id
      WHERE cm.user_id = p_user_id AND cm.is_active = TRUE AND c.city = p_scope_id
    );
  END IF;
  
  IF p_scope_tipo = 'celula' THEN
    RETURN EXISTS (
      SELECT 1 FROM cell_memberships 
      WHERE user_id = p_user_id AND cell_id = p_scope_id::uuid AND is_active = TRUE
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Helper function: check if user can manage templates in scope
CREATE OR REPLACE FUNCTION public.user_can_manage_fabrica_scope(
  p_user_id UUID,
  p_scope_tipo TEXT,
  p_scope_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM admins WHERE user_id = p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  IF p_scope_tipo = 'global' THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = p_user_id 
        AND role IN ('admin', 'coordenador_estadual')
        AND revoked_at IS NULL
    );
  END IF;
  
  IF p_scope_tipo = 'estado' THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = p_user_id 
        AND role IN ('admin', 'coordenador_estadual')
        AND (scope_estado = p_scope_id OR role = 'admin')
        AND revoked_at IS NULL
    );
  END IF;
  
  IF p_scope_tipo = 'cidade' THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = p_user_id 
        AND role IN ('admin', 'coordenador_estadual', 'coordenador_cidade')
        AND (scope_cidade = p_scope_id OR scope_estado IS NOT NULL OR role = 'admin')
        AND revoked_at IS NULL
    );
  END IF;
  
  IF p_scope_tipo = 'celula' THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = p_user_id 
        AND role IN ('admin', 'coordenador_estadual', 'coordenador_cidade', 'coordenador_celula')
        AND (scope_celula_id = p_scope_id::uuid OR scope_cidade IS NOT NULL OR scope_estado IS NOT NULL OR role = 'admin')
        AND revoked_at IS NULL
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. RLS Policies for fabrica_templates

CREATE POLICY "Volunteers can view approved templates in scope"
ON public.fabrica_templates FOR SELECT
USING (
  status = 'aprovado' 
  AND public.user_has_fabrica_scope_access(auth.uid(), scope_tipo, scope_id)
);

CREATE POLICY "Coordinators can view all templates in scope"
ON public.fabrica_templates FOR SELECT
USING (
  public.user_can_manage_fabrica_scope(auth.uid(), scope_tipo, scope_id)
);

CREATE POLICY "Coordinators can create templates"
ON public.fabrica_templates FOR INSERT
WITH CHECK (
  public.user_can_manage_fabrica_scope(auth.uid(), scope_tipo, scope_id)
  AND created_by = auth.uid()
);

CREATE POLICY "Coordinators can update templates in scope"
ON public.fabrica_templates FOR UPDATE
USING (
  public.user_can_manage_fabrica_scope(auth.uid(), scope_tipo, scope_id)
);

CREATE POLICY "Coordinators can delete draft templates"
ON public.fabrica_templates FOR DELETE
USING (
  status = 'rascunho'
  AND public.user_can_manage_fabrica_scope(auth.uid(), scope_tipo, scope_id)
);

-- 7. RLS Policies for fabrica_downloads

CREATE POLICY "Users can view own downloads"
ON public.fabrica_downloads FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own downloads"
ON public.fabrica_downloads FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Coordinators can view downloads in scope"
ON public.fabrica_downloads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM fabrica_templates t
    WHERE t.id = template_id
    AND public.user_can_manage_fabrica_scope(auth.uid(), t.scope_tipo, t.scope_id)
  )
);

-- 8. RPC: list_templates_for_user
CREATE OR REPLACE FUNCTION public.list_templates_for_user()
RETURNS TABLE (
  id UUID,
  scope_tipo TEXT,
  scope_id TEXT,
  titulo TEXT,
  tema_tags TEXT[],
  objetivo TEXT,
  texto_base TEXT,
  variacoes_json JSONB,
  instrucoes TEXT,
  hashtags TEXT[],
  attachments_json JSONB,
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  download_count BIGINT,
  share_count BIGINT,
  user_shared BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.scope_tipo,
    t.scope_id,
    t.titulo,
    t.tema_tags,
    t.objetivo,
    t.texto_base,
    t.variacoes_json,
    t.instrucoes,
    t.hashtags,
    t.attachments_json,
    t.aprovado_em,
    t.created_at,
    COALESCE((SELECT COUNT(*) FROM fabrica_downloads d WHERE d.template_id = t.id), 0)::BIGINT as download_count,
    COALESCE((SELECT COUNT(*) FROM fabrica_downloads d WHERE d.template_id = t.id AND d.action = 'compartilhou'), 0)::BIGINT as share_count,
    EXISTS (SELECT 1 FROM fabrica_downloads d WHERE d.template_id = t.id AND d.user_id = auth.uid() AND d.action = 'compartilhou') as user_shared
  FROM fabrica_templates t
  WHERE t.status = 'aprovado'
    AND public.user_has_fabrica_scope_access(auth.uid(), t.scope_tipo, t.scope_id)
  ORDER BY t.aprovado_em DESC NULLS LAST, t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 9. RPC: track_template_action
CREATE OR REPLACE FUNCTION public.track_template_action(
  p_template_id UUID,
  p_action TEXT
) RETURNS JSONB AS $$
DECLARE
  v_template RECORD;
BEGIN
  IF p_action NOT IN ('copiou_texto', 'baixou_imagem', 'compartilhou') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ação inválida');
  END IF;
  
  SELECT * INTO v_template FROM fabrica_templates WHERE id = p_template_id AND status = 'aprovado';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template não encontrado ou não aprovado');
  END IF;
  
  IF NOT public.user_has_fabrica_scope_access(auth.uid(), v_template.scope_tipo, v_template.scope_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem acesso a este template');
  END IF;
  
  INSERT INTO fabrica_downloads (template_id, user_id, action, action_date)
  VALUES (p_template_id, auth.uid(), p_action, CURRENT_DATE)
  ON CONFLICT (template_id, user_id, action, action_date) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: approve_template
CREATE OR REPLACE FUNCTION public.approve_template(p_template_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_template RECORD;
BEGIN
  SELECT * INTO v_template FROM fabrica_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template não encontrado');
  END IF;
  
  IF NOT public.user_can_manage_fabrica_scope(auth.uid(), v_template.scope_tipo, v_template.scope_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para aprovar neste escopo');
  END IF;
  
  IF v_template.status NOT IN ('rascunho', 'revisao') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template não pode ser aprovado neste status');
  END IF;
  
  UPDATE fabrica_templates
  SET status = 'aprovado',
      aprovado_por = auth.uid(),
      aprovado_em = now(),
      updated_at = now()
  WHERE id = p_template_id;
  
  RETURN jsonb_build_object('success', true, 'status', 'aprovado');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC: request_review
CREATE OR REPLACE FUNCTION public.request_review_template(p_template_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_template RECORD;
BEGIN
  SELECT * INTO v_template FROM fabrica_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template não encontrado');
  END IF;
  
  IF NOT public.user_can_manage_fabrica_scope(auth.uid(), v_template.scope_tipo, v_template.scope_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  
  IF v_template.status != 'rascunho' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas rascunhos podem ir para revisão');
  END IF;
  
  UPDATE fabrica_templates
  SET status = 'revisao', updated_at = now()
  WHERE id = p_template_id;
  
  RETURN jsonb_build_object('success', true, 'status', 'revisao');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: archive_template
CREATE OR REPLACE FUNCTION public.archive_template(p_template_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_template RECORD;
BEGIN
  SELECT * INTO v_template FROM fabrica_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template não encontrado');
  END IF;
  
  IF NOT public.user_can_manage_fabrica_scope(auth.uid(), v_template.scope_tipo, v_template.scope_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  
  UPDATE fabrica_templates
  SET status = 'arquivado', updated_at = now()
  WHERE id = p_template_id;
  
  RETURN jsonb_build_object('success', true, 'status', 'arquivado');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. RPC: publish_template_to_mural
CREATE OR REPLACE FUNCTION public.publish_template_to_mural(
  p_template_id UUID,
  p_scope_tipo TEXT DEFAULT NULL,
  p_scope_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_template RECORD;
  v_mural_post_id UUID;
  v_final_scope_tipo TEXT;
  v_final_scope_id TEXT;
BEGIN
  SELECT * INTO v_template FROM fabrica_templates WHERE id = p_template_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template não encontrado');
  END IF;
  
  IF v_template.status != 'aprovado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas templates aprovados podem ser publicados');
  END IF;
  
  IF NOT public.user_can_manage_fabrica_scope(auth.uid(), v_template.scope_tipo, v_template.scope_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  
  v_final_scope_tipo := COALESCE(p_scope_tipo, v_template.scope_tipo);
  v_final_scope_id := COALESCE(p_scope_id, v_template.scope_id, 'global');
  
  INSERT INTO mural_posts (
    autor_user_id,
    escopo_tipo,
    escopo_id,
    tipo,
    titulo,
    corpo_markdown,
    status
  ) VALUES (
    auth.uid(),
    v_final_scope_tipo,
    v_final_scope_id,
    'material',
    '📦 ' || v_template.titulo,
    COALESCE(v_template.texto_base, '') || E'\n\n---\n[Ver pacote completo](/voluntario/base/' || p_template_id || ')',
    'publicado'
  ) RETURNING id INTO v_mural_post_id;
  
  UPDATE fabrica_templates
  SET mural_post_id = v_mural_post_id, updated_at = now()
  WHERE id = p_template_id;
  
  RETURN jsonb_build_object('success', true, 'mural_post_id', v_mural_post_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. RPC: get_fabrica_metrics
CREATE OR REPLACE FUNCTION public.get_fabrica_metrics(
  p_scope_tipo TEXT DEFAULT 'global',
  p_scope_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_week_start DATE := date_trunc('week', now())::date;
BEGIN
  IF NOT public.user_can_manage_fabrica_scope(auth.uid(), p_scope_tipo, p_scope_id) THEN
    RETURN jsonb_build_object('error', 'Sem permissão');
  END IF;
  
  SELECT jsonb_build_object(
    'total_templates', (
      SELECT COUNT(*) FROM fabrica_templates t
      WHERE (p_scope_tipo = 'global' OR (t.scope_tipo = p_scope_tipo AND (p_scope_id IS NULL OR t.scope_id = p_scope_id)))
    ),
    'aprovados_total', (
      SELECT COUNT(*) FROM fabrica_templates t
      WHERE t.status = 'aprovado'
        AND (p_scope_tipo = 'global' OR (t.scope_tipo = p_scope_tipo AND (p_scope_id IS NULL OR t.scope_id = p_scope_id)))
    ),
    'aprovados_7d', (
      SELECT COUNT(*) FROM fabrica_templates t
      WHERE t.status = 'aprovado'
        AND t.aprovado_em >= now() - interval '7 days'
        AND (p_scope_tipo = 'global' OR (t.scope_tipo = p_scope_tipo AND (p_scope_id IS NULL OR t.scope_id = p_scope_id)))
    ),
    'em_revisao', (
      SELECT COUNT(*) FROM fabrica_templates t
      WHERE t.status = 'revisao'
        AND (p_scope_tipo = 'global' OR (t.scope_tipo = p_scope_tipo AND (p_scope_id IS NULL OR t.scope_id = p_scope_id)))
    ),
    'compartilhados_semana', (
      SELECT COUNT(DISTINCT d.user_id) FROM fabrica_downloads d
      JOIN fabrica_templates t ON t.id = d.template_id
      WHERE d.action = 'compartilhou'
        AND d.created_at >= v_week_start
        AND (p_scope_tipo = 'global' OR (t.scope_tipo = p_scope_tipo AND (p_scope_id IS NULL OR t.scope_id = p_scope_id)))
    ),
    'downloads_semana', (
      SELECT COUNT(*) FROM fabrica_downloads d
      JOIN fabrica_templates t ON t.id = d.template_id
      WHERE d.created_at >= v_week_start
        AND (p_scope_tipo = 'global' OR (t.scope_tipo = p_scope_tipo AND (p_scope_id IS NULL OR t.scope_id = p_scope_id)))
    ),
    'top_template', (
      SELECT jsonb_build_object('id', t.id, 'titulo', t.titulo, 'shares', COUNT(d.id))
      FROM fabrica_templates t
      LEFT JOIN fabrica_downloads d ON d.template_id = t.id AND d.action = 'compartilhou' AND d.created_at >= v_week_start
      WHERE t.status = 'aprovado'
        AND (p_scope_tipo = 'global' OR (t.scope_tipo = p_scope_tipo AND (p_scope_id IS NULL OR t.scope_id = p_scope_id)))
      GROUP BY t.id, t.titulo
      ORDER BY COUNT(d.id) DESC
      LIMIT 1
    ),
    'week_start', v_week_start
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 15. Trigger for updated_at
CREATE TRIGGER update_fabrica_templates_updated_at
BEFORE UPDATE ON public.fabrica_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 16. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.list_templates_for_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_template_action(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_template(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_review_template(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_template(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_template_to_mural(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_fabrica_metrics(TEXT, TEXT) TO authenticated;