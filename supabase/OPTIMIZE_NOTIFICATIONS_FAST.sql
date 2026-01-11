-- ==========================================
-- تحسين سرعة الإشعارات المنبثقة (Push Notifications)
-- ==========================================
-- بناءً على أفضل الممارسات: Trigger بسيط → Edge Function نحيف → FCM سريع
-- ==========================================

-- ==========================================
-- الخطوة 1: تفعيل pg_net extension (للاستدعاءات غير المتزامنة)
-- ==========================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ==========================================
-- الخطوة 2: إنشاء Trigger بسيط جداً (فقط استدعاء Edge Function)
-- ==========================================

-- حذف الـ Triggers القديمة المعقدة
DROP TRIGGER IF EXISTS trigger_notify_on_new_offer ON offers;
DROP TRIGGER IF EXISTS trigger_notify_on_offer_accepted ON offers;
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages;

-- Function بسيطة جداً - فقط استدعاء Edge Function
CREATE OR REPLACE FUNCTION trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  payload JSONB;
BEGIN
  -- الحصول على URL Edge Function من environment variable أو استخدام قيمة افتراضية
  edge_function_url := current_setting('app.edge_function_url', TRUE);
  
  -- إذا لم يكن موجود، استخدم قيمة افتراضية (سيتم تحديثها لاحقاً)
  IF edge_function_url IS NULL OR edge_function_url = '' THEN
    edge_function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification-fast';
  END IF;

  -- بناء payload بسيط - فقط البيانات الأساسية
  IF TG_TABLE_NAME = 'offers' THEN
    IF TG_OP = 'INSERT' THEN
      -- عرض جديد
      payload := jsonb_build_object(
        'type', 'new_offer',
        'offer_id', NEW.id,
        'request_id', NEW.request_id,
        'provider_id', NEW.provider_id,
        'provider_name', COALESCE(NEW.provider_name, 'مقدم خدمة'),
        'offer_title', COALESCE(NEW.title, ''),
        'recipient_id', (
          SELECT author_id FROM requests WHERE id = NEW.request_id
        )
      );
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
      -- عرض مقبول
      payload := jsonb_build_object(
        'type', 'offer_accepted',
        'offer_id', NEW.id,
        'request_id', NEW.request_id,
        'provider_id', NEW.provider_id,
        'recipient_id', NEW.provider_id
      );
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    IF TG_OP = 'INSERT' THEN
      -- رسالة جديدة
      payload := jsonb_build_object(
        'type', 'new_message',
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id,
        'content_preview', LEFT(NEW.content, 50),
        'recipient_id', (
          SELECT CASE
            WHEN participant1_id = NEW.sender_id THEN participant2_id
            ELSE participant1_id
          END
          FROM conversations WHERE id = NEW.conversation_id
        )
      );
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- استدعاء Edge Function بشكل غير متزامن (async) - لا ينتظر الرد
  -- استخدام pg_net إذا كان متوفراً (الأفضل)، وإلا نستخدم طريقة بديلة
  BEGIN
    PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', TRUE)
      ),
      body := payload::jsonb
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Fallback: إذا pg_net غير متوفر، سجل فقط ولا توقف العملية
      RAISE NOTICE 'pg_net not available or failed. Edge Function URL: %, Payload: %', edge_function_url, payload;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- في حالة الخطأ، فقط سجل ولا توقف العملية
    RAISE WARNING 'Failed to trigger push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء Triggers بسيطة
CREATE TRIGGER trigger_push_notification_offer
AFTER INSERT OR UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION trigger_push_notification();

CREATE TRIGGER trigger_push_notification_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION trigger_push_notification();

-- ==========================================
-- الخطوة 3: تحديث إعدادات المشروع (اختياري - يمكن تعيينها يدوياً)
-- ==========================================

-- يمكن تعيين هذه القيم من Supabase Dashboard → Settings → Database → Custom Config
-- أو من خلال:
-- ALTER DATABASE postgres SET app.edge_function_url = 'https://...';
-- ALTER DATABASE postgres SET app.service_role_key = '...';

-- ==========================================
-- ملاحظات مهمة:
-- ==========================================
-- 1. هذا الكود يستبدل Triggers القديمة المعقدة ببساطة
-- 2. Edge Function "send-push-notification-fast" يجب أن يكون نحيف جداً
-- 3. استدعاء pg_net غير متزامن - لا يبطئ الـ transaction
-- 4. في حالة الخطأ، العملية الأساسية (INSERT/UPDATE) لا تتأثر
