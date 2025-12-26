# إعداد نظام الرسائل والإشعارات

## الخطوات المطلوبة

### 1. تشغيل SQL Schema

**مهم:** استخدم ملف `messages_and_notifications_schema_fixed.sql` بدلاً من الملف القديم.

قم بتشغيل ملف `messages_and_notifications_schema_fixed.sql` في Supabase SQL Editor:

1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. انسخ محتوى `messages_and_notifications_schema.sql`
4. قم بتشغيله

هذا الملف سيقوم بإنشاء:
- جدول `conversations` للمحادثات
- جدول `messages` للرسائل
- جدول `notifications` للإشعارات
- Triggers تلقائية لإنشاء الإشعارات عند:
  - إنشاء عرض جديد
  - قبول عرض
  - استلام رسالة جديدة
- Row Level Security (RLS) policies

### 2. التأكد من وجود جداول Profiles

تأكد من وجود جدول `profiles` مع الأعمدة التالية:
- `id` (UUID, primary key)
- `display_name` (TEXT)
- `avatar_url` (TEXT)

### 3. التأكد من وجود جداول Requests و Offers

تأكد من وجود جداول `requests` و `offers` مع الأعمدة التالية:
- `id` (UUID, primary key)
- `user_id` / `provider_id` (UUID, foreign key to auth.users)

### 4. تفعيل Realtime

في Supabase Dashboard:
1. اذهب إلى Database > Replication
2. فعّل Realtime لـ:
   - `conversations`
   - `messages`
   - `notifications`

### 5. اختبار النظام

بعد تطبيق الـ schema:
1. قم بإنشاء طلب جديد
2. قم بإنشاء عرض على الطلب
3. تحقق من إنشاء إشعار تلقائي
4. افتح صفحة الرسائل وابدأ محادثة

## الميزات المتاحة

### الرسائل
- ✅ إنشاء محادثات بين المستخدمين
- ✅ إرسال واستقبال الرسائل
- ✅ تحديثات فورية (Realtime)
- ✅ عداد الرسائل غير المقروءة
- ✅ ربط المحادثات بالطلبات والعروض

### الإشعارات
- ✅ إشعارات تلقائية عند:
  - إنشاء عرض جديد
  - قبول عرض
  - استلام رسالة
- ✅ تحديثات فورية (Realtime)
- ✅ عداد الإشعارات غير المقروءة
- ✅ ربط الإشعارات بالطلبات والعروض

## ملاحظات

- الإشعارات يتم إنشاؤها تلقائياً عبر Database Triggers
- الرسائل محمية بـ Row Level Security (RLS)
- جميع البيانات محمية ومشفرة

