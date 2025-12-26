-- ==========================================
-- Complete Messages & Notifications Schema
-- ==========================================
-- هذا الملف يحتوي على كل شيء - شغّله مرة واحدة فقط

-- ==========================================
-- Step 1: Drop Everything First
-- ==========================================

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages CASCADE;
DROP TRIGGER IF EXISTS trigger_notify_on_offer_accepted ON offers CASCADE;
DROP TRIGGER IF EXISTS trigger_notify_on_new_offer ON offers CASCADE;
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages CASCADE;

-- Drop functions (with CASCADE to remove all dependencies)
DROP FUNCTION IF EXISTS notify_on_new_message() CASCADE;
DROP FUNCTION IF EXISTS notify_on_offer_accepted() CASCADE;
DROP FUNCTION IF EXISTS notify_on_new_offer() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_all_notifications_read() CASCADE;
DROP FUNCTION IF EXISTS get_unread_notifications_count() CASCADE;

-- Drop policies
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Drop views
DROP VIEW IF EXISTS notifications_view CASCADE;
DROP VIEW IF EXISTS messages_view CASCADE;
DROP VIEW IF EXISTS conversations_view CASCADE;

-- ==========================================
-- Step 2: Create Tables
-- ==========================================

-- Conversations table (between users)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure unique conversation between two users for same request/offer
  UNIQUE(participant1_id, participant2_id, request_id, offer_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('offer', 'message', 'status', 'system', 'review', 'request')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_to TEXT,
  related_request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  related_offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  related_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Step 3: Create Indexes
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_request ON conversations(request_id);
CREATE INDEX IF NOT EXISTS idx_conversations_offer ON conversations(offer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ==========================================
-- Step 4: Create Functions
-- ==========================================

-- Update conversation last_message_at when new message is created
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create notification when new offer is created
CREATE OR REPLACE FUNCTION notify_on_new_offer()
RETURNS TRIGGER AS $$
DECLARE
  request_owner_id UUID;
BEGIN
  -- Get request owner (using author_id, not user_id)
  SELECT author_id INTO request_owner_id
  FROM requests
  WHERE id = NEW.request_id;
  
  -- Create notification for request owner
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

-- Auto-create notification when offer is accepted
CREATE OR REPLACE FUNCTION notify_on_offer_accepted()
RETURNS TRIGGER AS $$
DECLARE
  offer_provider_id UUID;
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Get offer provider (using provider_id)
    SELECT provider_id INTO offer_provider_id
    FROM offers
    WHERE id = NEW.id;
    
    -- Create notification for offer provider
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

-- Auto-create notification when new message is received
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  conversation_record conversations%ROWTYPE;
  recipient_id UUID;
BEGIN
  -- Get conversation details
  SELECT * INTO conversation_record
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  -- Determine recipient (the other participant)
  IF conversation_record.participant1_id = NEW.sender_id THEN
    recipient_id := conversation_record.participant2_id;
  ELSE
    recipient_id := conversation_record.participant1_id;
  END IF;
  
  -- Create notification for recipient
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read for user
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

-- Get unread notifications count
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

-- ==========================================
-- Step 5: Create Triggers
-- ==========================================

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

-- ==========================================
-- Step 6: Enable RLS
-- ==========================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Step 7: Create Policies
-- ==========================================

-- Conversations: Users can only see conversations they're part of
CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
USING (
  auth.uid() = participant1_id OR 
  auth.uid() = participant2_id
);

CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (
  auth.uid() = participant1_id OR 
  auth.uid() = participant2_id
);

-- Messages: Users can only see messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

