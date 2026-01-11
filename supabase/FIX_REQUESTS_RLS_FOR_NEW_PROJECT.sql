-- ==========================================
-- FIX REQUESTS RLS POLICIES - NEW PROJECT
-- ==========================================
-- هذا الملف يصلح RLS policies لجدول requests في المشروع الجديد
-- قم بتطبيقه مباشرة على Supabase Dashboard -> SQL Editor

-- Step 1: Ensure RLS is enabled
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
DROP POLICY IF EXISTS "Anyone can view public requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;
DROP POLICY IF EXISTS "Guests can view public requests" ON requests;

-- Step 3: Create SELECT policy - Anyone can view public requests
CREATE POLICY "Anyone can view public requests"
ON requests FOR SELECT
USING (is_public = true);

-- Step 4: Create INSERT policy - Users can insert their own requests
-- هذا يسمح للمستخدمين المسجلين بإنشاء طلبات
CREATE POLICY "Users can insert their own requests"
ON requests FOR INSERT
WITH CHECK (
  -- Allow if user is authenticated and creating request with their own ID
  auth.uid() IS NOT NULL 
  AND auth.uid() = author_id
);

-- Step 5: Create UPDATE policy - Users can update their own requests
CREATE POLICY "Users can update their own requests"
ON requests FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Step 6: Create DELETE policy - Users can delete their own requests
CREATE POLICY "Users can delete their own requests"
ON requests FOR DELETE
USING (auth.uid() = author_id);

-- Step 7: Verify policies were created
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
WHERE tablename = 'requests'
ORDER BY policyname;

-- Expected result: Should return 4 policies (SELECT, INSERT, UPDATE, DELETE)
