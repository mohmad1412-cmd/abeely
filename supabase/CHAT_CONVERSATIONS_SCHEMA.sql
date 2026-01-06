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
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.role() <> 'service_role' THEN
    PERFORM 1 FROM ai_conversations
    WHERE id = p_conversation_id
      AND user_id = auth.uid();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  UPDATE ai_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_ai_conversation_updated_at ON ai_conversation_messages;
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

-- حذف الـ policies القديمة إن وجدت
DROP POLICY IF EXISTS "Users can view their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can view messages of their conversations" ON ai_conversation_messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON ai_conversation_messages;
DROP POLICY IF EXISTS "Users can update messages of their conversations" ON ai_conversation_messages;
DROP POLICY IF EXISTS "Users can delete messages of their conversations" ON ai_conversation_messages;

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
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id INTO v_conversation_id
  FROM ai_conversations
  WHERE user_id = p_user_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_conversation_id;
END;
$$;

-- دالة لإنشاء محادثة جديدة
CREATE OR REPLACE FUNCTION create_new_conversation(p_user_id UUID, p_title TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

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
$$;

-- دالة لإيقاف محادثة (عند نشر الطلب)
CREATE OR REPLACE FUNCTION deactivate_conversation(p_conversation_id UUID, p_request_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_conversations
  SET is_active = false,
      request_id = COALESCE(p_request_id, request_id)
  WHERE id = p_conversation_id;
END;
$$;

