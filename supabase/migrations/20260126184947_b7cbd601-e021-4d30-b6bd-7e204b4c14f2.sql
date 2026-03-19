-- Governance Audit Log v0
-- Tracks status changes and governance actions for content workflows

-- 1. Create governance_audit_log table
CREATE TABLE public.governance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('fabrica_template', 'roteiro_conversa', 'chamado_talentos', 'candidatura_chamado')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'status_change', 'created', 'updated', 'deleted', 'published_to_mural', 
    'approved', 'archived', 'requested_review', 'accepted', 'rejected'
  )),
  old_status TEXT,
  new_status TEXT,
  actor_id UUID NOT NULL,
  actor_nickname TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for performance
CREATE INDEX idx_governance_audit_entity ON public.governance_audit_log(entity_type, entity_id);
CREATE INDEX idx_governance_audit_created ON public.governance_audit_log(created_at DESC);
CREATE INDEX idx_governance_audit_actor ON public.governance_audit_log(actor_id);

-- 3. Enable RLS
ALTER TABLE public.governance_audit_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Coordinators can view audit logs
CREATE POLICY "Coordinators can view governance audit logs"
  ON public.governance_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_celula')
    )
    OR EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- System/authenticated users can insert (via RPC)
CREATE POLICY "Authenticated users can insert governance logs"
  ON public.governance_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- 5. RPC: log_governance_action
CREATE OR REPLACE FUNCTION public.log_governance_action(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_old_status TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL,
  p_meta JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_nickname TEXT;
  v_log_id UUID;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Get actor nickname (no PII in logs)
  SELECT COALESCE(nickname, 'Usuário') INTO v_nickname
  FROM profiles WHERE user_id = v_actor_id;
  
  INSERT INTO governance_audit_log (
    entity_type,
    entity_id,
    action,
    old_status,
    new_status,
    actor_id,
    actor_nickname,
    meta
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_action,
    p_old_status,
    p_new_status,
    v_actor_id,
    v_nickname,
    p_meta
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 6. RPC: get_entity_audit
CREATE OR REPLACE FUNCTION public.get_entity_audit(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  action TEXT,
  old_status TEXT,
  new_status TEXT,
  actor_nickname TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has coordinator role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'coordenador_estadual', 'coordenador_regional', 'coordenador_celula')
  ) AND NOT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  RETURN QUERY
  SELECT 
    gal.id,
    gal.action,
    gal.old_status,
    gal.new_status,
    gal.actor_nickname,
    gal.meta,
    gal.created_at
  FROM governance_audit_log gal
  WHERE gal.entity_type = p_entity_type
    AND gal.entity_id = p_entity_id
  ORDER BY gal.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_governance_action TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_entity_audit TO authenticated;

-- 8. Trigger for fabrica_templates status changes
CREATE OR REPLACE FUNCTION public.log_fabrica_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nickname TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COALESCE(nickname, 'Sistema') INTO v_nickname
    FROM profiles WHERE user_id = auth.uid();
    
    INSERT INTO governance_audit_log (
      entity_type,
      entity_id,
      action,
      old_status,
      new_status,
      actor_id,
      actor_nickname,
      meta
    ) VALUES (
      'fabrica_template',
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(v_nickname, 'Sistema'),
      jsonb_build_object('titulo', NEW.titulo)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fabrica_status_audit
  AFTER UPDATE ON public.fabrica_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.log_fabrica_status_change();

-- 9. Trigger for roteiros_conversa status changes
CREATE OR REPLACE FUNCTION public.log_roteiro_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nickname TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COALESCE(nickname, 'Sistema') INTO v_nickname
    FROM profiles WHERE user_id = auth.uid();
    
    INSERT INTO governance_audit_log (
      entity_type,
      entity_id,
      action,
      old_status,
      new_status,
      actor_id,
      actor_nickname,
      meta
    ) VALUES (
      'roteiro_conversa',
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(v_nickname, 'Sistema'),
      jsonb_build_object('titulo', NEW.titulo)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_roteiro_status_audit
  AFTER UPDATE ON public.roteiros_conversa
  FOR EACH ROW
  EXECUTE FUNCTION public.log_roteiro_status_change();

-- 10. Trigger for chamados_talentos status changes
CREATE OR REPLACE FUNCTION public.log_chamado_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nickname TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COALESCE(nickname, 'Sistema') INTO v_nickname
    FROM profiles WHERE user_id = auth.uid();
    
    INSERT INTO governance_audit_log (
      entity_type,
      entity_id,
      action,
      old_status,
      new_status,
      actor_id,
      actor_nickname,
      meta
    ) VALUES (
      'chamado_talentos',
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(v_nickname, 'Sistema'),
      jsonb_build_object('titulo', NEW.titulo)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chamado_status_audit
  AFTER UPDATE ON public.chamados_talentos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_chamado_status_change();

-- 11. Trigger for candidaturas_chamados status changes
CREATE OR REPLACE FUNCTION public.log_candidatura_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nickname TEXT;
  v_chamado_titulo TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COALESCE(nickname, 'Sistema') INTO v_nickname
    FROM profiles WHERE user_id = auth.uid();
    
    SELECT titulo INTO v_chamado_titulo
    FROM chamados_talentos WHERE id = NEW.chamado_id;
    
    INSERT INTO governance_audit_log (
      entity_type,
      entity_id,
      action,
      old_status,
      new_status,
      actor_id,
      actor_nickname,
      meta
    ) VALUES (
      'candidatura_chamado',
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(v_nickname, 'Sistema'),
      jsonb_build_object('chamado_titulo', v_chamado_titulo)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_candidatura_status_audit
  AFTER UPDATE ON public.candidaturas_chamados
  FOR EACH ROW
  EXECUTE FUNCTION public.log_candidatura_status_change();