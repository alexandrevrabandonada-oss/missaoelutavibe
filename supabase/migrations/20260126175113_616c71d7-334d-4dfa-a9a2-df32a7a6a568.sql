
CREATE OR REPLACE FUNCTION public.trigger_growth_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_code text;
  _template_id uuid;
BEGIN
  -- Only when volunteer is approved
  IF NEW.volunteer_status = 'ativo'
     AND (OLD.volunteer_status IS NULL OR OLD.volunteer_status <> 'ativo') THEN

    -- best-effort: derive invite_code from profile foreign keys (if present)
    SELECT c.code INTO _invite_code
    FROM public.convites c
    WHERE NEW.origem_convite_id IS NOT NULL
      AND c.id = NEW.origem_convite_id
    LIMIT 1;

    -- best-effort: keep template attribution if any
    SELECT ge.template_id INTO _template_id
    FROM public.growth_events ge
    WHERE ge.user_id = NEW.id AND ge.template_id IS NOT NULL
    ORDER BY ge.occurred_at DESC
    LIMIT 1;

    -- Dedup: only one 'approved' per user
    IF NOT EXISTS (
      SELECT 1 FROM public.growth_events ge
      WHERE ge.user_id = NEW.id AND ge.event_type = 'approved'
      LIMIT 1
    ) THEN
      INSERT INTO public.growth_events (
        event_type,
        user_id,
        template_id,
        invite_code,
        referrer_user_id,
        scope_cidade,
        occurred_at
      ) VALUES (
        'approved',
        NEW.id,
        _template_id,
        _invite_code,
        NEW.referrer_user_id,
        NEW.city,
        now()
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block profile updates
  RETURN NEW;
END;
$$;
