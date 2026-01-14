-- ==========================================
-- إصلاح سياسة INSERT للعروض
-- ==========================================
-- المشكلة: قد لا تكون سياسة INSERT موجودة أو تعمل بشكل صحيح
-- الحل: إضافة سياسة INSERT صريحة للعروض

-- 1. حذف السياسات القديمة للـ INSERT إن وجدت
DROP POLICY IF EXISTS "Users can insert their own offers" ON offers;
DROP POLICY IF EXISTS "Users can create offers" ON offers;
DROP POLICY IF EXISTS "Providers can insert their own offers" ON offers;

-- 2. إنشاء سياسة INSERT جديدة
-- السماح للمستخدمين المسجلين بإنشاء عروض حيث provider_id = auth.uid()
CREATE POLICY "Users can insert their own offers"
ON offers FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = provider_id
);

-- 3. التأكد من أن RLS مفعّل
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ملاحظات:
-- - هذه السياسة تسمح فقط للمستخدمين المسجلين بإنشاء عروض
-- - يجب أن يكون provider_id = auth.uid() (المستخدم لا يمكنه إنشاء عرض باسم مستخدم آخر)
-- ==========================================
