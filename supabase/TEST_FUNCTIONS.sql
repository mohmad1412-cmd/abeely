-- ==========================================
-- ملف اختبار شامل لجميع الـ Functions
-- ==========================================
-- شغّل هذا الملف في Supabase SQL Editor بعد تطبيق FIX_SECURITY_WARNINGS.sql
-- هذا الملف يختبر كل function للتأكد من أنها تعمل بشكل صحيح

-- ==========================================
-- الخطوة 1: التحقق من وجود الـ Functions
-- ==========================================

SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'mark_request_viewed',
    'mark_request_read',
    'get_unread_interests_count',
    'mark_notification_read',
    'mark_all_notifications_read',
    'get_unread_notifications_count',
    'notify_on_new_offer',
    'notify_on_offer_accepted',
    'notify_on_new_message',
    'notify_on_new_interest_request',
    'update_conversation_on_message'
  )
ORDER BY routine_name;

-- يجب أن ترى جميع الـ functions في القائمة
-- ✅ إذا ظهرت كلها = جيد
-- ❌ إذا أي function مفقود = راجع FIX_SECURITY_WARNINGS.sql

-- ==========================================
-- الخطوة 2: التحقق من search_path
-- ==========================================

SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'mark_request_viewed',
    'mark_request_read',
    'get_unread_interests_count',
    'mark_notification_read',
    'mark_all_notifications_read',
    'get_unread_notifications_count'
  )
  AND p.prosecdef = true; -- SECURITY DEFINER functions only

-- ابحث في النتائج عن "SET search_path = public"
-- ✅ إذا ظهر في كل function = جيد
-- ❌ إذا أي function بدون SET search_path = راجع FIX_SECURITY_WARNINGS.sql

-- ==========================================
-- الخطوة 3: اختبار Functions (يحتاج مستخدم مسجل دخول)
-- ==========================================
-- ملاحظة: هذه الاختبارات تحتاج أن تكون مسجل دخول في Supabase
-- استخدم Supabase Auth أو استبدل auth.uid() بـ UUID محدد للاختبار

-- اختبار 1: mark_request_viewed
-- يجب أن يرجع TRUE إذا كان المستخدم مسجل دخول والطلب موجود
-- يجب أن يرجع FALSE إذا كان المستخدم غير مسجل دخول
SELECT mark_request_viewed('00000000-0000-0000-0000-000000000000'::UUID) AS test_result;
-- النتيجة المتوقعة: FALSE (لأن UUID غير موجود)

-- اختبار 2: mark_request_read
SELECT mark_request_read('00000000-0000-0000-0000-000000000000'::UUID) AS test_result;
-- النتيجة المتوقعة: FALSE (لأن UUID غير موجود)

-- اختبار 3: get_unread_interests_count
SELECT get_unread_interests_count() AS unread_count;
-- النتيجة المتوقعة: رقم (0 أو أكثر)

-- اختبار 4: get_unread_notifications_count
SELECT get_unread_notifications_count() AS unread_notifications;
-- النتيجة المتوقعة: رقم (0 أو أكثر)

-- اختبار 5: mark_all_notifications_read
SELECT mark_all_notifications_read() AS marked_count;
-- النتيجة المتوقعة: رقم (عدد الإشعارات التي تم تحديثها)

-- ==========================================
-- الخطوة 4: التحقق من Triggers
-- ==========================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_notify_on_new_offer',
    'trigger_notify_on_offer_accepted',
    'trigger_notify_on_new_message',
    'trigger_notify_on_new_interest_request',
    'trigger_update_conversation_on_message'
  )
ORDER BY event_object_table, trigger_name;

-- يجب أن ترى جميع الـ triggers
-- ✅ إذا ظهرت كلها = جيد
-- ❌ إذا أي trigger مفقود = راجع CREATE_FUNCTIONS_AND_TRIGGERS_V2.sql

-- ==========================================
-- الخطوة 5: التحقق من RLS Policies
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
WHERE schemaname = 'public'
  AND tablename IN (
    'request_views',
    'notifications',
    'conversations',
    'messages'
  )
ORDER BY tablename, policyname;

-- يجب أن ترى policies لكل جدول
-- ✅ إذا ظهرت = جيد
-- ❌ إذا أي جدول بدون policies = راجع CREATE_RLS_POLICIES_V2.sql

-- ==========================================
-- الخطوة 6: التحقق من Realtime
-- ==========================================

SELECT 
  pubname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN (
    'requests',
    'request_views',
    'conversations',
    'messages',
    'notifications'
  )
ORDER BY tablename;

-- يجب أن ترى جميع الجداول في Realtime
-- ✅ إذا ظهرت كلها = جيد
-- ❌ إذا أي جدول مفقود = شغّل ENABLE_REALTIME_FOR_REQUESTS.sql

-- ==========================================
-- الخطوة 7: اختبار Trigger (يدوي - يحتاج بيانات حقيقية)
-- ==========================================
-- هذا الاختبار يحتاج بيانات حقيقية في قاعدة البيانات

-- اختبار trigger_notify_on_new_offer:
-- 1. أنشئ طلب (request) بمستخدم معين
-- 2. أنشئ عرض (offer) على هذا الطلب من مستخدم آخر
-- 3. تحقق من وجود إشعار في جدول notifications للمستخدم الأول

-- مثال (استبدل UUIDs بقيم حقيقية):
/*
INSERT INTO offers (request_id, provider_id, provider_name, title, description, price)
VALUES (
  'request-uuid-here'::UUID,
  'provider-uuid-here'::UUID,
  'اسم المزود',
  'عنوان العرض',
  'وصف العرض',
  1000
);

-- ثم تحقق من الإشعار:
SELECT * FROM notifications 
WHERE user_id = 'request-owner-uuid-here'::UUID
ORDER BY created_at DESC
LIMIT 1;
*/

-- ==========================================
-- ملخص الاختبارات
-- ==========================================
-- ✅ الخطوة 1: جميع الـ Functions موجودة
-- ✅ الخطوة 2: جميع الـ Functions لديها SET search_path
-- ✅ الخطوة 3: جميع الـ Functions تعمل بدون أخطاء
-- ✅ الخطوة 4: جميع الـ Triggers موجودة
-- ✅ الخطوة 5: جميع الـ RLS Policies موجودة
-- ✅ الخطوة 6: Realtime مفعّل على جميع الجداول
-- ✅ الخطوة 7: Triggers تعمل بشكل صحيح (اختبار يدوي)

