-- Migration: Create user_ratings table with auto-update trigger
-- Created: 2026-01-10

-- =========================================
-- جدول إحصائيات التقييمات لكل مستخدم
-- =========================================

CREATE TABLE IF NOT EXISTS user_ratings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  average_rating NUMERIC(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  five_star_count INTEGER DEFAULT 0,
  four_star_count INTEGER DEFAULT 0,
  three_star_count INTEGER DEFAULT 0,
  two_star_count INTEGER DEFAULT 0,
  one_star_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- الفهارس للأداء
-- =========================================

CREATE INDEX IF NOT EXISTS idx_user_ratings_average ON user_ratings(average_rating DESC);

-- =========================================
-- دالة تحديث الإحصائيات تلقائياً
-- =========================================

CREATE OR REPLACE FUNCTION update_user_ratings()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- تحديد المستخدم المستهدف
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD.reviewee_id;
  ELSE
    target_user_id := NEW.reviewee_id;
  END IF;
  
  -- إدراج أو تحديث الإحصائيات
  INSERT INTO user_ratings (
    user_id,
    average_rating,
    total_reviews,
    five_star_count,
    four_star_count,
    three_star_count,
    two_star_count,
    one_star_count,
    updated_at
  )
  SELECT 
    target_user_id,
    COALESCE(AVG(rating)::NUMERIC(3,2), 0.00),
    COUNT(*),
    COUNT(*) FILTER (WHERE rating = 5),
    COUNT(*) FILTER (WHERE rating = 4),
    COUNT(*) FILTER (WHERE rating = 3),
    COUNT(*) FILTER (WHERE rating = 2),
    COUNT(*) FILTER (WHERE rating = 1),
    NOW()
  FROM reviews
  WHERE reviewee_id = target_user_id
  ON CONFLICT (user_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_reviews = EXCLUDED.total_reviews,
    five_star_count = EXCLUDED.five_star_count,
    four_star_count = EXCLUDED.four_star_count,
    three_star_count = EXCLUDED.three_star_count,
    two_star_count = EXCLUDED.two_star_count,
    one_star_count = EXCLUDED.one_star_count,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- Trigger لتحديث الإحصائيات عند أي تغيير في reviews
-- =========================================

DROP TRIGGER IF EXISTS trigger_update_user_ratings ON reviews;
CREATE TRIGGER trigger_update_user_ratings
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ratings();

-- =========================================
-- تعليقات
-- =========================================

COMMENT ON TABLE user_ratings IS 'جدول إحصائيات التقييمات لكل مستخدم - يحدث تلقائياً';
COMMENT ON FUNCTION update_user_ratings IS 'دالة لتحديث إحصائيات التقييمات تلقائياً عند أي تغيير';
