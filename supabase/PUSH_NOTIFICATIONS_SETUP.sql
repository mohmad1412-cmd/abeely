-- ============================================
-- إعداد نظام الإشعارات المنبثقة (Push Notifications)
-- ============================================
-- هذا الملف يُنشئ الجداول والأعمدة اللازمة لعمل الإشعارات عبر FCM و AI
-- ============================================

-- 1. إنشاء جدول fcm_tokens لحفظ توكنز الأجهزة
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT, -- 'android', 'ios', 'web'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- 2. إضافة الأعمدة المطلوبة لجدول profiles (إذا لم تكن موجودة)
-- هذه الأعمدة تستخدمها الـ Edge Function لتحديد المستخدمين المهتمين
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interested_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interested_cities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS radar_words TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notify_on_interest BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS role_mode TEXT DEFAULT 'requester' CHECK (role_mode IN ('requester', 'provider'));

-- 3. تفعيل RLS (Row Level Security) على جدول fcm_tokens
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- 4. سياسات RLS لجدول fcm_tokens
-- السماح للمستخدم بإدارة التوكنز الخاصة به فقط
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.fcm_tokens;
CREATE POLICY "Users can manage their own tokens"
ON public.fcm_tokens FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. إنشاء الفهارس (Indexes) لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON public.fcm_tokens(token);

-- 6. إنشاء Index للبحث في مصفوفات الاهتمامات (GIN Index)
CREATE INDEX IF NOT EXISTS idx_profiles_interested_categories_gin ON public.profiles USING GIN (interested_categories);
CREATE INDEX IF NOT EXISTS idx_profiles_interested_cities_gin ON public.profiles USING GIN (interested_cities);

-- ============================================
-- ملاحظات هامة:
-- ============================================
-- 1. اذهب إلى Supabase Dashboard -> SQL Editor
-- 2. الصق هذا الكود وقم بتنفيذه
-- 3. تأكد من إعداد FCM_SERVER_KEY و ANTHROPIC_API_KEY في Edge Function Secrets:
--    supabase secrets set FCM_SERVER_KEY=your_key_here
--    supabase secrets set ANTHROPIC_API_KEY=your_key_here
-- ============================================
