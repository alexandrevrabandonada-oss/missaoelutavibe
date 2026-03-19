
-- RPC: ensure_volunteer_profile
-- Called after login/signup to guarantee a profiles row exists.
-- If missing, inserts with volunteer_status='pendente'.
-- Optionally stores preferred_city_id and preferred_cell_id.
-- Returns the volunteer_status so the frontend can redirect accordingly.

CREATE OR REPLACE FUNCTION public.ensure_volunteer_profile(
  p_full_name text DEFAULT NULL,
  p_city_id uuid DEFAULT NULL,
  p_preferred_cell_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_uid uuid := auth.uid();
  v_raw_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if profile already exists
  SELECT volunteer_status INTO v_status
  FROM profiles
  WHERE id = v_uid;

  IF FOUND THEN
    -- Profile exists; optionally update preferred fields if provided and not yet set
    UPDATE profiles
    SET
      city_id = COALESCE(profiles.city_id, p_city_id),
      preferred_cell_id = COALESCE(profiles.preferred_cell_id, p_preferred_cell_id),
      updated_at = now()
    WHERE id = v_uid
      AND (
        (p_city_id IS NOT NULL AND profiles.city_id IS NULL)
        OR (p_preferred_cell_id IS NOT NULL AND profiles.preferred_cell_id IS NULL)
      );

    RETURN v_status;
  END IF;

  -- Profile does not exist — create it
  -- Try to get full_name from auth.users raw_user_meta_data
  SELECT raw_user_meta_data->>'full_name'
  INTO v_raw_name
  FROM auth.users
  WHERE id = v_uid;

  INSERT INTO profiles (
    id,
    full_name,
    volunteer_status,
    city_id,
    preferred_cell_id,
    onboarding_status,
    onboarding_complete,
    needs_cell_assignment,
    created_at,
    updated_at
  ) VALUES (
    v_uid,
    COALESCE(p_full_name, v_raw_name),
    'pendente',
    p_city_id,
    p_preferred_cell_id,
    'pendente',
    false,
    false,
    now(),
    now()
  );

  RETURN 'pendente';
END;
$$;
