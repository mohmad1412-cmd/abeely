-- ==========================================
-- إنشاء RLS Policies (نسخة متوافقة مع الـ schema الموجود)
-- ==========================================

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- حذف الـ policies القديمة
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Create policies
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

-- Messages: يمكن للمستخدمين رؤية الرسائل في محادثاتهم (إذا كان conversation_id موجود)
-- أو الرسائل القديمة التي تستخدم request_id/offer_id (للتوافق مع النظام القديم)
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
  -- الرسائل الجديدة (مع conversation_id)
  (
    conversation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
    )
  )
  OR
  -- الرسائل القديمة (مع sender_id/receiver_id)
  (
    conversation_id IS NULL
    AND (sender_id = auth.uid() OR receiver_id = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    -- إذا كان conversation_id موجود، تأكد أن المستخدم مشارك في المحادثة
    (
      conversation_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM conversations
        WHERE conversations.id = messages.conversation_id
        AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
      )
    )
    OR
    -- للرسائل القديمة (بدون conversation_id)
    conversation_id IS NULL
  )
);

CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

