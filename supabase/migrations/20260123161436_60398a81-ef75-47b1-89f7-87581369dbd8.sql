-- ========================================
-- CRM Conversation Missions v0 - Full Implementation
-- ========================================

-- A) crm_mission_links: Links missions to CRM contacts (1:1)
CREATE TABLE public.crm_mission_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id UUID NOT NULL UNIQUE REFERENCES public.missions(id) ON DELETE CASCADE,
    contato_id UUID NOT NULL REFERENCES public.crm_contatos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_mission_links_contato ON public.crm_mission_links(contato_id);

-- B) crm_settings: User preferences for CRM missions
CREATE TABLE public.crm_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    crm_missions_opt_in BOOLEAN NOT NULL DEFAULT true,
    crm_missions_daily_limit INT NOT NULL DEFAULT 1 CHECK (crm_missions_daily_limit BETWEEN 1 AND 3),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at on crm_settings
CREATE TRIGGER update_crm_settings_updated_at
    BEFORE UPDATE ON public.crm_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- C) Add 'conversa' to mission_type enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'public.mission_type'::regtype 
        AND enumlabel = 'conversa'
    ) THEN
        ALTER TYPE public.mission_type ADD VALUE 'conversa';
    END IF;
END$$;

-- D) Add privacy/meta fields to missions table (non-destructive)
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS privado BOOLEAN DEFAULT false;
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS meta_json JSONB;

-- ========================================
-- RLS Policies
-- ========================================

-- Enable RLS
ALTER TABLE public.crm_mission_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

-- crm_mission_links: only accessible via mission or contact access
CREATE POLICY "Users can view their own mission links"
ON public.crm_mission_links FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.missions m 
        WHERE m.id = mission_id AND m.assigned_to = auth.uid()
    )
    OR is_coordinator(auth.uid())
);

CREATE POLICY "Users can insert their own mission links"
ON public.crm_mission_links FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.missions m 
        WHERE m.id = mission_id AND m.assigned_to = auth.uid()
    )
    OR is_coordinator(auth.uid())
);

CREATE POLICY "Only coordinators can delete mission links"
ON public.crm_mission_links FOR DELETE
USING (is_coordinator(auth.uid()));

-- crm_settings: users manage their own settings
CREATE POLICY "Users can view their own CRM settings"
ON public.crm_settings FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own CRM settings"
ON public.crm_settings FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own CRM settings"
ON public.crm_settings FOR UPDATE
USING (user_id = auth.uid());

-- ========================================
-- Audit trigger for CRM missions
-- ========================================
CREATE OR REPLACE FUNCTION public.audit_crm_mission_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, entity_type, entity_id, action, new_data)
        VALUES (
            auth.uid(),
            'crm_mission_link',
            NEW.id,
            'create',
            jsonb_build_object('mission_id', NEW.mission_id, 'contato_id', NEW.contato_id)
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_crm_mission_link
AFTER INSERT ON public.crm_mission_links
FOR EACH ROW
EXECUTE FUNCTION public.audit_crm_mission_link();