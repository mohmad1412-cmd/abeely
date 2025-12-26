-- ==========================================
-- تنظيف شامل وإصلاح
-- ==========================================
-- شغّل هذا الملف أولاً لحذف كل شيء قديم

-- حذف كل الـ triggers
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages CASCADE;
DROP TRIGGER IF EXISTS trigger_notify_on_offer_accepted ON offers CASCADE;
DROP TRIGGER IF EXISTS trigger_notify_on_new_offer ON offers CASCADE;
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages CASCADE;

-- حذف كل الـ functions (بأي signature ممكنة)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- حذف get_unread_notifications_count بجميع الـ signatures
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'get_unread_notifications_count') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    -- حذف mark_all_notifications_read
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'mark_all_notifications_read') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    -- حذف mark_notification_read
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'mark_notification_read') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    -- حذف notify_on_new_message
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'notify_on_new_message') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    -- حذف notify_on_offer_accepted
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'notify_on_offer_accepted') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    -- حذف notify_on_new_offer
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'notify_on_new_offer') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
    
    -- حذف update_conversation_on_message
    FOR r IN (SELECT oid::regprocedure FROM pg_proc WHERE proname = 'update_conversation_on_message') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- حذف الـ views
DROP VIEW IF EXISTS notifications_view CASCADE;
DROP VIEW IF EXISTS messages_view CASCADE;
DROP VIEW IF EXISTS conversations_view CASCADE;

-- حذف الـ policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- الآن أنشئ الـ functions الصحيحة
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

CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

