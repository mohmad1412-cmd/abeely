-- ==========================================
-- إصلاح تحذيرات Function Search Path Mutable
-- ==========================================
-- هذا الملف يضيف SET search_path = public لكل function
-- لحماية من search path manipulation attacks
-- شغّله في Supabase SQL Editor
-- ==========================================

-- ==========================================
-- AI Conversation Functions
-- ==========================================

CREATE OR REPLACE FUNCTION update_ai_conversation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE ai_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_active_conversation(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT id INTO v_conversation_id
  FROM ai_conversations
  WHERE user_id = p_user_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_new_conversation(p_user_id UUID, p_title TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- إيقاف جميع المحادثات النشطة السابقة
  UPDATE ai_conversations
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;
  
  -- إنشاء محادثة جديدة
  INSERT INTO ai_conversations (user_id, title, is_active)
  VALUES (p_user_id, p_title, true)
  RETURNING id INTO v_conversation_id;
  
  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION deactivate_conversation(p_conversation_id UUID, p_request_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.role() <> 'service_role' THEN
    PERFORM 1 FROM ai_conversations
    WHERE id = p_conversation_id
      AND user_id = auth.uid();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  UPDATE ai_conversations
  SET is_active = false,
      request_id = COALESCE(p_request_id, request_id)
  WHERE id = p_conversation_id;
END;
$$;

-- ==========================================
-- Notification Functions
-- ==========================================

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

-- ==========================================
-- Auth Functions
-- ==========================================

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

CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_display_name TEXT;
  user_avatar_url TEXT;
BEGIN
  IF OLD.phone IS DISTINCT FROM NEW.phone OR
     OLD.email IS DISTINCT FROM NEW.email OR
     OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data OR
     OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at OR
     OLD.phone_confirmed_at IS DISTINCT FROM NEW.phone_confirmed_at THEN
    
    user_display_name := COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NULL
    );
    
    user_avatar_url := COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      NULL
    );
    
    UPDATE public.profiles
    SET
      phone = NEW.phone,
      email = NEW.email,
      display_name = COALESCE(user_display_name, display_name),
      avatar_url = COALESCE(user_avatar_url, avatar_url),
      is_verified = CASE 
        WHEN NEW.email_confirmed_at IS NOT NULL OR NEW.phone_confirmed_at IS NOT NULL 
        THEN TRUE 
        ELSE is_verified 
      END,
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION create_profile_for_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record auth.users%ROWTYPE;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> '' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RETURN FALSE;
  END IF;
  
  SELECT * INTO user_record FROM auth.users WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  INSERT INTO public.profiles (
    id,
    phone,
    email,
    display_name,
    avatar_url,
    role,
    is_guest,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    user_record.id,
    user_record.phone,
    user_record.email,
    COALESCE(
      user_record.raw_user_meta_data->>'display_name',
      user_record.raw_user_meta_data->>'full_name',
      user_record.raw_user_meta_data->>'name',
      NULL
    ),
    COALESCE(
      user_record.raw_user_meta_data->>'avatar_url',
      user_record.raw_user_meta_data->>'picture',
      NULL
    ),
    'user',
    FALSE,
    CASE 
      WHEN user_record.email_confirmed_at IS NOT NULL OR user_record.phone_confirmed_at IS NOT NULL 
      THEN TRUE 
      ELSE FALSE 
    END,
    NOW(),
    NOW()
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION verify_guest_phone(
  p_phone_number TEXT,
  p_verification_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guest_record verified_guests%ROWTYPE;
BEGIN
  -- Find matching record
  SELECT * INTO guest_record
  FROM verified_guests
  WHERE phone = p_phone_number
    AND verification_code = p_verification_code
    AND code_expires_at > NOW()
    AND is_verified = FALSE;
  
  IF NOT FOUND THEN
    RETURN FALSE; -- Invalid or expired code
  END IF;
  
  -- Mark as verified
  UPDATE verified_guests
  SET
    is_verified = TRUE,
    verified_at = NOW(),
    updated_at = NOW()
  WHERE phone = p_phone_number
    AND verification_code = p_verification_code;
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION clean_expired_guest_records()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> '' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- Delete records that expired more than 24 hours ago
  DELETE FROM verified_guests
  WHERE code_expires_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

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
-- Success Message
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ تم إصلاح جميع دوال Function Search Path Mutable بنجاح!';
  RAISE NOTICE '📋 الدوال المحدثة:';
  RAISE NOTICE '   - update_ai_conversation_updated_at';
  RAISE NOTICE '   - get_active_conversation';
  RAISE NOTICE '   - create_new_conversation';
  RAISE NOTICE '   - deactivate_conversation';
  RAISE NOTICE '   - notify_on_new_interest_request';
  RAISE NOTICE '   - notify_on_new_offer';
  RAISE NOTICE '   - handle_new_user';
  RAISE NOTICE '   - handle_user_update';
  RAISE NOTICE '   - create_profile_for_user';
  RAISE NOTICE '   - verify_guest_phone';
  RAISE NOTICE '   - clean_expired_guest_records';
  RAISE NOTICE '   - update_updated_at_column';
  RAISE NOTICE '✨ جميع الدوال الآن محمية من search path manipulation attacks';
END $$;

