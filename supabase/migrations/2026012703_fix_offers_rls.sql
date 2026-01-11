-- ==========================================
-- إصلاح سياسات الأمان (RLS) لجدول العروض (offers)
-- ==========================================

-- 1. السماح لصاحب الطلب برؤية العروض المقدمة على طلبه
DROP POLICY IF EXISTS "Request authors can view offers on their requests" ON offers;
CREATE POLICY "Request authors can view offers on their requests"
ON offers FOR SELECT
USING (
  -- المستخدم الحالي هو صاحب الطلب المرتبط بالعرض
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = offers.request_id
    AND requests.author_id = auth.uid()
  )
);

-- 2. السماح لمقدم العرض برؤية عروضه الخاصة
DROP POLICY IF EXISTS "Providers can view their own offers" ON offers;
CREATE POLICY "Providers can view their own offers"
ON offers FOR SELECT
USING (
  provider_id = auth.uid()
);

-- 3. السماح لمقدم العرض بتعديل عروضه (مثلاً تغيير السعر أو الحالة أثناء التفاوض)
DROP POLICY IF EXISTS "Providers can update their own offers" ON offers;
CREATE POLICY "Providers can update their own offers"
ON offers FOR UPDATE
USING (
  provider_id = auth.uid()
)
WITH CHECK (
  provider_id = auth.uid()
);

-- 4. السماح لمقدم العرض بحذف عروضه (إذا كانت pending)
DROP POLICY IF EXISTS "Providers can delete their own pending offers" ON offers;
CREATE POLICY "Providers can delete their own pending offers"
ON offers FOR DELETE
USING (
  provider_id = auth.uid()
  AND status = 'pending'
);

-- ==========================================
-- تعليقات توضيحية
-- ==========================================
COMMENT ON POLICY "Request authors can view offers on their requests" ON offers IS 'السماح لصاحب الطلب برؤية العروض المقدمة له';
COMMENT ON POLICY "Providers can view their own offers" ON offers IS 'السماح لمقدم الخدمة برؤية عروضه';
