-- ==========================================
-- TEST REQUEST INSERT (Automatic - Uses auth.uid())
-- ==========================================
-- هذا الملف يختبر INSERT تلقائياً باستخدام auth.uid()
-- لا حاجة لاستبدال أي شيء - يعمل مباشرة!
-- ==========================================

-- التحقق من أن المستخدم مسجل دخول
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ المستخدم غير مسجل دخول!'
    ELSE '✅ المستخدم مسجل دخول'
  END as status;

-- محاولة INSERT مع auth.uid() مباشرة
-- هذا يعمل فقط إذا كان المستخدم مسجل دخول في Supabase Dashboard
INSERT INTO requests (
  author_id,
  title,
  description,
  status,
  is_public,
  location
) VALUES (
  auth.uid(),  -- يستخدم user.id تلقائياً
  'Test Request - ' || to_char(now(), 'HH24:MI:SS'),
  'Test Description - This is a test request to verify RLS policies',
  'active',
  true,
  'Test Location'
) RETURNING 
  id, 
  author_id, 
  title, 
  created_at,
  CASE 
    WHEN author_id = auth.uid() THEN '✅ author_id matches auth.uid()'
    ELSE '❌ author_id does NOT match auth.uid()'
  END as verification;

-- ==========================================
-- النتائج المتوقعة:
-- ==========================================
-- 1. current_user_id: يجب أن يكون UUID (ليس null)
-- 2. INSERT: يجب أن ينجح ويعيد id جديد
-- 3. verification: يجب أن يكون "✅ author_id matches auth.uid()"
-- ==========================================
-- إذا فشل INSERT:
-- ==========================================
-- المشكلة في RLS Policies
-- شغّل FIX_ALL_RLS_NOW.sql مرة أخرى
-- ==========================================
-- إذا نجح INSERT:
-- ==========================================
-- RLS Policies تعمل بشكل صحيح!
-- المشكلة في الكود (author_id لا يتم تعيينه في التطبيق)
-- ==========================================
