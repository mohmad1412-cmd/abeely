-- ==========================================
-- نظام المحادثات الكامل - ServiceLink AI Platform
-- ==========================================
-- شغّل هذا الملف في Supabase SQL Editor لتفعيل نظام المحادثات الكامل
-- يشمل: المحادثات، الرسائل، المرفقات، التسجيلات الصوتية، الإشعارات

-- ==========================================
-- الخطوة 1: إضافة الأعمدة الجديدة للرسائل
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

-- إضافة أعمدة إغلاق المحادثة
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE;

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS closed_reason TEXT;

-- ==========================================
-- الخطوة 2: إنشاء الفهارس للأداء
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_messages_audio ON messages(audio_url) WHERE audio_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_conversations_closed ON conversations(is_closed);

-- ==========================================
-- الخطوة 3: تحديث سياسات RLS للرسائل
-- ==========================================

-- السماح للمستخدمين بتحديث حالة القراءة للرسائل المرسلة إليهم
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
-- الخطوة 4: إنشاء Storage Buckets
-- ==========================================

-- إنشاء bucket للمرفقات
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('message-attachments', 'message-attachments', true, 10485760, 
   ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 
         'application/pdf', 'application/msword', 
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- إنشاء bucket للرسائل الصوتية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('voice-messages', 'voice-messages', true, 10485760, 
   ARRAY['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- الخطوة 5: سياسات Storage
-- ==========================================

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own voice messages" ON storage.objects;

-- سياسات bucket المرفقات
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

-- سياسات bucket الرسائل الصوتية
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
-- الخطوة 6: تفعيل Realtime
-- ==========================================

-- تأكد من تفعيل Realtime للجداول المطلوبة
-- (يجب تفعيلها من Supabase Dashboard > Database > Replication)

-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ==========================================
-- تم الانتهاء!
-- ==========================================
-- الآن نظام المحادثات يدعم:
-- ✅ المحادثات بين المستخدمين
-- ✅ الرسائل النصية
-- ✅ المرفقات (صور، فيديو، ملفات)
-- ✅ التسجيلات الصوتية
-- ✅ علامات القراءة (is_read)
-- ✅ الإشعارات التلقائية
-- ✅ عدد الرسائل غير المقروءة (badges)
-- ✅ إغلاق المحادثات

