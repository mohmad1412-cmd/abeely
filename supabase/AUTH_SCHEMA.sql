-- ==========================================
-- Authentication Schema
-- ==========================================
-- إنشاء جداول profiles و verified_guests للمصادقة والتسجيل

-- ==========================================
-- Step 1: Drop existing tables if needed (for clean setup)
-- ==========================================

DROP TABLE IF EXISTS verified_guests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ==========================================
-- Step 2: Create profiles table
-- ==========================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  email TEXT,
  display_name TEXT,
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

-- ==========================================
-- Step 3: Create verified_guests table
-- ==========================================

CREATE TABLE verified_guests (
  phone TEXT PRIMARY KEY,
  verification_code TEXT NOT NULL,
  code_expires_at TIMESTAMPTZ NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Step 4: Create indexes for better performance
-- ==========================================

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_guest ON profiles(is_guest);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Indexes for verified_guests
CREATE INDEX IF NOT EXISTS idx_verified_guests_code_expires ON verified_guests(code_expires_at);
CREATE INDEX IF NOT EXISTS idx_verified_guests_is_verified ON verified_guests(is_verified);
CREATE INDEX IF NOT EXISTS idx_verified_guests_created_at ON verified_guests(created_at DESC);

-- ==========================================
-- Step 5: Create updated_at trigger function
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Step 6: Add updated_at triggers
-- ==========================================

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verified_guests_updated_at
BEFORE UPDATE ON verified_guests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Step 7: Enable Row Level Security
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_guests ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Step 8: Create helpful comments
-- ==========================================

COMMENT ON TABLE profiles IS 'معلومات المستخدمين الإضافية المرتبطة بـ auth.users';
COMMENT ON TABLE verified_guests IS 'معلومات الضيوف المؤقتة للتحقق من أرقام الهواتف';
COMMENT ON COLUMN profiles.role IS 'دور المستخدم: user, provider, admin';
COMMENT ON COLUMN profiles.is_guest IS 'هل المستخدم في وضع الضيف';
COMMENT ON COLUMN profiles.preferred_categories IS 'قائمة الاهتمامات المفضلة (JSON array)';
COMMENT ON COLUMN profiles.preferred_cities IS 'قائمة المدن المفضلة (JSON array)';

