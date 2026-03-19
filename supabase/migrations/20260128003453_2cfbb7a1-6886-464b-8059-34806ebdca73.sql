-- Drop the existing function to change return type
DROP FUNCTION IF EXISTS public.get_coordinator_at_risk_volunteers(text, text, uuid, int);

-- Recreate with jsonb return type using last_action_at
CREATE OR REPLACE FUNCTION public.get_coordinator_at_risk_volunteers(
  _scope_type text DEFAULT 'cidade',
  _scope_cidade text DEFAULT NULL,
  _scope_cell_id uuid DEFAULT NULL,
  _limit int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(row_to_json(r))
  INTO v_result
  FROM (
    SELECT 
      p.id,
      p.full_name,
      p.city,
      p.whatsapp,
      p.last_action_at,
      p.last_action_kind,
      EXTRACT(EPOCH FROM (now() - p.last_action_at)) / 3600 AS hours_since_last_action
    FROM profiles p
    WHERE 
      -- Has completed at least one action
      p.last_action_at IS NOT NULL
      -- Inactive for 48+ hours
      AND p.last_action_at < now() - interval '48 hours'
      -- Scope filter
      AND (
        _scope_type = 'all'
        OR (_scope_type = 'cidade' AND p.city = _scope_cidade)
        OR (_scope_type = 'celula' AND EXISTS (
          SELECT 1 FROM cell_memberships cm 
          WHERE cm.user_id = p.id 
          AND cm.cell_id = _scope_cell_id 
          AND cm.status = 'ativo'
        ))
      )
      -- Not admin
      AND NOT EXISTS (SELECT 1 FROM admins a WHERE a.user_id = p.id)
    ORDER BY p.last_action_at ASC
    LIMIT _limit
  ) r;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_coordinator_at_risk_volunteers(text, text, uuid, int) TO authenticated;

-- Add a helper function for return reminder message
CREATE OR REPLACE FUNCTION public.get_return_reminder_message(_first_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT format(
    'Oi %s! 👋 Tudo bem? Sem pressão, mas queria lembrar que tem algumas ações esperando por você. Que tal fazer só 30 segundos hoje? Qualquer coisa, me chama!',
    _first_name
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_return_reminder_message(text) TO authenticated;