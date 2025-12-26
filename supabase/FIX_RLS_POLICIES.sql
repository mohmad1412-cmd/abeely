-- ==========================================
-- إصلاح تحذيرات RLS: إضافة Policies للجداول بدون Policies
-- ==========================================
-- هذا الملف يضيف RLS Policies للجداول التي لديها RLS مفعّل بدون policies

-- ==========================================
-- Reviews Table Policies
-- ==========================================

-- تفعيل RLS على reviews (إذا لم يكن مفعّل)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

    -- Policy: المستخدمون يمكنهم قراءة جميع الـ reviews
    DROP POLICY IF EXISTS "Users can view all reviews" ON reviews;
    CREATE POLICY "Users can view all reviews"
    ON reviews FOR SELECT
    USING (true);

    -- Policy: المستخدمون يمكنهم إنشاء reviews خاصة بهم
    -- التحقق من وجود العمود أولاً
    DROP POLICY IF EXISTS "Users can create their own reviews" ON reviews;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'reviewer_id') THEN
      CREATE POLICY "Users can create their own reviews"
      ON reviews FOR INSERT
      WITH CHECK (auth.uid() = reviewer_id);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'user_id') THEN
      CREATE POLICY "Users can create their own reviews"
      ON reviews FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    ELSE
      -- إذا لم يكن هناك عمود user، اسمح للجميع
      CREATE POLICY "Users can create their own reviews"
      ON reviews FOR INSERT
      WITH CHECK (true);
    END IF;

    -- Policy: المستخدمون يمكنهم تحديث reviews الخاصة بهم فقط
    DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'reviewer_id') THEN
      CREATE POLICY "Users can update their own reviews"
      ON reviews FOR UPDATE
      USING (auth.uid() = reviewer_id)
      WITH CHECK (auth.uid() = reviewer_id);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'user_id') THEN
      CREATE POLICY "Users can update their own reviews"
      ON reviews FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    ELSE
      CREATE POLICY "Users can update their own reviews"
      ON reviews FOR UPDATE
      USING (true)
      WITH CHECK (true);
    END IF;

    -- Policy: المستخدمون يمكنهم حذف reviews الخاصة بهم فقط
    DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'reviewer_id') THEN
      CREATE POLICY "Users can delete their own reviews"
      ON reviews FOR DELETE
      USING (auth.uid() = reviewer_id);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'user_id') THEN
      CREATE POLICY "Users can delete their own reviews"
      ON reviews FOR DELETE
      USING (auth.uid() = user_id);
    ELSE
      CREATE POLICY "Users can delete their own reviews"
      ON reviews FOR DELETE
      USING (true);
    END IF;
  END IF;
END $$;

-- ==========================================
-- User Preferences Table Policies
-- ==========================================

-- تفعيل RLS على user_preferences (إذا لم يكن مفعّل)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_preferences') THEN
    ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

    -- Policy: المستخدمون يمكنهم قراءة preferences الخاصة بهم فقط
    DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
    CREATE POLICY "Users can view their own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

    -- Policy: المستخدمون يمكنهم إنشاء preferences خاصة بهم
    DROP POLICY IF EXISTS "Users can create their own preferences" ON user_preferences;
    CREATE POLICY "Users can create their own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    -- Policy: المستخدمون يمكنهم تحديث preferences الخاصة بهم فقط
    DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
    CREATE POLICY "Users can update their own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    -- Policy: المستخدمون يمكنهم حذف preferences الخاصة بهم فقط
    DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;
    CREATE POLICY "Users can delete their own preferences"
    ON user_preferences FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- ==========================================
-- حل بديل: إذا لم تكن بحاجة لـ RLS على هذه الجداول
-- ==========================================
-- إذا كانت هذه الجداول غير مستخدمة أو لا تحتاج RLS،
-- يمكنك إزالة RLS بدلاً من إضافة policies:

-- ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
