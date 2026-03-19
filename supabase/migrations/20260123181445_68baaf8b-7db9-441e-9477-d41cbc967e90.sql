-- ===========================================
-- DELEGAÇÃO & PERMISSÕES v1 - FULL
-- Table + Functions + RLS in one migration
-- ===========================================

-- Table: role_invites
CREATE TABLE public.role_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_tipo TEXT NOT NULL CHECK (scope_tipo IN ('celula', 'cidade', 'estado')),
  scope_id TEXT NOT NULL,
  role_key TEXT NOT NULL,
  invited_email TEXT,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'expirado', 'revogado')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_role_invites_scope ON public.role_invites(scope_tipo, scope_id, status);
CREATE INDEX idx_role_invites_user ON public.role_invites(invited_user_id, status);
CREATE INDEX idx_role_invites_token ON public.role_invites(token) WHERE status = 'pendente';
CREATE INDEX idx_role_invites_expires ON public.role_invites(expires_at) WHERE status = 'pendente';

-- Enable RLS
ALTER TABLE public.role_invites ENABLE ROW LEVEL SECURITY;

-- Generate secure random token
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(24), 'base64');
END;
$$;

-- Check if user can manage roles in a scope
CREATE OR REPLACE FUNCTION public.can_manage_scope_roles(
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
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.revoked_at IS NULL
      AND (
        ur.role = 'admin'
        OR (ur.role = 'coordenador_estadual' AND _scope_tipo IN ('estado', 'cidade', 'celula'))
        OR (ur.role = 'coordenador_regional' AND _scope_tipo IN ('cidade', 'celula'))
        OR (ur.role = 'coordenador_celula' AND _scope_tipo = 'celula' AND ur.cell_id::text = _scope_id)
      )
  )
$$;

-- Check if role can be granted by the operator
CREATE OR REPLACE FUNCTION public.can_grant_role_in_scope(
  _operator_id UUID,
  _role_key TEXT,
  _scope_tipo TEXT,
  _scope_id TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = _operator_id AND role = 'admin' AND revoked_at IS NULL
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = _operator_id AND role = 'coordenador_estadual' AND revoked_at IS NULL
    ) AND _role_key IN ('coordenador_regional', 'coordenador_celula', 'voluntario') THEN true
    WHEN EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = _operator_id AND role = 'coordenador_regional' AND revoked_at IS NULL
    ) AND _role_key IN ('coordenador_celula', 'voluntario') THEN true
    WHEN EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = _operator_id 
        AND ur.role = 'coordenador_celula' 
        AND ur.revoked_at IS NULL
        AND ur.cell_id::text = _scope_id
    ) AND _role_key = 'voluntario' THEN true
    ELSE false
  END
$$;

-- RLS Policies
CREATE POLICY "Users can view their own invites"
ON public.role_invites
FOR SELECT
USING (
  invited_user_id = auth.uid()
  OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR created_by = auth.uid()
);

CREATE POLICY "Managers can view scope invites"
ON public.role_invites
FOR SELECT
USING (
  can_manage_scope_roles(auth.uid(), scope_tipo, scope_id)
);

-- RPC: GET MY PENDING INVITES
CREATE OR REPLACE FUNCTION public.get_my_pending_invites()
RETURNS TABLE (
  id UUID,
  scope_tipo TEXT,
  scope_id TEXT,
  scope_name TEXT,
  role_key TEXT,
  role_label TEXT,
  expires_at TIMESTAMPTZ,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  token TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ri.id,
    ri.scope_tipo,
    ri.scope_id,
    CASE 
      WHEN ri.scope_tipo = 'celula' THEN (SELECT c.name FROM cells c WHERE c.id = ri.scope_id::uuid)
      ELSE ri.scope_id
    END as scope_name,
    ri.role_key,
    CASE ri.role_key
      WHEN 'voluntario' THEN 'Voluntário'
      WHEN 'coordenador_celula' THEN 'Coordenador de Célula'
      WHEN 'coordenador_regional' THEN 'Coordenador Regional'
      WHEN 'coordenador_estadual' THEN 'Coordenador Estadual'
      WHEN 'admin' THEN 'Admin'
      ELSE ri.role_key
    END as role_label,
    ri.expires_at,
    p.full_name as created_by_name,
    ri.created_at,
    ri.token
  FROM role_invites ri
  LEFT JOIN profiles p ON p.id = ri.created_by
  WHERE ri.status = 'pendente'
    AND ri.expires_at > now()
    AND (
      ri.invited_user_id = auth.uid()
      OR ri.invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  ORDER BY ri.created_at DESC;
END;
$$;

-- RPC: LIST ROLE INVITES FOR SCOPE
CREATE OR REPLACE FUNCTION public.list_role_invites(
  p_scope_tipo TEXT DEFAULT NULL,
  p_scope_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  scope_tipo TEXT,
  scope_id TEXT,
  role_key TEXT,
  invited_email TEXT,
  invited_user_id UUID,
  invited_user_name TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ri.id,
    ri.scope_tipo,
    ri.scope_id,
    ri.role_key,
    ri.invited_email,
    ri.invited_user_id,
    pu.full_name as invited_user_name,
    ri.status,
    ri.expires_at,
    ri.created_by,
    pc.full_name as created_by_name,
    ri.created_at,
    ri.accepted_at
  FROM role_invites ri
  LEFT JOIN profiles pu ON pu.id = ri.invited_user_id
  LEFT JOIN profiles pc ON pc.id = ri.created_by
  WHERE (p_scope_tipo IS NULL OR ri.scope_tipo = p_scope_tipo)
    AND (p_scope_id IS NULL OR ri.scope_id = p_scope_id)
    AND (p_status IS NULL OR ri.status = p_status)
    AND (
      ri.created_by = auth.uid()
      OR ri.invited_user_id = auth.uid()
      OR can_manage_scope_roles(auth.uid(), ri.scope_tipo, ri.scope_id)
    )
  ORDER BY ri.created_at DESC;
END;
$$;

-- RPC: GET INVITE STATS FOR OPS DASHBOARD
CREATE OR REPLACE FUNCTION public.get_role_invite_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_pendentes', (SELECT COUNT(*) FROM role_invites WHERE status = 'pendente' AND expires_at > now()),
    'expirando_48h', (SELECT COUNT(*) FROM role_invites WHERE status = 'pendente' AND expires_at BETWEEN now() AND now() + interval '48 hours'),
    'aceitos_7d', (SELECT COUNT(*) FROM role_invites WHERE status = 'aceito' AND accepted_at > now() - interval '7 days'),
    'revogados_7d', (SELECT COUNT(*) FROM role_invites WHERE status = 'revogado' AND revoked_at > now() - interval '7 days')
  );
$$;

-- RPC: CREATE ROLE INVITE
CREATE OR REPLACE FUNCTION public.create_role_invite(
  p_scope_tipo TEXT,
  p_scope_id TEXT,
  p_role_key TEXT,
  p_invited_email TEXT DEFAULT NULL,
  p_invited_user_id UUID DEFAULT NULL,
  p_expires_days INT DEFAULT 7
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_id UUID := auth.uid();
  v_token TEXT;
  v_invite_id UUID;
  v_target_user_id UUID;
BEGIN
  IF p_role_key NOT IN ('voluntario', 'coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Papel inválido');
  END IF;

  IF NOT can_grant_role_in_scope(v_operator_id, p_role_key, p_scope_tipo, p_scope_id) THEN
    RETURN json_build_object('success', false, 'error', 'Você não tem permissão para conceder este papel neste escopo');
  END IF;

  IF p_invited_email IS NULL AND p_invited_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Informe email ou usuário');
  END IF;

  IF p_invited_email IS NOT NULL THEN
    SELECT id INTO v_target_user_id FROM auth.users WHERE email = lower(trim(p_invited_email));
  ELSE
    v_target_user_id := p_invited_user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM role_invites
    WHERE scope_tipo = p_scope_tipo AND scope_id = p_scope_id AND role_key = p_role_key
      AND status = 'pendente' AND expires_at > now()
      AND ((invited_user_id IS NOT NULL AND invited_user_id = v_target_user_id)
        OR (invited_email IS NOT NULL AND lower(invited_email) = lower(p_invited_email)))
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Já existe um convite pendente para este usuário/email');
  END IF;

  v_token := generate_invite_token();

  INSERT INTO role_invites (scope_tipo, scope_id, role_key, invited_email, invited_user_id, token, expires_at, created_by)
  VALUES (p_scope_tipo, p_scope_id, p_role_key, lower(trim(p_invited_email)), v_target_user_id, v_token, now() + (p_expires_days || ' days')::interval, v_operator_id)
  RETURNING id INTO v_invite_id;

  IF v_target_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, tipo, titulo, mensagem, link)
    VALUES (v_target_user_id, 'role_invite', 'Convite para novo papel', 'Você foi convidado para assumir o papel de ' || p_role_key, '/voluntario/convites');
  END IF;

  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_data)
  VALUES (v_operator_id, 'role_invites', v_invite_id::text, 'create', json_build_object('scope_tipo', p_scope_tipo, 'scope_id', p_scope_id, 'role_key', p_role_key, 'invited_email', p_invited_email, 'invited_user_id', v_target_user_id));

  RETURN json_build_object('success', true, 'invite_id', v_invite_id, 'token', v_token);
END;
$$;

-- RPC: ACCEPT ROLE INVITE
CREATE OR REPLACE FUNCTION public.accept_role_invite(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_email TEXT;
  v_invite RECORD;
  v_new_role_id UUID;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  SELECT * INTO v_invite FROM role_invites WHERE token = p_token FOR UPDATE;

  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Convite não encontrado'); END IF;
  IF v_invite.status != 'pendente' THEN RETURN json_build_object('success', false, 'error', 'Este convite já foi ' || v_invite.status); END IF;
  IF v_invite.expires_at < now() THEN UPDATE role_invites SET status = 'expirado' WHERE id = v_invite.id; RETURN json_build_object('success', false, 'error', 'Este convite expirou'); END IF;
  IF v_invite.invited_user_id IS NOT NULL AND v_invite.invited_user_id != v_user_id THEN RETURN json_build_object('success', false, 'error', 'Este convite não é para você'); END IF;
  IF v_invite.invited_user_id IS NULL AND lower(v_invite.invited_email) != lower(v_user_email) THEN RETURN json_build_object('success', false, 'error', 'Este convite foi enviado para outro email'); END IF;

  INSERT INTO user_roles (user_id, role, cell_id, cidade, regiao, created_by)
  VALUES (v_user_id, v_invite.role_key::app_role, CASE WHEN v_invite.scope_tipo = 'celula' THEN v_invite.scope_id::uuid ELSE NULL END, CASE WHEN v_invite.scope_tipo = 'cidade' THEN v_invite.scope_id ELSE NULL END, CASE WHEN v_invite.scope_tipo = 'estado' THEN v_invite.scope_id ELSE NULL END, v_invite.created_by)
  RETURNING id INTO v_new_role_id;

  UPDATE role_invites SET status = 'aceito', accepted_by = v_user_id, accepted_at = now(), invited_user_id = v_user_id WHERE id = v_invite.id;
  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_data) VALUES (v_user_id, 'role_invites', v_invite.id::text, 'accept', json_build_object('role_key', v_invite.role_key, 'scope_tipo', v_invite.scope_tipo, 'scope_id', v_invite.scope_id, 'new_role_id', v_new_role_id));

  RETURN json_build_object('success', true, 'role_id', v_new_role_id);
END;
$$;

-- RPC: REVOKE ROLE INVITE
CREATE OR REPLACE FUNCTION public.revoke_role_invite(p_invite_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite FROM role_invites WHERE id = p_invite_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Convite não encontrado'); END IF;
  IF v_invite.status != 'pendente' THEN RETURN json_build_object('success', false, 'error', 'Apenas convites pendentes podem ser revogados'); END IF;
  IF NOT can_manage_scope_roles(v_user_id, v_invite.scope_tipo, v_invite.scope_id) THEN RETURN json_build_object('success', false, 'error', 'Sem permissão para revogar este convite'); END IF;

  UPDATE role_invites SET status = 'revogado', revoked_by = v_user_id, revoked_at = now() WHERE id = p_invite_id;
  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, old_data) VALUES (v_user_id, 'role_invites', p_invite_id::text, 'revoke', json_build_object('role_key', v_invite.role_key, 'scope', v_invite.scope_tipo || ':' || v_invite.scope_id));
  RETURN json_build_object('success', true);
END;
$$;

-- RPC: SAFE REVOKE ROLE
CREATE OR REPLACE FUNCTION public.safe_revoke_user_role(p_role_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_id UUID := auth.uid();
  v_role RECORD;
  v_count INT;
BEGIN
  SELECT * INTO v_role FROM user_roles WHERE id = p_role_id AND revoked_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Papel não encontrado ou já revogado'); END IF;

  IF NOT can_manage_scope_roles(v_operator_id, COALESCE(v_role.cidade, v_role.regiao, v_role.cell_id::text, 'estado'), COALESCE(v_role.cidade, v_role.regiao, v_role.cell_id::text, 'SP')) THEN
    RETURN json_build_object('success', false, 'error', 'Sem permissão para revogar este papel');
  END IF;

  IF v_role.role = 'admin' THEN
    SELECT COUNT(*) INTO v_count FROM user_roles WHERE role = 'admin' AND revoked_at IS NULL AND id != p_role_id;
    IF v_count < 1 THEN RETURN json_build_object('success', false, 'error', 'Não é possível remover o último admin do sistema'); END IF;
  END IF;

  IF v_role.role = 'coordenador_estadual' THEN
    SELECT COUNT(*) INTO v_count FROM user_roles WHERE role = 'coordenador_estadual' AND revoked_at IS NULL AND id != p_role_id;
    IF v_count < 1 THEN RETURN json_build_object('success', false, 'error', 'Não é possível remover o último coordenador estadual'); END IF;
  END IF;

  UPDATE user_roles SET revoked_at = now(), revoked_by = v_operator_id, reason = p_reason WHERE id = p_role_id;
  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, old_data) VALUES (v_operator_id, 'user_roles', p_role_id::text, 'safe_revoke', json_build_object('target_user_id', v_role.user_id, 'role', v_role.role, 'reason', p_reason));
  RETURN json_build_object('success', true);
END;
$$;

-- RPC: RESEND INVITE
CREATE OR REPLACE FUNCTION public.resend_role_invite(p_invite_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_id UUID := auth.uid();
  v_invite RECORD;
  v_new_token TEXT;
BEGIN
  SELECT * INTO v_invite FROM role_invites WHERE id = p_invite_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Convite não encontrado'); END IF;
  IF v_invite.status NOT IN ('pendente', 'expirado') THEN RETURN json_build_object('success', false, 'error', 'Apenas convites pendentes ou expirados podem ser reenviados'); END IF;
  IF NOT can_manage_scope_roles(v_operator_id, v_invite.scope_tipo, v_invite.scope_id) THEN RETURN json_build_object('success', false, 'error', 'Sem permissão'); END IF;

  v_new_token := generate_invite_token();
  UPDATE role_invites SET token = v_new_token, status = 'pendente', expires_at = now() + interval '7 days' WHERE id = p_invite_id;

  IF v_invite.invited_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, tipo, titulo, mensagem, link) VALUES (v_invite.invited_user_id, 'role_invite', 'Convite reenviado', 'Seu convite para ' || v_invite.role_key || ' foi renovado', '/voluntario/convites');
  END IF;

  RETURN json_build_object('success', true, 'token', v_new_token);
END;
$$;