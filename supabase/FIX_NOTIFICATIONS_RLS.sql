-- ==========================================
-- إصلاح RLS Policies لجدول notifications
-- ==========================================
-- المشكلة: الـ triggers لا تستطيع إنشاء إشعارات بسبب RLS
-- الحل: إضافة policies تسمح للـ triggers بإنشاء إشعارات

-- تفعيل RLS على جدول notifications (إذا لم يكن مفعلاً)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- حذف الـ policies القديمة (إن وجدت)
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON notifications;
DROP POLICY IF EXISTS "Triggers can create notifications" ON notifications;

-- ==========================================
-- Policy 1: المستخدمون يمكنهم رؤية إشعاراتهم فقط
-- ==========================================
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- ==========================================
-- Policy 2: المستخدمون يمكنهم تحديث إشعاراتهم فقط
-- ==========================================
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- Policy 3: المستخدمون يمكنهم حذف إشعاراتهم فقط
-- ==========================================
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- ==========================================
-- Policy 4: السماح للـ triggers بإنشاء إشعارات
-- ==========================================
-- Server-side only: allow service role to manage notifications.
CREATE POLICY "Service role can manage notifications"
ON notifications
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ==========================================
-- التأكد من أن الـ trigger function تستخدم SECURITY DEFINER
-- ==========================================
CREATE OR REPLACE FUNCTION notify_on_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ==========================================
-- رسالة نجاح
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ تم إصلاح RLS Policies لجدول notifications!';
  RAISE NOTICE '✅ الـ triggers يمكنها الآن إنشاء إشعارات بدون مشاكل.';
  RAISE NOTICE '==========================================';
END $$;

