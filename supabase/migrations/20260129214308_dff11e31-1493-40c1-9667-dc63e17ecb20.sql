-- Create RPC to import mission packs from the factory
CREATE OR REPLACE FUNCTION public.import_mission_pack(
  _pack_json jsonb,
  _actor_user_id uuid,
  _mode text DEFAULT 'draft'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pack_meta jsonb;
  _defaults jsonb;
  _missions jsonb;
  _mission jsonb;
  _idx int := 0;
  _created jsonb := '[]'::jsonb;
  _errors jsonb := '[]'::jsonb;
  _new_id uuid;
  _mission_type mission_type;
  _mission_status mission_status;
  _assigned_to text;
  _pack_id text;
  _pack_title text;
BEGIN
  -- Validate input
  IF _pack_json IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pack_json is required');
  END IF;

  -- Extract pack metadata and missions array
  _pack_meta := COALESCE(_pack_json->'pack', '{}'::jsonb);
  _defaults := COALESCE(_pack_meta->'defaults', '{}'::jsonb);
  _missions := _pack_json->'missions';
  _pack_id := COALESCE(_pack_meta->>'id', 'pack_' || extract(epoch from now())::text);
  _pack_title := COALESCE(_pack_meta->>'title', 'Imported Pack');

  IF _missions IS NULL OR jsonb_array_length(_missions) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missions array is required and must not be empty');
  END IF;

  -- Process each mission
  FOR _mission IN SELECT * FROM jsonb_array_elements(_missions)
  LOOP
    BEGIN
      -- Validate required fields
      IF _mission->>'type' IS NULL OR _mission->>'title' IS NULL THEN
        _errors := _errors || jsonb_build_object(
          'index', _idx,
          'reason', 'type and title are required'
        );
        _idx := _idx + 1;
        CONTINUE;
      END IF;

      -- Determine mission type (validate against enum)
      BEGIN
        _mission_type := (_mission->>'type')::mission_type;
      EXCEPTION WHEN invalid_text_representation THEN
        _errors := _errors || jsonb_build_object(
          'index', _idx,
          'reason', 'invalid mission type: ' || _mission->>'type'
        );
        _idx := _idx + 1;
        CONTINUE;
      END;

      -- Determine status based on mode
      IF _mode = 'publish' THEN
        _mission_status := 'publicada'::mission_status;
      ELSE
        -- Use item status or default to rascunho
        BEGIN
          IF _mission->>'status' IS NOT NULL THEN
            _mission_status := (_mission->>'status')::mission_status;
          ELSE
            _mission_status := 'rascunho'::mission_status;
          END IF;
        EXCEPTION WHEN invalid_text_representation THEN
          _mission_status := 'rascunho'::mission_status;
        END;
      END IF;

      -- Get assigned_to (default to 'all')
      _assigned_to := COALESCE(
        _mission->>'assigned_to',
        _defaults->>'assigned_to',
        'all'
      );

      -- Generate new ID
      _new_id := gen_random_uuid();

      -- Insert mission
      INSERT INTO missions (
        id,
        type,
        title,
        description,
        instructions,
        status,
        created_by,
        ciclo_id,
        points,
        requires_validation,
        meta_json
      ) VALUES (
        _new_id,
        _mission_type,
        _mission->>'title',
        COALESCE(_mission->>'description', _defaults->>'description'),
        COALESCE(_mission->>'instructions', _defaults->>'instructions'),
        _mission_status,
        _actor_user_id,
        CASE 
          WHEN _mission->>'ciclo_id' IS NOT NULL THEN (_mission->>'ciclo_id')::uuid
          WHEN _defaults->>'ciclo_id' IS NOT NULL THEN (_defaults->>'ciclo_id')::uuid
          ELSE NULL
        END,
        COALESCE(
          (_mission->>'points')::int,
          (_defaults->>'points')::int,
          10
        ),
        COALESCE(
          (_mission->>'requires_validation')::boolean,
          (_defaults->>'requires_validation')::boolean,
          true
        ),
        jsonb_build_object(
          'title', _mission->>'title',
          'description', _mission->>'description',
          'tags', COALESCE(_mission->'tags', _defaults->'tags', '[]'::jsonb),
          'estimated_min', COALESCE(
            (_mission->>'estimated_min')::int,
            (_defaults->>'estimated_min')::int,
            15
          ),
          'assigned_to', _assigned_to,
          '_factory', jsonb_build_object(
            'packId', _pack_id,
            'packTitle', _pack_title,
            'importedBy', _actor_user_id,
            'importedAt', now(),
            'mode', _mode
          )
        ) || COALESCE(_mission->'meta', '{}'::jsonb)
      );

      -- Add to created list
      _created := _created || jsonb_build_object(
        'id', _new_id,
        'type', _mission_type,
        'title', _mission->>'title'
      );

    EXCEPTION WHEN OTHERS THEN
      _errors := _errors || jsonb_build_object(
        'index', _idx,
        'reason', SQLERRM
      );
    END;

    _idx := _idx + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'created', _created,
    'errors', _errors,
    'total_processed', _idx,
    'total_created', jsonb_array_length(_created),
    'total_errors', jsonb_array_length(_errors)
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.import_mission_pack(jsonb, uuid, text) TO authenticated;