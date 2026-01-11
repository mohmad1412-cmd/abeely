-- Migration: Create reviews table
-- Created: 2026-01-10

-- =========================================
-- جدول المراجعات والتقييمات
-- =========================================

-- حذف الجدول إذا كان موجوداً (لإصلاح أي إنشاء جزئي سابق)
DROP TABLE IF EXISTS reviews CASCADE;

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- كل مستخدم يقيم طلب مرة واحدة فقط
  UNIQUE(request_id, reviewer_id)
);

-- =========================================
-- الفهارس للأداء
-- =========================================

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_request_id ON reviews(request_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- =========================================
-- تعليقات على الجدول
-- =========================================

COMMENT ON TABLE reviews IS 'جدول المراجعات والتقييمات للمستخدمين';
COMMENT ON COLUMN reviews.request_id IS 'معرف الطلب المرتبط بالتقييم';
COMMENT ON COLUMN reviews.reviewer_id IS 'معرف المستخدم الذي كتب التقييم';
COMMENT ON COLUMN reviews.reviewee_id IS 'معرف المستخدم الذي تلقى التقييم';
COMMENT ON COLUMN reviews.rating IS 'التقييم من 1 إلى 5 نجوم';
COMMENT ON COLUMN reviews.comment IS 'التعليق النصي (اختياري)';
