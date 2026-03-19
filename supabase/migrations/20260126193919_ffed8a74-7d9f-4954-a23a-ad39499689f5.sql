-- ============================================================
-- Content Items: Unified content model for materials, sharepacks, etc.
-- ============================================================

-- Content type enum
CREATE TYPE public.content_type AS ENUM ('MATERIAL', 'SHAREPACK', 'TEMPLATE');

-- Content status enum  
CREATE TYPE public.content_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- Content Items table
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.content_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.content_status NOT NULL DEFAULT 'DRAFT',
  tags TEXT[] DEFAULT '{}',
  -- Scope for RLS (global, cidade, celula)
  scope_tipo TEXT NOT NULL DEFAULT 'global',
  scope_id TEXT,
  -- Sharepack-specific fields (nullable for other types)
  legenda_whatsapp TEXT,
  legenda_instagram TEXT,
  legenda_tiktok TEXT,
  hashtags TEXT[] DEFAULT '{}',
  hook TEXT,
  cta TEXT,
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id)
);

-- Asset roles for content_assets join
CREATE TYPE public.content_asset_role AS ENUM (
  'PRIMARY',      -- Main asset for materials
  'THUMBNAIL',    -- Preview thumbnail
  'CARD_1x1',     -- Square format for sharepack
  'CARD_4x5',     -- Feed format (Instagram)
  'STORY_9x16',   -- Vertical format (Stories/Reels)
  'THUMB_16x9',   -- Horizontal thumbnail
  'ATTACHMENT'    -- Additional attachments
);

-- Content Assets join table
CREATE TABLE public.content_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  role public.content_asset_role NOT NULL DEFAULT 'PRIMARY',
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_id, asset_id, role)
);

-- Content signals (reactions/curation)
CREATE TABLE public.content_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  signal TEXT NOT NULL CHECK (signal IN ('util', 'replicar', 'divulgar', 'puxo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_id, user_id, signal)
);

-- Indexes for performance
CREATE INDEX idx_content_items_type ON public.content_items(type);
CREATE INDEX idx_content_items_status ON public.content_items(status);
CREATE INDEX idx_content_items_scope ON public.content_items(scope_tipo, scope_id);
CREATE INDEX idx_content_items_created_by ON public.content_items(created_by);
CREATE INDEX idx_content_assets_content ON public.content_assets(content_id);
CREATE INDEX idx_content_assets_asset ON public.content_assets(asset_id);
CREATE INDEX idx_content_signals_content ON public.content_signals(content_id);
CREATE INDEX idx_content_signals_user ON public.content_signals(user_id);

-- Enable RLS
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_items
CREATE POLICY "Anyone can view published content"
  ON public.content_items FOR SELECT
  USING (status = 'PUBLISHED');

CREATE POLICY "Users can view their own drafts"
  ON public.content_items FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create content"
  ON public.content_items FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own content"
  ON public.content_items FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can do everything on content_items"
  ON public.content_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- RLS Policies for content_assets
CREATE POLICY "Anyone can view content_assets for published content"
  ON public.content_assets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.content_items 
    WHERE id = content_id AND (status = 'PUBLISHED' OR created_by = auth.uid())
  ));

CREATE POLICY "Content owners can manage content_assets"
  ON public.content_assets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.content_items 
    WHERE id = content_id AND created_by = auth.uid()
  ));

CREATE POLICY "Admins can do everything on content_assets"
  ON public.content_assets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

-- RLS Policies for content_signals
CREATE POLICY "Anyone can view signals"
  ON public.content_signals FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add signals"
  ON public.content_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own signals"
  ON public.content_signals FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Top da Semana: Aggregated signal counts for ranking
-- ============================================================

-- Function to get top content by signals in last 7 days
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

-- Function to get signal counts for a specific content item
CREATE OR REPLACE FUNCTION public.get_content_signal_counts(p_content_id UUID)
RETURNS TABLE (
  signal TEXT,
  count BIGINT,
  user_reacted BOOLEAN
)
LANGUAGE sql STABLE
AS $$
  SELECT 
    s.signal,
    COUNT(cs.id) AS count,
    BOOL_OR(cs.user_id = auth.uid()) AS user_reacted
  FROM (VALUES ('util'), ('replicar'), ('divulgar'), ('puxo')) AS s(signal)
  LEFT JOIN public.content_signals cs ON cs.signal = s.signal AND cs.content_id = p_content_id
  GROUP BY s.signal;
$$;