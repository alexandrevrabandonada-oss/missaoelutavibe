
-- F4.1b: Server-side scoped validation RPC for evidences
-- Ensures coordinators can only act on evidences within their cell scope

CREATE OR REPLACE FUNCTION public.coord_validate_evidence(
  _evidence_id uuid,
  _action text,         -- 'validar' | 'pedir_ajuste' | 'rejeitar'
  _reason text DEFAULT NULL
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
  -- 1. Get the evidence's cell_id and current status
  SELECT cell_id, status INTO _ev_cell_id, _ev_status
  FROM public.evidences
  WHERE id = _evidence_id;

  IF _ev_cell_id IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado ou sem célula associada.';
  END IF;

  -- 2. Check caller has coordinator scope for this cell
  -- Global coordinators (COORD_GLOBAL, COORD_CITY with matching city) or CELL_COORD with exact cell match
  SELECT EXISTS (
    SELECT 1 FROM public.coord_roles cr
    WHERE cr.user_id = _caller_id
      AND (
        -- Global coord covers all
        cr.role = 'COORD_GLOBAL'
        -- City coord covers cells in their city
        OR (cr.role = 'COORD_CITY' AND cr.city_id = (
          SELECT cidade_id FROM public.cells WHERE id = _ev_cell_id
        ))
        -- Cell coord with exact match
        OR (cr.role = 'CELL_COORD' AND cr.cell_id = _ev_cell_id)
      )
  ) INTO _has_scope;

  -- Also check admins table
  IF NOT _has_scope THEN
    SELECT EXISTS (
      SELECT 1 FROM public.admins WHERE user_id = _caller_id
    ) INTO _has_scope;
  END IF;

  IF NOT _has_scope THEN
    RAISE EXCEPTION 'Sem permissão para agir nesta célula.';
  END IF;

  -- 3. Validate status allows this action
  IF _ev_status NOT IN ('enviado', 'precisa_ajuste') THEN
    RAISE EXCEPTION 'Registro com status "%" não permite ação de coordenação.', _ev_status;
  END IF;

  -- 4. Validate action and reason
  IF _action = 'validar' THEN
    UPDATE public.evidences
    SET status = 'validado',
        validated_by = _caller_id,
        validated_at = now()
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

-- 5. Tighten the UPDATE policy on evidences
-- Remove the broad coordinator UPDATE policy
DROP POLICY IF EXISTS "Coordinators can validate evidences" ON public.evidences;

-- New restrictive policy: users can only update their OWN evidences (for resubmission)
-- Coordinator updates now go through the SECURITY DEFINER RPC above
CREATE POLICY "Users can update own evidences"
ON public.evidences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
