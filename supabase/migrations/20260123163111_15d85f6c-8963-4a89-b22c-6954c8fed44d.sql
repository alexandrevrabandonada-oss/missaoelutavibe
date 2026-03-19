-- =============================================
-- SINAIS DE UTILIDADE v0
-- =============================================

-- A) utility_signals - sinais individuais
CREATE TABLE public.utility_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('mission', 'mural_post')),
  target_id UUID NOT NULL,
  scope_tipo TEXT NOT NULL CHECK (scope_tipo IN ('celula', 'cidade')),
  scope_id TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('aprovar', 'usei', 'compartilhei', 'puxo')),
  weight NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id, signal_type)
);

CREATE INDEX idx_utility_signals_target ON public.utility_signals(target_type, target_id);
CREATE INDEX idx_utility_signals_scope ON public.utility_signals(scope_tipo, scope_id);
CREATE INDEX idx_utility_signals_created ON public.utility_signals(created_at);

-- B) weekly_signal_rollups - agregação semanal
CREATE TABLE public.weekly_signal_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  scope_tipo TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  signal_type TEXT NOT NULL,
  score_sum NUMERIC NOT NULL DEFAULT 0,
  unique_users INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_start, scope_tipo, scope_id, target_type, target_id, signal_type)
);

CREATE INDEX idx_weekly_rollups_week_scope ON public.weekly_signal_rollups(week_start, scope_tipo, scope_id, signal_type);

-- C) coord_picks - escolha editorial
CREATE TABLE public.coord_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  scope_tipo TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  note TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(week_start, scope_tipo, scope_id, target_type, target_id)
);

-- D) mural_reports - reports de moderação
CREATE TABLE public.mural_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.mural_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  motivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'revisado', 'ignorado')),
  revisado_por UUID,
  revisado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.utility_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_signal_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coord_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mural_reports ENABLE ROW LEVEL SECURITY;

-- utility_signals RLS
CREATE POLICY "Users can manage own signals"
  ON public.utility_signals FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view signals in scope"
  ON public.utility_signals FOR SELECT
  USING (is_approved_volunteer(auth.uid()));

-- weekly_signal_rollups RLS
CREATE POLICY "Anyone can view rollups"
  ON public.weekly_signal_rollups FOR SELECT
  USING (is_approved_volunteer(auth.uid()));

CREATE POLICY "System can manage rollups"
  ON public.weekly_signal_rollups FOR ALL
  USING (is_coordinator(auth.uid()));

-- coord_picks RLS
CREATE POLICY "Anyone can view coord picks"
  ON public.coord_picks FOR SELECT
  USING (is_approved_volunteer(auth.uid()));

CREATE POLICY "Coordinators can manage picks"
  ON public.coord_picks FOR ALL
  USING (is_coordinator(auth.uid()));

-- mural_reports RLS
CREATE POLICY "Users can create reports"
  ON public.mural_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid() AND is_approved_volunteer(auth.uid()));

CREATE POLICY "Users can view own reports"
  ON public.mural_reports FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "Coordinators can manage reports"
  ON public.mural_reports FOR ALL
  USING (is_coordinator(auth.uid()));

-- =============================================
-- FUNCTIONS
-- =============================================

-- 1) compute_trust_weight
CREATE OR REPLACE FUNCTION public.compute_trust_weight(_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weight NUMERIC := 1;
  v_account_age INT;
  v_missions_completed INT;
BEGIN
  -- Get account age in days
  SELECT EXTRACT(DAY FROM (now() - p.created_at))::INT INTO v_account_age
  FROM profiles p WHERE p.id = _user_id;
  
  IF v_account_age IS NULL THEN
    RETURN 0.25;
  END IF;
  
  -- Age-based weight
  IF v_account_age < 14 THEN
    v_weight := 0.25;
  ELSIF v_account_age < 60 THEN
    v_weight := 0.6;
  ELSE
    v_weight := 1;
  END IF;
  
  -- Bonus for completed missions
  SELECT COUNT(*) INTO v_missions_completed
  FROM evidences e
  WHERE e.user_id = _user_id AND e.status = 'validada';
  
  IF v_missions_completed >= 1 THEN
    v_weight := v_weight + 0.2;
  END IF;
  
  -- Cap at 1.5
  RETURN LEAST(v_weight, 1.5);
END;
$$;

-- 2) toggle_utility_signal
CREATE OR REPLACE FUNCTION public.toggle_utility_signal(
  _target_type TEXT,
  _target_id UUID,
  _signal_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_scope_tipo TEXT;
  v_scope_id TEXT;
  v_weight NUMERIC;
  v_existing_id UUID;
  v_signals_today INT;
  v_result JSONB;
  v_counts JSONB;
BEGIN
  -- Validate user
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF NOT is_approved_volunteer(v_user_id) THEN
    RAISE EXCEPTION 'Not approved';
  END IF;
  
  -- Rate limit: max 50 signals per day
  SELECT COUNT(*) INTO v_signals_today
  FROM utility_signals
  WHERE user_id = v_user_id 
    AND created_at >= CURRENT_DATE;
  
  IF v_signals_today >= 50 THEN
    RAISE EXCEPTION 'Rate limit exceeded';
  END IF;
  
  -- Determine scope (prefer celula, fallback to cidade)
  SELECT 
    CASE WHEN cm.cell_id IS NOT NULL THEN 'celula' ELSE 'cidade' END,
    CASE WHEN cm.cell_id IS NOT NULL THEN cm.cell_id::TEXT ELSE p.city END
  INTO v_scope_tipo, v_scope_id
  FROM profiles p
  LEFT JOIN cell_memberships cm ON cm.user_id = v_user_id AND cm.is_active = true
  WHERE p.id = v_user_id
  LIMIT 1;
  
  IF v_scope_id IS NULL THEN
    v_scope_tipo := 'cidade';
    v_scope_id := 'global';
  END IF;
  
  -- Check if signal exists
  SELECT id INTO v_existing_id
  FROM utility_signals
  WHERE user_id = v_user_id 
    AND target_type = _target_type 
    AND target_id = _target_id 
    AND signal_type = _signal_type;
  
  IF v_existing_id IS NOT NULL THEN
    -- Remove signal
    DELETE FROM utility_signals WHERE id = v_existing_id;
    v_result := jsonb_build_object('action', 'removed');
  ELSE
    -- Add signal
    v_weight := compute_trust_weight(v_user_id);
    
    INSERT INTO utility_signals (user_id, target_type, target_id, scope_tipo, scope_id, signal_type, weight)
    VALUES (v_user_id, _target_type, _target_id, v_scope_tipo, v_scope_id, _signal_type, v_weight);
    
    v_result := jsonb_build_object('action', 'added');
  END IF;
  
  -- Get updated counts
  SELECT jsonb_object_agg(signal_type, cnt) INTO v_counts
  FROM (
    SELECT signal_type, COUNT(*) as cnt
    FROM utility_signals
    WHERE target_type = _target_type AND target_id = _target_id
    GROUP BY signal_type
  ) sq;
  
  v_result := v_result || jsonb_build_object('counts', COALESCE(v_counts, '{}'::jsonb));
  
  -- Get user's active signals for this target
  v_result := v_result || jsonb_build_object(
    'userSignals', 
    (SELECT COALESCE(jsonb_agg(signal_type), '[]'::jsonb)
     FROM utility_signals
     WHERE user_id = v_user_id AND target_type = _target_type AND target_id = _target_id)
  );
  
  RETURN v_result;
END;
$$;

-- 3) get_signal_counts - get counts for a target
CREATE OR REPLACE FUNCTION public.get_signal_counts(
  _target_type TEXT,
  _target_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counts JSONB;
  v_user_signals JSONB;
BEGIN
  -- Get counts
  SELECT jsonb_object_agg(signal_type, cnt) INTO v_counts
  FROM (
    SELECT signal_type, COUNT(*) as cnt
    FROM utility_signals
    WHERE target_type = _target_type AND target_id = _target_id
    GROUP BY signal_type
  ) sq;
  
  -- Get user's signals
  SELECT COALESCE(jsonb_agg(signal_type), '[]'::jsonb) INTO v_user_signals
  FROM utility_signals
  WHERE user_id = auth.uid() AND target_type = _target_type AND target_id = _target_id;
  
  RETURN jsonb_build_object(
    'counts', COALESCE(v_counts, '{}'::jsonb),
    'userSignals', v_user_signals
  );
END;
$$;

-- 4) recompute_weekly_rollups
CREATE OR REPLACE FUNCTION public.recompute_weekly_rollups(
  _week_start DATE,
  _scope_tipo TEXT,
  _scope_id TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  -- Delete existing rollups for this week/scope
  DELETE FROM weekly_signal_rollups
  WHERE week_start = _week_start AND scope_tipo = _scope_tipo AND scope_id = _scope_id;
  
  -- Insert fresh rollups
  INSERT INTO weekly_signal_rollups (week_start, scope_tipo, scope_id, target_type, target_id, signal_type, score_sum, unique_users)
  SELECT 
    _week_start,
    _scope_tipo,
    _scope_id,
    target_type,
    target_id,
    signal_type,
    SUM(weight),
    COUNT(DISTINCT user_id)
  FROM utility_signals
  WHERE scope_tipo = _scope_tipo 
    AND scope_id = _scope_id
    AND created_at >= _week_start 
    AND created_at < _week_start + INTERVAL '7 days'
  GROUP BY target_type, target_id, signal_type;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5) get_top_of_week
CREATE OR REPLACE FUNCTION public.get_top_of_week(
  _week_start DATE,
  _scope_tipo TEXT,
  _scope_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usei JSONB;
  v_compartilhei JSONB;
  v_puxo JSONB;
  v_picks JSONB;
BEGIN
  -- Top usei (♻️)
  SELECT COALESCE(jsonb_agg(row_to_json(sq)), '[]'::jsonb) INTO v_usei
  FROM (
    SELECT r.target_type, r.target_id, r.score_sum, r.unique_users,
           CASE WHEN r.target_type = 'mission' THEN m.title ELSE mp.titulo END as title
    FROM weekly_signal_rollups r
    LEFT JOIN missions m ON r.target_type = 'mission' AND m.id = r.target_id
    LEFT JOIN mural_posts mp ON r.target_type = 'mural_post' AND mp.id = r.target_id
    WHERE r.week_start = _week_start 
      AND r.scope_tipo = _scope_tipo 
      AND r.scope_id = _scope_id
      AND r.signal_type = 'usei'
    ORDER BY r.score_sum DESC
    LIMIT 10
  ) sq;
  
  -- Top compartilhei (📣)
  SELECT COALESCE(jsonb_agg(row_to_json(sq)), '[]'::jsonb) INTO v_compartilhei
  FROM (
    SELECT r.target_type, r.target_id, r.score_sum, r.unique_users,
           CASE WHEN r.target_type = 'mission' THEN m.title ELSE mp.titulo END as title
    FROM weekly_signal_rollups r
    LEFT JOIN missions m ON r.target_type = 'mission' AND m.id = r.target_id
    LEFT JOIN mural_posts mp ON r.target_type = 'mural_post' AND mp.id = r.target_id
    WHERE r.week_start = _week_start 
      AND r.scope_tipo = _scope_tipo 
      AND r.scope_id = _scope_id
      AND r.signal_type = 'compartilhei'
    ORDER BY r.score_sum DESC
    LIMIT 10
  ) sq;
  
  -- Top puxo (🤝)
  SELECT COALESCE(jsonb_agg(row_to_json(sq)), '[]'::jsonb) INTO v_puxo
  FROM (
    SELECT r.target_type, r.target_id, r.score_sum, r.unique_users,
           CASE WHEN r.target_type = 'mission' THEN m.title ELSE mp.titulo END as title
    FROM weekly_signal_rollups r
    LEFT JOIN missions m ON r.target_type = 'mission' AND m.id = r.target_id
    LEFT JOIN mural_posts mp ON r.target_type = 'mural_post' AND mp.id = r.target_id
    WHERE r.week_start = _week_start 
      AND r.scope_tipo = _scope_tipo 
      AND r.scope_id = _scope_id
      AND r.signal_type = 'puxo'
    ORDER BY r.score_sum DESC
    LIMIT 10
  ) sq;
  
  -- Coord picks
  SELECT COALESCE(jsonb_agg(row_to_json(sq)), '[]'::jsonb) INTO v_picks
  FROM (
    SELECT cp.target_type, cp.target_id, cp.note,
           CASE WHEN cp.target_type = 'mission' THEN m.title ELSE mp.titulo END as title,
           p.full_name as picked_by
    FROM coord_picks cp
    LEFT JOIN missions m ON cp.target_type = 'mission' AND m.id = cp.target_id
    LEFT JOIN mural_posts mp ON cp.target_type = 'mural_post' AND mp.id = cp.target_id
    LEFT JOIN profiles p ON p.id = cp.created_by
    WHERE cp.week_start = _week_start 
      AND cp.scope_tipo = _scope_tipo 
      AND cp.scope_id = _scope_id
    ORDER BY cp.created_at DESC
  ) sq;
  
  RETURN jsonb_build_object(
    'usei', v_usei,
    'compartilhei', v_compartilhei,
    'puxo', v_puxo,
    'coordPicks', v_picks
  );
END;
$$;

-- 6) get_signals_metrics for ops
CREATE OR REPLACE FUNCTION public.get_signals_metrics(
  _scope_tipo TEXT,
  _scope_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
  v_total INT;
  v_by_type JSONB;
BEGIN
  -- Total signals this week
  SELECT COUNT(*) INTO v_total
  FROM utility_signals
  WHERE scope_tipo = _scope_tipo 
    AND scope_id = _scope_id
    AND created_at >= v_week_start;
  
  -- By type
  SELECT jsonb_object_agg(signal_type, cnt) INTO v_by_type
  FROM (
    SELECT signal_type, COUNT(*) as cnt
    FROM utility_signals
    WHERE scope_tipo = _scope_tipo 
      AND scope_id = _scope_id
      AND created_at >= v_week_start
    GROUP BY signal_type
  ) sq;
  
  RETURN jsonb_build_object(
    'weekStart', v_week_start,
    'total', v_total,
    'byType', COALESCE(v_by_type, '{}'::jsonb)
  );
END;
$$;