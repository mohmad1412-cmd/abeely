-- ==========================================
-- إصلاح تحذيرات الأمان: Function Search Path Mutable
-- ==========================================
-- هذا الملف يضيف SET search_path لكل function تستخدم SECURITY DEFINER
-- شغّله في Supabase SQL Editor

-- ==========================================
-- Request Views Functions
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

  INSERT INTO request_views (user_id, request_id, viewed_at)
  VALUES (current_user_id, request_id_param, NOW())
  ON CONFLICT (user_id, request_id)
  DO UPDATE SET
    viewed_at = NOW(),
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

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
    AND (rv.id IS NULL OR rv.is_read = FALSE)
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
-- Notifications Functions
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
-- User Preferences Functions
-- ==========================================

CREATE OR REPLACE FUNCTION update_user_preferences(
  p_user_id UUID,
  p_categories TEXT[] DEFAULT NULL,
  p_cities TEXT[] DEFAULT NULL,
  p_radar_words TEXT[] DEFAULT NULL,
  p_notify_on_interest BOOLEAN DEFAULT NULL,
  p_role_mode TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  UPDATE public.profiles
  SET 
    interested_categories = COALESCE(p_categories, interested_categories),
    interested_cities = COALESCE(p_cities, interested_cities),
    radar_words = COALESCE(p_radar_words, radar_words),
    notify_on_interest = COALESCE(p_notify_on_interest, notify_on_interest),
    role_mode = COALESCE(p_role_mode, role_mode),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING jsonb_build_object(
    'interested_categories', interested_categories,
    'interested_cities', interested_cities,
    'radar_words', radar_words,
    'notify_on_interest', notify_on_interest,
    'role_mode', role_mode
  ) INTO result;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_preferences(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'interested_categories', COALESCE(interested_categories, '{}'),
    'interested_cities', COALESCE(interested_cities, '{}'),
    'radar_words', COALESCE(radar_words, '{}'),
    'notify_on_interest', COALESCE(notify_on_interest, true),
    'role_mode', COALESCE(role_mode, 'requester')
  )
  INTO result
  FROM public.profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

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
-- Archive Functions
-- ==========================================

CREATE OR REPLACE FUNCTION archive_request(request_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM requests 
    WHERE id = request_id_param AND author_id = user_id_param
  ) THEN
    UPDATE requests
    SET status = 'archived'
    WHERE id = request_id_param AND author_id = user_id_param;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION archive_offer(offer_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM offers 
    WHERE id = offer_id_param AND provider_id = user_id_param
  ) THEN
    UPDATE offers
    SET status = 'archived'
    WHERE id = offer_id_param AND provider_id = user_id_param;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION unarchive_request(request_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM requests 
    WHERE id = request_id_param AND author_id = user_id_param AND status = 'archived'
  ) THEN
    UPDATE requests
    SET status = 'completed'
    WHERE id = request_id_param AND author_id = user_id_param;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION unarchive_offer(offer_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM offers 
    WHERE id = offer_id_param AND provider_id = user_id_param AND status = 'archived'
  ) THEN
    UPDATE offers
    SET status = 'rejected'
    WHERE id = offer_id_param AND provider_id = user_id_param;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- ==========================================
-- Trigger Functions (إضافة SET search_path)
-- ==========================================

CREATE OR REPLACE FUNCTION notify_on_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  request_owner_id UUID;
  request_title TEXT;
  request_author_name TEXT;
  offer_provider_name TEXT;
BEGIN
  SELECT 
    r.author_id,
    r.title,
    COALESCE(p.display_name, 'مستخدم')
  INTO request_owner_id, request_title, request_author_name
  FROM requests r
  LEFT JOIN profiles p ON p.id = r.author_id
  WHERE r.id = NEW.request_id;
  
  SELECT COALESCE(provider_name, 'مزود خدمة')
  INTO offer_provider_name
  FROM offers
  WHERE id = NEW.id;
  
  IF request_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id, related_offer_id)
    VALUES (
      request_owner_id,
      'offer',
      'عرض جديد على طلبك',
      'عرض جديد من ' || offer_provider_name || ' على طلبك: ' || COALESCE(request_title, 'طلب'),
      '/request/' || NEW.request_id,
      NEW.request_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_on_offer_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  offer_provider_id UUID;
  request_title TEXT;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    SELECT provider_id INTO offer_provider_id
    FROM offers
    WHERE id = NEW.id;
    
    SELECT title INTO request_title
    FROM requests
    WHERE id = NEW.request_id;
    
    IF offer_provider_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id, related_offer_id)
      VALUES (
        offer_provider_id,
        'status',
        'تم قبول عرضك! 🎉',
        'تم قبول عرضك على طلب: ' || COALESCE(request_title, 'طلب'),
        '/request/' || NEW.request_id,
        NEW.request_id,
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  conversation_record conversations%ROWTYPE;
  recipient_id UUID;
  sender_name TEXT;
  request_title TEXT;
  message_preview TEXT;
BEGIN
  SELECT * INTO conversation_record
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  IF conversation_record.participant1_id = NEW.sender_id THEN
    recipient_id := conversation_record.participant2_id;
  ELSE
    recipient_id := conversation_record.participant1_id;
  END IF;
  
  SELECT COALESCE(display_name, 'مستخدم')
  INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  IF conversation_record.request_id IS NOT NULL THEN
    SELECT title INTO request_title
    FROM requests
    WHERE id = conversation_record.request_id;
  END IF;
  
  message_preview := LEFT(NEW.content, 50);
  IF LENGTH(NEW.content) > 50 THEN
    message_preview := message_preview || '...';
  END IF;
  
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link_to, related_message_id, related_request_id, related_offer_id)
    VALUES (
      recipient_id,
      'message',
      'رسالة جديدة من ' || sender_name,
      CASE 
        WHEN request_title IS NOT NULL THEN
          message_preview || ' (في: ' || request_title || ')'
        ELSE
          message_preview
      END,
      '/messages/' || NEW.conversation_id,
      NEW.id,
      conversation_record.request_id,
      conversation_record.offer_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_on_new_interest_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  request_categories TEXT[];
  request_city TEXT;
  request_title TEXT;
  request_author_name TEXT;
  matching_user_id UUID;
  user_categories TEXT[];
  user_cities TEXT[];
BEGIN
  IF NEW.status != 'active' OR NEW.is_public != TRUE THEN
    RETURN NEW;
  END IF;

  SELECT 
    r.title,
    COALESCE(p.display_name, 'مستخدم'),
    r.location,
    r.location_city
  INTO request_title, request_author_name, request_city, request_city
  FROM requests r
  LEFT JOIN profiles p ON p.id = r.author_id
  WHERE r.id = NEW.id;

  SELECT ARRAY_AGG(c.label)
  INTO request_categories
  FROM request_categories rc
  JOIN categories c ON c.id = rc.category_id
  WHERE rc.request_id = NEW.id;

  FOR matching_user_id, user_categories, user_cities IN
    SELECT 
      id,
      COALESCE(interested_categories, ARRAY[]::TEXT[]),
      COALESCE(interested_cities, ARRAY[]::TEXT[])
    FROM profiles
    WHERE notify_on_interest = TRUE
      AND (
        (array_length(interested_categories, 1) IS NOT NULL AND
         EXISTS (
           SELECT 1 FROM unnest(interested_categories) AS cat
           WHERE EXISTS (
             SELECT 1 FROM unnest(COALESCE(request_categories, ARRAY[]::TEXT[])) AS req_cat
             WHERE req_cat ILIKE '%' || cat || '%' OR cat ILIKE '%' || req_cat || '%'
           )
         ))
        OR
        (array_length(interested_cities, 1) IS NOT NULL AND
         (request_city ILIKE ANY(SELECT '%' || city || '%' FROM unnest(interested_cities) AS city)
          OR EXISTS (
            SELECT 1 FROM unnest(interested_cities) AS city
            WHERE request_city ILIKE '%' || city || '%'
          )))
      )
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link_to, related_request_id)
    VALUES (
      matching_user_id,
      'interest',
      'طلب جديد يطابق اهتماماتك',
      'طلب جديد: ' || COALESCE(request_title, 'طلب') || ' من ' || request_author_name,
      '/request/' || NEW.id,
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

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

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'مستخدم'),
    NEW.email,
    NEW.phone
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_request_offers_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE requests
    SET offers_count = COALESCE(offers_count, 0) + 1
    WHERE id = NEW.request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE requests
    SET offers_count = GREATEST(COALESCE(offers_count, 0) - 1, 0)
    WHERE id = OLD.request_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

