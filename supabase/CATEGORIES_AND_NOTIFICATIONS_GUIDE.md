# 📋 دليل إعداد التصنيفات والإشعارات

## المتطلبات
- الوصول إلى Supabase Dashboard
- صلاحية تنفيذ SQL

---

## 🚀 خطوات التثبيت

### الخطوة 1: تشغيل ملف SQL

1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **SQL Editor** من القائمة الجانبية
4. انسخ محتوى ملف `CATEGORIES_AND_NOTIFICATIONS_SETUP.sql`
5. الصقه في المحرر واضغط **Run**

### الخطوة 2: التحقق من التثبيت

بعد تشغيل الملف، تأكد من:

```sql
-- التحقق من وجود التصنيفات
SELECT * FROM categories ORDER BY sort_order;

-- يجب أن يظهر 20 تصنيف تقريباً
```

```sql
-- التحقق من الـ Triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%notify%';

-- يجب أن تظهر:
-- trigger_notify_on_new_offer
-- trigger_notify_on_offer_accepted  
-- trigger_notify_on_new_message
-- trigger_notify_on_new_interest_request
```

---

## 🎯 ما الذي تم إنشاؤه؟

### 1. جدول التصنيفات (`categories`)
| العمود | الوصف |
|--------|-------|
| `id` | معرف التصنيف (مثل: tech, design) |
| `label` | اسم التصنيف بالعربية |
| `emoji` | أيقونة التصنيف |
| `description` | وصف التصنيف |
| `is_active` | هل التصنيف نشط؟ |
| `sort_order` | ترتيب العرض |

### 2. جدول الربط (`request_categories`)
يربط الطلبات بالتصنيفات (Many-to-Many)

### 3. Triggers الإشعارات
| الـ Trigger | الحدث |
|-------------|-------|
| `trigger_notify_on_new_offer` | إشعار لصاحب الطلب عند استلام عرض جديد |
| `trigger_notify_on_offer_accepted` | إشعار لمقدم العرض عند قبول عرضه |
| `trigger_notify_on_new_message` | إشعار للمستلم عند وصول رسالة جديدة |
| `trigger_notify_on_new_interest_request` | إشعار للمهتمين عند طلب جديد يطابق اهتماماتهم |

---

## 🧪 اختبار الإشعارات

### اختبار إشعار العروض:
```sql
-- إنشاء عرض تجريبي (استبدل القيم)
INSERT INTO offers (request_id, provider_id, provider_name, title, price, duration)
VALUES (
  'REQUEST_ID_HERE',
  'PROVIDER_USER_ID',
  'اسم المزود',
  'عنوان العرض',
  '1000',
  '5 أيام'
);

-- تحقق من الإشعار
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
```

### اختبار إشعار الاهتمامات:
```sql
-- تأكد من أن المستخدم لديه اهتمامات
UPDATE profiles 
SET 
  interested_categories = ARRAY['tech', 'design'],
  interested_cities = ARRAY['الرياض'],
  notify_on_interest = TRUE
WHERE id = 'USER_ID_HERE';

-- أنشئ طلب جديد
INSERT INTO requests (author_id, title, location, categories, status, is_public)
VALUES (
  'ANOTHER_USER_ID',
  'طلب تجريبي',
  'الرياض',
  ARRAY['tech'],
  'active',
  TRUE
);

-- تحقق من الإشعارات
SELECT * FROM notifications WHERE type = 'interest' ORDER BY created_at DESC;
```

---

## 🔧 إدارة التصنيفات

### إضافة تصنيف جديد:
```sql
INSERT INTO categories (id, label, emoji, description, sort_order)
VALUES ('new_category', 'تصنيف جديد', '🆕', 'وصف التصنيف', 21);
```

### تعطيل تصنيف:
```sql
UPDATE categories SET is_active = FALSE WHERE id = 'category_id';
```

### تعديل تصنيف:
```sql
UPDATE categories 
SET label = 'الاسم الجديد', emoji = '🎯', updated_at = NOW()
WHERE id = 'category_id';
```

---

## 📱 استخدام الخدمة في الفرونت إند

```typescript
import { getCategories, searchCategories } from './services/categoriesService';

// جلب كل التصنيفات
const categories = await getCategories();

// البحث في التصنيفات
const results = await searchCategories('تقن');

// الاشتراك بالتحديثات
import { subscribeToCategoriesUpdates } from './services/categoriesService';
const unsubscribe = subscribeToCategoriesUpdates((newCategories) => {
  console.log('تم تحديث التصنيفات:', newCategories);
});
```

---

## ⚠️ ملاحظات مهمة

1. **Fallback**: إذا فشل الاتصال بالباك إند، ستُستخدم التصنيفات المحلية تلقائياً
2. **Cache**: التصنيفات تُخزن مؤقتاً لمدة 5 دقائق لتحسين الأداء
3. **Realtime**: عند تغيير التصنيفات من الداشبورد، سيتم تحديث الفرونت إند تلقائياً

---

## 🎨 التصنيفات المتوفرة

| ID | التصنيف | الأيقونة |
|----|---------|---------|
| tech | خدمات تقنية وبرمجة | 💻 |
| design | تصميم وجرافيكس | 🎨 |
| writing | كتابة ومحتوى | ✍️ |
| marketing | تسويق ومبيعات | 📊 |
| engineering | هندسة وعمارة | 🏗️ |
| mobile | خدمات جوال | 📱 |
| maintenance | صيانة ومنزل | 🔧 |
| transport | نقل وخدمات لوجستية | 🚚 |
| health | صحة ولياقة | 🩺 |
| translation | ترجمة ولغات | 🌐 |
| education | تعليم وتدريب | 📚 |
| legal | قانون واستشارات | ⚖️ |
| finance | مالية ومحاسبة | 💰 |
| photography | تصوير وفيديو | 📷 |
| events | مناسبات وحفلات | 🎉 |
| beauty | تجميل وعناية | 💅 |
| cleaning | تنظيف وخدمات منزلية | 🧹 |
| food | طعام ومطاعم | 🍽️ |
| car | سيارات وقطع غيار | 🚗 |
| other | أخرى | 📦 |












