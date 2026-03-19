
-- CRM de Apoiadores v0
-- Tabela de contatos com LGPD obrigatório

-- Enum para status do contato
CREATE TYPE public.crm_contato_status AS ENUM ('novo', 'contatar', 'em_conversa', 'confirmado', 'inativo');

-- Enum para origem do contato
CREATE TYPE public.crm_origem_canal AS ENUM ('whatsapp', 'instagram', 'rua', 'evento', 'indicacao', 'outro');

-- Enum para tipo de interação
CREATE TYPE public.crm_interacao_tipo AS ENUM ('ligacao', 'whatsapp', 'encontro', 'evento', 'outro');

-- Tabela principal de contatos
CREATE TABLE public.crm_contatos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    escopo_tipo TEXT NOT NULL CHECK (escopo_tipo IN ('celula', 'cidade')),
    escopo_id TEXT NOT NULL, -- cell_id (uuid as text) or city name
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    cidade TEXT NOT NULL,
    bairro TEXT,
    status public.crm_contato_status NOT NULL DEFAULT 'novo',
    tags TEXT[] DEFAULT '{}',
    origem_canal public.crm_origem_canal NOT NULL DEFAULT 'outro',
    origem_ref TEXT,
    consentimento_lgpd BOOLEAN NOT NULL DEFAULT false,
    observacao TEXT,
    proxima_acao_em TIMESTAMPTZ,
    criado_por UUID NOT NULL,
    atribuido_a UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de interações/histórico
CREATE TABLE public.crm_interacoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contato_id UUID NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
    autor_user_id UUID NOT NULL,
    tipo public.crm_interacao_tipo NOT NULL DEFAULT 'outro',
    nota TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_crm_contatos_escopo ON public.crm_contatos(escopo_tipo, escopo_id, status);
CREATE INDEX idx_crm_contatos_proxima_acao ON public.crm_contatos(proxima_acao_em) WHERE proxima_acao_em IS NOT NULL;
CREATE INDEX idx_crm_contatos_criado_por ON public.crm_contatos(criado_por);
CREATE INDEX idx_crm_contatos_atribuido_a ON public.crm_contatos(atribuido_a) WHERE atribuido_a IS NOT NULL;
CREATE INDEX idx_crm_interacoes_contato ON public.crm_interacoes(contato_id, created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER update_crm_contatos_updated_at
    BEFORE UPDATE ON public.crm_contatos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.crm_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interacoes ENABLE ROW LEVEL SECURITY;

-- Helper function: can view CRM contact based on scope
CREATE OR REPLACE FUNCTION public.can_view_crm_contato(
    _user_id UUID,
    _escopo_tipo TEXT,
    _escopo_id TEXT,
    _criado_por UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        -- Admin/Coord Estadual can see all
        is_admin(_user_id) OR has_role(_user_id, 'coordenador_estadual')
        -- Creator can always see their own
        OR _criado_por = _user_id
        -- Coordinator/Moderator can see within their scope
        OR (
            _escopo_tipo = 'cidade' AND can_manage_cidade(_user_id, _escopo_id)
        )
        OR (
            _escopo_tipo = 'celula' AND can_moderate_cell(_escopo_id::uuid, _user_id)
        )
$$;

-- Helper function: can manage CRM contact (edit/delete)
CREATE OR REPLACE FUNCTION public.can_manage_crm_contato(
    _user_id UUID,
    _escopo_tipo TEXT,
    _escopo_id TEXT,
    _criado_por UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        -- Admin/Coord Estadual can manage all
        is_admin(_user_id) OR has_role(_user_id, 'coordenador_estadual')
        -- Creator can manage their own
        OR _criado_por = _user_id
        -- Coordinator can manage within their scope
        OR (
            _escopo_tipo = 'cidade' AND can_manage_cidade(_user_id, _escopo_id)
        )
        OR (
            _escopo_tipo = 'celula' AND can_moderate_cell(_escopo_id::uuid, _user_id)
        )
$$;

-- RLS Policies for crm_contatos

-- SELECT: users can see contacts they created or within their managed scope
CREATE POLICY "Users can view CRM contacts in scope"
ON public.crm_contatos FOR SELECT
USING (
    can_view_crm_contato(auth.uid(), escopo_tipo, escopo_id, criado_por)
);

-- INSERT: approved volunteers can create contacts with LGPD consent
CREATE POLICY "Approved volunteers can create CRM contacts with LGPD"
ON public.crm_contatos FOR INSERT
WITH CHECK (
    -- Must be approved volunteer
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND volunteer_status = 'aprovado'
    )
    -- LGPD consent is mandatory
    AND consentimento_lgpd = true
    -- Must be creator
    AND criado_por = auth.uid()
);

-- UPDATE: can update if can manage and LGPD remains true
CREATE POLICY "Users can update CRM contacts they manage"
ON public.crm_contatos FOR UPDATE
USING (
    can_manage_crm_contato(auth.uid(), escopo_tipo, escopo_id, criado_por)
)
WITH CHECK (
    consentimento_lgpd = true
);

-- DELETE: only coordinators can delete
CREATE POLICY "Coordinators can delete CRM contacts"
ON public.crm_contatos FOR DELETE
USING (
    is_coordinator(auth.uid()) AND can_manage_crm_contato(auth.uid(), escopo_tipo, escopo_id, criado_por)
);

-- RLS Policies for crm_interacoes

-- SELECT: can view interactions of contacts user can view
CREATE POLICY "Users can view interactions of accessible contacts"
ON public.crm_interacoes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.crm_contatos c
        WHERE c.id = contato_id
        AND can_view_crm_contato(auth.uid(), c.escopo_tipo, c.escopo_id, c.criado_por)
    )
);

-- INSERT: can add interactions to accessible contacts
CREATE POLICY "Users can add interactions to accessible contacts"
ON public.crm_interacoes FOR INSERT
WITH CHECK (
    autor_user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.crm_contatos c
        WHERE c.id = contato_id
        AND can_view_crm_contato(auth.uid(), c.escopo_tipo, c.escopo_id, c.criado_por)
    )
);

-- Notification function for follow-up reminders
CREATE OR REPLACE FUNCTION public.notify_crm_followup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _target_user_id UUID;
BEGIN
    -- Only trigger when proxima_acao_em is set or changed
    IF NEW.proxima_acao_em IS NOT NULL AND (
        OLD.proxima_acao_em IS NULL OR 
        OLD.proxima_acao_em IS DISTINCT FROM NEW.proxima_acao_em
    ) THEN
        -- Notify assigned user or creator
        _target_user_id := COALESCE(NEW.atribuido_a, NEW.criado_por);
        
        -- Create notification if follow-up is within 24 hours
        IF NEW.proxima_acao_em <= (now() + interval '24 hours') THEN
            INSERT INTO public.notificacoes (user_id, tipo, titulo, corpo, href, meta)
            VALUES (
                _target_user_id,
                'crm_followup',
                'Follow-up: ' || LEFT(NEW.nome, 40),
                'Lembrete de contato agendado para ' || to_char(NEW.proxima_acao_em, 'DD/MM às HH24:MI'),
                '/admin/crm?contato=' || NEW.id,
                jsonb_build_object('contato_id', NEW.id, 'nome', NEW.nome)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger for follow-up notifications
CREATE TRIGGER crm_contato_followup_notify
    AFTER INSERT OR UPDATE ON public.crm_contatos
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_crm_followup();

-- Audit logging for CRM actions
CREATE OR REPLACE FUNCTION public.audit_crm_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_data)
        VALUES (
            auth.uid(),
            'crm_contato_created',
            'crm_contatos',
            NEW.id,
            jsonb_build_object(
                'nome', NEW.nome,
                'status', NEW.status::text,
                'escopo_tipo', NEW.escopo_tipo,
                'escopo_id', NEW.escopo_id
            )
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
            VALUES (
                auth.uid(),
                'crm_contato_status_changed',
                'crm_contatos',
                NEW.id,
                jsonb_build_object('status', OLD.status::text),
                jsonb_build_object('status', NEW.status::text)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_crm_contato_changes
    AFTER INSERT OR UPDATE ON public.crm_contatos
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_crm_action();
