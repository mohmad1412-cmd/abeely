# 🚀 Quick Re-Login (إعادة تسجيل الدخول السريع)

## الحل السريع (30 ثانية)

### في Console (F12)، انسخ والصق:

```javascript
// 1. سجل خروج
await supabase.auth.signOut();
console.log("✅ Signed out");

// 2. انتظر ثانية
await new Promise(resolve => setTimeout(resolve, 1000));

// 3. سجل دخول برقم اختبار
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+966555555555',
  options: {
    shouldCreateUser: true,
    channel: 'sms'
  }
});

if (error) {
  console.error("❌ Error:", error);
} else {
  console.log("✅ OTP sent! Enter code: 0000");
}
```

### ثم:
1. أدخل الرمز: `0000`
2. اضغط تسجيل الدخول
3. أعد تحميل الصفحة (F5)

✅ **يجب أن يعمل الآن!**
