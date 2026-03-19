-- Add rejection_reason_code to evidences for structured feedback
ALTER TABLE public.evidences
ADD COLUMN IF NOT EXISTS rejection_reason_code text;

-- Add comment explaining valid codes
COMMENT ON COLUMN public.evidences.rejection_reason_code IS 'Structured rejection code: foto_ruim|falta_contexto|sem_prova|outro';

-- RPC: validate_evidence_with_feedback
-- Validates evidence and creates notification for volunteer
CREATE OR REPLACE FUNCTION public.validate_evidence_with_feedback(
  p_evidence_id uuid,
  p_status text,
  p_reason_code text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_evidence record;
  v_volunteer_id uuid;
  v_mission_title text;
  v_notif_title text;
  v_notif_body text;
  v_notif_tipo text;
  v_sanitized_note text;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Check RBAC: must be admin or coordinator
  IF NOT (
    EXISTS(SELECT 1 FROM admins WHERE user_id = v_user_id) OR
    public.has_role_in_scope(v_user_id, 'coordenador', 'global', NULL)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Validate status
  IF p_status NOT IN ('aprovada', 'reprovada') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status');
  END IF;

  -- Get evidence and mission info
  SELECT e.*, m.title INTO v_evidence
  FROM evidences e
  JOIN missions m ON m.id = e.mission_id
  WHERE e.id = p_evidence_id;

  IF v_evidence IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'evidence_not_found');
  END IF;

  v_volunteer_id := v_evidence.user_id;
  v_mission_title := v_evidence.title;

  -- Sanitize note (remove potential PII: phones, emails)
  v_sanitized_note := p_note;
  IF v_sanitized_note IS NOT NULL THEN
    -- Remove phone patterns
    v_sanitized_note := regexp_replace(v_sanitized_note, '\d{2}[\s\-]?\d{4,5}[\s\-]?\d{4}', '[tel]', 'g');
    -- Remove email patterns
    v_sanitized_note := regexp_replace(v_sanitized_note, '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', '[email]', 'g');
    -- Limit length
    v_sanitized_note := left(v_sanitized_note, 200);
  END IF;

  -- Update evidence
  UPDATE evidences
  SET 
    status = p_status::evidence_status,
    validated_by = v_user_id,
    validated_at = now(),
    rejection_reason_code = CASE WHEN p_status = 'reprovada' THEN p_reason_code ELSE NULL END,
    rejection_reason = CASE WHEN p_status = 'reprovada' THEN v_sanitized_note ELSE NULL END,
    updated_at = now()
  WHERE id = p_evidence_id;

  -- Update mission status
  UPDATE missions
  SET 
    status = CASE WHEN p_status = 'aprovada' THEN 'validada' ELSE 'reprovada' END,
    updated_at = now()
  WHERE id = v_evidence.mission_id;

  -- Build notification
  IF p_status = 'aprovada' THEN
    v_notif_tipo := 'evidence_approved';
    v_notif_title := '✅ Evidência aprovada!';
    v_notif_body := 'Sua ação foi validada com sucesso.';
  ELSE
    v_notif_tipo := 'evidence_rejected';
    v_notif_title := '⚠️ Ajuste necessário';
    v_notif_body := CASE p_reason_code
      WHEN 'foto_ruim' THEN 'A foto precisa mostrar melhor a ação realizada.'
      WHEN 'falta_contexto' THEN 'Faltou contexto sobre o que foi feito.'
      WHEN 'sem_prova' THEN 'Não conseguimos identificar a ação na evidência.'
      ELSE 'Sua evidência precisa de ajustes.'
    END;
    IF v_sanitized_note IS NOT NULL AND v_sanitized_note != '' THEN
      v_notif_body := v_notif_body || ' ' || v_sanitized_note;
    END IF;
  END IF;

  -- Insert notification
  INSERT INTO notificacoes (user_id, tipo, titulo, corpo, href, meta)
  VALUES (
    v_volunteer_id,
    v_notif_tipo,
    v_notif_title,
    v_notif_body,
    '/voluntario/missao/' || v_evidence.mission_id::text,
    jsonb_build_object(
      'evidence_id', p_evidence_id,
      'mission_id', v_evidence.mission_id,
      'status', p_status,
      'reason_code', p_reason_code
    )
  );

  -- Log growth event (no PII)
  PERFORM public.log_growth_event(
    'evidence_validated',
    jsonb_build_object('status', p_status, 'reason_code', p_reason_code)
  );

  RETURN jsonb_build_object(
    'success', true,
    'evidence_id', p_evidence_id,
    'status', p_status
  );
END;
$$;

-- RPC: get_my_validation_feedback
-- Returns recent validation feedback for the authenticated user
CREATE OR REPLACE FUNCTION public.get_my_validation_feedback(p_limit int DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('items', '[]'::jsonb);
  END IF;

  SELECT jsonb_agg(item ORDER BY validated_at DESC)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'evidence_id', e.id,
      'mission_id', e.mission_id,
      'mission_title', m.title,
      'status', e.status,
      'reason_code', e.rejection_reason_code,
      'reason_text', e.rejection_reason,
      'how_to_fix', e.how_to_fix,
      'validated_at', e.validated_at,
      'href', '/voluntario/missao/' || e.mission_id::text
    ) as item,
    e.validated_at
    FROM evidences e
    JOIN missions m ON m.id = e.mission_id
    WHERE e.user_id = v_user_id
      AND e.validated_at IS NOT NULL
      AND e.validated_at > now() - interval '7 days'
    ORDER BY e.validated_at DESC
    LIMIT p_limit
  ) sub;

  RETURN jsonb_build_object('items', COALESCE(v_result, '[]'::jsonb));
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_evidence_with_feedback(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_validation_feedback(int) TO authenticated;