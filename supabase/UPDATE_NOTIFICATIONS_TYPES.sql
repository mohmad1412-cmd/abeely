-- ==========================================
-- تحديث CHECK CONSTRAINT لجدول notifications
-- يشمل جميع أنواع الإشعارات المستخدمة في التطبيق
-- ==========================================
-- تاريخ: 2026-01-14
-- الوصف: إضافة أنواع إشعارات جديدة مثل interest, offer_accepted, negotiation, etc.

-- الخطوة 1: حذف الـ CHECK constraint القديم
DO $$
BEGIN
  -- محاولة حذف الـ constraint القديم
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  RAISE NOTICE '✅ Dropped old constraint (if existed)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ No old constraint to drop or error: %', SQLERRM;
END $$;

-- الخطوة 2: إنشاء CHECK constraint جديد يشمل جميع الأنواع
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'offer',           -- عرض جديد
  'message',         -- رسالة جديدة
  'status',          -- تغيير حالة
  'system',          -- إشعار نظام
  'review',          -- تقييم جديد
  'request',         -- طلب جديد
  'interest',        -- طلب يطابق اهتماماتك
  'offer_accepted',  -- تم قبول عرضك
  'view_request',    -- شخص شاهد طلبك
  'view_offer',      -- شخص شاهد عرضك
  'negotiation',     -- مفاوضة جديدة
  'request_completed' -- تم إكمال الطلب
));

-- الخطوة 3: إضافة عمود data إذا لم يكن موجوداً (للبيانات الإضافية)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'data'
  ) THEN
    ALTER TABLE notifications ADD COLUMN data JSONB DEFAULT '{}';
    RAISE NOTICE '✅ Added column: data';
  ELSE
    RAISE NOTICE 'ℹ️ Column data already exists';
  END IF;
END $$;

-- الخطوة 4: إضافة عمود read_at إذا لم يكن موجوداً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Added column: read_at';
  ELSE
    RAISE NOTICE 'ℹ️ Column read_at already exists';
  END IF;
END $$;

-- الخطوة 5: التأكد من وجود جميع الأعمدة المطلوبة
DO $$
BEGIN
  -- related_request_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'related_request_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_request_id UUID REFERENCES requests(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added column: related_request_id';
  END IF;
  
  -- related_offer_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'related_offer_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_offer_id UUID REFERENCES offers(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added column: related_offer_id';
  END IF;
  
  -- related_message_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'related_message_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_message_id UUID REFERENCES messages(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added column: related_message_id';
  END IF;
  
  -- link_to
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'link_to'
  ) THEN
    ALTER TABLE notifications ADD COLUMN link_to TEXT;
    RAISE NOTICE '✅ Added column: link_to';
  END IF;
END $$;

-- الخطوة 6: إنشاء/تحديث الـ indexes للأداء
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_request ON notifications(related_request_id) WHERE related_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_related_offer ON notifications(related_offer_id) WHERE related_offer_id IS NOT NULL;

-- الخطوة 7: تفعيل RLS وإضافة policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- حذف الـ policies القديمة ثم إنشاء جديدة
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON notifications;
DROP POLICY IF EXISTS "Triggers can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- Policy: المستخدمون يمكنهم رؤية إشعاراتهم فقط
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Policy: المستخدمون يمكنهم تحديث إشعاراتهم (لتحديد كمقروء)
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: المستخدمون يمكنهم حذف إشعاراتهم
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- Policy: السماح للـ triggers (SECURITY DEFINER functions) بإنشاء إشعارات
-- هذا يتطلب أن تكون الدوال المنشئة للإشعارات تستخدم SECURITY DEFINER
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (
  -- السماح للنظام بإنشاء إشعارات لأي مستخدم
  -- هذا يعمل لأن الـ trigger functions تستخدم SECURITY DEFINER
  true
);

-- ==========================================
-- تحديث trigger functions لاستخدام SECURITY DEFINER
-- ==========================================

-- Trigger لإنشاء إشعار عند عرض جديد
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

-- Trigger لإنشاء إشعار عند قبول العرض
CREATE OR REPLACE FUNCTION notify_on_offer_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_title TEXT;
BEGIN
  -- فقط عند تغيير الحالة إلى 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- جلب عنوان الطلب
    SELECT title INTO v_request_title
    FROM requests
    WHERE id = NEW.request_id;
    
    -- إنشاء إشعار لمقدم العرض
    IF NEW.provider_id IS NOT NULL THEN
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
          NEW.provider_id,
          'offer_accepted',
          'تم قبول عرضك! 🎉',
          'تهانينا! تم قبول عرضك على الطلب: ' || COALESCE(v_request_title, 'طلب'),
          FALSE,
          NOW(),
          NEW.request_id,
          NEW.id,
          jsonb_build_object(
            'request_id', NEW.request_id,
            'offer_id', NEW.id,
            'request_title', v_request_title
          )
        );
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Failed to create notification for offer accepted: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_on_offer_accepted trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger لإنشاء إشعار عند رسالة جديدة
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  -- جلب معلومات المحادثة
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  -- تحديد المستلم (الطرف الآخر في المحادثة)
  IF v_conversation.participant1_id = NEW.sender_id THEN
    v_recipient_id := v_conversation.participant2_id;
  ELSE
    v_recipient_id := v_conversation.participant1_id;
  END IF;
  
  -- جلب اسم المرسل
  SELECT COALESCE(display_name, 'مستخدم') INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- إنشاء إشعار للمستلم
  IF v_recipient_id IS NOT NULL THEN
    BEGIN
      INSERT INTO notifications (
        user_id, 
        type, 
        title, 
        message, 
        is_read, 
        created_at,
        related_message_id,
        related_request_id,
        related_offer_id,
        data
      )
      VALUES (
        v_recipient_id,
        'message',
        'رسالة جديدة من ' || v_sender_name,
        LEFT(NEW.content, 100),
        FALSE,
        NOW(),
        NEW.id,
        v_conversation.request_id,
        v_conversation.offer_id,
        jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'sender_id', NEW.sender_id,
          'sender_name', v_sender_name
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create notification for new message: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notify_on_new_message trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- الخطوة 8: إعادة إنشاء الـ triggers
DROP TRIGGER IF EXISTS trigger_notify_on_new_offer ON offers;
CREATE TRIGGER trigger_notify_on_new_offer
AFTER INSERT ON offers
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_offer();

DROP TRIGGER IF EXISTS trigger_notify_on_offer_accepted ON offers;
CREATE TRIGGER trigger_notify_on_offer_accepted
AFTER UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION notify_on_offer_accepted();

DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages;
CREATE TRIGGER trigger_notify_on_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();

-- ==========================================
-- رسالة نجاح
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ تم تحديث نظام الإشعارات بنجاح!';
  RAISE NOTICE '✅ أنواع الإشعارات المدعومة:';
  RAISE NOTICE '   - offer (عرض جديد)';
  RAISE NOTICE '   - message (رسالة جديدة)';
  RAISE NOTICE '   - status (تغيير حالة)';
  RAISE NOTICE '   - system (إشعار نظام)';
  RAISE NOTICE '   - interest (طلب يطابق اهتماماتك)';
  RAISE NOTICE '   - offer_accepted (تم قبول عرضك)';
  RAISE NOTICE '   - negotiation (مفاوضة)';
  RAISE NOTICE '   - request_completed (تم إكمال الطلب)';
  RAISE NOTICE '   - view_request / view_offer (مشاهدة)';
  RAISE NOTICE '==========================================';
END $$;
