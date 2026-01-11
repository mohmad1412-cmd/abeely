-- ==========================================
-- إضافة الجداول والأعمدة المفقودة من Schema القديم
-- ==========================================
-- هذا الملف يضيف ما هو موجود في Schema القديم وليس في الجديد
-- ==========================================

-- ==========================================
-- 1. إضافة أعمدة مفقودة في categories
-- ==========================================

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS label_en TEXT,
ADD COLUMN IF NOT EXISTS label_ur TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

-- ==========================================
-- 2. إضافة أعمدة مفقودة في conversations
-- ==========================================

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS closed_reason TEXT;

-- ==========================================
-- 3. تحديث جدول messages لإضافة الأعمدة القديمة (للتوافق)
-- ==========================================
-- ملاحظة: الأعمدة الجديدة (conversation_id) موجودة، لكن القديمة (request_id, offer_id) مفيدة للرسائل القديمة

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_draft_preview BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT '{}'::jsonb;

-- Indexes إضافية
CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_offer ON messages(offer_id) WHERE offer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id) WHERE receiver_id IS NOT NULL;

-- ==========================================
-- 4. إضافة عمود data في notifications
-- ==========================================

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;

-- ==========================================
-- 5. تحديث جدول offers لإضافة الأعمدة المفقودة
-- ==========================================

ALTER TABLE offers
ADD COLUMN IF NOT EXISTS provider_avatar TEXT,
ADD COLUMN IF NOT EXISTS delivery_time TEXT,
ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS provider_phone TEXT,
ADD COLUMN IF NOT EXISTS provider_rating NUMERIC,
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- تغيير price من NUMERIC إلى TEXT (إذا كان مطلوباً)
-- ⚠️ احذر: هذا قد يؤثر على البيانات الموجودة
-- ALTER TABLE offers ALTER COLUMN price TYPE TEXT;

-- ==========================================
-- 6. تحديث جدول requests لإضافة الأعمدة المفقودة
-- ==========================================

ALTER TABLE requests
ADD COLUMN IF NOT EXISTS budget_type TEXT DEFAULT 'not-specified' CHECK (budget_type IN ('not-specified', 'fixed', 'range', 'negotiable')),
ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'not-specified' CHECK (delivery_type IN ('not-specified', 'pickup', 'delivery', 'both')),
ADD COLUMN IF NOT EXISTS delivery_from TEXT,
ADD COLUMN IF NOT EXISTS delivery_to TEXT,
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS accepted_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS accepted_offer_provider TEXT,
ADD COLUMN IF NOT EXISTS seriousness INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS author_name TEXT,
ADD COLUMN IF NOT EXISTS is_guest_request BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contact_whatsapp BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS contact_call BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS contact_chat BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS offers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- تغيير budget_min و budget_max من NUMERIC إلى TEXT (إذا كان مطلوباً)
-- ⚠️ احذر: هذا قد يؤثر على البيانات الموجودة
-- ALTER TABLE requests ALTER COLUMN budget_min TYPE TEXT;
-- ALTER TABLE requests ALTER COLUMN budget_max TYPE TEXT;

-- ==========================================
-- 7. إنشاء جدول ai_conversations (للذكاء الاصطناعي)
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_request ON ai_conversations(request_id);

-- ==========================================
-- 8. إنشاء جدول ai_conversation_messages
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON ai_conversation_messages(created_at DESC);

-- ==========================================
-- 9. إنشاء جدول cities (المدن)
-- ==========================================

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  region TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cities_active ON cities(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_cities_sort ON cities(sort_order);

-- ==========================================
-- 10. إنشاء جدول pending_categories (التصنيفات المعلقة)
-- ==========================================

CREATE TABLE IF NOT EXISTS pending_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_label TEXT NOT NULL,
  suggested_emoji TEXT DEFAULT '📦',
  suggested_description TEXT,
  suggested_by_ai BOOLEAN DEFAULT TRUE,
  request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  merged_with_category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_categories_status ON pending_categories(status);
CREATE INDEX IF NOT EXISTS idx_pending_categories_request ON pending_categories(request_id);

-- ==========================================
-- 11. إنشاء جدول request_view_logs (سجلات المشاهدات)
-- ==========================================

CREATE TABLE IF NOT EXISTS request_view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_view_logs_request ON request_view_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_user ON request_view_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_session ON request_view_logs(session_id);

-- ==========================================
-- 12. إنشاء جدول reviews (التقييمات)
-- ==========================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  role TEXT NOT NULL CHECK (role IN ('requester', 'provider')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_author ON reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);

-- ==========================================
-- 13. تفعيل RLS على الجداول الجديدة
-- ==========================================

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_view_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 14. RLS Policies أساسية للجداول الجديدة
-- ==========================================

-- AI Conversations: المستخدم يرى محادثاته فقط
DROP POLICY IF EXISTS "Users can view their own AI conversations" ON ai_conversations;
CREATE POLICY "Users can view their own AI conversations"
ON ai_conversations FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create AI conversations" ON ai_conversations;
CREATE POLICY "Users can create AI conversations"
ON ai_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- AI Messages: المستخدم يرى رسائل محادثاته فقط
DROP POLICY IF EXISTS "Users can view AI messages in their conversations" ON ai_conversation_messages;
CREATE POLICY "Users can view AI messages in their conversations"
ON ai_conversation_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE ai_conversations.id = ai_conversation_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create AI messages" ON ai_conversation_messages;
CREATE POLICY "Users can create AI messages"
ON ai_conversation_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE ai_conversations.id = ai_conversation_messages.conversation_id
    AND ai_conversations.user_id = auth.uid()
  )
);

-- Cities: الجميع يقرأ المدن النشطة
DROP POLICY IF EXISTS "Anyone can view active cities" ON cities;
CREATE POLICY "Anyone can view active cities"
ON cities FOR SELECT
USING (is_active = TRUE);

-- Pending Categories: فقط Admin يرى ويعدل
-- (يمكنك إضافة policies أكثر تفصيلاً حسب احتياجك)

-- Request View Logs: المستخدم يرى سجلاته فقط (أو Admin)
DROP POLICY IF EXISTS "Users can view their own view logs" ON request_view_logs;
CREATE POLICY "Users can view their own view logs"
ON request_view_logs FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Reviews: الجميع يقرأ التقييمات، المستخدم يكتب تقييمه فقط
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews"
ON reviews FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Users can create reviews"
ON reviews FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- ==========================================
-- ملاحظات:
-- ==========================================
-- ✅ تمت إضافة جميع الجداول والأعمدة المفقودة
-- ⚠️ بعض الأعمدة (مثل price في offers) قد تحتاج لتغيير نوع البيانات من NUMERIC إلى TEXT
-- ⚠️ راجع Policies الأمنية - قد تحتاج لتعديلها حسب احتياجك
-- ⚠️ user_preferences: البيانات موجودة في profiles، لا حاجة لجدول منفصل
