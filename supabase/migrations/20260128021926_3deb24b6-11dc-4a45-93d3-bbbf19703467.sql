-- Add objections and next_steps to roteiros_conversa for Playbook de Conversa v0
-- objections: array of common objections with reply texts
-- next_steps: array of recommended next actions

ALTER TABLE public.roteiros_conversa
ADD COLUMN IF NOT EXISTS objections jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS next_steps jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.roteiros_conversa.objections IS 'JSONB array: [{key, label, reply_text}] - common objections and how to handle them';
COMMENT ON COLUMN public.roteiros_conversa.next_steps IS 'JSONB array: [{key, label, action}] - recommended next actions after conversation (action: whatsapp, schedule_followup, invite_plus1, save_contact, open_today)';