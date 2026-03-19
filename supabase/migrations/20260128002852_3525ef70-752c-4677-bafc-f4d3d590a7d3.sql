-- Add last_action tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_action_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_action_kind text;

-- Create index for efficient at-risk queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_action_at ON public.profiles(last_action_at);

-- Create RPC to get reactivation status
CREATE OR REPLACE FUNCTION public.get_my_reactivation_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_action_at timestamp with time zone;
  v_last_action_kind text;
  v_hours_since int;
  v_is_at_risk boolean;
  v_suggested_kind text;
  v_suggested_cta text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Get last action info
  SELECT last_action_at, last_action_kind
  INTO v_last_action_at, v_last_action_kind
  FROM profiles
  WHERE id = v_user_id;

  -- Calculate hours since last action (timezone SP)
  IF v_last_action_at IS NULL THEN
    -- Never completed an action, consider at risk
    v_hours_since := 999;
    v_is_at_risk := true;
  ELSE
    v_hours_since := EXTRACT(EPOCH FROM (now() - v_last_action_at)) / 3600;
    v_is_at_risk := v_hours_since >= 48;
  END IF;

  -- Suggest micro action based on last action kind
  IF v_last_action_kind IN ('crm_followup', 'crm_contact') THEN
    -- They were doing CRM, suggest followup
    v_suggested_kind := 'followup';
    v_suggested_cta := 'Mandar 1 WhatsApp';
  ELSIF v_last_action_kind IN ('mission_rua', 'mission_conversa') THEN
    -- They were doing missions, suggest contact
    v_suggested_kind := 'contact';
    v_suggested_cta := 'Salvar 1 contato';
  ELSE
    -- Default: contact is easiest
    v_suggested_kind := 'contact';
    v_suggested_cta := 'Salvar 1 contato';
  END IF;

  RETURN jsonb_build_object(
    'is_at_risk', v_is_at_risk,
    'hours_since_last_action', v_hours_since,
    'suggested_micro_action_kind', v_suggested_kind,
    'suggested_micro_action_cta', v_suggested_cta,
    'reason', CASE WHEN v_is_at_risk THEN 'inactive_48h' ELSE null END
  );
END;
$$;

-- Create helper function to update last action (called by other RPCs)
CREATE OR REPLACE FUNCTION public.update_last_action(
  _kind text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE profiles
  SET 
    last_action_at = now(),
    last_action_kind = _kind
  WHERE id = v_user_id;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_my_reactivation_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_last_action(text) TO authenticated;