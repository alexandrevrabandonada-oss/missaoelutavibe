-- Drop and recreate import_mission_pack with proper EN->PT mapping
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
  _missions jsonb;
  _defaults jsonb;
  _pack_id text;
  _pack_title text;
  _mission jsonb;
  _new_id uuid;
  _created jsonb := '[]'::jsonb;
  _errors jsonb := '[]'::jsonb;
  _idx int := 0;
  _mission_status mission_status;
  _mission_type mission_type;
  _assigned_to text;
  _status_text text;
  _type_text text;
  _tags_raw jsonb;
  _tags_array text[];
BEGIN
  -- Extract pack metadata
  _pack_id := COALESCE(_pack_json->'pack'->>'id', 'pack_' || gen_random_uuid()::text);
  _pack_title := COALESCE(_pack_json->'pack'->>'title', 'Imported Pack');
  _defaults := COALESCE(_pack_json->'pack'->'defaults', '{}'::jsonb);
  _missions := COALESCE(_pack_json->'missions', '[]'::jsonb);

  -- Process each mission
  FOR _mission IN SELECT * FROM jsonb_array_elements(_missions)
  LOOP
    _idx := _idx + 1;
    BEGIN
      _new_id := gen_random_uuid();

      -- === STATUS MAPPING (EN -> PT) ===
      -- Priority: _mode > item.status > defaults.status > 'rascunho'
      _status_text := lower(COALESCE(
        CASE 
          WHEN _mode = 'publish' THEN 'publicada'
          WHEN _mode = 'draft' THEN 'rascunho'
          ELSE NULL
        END,
        _mission->>'status',
        _defaults->>'status',
        'rascunho'
      ));
      
      -- Map English values to Portuguese
      _status_text := CASE _status_text
        WHEN 'published' THEN 'publicada'
        WHEN 'draft' THEN 'rascunho'
        WHEN 'in_progress' THEN 'em_andamento'
        WHEN 'submitted' THEN 'enviada'
        WHEN 'validated' THEN 'validada'
        WHEN 'rejected' THEN 'reprovada'
        WHEN 'completed' THEN 'concluida'
        -- Keep PT values as-is
        WHEN 'publicada' THEN 'publicada'
        WHEN 'rascunho' THEN 'rascunho'
        WHEN 'em_andamento' THEN 'em_andamento'
        WHEN 'enviada' THEN 'enviada'
        WHEN 'validada' THEN 'validada'
        WHEN 'reprovada' THEN 'reprovada'
        WHEN 'concluida' THEN 'concluida'
        -- Default fallback
        ELSE 'rascunho'
      END;
      
      _mission_status := _status_text::mission_status;

      -- === TYPE MAPPING (EN -> PT) ===
      _type_text := lower(COALESCE(_mission->>'type', _defaults->>'type', 'escuta'));
      
      -- Map English values to Portuguese
      _type_text := CASE _type_text
        WHEN 'street' THEN 'rua'
        WHEN 'conversation' THEN 'conversa'
        WHEN 'listen' THEN 'escuta'
        WHEN 'listening' THEN 'escuta'
        WHEN 'content' THEN 'conteudo'
        WHEN 'data' THEN 'dados'
        WHEN 'training' THEN 'formacao'
        WHEN 'mobilization' THEN 'mobilizacao'
        WHEN 'generic' THEN 'escuta' -- No 'geral' enum, fallback to 'escuta'
        WHEN 'crm' THEN 'conversa' -- Map CRM to conversa
        -- Keep PT values as-is
        WHEN 'escuta' THEN 'escuta'
        WHEN 'rua' THEN 'rua'
        WHEN 'mobilizacao' THEN 'mobilizacao'
        WHEN 'conteudo' THEN 'conteudo'
        WHEN 'dados' THEN 'dados'
        WHEN 'formacao' THEN 'formacao'
        WHEN 'conversa' THEN 'conversa'
        -- Default fallback
        ELSE 'escuta'
      END;
      
      _mission_type := _type_text::mission_type;

      -- Handle assigned_to
      _assigned_to := COALESCE(_mission->>'assigned_to', _defaults->>'assigned_to', 'all');

      -- Handle tags (can be array or string)
      _tags_raw := COALESCE(_mission->'tags', _defaults->'tags', '[]'::jsonb);
      IF jsonb_typeof(_tags_raw) = 'array' THEN
        SELECT array_agg(elem::text) INTO _tags_array
        FROM jsonb_array_elements_text(_tags_raw) AS elem;
      ELSE
        _tags_array := ARRAY[_tags_raw::text];
      END IF;

      -- Insert mission with proper enum casts
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
        COALESCE((_mission->>'points')::int, (_defaults->>'points')::int, 10),
        COALESCE((_mission->>'requires_validation')::boolean, true),
        jsonb_build_object(
          'title', _mission->>'title',
          'description', _mission->>'description',
          'tags', COALESCE(_tags_array, ARRAY[]::text[]),
          'estimated_min', COALESCE((_mission->>'estimated_min')::int, (_defaults->>'estimated_min')::int, 15),
          'assigned_to', _assigned_to,
          '_factory', jsonb_build_object(
            'packId', _pack_id,
            'packTitle', _pack_title,
            'importedBy', _actor_user_id,
            'importedAt', now(),
            'mode', _mode,
            'originalType', _mission->>'type',
            'originalStatus', _mission->>'status'
          )
        ) || COALESCE(_mission->'meta', '{}'::jsonb)
      );

      -- Add to created list
      _created := _created || jsonb_build_object(
        'id', _new_id,
        'type', _type_text,
        'title', _mission->>'title'
      );

    EXCEPTION WHEN OTHERS THEN
      _errors := _errors || jsonb_build_object(
        'index', _idx,
        'reason', SQLERRM || ' (' || SQLSTATE || ')',
        'title', _mission->>'title'
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(_errors) = 0,
    'created', _created,
    'errors', _errors,
    'total_processed', _idx,
    'total_created', jsonb_array_length(_created),
    'total_errors', jsonb_array_length(_errors)
  );
END;
$$;