
-- Add personal invite_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;

-- Backfill existing profiles with unique codes
UPDATE public.profiles
SET invite_code = substr(md5(id::text || random()::text), 1, 8)
WHERE invite_code IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.profiles ALTER COLUMN invite_code SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN invite_code SET DEFAULT substr(md5(gen_random_uuid()::text), 1, 8);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON public.profiles (invite_code);

-- Admin ranking RPC: top referrers by approved downstream count
CREATE OR REPLACE FUNCTION public.get_top_referrers(_limit int DEFAULT 20)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  user_city text,
  invite_code text,
  total_referrals bigint,
  aprovados bigint,
  referrals_7d bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.full_name AS user_name,
    p.city AS user_city,
    p.invite_code,
    count(r.id) AS total_referrals,
    count(r.id) FILTER (WHERE r.volunteer_status = 'aprovado') AS aprovados,
    count(r.id) FILTER (WHERE r.created_at >= now() - interval '7 days') AS referrals_7d
  FROM profiles p
  INNER JOIN profiles r ON r.referrer_user_id = p.id
  GROUP BY p.id, p.full_name, p.city, p.invite_code
  ORDER BY total_referrals DESC
  LIMIT _limit;
$$;
