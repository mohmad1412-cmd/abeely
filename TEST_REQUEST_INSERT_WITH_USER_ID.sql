-- ==========================================
-- TEST REQUEST INSERT (With User ID from Console)
-- ==========================================
-- هذا الملف يختبر INSERT باستخدام user.id من Console
-- ==========================================
-- الخطوة 1: احصل على user.id من Console
-- ==========================================
-- افتح Console (F12) في المتصفح وانسخ والصق:
-- const { data: { user } } = await supabase.auth.getUser();
-- console.log("User ID:", user?.id);
-- ==========================================
-- الخطوة 2: استبدل 'PASTE_USER_ID_HERE' أدناه بـ user.id
-- ==========================================

-- التحقق من أن User ID صحيح
SELECT 
  'PASTE_USER_ID_HERE'::uuid as user_id_to_use,
  CASE 
    WHEN 'PASTE_USER_ID_HERE'::uuid IS NULL THEN '❌ User ID is NULL!'
    ELSE '✅ User ID is valid UUID'
  END as validation;

-- محاولة INSERT مع User ID
INSERT INTO requests (
  author_id,
  title,
  description,
  status,
  is_public,
  location
) VALUES (
  'PASTE_USER_ID_HERE'::uuid,  -- استبدل بـ user.id من Console
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
    WHEN author_id = 'PASTE_USER_ID_HERE'::uuid THEN '✅ author_id matches user.id'
    ELSE '❌ author_id does NOT match user.id'
  END as verification;

-- ==========================================
-- النتائج المتوقعة:
-- ==========================================
-- 1. validation: يجب أن يكون "✅ User ID is valid UUID"
-- 2. INSERT: يجب أن ينجح ويعيد id جديد
-- 3. verification: يجب أن يكون "✅ author_id matches user.id"
-- ==========================================
-- إذا فشل INSERT مع خطأ "permission" أو "policy":
-- ==========================================
-- المشكلة في RLS Policies
-- شغّل FIX_ALL_RLS_NOW.sql مرة أخرى
-- ==========================================
-- إذا نجح INSERT:
-- ==========================================
-- RLS Policies تعمل بشكل صحيح!
-- المشكلة في الكود (author_id لا يتم تعيينه في التطبيق)
-- ==========================================
