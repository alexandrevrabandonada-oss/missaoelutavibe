-- CRM Apoio/Voto v0: Support level layer for contacts
-- Adds support tracking without PII in events

-- 1. Add support columns to crm_contatos
ALTER TABLE public.crm_contatos
ADD COLUMN IF NOT EXISTS support_level text NOT NULL DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS support_level_updated_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS support_reason text NULL;

-- 2. Add constraint for valid values
ALTER TABLE public.crm_contatos
ADD CONSTRAINT crm_contatos_support_level_check 
CHECK (support_level IN ('unknown', 'negative', 'neutral', 'leaning', 'yes', 'mobilizer'));

-- 3. Create indexes for metrics queries
CREATE INDEX IF NOT EXISTS idx_crm_contatos_support_level 
ON public.crm_contatos(criado_por, support_level) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contatos_cidade_support 
ON public.crm_contatos(cidade, support_level) WHERE deleted_at IS NULL;

-- 4. RPC: Set contact support level (owner only)
CREATE OR REPLACE FUNCTION public.set_contact_support_level(
  _contact_id uuid,
  _support_level text,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_contact record;
  v_sanitized_reason text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate support level
  IF _support_level NOT IN ('unknown', 'negative', 'neutral', 'leaning', 'yes', 'mobilizer') THEN
    RAISE EXCEPTION 'Invalid support level';
  END IF;

  -- Get contact and verify ownership
  SELECT * INTO v_contact
  FROM crm_contatos
  WHERE id = _contact_id
    AND deleted_at IS NULL
    AND (criado_por = v_user_id OR atribuido_a = v_user_id OR assignee_id = v_user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found or access denied';
  END IF;

  -- Sanitize reason (trim, limit 140 chars, remove line breaks)
  IF _reason IS NOT NULL THEN
    v_sanitized_reason := regexp_replace(trim(_reason), E'[\\r\\n]+', ' ', 'g');
    v_sanitized_reason := left(v_sanitized_reason, 140);
  END IF;

  -- Update the contact
  UPDATE crm_contatos
  SET 
    support_level = _support_level,
    support_level_updated_at = now(),
    support_reason = v_sanitized_reason,
    updated_at = now()
  WHERE id = _contact_id;

  RETURN jsonb_build_object(
    'success', true,
    'support_level', _support_level
  );
END;
$$;

-- 5. RPC: Get my support metrics (volunteer view)
CREATE OR REPLACE FUNCTION public.get_my_support_metrics(_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_cutoff timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_cutoff := now() - (_days || ' days')::interval;

  SELECT jsonb_build_object(
    'total', COUNT(*),
    'unknown', COUNT(*) FILTER (WHERE support_level = 'unknown'),
    'negative', COUNT(*) FILTER (WHERE support_level = 'negative'),
    'neutral', COUNT(*) FILTER (WHERE support_level = 'neutral'),
    'leaning', COUNT(*) FILTER (WHERE support_level = 'leaning'),
    'yes', COUNT(*) FILTER (WHERE support_level = 'yes'),
    'mobilizer', COUNT(*) FILTER (WHERE support_level = 'mobilizer'),
    'changes_period', COUNT(*) FILTER (WHERE support_level_updated_at >= v_cutoff)
  ) INTO v_result
  FROM crm_contatos
  WHERE criado_por = v_user_id
    AND deleted_at IS NULL;

  RETURN v_result;
END;
$$;

-- 6. RPC: Get scope support metrics (coordinator/admin view)
CREATE OR REPLACE FUNCTION public.get_scope_support_metrics(
  _scope_tipo text DEFAULT 'cidade',
  _scope_id text DEFAULT NULL,
  _days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
  v_cutoff timestamptz;
  v_is_coordinator boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check coordinator access
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id = v_user_id 
    AND role IN ('coordenador', 'coordenador_regional', 'admin')
  ) INTO v_is_coordinator;

  IF NOT v_is_coordinator THEN
    RAISE EXCEPTION 'Access denied - coordinator role required';
  END IF;

  v_cutoff := now() - (_days || ' days')::interval;

  IF _scope_tipo = 'cidade' AND _scope_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'scope_tipo', 'cidade',
      'scope_id', _scope_id,
      'total', COUNT(*),
      'unknown', COUNT(*) FILTER (WHERE support_level = 'unknown'),
      'negative', COUNT(*) FILTER (WHERE support_level = 'negative'),
      'neutral', COUNT(*) FILTER (WHERE support_level = 'neutral'),
      'leaning', COUNT(*) FILTER (WHERE support_level = 'leaning'),
      'yes', COUNT(*) FILTER (WHERE support_level = 'yes'),
      'mobilizer', COUNT(*) FILTER (WHERE support_level = 'mobilizer'),
      'changes_period', COUNT(*) FILTER (WHERE support_level_updated_at >= v_cutoff),
      'conversion_rate', ROUND(
        COALESCE(
          100.0 * COUNT(*) FILTER (WHERE support_level IN ('yes', 'mobilizer')) / NULLIF(COUNT(*), 0),
          0
        ), 1
      )
    ) INTO v_result
    FROM crm_contatos
    WHERE cidade = _scope_id
      AND deleted_at IS NULL;
  ELSE
    -- All contacts user can access
    SELECT jsonb_build_object(
      'scope_tipo', 'all',
      'total', COUNT(*),
      'unknown', COUNT(*) FILTER (WHERE support_level = 'unknown'),
      'negative', COUNT(*) FILTER (WHERE support_level = 'negative'),
      'neutral', COUNT(*) FILTER (WHERE support_level = 'neutral'),
      'leaning', COUNT(*) FILTER (WHERE support_level = 'leaning'),
      'yes', COUNT(*) FILTER (WHERE support_level = 'yes'),
      'mobilizer', COUNT(*) FILTER (WHERE support_level = 'mobilizer'),
      'changes_period', COUNT(*) FILTER (WHERE support_level_updated_at >= v_cutoff),
      'conversion_rate', ROUND(
        COALESCE(
          100.0 * COUNT(*) FILTER (WHERE support_level IN ('yes', 'mobilizer')) / NULLIF(COUNT(*), 0),
          0
        ), 1
      )
    ) INTO v_result
    FROM crm_contatos
    WHERE deleted_at IS NULL;
  END IF;

  RETURN v_result;
END;
$$;