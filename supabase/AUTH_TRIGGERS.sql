-- ==========================================
-- Authentication Triggers
-- ==========================================
-- Triggers لإنشاء profiles تلقائياً عند التسجيل وتحديثها عند تغيير بيانات المستخدم

-- ==========================================
-- Step 1: Drop existing triggers and functions
-- ==========================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_user_update() CASCADE;

-- ==========================================
-- Step 2: Function to create profile when user is created
-- ==========================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_phone TEXT;
  user_email TEXT;
  user_display_name TEXT;
  user_avatar_url TEXT;
BEGIN
  -- Extract user data from auth.users
  user_phone := NEW.phone;
  user_email := NEW.email;
  
  -- Try to get display name from raw_user_meta_data
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NULL
  );
  
  -- Try to get avatar URL from raw_user_meta_data
  user_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );
  
  -- Determine if user is guest based on auth method
  -- Guests typically sign in anonymously or with minimal info
  -- For now, we'll set is_guest to false by default (can be updated later)
  
  -- Insert into profiles table
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
    NEW.id,
    user_phone,
    user_email,
    user_display_name,
    user_avatar_url,
    'user', -- Default role
    FALSE,  -- Not a guest by default
    CASE 
      WHEN NEW.email_confirmed_at IS NOT NULL OR NEW.phone_confirmed_at IS NOT NULL 
      THEN TRUE 
      ELSE FALSE 
    END, -- Verified if email or phone is confirmed
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
  
  RETURN NEW;
END;
$$;

-- ==========================================
-- Step 3: Function to update profile when user data changes
-- ==========================================

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
  -- Update profile if user data changed
  IF OLD.phone IS DISTINCT FROM NEW.phone OR
     OLD.email IS DISTINCT FROM NEW.email OR
     OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data OR
     OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at OR
     OLD.phone_confirmed_at IS DISTINCT FROM NEW.phone_confirmed_at THEN
    
    -- Extract updated metadata
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
    
    -- Update profile
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

-- ==========================================
-- Step 4: Create triggers
-- ==========================================

-- Trigger after user is created
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- Trigger after user is updated
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_user_update();

-- ==========================================
-- Step 5: Create function to manually create profile (for existing users)
-- ==========================================

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

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    RETURN FALSE; -- Profile already exists
  END IF;
  
  -- Get user data
  SELECT * INTO user_record FROM auth.users WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE; -- User not found
  END IF;
  
  -- Create profile
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

-- ==========================================
-- Step 6: Add helpful comments
-- ==========================================

COMMENT ON FUNCTION handle_new_user() IS 'إنشاء profile تلقائياً عند إنشاء مستخدم جديد';
COMMENT ON FUNCTION handle_user_update() IS 'تحديث profile عند تحديث بيانات المستخدم';
COMMENT ON FUNCTION create_profile_for_user(UUID) IS 'إنشاء profile يدوياً لمستخدم موجود (للمستخدمين القدامى)';

