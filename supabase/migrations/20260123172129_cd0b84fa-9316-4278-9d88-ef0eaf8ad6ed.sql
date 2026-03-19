-- =============================================
-- ONBOARDING v1: "Primeiros 10 minutos"
-- =============================================

-- Table: onboarding_steps
CREATE TABLE public.onboarding_steps (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  step1_done BOOLEAN NOT NULL DEFAULT false,  -- Confirmar território
  step2_done BOOLEAN NOT NULL DEFAULT false,  -- Fazer check-in do dia
  step3_done BOOLEAN NOT NULL DEFAULT false,  -- Escolher 1 ação
  step4_done BOOLEAN NOT NULL DEFAULT false,  -- Postar no mural (opcional)
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies: user can only CRUD their own row
CREATE POLICY "Users can view their own onboarding" 
ON public.onboarding_steps FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding" 
ON public.onboarding_steps FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding" 
ON public.onboarding_steps FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_onboarding_steps_updated_at
BEFORE UPDATE ON public.onboarding_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RPC: get_onboarding_status
-- =============================================
CREATE OR REPLACE FUNCTION public.get_onboarding_status()
RETURNS TABLE(
  step1_done BOOLEAN,
  step2_done BOOLEAN,
  step3_done BOOLEAN,
  step4_done BOOLEAN,
  completed_at TIMESTAMPTZ,
  steps_completed INT,
  is_complete BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rec RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get or create onboarding record
  SELECT os.* INTO v_rec
  FROM onboarding_steps os
  WHERE os.user_id = v_user_id;

  IF NOT FOUND THEN
    -- Create initial record
    INSERT INTO onboarding_steps (user_id)
    VALUES (v_user_id)
    RETURNING * INTO v_rec;
  END IF;

  RETURN QUERY SELECT
    v_rec.step1_done,
    v_rec.step2_done,
    v_rec.step3_done,
    v_rec.step4_done,
    v_rec.completed_at,
    (CASE WHEN v_rec.step1_done THEN 1 ELSE 0 END +
     CASE WHEN v_rec.step2_done THEN 1 ELSE 0 END +
     CASE WHEN v_rec.step3_done THEN 1 ELSE 0 END +
     CASE WHEN v_rec.step4_done THEN 1 ELSE 0 END)::INT AS steps_completed,
    (v_rec.step1_done AND v_rec.step2_done AND v_rec.step3_done) AS is_complete;
END;
$$;

-- =============================================
-- RPC: mark_onboarding_step_done
-- =============================================
CREATE OR REPLACE FUNCTION public.mark_onboarding_step_done(p_step INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rec RECORD;
  v_all_required_done BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_step NOT IN (1, 2, 3, 4) THEN
    RAISE EXCEPTION 'Invalid step number';
  END IF;

  -- Ensure record exists
  INSERT INTO onboarding_steps (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update the specific step
  IF p_step = 1 THEN
    UPDATE onboarding_steps SET step1_done = true WHERE user_id = v_user_id;
  ELSIF p_step = 2 THEN
    UPDATE onboarding_steps SET step2_done = true WHERE user_id = v_user_id;
  ELSIF p_step = 3 THEN
    UPDATE onboarding_steps SET step3_done = true WHERE user_id = v_user_id;
  ELSIF p_step = 4 THEN
    UPDATE onboarding_steps SET step4_done = true WHERE user_id = v_user_id;
  END IF;

  -- Check if all required steps (1, 2, 3) are done
  SELECT step1_done AND step2_done AND step3_done INTO v_all_required_done
  FROM onboarding_steps
  WHERE user_id = v_user_id;

  -- If all required done and not yet completed, mark completed + create notification
  IF v_all_required_done THEN
    SELECT * INTO v_rec FROM onboarding_steps WHERE user_id = v_user_id;
    
    IF v_rec.completed_at IS NULL THEN
      UPDATE onboarding_steps 
      SET completed_at = now() 
      WHERE user_id = v_user_id;

      -- Create welcome notification
      INSERT INTO notificacoes (user_id, tipo, titulo, corpo, href)
      VALUES (
        v_user_id,
        'onboarding_complete',
        '🎉 Você entrou na engrenagem!',
        'Parabéns por completar seus primeiros passos. Agora veja a Semana e continue construindo.',
        '/voluntario/semana'
      );
    END IF;
  END IF;

  -- Return current status
  SELECT * INTO v_rec FROM onboarding_steps WHERE user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'step1_done', v_rec.step1_done,
    'step2_done', v_rec.step2_done,
    'step3_done', v_rec.step3_done,
    'step4_done', v_rec.step4_done,
    'completed_at', v_rec.completed_at,
    'is_complete', v_rec.step1_done AND v_rec.step2_done AND v_rec.step3_done
  );
END;
$$;

-- =============================================
-- RPC: get_onboarding_metrics (for Ops)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_onboarding_metrics(
  _scope_type TEXT DEFAULT 'all',
  _scope_cidade TEXT DEFAULT NULL,
  _scope_celula_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_week_start DATE := date_trunc('week', CURRENT_DATE)::DATE;
  v_aprovados_7d INT;
  v_concluiram_7d INT;
  v_em_progresso INT;
BEGIN
  -- Approved volunteers in last 7 days (with scope filter)
  SELECT COUNT(*) INTO v_aprovados_7d
  FROM profiles p
  WHERE p.volunteer_status = 'APROVADO'
    AND p.approved_at >= v_week_start
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND p.city = _scope_cidade)
      OR (_scope_type = 'celula' AND EXISTS (
        SELECT 1 FROM cell_memberships cm 
        WHERE cm.user_id = p.id AND cm.cell_id = _scope_celula_id AND cm.is_active = true
      ))
    );

  -- Completed onboarding in last 7 days (with scope filter)
  SELECT COUNT(*) INTO v_concluiram_7d
  FROM onboarding_steps os
  JOIN profiles p ON p.id = os.user_id
  WHERE os.completed_at >= v_week_start
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND p.city = _scope_cidade)
      OR (_scope_type = 'celula' AND EXISTS (
        SELECT 1 FROM cell_memberships cm 
        WHERE cm.user_id = p.id AND cm.cell_id = _scope_celula_id AND cm.is_active = true
      ))
    );

  -- In progress (started but not completed)
  SELECT COUNT(*) INTO v_em_progresso
  FROM onboarding_steps os
  JOIN profiles p ON p.id = os.user_id
  WHERE os.completed_at IS NULL
    AND (os.step1_done OR os.step2_done OR os.step3_done OR os.step4_done)
    AND (
      _scope_type = 'all'
      OR (_scope_type = 'cidade' AND p.city = _scope_cidade)
      OR (_scope_type = 'celula' AND EXISTS (
        SELECT 1 FROM cell_memberships cm 
        WHERE cm.user_id = p.id AND cm.cell_id = _scope_celula_id AND cm.is_active = true
      ))
    );

  RETURN jsonb_build_object(
    'aprovados_7d', v_aprovados_7d,
    'concluiram_7d', v_concluiram_7d,
    'em_progresso', v_em_progresso,
    'taxa_conclusao', CASE WHEN v_aprovados_7d > 0 
      THEN ROUND((v_concluiram_7d::NUMERIC / v_aprovados_7d) * 100, 1)
      ELSE 0 
    END
  );
END;
$$;