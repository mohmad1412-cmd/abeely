-- ==========================================
-- Complete Authentication Setup
-- ==========================================
-- هذا الملف يحتوي على كل شيء لإعداد نظام المصادقة
-- شغّله مرة واحدة فقط بعد التأكد من أن Supabase يعمل

-- ==========================================
-- IMPORTANT: Read before running
-- ==========================================
-- 1. تأكد من أن Supabase يعمل (محلياً أو على السحابة)
-- 2. تأكد من أن لديك صلاحيات كافية لإنشاء الجداول والـ triggers
-- 3. احتفظ بنسخة احتياطية من قاعدة البيانات قبل التنفيذ
-- 4. راجع الملفات الفردية إذا كنت تريد تنفيذها بشكل منفصل:
--    - AUTH_SCHEMA.sql
--    - AUTH_TRIGGERS.sql
--    - AUTH_RLS_POLICIES.sql

-- ==========================================
-- Step 1: Create Schema (Tables)
-- ==========================================

-- Drop existing tables if needed (for clean setup)
DROP TABLE IF EXISTS verified_guests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'provider', 'admin')),
  is_guest BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER DEFAULT 0 CHECK (reviews_count >= 0),
  preferred_categories JSONB DEFAULT '[]'::jsonb,
  preferred_cities JSONB DEFAULT '[]'::jsonb,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create verified_guests table
CREATE TABLE verified_guests (
  phone TEXT PRIMARY KEY,
  verification_code TEXT NOT NULL,
  code_expires_at TIMESTAMPTZ NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verified_guests_code_expires ON verified_guests(code_expires_at);
CREATE INDEX IF NOT EXISTS idx_verified_guests_is_verified ON verified_guests(is_verified);
CREATE INDEX IF NOT EXISTS idx_verified_guests_created_at ON verified_guests(created_at DESC);

-- Create updated_at trigger function
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

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verified_guests_updated_at
BEFORE UPDATE ON verified_guests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_guests ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Step 2: Create Triggers
-- ==========================================

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_user_update() CASCADE;
DROP FUNCTION IF EXISTS create_profile_for_user(UUID) CASCADE;

-- Function to create profile when user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  user_phone TEXT;
  user_email TEXT;
  user_display_name TEXT;
  user_avatar_url TEXT;
BEGIN
  user_phone := NEW.phone;
  user_email := NEW.email;
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
    'user',
    FALSE,
    CASE 
      WHEN NEW.email_confirmed_at IS NOT NULL OR NEW.phone_confirmed_at IS NOT NULL 
      THEN TRUE 
      ELSE FALSE 
    END,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Function to update profile when user data changes
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

-- Function to manually create profile (for existing users)
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

-- Create triggers
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_updated
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_user_update();

-- ==========================================
-- Step 3: Create RLS Policies
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Guests can create verified guest records" ON verified_guests;
DROP POLICY IF EXISTS "Guests can view their own verified guest records" ON verified_guests;
DROP POLICY IF EXISTS "Guests can update their own verified guest records" ON verified_guests;
DROP POLICY IF EXISTS "System can clean expired guest records" ON verified_guests;
DROP FUNCTION IF EXISTS verify_guest_phone(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS clean_expired_guest_records() CASCADE;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles"
ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Verified Guests Policies
CREATE POLICY "Guests can create verified guest records"
ON verified_guests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Guests can view their own verified guest records"
ON verified_guests FOR SELECT
USING (code_expires_at > NOW());

CREATE POLICY "Guests can update their own verified guest records"
ON verified_guests FOR UPDATE
USING (code_expires_at > NOW())
WITH CHECK (code_expires_at > NOW());

CREATE POLICY "System can clean expired guest records"
ON verified_guests FOR DELETE
USING (
  code_expires_at < NOW()
  AND auth.uid() IS NOT NULL
);

-- Helper functions
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
  SELECT * INTO guest_record
  FROM verified_guests
  WHERE phone = p_phone_number
    AND verification_code = p_verification_code
    AND code_expires_at > NOW()
    AND is_verified = FALSE;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
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

  DELETE FROM verified_guests
  WHERE code_expires_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ==========================================
-- Step 4: Create profiles for existing users (if any)
-- ==========================================

-- This will create profiles for any existing users in auth.users
-- that don't have profiles yet
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id FROM auth.users
    WHERE id NOT IN (SELECT id FROM profiles)
  LOOP
    PERFORM create_profile_for_user(user_record.id);
  END LOOP;
END $$;

-- ==========================================
-- Step 5: Success message
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ تم إعداد نظام المصادقة بنجاح!';
  RAISE NOTICE '📋 الجداول: profiles, verified_guests';
  RAISE NOTICE '🔧 Triggers: on_auth_user_created, on_auth_user_updated';
  RAISE NOTICE '🔒 RLS Policies: مفعلة لجميع الجداول';
  RAISE NOTICE '✨ جاهز للاستخدام!';
END $$;

