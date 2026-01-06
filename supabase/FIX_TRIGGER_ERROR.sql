-- ==========================================
-- إصلاح خطأ: column "interested_categories" does not exist
-- ==========================================
-- هذا الملف يعطل الـ trigger الذي يسبب الخطأ مؤقتاً
-- ثم يعيد إنشاءه بطريقة صحيحة تقرأ التصنيفات من جدول request_categories

-- الخطوة 1: تعطيل الـ trigger القديم
DROP TRIGGER IF EXISTS trigger_notify_on_new_interest_request ON requests;

-- الخطوة 2: إعادة إنشاء الـ function بطريقة صحيحة
CREATE OR REPLACE FUNCTION notify_on_new_interest_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_title TEXT;
  v_request_author_name TEXT;
  v_request_city TEXT;
  v_request_categories TEXT[];
  v_matching_user RECORD;
BEGIN
  -- فقط للطلبات النشطة والعامة
  IF NEW.status != 'active' OR NEW.is_public != TRUE THEN
    RETURN NEW;
  END IF;
  
  -- جلب عنوان الطلب
  v_request_title := NEW.title;
  
  -- استخراج المدينة من الموقع
  v_request_city := SPLIT_PART(NEW.location, '،', -1);
  v_request_city := TRIM(v_request_city);
  
  -- جلب اسم صاحب الطلب
  SELECT display_name INTO v_request_author_name
  FROM profiles p
  WHERE p.id = NEW.author_id;
  
  -- جلب تصنيفات الطلب من جدول request_categories (بعد التأخير للتأكد من إدخالها)
  -- ملاحظة: التصنيفات تُضاف بعد إنشاء الطلب، لذلك قد لا تكون متاحة في هذه اللحظة
  SELECT ARRAY_AGG(c.label) INTO v_request_categories
  FROM request_categories rc
  JOIN categories c ON c.id = rc.category_id
  WHERE rc.request_id = NEW.id;
  
  -- إذا لم تكن هناك تصنيفات بعد، نستخدم مصفوفة فارغة
  IF v_request_categories IS NULL THEN
    v_request_categories := ARRAY[]::TEXT[];
  END IF;
  
  -- البحث عن المستخدمين المهتمين
  FOR v_matching_user IN
    SELECT 
      p.id AS user_id,
      p.display_name,
      p.interested_categories,
      p.interested_cities
    FROM profiles p
    WHERE p.notify_on_interest = TRUE
      AND p.id != NEW.author_id  -- استثناء صاحب الطلب
      AND (
        -- مطابقة التصنيفات (إذا كانت موجودة)
        (
          p.interested_categories IS NOT NULL 
          AND array_length(p.interested_categories, 1) > 0
          AND v_request_categories IS NOT NULL
          AND array_length(v_request_categories, 1) > 0
          AND p.interested_categories && v_request_categories
        )
        OR
        -- مطابقة المدن
        (
          p.interested_cities IS NOT NULL 
          AND array_length(p.interested_cities, 1) > 0
          AND v_request_city IS NOT NULL
          AND v_request_city != ''
          AND (
            v_request_city = ANY(p.interested_cities)
            OR EXISTS (
              SELECT 1 FROM unnest(p.interested_cities) AS city
              WHERE v_request_city ILIKE '%' || city || '%'
                 OR city ILIKE '%' || v_request_city || '%'
            )
          )
        )
      )
  LOOP
    -- إنشاء إشعار لكل مستخدم مهتم
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_read,
      created_at
    ) VALUES (
      v_matching_user.user_id,
      'new_request',
      'طلب جديد قد يهمك',
      COALESCE(v_request_author_name, 'مستخدم') || ' نشر طلباً: ' || COALESCE(v_request_title, 'طلب جديد'),
      jsonb_build_object(
        'request_id', NEW.id,
        'request_title', v_request_title,
        'author_name', v_request_author_name,
        'city', v_request_city,
        'categories', v_request_categories
      ),
      FALSE,
      NOW()
    );
  END LOOP;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- في حالة أي خطأ، نسجل الخطأ ولا نوقف العملية
    RAISE WARNING 'Error in notify_on_new_interest_request: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- الخطوة 3: إعادة إنشاء الـ trigger
CREATE TRIGGER trigger_notify_on_new_interest_request
AFTER INSERT ON requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_interest_request();

-- ==========================================
-- تأكد من وجود الأعمدة المطلوبة في profiles
-- ==========================================
DO $$
BEGIN
  -- إضافة عمود interested_categories إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'interested_categories'
  ) THEN
    ALTER TABLE profiles ADD COLUMN interested_categories TEXT[] DEFAULT '{}';
  END IF;
  
  -- إضافة عمود interested_cities إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'interested_cities'
  ) THEN
    ALTER TABLE profiles ADD COLUMN interested_cities TEXT[] DEFAULT '{}';
  END IF;
  
  -- إضافة عمود notify_on_interest إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'notify_on_interest'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notify_on_interest BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- ==========================================
-- رسالة نجاح
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ تم إصلاح الـ trigger بنجاح!';
  RAISE NOTICE 'الآن يمكنك إنشاء طلبات جديدة بدون أخطاء.';
END $$;

