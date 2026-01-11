-- ==========================================
-- FIX PROFILES RLS POLICY - APPLY THIS NOW
-- ==========================================
-- هذا الملف يصلح مشكلة RLS التي تمنع إنشاء profile
-- قم بتطبيقه مباشرة على قاعدة البيانات

-- Step 1: Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Step 2: Create new insert policy that works correctly
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (
  -- Allow if user is authenticated and creating their own profile
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Step 3: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname = 'Users can insert their own profile';

-- Expected result: Should return one row with the policy details
