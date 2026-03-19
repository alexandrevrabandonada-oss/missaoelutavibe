-- Atualizar constraint de event_type para incluir eventos de certificado e missão pós-curso
ALTER TABLE public.growth_events DROP CONSTRAINT IF EXISTS growth_events_event_type_check;

ALTER TABLE public.growth_events ADD CONSTRAINT growth_events_event_type_check CHECK (
  event_type = ANY (ARRAY[
    'visit'::text, 
    'visit_comecar'::text, 
    'signup'::text, 
    'approved'::text, 
    'onboarding_complete'::text, 
    'invite_shared'::text, 
    'invite_submit_mini'::text, 
    'territory_link_open'::text, 
    'template_share'::text, 
    'first_action'::text, 
    'followup_whatsapp_opened'::text, 
    'coordinator_inbox_viewed'::text, 
    'coordinator_whatsapp_opened'::text, 
    'coordinator_followup_assigned'::text,
    -- Novos eventos de certificado
    'certificate_viewed'::text,
    'certificate_shared'::text,
    'post_course_mission_started'::text,
    'post_course_mission_completed'::text
  ])
);

-- Criar nova tabela de certificados para cursos_formacao (o sistema atual)
-- A tabela antiga 'certificates' referencia 'courses' que é um sistema legado
CREATE TABLE IF NOT EXISTS public.formacao_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    curso_id UUID NOT NULL REFERENCES public.cursos_formacao(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    certificate_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
    -- Evita duplicatas de certificado por curso/usuário
    UNIQUE(user_id, curso_id)
);

-- RLS para certificados
ALTER TABLE public.formacao_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their certificates"
    ON public.formacao_certificates FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can earn certificates"
    ON public.formacao_certificates FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Permitir leitura pública por código (para verificação)
CREATE POLICY "Anyone can verify certificate by code"
    ON public.formacao_certificates FOR SELECT
    TO anon, authenticated
    USING (true);