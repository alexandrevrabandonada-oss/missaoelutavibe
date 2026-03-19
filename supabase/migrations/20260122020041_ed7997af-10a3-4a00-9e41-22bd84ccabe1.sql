-- Create ticket enums (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
        CREATE TYPE public.ticket_status AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'ARQUIVADO');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_categoria') THEN
        CREATE TYPE public.ticket_categoria AS ENUM ('DUVIDA_APP', 'PAUTA', 'MISSAO', 'MATERIAL', 'COORDENACAO', 'OUTROS');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_prioridade') THEN
        CREATE TYPE public.ticket_prioridade AS ENUM ('BAIXA', 'NORMAL', 'ALTA');
    END IF;
END$$;

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    criado_por uuid NOT NULL,
    titulo text NOT NULL,
    categoria public.ticket_categoria NOT NULL,
    cidade text,
    celula_id uuid REFERENCES public.cells(id),
    status public.ticket_status NOT NULL DEFAULT 'ABERTO',
    prioridade public.ticket_prioridade NOT NULL DEFAULT 'NORMAL',
    atribuido_para uuid,
    criado_em timestamp with time zone NOT NULL DEFAULT now(),
    atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ticket messages table
CREATE TABLE IF NOT EXISTS public.ticket_mensagens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    autor_id uuid NOT NULL,
    texto text NOT NULL,
    criado_em timestamp with time zone NOT NULL DEFAULT now(),
    visivel_para_voluntario boolean NOT NULL DEFAULT true
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    tipo text NOT NULL,
    titulo text NOT NULL,
    corpo text NOT NULL,
    href text NOT NULL,
    lida boolean NOT NULL DEFAULT false,
    criado_em timestamp with time zone NOT NULL DEFAULT now(),
    meta jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Approved users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Coordinators can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.ticket_mensagens;
DROP POLICY IF EXISTS "Users can create ticket messages" ON public.ticket_mensagens;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notificacoes;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notificacoes;

-- Tickets policies
CREATE POLICY "Users can view own tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (criado_por = auth.uid() OR can_view_ticket(auth.uid(), criado_por, cidade, celula_id));

CREATE POLICY "Approved users can create tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
    criado_por = auth.uid() 
    AND is_approved_volunteer(auth.uid())
);

CREATE POLICY "Coordinators can update tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (is_coordinator(auth.uid()) AND can_view_ticket(auth.uid(), criado_por, cidade, celula_id))
WITH CHECK (is_coordinator(auth.uid()));

-- Ticket messages policies
CREATE POLICY "Users can view ticket messages"
ON public.ticket_mensagens
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.tickets t 
        WHERE t.id = ticket_id 
        AND (t.criado_por = auth.uid() OR can_view_ticket(auth.uid(), t.criado_por, t.cidade, t.celula_id))
    )
    AND (visivel_para_voluntario = true OR is_coordinator(auth.uid()))
);

CREATE POLICY "Users can create ticket messages"
ON public.ticket_mensagens
FOR INSERT
TO authenticated
WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.tickets t 
        WHERE t.id = ticket_id 
        AND (t.criado_por = auth.uid() OR can_view_ticket(auth.uid(), t.criado_por, t.cidade, t.celula_id))
        AND t.status NOT IN ('RESOLVIDO', 'ARQUIVADO')
    )
);

-- Notifications policies
CREATE POLICY "Users can view own notifications"
ON public.notificacoes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notificacoes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tickets_criado_por ON public.tickets (criado_por);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_cidade ON public.tickets (cidade);
CREATE INDEX IF NOT EXISTS idx_ticket_mensagens_ticket_id ON public.ticket_mensagens (ticket_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lida ON public.notificacoes (user_id, lida, criado_em DESC);

-- Rate limit functions
CREATE OR REPLACE FUNCTION public.check_ticket_rate_limit(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        SELECT COUNT(*) 
        FROM public.tickets 
        WHERE criado_por = _user_id 
        AND criado_em > now() - interval '24 hours'
    ) < 3;
$$;

CREATE OR REPLACE FUNCTION public.check_message_rate_limit(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        SELECT COUNT(*) 
        FROM public.ticket_mensagens 
        WHERE autor_id = _user_id 
        AND criado_em > now() - interval '1 hour'
    ) < 10;
$$;

-- Notification functions
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::integer
    FROM public.notificacoes
    WHERE user_id = _user_id AND lida = false;
$$;

CREATE OR REPLACE FUNCTION public.mark_ticket_notifications_read(_user_id uuid, _ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.notificacoes
    SET lida = true
    WHERE user_id = _user_id
      AND lida = false
      AND meta->>'ticket_id' = _ticket_id::text;
END;
$$;

-- Update trigger for tickets
DROP TRIGGER IF EXISTS update_tickets_updated_at ON public.tickets;
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Audit log functions
CREATE OR REPLACE FUNCTION public.log_ticket_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
        VALUES (auth.uid(), 'ticket.create', 'tickets', NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
            VALUES (auth.uid(), 'ticket.status_update', 'tickets', NEW.id, 
                jsonb_build_object('status', OLD.status), 
                jsonb_build_object('status', NEW.status));
        END IF;
        IF OLD.atribuido_para IS DISTINCT FROM NEW.atribuido_para THEN
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
            VALUES (auth.uid(), 'ticket.assign', 'tickets', NEW.id, 
                jsonb_build_object('atribuido_para', NEW.atribuido_para));
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_ticket_action ON public.tickets;
CREATE TRIGGER trigger_log_ticket_action
AFTER INSERT OR UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_action();

CREATE OR REPLACE FUNCTION public.log_ticket_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
    VALUES (auth.uid(), 'ticket.reply', 'ticket_mensagens', NEW.id, 
        jsonb_build_object('ticket_id', NEW.ticket_id, 'visivel_para_voluntario', NEW.visivel_para_voluntario));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_log_ticket_message ON public.ticket_mensagens;
CREATE TRIGGER trigger_log_ticket_message
AFTER INSERT ON public.ticket_mensagens
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_message();

-- Notification triggers
CREATE OR REPLACE FUNCTION public.notify_on_ticket_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _ticket RECORD;
    _author_name text;
    _is_author_coordinator boolean;
    _target_user_id uuid;
BEGIN
    SELECT t.*, p.full_name as criador_nome
    INTO _ticket
    FROM public.tickets t
    LEFT JOIN public.profiles p ON p.id = t.criado_por
    WHERE t.id = NEW.ticket_id;

    SELECT full_name INTO _author_name
    FROM public.profiles
    WHERE id = NEW.autor_id;

    _is_author_coordinator := is_coordinator(NEW.autor_id);

    IF _is_author_coordinator THEN
        _target_user_id := _ticket.criado_por;
    ELSE
        IF _ticket.atribuido_para IS NOT NULL THEN
            _target_user_id := _ticket.atribuido_para;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    IF _target_user_id = NEW.autor_id THEN
        RETURN NEW;
    END IF;

    IF NOT NEW.visivel_para_voluntario AND NOT is_coordinator(_target_user_id) THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, href, meta)
    VALUES (
        _target_user_id,
        'ticket_reply',
        'Nova resposta: ' || LEFT(_ticket.titulo, 50),
        COALESCE(_author_name, 'Alguém') || ' respondeu ao seu ticket',
        CASE 
            WHEN is_coordinator(_target_user_id) THEN '/admin/inbox/' || _ticket.id
            ELSE '/voluntario/inbox/' || _ticket.id
        END,
        jsonb_build_object(
            'ticket_id', _ticket.id,
            'autor_id', NEW.autor_id,
            'mensagem_id', NEW.id
        )
    );

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _status_label text;
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    _status_label := CASE NEW.status::text
        WHEN 'ABERTO' THEN 'Aberto'
        WHEN 'EM_ANDAMENTO' THEN 'Em Andamento'
        WHEN 'RESOLVIDO' THEN 'Resolvido'
        WHEN 'ARQUIVADO' THEN 'Arquivado'
        ELSE NEW.status::text
    END;

    INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, href, meta)
    VALUES (
        NEW.criado_por,
        'ticket_status',
        'Status atualizado: ' || LEFT(NEW.titulo, 40),
        'Seu ticket foi marcado como: ' || _status_label,
        '/voluntario/inbox/' || NEW.id,
        jsonb_build_object(
            'ticket_id', NEW.id,
            'old_status', OLD.status::text,
            'new_status', NEW.status::text
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_ticket_message ON public.ticket_mensagens;
CREATE TRIGGER trigger_notify_on_ticket_message
AFTER INSERT ON public.ticket_mensagens
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_ticket_message();

DROP TRIGGER IF EXISTS trigger_notify_on_ticket_status_change ON public.tickets;
CREATE TRIGGER trigger_notify_on_ticket_status_change
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_ticket_status_change();