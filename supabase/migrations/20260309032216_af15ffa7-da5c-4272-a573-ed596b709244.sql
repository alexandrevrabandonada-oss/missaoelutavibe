
-- F6.2b: Secure RPC for closing a cell cycle with full validation
-- Replaces client-side direct update with server-side enforcement

CREATE OR REPLACE FUNCTION public.fechar_ciclo_celula(
  _ciclo_id UUID,
  _fechamento_json JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ciclo RECORD;
  v_cell_city_id UUID;
BEGIN
  -- 1. Fetch cycle
  SELECT id, titulo, celula_id, status, fechado_em, fim
  INTO v_ciclo
  FROM ciclos_semanais
  WHERE id = _ciclo_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ciclo não encontrado');
  END IF;

  -- 2. Must belong to a cell
  IF v_ciclo.celula_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ciclo não está vinculado a uma célula');
  END IF;

  -- 3. Check caller can operate on this cell
  SELECT cidade_id INTO v_cell_city_id FROM cells WHERE id = v_ciclo.celula_id;
  
  IF NOT public.can_operate_coord(v_cell_city_id, v_ciclo.celula_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para encerrar ciclo desta célula');
  END IF;

  -- 4. Must be active
  IF v_ciclo.status != 'ativo' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ciclo não está ativo (status: ' || v_ciclo.status || ')');
  END IF;

  -- 5. Not already closed
  IF v_ciclo.fechado_em IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ciclo já foi encerrado');
  END IF;

  -- 6. Must be past end date
  IF now() < v_ciclo.fim::timestamptz THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ciclo ainda não chegou ao fim');
  END IF;

  -- 7. Execute closure
  UPDATE ciclos_semanais
  SET
    status = 'encerrado',
    fechado_em = now(),
    fechado_por = auth.uid(),
    fechamento_json = _fechamento_json,
    updated_at = now()
  WHERE id = _ciclo_id
    AND status = 'ativo'
    AND fechado_em IS NULL;

  -- Double-check update worked (race condition guard)
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Falha ao encerrar ciclo (possível execução duplicada)');
  END IF;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    auth.uid(),
    'cycle_closed_by_coord',
    'ciclos_semanais',
    _ciclo_id,
    jsonb_build_object(
      'titulo', v_ciclo.titulo,
      'celula_id', v_ciclo.celula_id,
      'fechamento_json', _fechamento_json
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fechar_ciclo_celula(UUID, JSONB) TO authenticated;

-- Tighten UPDATE policy on ciclos_semanais:
-- Drop the overly broad coordinator update policy
DROP POLICY IF EXISTS "Coordinators can update cycles in their scope" ON public.ciclos_semanais;

-- New restrictive policy: only admins can update directly (coordinators use RPCs)
CREATE POLICY "Only admins can update cycles directly"
  ON public.ciclos_semanais
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));
