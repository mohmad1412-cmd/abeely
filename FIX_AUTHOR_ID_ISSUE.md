# 🔧 Fix Author ID Issue

## المشكلة
`onPublish` يرجع `null`، مما يعني أن `createRequestFromChat` فشل في إنشاء الطلب.

## الأسباب المحتملة

### 1. المستخدم غير مسجل دخول
**التحقق:**
```javascript
// في Console (F12)
const { data: { user } } = await supabase.auth.getUser();
console.log("User ID:", user?.id);
```

**إذا كان `user.id = null`:**
- سجل خروج
- سجل دخول مرة أخرى
- حاول إنشاء طلب جديد

### 2. author_id لا يتم تعيينه بشكل صحيح
**التحقق:**
في Console، عند محاولة إنشاء طلب، ابحث عن:
```
Attempting to insert request:
  authorId: "present" or "missing"
```

**إذا كان `authorId: "missing"`:**
- المشكلة في `App.tsx` - `currentUserId` غير موجود
- راجع السطر 3182-3218 في `App.tsx`

### 3. RLS Policy يمنع INSERT
**التحقق:**
شغّل `TEST_REQUEST_INSERT.sql` في Supabase Dashboard:
1. احصل على `user.id` من Console
2. استبدل `YOUR_USER_ID` في SQL بـ `user.id`
3. شغّل SQL

**إذا فشل INSERT:**
- المشكلة في RLS Policies
- شغّل `FIX_ALL_RLS_NOW.sql` مرة أخرى

**إذا نجح INSERT:**
- المشكلة في الكود (author_id لا يتم تعيينه)
- راجع `App.tsx` السطر 3399-3403

## الحل السريع

### الخطوة 1: التحقق من User ID
```javascript
// في Console (F12)
const { data: { user } } = await supabase.auth.getUser();
console.log("✅ User ID:", user?.id);
```

### الخطوة 2: إذا كان User ID موجود
افتح Console وابحث عن:
- `❌ Error in createRequestFromChat`
- `❌ Supabase Insert Error`
- `permission` أو `policy` أو `RLS`

### الخطوة 3: أرسل لي
1. User ID من Console (هل موجود أم null؟)
2. جميع الأخطاء الحمراء من Console عند محاولة إنشاء طلب
3. نتائج `TEST_REQUEST_INSERT.sql` (إذا جربته)
