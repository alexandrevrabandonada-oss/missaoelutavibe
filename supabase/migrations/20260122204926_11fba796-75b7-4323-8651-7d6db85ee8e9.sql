-- =============================================
-- SEMANA v0: Extend ciclos_semanais for weekly goals and closing
-- =============================================

-- Add metas_json for simple weekly goals list
ALTER TABLE public.ciclos_semanais 
ADD COLUMN IF NOT EXISTS metas_json JSONB DEFAULT '[]'::jsonb;

-- Add fechamento_json for cycle closing receipt data
ALTER TABLE public.ciclos_semanais 
ADD COLUMN IF NOT EXISTS fechamento_json JSONB DEFAULT NULL;

-- Add fechado_em timestamp for when cycle was closed
ALTER TABLE public.ciclos_semanais 
ADD COLUMN IF NOT EXISTS fechado_em TIMESTAMPTZ DEFAULT NULL;

-- Add fechado_por for who closed the cycle
ALTER TABLE public.ciclos_semanais 
ADD COLUMN IF NOT EXISTS fechado_por UUID DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.ciclos_semanais.metas_json IS 'Weekly goals: array of strings or {titulo, status?} objects';
COMMENT ON COLUMN public.ciclos_semanais.fechamento_json IS 'Cycle closing receipt: {feitos, travas, proximos_passos}';
COMMENT ON COLUMN public.ciclos_semanais.fechado_em IS 'Timestamp when cycle was formally closed';
COMMENT ON COLUMN public.ciclos_semanais.fechado_por IS 'User ID who closed the cycle';

-- =============================================
-- Function to close a cycle with receipt
-- =============================================
CREATE OR REPLACE FUNCTION public.close_cycle(
  _ciclo_id UUID,
  _fechamento_json JSONB
)
RETURNS ciclos_semanais
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result ciclos_semanais;
BEGIN
  -- Verify caller is coordinator
  IF NOT is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas coordenadores podem fechar ciclos';
  END IF;

  -- Update the cycle
  UPDATE public.ciclos_semanais
  SET 
    status = 'encerrado',
    fechamento_json = _fechamento_json,
    fechado_em = NOW(),
    fechado_por = auth.uid(),
    updated_at = NOW()
  WHERE id = _ciclo_id
  RETURNING * INTO _result;

  IF _result IS NULL THEN
    RAISE EXCEPTION 'Ciclo não encontrado';
  END IF;

  -- Log to audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
  VALUES (
    auth.uid(),
    'cycle_closed',
    'ciclos_semanais',
    _ciclo_id,
    jsonb_build_object(
      'titulo', _result.titulo,
      'fechamento', _fechamento_json
    )
  );

  RETURN _result;
END;
$$;

-- =============================================
-- Function to update cycle metas
-- =============================================
CREATE OR REPLACE FUNCTION public.update_cycle_metas(
  _ciclo_id UUID,
  _metas_json JSONB
)
RETURNS ciclos_semanais
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result ciclos_semanais;
BEGIN
  -- Verify caller is coordinator
  IF NOT is_coordinator(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas coordenadores podem editar metas';
  END IF;

  -- Update the cycle
  UPDATE public.ciclos_semanais
  SET 
    metas_json = _metas_json,
    updated_at = NOW()
  WHERE id = _ciclo_id
  RETURNING * INTO _result;

  IF _result IS NULL THEN
    RAISE EXCEPTION 'Ciclo não encontrado';
  END IF;

  RETURN _result;
END;
$$;