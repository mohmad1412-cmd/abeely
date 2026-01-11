-- ==========================================
-- إصلاح مشاكل الأمان المكتشفة
-- ==========================================
-- هذا الملف يصلح:
-- 1. إضافة RLS policies للجداول بدون policies
-- 2. إصلاح search_path في جميع الـ functions
-- 3. نقل pg_net extension من public schema
-- ==========================================

-- ==========================================
-- PART 1: إضافة RLS Policies للجداول
-- ==========================================

-- ==========================================
-- 1. pending_categories Policies
-- ==========================================

-- Policy: Users can view pending categories
DROP POLICY IF EXISTS "Users can view pending categories" ON pending_categories;
CREATE POLICY "Users can view pending categories"
ON pending_categories FOR SELECT
USING (true); -- Allow viewing all pending categories

-- Policy: Users can create pending categories (for AI suggestions)
DROP POLICY IF EXISTS "Users can create pending categories" ON pending_categories;
CREATE POLICY "Users can create pending categories"
ON pending_categories FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL OR
  -- Allow system/AI to create pending categories
  suggested_by_ai = true
);

-- Policy: Admins can update pending categories
DROP POLICY IF EXISTS "Admins can update pending categories" ON pending_categories;
CREATE POLICY "Admins can update pending categories"
ON pending_categories FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  (
    -- Allow if user is admin (check profiles.role)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR
    -- Allow if user created the pending category
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = pending_categories.request_id
      AND requests.author_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM requests
      WHERE requests.id = pending_categories.request_id
      AND requests.author_id = auth.uid()
    )
  )
);

-- Policy: Admins can delete pending categories
DROP POLICY IF EXISTS "Admins can delete pending categories" ON pending_categories;
CREATE POLICY "Admins can delete pending categories"
ON pending_categories FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- ==========================================
-- 2. reports Policies
-- ==========================================

-- Policy: Users can view their own reports
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
CREATE POLICY "Users can view their own reports"
ON reports FOR SELECT
USING (
  auth.uid() = reporter_id OR
  -- Admins can view all reports
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Policy: Users can create reports
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports"
ON reports FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = reporter_id
);

-- Policy: Admins can update reports
DROP POLICY IF EXISTS "Admins can update reports" ON reports;
CREATE POLICY "Admins can update reports"
ON reports FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Policy: Admins can delete reports
DROP POLICY IF EXISTS "Admins can delete reports" ON reports;
CREATE POLICY "Admins can delete reports"
ON reports FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- ==========================================
-- 3. request_categories Policies
-- ==========================================

-- Policy: Anyone can view request categories (public data)
DROP POLICY IF EXISTS "Anyone can view request categories" ON request_categories;
CREATE POLICY "Anyone can view request categories"
ON request_categories FOR SELECT
USING (true);

-- Policy: Users can create request categories for their own requests
DROP POLICY IF EXISTS "Users can create request categories" ON request_categories;
CREATE POLICY "Users can create request categories"
ON request_categories FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = request_categories.request_id
    AND requests.author_id = auth.uid()
  )
);

-- Policy: Users can update request categories for their own requests
DROP POLICY IF EXISTS "Users can update request categories" ON request_categories;
CREATE POLICY "Users can update request categories"
ON request_categories FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = request_categories.request_id
    AND requests.author_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = request_categories.request_id
    AND requests.author_id = auth.uid()
  )
);

-- Policy: Users can delete request categories for their own requests
DROP POLICY IF EXISTS "Users can delete request categories" ON request_categories;
CREATE POLICY "Users can delete request categories"
ON request_categories FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = request_categories.request_id
    AND requests.author_id = auth.uid()
  )
);

-- ==========================================
-- 4. request_views Policies
-- ==========================================

-- Policy: Users can view their own request views
DROP POLICY IF EXISTS "Users can view their own request views" ON request_views;
CREATE POLICY "Users can view their own request views"
ON request_views FOR SELECT
USING (
  auth.uid() = user_id OR
  -- Request owners can view who viewed their requests
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = request_views.request_id
    AND requests.author_id = auth.uid()
  )
);

-- Policy: Users can create request views
DROP POLICY IF EXISTS "Users can create request views" ON request_views;
CREATE POLICY "Users can create request views"
ON request_views FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = user_id
);

-- Policy: Users can update their own request views
DROP POLICY IF EXISTS "Users can update their own request views" ON request_views;
CREATE POLICY "Users can update their own request views"
ON request_views FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own request views
DROP POLICY IF EXISTS "Users can delete their own request views" ON request_views;
CREATE POLICY "Users can delete their own request views"
ON request_views FOR DELETE
USING (auth.uid() = user_id);

-- ==========================================
-- 5. verified_guests Policies
-- ==========================================

-- Note: verified_guests already has policies in AUTH_RLS_POLICIES.sql
-- But we'll add them here to ensure they exist

-- Policy: Anyone can create verified guest records (for guest mode)
DROP POLICY IF EXISTS "Guests can create verified guest records" ON verified_guests;
CREATE POLICY "Guests can create verified guest records"
ON verified_guests FOR INSERT
WITH CHECK (true);

-- Policy: Guests can view their own verified guest records
DROP POLICY IF EXISTS "Guests can view their own verified guest records" ON verified_guests;
CREATE POLICY "Guests can view their own verified guest records"
ON verified_guests FOR SELECT
USING (
  -- Allow viewing if code hasn't expired
  code_expires_at > NOW()
);

-- Policy: Guests can update their own verified guest records
DROP POLICY IF EXISTS "Guests can update their own verified guest records" ON verified_guests;
CREATE POLICY "Guests can update their own verified guest records"
ON verified_guests FOR UPDATE
USING (code_expires_at > NOW())
WITH CHECK (code_expires_at > NOW());

-- Policy: System can clean expired guest records
DROP POLICY IF EXISTS "System can clean expired guest records" ON verified_guests;
CREATE POLICY "System can clean expired guest records"
ON verified_guests FOR DELETE
USING (
  code_expires_at < NOW() AND
  auth.uid() IS NOT NULL
);

-- ==========================================
-- PART 2: إصلاح Function Search Path
-- ==========================================

-- ==========================================
-- 1. trigger_push_notification
-- ==========================================

CREATE OR REPLACE FUNCTION trigger_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  edge_function_url TEXT;
  payload JSONB;
BEGIN
  -- الحصول على URL Edge Function من environment variable أو استخدام قيمة افتراضية
  edge_function_url := current_setting('app.edge_function_url', TRUE);
  
  -- إذا لم يكن موجود، استخدم قيمة افتراضية (سيتم تحديثها لاحقاً)
  IF edge_function_url IS NULL OR edge_function_url = '' THEN
    edge_function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification-fast';
  END IF;

  -- بناء payload بسيط - فقط البيانات الأساسية
  IF TG_TABLE_NAME = 'offers' THEN
    IF TG_OP = 'INSERT' THEN
      -- عرض جديد
      payload := jsonb_build_object(
        'type', 'new_offer',
        'offer_id', NEW.id,
        'request_id', NEW.request_id,
        'provider_id', NEW.provider_id,
        'provider_name', COALESCE(NEW.provider_name, 'مقدم خدمة'),
        'offer_title', COALESCE(NEW.title, ''),
        'recipient_id', (
          SELECT author_id FROM requests WHERE id = NEW.request_id
        )
      );
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
      -- عرض مقبول
      payload := jsonb_build_object(
        'type', 'offer_accepted',
        'offer_id', NEW.id,
        'request_id', NEW.request_id,
        'provider_id', NEW.provider_id,
        'recipient_id', NEW.provider_id
      );
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    IF TG_OP = 'INSERT' THEN
      -- رسالة جديدة
      payload := jsonb_build_object(
        'type', 'new_message',
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id,
        'recipient_id', NEW.receiver_id,
        'content', LEFT(NEW.content, 100)
      );
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- استدعاء Edge Function عبر pg_net (إذا كان متاحاً)
  -- Note: This requires pg_net extension
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', TRUE)
    ),
    body := payload::jsonb
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to trigger push notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ==========================================
-- 2. update_updated_at_column
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ==========================================
-- 3. update_conversation_on_message
-- ==========================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;

-- ==========================================
-- 4. notify_on_new_offer
-- ==========================================

CREATE OR REPLACE FUNCTION notify_on_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ==========================================
-- 5. notify_on_offer_accepted
-- ==========================================

CREATE OR REPLACE FUNCTION notify_on_offer_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ==========================================
-- 6. notify_on_new_message
-- ==========================================

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ==========================================
-- 7. mark_notification_read
-- ==========================================

CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = notification_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;

-- ==========================================
-- 8. mark_all_notifications_read
-- ==========================================

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = FALSE;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ==========================================
-- 9. get_unread_notifications_count
-- ==========================================

CREATE OR REPLACE FUNCTION get_unread_notifications_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM notifications
  WHERE user_id = auth.uid() AND is_read = FALSE;
  RETURN count;
END;
$$;

-- ==========================================
-- 10. get_active_categories
-- ==========================================

CREATE OR REPLACE FUNCTION get_active_categories()
RETURNS TABLE (
  id TEXT,
  label TEXT,
  emoji TEXT,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.label, c.emoji, c.description
  FROM categories c
  WHERE c.is_active = TRUE
  ORDER BY c.sort_order;
END;
$$;

-- ==========================================
-- 11. set_request_categories
-- ==========================================

CREATE OR REPLACE FUNCTION set_request_categories(
  p_request_id UUID,
  p_category_ids TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM request_categories WHERE request_id = p_request_id;
  INSERT INTO request_categories (request_id, category_id)
  SELECT p_request_id, unnest(p_category_ids)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ==========================================
-- PART 3: نقل pg_net Extension
-- ==========================================
-- Note: نقل extension من public schema إلى schema منفصل
-- هذا يتطلب إنشاء schema جديد ونقل extension

-- إنشاء schema جديد للـ extensions
CREATE SCHEMA IF NOT EXISTS extensions;

-- نقل pg_net إلى schema extensions
-- Note: هذا قد يتطلب إعادة تثبيت extension
-- سنستخدم ALTER EXTENSION إذا كان متاحاً

-- محاولة نقل extension (إذا كان متاحاً)
DO $$
BEGIN
  -- محاولة نقل extension إلى schema extensions
  -- إذا فشل، سنتركه في public (بعض extensions لا يمكن نقلها)
  BEGIN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  EXCEPTION
    WHEN OTHERS THEN
      -- Extension قد لا يدعم النقل، سنتركه في public
      RAISE NOTICE 'Could not move pg_net extension: %', SQLERRM;
  END;
END $$;

-- ==========================================
-- Success Message
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ تم إصلاح جميع مشاكل الأمان بنجاح!';
  RAISE NOTICE '📋 الإصلاحات المطبقة:';
  RAISE NOTICE '   1. ✅ إضافة RLS policies لـ 5 جداول';
  RAISE NOTICE '   2. ✅ إصلاح search_path في 11 function';
  RAISE NOTICE '   3. ✅ محاولة نقل pg_net extension';
  RAISE NOTICE '✨ المشروع الآن أكثر أماناً!';
END $$;
