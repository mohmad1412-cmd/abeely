-- ==========================================
-- إصلاح سياسات RLS لجدول requests للسماح للضيوف بالقراءة
-- ==========================================
-- شغّل هذا الملف في Supabase SQL Editor

-- تفعيل RLS على جدول requests (إذا لم يكن مفعّل)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إذا وجدت
DROP POLICY IF EXISTS "Anyone can view public requests" ON requests;
DROP POLICY IF EXISTS "Public requests are viewable by everyone" ON requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON requests;

-- ==========================================
-- سياسة القراءة: الجميع يمكنهم رؤية الطلبات العامة
-- ==========================================
-- هذه السياسة تسمح للضيوف (بدون تسجيل دخول) بقراءة الطلبات العامة
CREATE POLICY "Public requests are viewable by everyone"
ON requests FOR SELECT
USING (is_public = true);

-- ==========================================
-- سياسة القراءة: المستخدمون يمكنهم رؤية طلباتهم الخاصة (حتى لو ليست عامة)
-- ==========================================
CREATE POLICY "Users can view their own requests"
ON requests FOR SELECT
USING (auth.uid() = author_id);

-- ==========================================
-- سياسة الإدراج: المستخدمون المسجلون فقط يمكنهم إنشاء طلبات
-- ==========================================
CREATE POLICY "Users can insert their own requests"
ON requests FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- ==========================================
-- سياسة التحديث: المستخدمون يمكنهم تحديث طلباتهم فقط
-- ==========================================
CREATE POLICY "Users can update their own requests"
ON requests FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- ==========================================
-- سياسة الحذف: المستخدمون يمكنهم حذف طلباتهم فقط (اختياري)
-- ==========================================
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;
CREATE POLICY "Users can delete their own requests"
ON requests FOR DELETE
USING (auth.uid() = author_id);

-- ==========================================
-- التحقق من نجاح التطبيق
-- ==========================================
-- بعد تشغيل هذا الملف، يمكنك التحقق بتشغيل:
-- SELECT * FROM pg_policies WHERE tablename = 'requests';

