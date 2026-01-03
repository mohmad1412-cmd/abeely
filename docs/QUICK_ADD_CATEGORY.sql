-- ==========================================
-- إضافة تصنيف جديد - استخدم هذا الاستعلام مباشرة
-- ==========================================

-- تأكد من أنك في جدول categories وليس request_categories!

INSERT INTO categories (id, label, emoji, description, is_active, sort_order)
VALUES (
  'consulting',                    -- ID فريد (TEXT، ليس UUID!)
  'استشارات مهنية',                -- الاسم العربي
  '💼',                            -- الإيموجي
  'استشارات في مختلف المجالات',     -- الوصف (اختياري)
  TRUE,                            -- نشط
  25                               -- ترتيب العرض
);

-- ==========================================
-- أمثلة أخرى:
-- ==========================================

-- مثال 1: تصنيف بسيط بدون وصف
INSERT INTO categories (id, label, emoji, is_active, sort_order)
VALUES ('consulting', 'استشارات مهنية', '💼', TRUE, 25);

-- مثال 2: تصنيف مع جميع الحقول
INSERT INTO categories (id, label, emoji, description, is_active, sort_order)
VALUES (
  'consulting',
  'استشارات مهنية',
  '💼',
  'استشارات في مختلف المجالات',
  TRUE,
  25
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ==========================================
-- إذا ظهر خطأ "invalid input syntax for type uuid":
-- ==========================================
-- 1. تأكد من أنك في جدول categories وليس request_categories
-- 2. تأكد من أن الـ id هو TEXT وليس UUID
-- 3. لا تستخدم gen_random_uuid() للـ id

