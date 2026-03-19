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
  v_pack jsonb;
  v_defaults jsonb;
  v_missions jsonb;
  v_item jsonb;
  v_result jsonb;
  v_created jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_mission_id uuid;
  v_status text;
  v_i int := 0;
  v_total_processed int := 0;
  v_total_created int := 0;
  v_total_errors int := 0;
  v_detail text;
  v_hint text;
  v_context text;
  v_sqlstate text;
  v_tags_normalized jsonb;
  v_tags_raw text;
BEGIN
  -- Extract pack metadata and missions
  v_pack := _pack_json->'pack';
  v_defaults := COALESCE(v_pack->'defaults', '{}'::jsonb);
  v_missions := _pack_json->'missions';
  
  IF v_missions IS NULL OR jsonb_array_length(v_missions) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'created', '[]'::jsonb,
      'errors', jsonb_build_array(jsonb_build_object('index', 0, 'reason', 'No missions array found')),
      'total_processed', 0,
      'total_created', 0,
      'total_errors', 1
    );
  END IF;
  
  -- Determine status based on mode
  v_status := CASE WHEN _mode = 'publish' THEN 'publicada' ELSE 'rascunho' END;
  
  -- Process each mission
  FOR v_i IN 0..jsonb_array_length(v_missions) - 1 LOOP
    v_item := v_missions->v_i;
    v_total_processed := v_total_processed + 1;
    
    BEGIN
      -- Normalize tags: if string, convert to array; if array, use directly
      v_tags_normalized := NULL;
      IF v_item ? 'tags' THEN
        IF jsonb_typeof(v_item->'tags') = 'string' THEN
          -- Tags is a string like "tag1, tag2, tag3" - convert to array
          v_tags_raw := v_item->>'tags';
          -- Remove spaces around commas and split
          SELECT to_jsonb(array_agg(trim(elem)))
          INTO v_tags_normalized
          FROM unnest(string_to_array(v_tags_raw, ',')) AS elem
          WHERE trim(elem) <> '';
        ELSIF jsonb_typeof(v_item->'tags') = 'array' THEN
          -- Tags is already an array, use directly
          v_tags_normalized := v_item->'tags';
        END IF;
      END IF;
      
      -- Insert the mission
      INSERT INTO missions (
        type,
        title,
        description,
        status,
        created_by,
        points,
        requires_validation,
        meta_json
      ) VALUES (
        (v_item->>'type')::mission_type,
        v_item->>'title',
        COALESCE(v_item->>'description', v_defaults->>'description'),
        v_status,
        _actor_user_id,
        COALESCE((v_item->>'points')::int, (v_defaults->>'points')::int, 10),
        COALESCE((v_item->>'requires_validation')::boolean, true),
        jsonb_build_object(
          'title', v_item->>'title',
          'description', COALESCE(v_item->>'description', v_defaults->>'description'),
          'tags', COALESCE(v_tags_normalized, '[]'::jsonb),
          'estimated_min', COALESCE((v_item->>'estimated_min')::int, (v_defaults->>'estimated_min')::int, 15),
          'assigned_to', COALESCE(v_item->>'assigned_to', v_defaults->>'assigned_to', 'all'),
          '_factory', jsonb_build_object(
            'pack_id', v_pack->>'id',
            'pack_title', v_pack->>'title',
            'imported_by', _actor_user_id,
            'imported_at', now(),
            'mode', _mode
          )
        ) || COALESCE(v_item->'meta', '{}'::jsonb)
      )
      RETURNING id INTO v_mission_id;
      
      v_total_created := v_total_created + 1;
      v_created := v_created || jsonb_build_array(jsonb_build_object(
        'id', v_mission_id,
        'type', v_item->>'type',
        'title', v_item->>'title'
      ));
      
    EXCEPTION WHEN invalid_text_representation THEN
      GET STACKED DIAGNOSTICS 
        v_detail = PG_EXCEPTION_DETAIL,
        v_hint = PG_EXCEPTION_HINT,
        v_context = PG_EXCEPTION_CONTEXT;
      v_sqlstate := SQLSTATE;
      v_total_errors := v_total_errors + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'index', v_i,
        'reason', 'Invalid mission type: ' || COALESCE(v_item->>'type', 'null'),
        'sqlstate', v_sqlstate,
        'detail', v_detail,
        'hint', v_hint,
        'context', v_context,
        'item', v_item
      ));
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS 
        v_detail = PG_EXCEPTION_DETAIL,
        v_hint = PG_EXCEPTION_HINT,
        v_context = PG_EXCEPTION_CONTEXT;
      v_sqlstate := SQLSTATE;
      v_total_errors := v_total_errors + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'index', v_i,
        'reason', SQLERRM,
        'sqlstate', v_sqlstate,
        'detail', v_detail,
        'hint', v_hint,
        'context', v_context,
        'item', v_item
      ));
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'ok', v_total_errors = 0,
    'created', v_created,
    'errors', v_errors,
    'total_processed', v_total_processed,
    'total_created', v_total_created,
    'total_errors', v_total_errors
  );
END;
$$;