-- إضافة عمود has_onboarded لتتبع إذا أكمل المستخدم الـ onboarding
-- يُستخدم لعرض شاشة تحديد الاهتمامات للمستخدمين الجدد مرة واحدة فقط

-- إضافة العمود إذا لم يكن موجوداً
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'has_onboarded'
    ) THEN
        ALTER TABLE profiles ADD COLUMN has_onboarded BOOLEAN DEFAULT FALSE;
        COMMENT ON COLUMN profiles.has_onboarded IS 'يشير إلى ما إذا أكمل المستخدم شاشة تحديد الاهتمامات';
    END IF;
END
$$;

-- تحديث المستخدمين القدامى ليعتبروا قد أكملوا الـ onboarding
-- (المستخدمون الذين لديهم اهتمامات محددة مسبقاً)
UPDATE profiles 
SET has_onboarded = TRUE 
WHERE has_onboarded = FALSE 
  AND (
    (interested_categories IS NOT NULL AND array_length(interested_categories, 1) > 0)
    OR (interested_cities IS NOT NULL AND array_length(interested_cities, 1) > 0)
  );

-- تحديث المستخدمين الذين تم إنشاؤهم قبل أكثر من يوم واحد ليعتبروا قد أكملوا الـ onboarding
-- (لتجنب إظهار الـ onboarding للمستخدمين القدامى)
UPDATE profiles 
SET has_onboarded = TRUE 
WHERE has_onboarded = FALSE 
  AND created_at < NOW() - INTERVAL '1 day';

