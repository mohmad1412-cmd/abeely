# كيفية ربط رقم الاختبار بحساب حقيقي في Supabase

## المشكلة الحالية

عند استخدام رقم اختبار (مثل 555222222)، النظام يقوم بـ **anonymous sign-in** بدلاً من تسجيل الدخول إلى حسابك الحقيقي. هذا يعني:
- يتم إنشاء anonymous user جديد في كل مرة
- الاهتمامات تُحفظ للـ anonymous user وليس لحسابك الحقيقي
- عند تسجيل الخروج والدخول مرة أخرى، تفقد الاهتمامات

## الحل: ربط رقم الاختبار بحساب حقيقي

### الطريقة 1: استخدام verifyOtp مع test_otp (الأفضل)

تم تحديث الكود لاستخدام `verifyOtp` مباشرة مع `test_otp` من `config.toml`. هذا يسمح للمستخدمين بالدخول إلى حساباتهم الحقيقية المرتبطة برقم الاختبار.

**الخطوات:**

1. **أضف رقم الاختبار إلى `config.toml`**:
   ```toml
   [auth.sms.test_otp]
   966555222222 = "0000"  # رقم الاختبار الرئيسي
   ```

2. **أنشئ حساب حقيقي برقم الاختبار**:
   - سجّل دخول برقم الاختبار (555222222) والرمز (0000)
   - سيتم إنشاء حساب حقيقي مرتبط برقم الاختبار
   - الاهتمامات ستُحفظ لهذا الحساب

3. **في المرات القادمة**:
   - استخدم نفس الرقم (555222222) والرمز (0000)
   - ستدخل إلى حسابك الحقيقي وستجد اهتماماتك محفوظة

### الطريقة 2: ربط anonymous user بحساب حقيقي (يدوي)

إذا كان لديك anonymous user بالفعل وترغب بربطه بحساب حقيقي:

1. **اذهب إلى Supabase Dashboard**:
   - Authentication → Users
   - ابحث عن anonymous user (عادة ما يكون بدون email/phone)

2. **أنشئ حساب جديد برقم الاختبار**:
   - استخدم رقم الاختبار (555222222) والرمز (0000)
   - سيتم إنشاء حساب جديد

3. **انسخ الاهتمامات من anonymous user إلى الحساب الجديد**:
   ```sql
   -- في Supabase SQL Editor
   -- استبدل anonymous_user_id و real_user_id بالقيم الفعلية
   UPDATE profiles 
   SET 
     interested_categories = (SELECT interested_categories FROM profiles WHERE id = 'anonymous_user_id'),
     interested_cities = (SELECT interested_cities FROM profiles WHERE id = 'anonymous_user_id'),
     radar_words = (SELECT radar_words FROM profiles WHERE id = 'anonymous_user_id')
   WHERE id = 'real_user_id';
   ```

### الطريقة 3: استخدام رقم جوال حقيقي (الأفضل للإنتاج)

للإنتاج، استخدم رقم جوال حقيقي بدلاً من رقم الاختبار:
- ستحصل على OTP حقيقي عبر SMS
- الحساب سيكون مرتبط برقمك الحقيقي
- الاهتمامات ستُحفظ بشكل دائم

## التحقق من الربط

بعد تسجيل الدخول، تحقق من:
1. افتح Console في المتصفح
2. ابحث عن: `✅ TEST PHONE: verifyOtp successful - user logged in`
3. تحقق من `isAnonymous: false` (يجب أن يكون false)
4. تحقق من `userId` - يجب أن يكون نفس الـ ID في كل مرة

## ملاحظات مهمة

- **في Local Development**: `test_otp` من `config.toml` يعمل تلقائياً
- **في Production**: يجب إضافة `test_otp` في Supabase Dashboard → Authentication → Settings → SMS → Test OTP
- **Anonymous Sign-in**: تم إزالته كـ fallback للأرقام الاختبارية - الآن يستخدم `verifyOtp` مباشرة

## استكشاف الأخطاء

إذا استمرت المشكلة:

1. **تحقق من config.toml**:
   - تأكد من وجود الرقم في `[auth.sms.test_otp]`
   - تأكد من أن الرقم بصيغة دولية (966555222222)

2. **تحقق من Console Logs**:
   - ابحث عن رسائل `TEST PHONE`
   - تحقق من `verifyOtp` success/failure

3. **تحقق من Supabase Dashboard**:
   - Authentication → Users
   - ابحث عن user برقم الاختبار
   - تحقق من أن `is_anonymous = false`

4. **في Production**:
   - أضف `test_otp` في Supabase Dashboard
   - أو استخدم رقم جوال حقيقي
