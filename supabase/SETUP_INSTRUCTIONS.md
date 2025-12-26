# تعليمات إعداد نظام الرسائل والإشعارات

## الطريقة الموصى بها (خطوة بخطوة)

### الخطوة 1: إنشاء الجداول
شغّل ملف: `CREATE_TABLES_ONLY.sql`
- هذا الملف ينشئ الجداول فقط: `conversations`, `messages`, `notifications`
- إذا ظهر خطأ "relation already exists" - تجاهله (يعني الجداول موجودة)

### الخطوة 2: إنشاء Functions و Triggers
شغّل ملف: `CREATE_FUNCTIONS_AND_TRIGGERS.sql`
- هذا الملف ينشئ الـ functions والـ triggers
- يحذف القديمة أولاً ثم ينشئ جديدة

### الخطوة 3: إنشاء RLS Policies
شغّل ملف: `CREATE_RLS_POLICIES.sql`
- هذا الملف يفعل RLS وينشئ الـ policies

## أو: طريقة واحدة (إذا لم تكن الجداول موجودة)

شغّل ملف: `COMPLETE_SCHEMA.sql` مرة واحدة فقط

## تفعيل Realtime

بعد إنشاء الجداول:
1. اذهب إلى Supabase Dashboard > Database > Replication
2. فعّل Realtime لـ:
   - `conversations`
   - `messages`
   - `notifications`

## التحقق من النجاح

بعد التشغيل، تحقق من:
```sql
-- تحقق من وجود الجداول
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'notifications');

-- تحقق من وجود Functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%notification%' OR routine_name LIKE '%conversation%';
```

## حل المشاكل

### خطأ: "relation does not exist"
- شغّل `CREATE_TABLES_ONLY.sql` أولاً

### خطأ: "column does not exist"
- تأكد من أنك تستخدم `author_id` للـ requests و `provider_id` للـ offers

### خطأ: "function already exists"
- شغّل `CREATE_FUNCTIONS_AND_TRIGGERS.sql` (سيحذف القديمة أولاً)

