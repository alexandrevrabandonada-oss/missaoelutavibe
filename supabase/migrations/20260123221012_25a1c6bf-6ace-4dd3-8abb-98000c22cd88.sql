-- ================================================
-- SHARE PACK V1: Multi-platform sharing for Fábrica de Base
-- Non-destructive extension
-- ================================================

-- 2) RPC: Get share pack for a template and platform (fixed array slice syntax)
CREATE OR REPLACE FUNCTION public.get_share_pack(
  p_template_id uuid,
  p_platform text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template fabrica_templates%ROWTYPE;
  v_user_id uuid;
  v_invite_code text;
  v_link text;
  v_caption text;
  v_variant_key text;
  v_files jsonb;
  v_all_variants jsonb;
  v_result jsonb;
  v_hashtags_arr text[];
BEGIN
  v_user_id := auth.uid();
  
  SELECT * INTO v_template
  FROM fabrica_templates
  WHERE id = p_template_id
    AND status = 'aprovado';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template não encontrado ou não aprovado');
  END IF;
  
  SELECT code INTO v_invite_code
  FROM convites
  WHERE criado_por = v_user_id
    AND ativo = true
  ORDER BY criado_em DESC
  LIMIT 1;
  
  IF v_invite_code IS NULL THEN
    v_invite_code := v_user_id::text;
  END IF;
  
  v_link := '/comecar?t=' || p_template_id::text 
    || '&ref=' || v_invite_code
    || '&utm_source=fabrica'
    || '&utm_medium=' || p_platform
    || '&utm_campaign=' || COALESCE(regexp_replace(lower(v_template.titulo), '[^a-z0-9]+', '-', 'g'), 'share');
  
  v_hashtags_arr := COALESCE(v_template.hashtags, ARRAY[]::text[]);
  
  CASE p_platform
    WHEN 'whatsapp' THEN
      v_caption := COALESCE(
        v_template.share_pack_json->>'whatsapp_text',
        v_template.texto_base || E'\n\n' || array_to_string(v_hashtags_arr, ' ')
      );
      v_variant_key := COALESCE(
        v_template.share_pack_json->'default_variant_by_platform'->>'whatsapp',
        'vertical_9x16'
      );
    WHEN 'instagram_feed' THEN
      v_caption := COALESCE(
        v_template.share_pack_json->>'instagram_caption',
        v_template.texto_base || E'\n\n' || array_to_string(v_hashtags_arr, ' ')
      );
      v_variant_key := COALESCE(
        v_template.share_pack_json->'default_variant_by_platform'->>'instagram_feed',
        'feed_4x5'
      );
    WHEN 'instagram_reels' THEN
      v_caption := COALESCE(
        v_template.share_pack_json->>'instagram_caption',
        v_template.texto_base || E'\n\n' || array_to_string(v_hashtags_arr, ' ')
      );
      v_variant_key := COALESCE(
        v_template.share_pack_json->'default_variant_by_platform'->>'instagram_reels',
        'vertical_9x16'
      );
    WHEN 'tiktok' THEN
      v_caption := COALESCE(
        v_template.share_pack_json->>'tiktok_caption',
        left(v_template.texto_base, 280) || E'\n' || array_to_string(v_hashtags_arr[1:5], ' ')
      );
      v_variant_key := COALESCE(
        v_template.share_pack_json->'default_variant_by_platform'->>'tiktok',
        'vertical_9x16'
      );
    ELSE
      v_caption := v_template.texto_base;
      v_variant_key := 'square_1x1';
  END CASE;
  
  v_files := COALESCE(
    v_template.attachments_by_variant->v_variant_key,
    v_template.attachments_json::jsonb
  );
  
  v_all_variants := jsonb_build_object();
  IF v_template.attachments_by_variant IS NOT NULL AND v_template.attachments_by_variant != '{}' THEN
    SELECT jsonb_object_agg(key, jsonb_array_length(value))
    INTO v_all_variants
    FROM jsonb_each(v_template.attachments_by_variant)
    WHERE jsonb_array_length(value) > 0;
  END IF;
  
  v_result := jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'platform', p_platform,
    'caption', v_caption,
    'link', v_link,
    'link_full', 'https://missaoeluta.lovable.app' || v_link,
    'hook', v_template.share_pack_json->>'hook',
    'cta', v_template.share_pack_json->>'cta',
    'hashtags', v_template.hashtags,
    'variant_key', v_variant_key,
    'files', v_files,
    'available_variants', v_all_variants,
    'titulo', v_template.titulo
  );
  
  RETURN v_result;
END;
$$;

-- 3) RPC: Track share action
CREATE OR REPLACE FUNCTION public.track_share_action(
  p_template_id uuid,
  p_action text,
  p_meta jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_today date;
  v_existing_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  v_today := current_date;
  
  SELECT id INTO v_existing_id
  FROM fabrica_downloads
  WHERE template_id = p_template_id
    AND user_id = v_user_id
    AND action = p_action
    AND action_date = v_today;
  
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END IF;
  
  INSERT INTO fabrica_downloads (template_id, user_id, action, action_date)
  VALUES (p_template_id, v_user_id, p_action, v_today);
  
  IF p_action LIKE 'share_%' THEN
    INSERT INTO growth_events (
      event_type,
      user_id,
      template_id,
      meta
    ) VALUES (
      'template_share',
      v_user_id,
      p_template_id,
      jsonb_build_object('platform', replace(p_action, 'share_', '')) || p_meta
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'tracked', true);
END;
$$;

-- 4) RPC: Get share pack metrics for Ops dashboard
CREATE OR REPLACE FUNCTION public.get_share_pack_metrics(
  p_scope_tipo text DEFAULT 'global',
  p_scope_id text DEFAULT NULL,
  p_days int DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shares_by_platform jsonb;
  v_top_templates jsonb;
  v_conversion jsonb;
  v_total_shares int;
BEGIN
  SELECT jsonb_object_agg(platform, cnt)
  INTO v_shares_by_platform
  FROM (
    SELECT 
      replace(fd.action, 'share_', '') as platform,
      count(*) as cnt
    FROM fabrica_downloads fd
    JOIN fabrica_templates ft ON ft.id = fd.template_id
    WHERE fd.action LIKE 'share_%'
      AND fd.action_date >= current_date - p_days
      AND (p_scope_tipo = 'global' 
        OR (p_scope_tipo = 'cidade' AND ft.scope_tipo = 'cidade' AND ft.scope_id = p_scope_id)
        OR (p_scope_tipo = 'celula' AND ft.scope_tipo = 'celula' AND ft.scope_id = p_scope_id))
    GROUP BY replace(fd.action, 'share_', '')
  ) sub;
  
  v_total_shares := 0;
  IF v_shares_by_platform IS NOT NULL THEN
    SELECT COALESCE(SUM(value::int), 0)
    INTO v_total_shares
    FROM jsonb_each_text(v_shares_by_platform);
  END IF;
  
  SELECT jsonb_agg(t)
  INTO v_top_templates
  FROM (
    SELECT 
      ft.id,
      ft.titulo,
      count(*) as shares
    FROM fabrica_downloads fd
    JOIN fabrica_templates ft ON ft.id = fd.template_id
    WHERE fd.action LIKE 'share_%'
      AND fd.action_date >= current_date - p_days
      AND (p_scope_tipo = 'global' 
        OR (p_scope_tipo = 'cidade' AND ft.scope_tipo = 'cidade' AND ft.scope_id = p_scope_id)
        OR (p_scope_tipo = 'celula' AND ft.scope_tipo = 'celula' AND ft.scope_id = p_scope_id))
    GROUP BY ft.id, ft.titulo
    ORDER BY shares DESC
    LIMIT 5
  ) t;
  
  SELECT jsonb_build_object(
    'shares', (SELECT count(*) FROM growth_events WHERE event_type = 'template_share' AND occurred_at >= current_date - p_days),
    'signups_from_template', (SELECT count(*) FROM growth_events WHERE event_type = 'signup' AND template_id IS NOT NULL AND occurred_at >= current_date - p_days),
    'rate', CASE 
      WHEN (SELECT count(*) FROM growth_events WHERE event_type = 'template_share' AND occurred_at >= current_date - p_days) > 0
      THEN round(
        (SELECT count(*) FROM growth_events WHERE event_type = 'signup' AND template_id IS NOT NULL AND occurred_at >= current_date - p_days)::numeric
        / (SELECT count(*) FROM growth_events WHERE event_type = 'template_share' AND occurred_at >= current_date - p_days)::numeric * 100, 1
      )
      ELSE 0
    END
  )
  INTO v_conversion;
  
  RETURN jsonb_build_object(
    'total_shares_7d', v_total_shares,
    'shares_by_platform', COALESCE(v_shares_by_platform, '{}'),
    'top_templates', COALESCE(v_top_templates, '[]'),
    'conversion', v_conversion,
    'period_days', p_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_share_pack(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_share_action(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_share_pack_metrics(text, text, int) TO authenticated;