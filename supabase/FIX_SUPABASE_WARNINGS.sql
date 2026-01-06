-- ==========================================
-- إصلاح تحذيرات Supabase Dashboard
-- ==========================================
-- هذا الملف يصلح التحذيرات التالية:
-- 1. Function Search Path Mutable - notify_on_new_offer
-- 2. Leaked Password Protection Disabled (يتطلب إعداد من Dashboard)
-- ==========================================

-- ==========================================
-- 1. إصلاح Function Search Path Mutable
-- ==========================================
-- تحديث notify_on_new_offer لإضافة SET search_path = public
-- هذا يحمي من search path manipulation attacks

CREATE OR REPLACE FUNCTION notify_on_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_owner_id UUID;
  request_title TEXT;
  request_author_name TEXT;
  offer_provider_name TEXT;
BEGIN
  SELECT 
    r.author_id,
    r.title,
    COALESCE(p.display_name, 'مستخدم')
  INTO request_owner_id, request_title, request_author_name
  FROM requests r
  LEFT JOIN profiles p ON p.id = r.author_id
  WHERE r.id = NEW.request_id;
  
  SELECT COALESCE(provider_name, 'مزود خدمة')
  INTO offer_provider_name
  FROM offers
  WHERE id = NEW.id;
  
  IF request_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id, related_offer_id)
    VALUES (
      request_owner_id,
      'offer',
      'عرض جديد على طلبك',
      'عرض جديد من ' || offer_provider_name || ' على طلبك: ' || COALESCE(request_title, 'طلب'),
      '/request/' || NEW.request_id,
      NEW.request_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- ==========================================
-- 2. Leaked Password Protection
-- ==========================================
-- ⚠️ هذا التحذير لا يمكن إصلاحه عن طريق SQL
-- يجب تفعيله من Supabase Dashboard يدوياً:
--
-- الخطوات:
-- 1. اذهب إلى Supabase Dashboard
-- 2. اختر مشروعك
-- 3. اذهب إلى: Authentication → Providers → Email
-- 4. فعّل خيار: "Leaked password protection"
--
-- أو استخدم هذا الرابط المباشر (استبدل YOUR_PROJECT_ID):
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/providers
--
-- هذه الميزة تمنع المستخدمين من استخدام كلمات مرور تم تسريبها
-- عن طريق فحصها ضد قاعدة بيانات HaveIBeenPwned.org
-- ==========================================

-- ==========================================
-- التحقق من الإصلاح
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ تم تحديث notify_on_new_offer مع SET search_path = public';
  RAISE NOTICE '📋 للتحقق من الإصلاح:';
  RAISE NOTICE '   1. اذهب إلى Supabase Dashboard → Reports → Warnings';
  RAISE NOTICE '   2. يجب أن يختفي تحذير "Function Search Path Mutable"';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  لتفعيل Leaked Password Protection:';
  RAISE NOTICE '   1. اذهب إلى Authentication → Providers → Email';
  RAISE NOTICE '   2. فعّل "Leaked password protection"';
END $$;

