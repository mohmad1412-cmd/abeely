-- ==========================================
-- Fix: Update get_unread_interests_count to match Marketplace.tsx filtering logic
-- ==========================================
-- المشكلة: الـ function كانت تحسب عدد أكبر من الطلبات المعروضة
-- السبب: 
-- 1. كانت تستخدم rv.id IS NULL فقط (فقط الطلبات التي لم يتم عرضها أبداً)
--    بينما يجب استخدام (rv.id IS NULL OR rv.is_viewed = FALSE) لحساب جميع الطلبات غير المقروءة
-- 2. منطق استبعاد العروض كان مختلفاً قليلاً عن المنطق في Marketplace.tsx
-- الحل: تحديث الدالة لتطابق منطق الفلترة في Marketplace.tsx بالضبط

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

  IF (user_categories IS NULL OR array_length(user_categories, 1) IS NULL) 
     AND (user_cities IS NULL OR array_length(user_cities, 1) IS NULL) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(DISTINCT r.id) INTO count_result
  FROM requests r
  LEFT JOIN request_views rv ON rv.request_id = r.id AND rv.user_id = current_user_id
  WHERE r.is_public = TRUE
    AND r.status = 'active'
    AND r.author_id != current_user_id
    -- حساب الطلبات غير المقروءة (لم يتم عرضها أو لم يتم عرضها بشكل كامل)
    -- Badge count يقل عندما يرى المستخدم الكارت (50%+ visible) عن طريق is_read = true
    -- عندما يرى المستخدم الكارت على الشاشة، يتم وضع is_read = true فوراً لإخفاء الـ badge
    AND (rv.id IS NULL OR rv.is_read = FALSE)
    -- استبعاد الطلبات التي لديها عروض نشطة من المستخدم (تطابق منطق Marketplace.tsx بالضبط)
    -- نستبعد العروض الملغاة (cancelled) والمكتملة (completed) والمرفوضة (rejected)
    -- أي نستبعد فقط: pending, accepted, negotiating
    AND NOT EXISTS (
      SELECT 1 FROM offers o
      WHERE o.request_id = r.id
        AND o.provider_id = current_user_id
        AND o.status NOT IN ('cancelled', 'completed', 'rejected')
    )
    AND (
      (user_categories IS NULL OR array_length(user_categories, 1) IS NULL OR
       EXISTS (
         SELECT 1 FROM request_categories rc
         JOIN categories c ON c.id = rc.category_id
         WHERE rc.request_id = r.id
           AND EXISTS (
             SELECT 1 FROM unnest(user_categories) AS cat
             WHERE c.label ILIKE '%' || cat || '%' OR cat ILIKE '%' || c.label || '%'
           )
       ))
      OR
      (user_cities IS NULL OR array_length(user_cities, 1) IS NULL OR
       EXISTS (
         SELECT 1 FROM unnest(user_cities) AS city
         WHERE r.location ILIKE '%' || city || '%' OR r.location_city ILIKE '%' || city || '%'
       ))
    );

  RETURN COALESCE(count_result, 0);
END;
$$;
