# إعداد حفظ محادثات الذكاء الاصطناعي في Supabase

## الخطوات:

### 1. إنشاء الجداول في Supabase

شغّل ملف SQL التالي في Supabase Dashboard:

**SQL Editor** → **New Query** → انسخ محتوى `CHAT_CONVERSATIONS_SCHEMA.sql`

أو استخدم Supabase CLI:

```bash
supabase db push
```

### 2. التحقق من الجداول

اذهب إلى **Table Editor** في Supabase Dashboard وتأكد من وجود:
- `ai_conversations` - جدول المحادثات
- `ai_conversation_messages` - جدول الرسائل

### 3. التحقق من RLS Policies

تأكد من أن Row Level Security مفعل وأن السياسات موجودة:
- Users can view their own conversations
- Users can create their own conversations
- Users can update their own conversations
- Users can delete their own conversations
- Users can view messages of their conversations
- Users can insert messages to their conversations
- Users can update messages of their conversations
- Users can delete messages of their conversations

### 4. الميزات المتاحة

✅ **للمستخدمين المسجلين:**
- المحادثات تُحفظ تلقائياً في Supabase
- تعمل عبر جميع الأجهزة
- لا تُفقد حتى لو مسح بيانات المتصفح
- يمكن الوصول للمحادثات السابقة

✅ **للضيوف:**
- المحادثات تُحفظ في localStorage فقط
- تعمل على نفس الجهاز فقط

### 5. كيفية الاستخدام

الكود يعمل تلقائياً! عند:
- **إرسال رسالة**: تُحفظ تلقائياً في Supabase (للمستخدمين المسجلين)
- **فتح التطبيق**: يتم تحميل المحادثة السابقة تلقائياً
- **نشر الطلب**: يتم إيقاف المحادثة وربطها بالطلب

### 6. استكشاف الأخطاء

إذا لم تعمل المحادثات:

1. تحقق من وجود الجداول في Supabase
2. تحقق من RLS Policies
3. افتح Console في المتصفح (F12) وابحث عن أخطاء
4. تأكد من أن المستخدم مسجل دخول (ليس ضيف)

