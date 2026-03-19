-- Create storage bucket for evidence images
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidences', 'evidences', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for evidence images
-- Users can upload their own evidence images
CREATE POLICY "Users can upload evidence images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evidences' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view evidence images (public bucket but we add explicit policy)
CREATE POLICY "Anyone can view evidence images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'evidences');

-- Users can update their own evidence images
CREATE POLICY "Users can update own evidence images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'evidences' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own evidence images
CREATE POLICY "Users can delete own evidence images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evidences' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);