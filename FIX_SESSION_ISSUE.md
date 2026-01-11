# 🔧 Fix Session Issue - إصلاح مشكلة Session

## المشكلة
أنت مسجل دخول، لكن التطبيق لا يرى Session (`Auth session missing!`).

## الحل السريع

### الخطوة 1: إعادة تسجيل الدخول

افتح Console (F12) وانسخ والصق:

```javascript
// 1. سجل خروج
await supabase.auth.signOut();

// 2. انتظر ثانية
await new Promise(resolve => setTimeout(resolve, 1000));

// 3. سجل دخول مرة أخرى برقم اختبار
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+966555555555',
  options: {
    shouldCreateUser: true,
    channel: 'sms'
  }
});

console.log("OTP sent:", !error);
```

### الخطوة 2: أدخل رمز التحقق

بعد إرسال OTP:
- أدخل الرمز: `0000`
- اضغط تسجيل الدخول

---

## أو: تجديد Session يدوياً

إذا أردت تجديد Session بدون إعادة تسجيل الدخول:

```javascript
// في Console (F12)
const { data, error } = await supabase.auth.refreshSession();

if (error) {
  console.error("❌ Refresh failed:", error);
  // Session منتهية - يجب إعادة تسجيل الدخول
} else {
  console.log("✅ Session refreshed:", data.session?.user?.id);
}
```

---

## الحل الدائم: إعادة تحميل الصفحة

بعد إعادة تسجيل الدخول:
1. اضغط `F5` لإعادة تحميل الصفحة
2. يجب أن يعمل الآن!

---

## إذا استمرت المشكلة

### تحقق من localStorage:

```javascript
// في Console (F12)
const storageKey = 'sb-gfjtyfwwbpjbwafbnfcc-auth-token';
const stored = localStorage.getItem(storageKey);
console.log("Stored session:", stored ? "exists" : "missing");
```

إذا كان `missing`:
- Session غير محفوظة
- يجب إعادة تسجيل الدخول

---

## الخطوات التالية

1. ✅ سجل خروج ثم دخول مرة أخرى
2. ✅ أعد تحميل الصفحة (F5)
3. ✅ جرب إنشاء طلب جديد
