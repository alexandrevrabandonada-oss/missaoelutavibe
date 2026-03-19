-- ============================================
-- CONVERT COORD INTEREST TO CELL v0.1
-- Flow: interest -> cell + membership + role_invite + optional cycle
-- ============================================

-- 1) RPC: Convert coord interest to real cell with full flow
CREATE OR REPLACE FUNCTION public.convert_coord_interest_to_cell(
  p_interest_id UUID,
  p_cell_name TEXT,
  p_cell_neighborhood TEXT DEFAULT NULL,
  p_create_initial_cycle BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_interest RECORD;
  v_cidade RECORD;
  v_cell_id UUID;
  v_membership_id UUID;
  v_invite_result JSONB;
  v_ciclo_id UUID;
  v_cycle_created BOOLEAN := FALSE;
  v_tasks_result JSONB;
  v_squad_id UUID;
BEGIN
  -- Validate caller is coordinator
  IF NOT is_coordinator(v_user_id) THEN
    RAISE EXCEPTION 'Acesso negado: apenas coordenadores podem converter interesse';
  END IF;

  -- Get interest record
  SELECT i.*, c.nome AS cidade_nome, c.uf
  INTO v_interest
  FROM territorio_coord_interest i
  JOIN cidades c ON c.id = i.cidade_id
  WHERE i.id = p_interest_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Interesse não encontrado';
  END IF;

  -- Validate scope access
  IF NOT can_manage_cidade(v_user_id, v_interest.cidade_nome) THEN
    RAISE EXCEPTION 'Sem permissão para esta cidade';
  END IF;

  -- 1) Create the cell
  INSERT INTO cells (
    name,
    neighborhood,
    city,
    state,
    cidade_id,
    tipo,
    is_active,
    created_by
  ) VALUES (
    p_cell_name,
    p_cell_neighborhood,
    v_interest.cidade_nome,
    v_interest.uf,
    v_interest.cidade_id,
    'territorial',
    TRUE,
    v_user_id
  )
  RETURNING id INTO v_cell_id;

  -- 2) Add requester as approved member
  INSERT INTO cell_memberships (
    user_id,
    cell_id,
    status,
    is_active,
    requested_at,
    decided_at,
    decided_by
  ) VALUES (
    v_interest.user_id,
    v_cell_id,
    'aprovado',
    TRUE,
    NOW(),
    NOW(),
    v_user_id
  )
  RETURNING id INTO v_membership_id;

  -- 3) Create role invite for moderador_celula (using existing RPC)
  SELECT create_role_invite(
    p_scope_tipo := 'celula',
    p_scope_id := v_cell_id::TEXT,
    p_role_key := 'moderador_celula',
    p_invited_email := NULL,
    p_invited_user_id := v_interest.user_id,
    p_expires_days := 7
  ) INTO v_invite_result;

  -- 4) Update interest status to aprovado
  UPDATE territorio_coord_interest
  SET status = 'aprovado',
      celula_id = v_cell_id,
      updated_at = NOW()
  WHERE id = p_interest_id;

  -- 5) Optionally create initial cycle
  IF p_create_initial_cycle THEN
    INSERT INTO ciclos_semanais (
      titulo,
      inicio,
      fim,
      cidade,
      celula_id,
      status,
      criado_por,
      metas_json
    ) VALUES (
      'Semana Inaugural — ' || p_cell_name,
      DATE_TRUNC('week', NOW()),
      DATE_TRUNC('week', NOW()) + INTERVAL '6 days',
      v_interest.cidade_nome,
      v_cell_id,
      'rascunho',
      v_user_id,
      jsonb_build_array(
        'Gerar 3 convites para novos voluntários',
        'Realizar 1 atividade presencial ou online',
        'Registrar 5 check-ins no dia',
        'Concluir 2 missões'
      )
    )
    RETURNING id INTO v_ciclo_id;

    v_cycle_created := TRUE;

    -- Create a basic "Coordenação" squad for the cell if doesn't exist
    INSERT INTO squads (
      name,
      descricao,
      escopo_tipo,
      escopo_id,
      criado_por
    ) VALUES (
      'Coordenação — ' || p_cell_name,
      'Squad de coordenação da célula ' || p_cell_name,
      'celula',
      v_cell_id,
      v_user_id
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_squad_id;

    -- If squad was created, add the member
    IF v_squad_id IS NOT NULL THEN
      INSERT INTO squad_members (squad_id, user_id, role)
      VALUES (v_squad_id, v_interest.user_id, 'membro')
      ON CONFLICT DO NOTHING;

      -- Create tasks from initial metas
      SELECT create_tasks_from_cycle_metas(
        v_ciclo_id,
        jsonb_build_array(
          jsonb_build_object('meta_key', 'meta_0', 'titulo', 'Gerar 3 convites', 'descricao', 'Criar e enviar 3 convites para novos voluntários', 'squad_id', v_squad_id, 'prioridade', 'alta'),
          jsonb_build_object('meta_key', 'meta_1', 'titulo', 'Realizar 1 atividade', 'descricao', 'Organizar e realizar uma atividade presencial ou online', 'squad_id', v_squad_id, 'prioridade', 'alta'),
          jsonb_build_object('meta_key', 'meta_2', 'titulo', '5 check-ins', 'descricao', 'Garantir 5 check-ins diários na célula', 'squad_id', v_squad_id, 'prioridade', 'media'),
          jsonb_build_object('meta_key', 'meta_3', 'titulo', 'Concluir 2 missões', 'descricao', 'Coordenar e concluir 2 missões da célula', 'squad_id', v_squad_id, 'prioridade', 'media')
        )
      ) INTO v_tasks_result;
    END IF;
  END IF;

  -- 6) Create notification for the requester
  INSERT INTO notifications (
    user_id,
    tipo,
    titulo,
    mensagem,
    link
  ) VALUES (
    v_interest.user_id,
    'convite_papel',
    'Sua célula foi criada!',
    'A célula "' || p_cell_name || '" foi criada. Aceite seu papel para começar a coordenar.',
    '/voluntario/convites-papeis'
  );

  -- 7) Audit log
  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_data)
  VALUES (v_user_id, 'cell', v_cell_id, 'convert_interest_to_cell', jsonb_build_object(
    'interest_id', p_interest_id,
    'cell_name', p_cell_name,
    'requester_id', v_interest.user_id,
    'cycle_created', v_cycle_created,
    'ciclo_id', v_ciclo_id
  ));

  RETURN jsonb_build_object(
    'success', TRUE,
    'cell_id', v_cell_id,
    'membership_id', v_membership_id,
    'invite_token', v_invite_result->>'token',
    'cycle_created', v_cycle_created,
    'ciclo_id', v_ciclo_id,
    'tasks_created', COALESCE(v_tasks_result->>'created', '0')::INT
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.convert_coord_interest_to_cell TO authenticated;