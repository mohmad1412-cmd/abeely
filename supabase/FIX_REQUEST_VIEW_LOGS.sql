-- ==========================================
-- إصلاح جدول request_view_logs
-- ==========================================
-- المشكلة: خطأ 'record "new" has no field "updated_at"'
-- السبب: هناك trigger يحاول تحديث updated_at لكن الجدول لا يحتوي على هذا العمود

-- الخطوة 1: إضافة عمود updated_at إلى الجدول
ALTER TABLE request_view_logs 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- الخطوة 2: تحديث القيم الموجودة
UPDATE request_view_logs 
SET updated_at = COALESCE(created_at, NOW())
WHERE updated_at IS NULL;

-- الخطوة 3: التحقق من وجود trigger على الجدول
-- (للمعلومات فقط - يمكنك تشغيل هذا الاستعلام)
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'request_view_logs';

-- الخطوة 4: إذا كان هناك trigger غير مطلوب، يمكن حذفه:
DROP TRIGGER IF EXISTS update_request_view_logs_updated_at ON request_view_logs;
DROP TRIGGER IF EXISTS trigger_update_request_view_logs ON request_view_logs;
DROP TRIGGER IF EXISTS set_updated_at ON request_view_logs;

-- ملاحظة: الآن مع وجود عمود updated_at، أي trigger موجود سيعمل بشكل صحيح
-- لا نحتاج trigger جديد لأن الجدول يُستخدم فقط للقراءة والتتبع

DO $$
BEGIN
  RAISE NOTICE '✅ تم إصلاح جدول request_view_logs بنجاح!';
  RAISE NOTICE '📝 تم إضافة عمود updated_at';
END $$;

