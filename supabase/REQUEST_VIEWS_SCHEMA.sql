-- ==========================================
-- نظام تتبع قراءة الطلبات (Request Views)
-- ==========================================
-- يتتبع إذا شاهد المستخدم طلباً وقرأه

-- Drop existing objects (only if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'request_views') THEN
    DROP TRIGGER IF EXISTS trigger_update_request_view ON request_views CASCADE;
    DROP POLICY IF EXISTS "Users can view their own request views" ON request_views;
    DROP POLICY IF EXISTS "Users can create their own request views" ON request_views;
    DROP POLICY IF EXISTS "Users can update their own request views" ON request_views;
  END IF;
END $$;

DROP FUNCTION IF EXISTS mark_request_viewed(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_request_read(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_unread_interests_count() CASCADE;

DROP TABLE IF EXISTS request_views CASCADE;

-- Create request_views table
CREATE TABLE request_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one view record per user per request
  UNIQUE(user_id, request_id)
);

-- Create indexes
CREATE INDEX idx_request_views_user ON request_views(user_id);
CREATE INDEX idx_request_views_request ON request_views(request_id);
CREATE INDEX idx_request_views_unread ON request_views(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_request_views_created ON request_views(created_at DESC);

-- Functions
CREATE OR REPLACE FUNCTION mark_request_viewed(request_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Insert or update view record
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

  -- Update view record to mark as read
  UPDATE request_views
  SET 
    is_read = TRUE,
    read_at = NOW(),
    updated_at = NOW()
  WHERE user_id = current_user_id
    AND request_id = request_id_param;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO request_views (user_id, request_id, viewed_at, is_read, read_at)
    VALUES (current_user_id, request_id_param, NOW(), TRUE, NOW());
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get count of unread requests in user's interests
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

  -- Get user preferences
  SELECT 
    COALESCE(interested_categories, ARRAY[]::TEXT[]),
    COALESCE(interested_cities, ARRAY[]::TEXT[])
  INTO user_categories, user_cities
  FROM profiles
  WHERE id = current_user_id;

  -- If no interests, return 0
  IF (user_categories IS NULL OR array_length(user_categories, 1) IS NULL) 
     AND (user_cities IS NULL OR array_length(user_cities, 1) IS NULL) THEN
    RETURN 0;
  END IF;

  -- Count unread requests matching interests
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
      -- Match categories
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
      -- Match cities
      (user_cities IS NULL OR array_length(user_cities, 1) IS NULL OR
       EXISTS (
         SELECT 1 FROM unnest(user_cities) AS city
         WHERE r.location ILIKE '%' || city || '%' OR r.location_city ILIKE '%' || city || '%'
       ))
    );

  RETURN COALESCE(count_result, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE request_views ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own request views"
ON request_views FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own request views"
ON request_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own request views"
ON request_views FOR UPDATE
USING (auth.uid() = user_id);

