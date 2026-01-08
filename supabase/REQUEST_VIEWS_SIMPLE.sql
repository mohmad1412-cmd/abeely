-- ==========================================
-- نظام تتبع قراءة الطلبات (Request Views) - نسخة مبسطة
-- ==========================================
-- شغّل هذا الملف بالكامل من البداية

-- Step 1: إنشاء الجدول أولاً
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

-- Step 2: إنشاء Indexes
CREATE INDEX IF NOT EXISTS idx_request_views_user ON request_views(user_id);
CREATE INDEX IF NOT EXISTS idx_request_views_request ON request_views(request_id);
CREATE INDEX IF NOT EXISTS idx_request_views_unread ON request_views(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_request_views_created ON request_views(created_at DESC);

-- Step 3: حذف Functions القديمة (إن وجدت)
DROP FUNCTION IF EXISTS mark_request_viewed(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_request_read(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_unread_interests_count() CASCADE;

-- Step 4: إنشاء Functions
CREATE OR REPLACE FUNCTION mark_request_viewed(request_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO request_views (user_id, request_id, viewed_at)
  VALUES (current_user_id, request_id_param, NOW())
  ON CONFLICT (user_id, request_id)
  DO UPDATE SET
    viewed_at = NOW(),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_request_read(request_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE request_views
  SET 
    is_read = TRUE,
    read_at = NOW(),
    updated_at = NOW()
  WHERE user_id = current_user_id
    AND request_id = request_id_param;

  IF NOT FOUND THEN
    INSERT INTO request_views (user_id, request_id, viewed_at, is_read, read_at)
    VALUES (current_user_id, request_id_param, NOW(), TRUE, NOW());
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_unread_interests_count()
RETURNS INTEGER AS $$
DECLARE
  current_user_id UUID;
  count_result INTEGER;
  user_categories TEXT[];
  user_cities TEXT[];
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT 
    COALESCE(interested_categories, ARRAY[]::TEXT[]),
    COALESCE(interested_cities, ARRAY[]::TEXT[])
  INTO user_categories, user_cities
  FROM profiles
  WHERE id = current_user_id;

  IF (user_categories IS NULL OR array_length(user_categories, 1) IS NULL) 
     AND (user_cities IS NULL OR array_length(user_cities, 1) IS NULL) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(DISTINCT r.id) INTO count_result
  FROM requests r
  LEFT JOIN request_views rv ON rv.request_id = r.id AND rv.user_id = current_user_id
  WHERE r.is_public = TRUE
    AND r.status = 'active'
    AND r.author_id != current_user_id  -- استبعاد طلبات المستخدم نفسه
    AND (rv.id IS NULL OR rv.is_read = FALSE)
    AND NOT EXISTS (
      -- استبعاد الطلبات التي قدم عليها المستخدم عروض نشطة (غير مرفوضة)
      SELECT 1 FROM offers o
      WHERE o.request_id = r.id
        AND o.provider_id = current_user_id
        AND o.status != 'rejected'
    )
    AND (
      (user_categories IS NULL OR array_length(user_categories, 1) IS NULL OR
       EXISTS (
         SELECT 1 FROM request_categories rc
         JOIN categories c ON c.id = rc.category_id
         WHERE rc.request_id = r.id
           AND EXISTS (
             SELECT 1 FROM unnest(user_categories) AS cat
             WHERE c.label ILIKE '%' || cat || '%' OR cat ILIKE '%' || c.label || '%'
           )
       ))
      OR
      (user_cities IS NULL OR array_length(user_cities, 1) IS NULL OR
       EXISTS (
         SELECT 1 FROM unnest(user_cities) AS city
         WHERE r.location ILIKE '%' || city || '%' OR r.location_city ILIKE '%' || city || '%'
       ))
    );

  RETURN COALESCE(count_result, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: تفعيل RLS
ALTER TABLE request_views ENABLE ROW LEVEL SECURITY;

-- Step 6: حذف Policies القديمة (إن وجدت)
DROP POLICY IF EXISTS "Users can view their own request views" ON request_views;
DROP POLICY IF EXISTS "Users can create their own request views" ON request_views;
DROP POLICY IF EXISTS "Users can update their own request views" ON request_views;

-- Step 7: إنشاء Policies
CREATE POLICY "Users can view their own request views"
ON request_views FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own request views"
ON request_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own request views"
ON request_views FOR UPDATE
USING (auth.uid() = user_id);

