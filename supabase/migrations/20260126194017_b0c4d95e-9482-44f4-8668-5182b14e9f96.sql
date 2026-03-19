-- Fix function search_path for security

-- Recreate get_top_content_week with search_path
CREATE OR REPLACE FUNCTION public.get_top_content_week(
  p_type public.content_type DEFAULT NULL,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  content_id UUID,
  title TEXT,
  type public.content_type,
  total_signals BIGINT,
  util_count BIGINT,
  replicar_count BIGINT,
  divulgar_count BIGINT,
  puxo_count BIGINT,
  unique_users BIGINT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT 
    ci.id AS content_id,
    ci.title,
    ci.type,
    COUNT(cs.id) AS total_signals,
    COUNT(cs.id) FILTER (WHERE cs.signal = 'util') AS util_count,
    COUNT(cs.id) FILTER (WHERE cs.signal = 'replicar') AS replicar_count,
    COUNT(cs.id) FILTER (WHERE cs.signal = 'divulgar') AS divulgar_count,
    COUNT(cs.id) FILTER (WHERE cs.signal = 'puxo') AS puxo_count,
    COUNT(DISTINCT cs.user_id) AS unique_users
  FROM public.content_items ci
  LEFT JOIN public.content_signals cs ON cs.content_id = ci.id
    AND cs.created_at >= now() - interval '7 days'
  WHERE ci.status = 'PUBLISHED'
    AND (p_type IS NULL OR ci.type = p_type)
  GROUP BY ci.id, ci.title, ci.type
  HAVING COUNT(cs.id) > 0
  ORDER BY COUNT(cs.id) DESC, COUNT(DISTINCT cs.user_id) DESC
  LIMIT p_limit;
$$;

-- Recreate get_content_signal_counts with search_path
CREATE OR REPLACE FUNCTION public.get_content_signal_counts(p_content_id UUID)
RETURNS TABLE (
  signal TEXT,
  count BIGINT,
  user_reacted BOOLEAN
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT 
    s.signal,
    COUNT(cs.id) AS count,
    BOOL_OR(cs.user_id = auth.uid()) AS user_reacted
  FROM (VALUES ('util'), ('replicar'), ('divulgar'), ('puxo')) AS s(signal)
  LEFT JOIN public.content_signals cs ON cs.signal = s.signal AND cs.content_id = p_content_id
  GROUP BY s.signal;
$$;