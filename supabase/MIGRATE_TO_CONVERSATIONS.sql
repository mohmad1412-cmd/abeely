-- ==========================================
-- Migration: إضافة نظام Conversations
-- ==========================================
-- هذا الملف يضيف conversations table ويعدل messages table الموجود

-- Step 1: إنشاء conversations table
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
  UNIQUE(participant1_id, participant2_id, request_id, offer_id)
);

-- Step 2: إضافة conversation_id إلى messages table (إذا لم يكن موجوداً)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: إنشاء indexes للـ conversations
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_request ON conversations(request_id);
CREATE INDEX IF NOT EXISTS idx_conversations_offer ON conversations(offer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- Step 4: إضافة index لـ conversation_id في messages (إذا لم يكن موجوداً)
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id) WHERE conversation_id IS NOT NULL;

-- Step 5: تحديث notifications table (إضافة related_message_id إذا لم يكن موجوداً)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'related_message_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_message_id UUID REFERENCES messages(id) ON DELETE CASCADE;
  END IF;
  
  -- إضافة read_at إذا لم يكن موجوداً
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
  END IF;
END $$;

-- Step 6: إنشاء indexes للـ notifications (إذا لم تكن موجودة)
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

