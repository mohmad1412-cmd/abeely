-- ==========================================
-- Fix: mark_request_viewed + get_unread_interests_count
-- ==========================================
-- المشكلة 1: عند رؤية الكارت في صفحة الاهتمامات، markRequestAsViewed تستخدم فقط viewed_at
--            بينما get_unread_interests_count تعتمد على is_read = FALSE
-- الحل: تعديل mark_request_viewed لتعيين is_read = TRUE مباشرة عند الرؤية
--
-- المشكلة 2: منطق المطابقة في get_unread_interests_count يستخدم OR بين التصنيفات والمدن
--            بينما الكود الأمامي يستخدم AND
-- الحل: تحديث المنطق ليستخدم AND (يجب أن تتطابق التصنيفات والمدن معاً)

CREATE OR REPLACE FUNCTION mark_request_viewed(request_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Insert or update view record
  -- الآن نعيّن is_read = TRUE مباشرة عند رؤية الكارت
  INSERT INTO request_views (user_id, request_id, viewed_at, is_read, read_at)
  VALUES (current_user_id, request_id_param, NOW(), TRUE, NOW())
  ON CONFLICT (user_id, request_id)
  DO UPDATE SET
    viewed_at = NOW(),
    is_read = TRUE,
    read_at = COALESCE(request_views.read_at, NOW()),
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- أيضاً نضيف search_path للدالة mark_request_read لتحسين الأمان
CREATE OR REPLACE FUNCTION mark_request_read(request_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update view record to mark as read
  UPDATE request_views
  SET 
    is_read = TRUE,
    read_at = NOW(),
    updated_at = NOW()
  WHERE user_id = current_user_id
    AND request_id = request_id_param;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO request_views (user_id, request_id, viewed_at, is_read, read_at)
    VALUES (current_user_id, request_id_param, NOW(), TRUE, NOW());
  END IF;

  RETURN TRUE;
END;
$$;

-- ==========================================
-- Fix: get_unread_interests_count - منطق AND بدلاً من OR
-- ==========================================
CREATE OR REPLACE FUNCTION get_unread_interests_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  count_result INTEGER;
  user_categories TEXT[];
  user_cities TEXT[];
  has_categories BOOLEAN;
  has_cities BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT 
    COALESCE(interested_categories, ARRAY[]::TEXT[]),
    COALESCE(interested_cities, ARRAY[]::TEXT[])
  INTO user_categories, user_cities
  FROM profiles
  WHERE id = current_user_id;

  -- تحقق من وجود اهتمامات
  has_categories := user_categories IS NOT NULL AND array_length(user_categories, 1) IS NOT NULL AND array_length(user_categories, 1) > 0;
  
  -- استبعاد "كل المدن" من قائمة المدن
  user_cities := ARRAY(
    SELECT unnest(user_cities) 
    EXCEPT 
    SELECT 'كل المدن'
  );
  has_cities := user_cities IS NOT NULL AND array_length(user_cities, 1) IS NOT NULL AND array_length(user_cities, 1) > 0;

  -- إذا لم يكن هناك أي اهتمامات (لا تصنيفات ولا مدن)، أرجع 0
  IF NOT has_categories AND NOT has_cities THEN
    RETURN 0;
  END IF;

  -- Count unread requests matching interests
  -- استخدام AND logic: يجب أن تتطابق التصنيفات (إن وُجدت) والمدن (إن وُجدت)
  SELECT COUNT(DISTINCT r.id) INTO count_result
  FROM requests r
  LEFT JOIN request_views rv ON rv.request_id = r.id AND rv.user_id = current_user_id
  WHERE r.is_public = TRUE
    AND r.status = 'active'
    AND r.author_id != current_user_id  -- استبعاد طلبات المستخدم نفسه
    AND (rv.id IS NULL OR rv.is_read = FALSE)  -- غير مقروءة
    AND NOT EXISTS (
      -- استبعاد الطلبات التي قدم عليها المستخدم عروض نشطة (غير مرفوضة)
      SELECT 1 FROM offers o
      WHERE o.request_id = r.id
        AND o.provider_id = current_user_id
        AND o.status != 'rejected'
    )
    -- Categories matching (إذا وُجدت تصنيفات، يجب أن تتطابق)
    AND (
      NOT has_categories
      OR EXISTS (
        SELECT 1 FROM request_categories rc
        JOIN categories c ON c.id = rc.category_id
        WHERE rc.request_id = r.id
          AND EXISTS (
            SELECT 1 FROM unnest(user_categories) AS cat
            WHERE c.label ILIKE '%' || cat || '%' OR cat ILIKE '%' || c.label || '%'
          )
      )
    )
    -- Cities matching (إذا وُجدت مدن، يجب أن تتطابق)
    AND (
      NOT has_cities
      OR EXISTS (
        SELECT 1 FROM unnest(user_cities) AS city
        WHERE r.location ILIKE '%' || city || '%' 
           OR r.location_city ILIKE '%' || city || '%'
           OR city ILIKE '%' || SPLIT_PART(r.location, '،', 1) || '%'
           OR SPLIT_PART(r.location, '،', 1) ILIKE '%' || city || '%'
      )
    );

  RETURN COALESCE(count_result, 0);
END;
$$;
