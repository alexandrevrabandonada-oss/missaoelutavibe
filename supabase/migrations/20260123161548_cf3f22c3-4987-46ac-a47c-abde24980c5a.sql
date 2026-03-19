-- ========================================
-- CRM Conversation Missions v0 - RPCs
-- (Separate migration because enum value needs to be committed first)
-- ========================================

-- ========================================
-- RPC: Generate daily CRM missions for a user
-- ========================================
CREATE OR REPLACE FUNCTION public.generate_crm_missions_for_user(_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _opt_in BOOLEAN;
    _daily_limit INT;
    _missions_created INT := 0;
    _existing_today INT;
    _today DATE := CURRENT_DATE;
    _contato RECORD;
    _new_mission_id UUID;
    _ciclo_id UUID;
    _profile RECORD;
BEGIN
    -- Check user is authenticated
    IF _user_id IS NULL OR _user_id != auth.uid() THEN
        RAISE EXCEPTION 'User can only generate missions for themselves';
    END IF;

    -- Get user settings (default to opt-in with limit 1)
    SELECT 
        COALESCE(cs.crm_missions_opt_in, true),
        COALESCE(cs.crm_missions_daily_limit, 1)
    INTO _opt_in, _daily_limit
    FROM auth.users u
    LEFT JOIN crm_settings cs ON cs.user_id = u.id
    WHERE u.id = _user_id;

    -- Check opt-in
    IF NOT _opt_in THEN
        RETURN 0;
    END IF;

    -- Get user profile for scope
    SELECT city, neighborhood INTO _profile
    FROM profiles WHERE id = _user_id;

    -- Find active cycle (prefer cell, then city, then global)
    SELECT id INTO _ciclo_id
    FROM ciclos_semanais
    WHERE status = 'ativo'
      AND (cidade = _profile.city OR cidade IS NULL)
      AND CURRENT_DATE BETWEEN inicio AND fim
    ORDER BY 
        CASE WHEN celula_id IS NOT NULL THEN 1
             WHEN cidade IS NOT NULL THEN 2
             ELSE 3 END
    LIMIT 1;

    -- Count existing CRM missions for today
    SELECT COUNT(*) INTO _existing_today
    FROM missions m
    JOIN crm_mission_links cml ON cml.mission_id = m.id
    WHERE m.assigned_to = _user_id
      AND m.type = 'conversa'
      AND m.created_at::date = _today;

    -- If already at limit, return
    IF _existing_today >= _daily_limit THEN
        RETURN 0;
    END IF;

    -- Get eligible contacts (follow-up due today or before, not already linked today)
    FOR _contato IN
        SELECT c.id, c.nome, c.bairro, c.cidade
        FROM crm_contatos c
        WHERE c.atribuido_a = _user_id
          AND c.proxima_acao_em IS NOT NULL
          AND c.proxima_acao_em::date <= _today
          AND c.status NOT IN ('confirmado', 'inativo')
          -- Dedupe: no existing conversa mission for this contact today
          AND NOT EXISTS (
              SELECT 1 FROM crm_mission_links cml
              JOIN missions m ON m.id = cml.mission_id
              WHERE cml.contato_id = c.id
                AND m.type = 'conversa'
                AND m.created_at::date = _today
          )
        ORDER BY c.proxima_acao_em
        LIMIT (_daily_limit - _existing_today)
    LOOP
        -- Create mission
        INSERT INTO missions (
            title,
            description,
            type,
            status,
            assigned_to,
            created_by,
            ciclo_id,
            privado,
            requires_validation,
            meta_json
        ) VALUES (
            'Conversa: ' || split_part(_contato.nome, ' ', 1),
            'Entrar em contato com ' || split_part(_contato.nome, ' ', 1) || 
            COALESCE(' (' || _contato.bairro || ')', ''),
            'conversa',
            'publicada',
            _user_id,
            _user_id,
            _ciclo_id,
            true,  -- privado = true (no public exposure)
            false, -- no evidence validation needed
            jsonb_build_object('contato_bairro', _contato.bairro, 'contato_cidade', _contato.cidade)
        )
        RETURNING id INTO _new_mission_id;

        -- Link mission to contact
        INSERT INTO crm_mission_links (mission_id, contato_id)
        VALUES (_new_mission_id, _contato.id);

        _missions_created := _missions_created + 1;
    END LOOP;

    -- Notify user if missions were created (single notification)
    IF _missions_created > 0 THEN
        INSERT INTO notificacoes (user_id, tipo, titulo, corpo, href)
        VALUES (
            _user_id,
            'crm_missao',
            'Novas conversas do dia',
            _missions_created || ' contato(s) aguardando seu contato hoje.',
            '/voluntario/hoje'
        );
    END IF;

    RETURN _missions_created;
END;
$$;

-- ========================================
-- RPC: Complete CRM mission
-- ========================================
CREATE OR REPLACE FUNCTION public.complete_crm_mission(
    _mission_id UUID,
    _outcome TEXT,  -- 'contato_feito', 'nao_atendeu', 'reagendado', 'convertido', 'perdido'
    _note TEXT,
    _next_action_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _mission RECORD;
    _contato_id UUID;
    _new_status TEXT;
    _interacao_tipo TEXT := 'outro';
BEGIN
    -- Get mission and verify ownership
    SELECT m.id, m.assigned_to, m.type, cml.contato_id INTO _mission
    FROM missions m
    LEFT JOIN crm_mission_links cml ON cml.mission_id = m.id
    WHERE m.id = _mission_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Missão não encontrada';
    END IF;

    IF _mission.assigned_to != auth.uid() AND NOT is_coordinator(auth.uid()) THEN
        RAISE EXCEPTION 'Sem permissão para concluir esta missão';
    END IF;

    IF _mission.type != 'conversa' THEN
        RAISE EXCEPTION 'Esta função é apenas para missões de conversa';
    END IF;

    _contato_id := _mission.contato_id;

    -- Determine new contact status based on outcome
    CASE _outcome
        WHEN 'convertido' THEN _new_status := 'confirmado';
        WHEN 'perdido' THEN _new_status := 'inativo';
        WHEN 'nao_atendeu' THEN _new_status := 'contatar';
        WHEN 'reagendado' THEN _new_status := 'em_conversa';
        ELSE _new_status := 'em_conversa';
    END CASE;

    -- Determine interaction type
    IF _outcome = 'contato_feito' OR _outcome = 'convertido' THEN
        _interacao_tipo := 'whatsapp';
    END IF;

    -- Update mission status
    UPDATE missions
    SET status = 'concluida',
        updated_at = now()
    WHERE id = _mission_id;

    -- If linked to a contact, update CRM
    IF _contato_id IS NOT NULL THEN
        -- Create interaction
        INSERT INTO crm_interacoes (contato_id, autor_user_id, tipo, nota)
        VALUES (
            _contato_id,
            auth.uid(),
            _interacao_tipo::crm_interacao_tipo,
            'Missão concluída: ' || _outcome || COALESCE(E'\n' || _note, '')
        );

        -- Update contact status and next action
        UPDATE crm_contatos
        SET status = _new_status::crm_contato_status,
            proxima_acao_em = _next_action_date,
            updated_at = now()
        WHERE id = _contato_id;
    END IF;

    -- Audit log
    INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_data)
    VALUES (
        auth.uid(),
        'mission',
        _mission_id,
        'complete_crm_mission',
        jsonb_build_object('outcome', _outcome, 'contato_id', _contato_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'mission_id', _mission_id,
        'contato_id', _contato_id,
        'new_status', _new_status
    );
END;
$$;

-- ========================================
-- RPC: Get CRM mission metrics for Ops
-- ========================================
CREATE OR REPLACE FUNCTION public.get_crm_mission_metrics(
    _scope_type TEXT DEFAULT 'all',
    _scope_cidade TEXT DEFAULT NULL,
    _scope_celula_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _result JSONB;
    _7d_ago DATE := CURRENT_DATE - INTERVAL '7 days';
BEGIN
    -- Verify coordinator access
    IF NOT is_coordinator(auth.uid()) THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    SELECT jsonb_build_object(
        'pendentes', (
            SELECT COUNT(*)
            FROM missions m
            WHERE m.type = 'conversa'
              AND m.status IN ('publicada', 'em_andamento')
              AND (
                  _scope_type = 'all'
                  OR (_scope_type = 'cidade' AND EXISTS (
                      SELECT 1 FROM profiles p WHERE p.id = m.assigned_to AND p.city = _scope_cidade
                  ))
                  OR (_scope_type = 'celula' AND m.cell_id = _scope_celula_id)
              )
        ),
        'concluidas_7d', (
            SELECT COUNT(*)
            FROM missions m
            WHERE m.type = 'conversa'
              AND m.status = 'concluida'
              AND m.updated_at >= _7d_ago
              AND (
                  _scope_type = 'all'
                  OR (_scope_type = 'cidade' AND EXISTS (
                      SELECT 1 FROM profiles p WHERE p.id = m.assigned_to AND p.city = _scope_cidade
                  ))
                  OR (_scope_type = 'celula' AND m.cell_id = _scope_celula_id)
              )
        ),
        'atrasadas', (
            SELECT COUNT(*)
            FROM missions m
            JOIN crm_mission_links cml ON cml.mission_id = m.id
            JOIN crm_contatos c ON c.id = cml.contato_id
            WHERE m.type = 'conversa'
              AND m.status IN ('publicada', 'em_andamento')
              AND c.proxima_acao_em::date < CURRENT_DATE
              AND (
                  _scope_type = 'all'
                  OR (_scope_type = 'cidade' AND c.cidade = _scope_cidade)
                  OR (_scope_type = 'celula' AND c.escopo_tipo = 'celula' AND c.escopo_id = _scope_celula_id::text)
              )
        ),
        'generated_at', now()
    ) INTO _result;

    RETURN _result;
END;
$$;

-- ========================================
-- Helper: Get user's pending CRM missions
-- ========================================
CREATE OR REPLACE FUNCTION public.get_my_crm_missions()
RETURNS TABLE (
    mission_id UUID,
    mission_title TEXT,
    mission_status TEXT,
    contato_id UUID,
    contato_nome TEXT,
    contato_bairro TEXT,
    proxima_acao_em DATE,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        m.id as mission_id,
        m.title as mission_title,
        m.status::text as mission_status,
        c.id as contato_id,
        -- Only expose first name for privacy
        split_part(c.nome, ' ', 1) as contato_nome,
        c.bairro as contato_bairro,
        c.proxima_acao_em::date as proxima_acao_em,
        m.created_at
    FROM missions m
    JOIN crm_mission_links cml ON cml.mission_id = m.id
    JOIN crm_contatos c ON c.id = cml.contato_id
    WHERE m.assigned_to = auth.uid()
      AND m.type = 'conversa'
      AND m.status IN ('publicada', 'em_andamento')
    ORDER BY c.proxima_acao_em NULLS LAST, m.created_at DESC;
$$;