-- ==========================================
-- Message Attachments & Voice Messages Schema
-- ==========================================
-- هذا الملف يضيف دعم المرفقات والتسجيلات الصوتية للرسائل

-- ==========================================
-- Step 1: Add columns to messages table
-- ==========================================

-- إضافة عمود المرفقات (array of URLs)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- إضافة عمود التسجيل الصوتي
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- إضافة عمود مدة التسجيل الصوتي (بالثواني)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS audio_duration INTEGER;

-- إضافة عمود نوع الرسالة
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'image', 'file', 'mixed'));

-- ==========================================
-- Step 2: Create message_attachments table for detailed tracking
-- ==========================================

CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'audio', 'document'
  file_size INTEGER, -- in bytes
  thumbnail_url TEXT, -- for images/videos
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Step 3: Create indexes
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_messages_audio ON messages(audio_url) WHERE audio_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- ==========================================
-- Step 4: RLS Policies for message_attachments
-- ==========================================

ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments of messages in their conversations
CREATE POLICY "Users can view attachments in their conversations"
ON message_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.id = message_attachments.message_id
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

-- Users can add attachments to their messages
CREATE POLICY "Users can add attachments to their messages"
ON message_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = message_attachments.message_id
    AND m.sender_id = auth.uid()
  )
);

-- ==========================================
-- Step 5: Update messages RLS to allow updating read status for other user's messages
-- ==========================================

-- Allow users to update is_read for messages sent to them
DROP POLICY IF EXISTS "Users can update messages read status" ON messages;
CREATE POLICY "Users can update messages read status"
ON messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

-- ==========================================
-- Step 6: Storage Buckets Setup
-- ==========================================

-- Create buckets for message attachments and voice messages
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('message-attachments', 'message-attachments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('voice-messages', 'voice-messages', true, 10485760, ARRAY['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for message-attachments
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view message attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

CREATE POLICY "Users can delete their own message attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Storage policies for voice-messages
CREATE POLICY "Users can upload voice messages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-messages' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Anyone can view voice messages"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-messages');

CREATE POLICY "Users can delete their own voice messages"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-messages' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- ==========================================
-- Step 7: Add is_closed and closed_reason to conversations if not exists
-- ==========================================

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE;

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS closed_reason TEXT;

-- ==========================================
-- Step 8: Enable Realtime for messages table
-- ==========================================

-- Enable realtime for messages table (run in Supabase Dashboard > Database > Replication)
-- Or use this SQL:
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;


