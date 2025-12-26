# إصلاح خطأ Schema - conversation_id

## المشكلة
خطأ: `ERROR: 42703: column "conversation_id" does not exist`

## الحل

### الخطوة 1: تشغيل الملف المحدث
استخدم ملف `messages_and_notifications_schema_fixed.sql` بدلاً من `messages_and_notifications_schema.sql`

هذا الملف يحتوي على:
- ✅ Drop للـ triggers والـ functions القديمة أولاً
- ✅ Drop للـ policies القديمة قبل إنشاء جديدة
- ✅ ترتيب صحيح للإنشاء

### الخطوة 2: في Supabase SQL Editor

1. افتح Supabase Dashboard
2. اذهب إلى SQL Editor
3. انسخ محتوى `messages_and_notifications_schema_fixed.sql`
4. قم بتشغيله

### الخطوة 3: التحقق

بعد التشغيل، تحقق من:
- ✅ جدول `conversations` موجود
- ✅ جدول `messages` موجود
- ✅ جدول `notifications` موجود
- ✅ جميع الـ triggers تعمل
- ✅ جميع الـ policies موجودة

### ملاحظات

- الملف الجديد يزيل الـ triggers والـ functions القديمة أولاً لتجنب التعارضات
- إذا كان لديك بيانات موجودة، سيتم الحفاظ عليها
- إذا واجهت أي مشاكل، قم بحذف الجداول يدوياً ثم شغّل الملف مرة أخرى

