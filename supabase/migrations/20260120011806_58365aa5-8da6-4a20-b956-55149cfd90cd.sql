-- Create RLS policies for evidences bucket storage
-- Users can upload their own evidence files
CREATE POLICY "Users can upload own evidence"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'evidences' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own evidence files
CREATE POLICY "Users can view own evidence"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'evidences' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own evidence files
CREATE POLICY "Users can delete own evidence"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'evidences' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access for approved evidences (since bucket is public)
CREATE POLICY "Public can view evidence files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'evidences');