-- ==========================================
-- إعداد التصنيفات والإشعارات الفعلية
-- ==========================================
-- هذا الملف يُنشئ:
-- 1. جدول التصنيفات (categories)
-- 2. جدول الربط بين الطلبات والتصنيفات (request_categories)
-- 3. Triggers للإشعارات التلقائية
-- ==========================================

-- ==========================================
-- الجزء 1: إنشاء جدول التصنيفات
-- ==========================================

-- إنشاء جدول التصنيفات
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

-- إنشاء Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

-- ==========================================
-- الجزء 2: جدول الربط بين الطلبات والتصنيفات
-- ==========================================

-- إنشاء جدول الربط (Many-to-Many)
CREATE TABLE IF NOT EXISTS request_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, category_id)
);

-- Indexes للأداء
CREATE INDEX IF NOT EXISTS idx_request_categories_request ON request_categories(request_id);
CREATE INDEX IF NOT EXISTS idx_request_categories_category ON request_categories(category_id);

-- ==========================================
-- الجزء 3: تحديث نوع الإشعار ليشمل 'interest'
-- ==========================================

-- تحديث القيد على عمود type في notifications
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('offer', 'message', 'status', 'system', 'review', 'request', 'interest'));

-- ==========================================
-- الجزء 4: RLS Policies للتصنيفات
-- ==========================================

-- تفعيل RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_categories ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة التصنيفات
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (is_active = TRUE);

-- السماح للمستخدمين المسجلين فقط بإضافة تصنيفات للطلبات
DROP POLICY IF EXISTS "Authenticated users can manage request categories" ON request_categories;
CREATE POLICY "Authenticated users can manage request categories" ON request_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM requests 
      WHERE id = request_categories.request_id 
      AND author_id = auth.uid()
    )
  );

-- السماح للجميع بقراءة تصنيفات الطلبات
DROP POLICY IF EXISTS "Anyone can view request categories" ON request_categories;
CREATE POLICY "Anyone can view request categories" ON request_categories
  FOR SELECT USING (TRUE);

-- ==========================================
-- الجزء 5: Functions المساعدة
-- ==========================================

-- Function لجلب التصنيفات النشطة
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

-- Function لربط تصنيفات بطلب
CREATE OR REPLACE FUNCTION set_request_categories(
  p_request_id UUID,
  p_category_ids TEXT[]
)
RETURNS VOID AS $$
BEGIN
  -- حذف التصنيفات القديمة
  DELETE FROM request_categories WHERE request_id = p_request_id;
  
  -- إضافة التصنيفات الجديدة
  INSERT INTO request_categories (request_id, category_id)
  SELECT p_request_id, unnest(p_category_ids)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function لجلب تصنيفات طلب معين
CREATE OR REPLACE FUNCTION get_request_categories(p_request_id UUID)
RETURNS TABLE (
  id TEXT,
  label TEXT,
  emoji TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.label, c.emoji
  FROM request_categories rc
  JOIN categories c ON c.id = rc.category_id
  WHERE rc.request_id = p_request_id
  ORDER BY c.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- الجزء 6: Triggers للإشعارات
-- ==========================================

-- حذف الـ triggers القديمة
DROP TRIGGER IF EXISTS trigger_notify_on_new_offer ON offers;
DROP TRIGGER IF EXISTS trigger_notify_on_offer_accepted ON offers;
DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages;
DROP TRIGGER IF EXISTS trigger_notify_on_new_interest_request ON requests;

-- حذف الـ functions القديمة
DROP FUNCTION IF EXISTS notify_on_new_offer() CASCADE;
DROP FUNCTION IF EXISTS notify_on_offer_accepted() CASCADE;
DROP FUNCTION IF EXISTS notify_on_new_message() CASCADE;
DROP FUNCTION IF EXISTS notify_on_new_interest_request() CASCADE;

-- ==========================================
-- Function: إشعار عند عرض جديد
-- ==========================================
CREATE OR REPLACE FUNCTION notify_on_new_offer()
RETURNS TRIGGER AS $$
DECLARE
  v_request_owner_id UUID;
  v_request_title TEXT;
  v_offer_provider_name TEXT;
BEGIN
  -- جلب بيانات الطلب
  SELECT r.author_id, r.title
  INTO v_request_owner_id, v_request_title
  FROM requests r
  WHERE r.id = NEW.request_id;
  
  -- جلب اسم مقدم العرض
  v_offer_provider_name := COALESCE(NEW.provider_name, 'مزود خدمة');
  
  -- إنشاء إشعار لصاحب الطلب
  IF v_request_owner_id IS NOT NULL AND v_request_owner_id != NEW.provider_id THEN
    INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id, related_offer_id)
    VALUES (
      v_request_owner_id,
      'offer',
      'عرض جديد على طلبك 🎯',
      'استلمت عرض من ' || v_offer_provider_name || ' على طلبك: ' || COALESCE(v_request_title, 'طلب'),
      '/request/' || NEW.request_id,
      NEW.request_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Function: إشعار عند قبول عرض
-- ==========================================
CREATE OR REPLACE FUNCTION notify_on_offer_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_request_title TEXT;
  v_request_owner_name TEXT;
BEGIN
  -- فقط عند تغيير الحالة إلى 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- جلب عنوان الطلب واسم صاحبه
    SELECT r.title, COALESCE(p.display_name, 'صاحب الطلب')
    INTO v_request_title, v_request_owner_name
    FROM requests r
    LEFT JOIN profiles p ON p.id = r.author_id
    WHERE r.id = NEW.request_id;
    
    -- إنشاء إشعار لمقدم العرض
    IF NEW.provider_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id, related_offer_id)
      VALUES (
        NEW.provider_id,
        'status',
        'تم قبول عرضك! 🎉',
        'تهانينا! قبل ' || v_request_owner_name || ' عرضك على طلب: ' || COALESCE(v_request_title, 'طلب'),
        '/request/' || NEW.request_id,
        NEW.request_id,
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Function: إشعار عند رسالة جديدة
-- ==========================================
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation conversations%ROWTYPE;
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_request_title TEXT;
  v_message_preview TEXT;
BEGIN
  IF NEW.conversation_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- جلب بيانات المحادثة
  SELECT * INTO v_conversation
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  IF v_conversation.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- تحديد المستلم
  IF v_conversation.participant1_id = NEW.sender_id THEN
    v_recipient_id := v_conversation.participant2_id;
  ELSE
    v_recipient_id := v_conversation.participant1_id;
  END IF;
  
  -- جلب اسم المرسل
  SELECT COALESCE(display_name, 'مستخدم')
  INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- جلب عنوان الطلب إن وجد
  IF v_conversation.request_id IS NOT NULL THEN
    SELECT title INTO v_request_title
    FROM requests
    WHERE id = v_conversation.request_id;
  END IF;
  
  -- إنشاء معاينة الرسالة
  v_message_preview := LEFT(NEW.content, 50);
  IF LENGTH(NEW.content) > 50 THEN
    v_message_preview := v_message_preview || '...';
  END IF;
  
  -- إنشاء إشعار للمستلم
  IF v_recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link_to, related_message_id, related_request_id, related_offer_id)
    VALUES (
      v_recipient_id,
      'message',
      'رسالة جديدة من ' || v_sender_name || ' 💬',
      CASE 
        WHEN v_request_title IS NOT NULL THEN
          '"' || v_message_preview || '" (بخصوص: ' || v_request_title || ')'
        ELSE
          '"' || v_message_preview || '"'
      END,
      '/messages/' || NEW.conversation_id,
      NEW.id,
      v_conversation.request_id,
      v_conversation.offer_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Function: إشعار عند طلب جديد يطابق الاهتمامات
-- ==========================================
CREATE OR REPLACE FUNCTION notify_on_new_interest_request()
RETURNS TRIGGER AS $$
DECLARE
  v_request_title TEXT;
  v_request_author_name TEXT;
  v_request_city TEXT;
  v_request_categories TEXT[];
  v_matching_user RECORD;
BEGIN
  -- فقط للطلبات النشطة والعامة
  IF NEW.status != 'active' OR NEW.is_public != TRUE THEN
    RETURN NEW;
  END IF;

  -- جلب بيانات الطلب
  v_request_title := NEW.title;
  v_request_city := COALESCE(NEW.location_city, NEW.location);
  
  SELECT COALESCE(p.display_name, 'مستخدم')
  INTO v_request_author_name
  FROM profiles p
  WHERE p.id = NEW.author_id;
  
  -- جلب تصنيفات الطلب (من العمود categories مباشرة)
  v_request_categories := NEW.categories;
  
  -- البحث عن المستخدمين المهتمين
  FOR v_matching_user IN
    SELECT 
      p.id AS user_id,
      p.display_name,
      p.interested_categories,
      p.interested_cities
    FROM profiles p
    WHERE p.notify_on_interest = TRUE
      AND p.id != NEW.author_id  -- استثناء صاحب الطلب
      AND (
        -- مطابقة التصنيفات
        (
          p.interested_categories IS NOT NULL 
          AND array_length(p.interested_categories, 1) > 0
          AND v_request_categories IS NOT NULL
          AND array_length(v_request_categories, 1) > 0
          AND p.interested_categories && v_request_categories
        )
        OR
        -- مطابقة المدن
        (
          p.interested_cities IS NOT NULL 
          AND array_length(p.interested_cities, 1) > 0
          AND v_request_city IS NOT NULL
          AND (
            v_request_city = ANY(p.interested_cities)
            OR EXISTS (
              SELECT 1 FROM unnest(p.interested_cities) AS city
              WHERE v_request_city ILIKE '%' || city || '%'
                 OR city ILIKE '%' || v_request_city || '%'
            )
          )
        )
      )
  LOOP
    -- إنشاء إشعار للمستخدم المطابق
    INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id)
    VALUES (
      v_matching_user.user_id,
      'interest',
      'طلب جديد يطابق اهتماماتك 🎯',
      'طلب جديد: "' || COALESCE(v_request_title, 'طلب') || '" من ' || v_request_author_name || 
      CASE WHEN v_request_city IS NOT NULL THEN ' في ' || v_request_city ELSE '' END,
      '/request/' || NEW.id,
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- إنشاء الـ Triggers
-- ==========================================

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

CREATE TRIGGER trigger_notify_on_new_interest_request
AFTER INSERT ON requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_interest_request();

-- ==========================================
-- تفعيل Realtime للجداول
-- ==========================================

-- تفعيل Realtime للإشعارات
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- ==========================================
-- اختبار التصنيفات
-- ==========================================

-- للتحقق من إضافة التصنيفات بنجاح:
-- SELECT * FROM categories ORDER BY sort_order;

-- للتحقق من عمل الـ function:
-- SELECT * FROM get_active_categories();




























