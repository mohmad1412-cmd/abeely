# إضافة Firebase Service Account للإشعارات ⚡

دليل خطوة بخطوة لإعداد Firebase للإشعارات السريعة.

---

## 📋 المتطلبات

1. حساب Firebase (مجاني)
2. مشروع Firebase موجود (أو إنشاء جديد)
3. Supabase Dashboard مفتوح

---

## ⚠️ مهم: لا تخلط بينهما!

هناك **شيئان مختلفان** في Firebase:

### ✅ Firebase Service Account (هذا ما نحتاجه!)
- لإرسال إشعارات من Server
- **من**: Project settings → **Service accounts**
- **أضفه في**: Supabase Edge Functions Secrets

### ❌ Web Push Certificates / VAPID Keys (هذا مختلف!)
- لإشعارات الويب فقط (Browser)
- **من**: Project settings → **Web configuration** → Web Push certificates
- **لا تحتاجه** إلا إذا كان لديك تطبيق ويب في المتصفح

**📖 للتفاصيل**: راجع `docs/FIREBASE_WEB_PUSH_VS_SERVICE_ACCOUNT.md`

---

## 🚀 الخطوات (5 دقائق فقط)

### الخطوة 1: الحصول على Firebase Service Account JSON

⚠️ **تأكد**: أنت في **"Service accounts"** وليس **"Web Push certificates"**

1. **افتح Firebase Console:**
   - اذهب إلى: https://console.firebase.google.com/
   - اختر مشروعك (أو أنشئ مشروع جديد)

2. **افتح إعدادات المشروع:**
   - اضغط على ⚙️ (Settings) → **Project settings**

3. **انتقل إلى Service Accounts:**
   - في الأعلى اضغط على تبويب **"Service accounts"** ⚠️ (ليس "Web configuration")
   - يجب أن ترى قسم "Firebase Admin SDK"

4. **أنشئ Service Account جديد:**
   - ستجد زر **"Generate new private key"**
   - اضغط عليه
   - ستظهر نافذة تحذير → اضغط **"Generate key"**
   - سيتم تحميل ملف JSON تلقائياً

5. **احفظ الملف:**
   - الملف سيحتوي اسم مثل: `your-project-firebase-adminsdk-xxxxx.json`
   - احفظه في مكان آمن (مثل: `~/firebase-service-account.json`)

---

### الخطوة 2: فتح الملف ونسخ المحتوى

1. **افتح الملف الذي تم تحميله** (بأي محرر نصوص)
2. **انسخ كل المحتوى** (Ctrl+A ثم Ctrl+C)
3. **المحتوى سيبدو هكذا:**
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
     "client_id": "...",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     ...
   }
   ```

⚠️ **مهم**: انسخ **كل** المحتوى من `{` إلى `}` (بما فيه السطور وعلامات التنصيص)

---

### الخطوة 3: إضافة Secret في Supabase Dashboard

1. **افتح Supabase Dashboard:**
   - اذهب إلى: https://supabase.com/dashboard
   - اختر المشروع الجديد

2. **انتقل إلى Edge Functions:**
   - من القائمة الجانبية: **Edge Functions**

3. **افتح Function `send-push-notification-fast`:**
   - اضغط على اسم Function
   - أو إذا لم يكن موجوداً، أنشئه أولاً (راجع `docs/MIGRATE_EDGE_FUNCTIONS.md`)

4. **افتح Settings:**
   - اضغط على تبويب **"Settings"** في الأعلى

5. **أضف Secret جديد:**
   - ابحث عن قسم **"Secrets"** أو **"Environment Variables"**
   - اضغط **"Add secret"** أو **"New secret"**

6. **أدخل المعلومات:**
   - **Name**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: الصق كل محتوى ملف JSON هنا (الخطوة 2)

7. **احفظ:**
   - اضغط **"Save"** أو **"Add"**

✅ **تم!** Secret تم إضافته بنجاح.

---

### الخطوة 4: التحقق من Secrets المطلوبة الأخرى

تأكد من وجود هذه Secrets أيضاً في Function `send-push-notification-fast`:

| Secret Name | من أين أحصل عليه؟ |
|------------|------------------|
| `FIREBASE_SERVICE_ACCOUNT` | ✅ تم إضافته الآن |
| `SUPABASE_URL` | Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → service_role key (⚠️ احذره: سري جداً!) |

**كيفية إضافة `SUPABASE_URL`:**
1. Dashboard → Settings → API
2. انسخ **Project URL** (مثل: `https://xxxxx.supabase.co`)
3. أضفه كـ Secret باسم `SUPABASE_URL`

**كيفية إضافة `SUPABASE_SERVICE_ROLE_KEY`:**
1. Dashboard → Settings → API
2. في قسم **Project API keys**
3. انسخ **service_role key** (⚠️ **مهم جداً**: لا تشارك هذا المفتاح أبداً!)
4. أضفه كـ Secret باسم `SUPABASE_SERVICE_ROLE_KEY`

---

### الخطوة 5: التحقق من العمل

1. **تحقق من Function:**
   - Dashboard → Edge Functions → `send-push-notification-fast`
   - تأكد من وجود جميع Secrets ✅

2. **اختبر Function (اختياري):**
   - يمكنك استخدام **Invoke function** لاختبار
   - أو انتظر حتى يتم إرسال إشعار فعلي

---

## ⚠️ ملاحظات أمان مهمة

1. **لا تشارك ملف Service Account JSON:**
   - لا تضعه في Git
   - لا ترسله عبر Email أو Chat
   - فقط في Supabase Secrets ✅

2. **حذف الملف المحلي:**
   - بعد إضافة Secret بنجاح، احذف ملف JSON من جهازك
   - أو احفظه في مكان آمن جداً

3. **Service Role Key:**
   - لا تستخدمه في Frontend أبداً
   - فقط في Edge Functions أو Backend

---

## 🔍 حل المشاكل

### المشكلة: "FIREBASE_SERVICE_ACCOUNT not configured"

**السبب**: Secret غير موجود أو اسمه خاطئ

**الحل:**
1. تأكد من اسم Secret هو بالضبط: `FIREBASE_SERVICE_ACCOUNT` (بدون مسافات)
2. تأكد من نسخ كل محتوى JSON (من `{` إلى `}`)
3. أعد نشر Function بعد إضافة Secret

---

### المشكلة: "Invalid FIREBASE_SERVICE_ACCOUNT"

**السبب**: JSON غير صحيح (مفقود جزء أو فيه أخطاء)

**الحل:**
1. افتح ملف JSON الأصلي
2. تأكد من نسخ **كل** المحتوى
3. تأكد من أن JSON صحيح (استخدم JSON validator إذا لزم)
4. أعد إضافة Secret

---

### المشكلة: الإشعارات لا تصل

**التحقق:**
1. Dashboard → Edge Functions → Logs
   - ابحث عن أخطاء
   - تحقق من أن Function يتم استدعاؤه

2. Firebase Console → Cloud Messaging
   - تحقق من أن FCM مفعّل
   - تحقق من إحصائيات الإرسال

3. تأكد من:
   - ✅ `FIREBASE_SERVICE_ACCOUNT` موجود
   - ✅ `SUPABASE_URL` موجود
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` موجود
   - ✅ FCM tokens موجودة في جدول `fcm_tokens`

---

## 📝 Checklist

- [ ] حصلت على Firebase Service Account JSON
- [ ] أضفت Secret `FIREBASE_SERVICE_ACCOUNT` في Supabase
- [ ] أضفت Secret `SUPABASE_URL`
- [ ] أضفت Secret `SUPABASE_SERVICE_ROLE_KEY`
- [ ] تحققت من أن جميع Secrets موجودة
- [ ] حذفت ملف JSON من جهازي (أو حفظته في مكان آمن)
- [ ] اختبرت Function (اختياري)

---

## 🎯 الخلاصة

**الخطوات السريعة:**
1. Firebase Console → Project settings → Service accounts → Generate new private key
2. انسخ محتوى JSON
3. Supabase Dashboard → Edge Functions → Function → Settings → Secrets → Add `FIREBASE_SERVICE_ACCOUNT`
4. أضف `SUPABASE_URL` و `SUPABASE_SERVICE_ROLE_KEY` إذا لم تكونا موجودتين
5. ✅ تم!

**الوقت المتوقع: 5 دقائق** ⚡

---

**تم إنشاء هذا الدليل: 2025-01-26**
