-- ==========================================
-- إنشاء Functions و Triggers (نسخة متوافقة مع الـ schema الموجود)
-- ==========================================

-- حذف الـ triggers القديمة
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages;
DROP TRIGGER IF EXISTS trigger_notify_on_offer_accepted ON offers;
DROP TRIGGER IF EXISTS trigger_notify_on_new_offer ON offers;
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;

-- حذف الـ functions القديمة (بجميع الـ signatures)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'get_unread_notifications_count') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'mark_all_notifications_read') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'mark_notification_read') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'notify_on_new_message') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'notify_on_offer_accepted') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'notify_on_new_offer') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'update_conversation_on_message') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- Functions
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث conversation فقط إذا كان conversation_id موجود
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE conversations
    SET 
      last_message_at = NEW.created_at,
      last_message_preview = LEFT(NEW.content, 100),
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_on_new_offer()
RETURNS TRIGGER AS $$
DECLARE
  request_owner_id UUID;
BEGIN
  SELECT author_id INTO request_owner_id
  FROM requests
  WHERE id = NEW.request_id;
  
  IF request_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id, related_offer_id)
    VALUES (
      request_owner_id,
      'offer',
      'عرض جديد على طلبك',
      'تلقيت عرضاً جديداً على طلبك',
      '/request/' || NEW.request_id,
      NEW.request_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_on_offer_accepted()
RETURNS TRIGGER AS $$
DECLARE
  offer_provider_id UUID;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    SELECT provider_id INTO offer_provider_id
    FROM offers
    WHERE id = NEW.id;
    
    IF offer_provider_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id, related_offer_id)
      VALUES (
        offer_provider_id,
        'status',
        'تم قبول عرضك! 🎉',
        'تم قبول عرضك على الطلب',
        '/request/' || NEW.request_id,
        NEW.request_id,
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  conversation_record conversations%ROWTYPE;
  recipient_id UUID;
BEGIN
  -- فقط إذا كان conversation_id موجود
  IF NEW.conversation_id IS NOT NULL THEN
    SELECT * INTO conversation_record
    FROM conversations
    WHERE id = NEW.conversation_id;
    
    IF conversation_record.id IS NOT NULL THEN
      -- تحديد المستلم (المشارك الآخر)
      IF conversation_record.participant1_id = NEW.sender_id THEN
        recipient_id := conversation_record.participant2_id;
      ELSE
        recipient_id := conversation_record.participant1_id;
      END IF;
      
      -- إنشاء إشعار للمستلم
      IF recipient_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, link_to, related_message_id, related_request_id, related_offer_id)
        VALUES (
          recipient_id,
          'message',
          'رسالة جديدة',
          LEFT(NEW.content, 50),
          '/messages/' || NEW.conversation_id,
          NEW.id,
          conversation_record.request_id,
          conversation_record.offer_id
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_notifications_count()
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM notifications
  WHERE user_id = auth.uid() AND is_read = FALSE;
  
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();

CREATE TRIGGER trigger_notify_on_new_offer
AFTER INSERT ON offers
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_offer();

CREATE TRIGGER trigger_notify_on_offer_accepted
AFTER UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION notify_on_offer_accepted();

CREATE TRIGGER trigger_notify_on_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();

