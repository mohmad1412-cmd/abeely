-- ==========================================
-- ملف شامل لنقل جميع الجداول والوظائف (Schema فقط - بدون بيانات)
-- ==========================================
-- ⚠️ مهم: نفّذ هذا الملف في SQL Editor في Supabase Dashboard للمشروع الجديد
-- هذا الملف يجمع كل الجداول الأساسية والوظائف في مكان واحد
-- ==========================================

-- ==========================================
-- الجزء 1: إنشاء جداول المستخدمين (Profiles & Auth)
-- ==========================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'provider', 'admin')),
  is_guest BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER DEFAULT 0 CHECK (reviews_count >= 0),
  preferred_categories JSONB DEFAULT '[]'::jsonb,
  preferred_cities JSONB DEFAULT '[]'::jsonb,
  interested_categories TEXT[] DEFAULT '{}',
  interested_cities TEXT[] DEFAULT '{}',
  radar_words TEXT[] DEFAULT '{}',
  notify_on_interest BOOLEAN DEFAULT true,
  role_mode TEXT DEFAULT 'requester' CHECK (role_mode IN ('requester', 'provider')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verified guests table
CREATE TABLE IF NOT EXISTS verified_guests (
  phone TEXT PRIMARY KEY,
  verification_code TEXT NOT NULL,
  code_expires_at TIMESTAMPTZ NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_interested_categories_gin ON profiles USING GIN (interested_categories);
CREATE INDEX IF NOT EXISTS idx_profiles_interested_cities_gin ON profiles USING GIN (interested_cities);

-- Indexes for verified_guests
CREATE INDEX IF NOT EXISTS idx_verified_guests_code_expires ON verified_guests(code_expires_at);
CREATE INDEX IF NOT EXISTS idx_verified_guests_is_verified ON verified_guests(is_verified);

-- ==========================================
-- الجزء 2: جداول الطلبات والعروض
-- ==========================================

-- Requests table (من الـ schema الفعلي للمشروع القديم)
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  location_city TEXT,
  categories TEXT[],
  status TEXT DEFAULT 'active',
  is_public BOOLEAN DEFAULT TRUE,
  budget_min NUMERIC,
  budget_max NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offers table (من الـ schema الفعلي للمشروع القديم)
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  duration TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_author ON requests(author_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_request ON offers(request_id);
CREATE INDEX IF NOT EXISTS idx_offers_provider ON offers(provider_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- ==========================================
-- الجزء 3: جداول التصنيفات
-- ==========================================

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_request_categories_request ON request_categories(request_id);
CREATE INDEX IF NOT EXISTS idx_request_categories_category ON request_categories(category_id);

-- إضافة التصنيفات الأساسية
INSERT INTO categories (id, label, emoji, description, sort_order) VALUES
  ('tech', 'خدمات تقنية وبرمجة', '💻', 'تطوير المواقع، التطبيقات، البرمجة، الأنظمة', 1),
  ('design', 'تصميم وجرافيكس', '🎨', 'تصميم الشعارات، الهوية البصرية، UI/UX', 2),
  ('writing', 'كتابة ومحتوى', '✍️', 'كتابة المقالات، المحتوى التسويقي، التدقيق اللغوي', 3),
  ('marketing', 'تسويق ومبيعات', '📊', 'التسويق الرقمي، إدارة الحملات، السوشيال ميديا', 4),
  ('engineering', 'هندسة وعمارة', '🏗️', 'التصميم المعماري، الهندسة المدنية، الديكور', 5),
  ('mobile', 'خدمات جوال', '📱', 'تطوير تطبيقات الجوال، iOS، Android', 6),
  ('maintenance', 'صيانة ومنزل', '🔧', 'صيانة المنازل، السباكة، الكهرباء', 7),
  ('transport', 'نقل وخدمات لوجستية', '🚚', 'خدمات النقل، الشحن، التوصيل', 8),
  ('health', 'صحة ولياقة', '🩺', 'الاستشارات الصحية، التغذية، اللياقة', 9),
  ('translation', 'ترجمة ولغات', '🌐', 'خدمات الترجمة، التدقيق، تعليم اللغات', 10),
  ('education', 'تعليم وتدريب', '📚', 'الدروس الخصوصية، الدورات، التدريب', 11),
  ('legal', 'قانون واستشارات', '⚖️', 'الاستشارات القانونية، العقود، التوثيق', 12),
  ('finance', 'مالية ومحاسبة', '💰', 'المحاسبة، الضرائب، الاستشارات المالية', 13),
  ('photography', 'تصوير وفيديو', '📷', 'تصوير المناسبات، المونتاج، الإنتاج', 14),
  ('events', 'مناسبات وحفلات', '🎉', 'تنظيم الحفلات، الأفراح، المؤتمرات', 15),
  ('beauty', 'تجميل وعناية', '💅', 'خدمات التجميل، العناية بالبشرة، الشعر', 16),
  ('cleaning', 'تنظيف وخدمات منزلية', '🧹', 'تنظيف المنازل، المكاتب، الخدمات المنزلية', 17),
  ('food', 'طعام ومطاعم', '🍽️', 'الطبخ، التموين، الحلويات', 18),
  ('car', 'سيارات وقطع غيار', '🚗', 'صيانة السيارات، قطع الغيار، التأجير', 19),
  ('other', 'أخرى', '📦', 'خدمات متنوعة أخرى', 100)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ==========================================
-- الجزء 4: جداول المحادثات والرسائل
-- ==========================================

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

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('offer', 'message', 'status', 'system', 'review', 'request', 'interest')),
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

-- Indexes
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
-- الجزء 5: جداول إضافية
-- ==========================================

-- FCM Tokens
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON public.fcm_tokens(token);

-- Request Views
CREATE TABLE IF NOT EXISTS request_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_request_views_user ON request_views(user_id);
CREATE INDEX IF NOT EXISTS idx_request_views_request ON request_views(request_id);
CREATE INDEX IF NOT EXISTS idx_request_views_unread ON request_views(user_id, is_read) WHERE is_read = FALSE;

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('request', 'offer', 'user')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'fraud', 'harassment', 'misleading', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_id, report_type);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_per_user ON reports(reporter_id, target_id, report_type);

-- ==========================================
-- الجزء 6: Functions المساعدة
-- ==========================================

-- Function لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Functions للمحادثات والرسائل
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
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

-- Functions للإشعارات
CREATE OR REPLACE FUNCTION notify_on_new_offer()
RETURNS TRIGGER AS $$
DECLARE
  request_owner_id UUID;
  request_title TEXT;
BEGIN
  SELECT r.author_id, r.title
  INTO request_owner_id, request_title
  FROM requests r
  WHERE r.id = NEW.request_id;
  
  IF request_owner_id IS NOT NULL AND request_owner_id != NEW.provider_id THEN
    INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id, related_offer_id)
    VALUES (
      request_owner_id,
      'offer',
      'عرض جديد على طلبك 🎯',
      'استلمت عرض من ' || COALESCE(NEW.provider_name, 'مزود خدمة') || ' على طلبك: ' || COALESCE(request_title, 'طلب'),
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
  request_title TEXT;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    SELECT r.title INTO request_title
    FROM requests r
    WHERE r.id = NEW.request_id;
    
    IF NEW.provider_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id, related_offer_id)
      VALUES (
        NEW.provider_id,
        'status',
        'تم قبول عرضك! 🎉',
        'تهانينا! تم قبول عرضك على طلب: ' || COALESCE(request_title, 'طلب'),
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
  sender_name TEXT;
BEGIN
  IF NEW.conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO conversation_record
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  IF conversation_record.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF conversation_record.participant1_id = NEW.sender_id THEN
    recipient_id := conversation_record.participant2_id;
  ELSE
    recipient_id := conversation_record.participant1_id;
  END IF;
  
  SELECT COALESCE(display_name, 'مستخدم')
  INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link_to, related_message_id, related_request_id, related_offer_id)
    VALUES (
      recipient_id,
      'message',
      'رسالة جديدة من ' || sender_name || ' 💬',
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

-- Functions مساعدة للإشعارات
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

-- Functions للتصنيفات
CREATE OR REPLACE FUNCTION get_active_categories()
RETURNS TABLE (
  id TEXT,
  label TEXT,
  emoji TEXT,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.label, c.emoji, c.description
  FROM categories c
  WHERE c.is_active = TRUE
  ORDER BY c.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_request_categories(
  p_request_id UUID,
  p_category_ids TEXT[]
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM request_categories WHERE request_id = p_request_id;
  INSERT INTO request_categories (request_id, category_id)
  SELECT p_request_id, unnest(p_category_ids)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function للبحث عن مستخدمين مهتمين (لـ Edge Function)
CREATE OR REPLACE FUNCTION find_interested_users(
  p_category TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_keywords TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  phone TEXT,
  match_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.display_name,
    p.phone,
    CASE
      WHEN p_category IS NOT NULL AND p_category = ANY(p.interested_categories) THEN 'category'
      WHEN p_city IS NOT NULL AND p_city = ANY(p.interested_cities) THEN 'city'
      WHEN p_keywords IS NOT NULL AND p.radar_words && p_keywords THEN 'radar_word'
      ELSE 'unknown'
    END as match_type
  FROM public.profiles p
  WHERE 
    p.notify_on_interest = true
    AND p.role_mode = 'provider'
    AND (
      (p_category IS NOT NULL AND p_category = ANY(p.interested_categories))
      OR (p_city IS NOT NULL AND p_city = ANY(p.interested_cities))
      OR (p_keywords IS NOT NULL AND p.radar_words && p_keywords)
    );
END;
$$;

-- ==========================================
-- الجزء 7: Triggers
-- ==========================================

-- حذف Triggers القديمة أولاً (لتجنب خطأ "already exists")
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_verified_guests_updated_at ON verified_guests;
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON messages;
DROP TRIGGER IF EXISTS trigger_notify_on_new_offer ON offers;
DROP TRIGGER IF EXISTS trigger_notify_on_offer_accepted ON offers;
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages;

-- إنشاء Triggers
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verified_guests_updated_at
BEFORE UPDATE ON verified_guests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

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
-- الجزء 8: تفعيل RLS
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- الجزء 9: RLS Policies (أساسية)
-- ==========================================

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own preferences" ON profiles;
DROP POLICY IF EXISTS "Users can update own preferences" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Categories
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (is_active = TRUE);

-- Conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations"
ON conversations FOR SELECT
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE conversations.id = messages.conversation_id
    AND (conversations.participant1_id = auth.uid() OR conversations.participant2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
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

-- Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- FCM Tokens
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.fcm_tokens;
CREATE POLICY "Users can manage their own tokens"
ON public.fcm_tokens FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Requests (أساسية - قد تحتاج لمزيد من Policies)
DROP POLICY IF EXISTS "Public requests are viewable by everyone" ON requests;
CREATE POLICY "Public requests are viewable by everyone"
ON requests FOR SELECT
USING (is_public = TRUE OR author_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
CREATE POLICY "Users can insert their own requests"
ON requests FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- ==========================================
-- ملاحظات نهائية
-- ==========================================

-- ==========================================
-- ملاحظات نهائية
-- ==========================================

-- ⚠️ هذا الملف ينشئ Schema فقط - الجداول ستكون فارغة (بدون بيانات)
-- ⚠️ قد تحتاج لإضافة RLS Policies إضافية حسب متطلباتك الأمنية
-- ⚠️ إذا ظهر خطأ "already exists" لأي trigger أو function، الملف الآن يحذف القديمة أولاً
-- ⚠️ بعد التنفيذ، راجع الدليل: docs/MIGRATE_TO_NEW_SUPABASE_PROJECT.md

-- 💡 إذا واجهت مشاكل:
--    1. تأكد من حذف Triggers القديمة يدوياً إذا لزم
--    2. يمكنك استخدام ADD_REQUESTS_AND_OFFERS.sql لإضافة الجداول فقط
--    3. راجع logs في Supabase Dashboard لمعرفة الأخطاء الدقيقة
