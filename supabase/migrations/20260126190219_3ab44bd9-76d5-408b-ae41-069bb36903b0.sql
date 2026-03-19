-- Create assets table for Fábrica material management
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'image', -- image, video, document, audio, other
  bucket TEXT NOT NULL DEFAULT 'assets-public',
  path TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, PUBLISHED, ARCHIVED
  thumb_path TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone can view published assets
CREATE POLICY "Published assets are viewable by everyone"
ON public.assets
FOR SELECT
USING (status = 'PUBLISHED');

-- Authenticated users can view their own drafts
CREATE POLICY "Users can view their own assets"
ON public.assets
FOR SELECT
USING (auth.uid() = created_by);

-- Authenticated users can create assets
CREATE POLICY "Authenticated users can create assets"
ON public.assets
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update their own assets
CREATE POLICY "Users can update their own assets"
ON public.assets
FOR UPDATE
USING (auth.uid() = created_by);

-- Admins can do everything (check admins table)
CREATE POLICY "Admins can manage all assets"
ON public.assets
FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
);

-- Create updated_at trigger
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_assets_status ON public.assets(status);
CREATE INDEX idx_assets_kind ON public.assets(kind);
CREATE INDEX idx_assets_tags ON public.assets USING GIN(tags);
CREATE INDEX idx_assets_created_by ON public.assets(created_by);

-- Create assets-public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets-public', 'assets-public', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for assets-public bucket
CREATE POLICY "Anyone can view assets-public files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'assets-public');

CREATE POLICY "Authenticated users can upload to assets-public"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'assets-public' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own files in assets-public"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'assets-public' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files in assets-public"
ON storage.objects
FOR DELETE
USING (bucket_id = 'assets-public' AND auth.uid()::text = (storage.foldername(name))[1]);