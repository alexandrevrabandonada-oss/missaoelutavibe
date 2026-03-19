
-- Helper RPC for schema dump (read-only SQL execution, admin only)
CREATE OR REPLACE FUNCTION public.run_sql_readonly(query_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Only admins can run this
  IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta função';
  END IF;

  -- Only allow SELECT statements
  IF NOT (trim(lower(query_text)) ~ '^(select|with)') THEN
    RAISE EXCEPTION 'Apenas consultas SELECT são permitidas';
  END IF;

  -- Block dangerous patterns
  IF lower(query_text) ~ '(insert|update|delete|drop|alter|create|truncate|grant|revoke)' THEN
    RAISE EXCEPTION 'Operação não permitida';
  END IF;

  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || query_text || ') t' INTO result;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;
