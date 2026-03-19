-- Update import_mission_pack to persist tags in meta_json.tags
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
  _pack jsonb;
  _defaults jsonb;
  _missions jsonb;
  _mission jsonb;
  _result jsonb := '{"ok": true, "created": [], "errors": [], "total_processed": 0, "total_created": 0, "total_errors": 0}'::jsonb;
  _new_id uuid;
  _mission_type mission_type;
  _mission_status mission_status;
  _assigned_to text;
  _i int := 0;
  _type_text text;
  _status_text text;
  _tags_input jsonb;
  _meta_json_final jsonb;
  _sqlstate text;
  _sqlerrm text;
  _detail text;
  _hint text;
  _context text;
BEGIN
  -- Extract pack metadata and missions array
  _pack := COALESCE(_pack_json->'pack', '{}'::jsonb);
  _defaults := COALESCE(_pack->'defaults', '{}'::jsonb);
  _missions := COALESCE(_pack_json->'missions', '[]'::jsonb);

  -- Validate missions is an array
  IF jsonb_typeof(_missions) != 'array' THEN
    RETURN jsonb_set(_result, '{ok}', 'false'::jsonb) || 
           jsonb_build_object('errors', jsonb_build_array(
             jsonb_build_object('index', -1, 'reason', 'missions must be an array')
           ));
  END IF;

  -- Process each mission
  FOR _mission IN SELECT * FROM jsonb_array_elements(_missions)
  LOOP
    BEGIN
      _i := _i + 1;
      _result := jsonb_set(_result, '{total_processed}', to_jsonb(_i));

      -- Get and normalize type (support English aliases)
      _type_text := COALESCE(_mission->>'type', _defaults->>'type', 'escuta');
      _type_text := CASE _type_text
        WHEN 'street' THEN 'rua'
        WHEN 'conversation' THEN 'conversa'
        WHEN 'content' THEN 'conteudo'
        WHEN 'training' THEN 'formacao'
        WHEN 'data' THEN 'dados'
        WHEN 'mobilization' THEN 'mobilizacao'
        WHEN 'listening' THEN 'escuta'
        ELSE _type_text
      END;
      
      -- Validate mission type
      BEGIN
        _mission_type := _type_text::mission_type;
      EXCEPTION WHEN invalid_text_representation THEN
        _result := jsonb_set(_result, '{errors}', 
          (_result->'errors') || jsonb_build_array(
            jsonb_build_object('index', _i - 1, 'reason', 'invalid type: ' || _type_text)
          )
        );
        _result := jsonb_set(_result, '{total_errors}', to_jsonb(jsonb_array_length(_result->'errors')));
        CONTINUE;
      END;

      -- Get and normalize status (support English aliases)
      IF _mode = 'publish' THEN
        _status_text := 'publicada';
      ELSE
        _status_text := COALESCE(_mission->>'status', _defaults->>'status', 'rascunho');
      END IF;
      
      _status_text := CASE _status_text
        WHEN 'draft' THEN 'rascunho'
        WHEN 'published' THEN 'publicada'
        WHEN 'in_progress' THEN 'em_andamento'
        WHEN 'submitted' THEN 'enviada'
        WHEN 'validated' THEN 'validada'
        WHEN 'rejected' THEN 'reprovada'
        WHEN 'completed' THEN 'concluida'
        ELSE _status_text
      END;
      
      -- Validate mission status
      BEGIN
        _mission_status := _status_text::mission_status;
      EXCEPTION WHEN invalid_text_representation THEN
        _result := jsonb_set(_result, '{errors}', 
          (_result->'errors') || jsonb_build_array(
            jsonb_build_object('index', _i - 1, 'reason', 'invalid status: ' || _status_text)
          )
        );
        _result := jsonb_set(_result, '{total_errors}', to_jsonb(jsonb_array_length(_result->'errors')));
        CONTINUE;
      END;

      -- Validate title exists
      IF (_mission->>'title') IS NULL THEN
        _result := jsonb_set(_result, '{errors}', 
          (_result->'errors') || jsonb_build_array(
            jsonb_build_object('index', _i - 1, 'reason', 'title is required')
          )
        );
        _result := jsonb_set(_result, '{total_errors}', to_jsonb(jsonb_array_length(_result->'errors')));
        CONTINUE;
      END IF;

      -- Resolve assigned_to
      _assigned_to := COALESCE(_mission->>'assigned_to', _defaults->>'assigned_to', 'all');

      -- Generate new mission ID
      _new_id := gen_random_uuid();

      -- Normalize tags: handle both array and comma-separated string
      _tags_input := COALESCE(_mission->'tags', _defaults->'tags');
      IF _tags_input IS NOT NULL AND jsonb_typeof(_tags_input) = 'string' THEN
        -- Convert comma-separated string to array
        _tags_input := to_jsonb(string_to_array(replace(_tags_input::text, '"', ''), ','));
      END IF;

      -- Build meta_json_final: start with item.meta, then merge tags
      _meta_json_final := COALESCE(_mission->'meta', '{}'::jsonb);
      
      -- Add tags to meta_json if they exist
      IF _tags_input IS NOT NULL AND jsonb_typeof(_tags_input) = 'array' THEN
        _meta_json_final := jsonb_set(_meta_json_final, '{tags}', _tags_input, true);
      END IF;
      
      -- Add standard meta fields
      _meta_json_final := _meta_json_final || jsonb_build_object(
        'title', _mission->>'title',
        'description', _mission->>'description',
        'estimated_min', COALESCE((_mission->>'estimated_min')::int, (_defaults->>'estimated_min')::int, 15),
        'assigned_to', _assigned_to,
        '_factory', jsonb_build_object(
          'packId', COALESCE(_pack->>'id', 'unknown'),
          'packTitle', COALESCE(_pack->>'title', 'Imported Pack'),
          'importedBy', _actor_user_id,
          'importedAt', now(),
          'mode', _mode
        )
      );

      -- Insert mission
      INSERT INTO missions (
        id, type, title, description, instructions, status,
        created_by, ciclo_id, points, requires_validation, meta_json
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
        COALESCE((_mission->>'points')::int, (_defaults->>'points')::int, 10),
        COALESCE((_mission->>'requires_validation')::boolean, true),
        _meta_json_final
      );

      -- Add to created list
      _result := jsonb_set(_result, '{created}', 
        (_result->'created') || jsonb_build_array(
          jsonb_build_object('id', _new_id, 'type', _type_text, 'title', _mission->>'title')
        )
      );
      _result := jsonb_set(_result, '{total_created}', to_jsonb(jsonb_array_length(_result->'created')));

    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS 
        _sqlstate = RETURNED_SQLSTATE,
        _sqlerrm = MESSAGE_TEXT,
        _detail = PG_EXCEPTION_DETAIL,
        _hint = PG_EXCEPTION_HINT,
        _context = PG_EXCEPTION_CONTEXT;
      
      _result := jsonb_set(_result, '{errors}', 
        (_result->'errors') || jsonb_build_array(
          jsonb_build_object(
            'index', _i - 1, 
            'reason', _sqlerrm,
            'sqlstate', _sqlstate,
            'detail', _detail,
            'hint', _hint
          )
        )
      );
      _result := jsonb_set(_result, '{total_errors}', to_jsonb(jsonb_array_length(_result->'errors')));
    END;
  END LOOP;

  -- Set ok to false if any errors
  IF jsonb_array_length(_result->'errors') > 0 THEN
    _result := jsonb_set(_result, '{ok}', 'false'::jsonb);
  END IF;

  RETURN _result;
END;
$$;