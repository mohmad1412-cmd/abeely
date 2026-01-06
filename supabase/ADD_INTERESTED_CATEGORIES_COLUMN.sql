-- ============================================
-- إضافة عمود interested_categories لجدول profiles
-- ============================================
-- هذا الملف يضيف العمود المطلوب إذا لم يكن موجوداً
-- ============================================

-- إضافة عمود interested_categories إذا لم يكن موجوداً
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interested_categories TEXT[] DEFAULT '{}';

-- إضافة عمود interested_cities إذا لم يكن موجوداً
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interested_cities TEXT[] DEFAULT '{}';

-- إضافة عمود radar_words إذا لم يكن موجوداً
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS radar_words TEXT[] DEFAULT '{}';

-- إضافة عمود notify_on_interest إذا لم يكن موجوداً
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notify_on_interest BOOLEAN DEFAULT true;

-- إضافة عمود role_mode إذا لم يكن موجوداً
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role_mode TEXT DEFAULT 'requester' CHECK (role_mode IN ('requester', 'provider'));

-- إنشاء indexes للبحث السريع
CREATE INDEX IF NOT EXISTS idx_profiles_interested_categories 
ON public.profiles USING GIN (interested_categories);

CREATE INDEX IF NOT EXISTS idx_profiles_interested_cities 
ON public.profiles USING GIN (interested_cities);

CREATE INDEX IF NOT EXISTS idx_profiles_radar_words 
ON public.profiles USING GIN (radar_words);

-- ============================================
-- ملاحظات:
-- ============================================
-- 1. اذهب إلى Supabase Dashboard
-- 2. اختر "SQL Editor" من القائمة الجانبية
-- 3. انسخ هذا الكود بالكامل والصقه
-- 4. اضغط "Run" لتنفيذ الكود
-- ============================================

