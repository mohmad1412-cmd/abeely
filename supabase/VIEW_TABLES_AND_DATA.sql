-- ==========================================
-- View Tables and Data
-- ==========================================
-- هذا الملف يعرض الجداول والبيانات في قاعدة البيانات

-- ==========================================
-- 1. عرض جميع الجداول في schema public
-- ==========================================
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ==========================================
-- 2. عرض بيانات profiles
-- ==========================================
SELECT 
  id,
  display_name,
  email,
  phone,
  role,
  is_guest,
  is_verified,
  created_at,
  updated_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- ==========================================
-- 3. عرض بيانات requests
-- ==========================================
SELECT 
  id,
  title,
  description,
  author_id,
  status,
  is_public,
  location,
  created_at,
  updated_at
FROM requests
ORDER BY created_at DESC
LIMIT 10;

-- ==========================================
-- 4. عرض بيانات offers
-- ==========================================
SELECT 
  id,
  request_id,
  provider_id,
  title,
  price,
  status,
  created_at
FROM offers
ORDER BY created_at DESC
LIMIT 10;

-- ==========================================
-- 5. عرض Storage Buckets
-- ==========================================
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY created_at;

-- ==========================================
-- 6. عرض RLS Policies للـ profiles
-- ==========================================
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
ORDER BY policyname;

-- ==========================================
-- 7. عرض RLS Policies للـ storage.objects
-- ==========================================
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
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY policyname;

-- ==========================================
-- 8. عرض عدد الصفوف في كل جدول
-- ==========================================
SELECT 
  'profiles' as table_name,
  COUNT(*) as row_count
FROM profiles
UNION ALL
SELECT 
  'requests' as table_name,
  COUNT(*) as row_count
FROM requests
UNION ALL
SELECT 
  'offers' as table_name,
  COUNT(*) as row_count
FROM offers
UNION ALL
SELECT 
  'categories' as table_name,
  COUNT(*) as row_count
FROM categories
UNION ALL
SELECT 
  'conversations' as table_name,
  COUNT(*) as row_count
FROM conversations
UNION ALL
SELECT 
  'messages' as table_name,
  COUNT(*) as row_count
FROM messages
UNION ALL
SELECT 
  'notifications' as table_name,
  COUNT(*) as row_count
FROM notifications
ORDER BY table_name;

-- ==========================================
-- 9. عرض آخر الطلبات مع معلومات المؤلف
-- ==========================================
SELECT 
  r.id,
  r.title,
  r.description,
  r.status,
  r.location,
  r.created_at,
  p.display_name as author_name,
  p.email as author_email
FROM requests r
LEFT JOIN profiles p ON r.author_id = p.id
ORDER BY r.created_at DESC
LIMIT 20;

-- ==========================================
-- 10. عرض آخر العروض مع معلومات المزود
-- ==========================================
SELECT 
  o.id,
  o.request_id,
  o.title,
  o.price,
  o.status,
  o.created_at,
  p.display_name as provider_name,
  p.email as provider_email
FROM offers o
LEFT JOIN profiles p ON o.provider_id = p.id
ORDER BY o.created_at DESC
LIMIT 20;

-- ==========================================
-- 11. التحقق من وجود Storage Objects
-- ==========================================
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_size_bytes
FROM storage.objects
GROUP BY bucket_id
ORDER BY bucket_id;

-- ==========================================
-- 12. عرض آخر الملفات المرفوعة
-- ==========================================
SELECT 
  bucket_id,
  name,
  created_at,
  (metadata->>'size')::bigint as size_bytes,
  (metadata->>'mimeType') as mime_type
FROM storage.objects
ORDER BY created_at DESC
LIMIT 20;
