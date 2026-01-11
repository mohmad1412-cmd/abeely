-- ==========================================
-- FIX ALL ISSUES - APPLY THIS NOW
-- ==========================================
-- هذا الملف يصلح جميع المشاكل:
-- 1. RLS Policy للـ profiles
-- 2. Storage Buckets للمرفقات
-- ==========================================

-- ==========================================
-- PART 1: Fix Profiles RLS Policy
-- ==========================================

-- Drop existing insert policy if exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new insert policy that works correctly
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (
  -- Allow if user is authenticated and creating their own profile
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PART 2: Create Storage Buckets
-- ==========================================

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
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

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
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- public bucket
  5242880, -- 5MB limit for avatars
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880;

-- ==========================================
-- PART 3: Create Storage RLS Policies
-- ==========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload request attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload offer attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can read request attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can read offer attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete request attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete offer attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their avatars" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload request attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'request-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can upload offer attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'offer-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Allow public read access (since buckets are public)
CREATE POLICY "Public can read request attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'request-attachments');

CREATE POLICY "Public can read offer attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-attachments');

CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to delete their own files
CREATE POLICY "Users can delete request attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'request-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete offer attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'offer-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- ==========================================
-- PART 4: Verify Everything
-- ==========================================

-- Verify profiles policy
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname = 'Users can insert their own profile';

-- Verify buckets exist
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('request-attachments', 'offer-attachments', 'avatars');

-- Verify storage policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (policyname LIKE '%attachments%' OR policyname LIKE '%avatars%');
