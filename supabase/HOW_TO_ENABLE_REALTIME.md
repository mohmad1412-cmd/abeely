# 🔴 كيفية تفعيل Realtime في Supabase

## الخطوات:

### 1️⃣ اذهب إلى صفحة الجداول:
- من القائمة الجانبية: **Database** > **Tables**
- أو من: **Database** > **Database** > **Tables**

### 2️⃣ اختر الجدول:
- اضغط على جدول `conversations`
- أو `messages`
- أو `notifications`

### 3️⃣ فعّل Realtime:
- في صفحة الجدول، ابحث عن قسم **"Realtime"** أو **"Enable Realtime"**
- أو ابحث عن أيقونة/زر **"Enable Realtime"** أو **"Realtime"**
- فعّله للجداول الثلاثة:
  - ✅ `conversations`
  - ✅ `messages`
  - ✅ `notifications`

## طريقة بديلة (من SQL Editor):

إذا لم تجد الخيار في الواجهة، يمكنك تفعيله من SQL Editor:

```sql
-- تفعيل Realtime للجداول
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

## التحقق من النجاح:

بعد التفعيل، يجب أن ترى:
- ✅ علامة "Realtime enabled" بجانب الجدول
- ✅ أو أيقونة Realtime مفعّلة

## ملاحظة مهمة:

**صفحة "Replication"** التي أنت فيها الآن هي لـ:
- ❌ إرسال البيانات إلى destinations خارجية (مثل BigQuery)
- ❌ إنشاء read replicas

**ليست** لتفعيل Realtime للجداول الداخلية!

---

**الخطوة التالية:** اذهب إلى **Database > Tables** وفعّل Realtime للجداول الثلاثة.

