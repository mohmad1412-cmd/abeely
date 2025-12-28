# دليل الإعداد الكامل - خطوة بخطوة

## 📋 نظرة عامة

هذا الدليل يشرح بالتفصيل كيفية إعداد نظام المصادقة من الصفر.

---

## 🚀 الخطوة 1: تنفيذ ملفات SQL في Supabase

### أ) إذا كنت تستخدم Supabase Cloud (السحابة)

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com/)
2. اختر مشروعك
3. اذهب إلى **SQL Editor** من القائمة الجانبية
4. افتح ملف `AUTH_SETUP_COMPLETE.sql`
5. انسخ كل المحتوى والصقه في SQL Editor
6. اضغط **Run** أو `Ctrl+Enter`
7. تأكد من ظهور رسالة نجاح ✅

### ب) إذا كنت تستخدم Supabase Local

```bash
# في terminal
cd supabase
supabase db reset  # إذا كنت تريد إعادة تعيين قاعدة البيانات
# أو
psql -h localhost -p 54322 -U postgres -d postgres -f AUTH_SETUP_COMPLETE.sql
```

### ج) التحقق من التنفيذ

في SQL Editor، شغّل:

```sql
-- التحقق من الجداول
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'verified_guests');

-- التحقق من Triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%auth_user%';

-- التحقق من Functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'create_profile_for_user', 'verify_guest_phone');
```

يجب أن ترى الجداول والـ triggers والـ functions موجودة.

---

## 🔐 الخطوة 2: إعداد Google OAuth

### ما تحتاجه:
- حساب Google (Gmail)
- Google Cloud Console access

### خطوات الإعداد:

1. **اذهب إلى Google Cloud Console**
   - https://console.cloud.google.com/

2. **أنشئ مشروع جديد أو اختر موجود**
   - اضغط على قائمة المشاريع في الأعلى
   - اختر "New Project" أو مشروع موجود

3. **فعّل Google+ API**
   - من القائمة الجانبية: **APIs & Services > Library**
   - ابحث عن "Google+ API" أو "Google Identity"
   - اضغط **Enable**

4. **أنشئ OAuth Credentials**
   - اذهب إلى **APIs & Services > Credentials**
   - اضغط **+ CREATE CREDENTIALS > OAuth client ID**
   - إذا طلب منك، أكمل OAuth consent screen

5. **إعداد OAuth Consent Screen**
   - **User Type**: اختر "External" (للعامة)
   - **App name**: اكتب اسم التطبيق (مثلاً: "أبيلي")
   - **User support email**: بريدك الإلكتروني
   - **Developer contact**: بريدك الإلكتروني
   - احفظ

6. **إنشاء OAuth Client ID**
   - **Application type**: Web application
   - **Name**: أي اسم (مثلاً: "Abeely Web")
   - **Authorized redirect URIs**: أضف:
     ```
     http://127.0.0.1:54321/auth/v1/callback
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
     (استبدل `YOUR_PROJECT_REF` بـ project reference من Supabase Dashboard)
   - اضغط **Create**
   - **انسخ `Client ID` و `Client Secret`** (احفظهم في مكان آمن!)

7. **إضافة في Supabase Dashboard**
   - اذهب إلى Supabase Dashboard > **Project Settings > Auth**
   - ابحث عن **Google** في قائمة Providers
   - فعّل **Enable Google provider**
   - الصق `Client ID` في **Client ID (for OAuth)**
   - الصق `Client Secret` في **Client Secret (for OAuth)**
   - احفظ

### ✅ التحقق:
- جرب تسجيل الدخول بـ Google في التطبيق
- يجب أن يعمل!

---

## 🍎 الخطوة 3: إعداد Apple OAuth

### ما تحتاجه:
- حساب Apple Developer (مدفوع - $99/سنة)
- أو يمكنك تخطي هذا إذا لم تكن بحاجة إليه الآن

### خطوات الإعداد (اختياري):

1. **اذهب إلى Apple Developer Portal**
   - https://developer.apple.com/account/

2. **أنشئ App ID**
   - **Certificates, Identifiers & Profiles > Identifiers**
   - اضغط **+** جديد
   - اختر **Services IDs**
   - **Description**: أي وصف
   - **Identifier**: com.yourcompany.abeely (مثال)
   - احفظ

3. **فعّل Sign in with Apple**
   - افتح الـ Services ID الذي أنشأته
   - فعّل **Sign in with Apple**
   - اضغط **Configure**
   - **Primary App ID**: اختر App ID الرئيسي
   - **Website URLs**: أضف:
     ```
     https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
     ```
   - **Return URLs**: نفس الرابط
   - احفظ

4. **أنشئ Key**
   - **Keys > +** جديد
   - **Key Name**: أي اسم
   - فعّل **Sign in with Apple**
   - اضغط **Configure**
   - اختر **Primary App ID**
   - احفظ
   - **انسخ `Key ID`** (مهم!)
   - **حمّل `.p8` file** (سيظهر مرة واحدة فقط!)

5. **إضافة في Supabase**
   - في Supabase Dashboard > **Auth > Providers > Apple**
   - فعّل **Enable Apple provider**
   - **Services ID**: الـ identifier الذي أنشأته
   - **Team ID**: من Apple Developer account (في الأعلى)
   - **Key ID**: من الخطوة السابقة
   - **Private Key**: افتح ملف `.p8` وانسخ المحتوى كاملاً
   - احفظ

### ⚠️ ملاحظة:
Apple OAuth معقد ويتطلب Apple Developer account مدفوع. يمكنك تخطيه الآن والتركيز على Google و SMS.

---

## 📱 الخطوة 4: إعداد SMS (Twilio) - اختياري

### ما تحتاجه:
- حساب Twilio (مجاني للاختبار)

### خطوات الإعداد:

1. **سجّل في Twilio**
   - https://www.twilio.com/try-twilio
   - سجّل بحساب مجاني (يأتي برصيد تجريبي)

2. **احصل على Credentials**
   - من Dashboard: **Account > API Keys & Tokens**
   - **Account SID**: موجود في الصفحة الرئيسية
   - **Auth Token**: اضغط "View" لرؤيته

3. **أنشئ Messaging Service** (موصى به)
   - من Dashboard: **Messaging > Services**
   - اضغط **Create Messaging Service**
   - أي اسم
   - احفظ
   - **انسخ `Service SID`**

4. **إضافة في Supabase**
   - في Supabase Dashboard > **Project Settings > Auth**
   - ابحث عن **SMS Settings**
   - فعّل **Enable SMS provider**
   - **Twilio Account SID**: الصق Account SID
   - **Twilio Auth Token**: الصق Auth Token
   - **Twilio Messaging Service SID**: الصق Service SID
   - احفظ

### ⚠️ ملاحظة:
- في التطوير المحلي، يمكنك استخدام **test OTP** بدون Twilio
- في `config.toml` يمكنك إضافة:
  ```toml
  [auth.sms.test_otp]
  "+966501234567" = "123456"  # رقم تجريبي
  ```

---

## 🔧 الخطوة 5: إعداد Environment Variables

### في Supabase Dashboard:

1. اذهب إلى **Project Settings > Environment Variables**
2. أضف المتغيرات التالية (إذا لم تكن موجودة):

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your_google_client_id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your_google_client_secret
SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID=your_apple_client_id (اختياري)
SUPABASE_AUTH_EXTERNAL_APPLE_SECRET=your_apple_private_key (اختياري)
SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN=your_twilio_auth_token (اختياري)
```

### في المشروع المحلي (.env.local):

تأكد من وجود:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

(يمكنك الحصول عليهم من Supabase Dashboard > **Project Settings > API**)

---

## ✅ الخطوة 6: الاختبار

### 1. اختبار Profiles Table

```sql
-- في SQL Editor
SELECT * FROM profiles LIMIT 1;
```

### 2. اختبار Trigger

- سجّل مستخدم جديد (برقم جوال أو email)
- تحقق من إنشاء profile تلقائياً:
```sql
SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1;
```

### 3. اختبار Guest Verification

- في التطبيق، جرب وضع الضيف
- أدخل رقم جوال
- يجب أن تحصل على رمز تحقق (في console.log للتطوير)

### 4. اختبار Google OAuth

- اضغط "الدخول بـ Google"
- يجب أن يفتح نافذة Google
- بعد الموافقة، يجب أن تعود للتطبيق مسجل دخول

### 5. اختبار SMS (إذا أضفت Twilio)

- أدخل رقم جوال صحيح
- يجب أن تصلك رسالة SMS برمز التحقق

---

## 🐛 حل المشاكل الشائعة

### المشكلة: "Profile not found"
**الحل**: تأكد من أن Trigger يعمل:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### المشكلة: "Google OAuth not working"
**الحل**: 
- تأكد من إضافة redirect URI الصحيح
- تأكد من تفعيل Google provider في Supabase
- تحقق من Client ID و Secret

### المشكلة: "SMS not sending"
**الحل**:
- في التطوير، استخدم test OTP في config.toml
- في الإنتاج، تأكد من إضافة Twilio credentials
- تحقق من رصيد Twilio

### المشكلة: "RLS policy blocking"
**الحل**: تأكد من تنفيذ `AUTH_RLS_POLICIES.sql`:
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

## 📝 Checklist سريع

- [ ] تم تنفيذ `AUTH_SETUP_COMPLETE.sql` بنجاح
- [ ] الجداول `profiles` و `verified_guests` موجودة
- [ ] Triggers تعمل (تم اختبارها)
- [ ] RLS Policies مفعلة
- [ ] Google OAuth مُعد (اختياري)
- [ ] Apple OAuth مُعد (اختياري)
- [ ] Twilio SMS مُعد (اختياري)
- [ ] Environment variables موجودة
- [ ] تم اختبار تسجيل الدخول برقم الجوال
- [ ] تم اختبار تسجيل الدخول بالبريد الإلكتروني
- [ ] تم اختبار Google OAuth (إذا أضفته)
- [ ] تم اختبار وضع الضيف

---

## 🎉 مبروك!

إذا أكملت كل الخطوات، نظام المصادقة جاهز للاستخدام!

للأسئلة أو المشاكل، راجع:
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
- ملف `AUTH_SETUP_README.md` للمزيد من التفاصيل

