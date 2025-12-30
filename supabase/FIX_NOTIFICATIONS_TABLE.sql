-- ==========================================
-- إصلاح جدول notifications - إضافة الأعمدة المفقودة
-- ==========================================
-- المشكلة: الـ triggers تحاول إدخال بيانات في أعمدة غير موجودة
-- الحل: إضافة الأعمدة المطلوبة

-- الخطوة 1: إضافة الأعمدة المفقودة إلى جدول notifications
DO $$
BEGIN
  -- إضافة عمود related_request_id إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_request_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_request_id UUID REFERENCES requests(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added column: related_request_id';
  ELSE
    RAISE NOTICE 'ℹ️ Column related_request_id already exists';
  END IF;
  
  -- إضافة عمود related_offer_id إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_offer_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_offer_id UUID REFERENCES offers(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added column: related_offer_id';
  ELSE
    RAISE NOTICE 'ℹ️ Column related_offer_id already exists';
  END IF;
  
  -- إضافة عمود related_message_id إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_message_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_message_id UUID REFERENCES messages(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added column: related_message_id';
  ELSE
    RAISE NOTICE 'ℹ️ Column related_message_id already exists';
  END IF;
  
  -- إضافة عمود link_to إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'link_to'
  ) THEN
    ALTER TABLE notifications ADD COLUMN link_to TEXT;
    RAISE NOTICE '✅ Added column: link_to';
  ELSE
    RAISE NOTICE 'ℹ️ Column link_to already exists';
  END IF;
  
  -- إضافة عمود data إذا لم يكن موجوداً (للبيانات الإضافية)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'data'
  ) THEN
    ALTER TABLE notifications ADD COLUMN data JSONB DEFAULT '{}';
    RAISE NOTICE '✅ Added column: data';
  ELSE
    RAISE NOTICE 'ℹ️ Column data already exists';
  END IF;
END $$;

-- الخطوة 2: إنشاء indexes للأداء
CREATE INDEX IF NOT EXISTS idx_notifications_related_request_id ON notifications(related_request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_offer_id ON notifications(related_offer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_message_id ON notifications(related_message_id);

-- الخطوة 3: إعادة إنشاء الـ trigger function بشكل آمن
CREATE OR REPLACE FUNCTION notify_on_new_offer()
RETURNS TRIGGER AS $$
DECLARE
  v_request_owner_id UUID;
  v_request_title TEXT;
  v_offer_provider_name TEXT;
BEGIN
  -- جلب معلومات الطلب وصاحبه
  SELECT r.author_id, r.title 
  INTO v_request_owner_id, v_request_title
  FROM requests r
  WHERE r.id = NEW.request_id;
  
  -- جلب اسم مقدم العرض
  v_offer_provider_name := COALESCE(NEW.provider_name, 'مزود خدمة');
  
  -- إنشاء إشعار لصاحب الطلب (فقط إذا لم يكن هو نفسه مقدم العرض)
  IF v_request_owner_id IS NOT NULL AND v_request_owner_id != NEW.provider_id THEN
    BEGIN
      INSERT INTO notifications (
        user_id, 
        type, 
        title, 
        message, 
        is_read, 
        created_at,
        related_request_id,
        related_offer_id,
        data
      )
      VALUES (
        v_request_owner_id,
        'offer',
        'عرض جديد على طلبك 🎯',
        'استلمت عرض من ' || v_offer_provider_name || ' على طلبك: ' || COALESCE(v_request_title, 'طلب'),
        FALSE,
        NOW(),
        NEW.request_id,
        NEW.id,
        jsonb_build_object(
          'request_id', NEW.request_id,
          'offer_id', NEW.id,
          'provider_name', v_offer_provider_name,
          'price', NEW.price
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- في حالة أي خطأ، نسجل التحذير ولا نوقف العملية
        RAISE WARNING 'Failed to create notification for new offer: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_on_new_offer trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- الخطوة 4: إعادة إنشاء الـ trigger
DROP TRIGGER IF EXISTS trigger_notify_on_new_offer ON offers;
CREATE TRIGGER trigger_notify_on_new_offer
AFTER INSERT ON offers
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_offer();

-- ==========================================
-- رسالة نجاح
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ تم إصلاح جدول notifications بنجاح!';
  RAISE NOTICE '✅ تم تحديث trigger إشعار العروض الجديدة!';
  RAISE NOTICE 'الآن يمكنك تقديم العروض بدون أخطاء.';
  RAISE NOTICE '==========================================';
END $$;

