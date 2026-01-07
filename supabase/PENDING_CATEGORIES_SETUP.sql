-- ==========================================
-- إعداد تصنيف "غير محدد" والتصنيفات المقترحة
-- ==========================================
-- هذا الملف يُنشئ:
-- 1. إضافة تصنيف "غير محدد" الثابت
-- 2. جدول التصنيفات المقترحة (pending_categories)
-- 3. Functions للتحقق من التصنيفات واقتراح تصنيفات جديدة
-- ==========================================

-- ==========================================
-- الجزء 1: إضافة تصنيف "غير محدد" الثابت
-- ==========================================

-- إضافة تصنيف "غير محدد" كتصنيف ثابت (sort_order = 0 ليظهر أولاً أو 999 ليظهر أخيراً)
INSERT INTO categories (id, label, emoji, description, is_active, sort_order) VALUES
  ('unspecified', 'غير محدد', '❓', 'طلبات لم يتم تحديد تصنيفها بعد أو تحتاج مراجعة', TRUE, 999)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ==========================================
-- الجزء 2: جدول التصنيفات المقترحة
-- ==========================================

-- إنشاء جدول التصنيفات المقترحة (بانتظار الموافقة)
CREATE TABLE IF NOT EXISTS pending_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_label TEXT NOT NULL,
  suggested_emoji TEXT DEFAULT '📦',
  suggested_description TEXT,
  suggested_by_ai BOOLEAN DEFAULT TRUE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  merged_with_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_pending_categories_status ON pending_categories(status);
CREATE INDEX IF NOT EXISTS idx_pending_categories_created ON pending_categories(created_at DESC);

-- ==========================================
-- الجزء 3: RLS للتصنيفات المقترحة
-- ==========================================

ALTER TABLE pending_categories ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة التصنيفات المقترحة (للشفافية)
DROP POLICY IF EXISTS "Anyone can view pending categories" ON pending_categories;
CREATE POLICY "Anyone can view pending categories" ON pending_categories
  FOR SELECT USING (TRUE);

-- السماح بإنشاء تصنيفات مقترحة (للـ Edge Functions)
DROP POLICY IF EXISTS "Service role can manage pending categories" ON pending_categories;
CREATE POLICY "Service role can manage pending categories" ON pending_categories
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ==========================================
-- الجزء 4: Function للتحقق من وجود تصنيف مشابه
-- ==========================================

-- Function للبحث عن تصنيفات مشابهة (باستخدام التشابه النصي)
CREATE OR REPLACE FUNCTION find_similar_categories(p_label TEXT)
RETURNS TABLE (
  id TEXT,
  label TEXT,
  emoji TEXT,
  similarity_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.label,
    c.emoji,
    -- حساب درجة التشابه بعدة طرق
    GREATEST(
      -- التطابق المباشر
      CASE WHEN LOWER(c.label) = LOWER(p_label) THEN 1.0 ELSE 0.0 END,
      -- التضمين (الـ label المطلوب موجود داخل تصنيف موجود)
      CASE WHEN LOWER(c.label) LIKE '%' || LOWER(p_label) || '%' THEN 0.8 ELSE 0.0 END,
      -- التضمين العكسي
      CASE WHEN LOWER(p_label) LIKE '%' || LOWER(c.label) || '%' THEN 0.7 ELSE 0.0 END,
      -- مقارنة الكلمات
      (
        SELECT COUNT(*)::FLOAT / GREATEST(
          ARRAY_LENGTH(REGEXP_SPLIT_TO_ARRAY(LOWER(p_label), '\s+'), 1),
          ARRAY_LENGTH(REGEXP_SPLIT_TO_ARRAY(LOWER(c.label), '\s+'), 1)
        )
        FROM unnest(REGEXP_SPLIT_TO_ARRAY(LOWER(p_label), '\s+')) AS word
        WHERE LOWER(c.label) LIKE '%' || word || '%'
      )
    ) as similarity_score
  FROM categories c
  WHERE c.is_active = TRUE
  ORDER BY similarity_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- الجزء 5: Function لاقتراح تصنيف جديد
-- ==========================================

CREATE OR REPLACE FUNCTION suggest_new_category(
  p_label TEXT,
  p_emoji TEXT DEFAULT '📦',
  p_description TEXT DEFAULT NULL,
  p_request_id UUID DEFAULT NULL
)
RETURNS TABLE (
  action TEXT,
  category_id TEXT,
  category_label TEXT,
  pending_category_id UUID
) AS $$
DECLARE
  v_similar RECORD;
  v_new_pending_id UUID;
BEGIN
  -- البحث عن تصنيف مشابه
  SELECT * INTO v_similar
  FROM find_similar_categories(p_label)
  WHERE similarity_score >= 0.6
  LIMIT 1;
  
  IF v_similar IS NOT NULL THEN
    -- وجدنا تصنيف مشابه، نستخدمه
    RETURN QUERY SELECT 
      'use_existing'::TEXT,
      v_similar.id::TEXT,
      v_similar.label::TEXT,
      NULL::UUID;
  ELSE
    -- لم نجد تصنيف مشابه، نضيف للمقترحات
    INSERT INTO pending_categories (suggested_label, suggested_emoji, suggested_description, request_id)
    VALUES (p_label, p_emoji, p_description, p_request_id)
    RETURNING id INTO v_new_pending_id;
    
    RETURN QUERY SELECT 
      'pending_approval'::TEXT,
      'unspecified'::TEXT, -- نستخدم "غير محدد" مؤقتاً
      'غير محدد'::TEXT,
      v_new_pending_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- الجزء 6: Function لضمان تصنيف للطلب
-- ==========================================

-- Function لضمان وجود تصنيف "غير محدد" على الأقل
CREATE OR REPLACE FUNCTION ensure_request_has_category(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
  v_category_count INTEGER;
BEGIN
  -- عد التصنيفات الحالية للطلب
  SELECT COUNT(*) INTO v_category_count
  FROM request_categories
  WHERE request_id = p_request_id;
  
  -- إذا لم يكن هناك تصنيفات، أضف "غير محدد"
  IF v_category_count = 0 THEN
    INSERT INTO request_categories (request_id, category_id)
    VALUES (p_request_id, 'unspecified')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- الجزء 7: Trigger لضمان تصنيف تلقائي
-- ==========================================

-- حذف الـ trigger القديم إن وجد
DROP TRIGGER IF EXISTS trigger_ensure_category ON requests;
DROP FUNCTION IF EXISTS auto_assign_unspecified_category() CASCADE;

-- Function للـ Trigger
CREATE OR REPLACE FUNCTION auto_assign_unspecified_category()
RETURNS TRIGGER AS $$
BEGIN
  -- ننتظر قليلاً للسماح بإضافة التصنيفات الأخرى (مؤجل)
  -- سيتم التحقق عند الاستعلام
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- الجزء 8: Function للحصول على التصنيفات مع أسمائها العربية
-- ==========================================

CREATE OR REPLACE FUNCTION get_categories_for_ai()
RETURNS TABLE (
  id TEXT,
  label TEXT,
  keywords TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.label,
    -- كلمات مفتاحية للمساعدة في المطابقة
    CASE c.id
      WHEN 'tech' THEN ARRAY['برمجة', 'تطبيق', 'موقع', 'ويب', 'تقنية', 'سوفتوير', 'نظام', 'أتمتة']
      WHEN 'design' THEN ARRAY['تصميم', 'شعار', 'لوقو', 'جرافيك', 'هوية', 'بصرية', 'صور']
      WHEN 'writing' THEN ARRAY['كتابة', 'محتوى', 'مقال', 'تدقيق', 'نصوص', 'صياغة']
      WHEN 'marketing' THEN ARRAY['تسويق', 'إعلان', 'حملة', 'سوشيال', 'ميديا', 'دعاية']
      WHEN 'engineering' THEN ARRAY['هندسة', 'عمارة', 'بناء', 'تصميم معماري', 'ديكور']
      WHEN 'mobile' THEN ARRAY['جوال', 'موبايل', 'تطبيق', 'آيفون', 'أندرويد', 'iOS']
      WHEN 'maintenance' THEN ARRAY['صيانة', 'إصلاح', 'سباكة', 'كهرباء', 'تكييف', 'منزل']
      WHEN 'transport' THEN ARRAY['نقل', 'شحن', 'توصيل', 'لوجستيك', 'سيارة', 'نقليات']
      WHEN 'health' THEN ARRAY['صحة', 'طب', 'لياقة', 'تغذية', 'علاج', 'استشارة صحية']
      WHEN 'translation' THEN ARRAY['ترجمة', 'لغة', 'إنجليزي', 'عربي', 'لغات']
      WHEN 'education' THEN ARRAY['تعليم', 'تدريب', 'دورة', 'درس', 'تدريس', 'معلم']
      WHEN 'legal' THEN ARRAY['قانون', 'محامي', 'عقد', 'استشارة قانونية', 'توثيق']
      WHEN 'finance' THEN ARRAY['مالية', 'محاسبة', 'ضرائب', 'ميزانية', 'استشارة مالية']
      WHEN 'photography' THEN ARRAY['تصوير', 'فيديو', 'مونتاج', 'كاميرا', 'صور']
      WHEN 'events' THEN ARRAY['حفلة', 'مناسبة', 'عرس', 'زفاف', 'مؤتمر', 'تنظيم']
      WHEN 'beauty' THEN ARRAY['تجميل', 'مكياج', 'شعر', 'بشرة', 'عناية']
      WHEN 'cleaning' THEN ARRAY['تنظيف', 'نظافة', 'منزل', 'مكتب', 'غسيل']
      WHEN 'food' THEN ARRAY['طعام', 'طبخ', 'مطعم', 'حلويات', 'تموين', 'كيترنج']
      WHEN 'car' THEN ARRAY['سيارة', 'ميكانيكي', 'قطع غيار', 'صيانة سيارة', 'تأجير']
      WHEN 'other' THEN ARRAY['أخرى', 'متنوع', 'عام']
      WHEN 'unspecified' THEN ARRAY['غير محدد', 'غير معروف']
      ELSE ARRAY[]::TEXT[]
    END
  FROM categories c
  WHERE c.is_active = TRUE AND c.id != 'unspecified'
  ORDER BY c.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- الجزء 9: تفعيل Realtime
-- ==========================================

-- تفعيل Realtime للتصنيفات المقترحة
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'pending_categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pending_categories;
  END IF;
END $$;

-- ==========================================
-- اختبار
-- ==========================================

-- للتحقق من إضافة تصنيف "غير محدد":
-- SELECT * FROM categories WHERE id = 'unspecified';

-- للتحقق من البحث عن تصنيفات مشابهة:
-- SELECT * FROM find_similar_categories('برمجة تطبيقات');

-- لاقتراح تصنيف جديد:
-- SELECT * FROM suggest_new_category('تصميم حدائق', '🌳', 'خدمات تصميم وتنسيق الحدائق');

-- لعرض التصنيفات للـ AI:
-- SELECT * FROM get_categories_for_ai();




























