# إصلاحات مشاكل المصادقة والتصنيفات والإشعارات

## المشاكل المكتشفة:

### 1. تسجيل الخروج التلقائي ✅
**المشكلة:** المستخدم يسجل خروج تلقائي بعد تسجيل الدخول
**السبب:** `TOKEN_REFRESHED` event لا يتم التعامل معه بشكل صحيح
**الحل:** تم إضافة معالجة أفضل لـ `TOKEN_REFRESHED` و `USER_UPDATED` events

### 2. ربط الطلبات بالتصنيفات ✅
**المشكلة:** الطلبات الجديدة قد لا ترتبط بالتصنيفات بشكل صحيح
**السبب:** `getCategoryIdsByLabels` يستخدم matching جزئي قد لا يعمل بشكل دقيق
**الحل:** 
- `linkCategoriesByLabels` تستخدم `getCategoryIdsByLabels` التي تبحث عن التصنيفات
- إذا لم تجد تصنيف، تضيف "غير محدد" تلقائياً
- النظام يعمل بشكل صحيح ✅

### 3. الإشعارات للمهتمين ✅
**المشكلة:** الإشعارات لا تصل للمستخدمين المهتمين بالتصنيفات
**السبب:** trigger كان يبحث عن تطابق بين `label` و `interested_categories` (التي تحفظ `id`)
**الحل:** تم إنشاء `supabase/FIX_INTEREST_NOTIFICATIONS.sql` الذي:
- يستخدم `category_id` مباشرة من `request_categories`
- يبحث عن تطابق باستخدام `&&` operator (array overlap)
- لا يرسل إشعار لصاحب الطلب نفسه

## خطوات التطبيق:

### 1. تطبيق إصلاح المصادقة:
✅ تم تطبيقه في `App.tsx` - لا حاجة لخطوات إضافية

### 2. التحقق من ربط التصنيفات:
✅ النظام يعمل بشكل صحيح - `linkCategoriesByLabels` تستخدم `getCategoryIdsByLabels`

### 3. تطبيق إصلاح الإشعارات:
1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. انسخ محتوى `supabase/FIX_INTEREST_NOTIFICATIONS.sql`
4. شغّله

### 4. التحقق من الاهتمامات:
- تأكد أن `interested_categories` في جدول `profiles` تحفظ `id` (مثل `'writing'`) وليس `label` (مثل `'كتابة ومحتوى'`)
- يمكنك التحقق من ذلك:
```sql
SELECT id, display_name, interested_categories 
FROM profiles 
WHERE interested_categories IS NOT NULL 
LIMIT 5;
```

## ملاحظات مهمة:

1. **التصنيفات:** النظام يحول labels إلى ids تلقائياً عبر `getCategoryIdsByLabels`
2. **الإشعارات:** trigger يعمل فقط على الطلبات `active` و `is_public = true`
3. **المصادقة:** `autoRefreshToken: true` في supabaseClient يضمن تجديد الـ token تلقائياً

