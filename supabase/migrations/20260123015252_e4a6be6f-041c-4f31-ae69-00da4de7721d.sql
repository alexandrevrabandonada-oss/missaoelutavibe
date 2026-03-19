-- =====================================================
-- LGPD & OBSERVABILITY v0
-- =====================================================

-- 1) LGPD Requests table
CREATE TYPE public.lgpd_request_tipo AS ENUM ('export', 'exclusao', 'correcao');
CREATE TYPE public.lgpd_request_status AS ENUM ('aberto', 'em_andamento', 'concluido', 'negado');

CREATE TABLE public.lgpd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo public.lgpd_request_tipo NOT NULL,
  status public.lgpd_request_status NOT NULL DEFAULT 'aberto',
  motivo TEXT,
  resposta TEXT,
  processado_por UUID,
  processado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests, admins can see all
CREATE POLICY "Users can view own LGPD requests"
  ON public.lgpd_requests FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Only users can create their own requests
CREATE POLICY "Users can create own LGPD requests"
  ON public.lgpd_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins can update requests
CREATE POLICY "Admins can update LGPD requests"
  ON public.lgpd_requests FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- 2) Retention Policies table (simple v0)
CREATE TABLE public.retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tabela TEXT NOT NULL,
  dias_reter INTEGER NOT NULL DEFAULT 365,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;

-- Only admins can manage retention policies
CREATE POLICY "Admins can manage retention policies"
  ON public.retention_policies FOR ALL
  USING (public.is_admin(auth.uid()));

-- Insert default retention policies
INSERT INTO public.retention_policies (nome, tabela, dias_reter) VALUES
  ('Tickets antigos', 'tickets', 730),
  ('Interações CRM', 'crm_interacoes', 365),
  ('Audit logs', 'audit_logs', 1095),
  ('Evidências validadas', 'evidences', 1825);

-- 3) Updated_at triggers
CREATE TRIGGER update_lgpd_requests_updated_at
  BEFORE UPDATE ON public.lgpd_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_retention_policies_updated_at
  BEFORE UPDATE ON public.retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Enhanced audit trigger function for critical actions
CREATE OR REPLACE FUNCTION public.log_critical_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5) Audit triggers for critical tables (only add if not exists)
DO $$
BEGIN
  -- Mural posts (ocultar)
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_mural_posts') THEN
    CREATE TRIGGER audit_mural_posts
      AFTER UPDATE ON public.mural_posts
      FOR EACH ROW
      WHEN (OLD.status IS DISTINCT FROM NEW.status)
      EXECUTE FUNCTION public.log_critical_action();
  END IF;

  -- Evidences (aprovar/rejeitar)
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_evidences') THEN
    CREATE TRIGGER audit_evidences
      AFTER UPDATE ON public.evidences
      FOR EACH ROW
      WHEN (OLD.status IS DISTINCT FROM NEW.status)
      EXECUTE FUNCTION public.log_critical_action();
  END IF;

  -- Chamados talentos
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_chamados_talentos') THEN
    CREATE TRIGGER audit_chamados_talentos
      AFTER INSERT OR UPDATE ON public.chamados_talentos
      FOR EACH ROW
      EXECUTE FUNCTION public.log_critical_action();
  END IF;

  -- CRM contatos
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_crm_contatos') THEN
    CREATE TRIGGER audit_crm_contatos
      AFTER INSERT OR UPDATE OR DELETE ON public.crm_contatos
      FOR EACH ROW
      EXECUTE FUNCTION public.log_critical_action();
  END IF;

  -- LGPD requests
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_lgpd_requests') THEN
    CREATE TRIGGER audit_lgpd_requests
      AFTER INSERT OR UPDATE ON public.lgpd_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.log_critical_action();
  END IF;
END $$;

-- 6) RPC: Generate user data export (admin only, sanitized)
CREATE OR REPLACE FUNCTION public.generate_lgpd_export(_target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT public.is_admin(auth.uid()) INTO caller_is_admin;
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores podem gerar exports LGPD';
  END IF;

  -- Build export data (sanitized, no third-party data)
  SELECT jsonb_build_object(
    'export_date', now(),
    'user_id', _target_user_id,
    'profile', (
      SELECT jsonb_build_object(
        'full_name', full_name,
        'nickname', nickname,
        'city', city,
        'state', state,
        'neighborhood', neighborhood,
        'created_at', created_at,
        'onboarding_status', onboarding_status,
        'volunteer_status', volunteer_status,
        'lgpd_consent', lgpd_consent,
        'lgpd_consent_at', lgpd_consent_at
      )
      FROM profiles WHERE id = _target_user_id
    ),
    'missions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'title', title,
        'type', type,
        'status', status,
        'created_at', created_at,
        'points', points
      )), '[]'::jsonb)
      FROM missions WHERE assigned_to = _target_user_id
    ),
    'evidences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'mission_id', mission_id,
        'status', status,
        'created_at', created_at,
        'content_type', content_type
      )), '[]'::jsonb)
      FROM evidences WHERE user_id = _target_user_id
    ),
    'tickets_created', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'titulo', titulo,
        'categoria', categoria,
        'status', status,
        'criado_em', criado_em
      )), '[]'::jsonb)
      FROM tickets WHERE criado_por = _target_user_id
    ),
    'crm_contatos_created', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'nome', nome,
        'cidade', cidade,
        'status', status,
        'created_at', created_at
        -- Excluding third-party PII (telefone, email)
      )), '[]'::jsonb)
      FROM crm_contatos WHERE criado_por = _target_user_id
    ),
    'mural_posts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'tipo', tipo,
        'titulo', titulo,
        'created_at', created_at,
        'status', status
      )), '[]'::jsonb)
      FROM mural_posts WHERE autor_user_id = _target_user_id
    ),
    'demandas_created', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'titulo', titulo,
        'tipo', tipo,
        'status', status,
        'created_at', created_at
      )), '[]'::jsonb)
      FROM demandas WHERE criada_por = _target_user_id
    ),
    'convites_created', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'code', code,
        'criado_em', criado_em,
        'canal_declarado', canal_declarado
      )), '[]'::jsonb)
      FROM convites WHERE criado_por = _target_user_id
    ),
    'origin_info', jsonb_build_object(
      'convite_usado', (SELECT code FROM convites WHERE id = (SELECT origem_convite_id FROM profiles WHERE id = _target_user_id)),
      'referrer_id', (SELECT referrer_user_id FROM profiles WHERE id = _target_user_id)
    ),
    'lgpd_requests', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'tipo', tipo,
        'status', status,
        'created_at', created_at
      )), '[]'::jsonb)
      FROM lgpd_requests WHERE user_id = _target_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- 7) RPC: Get pending LGPD requests count (for ops dashboard)
CREATE OR REPLACE FUNCTION public.get_lgpd_pending_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM lgpd_requests
  WHERE status IN ('aberto', 'em_andamento');
$$;

-- 8) RPC: Archive old records based on retention policy (v0 - mark only)
CREATE OR REPLACE FUNCTION public.apply_retention_policies()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy RECORD;
  affected_count INTEGER;
  results JSONB := '[]'::jsonb;
BEGIN
  -- Only admins can run this
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem aplicar políticas de retenção';
  END IF;

  FOR policy IN SELECT * FROM retention_policies WHERE ativo = true LOOP
    affected_count := 0;
    
    -- Mark old tickets as archived (status = 'arquivado')
    IF policy.tabela = 'tickets' THEN
      UPDATE tickets
      SET status = 'arquivado'
      WHERE status NOT IN ('arquivado')
        AND criado_em < now() - (policy.dias_reter || ' days')::interval;
      GET DIAGNOSTICS affected_count = ROW_COUNT;
    END IF;

    -- For audit_logs, we don't delete, just count what would be affected
    IF policy.tabela = 'audit_logs' THEN
      SELECT COUNT(*) INTO affected_count
      FROM audit_logs
      WHERE created_at < now() - (policy.dias_reter || ' days')::interval;
    END IF;

    results := results || jsonb_build_object(
      'tabela', policy.tabela,
      'dias_reter', policy.dias_reter,
      'registros_afetados', affected_count
    );
  END LOOP;

  RETURN results;
END;
$$;