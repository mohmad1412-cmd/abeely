-- ==========================================
-- CHECK REQUESTS TABLE RLS POLICIES
-- ==========================================
-- هذا الملف للتحقق من RLS Policies لجدول requests

-- التحقق من RLS Policies لجدول requests
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

-- التحقق من حالة RLS (مفعّل أم لا)
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'requests' 
  AND schemaname = 'public';

-- التحقق من وجود جدول requests
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'requests'
ORDER BY ordinal_position;
