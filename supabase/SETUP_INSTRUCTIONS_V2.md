# تعليمات إعداد نظام Conversations (متوافق مع الـ Schema الموجود)

## الخطوات بالترتيب:

### 1️⃣ الخطوة الأولى: إضافة Conversations Table
شغّل: **`MIGRATE_TO_CONVERSATIONS.sql`**
- ينشئ `conversations` table
- يضيف `conversation_id` column إلى `messages` table (إذا لم يكن موجوداً)
- يضيف `related_message_id` و `read_at` إلى `notifications` table (إذا لم تكون موجودة)
- ينشئ الـ indexes المطلوبة

### 2️⃣ الخطوة الثانية: إنشاء Functions و Triggers
شغّل: **`CREATE_FUNCTIONS_AND_TRIGGERS_V2.sql`**
- يحذف الـ functions القديمة (بجميع الـ signatures)
- ينشئ الـ functions الجديدة (متوافقة مع النظام القديم والجديد)
- ينشئ الـ triggers

### 3️⃣ الخطوة الثالثة: إنشاء RLS Policies
شغّل: **`CREATE_RLS_POLICIES_V2.sql`**
- يفعل RLS على الجداول
- ينشئ الـ policies (متوافقة مع النظام القديم والجديد)

## ملاحظات مهمة:

✅ **متوافق مع النظام القديم**: 
- الرسائل القديمة (بدون `conversation_id`) ستعمل بشكل طبيعي
- الرسائل الجديدة (مع `conversation_id`) ستعمل مع نظام المحادثات

✅ **آمن**: 
- لا يحذف بيانات موجودة
- يضيف columns فقط إذا لم تكن موجودة

✅ **تدريجي**: 
- يمكن استخدام النظام القديم والجديد معاً
- يمكن نقل الرسائل القديمة تدريجياً إلى conversations

## تفعيل Realtime:

بعد إنشاء الجداول:
1. اذهب إلى Supabase Dashboard > Database > Replication
2. فعّل Realtime لـ:
   - `conversations`
   - `messages`
   - `notifications`

## التحقق من النجاح:

```sql
-- تحقق من وجود conversations table
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'conversations';

-- تحقق من وجود conversation_id في messages
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'messages' 
AND column_name = 'conversation_id';

-- تحقق من وجود functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_unread_notifications_count', 'notify_on_new_message');
```

