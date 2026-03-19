-- =============================================
-- SEMANA → BACKLOG DO SQUAD v0
-- Adiciona vínculo de tarefas ao ciclo semanal
-- =============================================

-- 1) Adicionar coluna ciclo_id na squad_tasks
ALTER TABLE public.squad_tasks 
ADD COLUMN ciclo_id UUID REFERENCES public.ciclos_semanais(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.squad_tasks.ciclo_id IS 'Ciclo semanal ao qual a tarefa está vinculada';

-- 2) Criar índices para performance
CREATE INDEX idx_squad_tasks_ciclo_status ON public.squad_tasks(ciclo_id, status);
CREATE INDEX idx_squad_tasks_ciclo_prazo ON public.squad_tasks(ciclo_id, prazo_em);

-- 3) Tabela para dedupe de metas -> tarefas
CREATE TABLE public.ciclo_task_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ciclo_id UUID NOT NULL REFERENCES public.ciclos_semanais(id) ON DELETE CASCADE,
  meta_key TEXT NOT NULL,  -- hash ou índice da meta no metas_json
  task_id UUID NOT NULL UNIQUE REFERENCES public.squad_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ciclo_id, meta_key)
);

COMMENT ON TABLE public.ciclo_task_links IS 'Rastreia quais metas do ciclo já geraram tarefas (dedupe)';

-- 4) RLS para ciclo_task_links
ALTER TABLE public.ciclo_task_links ENABLE ROW LEVEL SECURITY;

-- Coordinators can view/manage cycle task links
CREATE POLICY "Coordinators can manage cycle task links"
  ON public.ciclo_task_links
  FOR ALL
  USING (is_coordinator(auth.uid()));

-- Members can view links for their tasks
CREATE POLICY "Members can view task links"
  ON public.ciclo_task_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_tasks t
      JOIN squad_members m ON m.squad_id = t.squad_id
      WHERE t.id = ciclo_task_links.task_id
      AND m.user_id = auth.uid()
    )
  );

-- 5) RPC: Criar tarefas a partir das metas do ciclo
CREATE OR REPLACE FUNCTION public.create_tasks_from_cycle_metas(
  _ciclo_id UUID,
  _mappings JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_mapping JSONB;
  v_task_id UUID;
  v_created INT := 0;
  v_skipped INT := 0;
  v_ciclo RECORD;
BEGIN
  -- Validate coordinator access
  IF NOT is_coordinator(v_user_id) THEN
    RAISE EXCEPTION 'Acesso negado: apenas coordenadores podem criar tarefas do ciclo';
  END IF;
  
  -- Get cycle info
  SELECT * INTO v_ciclo FROM ciclos_semanais WHERE id = _ciclo_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ciclo não encontrado';
  END IF;
  
  -- Validate scope access
  IF v_ciclo.cidade IS NOT NULL AND NOT can_manage_cidade(v_user_id, v_ciclo.cidade) THEN
    RAISE EXCEPTION 'Sem permissão para este ciclo';
  END IF;
  
  -- Process each mapping
  FOR v_mapping IN SELECT * FROM jsonb_array_elements(_mappings)
  LOOP
    -- Check if already exists (dedupe by meta_key)
    IF EXISTS (
      SELECT 1 FROM ciclo_task_links 
      WHERE ciclo_id = _ciclo_id 
      AND meta_key = v_mapping->>'meta_key'
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    
    -- Create the task
    INSERT INTO squad_tasks (
      squad_id,
      titulo,
      descricao,
      prioridade,
      prazo_em,
      assigned_to,
      ciclo_id,
      created_by
    )
    VALUES (
      (v_mapping->>'squad_id')::UUID,
      v_mapping->>'titulo',
      v_mapping->>'descricao',
      COALESCE((v_mapping->>'prioridade')::squad_task_prioridade, 'media'),
      (v_mapping->>'prazo_em')::TIMESTAMPTZ,
      (v_mapping->>'assigned_to')::UUID,
      _ciclo_id,
      v_user_id
    )
    RETURNING id INTO v_task_id;
    
    -- Create the link for dedupe
    INSERT INTO ciclo_task_links (ciclo_id, meta_key, task_id)
    VALUES (_ciclo_id, v_mapping->>'meta_key', v_task_id);
    
    v_created := v_created + 1;
  END LOOP;
  
  -- Audit log
  INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_data)
  VALUES (v_user_id, 'ciclo', _ciclo_id, 'create_tasks_from_metas', 
          jsonb_build_object('created', v_created, 'skipped', v_skipped));
  
  RETURN jsonb_build_object('created', v_created, 'skipped', v_skipped);
END;
$$;

-- 6) RPC: Obter métricas de tarefas do ciclo (para Ops)
CREATE OR REPLACE FUNCTION public.get_cycle_tasks_metrics(
  _ciclo_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_metas_count INT;
  v_linked_metas INT;
BEGIN
  -- Get task counts by status
  SELECT jsonb_build_object(
    'abertas', COUNT(*) FILTER (WHERE status IN ('a_fazer', 'fazendo')),
    'feitas', COUNT(*) FILTER (WHERE status = 'feito'),
    'bloqueadas', COUNT(*) FILTER (WHERE status = 'bloqueado'),
    'vencendo_7d', COUNT(*) FILTER (
      WHERE status IN ('a_fazer', 'fazendo') 
      AND prazo_em IS NOT NULL 
      AND prazo_em <= now() + INTERVAL '7 days'
    ),
    'total', COUNT(*)
  )
  INTO v_result
  FROM squad_tasks
  WHERE ciclo_id = _ciclo_id;
  
  -- Get metas count from cycle
  SELECT COALESCE(jsonb_array_length(metas_json), 0)
  INTO v_metas_count
  FROM ciclos_semanais
  WHERE id = _ciclo_id;
  
  -- Get linked metas count
  SELECT COUNT(DISTINCT meta_key)
  INTO v_linked_metas
  FROM ciclo_task_links
  WHERE ciclo_id = _ciclo_id;
  
  v_result := v_result || jsonb_build_object(
    'metas_total', v_metas_count,
    'metas_com_tarefa', v_linked_metas,
    'metas_sem_tarefa', GREATEST(0, v_metas_count - v_linked_metas)
  );
  
  RETURN v_result;
END;
$$;

-- 7) RPC: Obter tarefas do ciclo para um voluntário (apenas dos squads onde é membro)
CREATE OR REPLACE FUNCTION public.get_my_cycle_tasks(_ciclo_id UUID)
RETURNS SETOF squad_tasks
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.*
  FROM squad_tasks t
  JOIN squad_members m ON m.squad_id = t.squad_id
  WHERE t.ciclo_id = _ciclo_id
  AND m.user_id = auth.uid()
  AND t.status IN ('a_fazer', 'fazendo', 'bloqueado')
  ORDER BY 
    CASE WHEN t.prazo_em IS NOT NULL AND t.prazo_em <= now() + INTERVAL '2 days' THEN 0 ELSE 1 END,
    CASE t.prioridade WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
    t.prazo_em NULLS LAST;
$$;