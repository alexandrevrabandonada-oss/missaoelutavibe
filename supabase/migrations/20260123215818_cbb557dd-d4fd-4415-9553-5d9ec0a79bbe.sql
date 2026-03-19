-- Growth Funnel v0: Event tracking for conversion metrics
-- Non-destructive, minimal schema

-- 1) Create growth_events table
CREATE TABLE public.growth_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('visit_comecar', 'signup', 'approved', 'onboarding_complete', 'first_action', 'active_7d')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  template_id UUID REFERENCES public.fabrica_templates(id) ON DELETE SET NULL,
  invite_code TEXT,
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scope_cidade TEXT,
  meta JSONB DEFAULT '{}'::jsonb
);

-- 2) Indexes for performance
CREATE INDEX idx_growth_events_type_date ON public.growth_events(event_type, occurred_at DESC);
CREATE INDEX idx_growth_events_template ON public.growth_events(template_id, occurred_at DESC) WHERE template_id IS NOT NULL;
CREATE INDEX idx_growth_events_referrer ON public.growth_events(referrer_user_id, occurred_at DESC) WHERE referrer_user_id IS NOT NULL;
CREATE INDEX idx_growth_events_user ON public.growth_events(user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_growth_events_cidade ON public.growth_events(scope_cidade, occurred_at DESC) WHERE scope_cidade IS NOT NULL;

-- 3) RLS: Only admins/coordinators can read; insert via RPC
ALTER TABLE public.growth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and coordinators can view growth events"
ON public.growth_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('coordenador_estadual', 'coordenador_regional', 'coordenador_celula')
  )
);

-- 4) RPC: log_growth_event (allows anonymous for visit_comecar)
CREATE OR REPLACE FUNCTION public.log_growth_event(
  _event_type TEXT,
  _template_id UUID DEFAULT NULL,
  _invite_code TEXT DEFAULT NULL,
  _meta JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _referrer_user_id UUID;
  _scope_cidade TEXT;
  _event_id UUID;
  _existing_count INT;
BEGIN
  _user_id := auth.uid();
  
  IF _event_type != 'visit_comecar' AND _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for event type: %', _event_type;
  END IF;
  
  IF _event_type NOT IN ('visit_comecar', 'signup', 'approved', 'onboarding_complete', 'first_action', 'active_7d') THEN
    RAISE EXCEPTION 'Invalid event type: %', _event_type;
  END IF;
  
  IF _event_type = 'visit_comecar' THEN
    SELECT COUNT(*) INTO _existing_count
    FROM growth_events
    WHERE event_type = 'visit_comecar'
      AND occurred_at > now() - interval '1 hour'
      AND COALESCE(template_id::text, '') = COALESCE(_template_id::text, '')
      AND COALESCE(invite_code, '') = COALESCE(_invite_code, '');
    
    IF _existing_count > 0 THEN
      RETURN NULL;
    END IF;
  ELSIF _user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO _existing_count
    FROM growth_events
    WHERE user_id = _user_id AND event_type = _event_type;
    
    IF _existing_count > 0 THEN
      RETURN NULL;
    END IF;
  END IF;
  
  IF _invite_code IS NOT NULL THEN
    SELECT c.user_id INTO _referrer_user_id
    FROM convites c
    WHERE c.codigo = _invite_code;
  END IF;
  
  IF _user_id IS NOT NULL THEN
    SELECT p.cidade INTO _scope_cidade
    FROM profiles p
    WHERE p.id = _user_id;
  END IF;
  
  INSERT INTO growth_events (
    event_type, user_id, template_id, invite_code, referrer_user_id, scope_cidade, meta
  ) VALUES (
    _event_type, _user_id, _template_id, _invite_code, _referrer_user_id, _scope_cidade, _meta
  )
  RETURNING id INTO _event_id;
  
  RETURN _event_id;
END;
$$;

-- 5) RPC: get_growth_funnel_metrics
CREATE OR REPLACE FUNCTION public.get_growth_funnel_metrics(
  _period_days INT DEFAULT 7,
  _scope_cidade TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
  _start_date TIMESTAMPTZ;
  _counts JSONB;
  _rates JSONB;
  _top_templates JSONB;
  _top_referrers JSONB;
  _top_cities JSONB;
  _alerts JSONB DEFAULT '[]'::jsonb;
  
  _visit_count INT;
  _signup_count INT;
  _approved_count INT;
  _onboarding_count INT;
  _first_action_count INT;
  _active_count INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('coordenador_estadual', 'coordenador_regional', 'coordenador_celula')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  _start_date := now() - (_period_days || ' days')::interval;
  
  SELECT 
    COALESCE(SUM(CASE WHEN event_type = 'visit_comecar' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'signup' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'approved' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'onboarding_complete' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'first_action' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'active_7d' THEN 1 ELSE 0 END), 0)
  INTO _visit_count, _signup_count, _approved_count, _onboarding_count, _first_action_count, _active_count
  FROM growth_events
  WHERE occurred_at >= _start_date
    AND (_scope_cidade IS NULL OR scope_cidade = _scope_cidade);
  
  _counts := jsonb_build_object(
    'visit_comecar', _visit_count,
    'signup', _signup_count,
    'approved', _approved_count,
    'onboarding_complete', _onboarding_count,
    'first_action', _first_action_count,
    'active_7d', _active_count
  );
  
  _rates := jsonb_build_object(
    'visit_to_signup', CASE WHEN _visit_count > 0 THEN ROUND((_signup_count::numeric / _visit_count) * 100, 1) ELSE 0 END,
    'signup_to_approved', CASE WHEN _signup_count > 0 THEN ROUND((_approved_count::numeric / _signup_count) * 100, 1) ELSE 0 END,
    'approved_to_onboarding', CASE WHEN _approved_count > 0 THEN ROUND((_onboarding_count::numeric / _approved_count) * 100, 1) ELSE 0 END,
    'onboarding_to_first_action', CASE WHEN _onboarding_count > 0 THEN ROUND((_first_action_count::numeric / _onboarding_count) * 100, 1) ELSE 0 END,
    'first_action_to_active', CASE WHEN _first_action_count > 0 THEN ROUND((_active_count::numeric / _first_action_count) * 100, 1) ELSE 0 END,
    'visit_to_active', CASE WHEN _visit_count > 0 THEN ROUND((_active_count::numeric / _visit_count) * 100, 1) ELSE 0 END
  );
  
  SELECT COALESCE(jsonb_agg(t ORDER BY t.active_count DESC), '[]'::jsonb)
  INTO _top_templates
  FROM (
    SELECT 
      ge.template_id,
      ft.titulo AS template_titulo,
      ft.objetivo AS template_objetivo,
      COUNT(DISTINCT CASE WHEN ge.event_type = 'visit_comecar' THEN ge.id END) AS visit_count,
      COUNT(DISTINCT CASE WHEN ge.event_type = 'signup' THEN ge.user_id END) AS signup_count,
      COUNT(DISTINCT CASE WHEN ge.event_type = 'approved' THEN ge.user_id END) AS approved_count,
      COUNT(DISTINCT CASE WHEN ge.event_type = 'first_action' THEN ge.user_id END) AS active_count
    FROM growth_events ge
    LEFT JOIN fabrica_templates ft ON ft.id = ge.template_id
    WHERE ge.template_id IS NOT NULL
      AND ge.occurred_at >= _start_date
      AND (_scope_cidade IS NULL OR ge.scope_cidade = _scope_cidade)
    GROUP BY ge.template_id, ft.titulo, ft.objetivo
    ORDER BY active_count DESC
    LIMIT 10
  ) t;
  
  SELECT COALESCE(jsonb_agg(r ORDER BY r.active_count DESC), '[]'::jsonb)
  INTO _top_referrers
  FROM (
    SELECT 
      ge.referrer_user_id,
      p.full_name AS referrer_name,
      p.cidade AS referrer_cidade,
      COUNT(DISTINCT CASE WHEN ge.event_type = 'signup' THEN ge.user_id END) AS signup_count,
      COUNT(DISTINCT CASE WHEN ge.event_type = 'approved' THEN ge.user_id END) AS approved_count,
      COUNT(DISTINCT CASE WHEN ge.event_type = 'first_action' THEN ge.user_id END) AS active_count
    FROM growth_events ge
    LEFT JOIN profiles p ON p.id = ge.referrer_user_id
    WHERE ge.referrer_user_id IS NOT NULL
      AND ge.occurred_at >= _start_date
      AND (_scope_cidade IS NULL OR ge.scope_cidade = _scope_cidade)
    GROUP BY ge.referrer_user_id, p.full_name, p.cidade
    ORDER BY active_count DESC
    LIMIT 10
  ) r;
  
  SELECT COALESCE(jsonb_agg(c ORDER BY c.total DESC), '[]'::jsonb)
  INTO _top_cities
  FROM (
    SELECT 
      scope_cidade AS cidade,
      COUNT(DISTINCT CASE WHEN event_type = 'signup' THEN user_id END) AS signup_count,
      COUNT(DISTINCT CASE WHEN event_type = 'approved' THEN user_id END) AS approved_count,
      COUNT(DISTINCT CASE WHEN event_type = 'first_action' THEN user_id END) AS active_count,
      COUNT(*) AS total
    FROM growth_events
    WHERE scope_cidade IS NOT NULL
      AND occurred_at >= _start_date
    GROUP BY scope_cidade
    ORDER BY total DESC
    LIMIT 10
  ) c;
  
  IF _signup_count > 5 AND (_approved_count::numeric / NULLIF(_signup_count, 0)) < 0.5 THEN
    _alerts := _alerts || jsonb_build_array(jsonb_build_object(
      'level', 'warning',
      'title', 'Muitos cadastros aguardando aprovação',
      'hint', format('%s signups, apenas %s aprovados (%s%%)', _signup_count, _approved_count, ROUND((_approved_count::numeric / NULLIF(_signup_count, 0)) * 100)),
      'action_url', '/admin/validar'
    ));
  END IF;
  
  IF _approved_count > 5 AND (_onboarding_count::numeric / NULLIF(_approved_count, 0)) < 0.6 THEN
    _alerts := _alerts || jsonb_build_array(jsonb_build_object(
      'level', 'warning',
      'title', 'Onboarding com taxa baixa',
      'hint', format('Apenas %s%% completaram os primeiros passos', ROUND((_onboarding_count::numeric / NULLIF(_approved_count, 0)) * 100)),
      'action_url', '/admin/ops'
    ));
  END IF;
  
  IF _onboarding_count > 5 AND (_first_action_count::numeric / NULLIF(_onboarding_count, 0)) < 0.4 THEN
    _alerts := _alerts || jsonb_build_array(jsonb_build_object(
      'level', 'error',
      'title', 'Poucos voluntários executando 1ª ação',
      'hint', format('Apenas %s de %s fizeram primeira ação', _first_action_count, _onboarding_count),
      'action_url', '/admin/missoes'
    ));
  END IF;
  
  _result := jsonb_build_object(
    'period_days', _period_days,
    'scope_cidade', _scope_cidade,
    'counts', _counts,
    'rates', _rates,
    'top_templates', _top_templates,
    'top_referrers', _top_referrers,
    'top_cities', _top_cities,
    'alerts', _alerts,
    'generated_at', now()
  );
  
  RETURN _result;
END;
$$;

-- 6) Trigger: Auto-log 'approved' when profile status changes to APROVADO
CREATE OR REPLACE FUNCTION public.trigger_growth_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_code TEXT;
  _referrer_user_id UUID;
  _template_id UUID;
BEGIN
  IF NEW.status = 'APROVADO' AND (OLD.status IS NULL OR OLD.status != 'APROVADO') THEN
    SELECT cu.codigo_convite, c.user_id 
    INTO _invite_code, _referrer_user_id
    FROM convites_usos cu
    LEFT JOIN convites c ON c.codigo = cu.codigo_convite
    WHERE cu.user_id = NEW.id
    LIMIT 1;
    
    SELECT template_id INTO _template_id
    FROM growth_events
    WHERE user_id = NEW.id AND template_id IS NOT NULL
    LIMIT 1;
    
    INSERT INTO growth_events (
      event_type, user_id, template_id, invite_code, referrer_user_id, scope_cidade
    ) VALUES (
      'approved', NEW.id, _template_id, _invite_code, _referrer_user_id, NEW.cidade
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_approved
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_growth_approved();

-- 7) Trigger: Auto-log 'onboarding_complete' when onboarding_steps.completed_at is set
CREATE OR REPLACE FUNCTION public.trigger_growth_onboarding_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cidade TEXT;
  _invite_code TEXT;
  _referrer_user_id UUID;
  _template_id UUID;
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL) THEN
    SELECT p.cidade INTO _cidade
    FROM profiles p WHERE p.id = NEW.user_id;
    
    SELECT cu.codigo_convite, c.user_id 
    INTO _invite_code, _referrer_user_id
    FROM convites_usos cu
    LEFT JOIN convites c ON c.codigo = cu.codigo_convite
    WHERE cu.user_id = NEW.user_id
    LIMIT 1;
    
    SELECT template_id INTO _template_id
    FROM growth_events
    WHERE user_id = NEW.user_id AND template_id IS NOT NULL
    LIMIT 1;
    
    INSERT INTO growth_events (
      event_type, user_id, template_id, invite_code, referrer_user_id, scope_cidade
    ) VALUES (
      'onboarding_complete', NEW.user_id, _template_id, _invite_code, _referrer_user_id, _cidade
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_onboarding_complete
  AFTER UPDATE ON public.onboarding_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_growth_onboarding_complete();

-- 8) Trigger: Auto-log 'first_action' on daily check-in
CREATE OR REPLACE FUNCTION public.trigger_growth_first_action_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cidade TEXT;
  _invite_code TEXT;
  _referrer_user_id UUID;
  _template_id UUID;
  _existing INT;
BEGIN
  SELECT COUNT(*) INTO _existing
  FROM growth_events
  WHERE user_id = NEW.user_id AND event_type = 'first_action';
  
  IF _existing > 0 THEN
    RETURN NEW;
  END IF;
  
  SELECT p.cidade INTO _cidade
  FROM profiles p WHERE p.id = NEW.user_id;
  
  SELECT cu.codigo_convite, c.user_id 
  INTO _invite_code, _referrer_user_id
  FROM convites_usos cu
  LEFT JOIN convites c ON c.codigo = cu.codigo_convite
  WHERE cu.user_id = NEW.user_id
  LIMIT 1;
  
  SELECT template_id INTO _template_id
  FROM growth_events
  WHERE user_id = NEW.user_id AND template_id IS NOT NULL
  LIMIT 1;
  
  INSERT INTO growth_events (
    event_type, user_id, template_id, invite_code, referrer_user_id, scope_cidade
  ) VALUES (
    'first_action', NEW.user_id, _template_id, _invite_code, _referrer_user_id, _cidade
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_checkin_first_action
  AFTER INSERT ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_growth_first_action_checkin();

-- 9) Trigger: Auto-log 'first_action' on mission completion
CREATE OR REPLACE FUNCTION public.trigger_growth_first_action_mission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cidade TEXT;
  _invite_code TEXT;
  _referrer_user_id UUID;
  _template_id UUID;
  _existing INT;
BEGIN
  -- Only trigger when status changes to 'concluida' and assigned_to exists
  IF NEW.status != 'concluida' OR NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status = 'concluida' THEN
    RETURN NEW;
  END IF;
  
  SELECT COUNT(*) INTO _existing
  FROM growth_events
  WHERE user_id = NEW.assigned_to AND event_type = 'first_action';
  
  IF _existing > 0 THEN
    RETURN NEW;
  END IF;
  
  SELECT p.cidade INTO _cidade
  FROM profiles p WHERE p.id = NEW.assigned_to;
  
  SELECT cu.codigo_convite, c.user_id 
  INTO _invite_code, _referrer_user_id
  FROM convites_usos cu
  LEFT JOIN convites c ON c.codigo = cu.codigo_convite
  WHERE cu.user_id = NEW.assigned_to
  LIMIT 1;
  
  SELECT template_id INTO _template_id
  FROM growth_events
  WHERE user_id = NEW.assigned_to AND template_id IS NOT NULL
  LIMIT 1;
  
  INSERT INTO growth_events (
    event_type, user_id, template_id, invite_code, referrer_user_id, scope_cidade
  ) VALUES (
    'first_action', NEW.assigned_to, _template_id, _invite_code, _referrer_user_id, _cidade
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_mission_first_action
  AFTER UPDATE ON public.missions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_growth_first_action_mission();