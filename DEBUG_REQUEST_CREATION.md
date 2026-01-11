# 🔍 Debug Request Creation Issue

## المشكلة
فشل إنشاء الطلبات بعد تطبيق RLS Policies.

## خطوات التشخيص

### 1. التحقق من RLS Policies
شغّل هذا SQL في Supabase Dashboard:
```sql
-- انظر: supabase/VERIFY_RLS_APPLIED.sql
```

**النتائج المتوقعة:**
- ✅ `requests.rls_enabled = true`
- ✅ 5 policies على `requests` (SELECT x2, INSERT, UPDATE, DELETE)
- ✅ `profiles.rls_enabled = true`
- ✅ 4 policies على `profiles` (SELECT x2, INSERT, UPDATE)

### 2. فتح Console في المتصفح
1. اضغط `F12` في المتصفح
2. اذهب إلى تبويب **Console**
3. حاول إنشاء طلب جديد
4. ابحث عن:
   - `❌ Supabase Insert Error`
   - `permission`
   - `policy`
   - `RLS`
   - `author_id`

### 3. التحقق من تسجيل الدخول
في Console، شغّل:
```javascript
// التحقق من المستخدم الحالي
const { data: { user } } = await supabase.auth.getUser();
console.log("Current user:", user?.id);

// التحقق من Session
const { data: { session } } = await supabase.auth.getSession();
console.log("Session:", session?.user?.id);
```

**يجب أن يكون `user.id` موجوداً!**

### 4. التحقق من author_id في الطلب
في Console، عند محاولة إنشاء طلب، ابحث عن:
```javascript
// في requestsService.ts - السطر 329
payload.author_id = userId;
```

**يجب أن يكون `author_id` = `auth.uid()`**

### 5. اختبار INSERT مباشرة
في Supabase Dashboard → SQL Editor، شغّل:
```sql
-- استبدل YOUR_USER_ID بـ user.id من Console
SET LOCAL request.jwt.claim.sub = 'YOUR_USER_ID';

-- محاولة INSERT
INSERT INTO requests (
  author_id,
  title,
  description,
  status,
  is_public
) VALUES (
  'YOUR_USER_ID',
  'Test Request',
  'Test Description',
  'active',
  true
) RETURNING id;
```

**إذا فشل هذا، المشكلة في RLS Policies.**

## الحلول المحتملة

### الحل 1: إعادة تطبيق RLS Policies
شغّل `supabase/FIX_ALL_RLS_NOW.sql` مرة أخرى في Supabase Dashboard.

### الحل 2: التحقق من author_id
تأكد من أن `payload.author_id = userId` في `requestsService.ts` (السطر 329).

### الحل 3: التحقق من تسجيل الدخول
تأكد من أن المستخدم مسجل دخول قبل محاولة إنشاء طلب.

### الحل 4: فحص Console Errors
افتح Console (F12) وابحث عن الأخطاء التفصيلية.

## الخطوات التالية
1. ✅ شغّل `VERIFY_RLS_APPLIED.sql`
2. ✅ افتح Console (F12)
3. ✅ حاول إنشاء طلب جديد
4. ✅ انسخ الأخطاء من Console
5. ✅ أرسل النتائج
