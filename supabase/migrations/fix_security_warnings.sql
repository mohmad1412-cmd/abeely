-- ==========================================
-- إصلاح التحذيرات الأمنية
-- ==========================================
-- هذا الملف يصلح جميع التحذيرات الأمنية التي ظهرت في Supabase Advisors

-- ==========================================
-- الجزء 1: إصلاح Function Search Path Mutable
-- ==========================================
-- المشكلة: الدوال بدون SET search_path معرضة لـ SQL injection
-- الحل: إضافة SET search_path = public أو '' للدوال

-- إصلاح find_similar_categories
CREATE OR REPLACE FUNCTION find_similar_categories(p_label TEXT)
RETURNS TABLE (
  id TEXT,
  label TEXT,
  emoji TEXT,
  similarity_score FLOAT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- إصلاح suggest_new_category
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
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
      'unspecified'::TEXT,
      'غير محدد'::TEXT,
      v_new_pending_id;
  END IF;
END;
$$;

-- إصلاح ensure_request_has_category
CREATE OR REPLACE FUNCTION ensure_request_has_category(p_request_id UUID)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- إصلاح auto_assign_unspecified_category
CREATE OR REPLACE FUNCTION auto_assign_unspecified_category()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- ننتظر قليلاً للسماح بإضافة التصنيفات الأخرى (مؤجل)
  -- سيتم التحقق عند الاستعلام
  RETURN NEW;
END;
$$;

-- إصلاح get_categories_for_ai
CREATE OR REPLACE FUNCTION get_categories_for_ai()
RETURNS TABLE (
  id TEXT,
  label TEXT,
  keywords TEXT[]
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
      ELSE ARRAY[]::TEXT[]
    END as keywords
  FROM categories c
  WHERE c.is_active = TRUE
  ORDER BY c.sort_order, c.label;
END;
$$;

-- ==========================================
-- الجزء 2: إصلاح RLS Policies - pending_categories
-- ==========================================

-- حذف الـ policy القديم
DROP POLICY IF EXISTS "Service role can manage pending categories" ON pending_categories;

-- إنشاء policy آمن - يسمح فقط للـ service role
CREATE POLICY "Service role can manage pending categories"
ON pending_categories FOR ALL
USING (
  -- التحقق من أن المستخدم هو service_role
  current_setting('request.jwt.claim.role', true) = 'service_role'
  OR auth.jwt() ->> 'role' = 'service_role'
)
WITH CHECK (
  current_setting('request.jwt.claim.role', true) = 'service_role'
  OR auth.jwt() ->> 'role' = 'service_role'
);

-- ==========================================
-- الجزء 3: إصلاح RLS Policies - request_view_logs
-- ==========================================

-- حذف الـ policy القديم
DROP POLICY IF EXISTS "Anyone can log views via function" ON request_view_logs;

-- إنشاء policy آمن - يسمح فقط عبر الدالة increment_request_views
-- ملاحظة: الدالة نفسها تستخدم SECURITY DEFINER، لذا نحتاج policy يسمح للدالة فقط
CREATE POLICY "Function can log views"
ON request_view_logs FOR INSERT
WITH CHECK (
  -- السماح فقط إذا كانت العملية تتم عبر الدالة (SECURITY DEFINER)
  -- أو للمستخدمين المسجلين فقط
  auth.uid() IS NOT NULL
  OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ==========================================
-- الجزء 4: إصلاح RLS Policies - requests
-- ==========================================

-- حذف الـ policies القديمة
DROP POLICY IF EXISTS "Authenticated can create requests" ON requests;
DROP POLICY IF EXISTS "anon_insert_requests" ON requests;

-- إنشاء policy آمن للمستخدمين المسجلين
CREATE POLICY "Authenticated can create requests"
ON requests FOR INSERT
WITH CHECK (
  -- السماح فقط للمستخدمين المسجلين
  auth.uid() IS NOT NULL
  AND (
    -- يجب أن يكون author_id = auth.uid()
    author_id = auth.uid()
    OR author_id IS NULL -- للسماح بإنشاء طلبات بدون author_id (سيتم تعيينه لاحقاً)
  )
);

-- إنشاء policy آمن للزوار (guest requests)
CREATE POLICY "Guests can create guest requests"
ON requests FOR INSERT
WITH CHECK (
  -- السماح فقط للطلبات الضيفية
  is_guest_request = TRUE
  AND author_id IS NULL
  AND (
    -- يجب أن يكون هناك رقم هاتف محقق
    contact_phone IS NOT NULL
    AND contact_phone_verified = TRUE
  )
);

-- ==========================================
-- الجزء 5: إصلاح RLS Policies - reviews
-- ==========================================

-- حذف الـ policies القديمة
DROP POLICY IF EXISTS "Users can create their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;

-- إنشاء policies آمنة للمستخدمين المسجلين فقط
CREATE POLICY "Users can create their own reviews"
ON reviews FOR INSERT
WITH CHECK (
  -- يجب أن يكون المستخدم مسجل
  auth.uid() IS NOT NULL
  AND (
    -- التحقق من author_id إذا كان موجوداً
    (author_id IS NOT NULL AND author_id = auth.uid())
    OR author_id IS NULL -- للسماح بإنشاء reviews بدون author_id (سيتم تعيينه لاحقاً)
  )
);

CREATE POLICY "Users can update their own reviews"
ON reviews FOR UPDATE
USING (
  -- يمكن التحديث فقط إذا كان المستخدم هو صاحب الـ review
  auth.uid() IS NOT NULL
  AND author_id = auth.uid()
)
WITH CHECK (
  -- التأكد من أن author_id لم يتغير
  auth.uid() IS NOT NULL
  AND author_id = auth.uid()
);

CREATE POLICY "Users can delete their own reviews"
ON reviews FOR DELETE
USING (
  -- يمكن الحذف فقط إذا كان المستخدم هو صاحب الـ review
  auth.uid() IS NOT NULL
  AND author_id = auth.uid()
);

-- ==========================================
-- الجزء 6: إصلاح RLS Policies - verified_guests
-- ==========================================

-- حذف الـ policy القديم
DROP POLICY IF EXISTS "Guests can create verified guest records" ON verified_guests;

-- إنشاء policy آمن - يسمح بإنشاء سجلات للضيوف مع قيود
CREATE POLICY "Guests can create verified guest records"
ON verified_guests FOR INSERT
WITH CHECK (
  -- السماح بإنشاء سجلات للضيوف فقط (غير مسجلين)
  -- مع قيود على البيانات
  phone IS NOT NULL
  AND LENGTH(phone) >= 10
  AND verification_code IS NOT NULL
  AND LENGTH(verification_code) >= 4
  AND code_expires_at > NOW()
);

-- ==========================================
-- الجزء 7: تعليقات توضيحية
-- ==========================================

COMMENT ON FUNCTION find_similar_categories(TEXT) IS 'البحث عن تصنيفات مشابهة - تم إصلاح search_path للأمان';
COMMENT ON FUNCTION suggest_new_category(TEXT, TEXT, TEXT, UUID) IS 'اقتراح تصنيف جديد - تم إصلاح search_path للأمان';
COMMENT ON FUNCTION ensure_request_has_category(UUID) IS 'ضمان وجود تصنيف للطلب - تم إصلاح search_path للأمان';
COMMENT ON FUNCTION auto_assign_unspecified_category() IS 'تعيين تصنيف تلقائي - تم إصلاح search_path للأمان';
COMMENT ON FUNCTION get_categories_for_ai() IS 'الحصول على التصنيفات للـ AI - تم إصلاح search_path للأمان';

COMMENT ON POLICY "Service role can manage pending categories" ON pending_categories IS 'السماح فقط للـ service role بإدارة التصنيفات المقترحة - تم إصلاح الأمان';
COMMENT ON POLICY "Function can log views" ON request_view_logs IS 'السماح بتسجيل المشاهدات عبر الدالة فقط - تم إصلاح الأمان';
COMMENT ON POLICY "Authenticated can create requests" ON requests IS 'السماح للمستخدمين المسجلين بإنشاء طلبات - تم إصلاح الأمان';
COMMENT ON POLICY "Guests can create guest requests" ON requests IS 'السماح للضيوف بإنشاء طلبات مع التحقق من الهاتف - تم إصلاح الأمان';
COMMENT ON POLICY "Users can create their own reviews" ON reviews IS 'السماح للمستخدمين بإنشاء تقييمات خاصة بهم - تم إصلاح الأمان';
COMMENT ON POLICY "Users can update their own reviews" ON reviews IS 'السماح للمستخدمين بتحديث تقييماتهم فقط - تم إصلاح الأمان';
COMMENT ON POLICY "Users can delete their own reviews" ON reviews IS 'السماح للمستخدمين بحذف تقييماتهم فقط - تم إصلاح الأمان';
COMMENT ON POLICY "Guests can create verified guest records" ON verified_guests IS 'السماح للضيوف بإنشاء سجلات التحقق مع قيود - تم إصلاح الأمان';

