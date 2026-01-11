-- ==========================================
-- إضافة جداول requests و offers للمشروع الجديد
-- ==========================================
-- استخدم هذا الملف إذا كنت تريد إضافة الجداول فقط (بدون باقي الجداول)
-- ==========================================

-- ==========================================
-- جدول requests (الطلبات)
-- ==========================================

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

-- Indexes لجدول requests
CREATE INDEX IF NOT EXISTS idx_requests_author ON requests(author_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_is_public ON requests(is_public);
CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_location_city ON requests(location_city) WHERE location_city IS NOT NULL;

-- ==========================================
-- جدول offers (العروض)
-- ==========================================

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

-- Indexes لجدول offers
CREATE INDEX IF NOT EXISTS idx_offers_request ON offers(request_id);
CREATE INDEX IF NOT EXISTS idx_offers_provider ON offers(provider_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created ON offers(created_at DESC);

-- ==========================================
-- تفعيل RLS
-- ==========================================

ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- RLS Policies الأساسية
-- ==========================================

-- Requests: أي شخص يمكنه قراءة الطلبات العامة
DROP POLICY IF EXISTS "Public requests are viewable by everyone" ON requests;
CREATE POLICY "Public requests are viewable by everyone"
ON requests FOR SELECT
USING (is_public = TRUE OR author_id = auth.uid());

-- Requests: المستخدمون يمكنهم رؤية طلباتهم الخاصة
DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
CREATE POLICY "Users can view their own requests"
ON requests FOR SELECT
USING (author_id = auth.uid());

-- Requests: المستخدمون يمكنهم إنشاء طلبات جديدة
DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
CREATE POLICY "Users can insert their own requests"
ON requests FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Requests: المستخدمون يمكنهم تحديث طلباتهم
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
CREATE POLICY "Users can update their own requests"
ON requests FOR UPDATE
USING (auth.uid() = author_id);

-- Offers: أي شخص يمكنه قراءة العروض للطلبات العامة
DROP POLICY IF EXISTS "Anyone can view offers for public requests" ON offers;
CREATE POLICY "Anyone can view offers for public requests"
ON offers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM requests 
    WHERE requests.id = offers.request_id 
    AND (requests.is_public = TRUE OR requests.author_id = auth.uid())
  )
);

-- Offers: مقدم العرض يمكنه رؤية عروضه
DROP POLICY IF EXISTS "Providers can view their own offers" ON offers;
CREATE POLICY "Providers can view their own offers"
ON offers FOR SELECT
USING (provider_id = auth.uid());

-- Offers: المستخدمون يمكنهم إنشاء عروض
DROP POLICY IF EXISTS "Users can create offers" ON offers;
CREATE POLICY "Users can create offers"
ON offers FOR INSERT
WITH CHECK (auth.uid() = provider_id);

-- Offers: مقدم العرض يمكنه تحديث عرضه
DROP POLICY IF EXISTS "Providers can update their own offers" ON offers;
CREATE POLICY "Providers can update their own offers"
ON offers FOR UPDATE
USING (provider_id = auth.uid());

-- Offers: صاحب الطلب يمكنه تحديث حالة العروض (لقبول/رفض)
DROP POLICY IF EXISTS "Request owners can update offer status" ON offers;
CREATE POLICY "Request owners can update offer status"
ON offers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM requests 
    WHERE requests.id = offers.request_id 
    AND requests.author_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM requests 
    WHERE requests.id = offers.request_id 
    AND requests.author_id = auth.uid()
  )
);

-- ==========================================
-- ملاحظات:
-- ==========================================
-- ✅ تم إنشاء الجداول مع جميع الأعمدة من الـ schema القديم
-- ✅ تم إضافة Indexes للأداء
-- ✅ تم تفعيل RLS وإضافة Policies الأساسية
-- ⚠️ يمكنك إضافة Constraints إضافية حسب احتياجك (مثل CHECK على status)

-- ==========================================
-- ⚠️ مهم: تحديث Environment Variables بعد النقل
-- ==========================================
-- بعد إنشاء المشروع الجديد، احرص على تحديث هذه المتغيرات:
--
-- 1. Frontend (.env أو .env.local):
--    VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT_ID.supabase.co
--    VITE_SUPABASE_ANON_KEY=your_new_anon_key_here
--
-- 2. Edge Functions Secrets (في Supabase Dashboard):
--    SUPABASE_URL=https://YOUR_NEW_PROJECT_ID.supabase.co
--    SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here
--
-- 3. Database Connection (إذا كنت تستخدم psql أو أدوات أخرى):
--    SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_NEW_PROJECT_ID.supabase.co:5432/postgres
--
-- 🔍 أين تجد هذه القيم؟
--    Dashboard → Settings → API:
--      - Project URL → VITE_SUPABASE_URL / SUPABASE_URL
--      - anon public key → VITE_SUPABASE_ANON_KEY
--      - service_role key → SUPABASE_SERVICE_ROLE_KEY
--
--    Dashboard → Settings → Database:
--      - Connection string → SUPABASE_DB_URL
--
-- ==========================================
