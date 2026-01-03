-- ==========================================
-- إصلاح trigger الإشعارات للاهتمامات
-- المشكلة: trigger كان يبحث عن تطابق بين label و interested_categories
-- لكن interested_categories تحفظ id (مثل 'writing') وليس label (مثل 'كتابة ومحتوى')
-- ==========================================

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS trigger_notify_on_new_interest_request ON requests;
DROP FUNCTION IF EXISTS notify_on_new_interest_request() CASCADE;

-- ==========================================
-- Function: إشعار عند طلب جديد يطابق اهتمامات المستخدم (مُصلح)
-- ==========================================
CREATE OR REPLACE FUNCTION notify_on_new_interest_request()
RETURNS TRIGGER AS $$
DECLARE
  request_category_ids TEXT[];
  request_city TEXT;
  request_title TEXT;
  request_author_name TEXT;
  matching_user_id UUID;
  user_category_ids TEXT[];
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
    COALESCE(r.location_city, r.location)
  INTO request_title, request_author_name, request_city
  FROM requests r
  LEFT JOIN profiles p ON p.id = r.author_id
  WHERE r.id = NEW.id;

  -- Get request category IDs (not labels!)
  SELECT ARRAY_AGG(rc.category_id)
  INTO request_category_ids
  FROM request_categories rc
  WHERE rc.request_id = NEW.id;

  -- Find users with matching interests
  FOR matching_user_id, user_category_ids, user_cities IN
    SELECT 
      id,
      COALESCE(interested_categories, ARRAY[]::TEXT[]),
      COALESCE(interested_cities, ARRAY[]::TEXT[])
    FROM profiles
    WHERE notify_on_interest = TRUE
      AND (
        -- Match categories by ID (exact match or array overlap)
        (array_length(interested_categories, 1) IS NOT NULL AND
         array_length(COALESCE(request_category_ids, ARRAY[]::TEXT[]), 1) IS NOT NULL AND
         interested_categories && request_category_ids)
        OR
        -- Match cities
        (array_length(interested_cities, 1) IS NOT NULL AND
         (request_city ILIKE ANY(SELECT '%' || city || '%' FROM unnest(interested_cities) AS city)
          OR EXISTS (
            SELECT 1 FROM unnest(interested_cities) AS city
            WHERE request_city ILIKE '%' || city || '%'
          )))
      )
      -- Don't notify the request author
      AND id != NEW.author_id
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
$$ LANGUAGE plpgsql;

-- ==========================================
-- Create trigger for interest notifications
-- ==========================================
CREATE TRIGGER trigger_notify_on_new_interest_request
AFTER INSERT ON requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_interest_request();

