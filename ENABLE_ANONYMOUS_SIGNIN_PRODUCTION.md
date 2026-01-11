# 🔧 تفعيل Anonymous Sign-In في Supabase Production

## المشكلة
الرقم `555111111` لا يعمل رغم أنه يبدأ بـ 555. الخطأ يقول أن anonymous sign-in غير مفعل.

## الحل

### في Supabase Dashboard:

1. اذهب إلى: https://app.supabase.com/project/gfjtyfwwbpjbwafbnfcc
2. Authentication → Settings
3. ابحث عن **"Enable anonymous sign-ins"**
4. فعّله (Enable)
5. حفظ

---

## أو: إضافة الرقم في Test OTP

### في Supabase Dashboard:

1. Authentication → Settings → Phone Auth
2. ابحث عن **"Test OTP"** أو **"Test Phone Numbers"**
3. أضف الرقم: `966555111111` → رمز: `0000`
4. حفظ

---

## ملاحظة

- **Local Supabase**: anonymous sign-in مفعل في `config.toml` ✅
- **Production**: يجب تفعيله في Dashboard

---

## بعد التفعيل

1. ✅ فعّل anonymous sign-in في Dashboard
2. ✅ جرب تسجيل الدخول برقم: `555111111`
3. ✅ استخدم الرمز: `0000`
4. ✅ يجب أن يعمل الآن!

---

## الحل الأفضل

**فعّل anonymous sign-in** - هذا يسمح لأي رقم يبدأ بـ 555 بالعمل تلقائياً بدون إضافة كل رقم في test_otp.
