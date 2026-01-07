# 🚀 بناء APK السريع

## خطوات سريعة:

### 1️⃣ بناء APK (أسهل طريقة):
```bash
npm run apk:debug
```

الـ APK سيكون في: `android/app/build/outputs/apk/debug/app-debug.apk`

---

### 2️⃣ التحديث المباشر (Live Reload):

#### أ) احصل على IP جهازك:
- **Windows**: `ipconfig` في CMD
- **Mac/Linux**: `ifconfig` أو `ip addr`

#### ب) عدّل `capacitor.config.ts`:
```typescript
const config: CapacitorConfig = {
  appId: 'com.servicelink.app',
  appName: 'ServiceLink',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.XXX:3005', // ضع IP جهازك هنا
    cleartext: true,
  },
};
```

#### ج) شغّل السيرفر:
```bash
npm run dev
```

#### د) شغّل التطبيق على الجوال:
```bash
npm run android:run
```

**الآن أي تغيير في الكود سيظهر مباشرة على الجوال!** 🎉

---

### 3️⃣ تثبيت APK على الجوال:

#### الطريقة 1: USB
```bash
# شغّل ADB
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### الطريقة 2: نقل الملف
- انقل `app-debug.apk` للجوال
- فعّل "مصادر غير معروفة" في إعدادات الأمان
- اضغط على الملف للتثبيت

---

## 📝 ملاحظات:

- **Live Reload**: يعمل فقط على نفس شبكة WiFi
- **APK Debug**: للتطوير فقط (أكبر حجماً)
- **APK Release**: للإنتاج (أصغر وأسرع)

---

## 🔧 حل المشاكل:

### مشكلة: "Gradle sync failed"
```bash
cd android
./gradlew clean
./gradlew build
```

### مشكلة: "Capacitor not found"
```bash
npm install
npx cap sync android
```

### مشكلة: Live Reload لا يعمل
- تأكد أن الجوال والكمبيوتر على نفس WiFi
- تأكد أن Firewall لا يحجب المنفذ 3005
- جرب IP مختلف (192.168.x.x)

