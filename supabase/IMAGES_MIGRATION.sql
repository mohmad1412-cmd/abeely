-- إضافة عمود الصور إلى جدول الطلبات
-- يجب تشغيل هذا في Supabase SQL Editor

-- 1. إضافة عمود images إلى جدول requests
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 2. إنشاء index للبحث (اختياري - يحسن الأداء)
CREATE INDEX IF NOT EXISTS idx_requests_images ON requests USING GIN (images);

-- 3. التحقق من وجود عمود images في جدول offers (يجب أن يكون موجوداً)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'offers' AND column_name = 'images'
  ) THEN
    ALTER TABLE offers ADD COLUMN images TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 4. إنشاء index للعروض أيضاً
CREATE INDEX IF NOT EXISTS idx_offers_images ON offers USING GIN (images);

-- ملاحظة: تأكد من أن Supabase Storage buckets موجودة:
-- - request-attachments
-- - offer-attachments
