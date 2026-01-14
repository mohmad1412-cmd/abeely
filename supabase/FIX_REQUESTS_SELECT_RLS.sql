-- ==========================================
-- FIX REQUESTS RLS - CORRECT SELECT POLICY
-- ==========================================
-- هذا الملف يصلح RLS policy للـ SELECT لجدول requests
-- المشكلة: المستخدم يستطيع رؤية جميع الطلبات العامة فقط
-- الحل: المستخدم يستطيع رؤية:
--   1. طلباته الخاصة (author_id = uid)
--   2. الطلبات العامة للآخرين (is_public = true)

-- Step 1: Drop the old SELECT policy
DROP POLICY IF EXISTS "Anyone can view public requests" ON requests;
DROP POLICY IF EXISTS "Users can view own and public requests" ON requests;

-- Step 2: Create the correct SELECT policy
-- المستخدم يستطيع رؤية:
-- 1. طلباته (author_id = auth.uid())
-- 2. أو الطلبات العامة (is_public = true)
CREATE POLICY "Users can view own and public requests"
ON requests FOR SELECT
USING (
  author_id = auth.uid()
  OR 
  is_public = true
);

-- Step 3: Add policy for guests to view public requests
DROP POLICY IF EXISTS "Guests can view public requests" ON requests;
CREATE POLICY "Guests can view public requests"
ON requests FOR SELECT
TO anon
USING (is_public = true);

-- Step 4: Verify the new policies
SELECT 
  policyname,
  cmd,
  roles,
  qual::text as condition
FROM pg_policies 
WHERE tablename = 'requests'
ORDER BY policyname;

-- ==========================================
-- IMPORTANT: Run this SQL in Supabase Dashboard -> SQL Editor
-- ==========================================
