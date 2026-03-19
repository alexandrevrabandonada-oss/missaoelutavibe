
-- Fix log_evidence_validation trigger: support new status values 'validado' and 'rejeitado'
CREATE OR REPLACE FUNCTION public.log_evidence_validation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validator_id UUID;
  v_is_owner BOOLEAN;
BEGIN
  -- Only log when status changes to approved/rejected (old or new values)
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  IF NEW.status NOT IN ('aprovada', 'reprovada', 'validado', 'rejeitado') THEN
    RETURN NEW;
  END IF;
  
  v_validator_id := COALESCE(NEW.validated_by, auth.uid());
  
  -- Check if validator is the evidence owner (self-validation)
  v_is_owner := (NEW.user_id = v_validator_id);
  
  -- Log to audit_logs for traceability
  INSERT INTO public.audit_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    old_data,
    new_data
  ) VALUES (
    v_validator_id,
    'evidence_validation',
    NEW.id,
    'validate_evidence',
    jsonb_build_object(
      'previous_status', OLD.status,
      'evidence_owner', OLD.user_id,
      'mission_id', OLD.mission_id
    ),
    jsonb_build_object(
      'new_status', NEW.status,
      'is_self_validation', v_is_owner,
      'rejection_reason', NEW.rejection_reason,
      'validated_at', NEW.validated_at
    )
  );
  
  -- Flag suspicious pattern: coordinator validating their own evidence
  IF v_is_owner AND NEW.status IN ('aprovada', 'validado') THEN
    INSERT INTO public.audit_logs (
      user_id,
      entity_type,
      entity_id,
      action,
      new_data
    ) VALUES (
      v_validator_id,
      'security_alert',
      NEW.id,
      'self_approval_evidence',
      jsonb_build_object(
        'evidence_id', NEW.id,
        'mission_id', NEW.mission_id,
        'alert_type', 'self_approval',
        'severity', 'medium'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;
