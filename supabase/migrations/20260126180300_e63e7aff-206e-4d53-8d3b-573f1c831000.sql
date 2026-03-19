
-- Add privacy and snapshot columns to formacao_certificates
ALTER TABLE public.formacao_certificates
ADD COLUMN IF NOT EXISTS public_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS public_visibility text NOT NULL DEFAULT 'full',
ADD COLUMN IF NOT EXISTS revoked_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS revoked_reason text NULL,
ADD COLUMN IF NOT EXISTS name_snapshot text NULL,
ADD COLUMN IF NOT EXISTS course_title_snapshot text NULL,
ADD COLUMN IF NOT EXISTS og_image_url text NULL;

-- Add check constraint for visibility
ALTER TABLE public.formacao_certificates
ADD CONSTRAINT formacao_certificates_visibility_check 
CHECK (public_visibility IN ('full', 'initials', 'anon'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_formacao_certificates_code ON public.formacao_certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_formacao_certificates_public ON public.formacao_certificates(public_enabled);

-- RPC: Public certificate verification (anon-safe)
CREATE OR REPLACE FUNCTION public.get_certificate_public(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cert record;
  _display_name text;
  _name_parts text[];
  _initials text;
BEGIN
  -- Validate code
  IF _code IS NULL OR length(trim(_code)) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'status', 'not_found');
  END IF;

  -- Find certificate
  SELECT 
    fc.id,
    fc.issued_at,
    fc.certificate_code,
    fc.public_enabled,
    fc.public_visibility,
    fc.revoked_at,
    fc.name_snapshot,
    fc.course_title_snapshot,
    fc.og_image_url,
    cf.titulo as course_title,
    cf.nivel as course_level,
    p.nome as profile_name
  INTO _cert
  FROM public.formacao_certificates fc
  JOIN public.cursos_formacao cf ON cf.id = fc.curso_id
  LEFT JOIN public.profiles p ON p.id = fc.user_id
  WHERE lower(fc.certificate_code) = lower(trim(_code))
  LIMIT 1;

  -- Not found
  IF _cert IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'not_found');
  END IF;

  -- Revoked
  IF _cert.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'revoked',
      'course_title', COALESCE(_cert.course_title_snapshot, _cert.course_title),
      'issued_at', _cert.issued_at,
      'display_name', null
    );
  END IF;

  -- Private
  IF _cert.public_enabled = false THEN
    RETURN jsonb_build_object('ok', true, 'status', 'private');
  END IF;

  -- Build display name based on visibility
  IF _cert.public_visibility = 'full' THEN
    _display_name := COALESCE(_cert.name_snapshot, _cert.profile_name, 'Voluntário #ÉLUTA');
  ELSIF _cert.public_visibility = 'initials' THEN
    -- Generate initials from name
    _name_parts := string_to_array(COALESCE(_cert.name_snapshot, _cert.profile_name, ''), ' ');
    IF array_length(_name_parts, 1) >= 2 THEN
      _initials := upper(left(_name_parts[1], 1)) || '. ' || upper(left(_name_parts[array_length(_name_parts, 1)], 1)) || '.';
    ELSIF array_length(_name_parts, 1) = 1 THEN
      _initials := upper(left(_name_parts[1], 1)) || '.';
    ELSE
      _initials := 'V.';
    END IF;
    _display_name := _initials;
  ELSE
    _display_name := 'Voluntário #ÉLUTA';
  END IF;

  -- Valid certificate
  RETURN jsonb_build_object(
    'ok', true,
    'status', 'valid',
    'course_title', COALESCE(_cert.course_title_snapshot, _cert.course_title),
    'course_level', _cert.course_level,
    'issued_at', _cert.issued_at,
    'display_name', _display_name,
    'og_image_url', _cert.og_image_url
  );
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_certificate_public(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_certificate_public(text) TO authenticated;

-- RPC: Set certificate privacy (owner only)
CREATE OR REPLACE FUNCTION public.set_certificate_privacy(
  _certificate_id uuid,
  _public_enabled boolean,
  _visibility text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate visibility
  IF _visibility NOT IN ('full', 'initials', 'anon') THEN
    RAISE EXCEPTION 'Invalid visibility value';
  END IF;

  -- Update only if owner
  UPDATE public.formacao_certificates
  SET 
    public_enabled = _public_enabled,
    public_visibility = _visibility
  WHERE id = _certificate_id
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- Grant execute to authenticated only
GRANT EXECUTE ON FUNCTION public.set_certificate_privacy(uuid, boolean, text) TO authenticated;
