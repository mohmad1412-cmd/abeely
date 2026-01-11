-- ==========================================
-- TEST REQUEST INSERT (Manual Test)
-- ==========================================
-- هذا الملف لاختبار INSERT يدوياً في Supabase
-- استخدمه للتحقق من أن RLS Policies تعمل بشكل صحيح
-- ==========================================

-- الخطوة 1: الحصول على User ID من auth.users
-- استبدل 'YOUR_EMAIL' بـ email المستخدم الحالي
SELECT id, email 
FROM auth.users 
WHERE email = 'YOUR_EMAIL'
LIMIT 1;

-- الخطوة 2: محاولة INSERT مع User ID الحقيقي
-- استبدل 'USER_ID_FROM_STEP_1' بـ ID من الخطوة 1
-- استبدل 'YOUR_USER_ID' بـ user.id من Console
INSERT INTO requests (
  author_id,
  title,
  description,
  status,
  is_public,
  location
) VALUES (
  'YOUR_USER_ID',  -- استبدل بـ user.id من Console
  'Test Request',
  'Test Description',
  'active',
  true,
  'Test Location'
) RETURNING id, author_id, title, created_at;

-- ==========================================
-- إذا نجح INSERT أعلاه:
-- ==========================================
-- المشكلة ليست في RLS Policies
-- المشكلة في الكود (author_id لا يتم تعيينه بشكل صحيح)

-- ==========================================
-- إذا فشل INSERT أعلاه:
-- ==========================================
-- المشكلة في RLS Policies
-- شغّل FIX_ALL_RLS_NOW.sql مرة أخرى
