-- ==========================================
-- Fix Profiles RLS Policy for INSERT
-- ==========================================
-- المشكلة: RLS policy تمنع إنشاء profile جديد
-- الحل: السماح للمستخدمين المسجلين دخولاً بإنشاء profile خاص بهم

-- Drop existing insert policy if exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create new insert policy that allows authenticated users to create their own profile
-- This policy allows INSERT when:
-- 1. User is authenticated (auth.uid() IS NOT NULL)
-- 2. The id in the profile matches the authenticated user's id (auth.uid() = id)
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (
  -- Allow if user is authenticated and creating their own profile
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- Also ensure the policy allows upsert operations
-- Note: upsert uses INSERT internally, so the above policy should work
-- But we'll add a comment to clarify
COMMENT ON POLICY "Users can insert their own profile" ON profiles IS 
'السماح للمستخدمين المسجلين دخولاً بإنشاء ملفهم الشخصي. يعمل مع INSERT و UPSERT.';

-- Verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
