-- RPC: get_ops_funnel_metrics
-- Returns aggregated funnel metrics from existing data (growth_events, missions, crm, followups)
-- No new tables required

CREATE OR REPLACE FUNCTION public.get_ops_funnel_metrics(
  _period_days INT DEFAULT 7,
  _scope_cidade TEXT DEFAULT NULL,
  _scope_cell_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_result JSON;
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_is_coordinator BOOLEAN;
  
  -- Counters
  v_onboarding_complete INT := 0;
  v_active_7d INT := 0;
  v_street_generated INT := 0;
  v_street_completed INT := 0;
  v_conversation_generated INT := 0;
  v_conversation_completed INT := 0;
  v_crm_quick_add INT := 0;
  v_followup_done INT := 0;
  v_script_copied INT := 0;
  v_whatsapp_opened INT := 0;
  
  -- Top lists
  v_top_cities JSON;
  v_top_cells JSON;
BEGIN
  -- Check authorization (admin or coordinator)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id AND role = 'admin' AND revoked_at IS NULL
  ) INTO v_is_admin;
  
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id 
    AND role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
    AND revoked_at IS NULL
  ) INTO v_is_coordinator;
  
  IF NOT v_is_coordinator THEN
    RETURN json_build_object('error', 'Unauthorized');
  END IF;
  
  -- Calculate cutoff date
  v_cutoff := NOW() - (_period_days || ' days')::INTERVAL;
  
  -- Ativações: onboarding_complete
  SELECT COUNT(DISTINCT user_id) INTO v_onboarding_complete
  FROM public.growth_events
  WHERE event_type = 'onboarding_complete'
    AND occurred_at >= v_cutoff
    AND (
      _scope_cidade IS NULL OR scope_cidade = _scope_cidade
    );
  
  -- Ativos 7d: check for active_7d event or infer from recent activity
  SELECT COUNT(DISTINCT COALESCE(ge.user_id, dc.user_id)) INTO v_active_7d
  FROM (
    SELECT user_id FROM public.growth_events 
    WHERE event_type = 'active_7d' 
      AND occurred_at >= v_cutoff
      AND (_scope_cidade IS NULL OR scope_cidade = _scope_cidade)
    UNION
    SELECT user_id FROM public.daily_checkins
    WHERE created_at >= v_cutoff
      AND (_scope_cidade IS NULL OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = daily_checkins.user_id AND p.cidade = _scope_cidade
      ))
  ) AS combined
  LEFT JOIN public.growth_events ge ON ge.user_id = combined.user_id
  LEFT JOIN public.daily_checkins dc ON dc.user_id = combined.user_id;
  
  -- Street missions
  SELECT COUNT(*) INTO v_street_generated
  FROM public.growth_events
  WHERE event_type = 'street_mission_generated'
    AND occurred_at >= v_cutoff
    AND (_scope_cidade IS NULL OR scope_cidade = _scope_cidade);
  
  SELECT COUNT(*) INTO v_street_completed
  FROM public.growth_events
  WHERE event_type IN ('street_mission_completed', 'street_mission_done')
    AND occurred_at >= v_cutoff
    AND (_scope_cidade IS NULL OR scope_cidade = _scope_cidade);
  
  -- Conversation missions
  SELECT COUNT(*) INTO v_conversation_generated
  FROM public.growth_events
  WHERE event_type = 'conversation_mission_generated'
    AND occurred_at >= v_cutoff
    AND (_scope_cidade IS NULL OR scope_cidade = _scope_cidade);
  
  SELECT COUNT(*) INTO v_conversation_completed
  FROM public.growth_events
  WHERE event_type = 'conversation_mission_completed'
    AND occurred_at >= v_cutoff
    AND (_scope_cidade IS NULL OR scope_cidade = _scope_cidade);
  
  -- CRM Quick Add
  SELECT COUNT(*) INTO v_crm_quick_add
  FROM public.growth_events
  WHERE event_type = 'crm_quick_add_saved'
    AND occurred_at >= v_cutoff
    AND (_scope_cidade IS NULL OR scope_cidade = _scope_cidade);
  
  -- Follow-up done
  SELECT COUNT(*) INTO v_followup_done
  FROM public.growth_events
  WHERE event_type = 'followup_done'
    AND occurred_at >= v_cutoff
    AND (_scope_cidade IS NULL OR scope_cidade = _scope_cidade);
  
  -- Secondary metrics: scripts
  SELECT COUNT(*) INTO v_script_copied
  FROM public.growth_events
  WHERE event_type IN ('conversation_script_copied', 'roteiro_track')
    AND occurred_at >= v_cutoff
    AND (_scope_cidade IS NULL OR scope_cidade = _scope_cidade);
  
  SELECT COUNT(*) INTO v_whatsapp_opened
  FROM public.growth_events
  WHERE event_type IN ('conversation_whatsapp_opened', 'followup_whatsapp_opened')
    AND occurred_at >= v_cutoff
    AND (_scope_cidade IS NULL OR scope_cidade = _scope_cidade);
  
  -- Top 5 cities by completed missions + followups
  SELECT COALESCE(json_agg(city_row), '[]'::json) INTO v_top_cities
  FROM (
    SELECT 
      scope_cidade AS cidade,
      COUNT(*) FILTER (WHERE event_type IN ('street_mission_completed', 'street_mission_done', 'conversation_mission_completed')) AS concluidas,
      COUNT(*) FILTER (WHERE event_type = 'followup_done') AS followups,
      COUNT(*) AS total
    FROM public.growth_events
    WHERE occurred_at >= v_cutoff
      AND scope_cidade IS NOT NULL
      AND event_type IN ('street_mission_completed', 'street_mission_done', 'conversation_mission_completed', 'followup_done')
    GROUP BY scope_cidade
    ORDER BY total DESC
    LIMIT 5
  ) AS city_row;
  
  -- Top 5 cells by completed missions (if cell tracking exists in meta)
  -- For now, return empty array as cells aren't tracked in growth_events scope
  v_top_cells := '[]'::json;
  
  -- Build result
  v_result := json_build_object(
    'period_days', _period_days,
    'scope_cidade', _scope_cidade,
    'scope_cell_id', _scope_cell_id,
    'ativacoes', json_build_object(
      'onboarding_complete', v_onboarding_complete,
      'active_7d', v_active_7d
    ),
    'rua', json_build_object(
      'geradas', v_street_generated,
      'concluidas', v_street_completed,
      'taxa_conversao', CASE WHEN v_street_generated > 0 
        THEN ROUND((v_street_completed::NUMERIC / v_street_generated) * 100)
        ELSE NULL END
    ),
    'conversa', json_build_object(
      'geradas', v_conversation_generated,
      'concluidas', v_conversation_completed,
      'taxa_conversao', CASE WHEN v_conversation_generated > 0 
        THEN ROUND((v_conversation_completed::NUMERIC / v_conversation_generated) * 100)
        ELSE NULL END
    ),
    'crm', json_build_object(
      'quick_add_saved', v_crm_quick_add
    ),
    'followup', json_build_object(
      'done', v_followup_done
    ),
    'secundarias', json_build_object(
      'script_copied', v_script_copied,
      'whatsapp_opened', v_whatsapp_opened
    ),
    'top_cidades', v_top_cities,
    'top_celulas', v_top_cells,
    'generated_at', NOW()
  );
  
  RETURN v_result;
END;
$$;

-- Grant to authenticated users (RLS checked internally)
GRANT EXECUTE ON FUNCTION public.get_ops_funnel_metrics(INT, TEXT, UUID) TO authenticated;