-- Fix import_mission_pack to properly cast status to mission_status enum
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
  v_item jsonb;
  v_created jsonb[] := ARRAY[]::jsonb[];
  v_errors jsonb[] := ARRAY[]::jsonb[];
  v_index int := 0;
  v_mission_id uuid;
  v_defaults jsonb;
  v_tags_raw jsonb;
  v_tags_array text[];
  v_status_text text;
  v_status mission_status;
  v_sqlstate text;
  v_message text;
  v_detail text;
  v_hint text;
  v_context text;
BEGIN
  -- Extract defaults from pack
  v_defaults := coalesce(_pack_json->'pack'->'defaults', '{}'::jsonb);

  -- Loop through missions array
  FOR v_item IN SELECT * FROM jsonb_array_elements(_pack_json->'missions')
  LOOP
    v_index := v_index + 1;
    BEGIN
      -- Validate required fields
      IF v_item->>'type' IS NULL OR v_item->>'title' IS NULL THEN
        v_errors := array_append(v_errors, jsonb_build_object(
          'index', v_index,
          'reason', 'Missing required field: type or title',
          'item', v_item
        ));
        CONTINUE;
      END IF;

      -- Handle tags: convert string to array if needed
      v_tags_raw := v_item->'tags';
      IF v_tags_raw IS NULL THEN
        v_tags_array := ARRAY[]::text[];
      ELSIF jsonb_typeof(v_tags_raw) = 'string' THEN
        -- It's a string like "tag1, tag2, tag3" - split and trim
        SELECT array_agg(trim(t))
        INTO v_tags_array
        FROM unnest(string_to_array(v_tags_raw#>>'{}', ',')) AS t
        WHERE trim(t) != '';
      ELSIF jsonb_typeof(v_tags_raw) = 'array' THEN
        -- It's already an array
        SELECT array_agg(elem::text)
        INTO v_tags_array
        FROM jsonb_array_elements_text(v_tags_raw) AS elem;
      ELSE
        v_tags_array := ARRAY[]::text[];
      END IF;

      -- Determine status text with proper priority: mode > item.status > defaults.status > 'draft'
      v_status_text := lower(coalesce(
        CASE 
          WHEN _mode = 'publish' THEN 'publicada'
          WHEN _mode = 'draft' THEN 'rascunho'
          ELSE NULL
        END,
        v_item->>'status',
        v_defaults->>'status',
        'rascunho'
      ));

      -- Map status text to enum with safe fallback
      v_status := CASE v_status_text
        WHEN 'publicada' THEN 'publicada'::mission_status
        WHEN 'published' THEN 'publicada'::mission_status
        WHEN 'rascunho' THEN 'rascunho'::mission_status
        WHEN 'draft' THEN 'rascunho'::mission_status
        WHEN 'arquivada' THEN 'arquivada'::mission_status
        WHEN 'archived' THEN 'arquivada'::mission_status
        ELSE 'rascunho'::mission_status
      END;

      -- Insert the mission
      INSERT INTO missions (
        type,
        title,
        description,
        status,
        created_by,
        ciclo_id,
        points,
        requires_validation,
        meta_json
      ) VALUES (
        (v_item->>'type')::mission_type,
        v_item->>'title',
        coalesce(v_item->>'description', v_defaults->>'description'),
        v_status,
        _actor_user_id,
        NULL,
        coalesce((v_item->>'points')::int, (v_defaults->>'points')::int, 10),
        coalesce((v_item->>'requires_validation')::boolean, true),
        jsonb_build_object(
          'title', v_item->>'title',
          'description', coalesce(v_item->>'description', v_defaults->>'description'),
          'tags', coalesce(to_jsonb(v_tags_array), '[]'::jsonb),
          'estimated_min', coalesce((v_item->>'estimated_min')::int, (v_defaults->>'estimated_min')::int, 15),
          'assigned_to', coalesce(v_item->>'assigned_to', v_defaults->>'assigned_to', 'all'),
          '_factory', jsonb_build_object(
            'pack_id', _pack_json->'pack'->>'id',
            'imported_by', _actor_user_id,
            'imported_at', now(),
            'mode', _mode
          )
        ) || coalesce(v_item->'meta', '{}'::jsonb)
      )
      RETURNING id INTO v_mission_id;

      v_created := array_append(v_created, jsonb_build_object(
        'id', v_mission_id,
        'type', v_item->>'type',
        'title', v_item->>'title'
      ));

    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS 
        v_sqlstate = RETURNED_SQLSTATE,
        v_message = MESSAGE_TEXT,
        v_detail = PG_EXCEPTION_DETAIL,
        v_hint = PG_EXCEPTION_HINT,
        v_context = PG_EXCEPTION_CONTEXT;
      
      v_errors := array_append(v_errors, jsonb_build_object(
        'index', v_index,
        'reason', v_message,
        'sqlstate', v_sqlstate,
        'detail', v_detail,
        'hint', v_hint,
        'context', v_context,
        'item', v_item
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
    'created', to_jsonb(v_created),
    'errors', to_jsonb(v_errors),
    'total_processed', v_index,
    'total_created', coalesce(array_length(v_created, 1), 0),
    'total_errors', coalesce(array_length(v_errors, 1), 0)
  );
END;
$$;