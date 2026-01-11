-- ==========================================
-- FIX ALL RLS POLICIES - NEW PROJECT
-- ==========================================
-- هذا الملف يصلح جميع RLS Policies للمشروع الجديد
-- قم بتطبيقه مباشرة على Supabase Dashboard -> SQL Editor
-- ==========================================

-- ==========================================
-- PART 1: Fix Requests Table RLS
-- ==========================================

-- Ensure RLS is enabled
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view public requests" ON requests;
DROP POLICY IF EXISTS "Public requests are viewable by everyone" ON requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;

-- SELECT: Anyone can view public requests
CREATE POLICY "Public requests are viewable by everyone"
ON requests FOR SELECT
USING (is_public = true);

-- SELECT: Users can view their own requests (even if not public)
CREATE POLICY "Users can view their own requests"
ON requests FOR SELECT
USING (auth.uid() = author_id);

-- INSERT: Users can insert their own requests
CREATE POLICY "Users can insert their own requests"
ON requests FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = author_id
);

-- UPDATE: Users can update their own requests
CREATE POLICY "Users can update their own requests"
ON requests FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- DELETE: Users can delete their own requests
CREATE POLICY "Users can delete their own requests"
ON requests FOR DELETE
USING (auth.uid() = author_id);

-- ==========================================
-- PART 2: Fix Profiles Table RLS
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- SELECT: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- SELECT: Public profiles are viewable by everyone (optional)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- INSERT: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = id
);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ==========================================
-- PART 3: Fix Offers Table RLS (if exists)
-- ==========================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offers') THEN
    ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view offers" ON offers;
    DROP POLICY IF EXISTS "Users can insert their own offers" ON offers;
    DROP POLICY IF EXISTS "Users can update their own offers" ON offers;
    DROP POLICY IF EXISTS "Users can delete their own offers" ON offers;
    
    -- SELECT: Anyone can view offers
    CREATE POLICY "Anyone can view offers"
    ON offers FOR SELECT
    USING (true);
    
    -- INSERT: Users can insert their own offers
    CREATE POLICY "Users can insert their own offers"
    ON offers FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL 
      AND auth.uid() = provider_id
    );
    
    -- UPDATE: Users can update their own offers
    CREATE POLICY "Users can update their own offers"
    ON offers FOR UPDATE
    USING (auth.uid() = provider_id)
    WITH CHECK (auth.uid() = provider_id);
    
    -- DELETE: Users can delete their own offers
    CREATE POLICY "Users can delete their own offers"
    ON offers FOR DELETE
    USING (auth.uid() = provider_id);
  END IF;
END $$;

-- ==========================================
-- PART 4: Verify Policies
-- ==========================================

-- Verify requests policies
SELECT 
  'requests' as table_name,
  policyname,
  cmd,
  CASE 
    WHEN with_check IS NOT NULL THEN with_check::text
    ELSE qual::text
  END as policy_condition
FROM pg_policies 
WHERE tablename = 'requests'
ORDER BY cmd, policyname;

-- Verify profiles policies
SELECT 
  'profiles' as table_name,
  policyname,
  cmd,
  CASE 
    WHEN with_check IS NOT NULL THEN with_check::text
    ELSE qual::text
  END as policy_condition
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================
-- بعد تشغيل هذا الملف، يجب أن تعمل إنشاء الطلبات بشكل صحيح!
-- إذا استمرت المشكلة، تحقق من:
-- 1. أن المستخدم مسجل دخول (auth.uid() IS NOT NULL)
-- 2. أن author_id في الطلب يساوي auth.uid()
-- 3. أن جدول requests موجود وله الأعمدة المطلوبة
