# 🔍 الحصول على User ID من Console

## الطريقة 1: من Console مباشرة

افتح Console (F12) وانسخ والصق:

```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log("User ID:", user?.id);
console.log("User Email:", user?.email);
```

**انسخ `User ID` الذي يظهر في Console.**

---

## الطريقة 2: استخدام SQL التلقائي (أسهل!)

**لا حاجة للحصول على User ID يدوياً!**

1. اذهب إلى Supabase Dashboard → SQL Editor
2. انسخ محتوى `TEST_REQUEST_INSERT_AUTO.sql`
3. شغّل SQL مباشرة (لا حاجة لاستبدال أي شيء)

**هذا الملف يستخدم `auth.uid()` تلقائياً!**

---

## الطريقة 3: من Supabase Dashboard

1. اذهب إلى: Authentication → Users
2. ابحث عن المستخدم الحالي
3. انسخ `UUID` من العمود الأول

---

## بعد الحصول على User ID

### إذا أردت استخدام `TEST_REQUEST_INSERT.sql`:
1. افتح `TEST_REQUEST_INSERT.sql`
2. استبدل `'YOUR_USER_ID'` بـ `'PASTE_USER_ID_HERE'`
3. شغّل SQL

### أو استخدم `TEST_REQUEST_INSERT_AUTO.sql` (أسهل):
- لا حاجة لاستبدال أي شيء!
- يعمل مباشرة مع `auth.uid()`
