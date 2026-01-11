-- ==========================================
-- VERIFY RLS POLICIES ARE APPLIED
-- ==========================================
-- هذا الملف للتحقق من أن RLS Policies تم تطبيقها بشكل صحيح
-- ==========================================

-- 1. التحقق من RLS مفعل على requests
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'requests';

-- 2. عرض جميع RLS Policies لجدول requests
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'requests'
ORDER BY cmd, policyname;

-- 3. التحقق من RLS مفعل على profiles
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- 4. عرض جميع RLS Policies لجدول profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- 5. التحقق من وجود جدول requests والأعمدة المطلوبة
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'requests'
  AND column_name IN ('id', 'author_id', 'title', 'description', 'status', 'is_public')
ORDER BY ordinal_position;

-- 6. التحقق من أن author_id موجود وليس NULL
SELECT 
  COUNT(*) as total_requests,
  COUNT(author_id) as requests_with_author_id,
  COUNT(*) - COUNT(author_id) as requests_without_author_id
FROM requests;

-- ==========================================
-- EXPECTED RESULTS:
-- ==========================================
-- 1. requests.rls_enabled = true
-- 2. يجب أن يكون هناك 5 policies على requests:
--    - SELECT: "Public requests are viewable by everyone"
--    - SELECT: "Users can view their own requests"
--    - INSERT: "Users can insert their own requests"
--    - UPDATE: "Users can update their own requests"
--    - DELETE: "Users can delete their own requests"
-- 3. profiles.rls_enabled = true
-- 4. يجب أن يكون هناك 4 policies على profiles:
--    - SELECT: "Users can view their own profile"
--    - SELECT: "Public profiles are viewable by everyone"
--    - INSERT: "Users can insert their own profile"
--    - UPDATE: "Users can update their own profile"
-- 5. جميع الأعمدة المطلوبة موجودة
-- 6. جميع الطلبات يجب أن يكون لها author_id
