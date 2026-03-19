-- Create enum for cycle status
CREATE TYPE public.ciclo_status AS ENUM ('rascunho', 'ativo', 'encerrado');

-- Create ciclos_semanais table
CREATE TABLE public.ciclos_semanais (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    inicio DATE NOT NULL,
    fim DATE NOT NULL,
    cidade TEXT,
    celula_id UUID REFERENCES public.cells(id) ON DELETE SET NULL,
    status public.ciclo_status NOT NULL DEFAULT 'rascunho',
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT valid_period CHECK (fim >= inicio)
);

-- Enable RLS
ALTER TABLE public.ciclos_semanais ENABLE ROW LEVEL SECURITY;

-- Create unique partial index: only 1 active cycle per scope
CREATE UNIQUE INDEX unique_active_cycle_per_scope 
ON public.ciclos_semanais (cidade, celula_id) 
WHERE status = 'ativo';

-- Add ciclo_id to missions table
ALTER TABLE public.missions ADD COLUMN ciclo_id UUID REFERENCES public.ciclos_semanais(id) ON DELETE SET NULL;

-- Add ciclo_id and fixado to anuncios table  
ALTER TABLE public.anuncios ADD COLUMN ciclo_id UUID REFERENCES public.ciclos_semanais(id) ON DELETE SET NULL;
ALTER TABLE public.anuncios ADD COLUMN fixado BOOLEAN NOT NULL DEFAULT false;

-- Add demanda_origem_id to missions (link demand->mission)
ALTER TABLE public.missions ADD COLUMN demanda_origem_id UUID REFERENCES public.demandas(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_ciclos_status ON public.ciclos_semanais(status);
CREATE INDEX idx_ciclos_cidade ON public.ciclos_semanais(cidade);
CREATE INDEX idx_ciclos_celula ON public.ciclos_semanais(celula_id);
CREATE INDEX idx_missions_ciclo ON public.missions(ciclo_id);
CREATE INDEX idx_anuncios_ciclo ON public.anuncios(ciclo_id);
CREATE INDEX idx_anuncios_fixado ON public.anuncios(fixado) WHERE fixado = true;
CREATE INDEX idx_missions_demanda_origem ON public.missions(demanda_origem_id);

-- RLS Policies for ciclos_semanais

-- Volunteers can view active cycles in their scope
CREATE POLICY "Volunteers can view active cycles in their scope"
ON public.ciclos_semanais
FOR SELECT
TO authenticated
USING (
    status = 'ativo'
    OR is_coordinator(auth.uid())
    OR criado_por = auth.uid()
);

-- Coordinators can create cycles in their scope
CREATE POLICY "Coordinators can create cycles"
ON public.ciclos_semanais
FOR INSERT
TO authenticated
WITH CHECK (
    is_coordinator(auth.uid())
    AND (cidade IS NULL OR can_manage_cidade(auth.uid(), cidade))
);

-- Coordinators can update cycles in their scope
CREATE POLICY "Coordinators can update cycles in their scope"
ON public.ciclos_semanais
FOR UPDATE
TO authenticated
USING (
    is_coordinator(auth.uid())
    AND (cidade IS NULL OR can_manage_cidade(auth.uid(), cidade))
);

-- Admins can delete cycles
CREATE POLICY "Admins can delete cycles"
ON public.ciclos_semanais
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_ciclos_semanais_updated_at
BEFORE UPDATE ON public.ciclos_semanais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get active cycle for a scope
CREATE OR REPLACE FUNCTION public.get_active_cycle(_cidade TEXT DEFAULT NULL, _celula_id UUID DEFAULT NULL)
RETURNS public.ciclos_semanais
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM public.ciclos_semanais
    WHERE status = 'ativo'
      AND (
          -- Exact scope match
          (cidade IS NOT DISTINCT FROM _cidade AND celula_id IS NOT DISTINCT FROM _celula_id)
          -- Or global cycle (no scope)
          OR (cidade IS NULL AND celula_id IS NULL)
      )
    ORDER BY 
        -- Prefer more specific scope
        CASE WHEN celula_id IS NOT NULL THEN 1 WHEN cidade IS NOT NULL THEN 2 ELSE 3 END
    LIMIT 1;
$$;

-- Notification trigger: when mission is assigned
CREATE OR REPLACE FUNCTION public.notify_mission_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only trigger when assigned_to changes to a non-null value
    IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
        INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, href, meta)
        VALUES (
            NEW.assigned_to,
            'mission_assigned',
            'Nova missão atribuída: ' || LEFT(NEW.title, 40),
            'Você foi designado para uma missão. Confira os detalhes.',
            '/voluntario/missao/' || NEW.id,
            jsonb_build_object('mission_id', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_mission_assigned
AFTER INSERT OR UPDATE ON public.missions
FOR EACH ROW
EXECUTE FUNCTION public.notify_mission_assigned();

-- Notification trigger: when evidence status changes
CREATE OR REPLACE FUNCTION public.notify_evidence_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _mission RECORD;
    _status_label TEXT;
BEGIN
    -- Only trigger when status changes
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status != 'pendente' THEN
        -- Get mission info
        SELECT * INTO _mission FROM public.missions WHERE id = NEW.mission_id;
        
        _status_label := CASE NEW.status
            WHEN 'aprovada' THEN 'aprovada ✓'
            WHEN 'reprovada' THEN 'reprovada'
            ELSE NEW.status::text
        END;
        
        INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, href, meta)
        VALUES (
            NEW.submitted_by,
            'evidence_status',
            'Evidência ' || _status_label,
            CASE NEW.status
                WHEN 'aprovada' THEN 'Sua evidência para "' || LEFT(_mission.title, 30) || '" foi aprovada!'
                WHEN 'reprovada' THEN 'Sua evidência precisa de ajustes: ' || COALESCE(NEW.rejection_reason, 'verifique os detalhes')
                ELSE 'Status atualizado para: ' || _status_label
            END,
            '/voluntario/missao/' || NEW.mission_id,
            jsonb_build_object(
                'mission_id', NEW.mission_id,
                'evidence_id', NEW.id,
                'status', NEW.status::text
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_evidence_status
AFTER UPDATE ON public.evidences
FOR EACH ROW
EXECUTE FUNCTION public.notify_evidence_status_change();

-- Notification trigger: when demand becomes mission
CREATE OR REPLACE FUNCTION public.notify_demand_to_mission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _demanda RECORD;
BEGIN
    -- Only trigger when demanda_origem_id is set on insert
    IF NEW.demanda_origem_id IS NOT NULL THEN
        -- Get demanda info
        SELECT * INTO _demanda FROM public.demandas WHERE id = NEW.demanda_origem_id;
        
        IF _demanda.criado_por IS NOT NULL THEN
            INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, href, meta)
            VALUES (
                _demanda.criado_por,
                'demand_to_mission',
                'Sua demanda virou missão! 🎯',
                '"' || LEFT(_demanda.titulo, 40) || '" foi convertida em missão ativa.',
                '/voluntario/missao/' || NEW.id,
                jsonb_build_object(
                    'mission_id', NEW.id,
                    'demanda_id', NEW.demanda_origem_id
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_demand_to_mission
AFTER INSERT ON public.missions
FOR EACH ROW
EXECUTE FUNCTION public.notify_demand_to_mission();