-- ==========================================
-- APPLY REQUESTS RLS POLICIES ONLY
-- ==========================================
-- هذا الملف يطبق RLS Policies فقط لجدول requests
-- استخدمه إذا كنت متأكداً أن جدول requests موجود
-- ==========================================

-- Step 1: Ensure RLS is enabled
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (if any)
DROP POLICY IF EXISTS "Anyone can view public requests" ON requests;
DROP POLICY IF EXISTS "Public requests are viewable by everyone" ON requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;
DROP POLICY IF EXISTS "Users can view all requests" ON requests;

-- Step 3: Create SELECT policies
-- Policy 1: Anyone can view public requests
CREATE POLICY "Public requests are viewable by everyone"
ON requests FOR SELECT
USING (is_public = true);

-- Policy 2: Users can view their own requests (even if not public)
CREATE POLICY "Users can view their own requests"
ON requests FOR SELECT
USING (auth.uid() = author_id);

-- Step 4: Create INSERT policy
-- Users can insert their own requests
CREATE POLICY "Users can insert their own requests"
ON requests FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = author_id
);

-- Step 5: Create UPDATE policy
CREATE POLICY "Users can update their own requests"
ON requests FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Step 6: Create DELETE policy
CREATE POLICY "Users can delete their own requests"
ON requests FOR DELETE
USING (auth.uid() = author_id);

-- Step 7: Verify policies were created
SELECT 
  'requests' as table_name,
  policyname,
  cmd,
  CASE 
    WHEN with_check IS NOT NULL THEN with_check::text
    ELSE qual::text
  END as policy_condition
FROM pg_policies 
WHERE tablename = 'requests'
ORDER BY cmd, policyname;

-- Expected result: Should return 5 policies:
-- 1. SELECT: "Public requests are viewable by everyone"
-- 2. SELECT: "Users can view their own requests"
-- 3. INSERT: "Users can insert their own requests"
-- 4. UPDATE: "Users can update their own requests"
-- 5. DELETE: "Users can delete their own requests"
