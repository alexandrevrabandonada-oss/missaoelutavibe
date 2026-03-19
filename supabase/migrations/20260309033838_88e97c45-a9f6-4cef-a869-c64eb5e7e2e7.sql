
-- F8.1: Secure RPC to edit synopsis of a closed cycle
-- Only updates fechamento_json.resumo + editado_em + editado_por_nome

CREATE OR REPLACE FUNCTION public.editar_sintese_ciclo(
  _ciclo_id UUID,
  _resumo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ciclo RECORD;
  v_cell_city_id UUID;
  v_profile RECORD;
  v_fechamento JSONB;
BEGIN
  -- 1. Fetch cycle
  SELECT id, celula_id, status, fechamento_json
  INTO v_ciclo
  FROM ciclos_semanais
  WHERE id = _ciclo_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ciclo não encontrado');
  END IF;

  -- 2. Must belong to a cell
  IF v_ciclo.celula_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ciclo não vinculado a uma célula');
  END IF;

  -- 3. Check caller can operate on this cell
  SELECT cidade_id INTO v_cell_city_id FROM cells WHERE id = v_ciclo.celula_id;

  IF NOT public.can_operate_coord(v_cell_city_id, v_ciclo.celula_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão para editar ciclo desta célula');
  END IF;

  -- 4. Must be closed
  IF v_ciclo.status != 'encerrado' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas ciclos encerrados podem ter síntese editada');
  END IF;

  -- 5. Get editor name
  SELECT full_name INTO v_profile FROM profiles WHERE id = auth.uid();

  -- 6. Build updated fechamento_json preserving all existing fields
  v_fechamento := COALESCE(v_ciclo.fechamento_json, '{}'::jsonb);
  v_fechamento := v_fechamento
    || jsonb_build_object('resumo', _resumo)
    || jsonb_build_object('editado_em', now()::text)
    || jsonb_build_object('editado_por_nome',
        CASE
          WHEN v_profile.full_name IS NOT NULL THEN
            split_part(v_profile.full_name, ' ', 1) || ' ' || left(split_part(v_profile.full_name, ' ', 2), 1) || '.'
          ELSE 'Coordenador'
        END
       );

  -- 7. Update only fechamento_json and updated_at
  UPDATE ciclos_semanais
  SET
    fechamento_json = v_fechamento,
    updated_at = now()
  WHERE id = _ciclo_id
    AND status = 'encerrado';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Falha ao atualizar (possível mudança de status concorrente)');
  END IF;

  -- 8. Audit
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    auth.uid(),
    'cycle_synopsis_edited',
    'ciclos_semanais',
    _ciclo_id,
    jsonb_build_object('resumo', _resumo)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.editar_sintese_ciclo(UUID, TEXT) TO authenticated;
