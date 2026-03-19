-- =============================================
-- North Star Drilldown + Cohorts RPCs
-- =============================================

-- 1) get_north_star_drilldown: Funnel breakdown by stage
CREATE OR REPLACE FUNCTION public.get_north_star_drilldown(
  _window_days int DEFAULT 7,
  _scope_kind text DEFAULT 'global',
  _scope_value text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _start_date timestamptz;
  _end_date timestamptz;
  _prev_start timestamptz;
  _prev_end timestamptz;
  _result jsonb;
  _current jsonb;
  _previous jsonb;
  _breakdown jsonb;
BEGIN
  -- Check auth
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Check coordinator/admin access
  IF NOT (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
    OR is_coord_in_scope(auth.uid(), _scope_kind, _scope_value)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_access');
  END IF;

  -- Calculate date ranges
  _end_date := now();
  _start_date := _end_date - (_window_days || ' days')::interval;
  _prev_end := _start_date;
  _prev_start := _prev_end - (_window_days || ' days')::interval;

  -- Current period metrics
  WITH scoped_profiles AS (
    SELECT p.id, p.status, p.created_at, p.cidade, p.celula_id,
           COALESCE(p.last_action_at, '1970-01-01'::timestamptz) as last_action_at
    FROM profiles p
    WHERE p.status != 'bloqueado'
      AND (
        _scope_kind = 'global'
        OR (_scope_kind = 'city' AND p.cidade = _scope_value)
        OR (_scope_kind = 'cell' AND p.celula_id::text = _scope_value)
      )
  ),
  period_signups AS (
    SELECT COUNT(*) as cnt FROM scoped_profiles WHERE created_at >= _start_date
  ),
  period_approved AS (
    SELECT COUNT(*) as cnt FROM scoped_profiles WHERE status = 'ativo' AND created_at >= _start_date
  ),
  period_checkins AS (
    SELECT COUNT(DISTINCT ar.user_id) as cnt
    FROM atividade_rsvp ar
    JOIN scoped_profiles sp ON sp.id = ar.user_id
    WHERE ar.checkin_em >= _start_date
  ),
  period_actions_started AS (
    SELECT COUNT(DISTINCT m.user_id) as cnt
    FROM missions m
    JOIN scoped_profiles sp ON sp.id = m.user_id
    WHERE m.created_at >= _start_date AND m.status IN ('em_progresso', 'concluida')
  ),
  period_actions_completed AS (
    SELECT COUNT(DISTINCT m.user_id) as cnt
    FROM missions m
    JOIN scoped_profiles sp ON sp.id = m.user_id
    WHERE m.completed_at >= _start_date AND m.status = 'concluida'
  ),
  period_shares AS (
    SELECT COUNT(DISTINCT ge.user_id) as cnt
    FROM growth_events ge
    JOIN scoped_profiles sp ON sp.id = ge.user_id
    WHERE ge.event_type IN ('template_share', 'share_pack_shared', 'invite_shared')
      AND ge.occurred_at >= _start_date
  ),
  period_contacts AS (
    SELECT COUNT(DISTINCT c.criado_por) as cnt
    FROM crm_contatos c
    JOIN scoped_profiles sp ON sp.id = c.criado_por
    WHERE c.created_at >= _start_date AND c.deleted_at IS NULL
  ),
  period_qualified AS (
    SELECT COUNT(DISTINCT c.criado_por) as cnt
    FROM crm_contatos c
    JOIN scoped_profiles sp ON sp.id = c.criado_por
    WHERE c.support_level IN ('sim', 'mobilizador')
      AND c.support_level_updated_at >= _start_date
      AND c.deleted_at IS NULL
  ),
  period_event_invites AS (
    SELECT COUNT(DISTINCT ei.user_id) as cnt
    FROM crm_event_invites ei
    JOIN scoped_profiles sp ON sp.id = ei.user_id
    WHERE ei.created_at >= _start_date
  ),
  period_attended AS (
    SELECT COUNT(DISTINCT ei.user_id) as cnt
    FROM crm_event_invites ei
    JOIN scoped_profiles sp ON sp.id = ei.user_id
    WHERE ei.attended_at >= _start_date
  )
  SELECT jsonb_build_object(
    'signup', (SELECT cnt FROM period_signups),
    'approved', (SELECT cnt FROM period_approved),
    'checkin_submitted', (SELECT cnt FROM period_checkins),
    'next_action_started', (SELECT cnt FROM period_actions_started),
    'next_action_completed', (SELECT cnt FROM period_actions_completed),
    'invite_shared', (SELECT cnt FROM period_shares),
    'contact_created', (SELECT cnt FROM period_contacts),
    'support_qualified', (SELECT cnt FROM period_qualified),
    'event_invites_created', (SELECT cnt FROM period_event_invites),
    'event_attended_marked', (SELECT cnt FROM period_attended)
  ) INTO _current;

  -- Previous period metrics (simplified for delta calculation)
  WITH scoped_profiles AS (
    SELECT p.id, p.status, p.created_at, p.cidade, p.celula_id
    FROM profiles p
    WHERE p.status != 'bloqueado'
      AND (
        _scope_kind = 'global'
        OR (_scope_kind = 'city' AND p.cidade = _scope_value)
        OR (_scope_kind = 'cell' AND p.celula_id::text = _scope_value)
      )
  ),
  prev_signups AS (
    SELECT COUNT(*) as cnt FROM scoped_profiles WHERE created_at >= _prev_start AND created_at < _prev_end
  ),
  prev_approved AS (
    SELECT COUNT(*) as cnt FROM scoped_profiles WHERE status = 'ativo' AND created_at >= _prev_start AND created_at < _prev_end
  ),
  prev_actions AS (
    SELECT COUNT(DISTINCT m.user_id) as cnt
    FROM missions m
    JOIN scoped_profiles sp ON sp.id = m.user_id
    WHERE m.completed_at >= _prev_start AND m.completed_at < _prev_end AND m.status = 'concluida'
  ),
  prev_shares AS (
    SELECT COUNT(DISTINCT ge.user_id) as cnt
    FROM growth_events ge
    JOIN scoped_profiles sp ON sp.id = ge.user_id
    WHERE ge.event_type IN ('template_share', 'share_pack_shared', 'invite_shared')
      AND ge.occurred_at >= _prev_start AND ge.occurred_at < _prev_end
  ),
  prev_contacts AS (
    SELECT COUNT(DISTINCT c.criado_por) as cnt
    FROM crm_contatos c
    JOIN scoped_profiles sp ON sp.id = c.criado_por
    WHERE c.created_at >= _prev_start AND c.created_at < _prev_end AND c.deleted_at IS NULL
  )
  SELECT jsonb_build_object(
    'signup', (SELECT cnt FROM prev_signups),
    'approved', (SELECT cnt FROM prev_approved),
    'next_action_completed', (SELECT cnt FROM prev_actions),
    'invite_shared', (SELECT cnt FROM prev_shares),
    'contact_created', (SELECT cnt FROM prev_contacts)
  ) INTO _previous;

  -- Breakdown by city/cell (top 5)
  WITH scoped_profiles AS (
    SELECT p.id, p.cidade, p.celula_id,
           CASE WHEN p.last_action_at > now() - interval '7 days' THEN 'active' ELSE 'inactive' END as activity
    FROM profiles p
    WHERE p.status = 'ativo'
      AND p.created_at >= _start_date
      AND (
        _scope_kind = 'global'
        OR (_scope_kind = 'city' AND p.cidade = _scope_value)
        OR (_scope_kind = 'cell' AND p.celula_id::text = _scope_value)
      )
  ),
  by_city AS (
    SELECT cidade as label, COUNT(*) as total,
           COUNT(*) FILTER (WHERE activity = 'active') as active_count
    FROM scoped_profiles
    WHERE cidade IS NOT NULL
    GROUP BY cidade
    ORDER BY total DESC
    LIMIT 5
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'label', label,
    'total', total,
    'active', active_count
  )), '[]'::jsonb) INTO _breakdown FROM by_city;

  -- Build result
  _result := jsonb_build_object(
    'ok', true,
    'window_days', _window_days,
    'scope', jsonb_build_object('kind', _scope_kind, 'value', _scope_value),
    'period', jsonb_build_object('start', _start_date, 'end', _end_date),
    'current', _current,
    'previous', _previous,
    'breakdown', _breakdown,
    'ts', now()
  );

  RETURN _result;
END;
$$;

-- 2) get_cohort_for_alert: List users matching alert criteria
CREATE OR REPLACE FUNCTION public.get_cohort_for_alert(
  _alert_key text,
  _window_days int DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _scope_kind text;
  _scope_value text;
  _result jsonb;
  _cohort jsonb;
  _start_date timestamptz;
BEGIN
  -- Check auth
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Get coordinator scope
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) THEN 'global'
      WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_name = 'coord_celula' AND is_active) THEN 'cell'
      WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_name = 'coord_cidade' AND is_active) THEN 'city'
      ELSE 'none'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) THEN NULL
      WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_name = 'coord_celula' AND is_active) 
        THEN (SELECT scope_value FROM user_roles WHERE user_id = auth.uid() AND role_name = 'coord_celula' AND is_active LIMIT 1)
      WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role_name = 'coord_cidade' AND is_active)
        THEN (SELECT scope_value FROM user_roles WHERE user_id = auth.uid() AND role_name = 'coord_cidade' AND is_active LIMIT 1)
      ELSE NULL
    END
  INTO _scope_kind, _scope_value;

  IF _scope_kind = 'none' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_access');
  END IF;

  _start_date := now() - (_window_days || ' days')::interval;

  -- Build cohort based on alert type
  WITH scoped_profiles AS (
    SELECT 
      p.id,
      COALESCE(p.apelido, split_part(p.nome, ' ', 1)) as display_name,
      p.cidade,
      p.celula_id,
      p.last_action_at,
      p.status,
      p.created_at
    FROM profiles p
    WHERE p.status = 'ativo'
      AND (
        _scope_kind = 'global'
        OR (_scope_kind = 'city' AND p.cidade = _scope_value)
        OR (_scope_kind = 'cell' AND p.celula_id::text = _scope_value)
      )
  ),
  cohort_data AS (
    SELECT 
      sp.id as user_id,
      sp.display_name,
      sp.cidade as city,
      sp.celula_id::text as cell,
      sp.last_action_at,
      CASE 
        -- Activation issues
        WHEN _alert_key IN ('activation_low', 'activation_critical') AND sp.last_action_at IS NULL 
          AND NOT EXISTS (SELECT 1 FROM missions m WHERE m.user_id = sp.id AND m.status = 'concluida')
          THEN 'aprovado_sem_acao'
        
        -- Check-in issues
        WHEN _alert_key IN ('activation_low', 'activation_critical') 
          AND NOT EXISTS (SELECT 1 FROM atividade_rsvp ar WHERE ar.user_id = sp.id AND ar.checkin_em IS NOT NULL)
          THEN 'aprovado_sem_checkin'
        
        -- Share issues
        WHEN _alert_key IN ('share_low', 'share_critical')
          AND EXISTS (SELECT 1 FROM missions m WHERE m.user_id = sp.id AND m.status = 'concluida')
          AND NOT EXISTS (
            SELECT 1 FROM growth_events ge 
            WHERE ge.user_id = sp.id 
              AND ge.event_type IN ('template_share', 'share_pack_shared', 'invite_shared')
              AND ge.occurred_at >= _start_date
          )
          THEN 'acao_sem_share'
        
        -- CRM issues
        WHEN _alert_key IN ('crm_low', 'crm_critical')
          AND EXISTS (SELECT 1 FROM missions m WHERE m.user_id = sp.id AND m.status = 'concluida')
          AND NOT EXISTS (
            SELECT 1 FROM crm_contatos c 
            WHERE c.criado_por = sp.id 
              AND c.created_at >= _start_date
              AND c.deleted_at IS NULL
          )
          THEN 'sem_crm_7d'
        
        -- Qualify issues
        WHEN _alert_key IN ('qualify_low', 'qualify_critical')
          AND EXISTS (
            SELECT 1 FROM crm_contatos c 
            WHERE c.criado_por = sp.id 
              AND c.support_level = 'desconhecido'
              AND c.deleted_at IS NULL
          )
          THEN 'contato_nao_qualificado'
        
        -- Return mode (inactive 48h+)
        WHEN _alert_key = 'return_stalled'
          AND sp.last_action_at < now() - interval '48 hours'
          AND sp.last_action_at > now() - interval '14 days'
          THEN 'retorno_48h'
        
        -- Event conversion
        WHEN _alert_key IN ('event_conversion_low', 'event_conversion_critical')
          AND EXISTS (
            SELECT 1 FROM crm_event_invites ei 
            WHERE ei.user_id = sp.id 
              AND ei.status = 'going' 
              AND ei.attended_at IS NULL
          )
          THEN 'rsvp_sem_presenca'
        
        ELSE NULL
      END as status_resumo
    FROM scoped_profiles sp
    WHERE sp.created_at >= _start_date - interval '30 days' -- recent users only
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'display_name', display_name,
        'city', city,
        'cell', cell,
        'last_action_at', last_action_at,
        'status_resumo', status_resumo
      )
      ORDER BY last_action_at DESC NULLS LAST
    ) FILTER (WHERE status_resumo IS NOT NULL),
    '[]'::jsonb
  ) INTO _cohort
  FROM cohort_data
  LIMIT 50;

  _result := jsonb_build_object(
    'ok', true,
    'alert_key', _alert_key,
    'window_days', _window_days,
    'scope', jsonb_build_object('kind', _scope_kind, 'value', _scope_value),
    'cohort', _cohort,
    'count', jsonb_array_length(_cohort),
    'ts', now()
  );

  RETURN _result;
END;
$$;

-- 3) get_cohort_message_templates: Mode-aware message templates
CREATE OR REPLACE FUNCTION public.get_cohort_message_templates(
  _alert_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mode text;
  _templates jsonb;
BEGIN
  -- Check auth
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  -- Get app mode
  SELECT COALESCE(mode, 'pre') INTO _mode FROM app_config LIMIT 1;

  -- Build templates based on alert key and mode
  _templates := CASE _alert_key
    -- Activation alerts
    WHEN 'activation_low' THEN
      CASE WHEN _mode = 'campanha' THEN
        jsonb_build_object(
          'short', 'Oi! Vi que você entrou mas ainda não completou sua primeira ação. Qualquer dúvida, me chama! 🚀',
          'mid', 'Oi! Notei que você se cadastrou mas ainda não fez sua primeira ação na campanha. Posso te ajudar a começar? É bem simples e faz toda diferença! Me chama se precisar.',
          'leader', 'Olá! Percebi que temos alguns voluntários aprovados que ainda não iniciaram. Podemos organizar uma sessão de boas-vindas para destravar esse grupo?'
        )
      ELSE
        jsonb_build_object(
          'short', 'Oi! Vi que você entrou na plataforma. Vamos conversar sobre como começar? 🙂',
          'mid', 'Oi! Notei que você se cadastrou mas ainda não explorou as ações disponíveis. Posso te ajudar a entender por onde começar?',
          'leader', 'Olá! Temos voluntários novos aguardando orientação. Sugiro agendarmos uma chamada de onboarding em grupo.'
        )
      END
    
    WHEN 'activation_critical' THEN
      CASE WHEN _mode = 'campanha' THEN
        jsonb_build_object(
          'short', 'Ei! Estamos na reta final e cada ação conta. Posso te ajudar a completar sua primeira missão? ⏰',
          'mid', 'Oi! A campanha está a todo vapor e notei que você ainda não começou. Que tal darmos um passo juntos hoje? Me conta o que está travando.',
          'leader', 'URGENTE: Taxa de ativação crítica. Precisamos de ação imediata - sugiro contato individual com cada voluntário parado.'
        )
      ELSE
        jsonb_build_object(
          'short', 'Oi! Senti sua falta por aqui. Quer conversar sobre o que podemos fazer juntos?',
          'mid', 'Olá! Faz um tempo que você entrou e ainda não começou. Posso te ajudar a encontrar algo que combine com seu perfil?',
          'leader', 'Atenção: Muitos voluntários parados. Precisamos revisar o processo de onboarding e fazer contato direto.'
        )
      END
    
    -- Share alerts
    WHEN 'share_low' THEN
      CASE WHEN _mode = 'campanha' THEN
        jsonb_build_object(
          'short', 'Boa! Você fez sua ação. Que tal compartilhar com 3 amigos? Cada convite conta! 📲',
          'mid', 'Parabéns pela ação! Agora o próximo passo é multiplicar: compartilha com amigos e família. Posso te mandar os materiais prontos?',
          'leader', 'Voluntários ativos mas não compartilhando. Vamos reforçar a importância do convite na próxima reunião.'
        )
      ELSE
        jsonb_build_object(
          'short', 'Legal que você completou uma ação! Conhece alguém que poderia se juntar a nós?',
          'mid', 'Que bom ter você ativo! Estamos crescendo e cada indicação ajuda. Tem alguém que você gostaria de convidar?',
          'leader', 'Engajamento ok, mas compartilhamento baixo. Vamos criar incentivos para indicações.'
        )
      END
    
    -- CRM alerts
    WHEN 'crm_low' THEN
      CASE WHEN _mode = 'campanha' THEN
        jsonb_build_object(
          'short', 'Oi! Você está mandando bem nas ações. Já cadastrou os contatos que está conversando? 📋',
          'mid', 'Excelente trabalho! Para multiplicar nosso impacto, é importante registrar os contatos das pessoas que você conversa. Posso te mostrar como?',
          'leader', 'Voluntários ativos sem registros no CRM. Precisamos treinar sobre a importância do cadastro de contatos.'
        )
      ELSE
        jsonb_build_object(
          'short', 'Oi! Está tendo conversas interessantes? Lembra de registrar os contatos pra acompanharmos juntos.',
          'mid', 'Você está participando ativamente! Uma dica: registrar os contatos ajuda a manter o relacionamento. Quer ajuda com isso?',
          'leader', 'Baixo uso do CRM. Vamos simplificar o processo de cadastro ou fazer um treinamento.'
        )
      END
    
    -- Qualify alerts
    WHEN 'qualify_low' THEN
      jsonb_build_object(
        'short', 'Oi! Vi que você tem contatos cadastrados. Já perguntou sobre o nível de apoio deles?',
        'mid', 'Seus contatos estão registrados, ótimo! O próximo passo é qualificá-los: saber se apoiam, estão indecisos, etc. Posso te ajudar?',
        'leader', 'Muitos contatos sem qualificação. Vamos criar um mutirão de ligações para atualizar o status.'
      )
    
    -- Event conversion
    WHEN 'event_conversion_low' THEN
      jsonb_build_object(
        'short', 'Oi! Vi que você confirmou presença no evento. Vai conseguir ir? Me avisa qualquer coisa! 📅',
        'mid', 'Lembrete: você confirmou presença no evento! Estamos te esperando. Se precisar de carona ou tiver dúvidas, me chama.',
        'leader', 'Alta taxa de RSVP mas baixa presença. Vamos reforçar lembretes e oferecer suporte logístico.'
      )
    
    -- Return mode
    WHEN 'return_stalled' THEN
      jsonb_build_object(
        'short', 'Oi! Senti sua falta. Tudo bem por aí? Quando puder, me conta como posso ajudar. 💙',
        'mid', 'Olá! Faz um tempinho que você não aparece. Está tudo bem? Se precisar de algo ou quiser voltar, estou aqui.',
        'leader', 'Voluntários inativos há 48h+. Vamos fazer rodada de contatos para entender barreiras e reativar.'
      )
    
    ELSE
      jsonb_build_object(
        'short', 'Oi! Como posso te ajudar hoje?',
        'mid', 'Olá! Estou acompanhando nosso progresso e queria saber como você está. Posso ajudar em algo?',
        'leader', 'Vamos revisar o status do time e identificar pontos de melhoria.'
      )
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'alert_key', _alert_key,
    'mode', _mode,
    'templates', _templates,
    'ts', now()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_north_star_drilldown(int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cohort_for_alert(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cohort_message_templates(text) TO authenticated;