# دليل بناء APK والتحديث المباشر

## 📱 بناء APK للتطبيق

### المتطلبات:
1. **Android Studio** مثبت
2. **Java JDK 17** أو أحدث
3. **Node.js** و **npm** مثبتين

### خطوات البناء:

#### 1. بناء المشروع (Build Web Assets)
```bash
npm run build
```

#### 2. نسخ الملفات إلى Android
```bash
npx cap sync android
```

#### 3. بناء APK من Android Studio:
- افتح Android Studio
- افتح المجلد `android/`
- انتظر حتى يكتمل Gradle Sync
- اذهب إلى: **Build > Build Bundle(s) / APK(s) > Build APK(s)**
- بعد الانتهاء، ستجد APK في: `android/app/build/outputs/apk/debug/app-debug.apk`

#### 4. أو بناء APK من Terminal:
```bash
cd android
./gradlew assembleDebug
```

الـ APK سيكون في: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔄 التحديث المباشر (Live Updates)

### الطريقة 1: Capacitor Live Reload (للتطوير)

هذه الطريقة تسمح لك بتحديث التطبيق مباشرة أثناء التطوير:

#### 1. تأكد أن التطبيق يعمل على نفس الشبكة:
```bash
# شغّل السيرفر على IP جهازك
npm run dev
```

#### 2. عدّل `capacitor.config.ts`:
```typescript
const config: CapacitorConfig = {
  appId: 'com.servicelink.app',
  appName: 'ServiceLink',
  webDir: 'dist',
  server: {
    url: 'http://YOUR_IP:3005', // استبدل YOUR_IP بـ IP جهازك
    cleartext: true,
  },
};
```

#### 3. شغّل التطبيق على الجوال:
```bash
npx cap run android
```

الآن أي تغيير في الكود سيظهر مباشرة على الجوال!

---

### الطريقة 2: Capacitor App Updates (للتحديثات في الإنتاج)

هذه الطريقة تسمح بتحديث التطبيق بدون إعادة تثبيت APK.

#### 1. تثبيت Capacitor App Updates:
```bash
npm install @capacitor/app-updates
npx cap sync android
```

#### 2. إعداد Backend لتخزين التحديثات:

أنشئ سيرفر بسيط (أو استخدم Supabase Storage) لتخزين ملفات التحديث.

#### 3. إضافة كود التحديث في `App.tsx`:

```typescript
import { AppUpdates } from '@capacitor/app-updates';

// في useEffect
useEffect(() => {
  checkForUpdates();
}, []);

const checkForUpdates = async () => {
  try {
    const result = await AppUpdates.checkForUpdate();
    if (result.available) {
      // يوجد تحديث متاح
      await AppUpdates.downloadUpdate();
      await AppUpdates.reload();
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
  }
};
```

---

## 🚀 طريقة سريعة: بناء APK مع Script

أضف هذا الـ script في `package.json`:

```json
{
  "scripts": {
    "build:android": "npm run build && npx cap sync android",
    "apk:debug": "npm run build:android && cd android && ./gradlew assembleDebug",
    "apk:release": "npm run build:android && cd android && ./gradlew assembleRelease"
  }
}
```

ثم استخدم:
```bash
npm run apk:debug    # لبناء APK للتطوير
npm run apk:release  # لبناء APK للإنتاج
```

---

## 📝 ملاحظات مهمة:

1. **للتحديث المباشر في الإنتاج**: تحتاج لسيرفر لتخزين ملفات التحديث
2. **Live Reload**: يعمل فقط على نفس الشبكة (WiFi)
3. **APK Release**: يحتاج توقيع (Signing) للتوزيع على Google Play

---

## 🔐 توقيع APK للإنتاج:

1. أنشئ keystore:
```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

2. أضف في `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('path/to/my-release-key.jks')
            storePassword 'your-password'
            keyAlias 'my-key-alias'
            keyPassword 'your-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

---

## 🎯 الخطوات السريعة للبدء:

```bash
# 1. بناء المشروع
npm run build

# 2. نسخ للمشروع Android
npx cap sync android

# 3. بناء APK
cd android
./gradlew assembleDebug

# 4. APK جاهز في:
# android/app/build/outputs/apk/debug/app-debug.apk
```

