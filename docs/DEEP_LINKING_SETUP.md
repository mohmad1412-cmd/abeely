# إعداد Deep Linking و App Links

## ✅ ما تم إضافته:

### 1. **إصلاح Magic Link**
- تم تحديث `authService.ts` لاستخدام رابط Vercel الصحيح
- Magic Link يعمل الآن بشكل صحيح

### 2. **Deep Linking Service**
- تم إنشاء `routingService.ts` للتعامل مع الروابط
- دعم روابط: `/request/:id`, `/marketplace`, `/create`, إلخ

### 3. **App Links في Capacitor**
- تم تثبيت `@capacitor/app`
- تم تحديث `capacitor.config.ts`

---

## 📋 الخطوات المتبقية:

### 1. إعداد Android App Links

#### أ) إنشاء ملف `assetlinks.json`:

في موقع Vercel، أنشئ ملف:
```
/.well-known/assetlinks.json
```

المحتوى:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.servicelink.app",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

**للحصول على SHA256 Fingerprint:**
```bash
cd android
./gradlew signingReport
# أو
keytool -list -v -keystore app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### ب) إضافة Intent Filter في AndroidManifest.xml:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" 
          android:host="copy-of-copy-of-servicelink-ai-platform-r1q77wvmr.vercel.app" />
</intent-filter>
```

---

### 2. إعداد iOS Universal Links

#### أ) إنشاء ملف `apple-app-site-association`:

في موقع Vercel، أنشئ ملف:
```
/.well-known/apple-app-site-association
```

المحتوى:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.servicelink.app",
        "paths": [
          "/request/*",
          "/marketplace",
          "/create",
          "/profile/*",
          "/messages",
          "/settings"
        ]
      }
    ]
  }
}
```

**استبدل `TEAM_ID` بـ Team ID الخاص بك من Apple Developer**

#### ب) إضافة Associated Domains في Xcode:

1. افتح المشروع في Xcode
2. اذهب إلى **Signing & Capabilities**
3. أضف **Associated Domains**
4. أضف: `applinks:copy-of-copy-of-servicelink-ai-platform-r1q77wvmr.vercel.app`

---

### 3. إضافة ملفات في Vercel

أنشئ مجلد `public/.well-known/` وأضف الملفات:

```
public/
  .well-known/
    assetlinks.json
    apple-app-site-association
```

---

## 🧪 اختبار Deep Links:

### في المتصفح:
```
https://copy-of-copy-of-servicelink-ai-platform-r1q77wvmr.vercel.app/request/REQUEST_ID
```

### في التطبيق:
```
abeely://request/REQUEST_ID
```

---

## 📱 استخدام الروابط:

### مشاركة طلب:
```typescript
import { getRequestShareUrl, copyShareUrl } from './services/routingService';

// الحصول على رابط
const url = getRequestShareUrl(requestId);

// نسخ الرابط
await copyShareUrl('request', { requestId });
```

### فتح رابط:
```typescript
import { navigateTo } from './services/routingService';

// الانتقال لصفحة طلب
navigateTo('request', { requestId: '123' }, setView);
```

---

## ✅ الميزات المتاحة:

- ✅ روابط مشاركة للطلبات
- ✅ فتح الروابط في التطبيق
- ✅ معالجة الروابط عند فتح التطبيق
- ✅ تحديث URL عند التنقل
- ✅ دعم Android App Links
- ✅ دعم iOS Universal Links

---

## 🔧 استكشاف الأخطاء:

1. **الرابط لا يفتح التطبيق:**
   - تحقق من `assetlinks.json` و `apple-app-site-association`
   - تأكد من SHA256 Fingerprint صحيح
   - تأكد من Team ID صحيح

2. **Magic Link لا يعمل:**
   - تحقق من Redirect URLs في Supabase Dashboard
   - تأكد من استخدام رابط Vercel الصحيح

3. **الروابط لا تعمل في المتصفح:**
   - افتح Console (F12) وابحث عن أخطاء
   - تأكد من أن `routingService` مستورد بشكل صحيح

