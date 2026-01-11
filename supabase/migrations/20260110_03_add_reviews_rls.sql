-- Migration: Add RLS policies for reviews table
-- Created: 2026-01-10

-- =========================================
-- تفعيل RLS على جدول reviews
-- =========================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- =========================================
-- Policy: الجميع يمكنهم قراءة المراجعات
-- =========================================

DROP POLICY IF EXISTS "reviews_select_policy" ON reviews;
CREATE POLICY "reviews_select_policy" ON reviews
  FOR SELECT
  USING (true);

-- =========================================
-- Policy: إنشاء تقييم - فقط للطلبات المكتملة
-- =========================================

DROP POLICY IF EXISTS "reviews_insert_policy" ON reviews;
CREATE POLICY "reviews_insert_policy" ON reviews
  FOR INSERT
  WITH CHECK (
    -- المستخدم هو من يكتب التقييم
    auth.uid() = reviewer_id
    AND
    -- الطلب مكتمل
    EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = request_id
      AND r.status = 'completed'
    )
    AND
    -- المستخدم مشارك في الطلب (صاحب الطلب أو مقدم العرض المقبول)
    (
      EXISTS (
        SELECT 1 FROM requests r
        WHERE r.id = request_id
        AND r.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM offers o
        INNER JOIN requests r ON r.id = o.request_id
        WHERE o.request_id = reviews.request_id
        AND o.provider_id = auth.uid()
        AND o.status = 'accepted'
      )
    )
    AND
    -- لم يقيم هذا الطلب من قبل
    NOT EXISTS (
      SELECT 1 FROM reviews rv
      WHERE rv.request_id = reviews.request_id
      AND rv.reviewer_id = auth.uid()
    )
  );

-- =========================================
-- Policy: تعديل تقييم - خلال 24 ساعة فقط
-- =========================================

DROP POLICY IF EXISTS "reviews_update_policy" ON reviews;
CREATE POLICY "reviews_update_policy" ON reviews
  FOR UPDATE
  USING (
    auth.uid() = reviewer_id
    AND created_at > NOW() - INTERVAL '24 hours'
  )
  WITH CHECK (
    auth.uid() = reviewer_id
    AND created_at > NOW() - INTERVAL '24 hours'
  );

-- =========================================
-- Policy: حذف تقييم - فقط منشئ التقييم
-- =========================================

DROP POLICY IF EXISTS "reviews_delete_policy" ON reviews;
CREATE POLICY "reviews_delete_policy" ON reviews
  FOR DELETE
  USING (auth.uid() = reviewer_id);

-- =========================================
-- RLS على جدول user_ratings
-- =========================================

ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_ratings_select_policy" ON user_ratings;
CREATE POLICY "user_ratings_select_policy" ON user_ratings
  FOR SELECT
  USING (true);

-- فقط النظام يمكنه تعديل الإحصائيات (عبر trigger)
-- لا نحتاج policies للـ INSERT/UPDATE/DELETE لأن الـ trigger يعمل بـ SECURITY DEFINER
