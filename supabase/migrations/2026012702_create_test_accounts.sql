-- ==========================================
-- إعداد حسابات اختبار حقيقية
-- ==========================================
-- هذا الملف يعد حسابات اختبار حقيقية للأرقام:
-- - 0555111111 (966551111111)
-- - 0555222222 (966552222222)
-- 
-- هذه الحسابات تعمل كحسابات حقيقية تماماً وليست anonymous
-- يمكن استخدامها للاختبار مع الرمز 0000

-- ==========================================
-- ملاحظة مهمة:
-- لا يمكن إنشاء profile بدون user موجود في auth.users أولاً
-- لأن profiles.id مرتبط بـ auth.users.id عبر foreign key
-- 
-- الحل: عند تسجيل الدخول برقم الاختبار والرمز 0000:
-- 1. سيتم إنشاء user في auth.users تلقائياً عبر verifyOtp
-- 2. سيتم إنشاء profile تلقائياً عبر trigger handle_new_user
-- 3. هذا الملف فقط يحدث profile إذا كان user موجوداً بالفعل
-- ==========================================

-- تحديث profile للرقم 0555111111 (إذا كان user موجوداً)
UPDATE public.profiles
SET 
  phone = '+966551111111',
  display_name = COALESCE(display_name, 'مستخدم اختبار 1'),
  is_verified = true,
  is_guest = false,
  interested_categories = COALESCE(interested_categories, ARRAY[]::TEXT[]),
  interested_cities = COALESCE(interested_cities, ARRAY[]::TEXT[]),
  radar_words = COALESCE(radar_words, ARRAY[]::TEXT[]),
  notify_on_interest = COALESCE(notify_on_interest, true),
  role_mode = COALESCE(role_mode, 'requester'),
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users WHERE phone = '+966551111111'
)
AND EXISTS (
  SELECT 1 FROM auth.users WHERE phone = '+966551111111'
);

-- تحديث profile للرقم 0555222222 (إذا كان user موجوداً)
UPDATE public.profiles
SET 
  phone = '+966552222222',
  display_name = COALESCE(display_name, 'مستخدم اختبار 2'),
  is_verified = true,
  is_guest = false,
  interested_categories = COALESCE(interested_categories, ARRAY[]::TEXT[]),
  interested_cities = COALESCE(interested_cities, ARRAY[]::TEXT[]),
  radar_words = COALESCE(radar_words, ARRAY[]::TEXT[]),
  notify_on_interest = COALESCE(notify_on_interest, true),
  role_mode = COALESCE(role_mode, 'requester'),
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM auth.users WHERE phone = '+966552222222'
)
AND EXISTS (
  SELECT 1 FROM auth.users WHERE phone = '+966552222222'
);

-- ملاحظة: 
-- - auth.users و profiles ستُنشأ تلقائياً عند تسجيل الدخول عبر verifyOtp
-- - هذا الملف فقط يحدث profiles الموجودة مسبقاً
-- - إذا لم تكن الحسابات موجودة، سجّل دخول برقم الاختبار والرمز 0000 أولاً
