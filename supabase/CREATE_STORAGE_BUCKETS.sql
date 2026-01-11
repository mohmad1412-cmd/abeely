-- ==========================================
-- Create Storage Buckets for Attachments
-- ==========================================
-- هذا الملف ينشئ الـ storage buckets المطلوبة للمرفقات

-- Create request-attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-attachments',
  'request-attachments',
  true, -- public bucket so files can be accessed via URL
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create offer-attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'offer-attachments',
  'offer-attachments',
  true, -- public bucket
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- public bucket
  5242880, -- 5MB limit for avatars
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for storage buckets
-- Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Users can upload request attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'request-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY IF NOT EXISTS "Users can upload offer attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'offer-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY IF NOT EXISTS "Users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access (since buckets are public)
CREATE POLICY IF NOT EXISTS "Public can read request attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'request-attachments');

CREATE POLICY IF NOT EXISTS "Public can read offer attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-attachments');

CREATE POLICY IF NOT EXISTS "Public can read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to delete their own files
CREATE POLICY IF NOT EXISTS "Users can delete request attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'request-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY IF NOT EXISTS "Users can delete offer attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'offer-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY IF NOT EXISTS "Users can delete their avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);
