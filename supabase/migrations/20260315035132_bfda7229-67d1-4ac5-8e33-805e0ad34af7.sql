
-- F19: Add coord_feedback column for pedagogical validation feedback
ALTER TABLE public.evidences ADD COLUMN IF NOT EXISTS coord_feedback text;

-- Update coord_validate_evidence RPC to accept optional feedback
CREATE OR REPLACE FUNCTION public.coord_validate_evidence(
  _evidence_id uuid,
  _action text,
  _reason text DEFAULT NULL,
  _feedback text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _ev_cell_id uuid;
  _ev_status text;
  _has_scope boolean := false;
BEGIN
  SELECT cell_id, status INTO _ev_cell_id, _ev_status
  FROM public.evidences
  WHERE id = _evidence_id;

  IF _ev_cell_id IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem célula associada.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.coord_roles cr
    WHERE cr.user_id = _caller_id
      AND (
        cr.role = 'COORD_GLOBAL'
        OR (cr.role = 'COORD_CITY' AND cr.city_id = (
          SELECT cidade_id FROM public.cells WHERE id = _ev_cell_id
        ))
        OR (cr.role = 'CELL_COORD' AND cr.cell_id = _ev_cell_id)
      )
  ) INTO _has_scope;

  IF NOT _has_scope THEN
    SELECT EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = _caller_id
    ) INTO _has_scope;
  END IF;

  IF NOT _has_scope THEN
    RAISE EXCEPTION 'Sem permissão para agir nesta célula.';
  END IF;

  IF _ev_status NOT IN ('enviado', 'precisa_ajuste') THEN
    RAISE EXCEPTION 'Registro com status "%" não permite ação de coordenação.', _ev_status;
  END IF;

  IF _action = 'validar' THEN
    UPDATE public.evidences
    SET status = 'validado',
        validated_by = _caller_id,
        validated_at = now(),
        coord_feedback = CASE WHEN _feedback IS NOT NULL AND trim(_feedback) != '' THEN trim(_feedback) ELSE NULL END
    WHERE id = _evidence_id;

  ELSIF _action = 'pedir_ajuste' THEN
    IF _reason IS NULL OR trim(_reason) = '' THEN
      RAISE EXCEPTION 'Informe como corrigir.';
    END IF;
    UPDATE public.evidences
    SET status = 'precisa_ajuste',
        how_to_fix = trim(_reason),
        validated_by = _caller_id,
        validated_at = now()
    WHERE id = _evidence_id;

  ELSIF _action = 'rejeitar' THEN
    IF _reason IS NULL OR trim(_reason) = '' THEN
      RAISE EXCEPTION 'Informe o motivo da rejeição.';
    END IF;
    UPDATE public.evidences
    SET status = 'rejeitado',
        rejection_reason = trim(_reason),
        validated_by = _caller_id,
        validated_at = now()
    WHERE id = _evidence_id;

  ELSE
    RAISE EXCEPTION 'Ação inválida: %', _action;
  END IF;

  RETURN jsonb_build_object('ok', true, 'evidence_id', _evidence_id, 'action', _action);
END;
$$;
