
-- Fix get_territorio_kpis: replace created_at with occurred_at for growth_events
CREATE OR REPLACE FUNCTION public.get_territorio_kpis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'cidades_sem_coord', (
      SELECT COUNT(*) FROM cidades c
      WHERE c.status != 'pausada'
      AND NOT EXISTS(
        SELECT 1 FROM user_roles ur 
        WHERE ur.role IN ('coordenador_cidade', 'coordenador_regional')
        AND ur.scope_cidade = c.nome
        AND ur.revoked_at IS NULL
      )
    ),
    'celulas_sem_moderador', (
      SELECT COUNT(*) FROM cells cl
      WHERE cl.is_active = true
      AND NOT EXISTS(
        SELECT 1 FROM user_roles ur 
        WHERE ur.role IN ('coordenador_celula', 'moderador_celula')
        AND ur.cell_id = cl.id
        AND ur.revoked_at IS NULL
      )
    ),
    'cidades_crescendo_sem_estrutura', (
      SELECT COUNT(*) FROM cidades c
      WHERE c.status != 'pausada'
      AND NOT EXISTS(
        SELECT 1 FROM user_roles ur 
        WHERE ur.role IN ('coordenador_cidade', 'coordenador_regional')
        AND ur.scope_cidade = c.nome
        AND ur.revoked_at IS NULL
      )
      AND (
        SELECT COUNT(*) FROM growth_events ge
        WHERE ge.scope_cidade = c.nome
        AND ge.event_type = 'signup'
        AND ge.occurred_at > now() - interval '7 days'
      ) > 5
    ),
    'interesses_pendentes', (
      SELECT COUNT(*) FROM territorio_coord_interest
      WHERE status = 'pendente'
    )
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Fix get_territorio_overview: replace created_at with occurred_at for growth_events
CREATE OR REPLACE FUNCTION public.get_territorio_overview(period_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  period_start timestamptz := now() - (period_days || ' days')::interval;
BEGIN
  IF NOT (is_admin(auth.uid()) OR is_coordinator(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  WITH cidade_stats AS (
    SELECT 
      c.id as cidade_id, c.nome, c.uf, c.slug,
      c.status as cidade_status,
      EXISTS(
        SELECT 1 FROM user_roles ur 
        WHERE ur.role IN ('coordenador_cidade', 'coordenador_regional', 'coordenador_estadual')
        AND ur.scope_cidade = c.nome AND ur.revoked_at IS NULL
      ) as has_coord,
      (SELECT COUNT(*) FROM cells cl WHERE cl.city = c.nome AND cl.is_active = true) as celulas_count,
      (SELECT COUNT(DISTINCT cm.user_id) FROM cell_memberships cm JOIN cells cl ON cl.id = cm.cell_id WHERE cl.city = c.nome AND cm.status = 'aprovado') as membros_aprovados,
      (SELECT COUNT(*) FROM profiles p WHERE p.cidade = c.nome AND p.volunteer_status = 'aprovado') as voluntarios_aprovados,
      (SELECT COUNT(DISTINCT dc.user_id) FROM daily_checkins dc JOIN profiles p ON p.id = dc.user_id WHERE p.cidade = c.nome AND dc.created_at > period_start) as ativos_7d,
      (SELECT COUNT(*) FROM growth_events ge WHERE ge.scope_cidade = c.nome AND ge.event_type = 'signup' AND ge.occurred_at > period_start) as signups_7d,
      (SELECT COUNT(*) FROM growth_events ge WHERE ge.scope_cidade = c.nome AND ge.event_type = 'approved' AND ge.occurred_at > period_start) as approved_7d,
      (SELECT COUNT(*) FROM growth_events ge WHERE ge.scope_cidade = c.nome AND ge.event_type = 'first_action' AND ge.occurred_at > period_start) as first_action_7d,
      (SELECT COUNT(*) FROM fabrica_downloads fd JOIN fabrica_templates ft ON ft.id = fd.template_id WHERE ft.scope_tipo = 'cidade' AND ft.scope_id = c.nome AND fd.action = 'share' AND fd.created_at > period_start) as shares_7d,
      EXISTS(SELECT 1 FROM ciclos_semanais cs WHERE cs.cidade = c.nome AND cs.status = 'ativo' AND now() BETWEEN cs.inicio AND cs.fim) as semana_ativa,
      (SELECT COUNT(*) FROM atividades a WHERE a.cidade = c.nome AND a.status = 'publicada' AND a.inicio_em > period_start) as atividades_7d
    FROM cidades c WHERE c.status != 'pausada'
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'cidade_id', cs.cidade_id, 'nome', cs.nome, 'uf', cs.uf, 'slug', cs.slug,
      'status', cs.cidade_status, 'has_coord', cs.has_coord,
      'celulas_count', cs.celulas_count, 'membros_aprovados', cs.membros_aprovados,
      'voluntarios_aprovados', cs.voluntarios_aprovados, 'ativos_7d', cs.ativos_7d,
      'signups_7d', cs.signups_7d, 'approved_7d', cs.approved_7d,
      'first_action_7d', cs.first_action_7d, 'shares_7d', cs.shares_7d,
      'semana_ativa', cs.semana_ativa, 'atividades_7d', cs.atividades_7d,
      'alerts', (
        SELECT jsonb_agg(alert) FROM (
          SELECT 'sem_coord' as alert WHERE NOT cs.has_coord
          UNION ALL SELECT 'sem_celula' WHERE cs.celulas_count = 0 AND cs.voluntarios_aprovados > 0
          UNION ALL SELECT 'crescendo_sem_estrutura' WHERE cs.signups_7d > 5 AND NOT cs.has_coord
          UNION ALL SELECT 'sem_semana_ativa' WHERE NOT cs.semana_ativa AND cs.has_coord
        ) alerts
      )
    ) ORDER BY cs.voluntarios_aprovados DESC
  ) INTO result FROM cidade_stats cs;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;
