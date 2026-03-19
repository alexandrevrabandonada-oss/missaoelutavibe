-- Add parent_content_id for template variations
ALTER TABLE public.content_items
ADD COLUMN parent_content_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_content_items_parent ON public.content_items(parent_content_id) WHERE parent_content_id IS NOT NULL;

-- Create index for type + status filtering (for /voluntario/base)
CREATE INDEX idx_content_items_type_status ON public.content_items(type, status);

-- Create index for tags filtering
CREATE INDEX idx_content_items_tags ON public.content_items USING GIN(tags);