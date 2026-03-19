-- P4/P5: Add meta_json to cells for playbook storage
ALTER TABLE public.cells 
ADD COLUMN IF NOT EXISTS meta_json jsonb DEFAULT '{}'::jsonb;

-- Add default playbooks for Kit v0 cells when they exist
COMMENT ON COLUMN public.cells.meta_json IS 'Flexible metadata including playbook: {headline, whatWeDo, nextActions[], pinnedMaterials[]}';

-- RPC to update cell playbook (coord/admin only)
CREATE OR REPLACE FUNCTION public.update_cell_playbook(
  _cell_id uuid,
  _playbook jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permission check: must be admin or coord in scope
  IF NOT (public.is_admin(auth.uid()) OR public.is_coordinator(auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.cells
  SET meta_json = jsonb_set(COALESCE(meta_json, '{}'::jsonb), '{playbook}', _playbook),
      updated_at = now()
  WHERE id = _cell_id;

  RETURN FOUND;
END;
$$;