-- ==========================================
-- Migration: التأكد من وجود تصنيف "أخرى"
-- ==========================================
-- هذا الملف يضمن وجود تصنيف "أخرى" في قاعدة البيانات
-- ==========================================

-- إضافة تصنيف "أخرى" إذا لم يكن موجوداً
INSERT INTO categories (id, label, label_en, label_ur, emoji, description, is_active, sort_order) VALUES
  ('other', 'أخرى', 'Other', 'دیگر', '📦', 'خدمات متنوعة أخرى', TRUE, 100)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  label_en = EXCLUDED.label_en,
  label_ur = EXCLUDED.label_ur,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ملاحظة: إذا كان هناك تصنيف 'unspecified' قديم، يمكن تحديثه أو حذفه
-- لكن سنتركه للتوافق مع البيانات القديمة

