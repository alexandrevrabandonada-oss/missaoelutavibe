
CREATE OR REPLACE FUNCTION public.run_sql_readonly(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  clean_query text;
BEGIN
  -- Allow if auth.uid() is null (service role) OR if user is admin
  IF auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta função';
  END IF;

  -- Clean whitespace
  clean_query := regexp_replace(lower(query_text), '^\s+', '', 'g');

  -- Only allow SELECT/WITH statements
  IF NOT (clean_query ~ '^(select|with)') THEN
    RAISE EXCEPTION 'Apenas consultas SELECT são permitidas: %', left(clean_query, 50);
  END IF;

  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
