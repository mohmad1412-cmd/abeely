-- ==========================================
-- إضافة تصنيف "مطاعم" إلى قاعدة البيانات
-- ==========================================
-- تاريخ: 2025-01-XX
-- الوصف: إضافة تصنيف جديد "مطاعم" للطلبات المتعلقة بالمطاعم
-- ==========================================

-- إضافة تصنيف "مطاعم" بعد "طبخ منزلي" (sort_order = 130.5)
INSERT INTO categories (id, label, label_en, label_ur, icon, emoji, description, is_active, sort_order) 
VALUES (
  'restaurants',
  'مطاعم',
  'Restaurants',
  'ریسٹورانٹس',
  'UtensilsCrossed',
  '🍽️',
  'المطاعم وخدمات المطاعم',
  TRUE,
  130.5
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  label_en = EXCLUDED.label_en,
  label_ur = EXCLUDED.label_ur,
  icon = EXCLUDED.icon,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ==========================================
-- تم إضافة التصنيف بنجاح!
-- ==========================================
-- يمكنك التحقق من إضافة التصنيف بالاستعلام التالي:
-- SELECT * FROM categories WHERE id = 'restaurants';
-- ==========================================

