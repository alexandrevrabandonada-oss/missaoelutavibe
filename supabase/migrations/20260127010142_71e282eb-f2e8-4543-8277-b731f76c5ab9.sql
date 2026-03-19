-- Privacy Pack v0: CRM WhatsApp masking and soft delete

-- Add new columns for privacy
ALTER TABLE public.crm_contatos 
ADD COLUMN IF NOT EXISTS whatsapp_last4 text,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_crm_contatos_deleted_at ON public.crm_contatos(deleted_at) WHERE deleted_at IS NULL;

-- Function to extract last 4 digits and update whatsapp_last4
CREATE OR REPLACE FUNCTION public.update_whatsapp_last4()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.whatsapp_norm IS NOT NULL AND length(NEW.whatsapp_norm) >= 4 THEN
    NEW.whatsapp_last4 := right(NEW.whatsapp_norm, 4);
  ELSE
    NEW.whatsapp_last4 := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-populate whatsapp_last4
DROP TRIGGER IF EXISTS trg_crm_contatos_whatsapp_last4 ON public.crm_contatos;
CREATE TRIGGER trg_crm_contatos_whatsapp_last4
  BEFORE INSERT OR UPDATE OF whatsapp, whatsapp_norm ON public.crm_contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_whatsapp_last4();

-- Backfill existing contacts
UPDATE public.crm_contatos 
SET whatsapp_last4 = right(whatsapp_norm, 4)
WHERE whatsapp_norm IS NOT NULL AND length(whatsapp_norm) >= 4;

-- RPC: Get full WhatsApp number with scope validation
CREATE OR REPLACE FUNCTION public.get_contact_whatsapp(p_contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_contact record;
  v_can_access boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_contact FROM crm_contatos WHERE id = p_contact_id AND deleted_at IS NULL;
  
  IF v_contact IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  -- Check access: owner or assignee
  IF v_contact.criado_por = v_user_id OR v_contact.assignee_id = v_user_id THEN
    v_can_access := true;
  ELSE
    -- Check if user is coordinator with matching scope
    SELECT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = v_user_id 
        AND ur.role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
        AND ur.revoked_at IS NULL
        AND (
          ur.role = 'admin'
          OR ur.cidade = v_contact.cidade
          OR ur.cell_id::text = v_contact.escopo_id
        )
    ) INTO v_can_access;
  END IF;

  IF NOT v_can_access THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  INSERT INTO growth_events (user_id, event_type, event_data)
  VALUES (v_user_id, 'crm_whatsapp_reveal', jsonb_build_object(
    'contact_id', p_contact_id,
    'cidade', v_contact.cidade
  ));

  RETURN jsonb_build_object(
    'ok', true,
    'whatsapp', v_contact.whatsapp,
    'whatsapp_norm', v_contact.whatsapp_norm
  );
END;
$$;

-- RPC: Soft delete my own contact
CREATE OR REPLACE FUNCTION public.delete_my_contact(p_contact_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_contact record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_contact FROM crm_contatos 
  WHERE id = p_contact_id AND deleted_at IS NULL;
  
  IF v_contact IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_contact.criado_por != v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  UPDATE crm_contatos 
  SET deleted_at = now(),
      whatsapp = NULL,
      whatsapp_norm = NULL,
      telefone = NULL,
      email = NULL
  WHERE id = p_contact_id;

  INSERT INTO growth_events (user_id, event_type, event_data)
  VALUES (v_user_id, 'crm_contact_deleted', jsonb_build_object(
    'contact_id', p_contact_id,
    'cidade', v_contact.cidade
  ));

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: Purge all my contacts (LGPD compliance)
CREATE OR REPLACE FUNCTION public.purge_my_contacts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT count(*) INTO v_count FROM crm_contatos 
  WHERE criado_por = v_user_id AND deleted_at IS NULL;

  UPDATE crm_contatos 
  SET deleted_at = now(),
      whatsapp = NULL,
      whatsapp_norm = NULL,
      telefone = NULL,
      email = NULL
  WHERE criado_por = v_user_id AND deleted_at IS NULL;

  INSERT INTO growth_events (user_id, event_type, event_data)
  VALUES (v_user_id, 'crm_contacts_purged', jsonb_build_object('count', v_count));

  RETURN jsonb_build_object('ok', true, 'purged_count', v_count);
END;
$$;

-- Update RLS policies to filter deleted_at IS NULL
DROP POLICY IF EXISTS "Users can view contacts they created" ON public.crm_contatos;
CREATE POLICY "Users can view contacts they created" 
ON public.crm_contatos FOR SELECT
USING (criado_por = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view contacts assigned to them" ON public.crm_contatos;
CREATE POLICY "Users can view contacts assigned to them" 
ON public.crm_contatos FOR SELECT
USING (assignee_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Coordinators can view scoped contacts" ON public.crm_contatos;
CREATE POLICY "Coordinators can view scoped contacts" 
ON public.crm_contatos FOR SELECT
USING (
  deleted_at IS NULL 
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('coordenador_celula', 'coordenador_regional', 'coordenador_estadual', 'admin')
      AND ur.revoked_at IS NULL
      AND (
        ur.role = 'admin'
        OR ur.cidade = cidade
        OR ur.cell_id::text = escopo_id
      )
  )
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_contact_whatsapp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_my_contacts() TO authenticated;