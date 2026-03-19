
-- 1. Add slug column
ALTER TABLE public.missions ADD COLUMN IF NOT EXISTS slug text;

-- 2. Generate slugs from titles
UPDATE public.missions SET slug = regexp_replace(
  regexp_replace(
    regexp_replace(
      lower(translate(title, 
        'ÁÀÃÂÉÊÍÓÔÕÚÇáàãâéêíóôõúç:()–—""''', 
        'AAAAEEIOOOUCaaaaeeioooucc          ')),
      '[^a-z0-9 ]', '', 'g'
    ),
    '\s+', '-', 'g'
  ),
  '-+', '-', 'g'
);

-- 3. Deduplicate slugs by appending row number
WITH dupes AS (
  SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY created_at) as rn
  FROM public.missions
)
UPDATE public.missions m
SET slug = dupes.slug || '-' || dupes.rn::text
FROM dupes
WHERE m.id = dupes.id AND dupes.rn > 1;

-- 4. Trim trailing hyphens
UPDATE public.missions SET slug = regexp_replace(slug, '-+$', '', 'g')
WHERE slug ~ '-+$';

-- 5. Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_missions_slug_unique ON public.missions (slug) WHERE slug IS NOT NULL;

-- 6. Index for canonical lookup
CREATE INDEX IF NOT EXISTS idx_missions_canonical ON public.missions ((meta_json->>'canonical')) WHERE meta_json->>'canonical' = 'true';

-- 7. RPC: mark_canonical_missions
CREATE OR REPLACE FUNCTION public.mark_canonical_missions(p_slugs text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_rank int := 0;
  v_found_slugs text[] := '{}';
  v_missing_slugs text[] := '{}';
  v_exists boolean;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM coord_roles WHERE user_id = auth.uid()) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  UPDATE missions SET meta_json = meta_json - 'canonical' - 'canonical_rank'
  WHERE meta_json->>'canonical' = 'true';

  FOREACH v_slug IN ARRAY p_slugs LOOP
    v_rank := v_rank + 1;
    SELECT EXISTS(SELECT 1 FROM missions WHERE slug = v_slug) INTO v_exists;
    IF v_exists THEN
      UPDATE missions 
      SET meta_json = COALESCE(meta_json, '{}'::jsonb) || 
        jsonb_build_object('canonical', true, 'canonical_rank', v_rank)
      WHERE slug = v_slug;
      v_found_slugs := v_found_slugs || v_slug;
    ELSE
      v_missing_slugs := v_missing_slugs || v_slug;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', cardinality(v_missing_slugs) = 0,
    'marked', cardinality(v_found_slugs),
    'found_slugs', to_jsonb(v_found_slugs),
    'missing_slugs', to_jsonb(v_missing_slugs)
  );
END;
$$;

-- 8. RPC: get_mission_catalog_stats
CREATE OR REPLACE FUNCTION public.get_mission_catalog_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total int;
  v_canonical int;
  v_canonical_slugs text[];
  v_missing text[];
  v_duplicates jsonb;
  v_newest jsonb;
  v_expected_slugs text[] := ARRAY[
    'celula-checkin-semanal-2min',
    'convite-1-pessoa-para-sua-celula',
    'playbook-1-acao-rodar-agora',
    'mural-1-relato-1-pergunta',
    'trio-15min-acao-da-semana',
    'debate-1-comentario-modelo-3-linhas',
    'beta-1-bug-1-atricao-1-ideia'
  ];
  v_slug text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM coord_roles WHERE user_id = auth.uid()) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT count(*) INTO v_total FROM missions;
  
  SELECT count(*), array_agg(slug ORDER BY (meta_json->>'canonical_rank')::int)
  INTO v_canonical, v_canonical_slugs
  FROM missions WHERE meta_json->>'canonical' = 'true';

  v_missing := '{}';
  FOREACH v_slug IN ARRAY v_expected_slugs LOOP
    IF NOT EXISTS (SELECT 1 FROM missions WHERE slug = v_slug AND meta_json->>'canonical' = 'true') THEN
      v_missing := v_missing || v_slug;
    END IF;
  END LOOP;

  SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb)
  INTO v_duplicates
  FROM (
    SELECT 
      regexp_replace(lower(trim(title)), '[^a-z0-9 ]', '', 'g') as norm_title,
      count(*) as cnt,
      array_agg(slug) as slugs
    FROM missions
    GROUP BY regexp_replace(lower(trim(title)), '[^a-z0-9 ]', '', 'g')
    HAVING count(*) > 1
    LIMIT 10
  ) d;

  SELECT COALESCE(jsonb_agg(row_to_json(n)), '[]'::jsonb)
  INTO v_newest
  FROM (
    SELECT slug, title, created_at FROM missions ORDER BY created_at DESC LIMIT 10
  ) n;

  RETURN jsonb_build_object(
    'ok', true,
    'total_missions', v_total,
    'canonical_count', v_canonical,
    'canonical_slugs', COALESCE(to_jsonb(v_canonical_slugs), '[]'::jsonb),
    'missing_canonical_slugs', to_jsonb(v_missing),
    'duplicates_top', v_duplicates,
    'newest_10', v_newest,
    'ts', now()
  );
END;
$$;
