-- ==========================================
-- نظام عداد المشاهدات للطلبات
-- ==========================================
-- يحسب مشاهدات جميع المستخدمين (مسجلين وزوار)

-- Step 1: إضافة حقل view_count إلى جدول requests
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Step 2: إنشاء جدول لتتبع المشاهدات (لمنع العد المتكرر من نفس الجلسة)
CREATE TABLE IF NOT EXISTS request_view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- معرف الجلسة (للزوار والمستخدمين)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL للزوار
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_hash TEXT, -- هاش للـ IP (اختياري للخصوصية)
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- منع التكرار من نفس الجلسة لنفس الطلب
  UNIQUE(request_id, session_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_request_view_logs_request ON request_view_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_view_logs_session ON request_view_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_request_view_logs_created ON request_view_logs(created_at DESC);

-- Step 3: إنشاء دالة لزيادة عداد المشاهدات (تعمل للجميع)
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
  -- الحصول على user_id إذا كان مسجل
  current_user_id := auth.uid();
  
  -- محاولة إدخال سجل جديد
  BEGIN
    INSERT INTO request_view_logs (request_id, session_id, user_id, user_agent)
    VALUES (request_id_param, session_id_param, current_user_id, user_agent_param);
    
    is_new_view := TRUE;
    
    -- زيادة العداد في جدول requests
    UPDATE requests 
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE id = request_id_param
    RETURNING view_count INTO new_view_count;
    
  EXCEPTION WHEN unique_violation THEN
    -- المشاهدة موجودة مسبقاً من نفس الجلسة
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

-- Step 4: دالة للحصول على عدد المشاهدات
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

-- Step 5: إحصائيات المشاهدات للطلب (اختياري)
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

-- Step 6: RLS Policies
ALTER TABLE request_view_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can log views via function" ON request_view_logs;
DROP POLICY IF EXISTS "Request owners can view their request view logs" ON request_view_logs;

-- السماح للجميع بإضافة مشاهدات (عبر الدالة)
CREATE POLICY "Anyone can log views via function"
ON request_view_logs FOR INSERT
WITH CHECK (TRUE);

-- السماح لصاحب الطلب بمشاهدة إحصائيات المشاهدات
CREATE POLICY "Request owners can view their request view logs"
ON request_view_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM requests r 
    WHERE r.id = request_view_logs.request_id 
    AND r.author_id = auth.uid()
  )
);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_request_views(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_request_view_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_request_view_stats(UUID) TO anon, authenticated;

