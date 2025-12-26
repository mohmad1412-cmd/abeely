-- ============================================
-- جدول اهتمامات المستخدمين - User Preferences
-- ============================================
-- هذا الملف يحتوي على SQL لإنشاء جدول الاهتمامات
-- وربطه بجدول profiles الموجود
-- ============================================

-- 1. إضافة أعمدة الاهتمامات لجدول profiles (إذا لم تكن موجودة)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interested_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interested_cities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS radar_words TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notify_on_interest BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS role_mode TEXT DEFAULT 'requester' CHECK (role_mode IN ('requester', 'provider'));

-- 2. إنشاء index للبحث السريع عن المستخدمين المهتمين بفئة معينة
CREATE INDEX IF NOT EXISTS idx_profiles_interested_categories 
ON public.profiles USING GIN (interested_categories);

CREATE INDEX IF NOT EXISTS idx_profiles_interested_cities 
ON public.profiles USING GIN (interested_cities);

CREATE INDEX IF NOT EXISTS idx_profiles_radar_words 
ON public.profiles USING GIN (radar_words);

-- 3. Function لتحديث اهتمامات المستخدم
CREATE OR REPLACE FUNCTION update_user_preferences(
  p_user_id UUID,
  p_categories TEXT[] DEFAULT NULL,
  p_cities TEXT[] DEFAULT NULL,
  p_radar_words TEXT[] DEFAULT NULL,
  p_notify_on_interest BOOLEAN DEFAULT NULL,
  p_role_mode TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  UPDATE public.profiles
  SET 
    interested_categories = COALESCE(p_categories, interested_categories),
    interested_cities = COALESCE(p_cities, interested_cities),
    radar_words = COALESCE(p_radar_words, radar_words),
    notify_on_interest = COALESCE(p_notify_on_interest, notify_on_interest),
    role_mode = COALESCE(p_role_mode, role_mode),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING jsonb_build_object(
    'interested_categories', interested_categories,
    'interested_cities', interested_cities,
    'radar_words', radar_words,
    'notify_on_interest', notify_on_interest,
    'role_mode', role_mode
  ) INTO result;
  
  RETURN result;
END;
$$;

-- 4. Function للحصول على اهتمامات المستخدم
CREATE OR REPLACE FUNCTION get_user_preferences(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'interested_categories', COALESCE(interested_categories, '{}'),
    'interested_cities', COALESCE(interested_cities, '{}'),
    'radar_words', COALESCE(radar_words, '{}'),
    'notify_on_interest', COALESCE(notify_on_interest, true),
    'role_mode', COALESCE(role_mode, 'requester')
  )
  INTO result
  FROM public.profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 5. Function للبحث عن مستخدمين مهتمين بفئة أو مدينة معينة
-- (مفيدة لإرسال إشعارات عند نشر طلبات جديدة)
CREATE OR REPLACE FUNCTION find_interested_users(
  p_category TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_keywords TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  phone TEXT,
  match_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.display_name,
    p.phone,
    CASE
      WHEN p_category IS NOT NULL AND p_category = ANY(p.interested_categories) THEN 'category'
      WHEN p_city IS NOT NULL AND p_city = ANY(p.interested_cities) THEN 'city'
      WHEN p_keywords IS NOT NULL AND p.radar_words && p_keywords THEN 'radar_word'
      ELSE 'unknown'
    END as match_type
  FROM public.profiles p
  WHERE 
    p.notify_on_interest = true
    AND p.role_mode = 'provider'
    AND (
      (p_category IS NOT NULL AND p_category = ANY(p.interested_categories))
      OR (p_city IS NOT NULL AND p_city = ANY(p.interested_cities))
      OR (p_keywords IS NOT NULL AND p.radar_words && p_keywords)
    );
END;
$$;

-- 6. RLS Policies للاهتمامات
-- المستخدم يمكنه قراءة اهتماماته فقط
DROP POLICY IF EXISTS "Users can view own preferences" ON public.profiles;
CREATE POLICY "Users can view own preferences" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- المستخدم يمكنه تحديث اهتماماته فقط  
DROP POLICY IF EXISTS "Users can update own preferences" ON public.profiles;
CREATE POLICY "Users can update own preferences" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- ملاحظات التثبيت:
-- ============================================
-- 1. اذهب إلى Supabase Dashboard
-- 2. اختر "SQL Editor" من القائمة الجانبية
-- 3. انسخ هذا الكود بالكامل والصقه
-- 4. اضغط "Run" لتنفيذ الكود
-- ============================================

