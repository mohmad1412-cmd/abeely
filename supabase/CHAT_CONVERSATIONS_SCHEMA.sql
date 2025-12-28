-- ==========================================
-- جدول محادثات الذكاء الاصطناعي
-- ==========================================

-- جدول المحادثات (كل محادثة تمثل جلسة إنشاء طلب)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- عنوان المحادثة (يتم توليده تلقائياً من الذكاء)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true, -- محادثة نشطة أم منتهية
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL, -- الطلب المرتبط (إن وجد)
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- جدول رسائل المحادثة
CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- بيانات إضافية للرسائل
  metadata JSONB DEFAULT '{}'::jsonb, -- لحفظ معلومات إضافية مثل attachments, draft data, etc.
  
  CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_is_active ON ai_conversations(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_messages_conversation_id ON ai_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_messages_created_at ON ai_conversation_messages(conversation_id, created_at ASC);

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_ai_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ai_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_conversation_updated_at
  AFTER INSERT OR UPDATE ON ai_conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_conversation_updated_at();

-- ==========================================
-- RLS Policies (Row Level Security)
-- ==========================================

-- تفعيل RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;

-- المستخدمون يمكنهم قراءة محادثاتهم فقط
CREATE POLICY "Users can view their own conversations"
  ON ai_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

-- المستخدمون يمكنهم إنشاء محادثات جديدة
CREATE POLICY "Users can create their own conversations"
  ON ai_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- المستخدمون يمكنهم تحديث محادثاتهم فقط
CREATE POLICY "Users can update their own conversations"
  ON ai_conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- المستخدمون يمكنهم حذف محادثاتهم فقط
CREATE POLICY "Users can delete their own conversations"
  ON ai_conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- المستخدمون يمكنهم قراءة رسائل محادثاتهم فقط
CREATE POLICY "Users can view messages of their conversations"
  ON ai_conversation_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_conversation_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- المستخدمون يمكنهم إضافة رسائل لمحادثاتهم فقط
CREATE POLICY "Users can insert messages to their conversations"
  ON ai_conversation_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_conversation_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- المستخدمون يمكنهم تحديث رسائل محادثاتهم فقط
CREATE POLICY "Users can update messages of their conversations"
  ON ai_conversation_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_conversation_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- المستخدمون يمكنهم حذف رسائل محادثاتهم فقط
CREATE POLICY "Users can delete messages of their conversations"
  ON ai_conversation_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_conversation_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- ==========================================
-- Functions مساعدة
-- ==========================================

-- دالة للحصول على المحادثة النشطة للمستخدم
CREATE OR REPLACE FUNCTION get_active_conversation(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  SELECT id INTO v_conversation_id
  FROM ai_conversations
  WHERE user_id = p_user_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإنشاء محادثة جديدة
CREATE OR REPLACE FUNCTION create_new_conversation(p_user_id UUID, p_title TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- إيقاف جميع المحادثات النشطة السابقة
  UPDATE ai_conversations
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;
  
  -- إنشاء محادثة جديدة
  INSERT INTO ai_conversations (user_id, title, is_active)
  VALUES (p_user_id, p_title, true)
  RETURNING id INTO v_conversation_id;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإيقاف محادثة (عند نشر الطلب)
CREATE OR REPLACE FUNCTION deactivate_conversation(p_conversation_id UUID, p_request_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_conversations
  SET is_active = false,
      request_id = COALESCE(p_request_id, request_id)
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

