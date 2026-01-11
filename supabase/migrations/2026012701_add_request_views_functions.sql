-- ==========================================
-- Add missing request views functions
-- ==========================================
-- This migration adds the three missing RPC functions:
-- 1. mark_request_viewed
-- 2. mark_request_read
-- 3. increment_request_views
--
-- These functions are called from requestViewsService.ts but were missing from the database

-- ==========================================
-- Step 1: Ensure request_views table exists
-- ==========================================
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_request_views_user ON request_views(user_id);
CREATE INDEX IF NOT EXISTS idx_request_views_request ON request_views(request_id);
CREATE INDEX IF NOT EXISTS idx_request_views_unread ON request_views(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_request_views_created ON request_views(created_at DESC);

-- ==========================================
-- Step 2: Ensure request_view_logs table exists
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
  UNIQUE(request_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_request_view_logs_request ON request_view_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_view_logs_session ON request_view_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_request_view_logs_created ON request_view_logs(created_at DESC);

-- ==========================================
-- Step 3: Ensure requests table has view_count column
-- ==========================================
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- ==========================================
-- Step 4: Create mark_request_viewed function
-- ==========================================
CREATE OR REPLACE FUNCTION mark_request_viewed(request_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO request_views (user_id, request_id, viewed_at, is_read, read_at)
  VALUES (current_user_id, request_id_param, NOW(), TRUE, NOW())
  ON CONFLICT (user_id, request_id)
  DO UPDATE SET
    viewed_at = NOW(),
    is_read = TRUE,
    read_at = NOW(),
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- ==========================================
-- Step 5: Create mark_request_read function
-- ==========================================
CREATE OR REPLACE FUNCTION mark_request_read(request_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ==========================================
-- Step 6: Create increment_request_views function
-- ==========================================
CREATE OR REPLACE FUNCTION increment_request_views(
  request_id_param UUID,
  session_id_param TEXT,
  user_agent_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  new_view_count INTEGER;
  is_new_view BOOLEAN := FALSE;
BEGIN
  -- Get user_id if authenticated
  current_user_id := auth.uid();
  
  -- Try to insert a new log entry
  BEGIN
    INSERT INTO request_view_logs (request_id, session_id, user_id, user_agent)
    VALUES (request_id_param, session_id_param, current_user_id, user_agent_param);
    
    is_new_view := TRUE;
    
    -- Increment the counter in requests table
    UPDATE requests 
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = request_id_param
    RETURNING view_count INTO new_view_count;
    
  EXCEPTION WHEN unique_violation THEN
    -- View already exists from this session
    is_new_view := FALSE;
    SELECT view_count INTO new_view_count FROM requests WHERE id = request_id_param;
  END;
  
  RETURN json_build_object(
    'success', TRUE,
    'is_new_view', is_new_view,
    'view_count', COALESCE(new_view_count, 0)
  );
END;
$$;

-- ==========================================
-- Step 7: Create get_unread_interests_count function
-- ==========================================
-- هذه الدالة تحسب عدد الطلبات الجديدة في "في اهتماماتي"
-- تعتبر الطلب "جديد" فقط إذا لم يظهر في قائمة "في اهتماماتي" بعد
-- (أي لا يوجد له سجل في request_views على الإطلاق)
-- لا تربط بالفتح (opening) ولا بالقراءة (reading) - فقط الظهور في القائمة
CREATE OR REPLACE FUNCTION get_unread_interests_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    AND r.author_id != current_user_id
    -- حساب الطلبات غير المقروءة (لم يتم عرضها أو لم يتم عرضها بشكل كامل)
    -- Badge count يقل عندما يرى المستخدم الكارت (50%+ visible) عن طريق is_read = true
    -- عندما يرى المستخدم الكارت على الشاشة، يتم وضع is_read = true فوراً لإخفاء الـ badge
    AND (rv.id IS NULL OR rv.is_read = FALSE)
    -- استبعاد الطلبات التي لديها عروض نشطة من المستخدم (تطابق منطق Marketplace.tsx)
    -- نستبعد العروض الملغاة (cancelled) والمكتملة (completed) والمرفوضة (rejected)
    -- أي نستبعد فقط: pending, accepted, negotiating
    AND NOT EXISTS (
      SELECT 1 FROM offers o
      WHERE o.request_id = r.id
        AND o.provider_id = current_user_id
        AND o.status NOT IN ('cancelled', 'completed', 'rejected')
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
$$;

-- ==========================================
-- Step 8: Create get_request_view_count function
-- ==========================================
CREATE OR REPLACE FUNCTION get_request_view_count(request_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT view_count INTO count_result FROM requests WHERE id = request_id_param;
  RETURN COALESCE(count_result, 0);
END;
$$;

-- ==========================================
-- Step 9: Create get_request_view_stats function
-- ==========================================
CREATE OR REPLACE FUNCTION get_request_view_stats(request_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_views INTEGER;
  unique_users INTEGER;
  unique_guests INTEGER;
  last_24h INTEGER;
  last_7d INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE user_id IS NULL),
    COUNT(*) FILTER (WHERE viewed_at > NOW() - INTERVAL '24 hours'),
    COUNT(*) FILTER (WHERE viewed_at > NOW() - INTERVAL '7 days')
  INTO total_views, unique_users, unique_guests, last_24h, last_7d
  FROM request_view_logs
  WHERE request_id = request_id_param;
  
  RETURN json_build_object(
    'total_views', COALESCE(total_views, 0),
    'unique_registered_users', COALESCE(unique_users, 0),
    'guest_views', COALESCE(unique_guests, 0),
    'views_last_24h', COALESCE(last_24h, 0),
    'views_last_7d', COALESCE(last_7d, 0)
  );
END;
$$;

-- ==========================================
-- Step 10: Grant execute permissions
-- ==========================================
GRANT EXECUTE ON FUNCTION mark_request_viewed(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_request_read(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_request_views(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_unread_interests_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_request_view_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_request_view_stats(UUID) TO anon, authenticated;

-- ==========================================
-- Step 11: Enable RLS on tables
-- ==========================================
ALTER TABLE request_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_view_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Step 12: Create RLS policies for request_views
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own request views" ON request_views;
DROP POLICY IF EXISTS "Users can create their own request views" ON request_views;
DROP POLICY IF EXISTS "Users can update their own request views" ON request_views;

CREATE POLICY "Users can view their own request views"
ON request_views FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own request views"
ON request_views FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own request views"
ON request_views FOR UPDATE
USING (auth.uid() = user_id);

-- ==========================================
-- Step 13: Create RLS policies for request_view_logs
-- ==========================================
DROP POLICY IF EXISTS "Anyone can log views via function" ON request_view_logs;
DROP POLICY IF EXISTS "Function can log views" ON request_view_logs;
DROP POLICY IF EXISTS "Request owners can view their request view logs" ON request_view_logs;

-- Allow function to log views (SECURITY DEFINER functions bypass RLS, but we need policy for direct inserts)
CREATE POLICY "Function can log views"
ON request_view_logs FOR INSERT
WITH CHECK (TRUE);

-- Allow request owners to view their request view logs
CREATE POLICY "Request owners can view their request view logs"
ON request_view_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_view_logs.request_id 
    AND r.author_id = auth.uid()
  )
);
