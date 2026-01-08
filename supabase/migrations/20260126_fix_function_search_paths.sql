-- ==============================================================================
-- إصلاح تحذيرات Linter: Function Search Path Mutable
-- Fixes: notify_on_new_offer, notify_on_offer_accepted, notify_on_new_message, notify_on_new_interest_request
-- Explicitly setting search_path = public to prevent potential security issues.
-- ==============================================================================

-- 1. notify_on_new_offer
CREATE OR REPLACE FUNCTION notify_on_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_owner_id UUID;
  request_title TEXT;
  request_author_name TEXT;
  offer_provider_name TEXT;
BEGIN
  -- Get request details
  SELECT 
    r.author_id,
    r.title,
    COALESCE(p.display_name, 'مستخدم')
  INTO request_owner_id, request_title, request_author_name
  FROM requests r
  LEFT JOIN profiles p ON p.id = r.author_id
  WHERE r.id = NEW.request_id;
  
  -- Get offer provider name
  SELECT COALESCE(provider_name, 'مزود خدمة')
  INTO offer_provider_name
  FROM offers
  WHERE id = NEW.id;
  
  -- Create notification for request owner
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

-- 2. notify_on_offer_accepted
CREATE OR REPLACE FUNCTION notify_on_offer_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offer_provider_id UUID;
  request_title TEXT;
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Get offer provider
    SELECT provider_id INTO offer_provider_id
    FROM offers
    WHERE id = NEW.id;
    
    -- Get request title
    SELECT title INTO request_title
    FROM requests
    WHERE id = NEW.request_id;
    
    -- Create notification for offer provider
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

-- 3. notify_on_new_message
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
  request_title TEXT;
  message_preview TEXT;
BEGIN
  -- Get conversation details
  SELECT * INTO conversation_record
  FROM conversations
  WHERE id = NEW.conversation_id;
  
  -- Determine recipient (the other participant)
  IF conversation_record.participant1_id = NEW.sender_id THEN
    recipient_id := conversation_record.participant2_id;
  ELSE
    recipient_id := conversation_record.participant1_id;
  END IF;
  
  -- Get sender name
  SELECT COALESCE(display_name, 'مستخدم')
  INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Get request title if exists
  IF conversation_record.request_id IS NOT NULL THEN
    SELECT title INTO request_title
    FROM requests
    WHERE id = conversation_record.request_id;
  END IF;
  
  -- Create message preview
  message_preview := LEFT(NEW.content, 50);
  IF LENGTH(NEW.content) > 50 THEN
    message_preview := message_preview || '...';
  END IF;
  
  -- Create notification for recipient
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

-- 4. notify_on_new_interest_request
CREATE OR REPLACE FUNCTION notify_on_new_interest_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
  -- Only process active, public requests
  IF NEW.status != 'active' OR NEW.is_public != TRUE THEN
    RETURN NEW;
  END IF;

  -- Get request details
  SELECT 
    r.title,
    COALESCE(p.display_name, 'مستخدم'),
    r.location,
    r.location_city
  INTO request_title, request_author_name, request_city, request_city
  FROM requests r
  LEFT JOIN profiles p ON p.id = r.author_id
  WHERE r.id = NEW.id;

  -- Get request categories
  SELECT ARRAY_AGG(c.label)
  INTO request_categories
  FROM request_categories rc
  JOIN categories c ON c.id = rc.category_id
  WHERE rc.request_id = NEW.id;

  -- Find users with matching interests who haven't read this request
  FOR matching_user_id, user_categories, user_cities IN
    SELECT 
      p.id,
      COALESCE(p.interested_categories, ARRAY[]::TEXT[]),
      COALESCE(p.interested_cities, ARRAY[]::TEXT[])
    FROM profiles p
    WHERE p.notify_on_interest = TRUE
      -- Don't send notification if user already viewed (is_viewed = true) or read (is_read = true) this request
      AND NOT EXISTS (
        SELECT 1 FROM request_views rv
        WHERE rv.request_id = NEW.id
          AND rv.user_id = p.id
          AND (rv.is_viewed = TRUE OR rv.is_read = TRUE)
      )
      AND (
        -- Match categories
        (array_length(p.interested_categories, 1) IS NOT NULL AND
         EXISTS (
           SELECT 1 FROM unnest(p.interested_categories) AS cat
           WHERE EXISTS (
             SELECT 1 FROM unnest(COALESCE(request_categories, ARRAY[]::TEXT[])) AS req_cat
             WHERE req_cat ILIKE '%' || cat || '%' OR cat ILIKE '%' || req_cat || '%'
           )
         ))
        OR
        -- Match cities
        (array_length(p.interested_cities, 1) IS NOT NULL AND
         (request_city ILIKE ANY(SELECT '%' || city || '%' FROM unnest(p.interested_cities) AS city)
          OR EXISTS (
            SELECT 1 FROM unnest(p.interested_cities) AS city
            WHERE request_city ILIKE '%' || city || '%'
          )))
      )
  LOOP
    -- Create notification for matching user
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
