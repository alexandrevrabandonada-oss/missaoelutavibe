
-- Fix notify_evidence_status_change: use user_id instead of submitted_by, support new status values
CREATE OR REPLACE FUNCTION public.notify_evidence_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _mission RECORD;
    _status_label TEXT;
    _corpo TEXT;
BEGIN
    -- Only trigger when status changes and new status is a terminal/validated one
    IF OLD.status IS DISTINCT FROM NEW.status 
       AND NEW.status IN ('validado', 'rejeitado', 'aprovada', 'reprovada') THEN
        
        SELECT * INTO _mission FROM public.missions WHERE id = NEW.mission_id;
        
        _status_label := CASE NEW.status
            WHEN 'validado'  THEN 'aprovada ✓'
            WHEN 'aprovada'  THEN 'aprovada ✓'
            WHEN 'rejeitado' THEN 'reprovada'
            WHEN 'reprovada' THEN 'reprovada'
            ELSE NEW.status::text
        END;
        
        _corpo := CASE NEW.status
            WHEN 'validado'  THEN 'Sua evidência para "' || LEFT(COALESCE(_mission.title, ''), 30) || '" foi aprovada!'
            WHEN 'aprovada'  THEN 'Sua evidência para "' || LEFT(COALESCE(_mission.title, ''), 30) || '" foi aprovada!'
            WHEN 'rejeitado' THEN 'Sua evidência precisa de ajustes: ' || COALESCE(NEW.rejection_reason, 'verifique os detalhes')
            WHEN 'reprovada' THEN 'Sua evidência precisa de ajustes: ' || COALESCE(NEW.rejection_reason, 'verifique os detalhes')
            ELSE 'Status atualizado para: ' || _status_label
        END;
        
        INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, href, meta)
        VALUES (
            NEW.user_id,
            'evidence_status',
            'Evidência ' || _status_label,
            _corpo,
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
