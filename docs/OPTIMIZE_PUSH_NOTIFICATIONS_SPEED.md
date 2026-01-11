# تحسين سرعة الإشعارات المنبثقة ⚡

دليل شامل لتسريع Push Notifications بناءً على أفضل الممارسات.

---

## 🔴 المشاكل الحالية

1. **Triggers معقدة**: Triggers في SQL تقوم بكل المنطق (joins, selects, inserts)
2. **Edge Function ثقيل**: يحتوي على AI calls (بطيء جداً!), joins, fetches متعددة
3. **FCM بدون High Priority**: الإشعارات لا تأتي بسرعة
4. **لا يوجد async triggers**: كل شيء متزامن ويبطئ الـ transaction

---

## ✅ الحل: 3 خطوات بسيطة

### 1️⃣ Trigger بسيط جداً (فقط استدعاء Edge Function)

بدلاً من:
```sql
-- ❌ قديم: معقد وبطيء
CREATE FUNCTION notify_on_new_offer() ...
  -- joins
  -- selects
  -- inserts
  -- business logic
```

استخدم:
```sql
-- ✅ جديد: بسيط وسريع
CREATE FUNCTION trigger_push_notification() ...
  -- فقط استدعاء Edge Function
  PERFORM net.http_post(...);
```

### 2️⃣ Edge Function نحيف (فقط: جلب token → إرسال FCM)

**❌ ممنوع:**
- AI calls
- Joins معقدة
- Business logic
- Fetches متعددة

**✅ فقط:**
- جلب FCM token للمستخدم
- توليد محتوى بسيط (بدون AI)
- إرسال FCM High Priority

### 3️⃣ FCM High Priority

```json
{
  "android": {
    "priority": "HIGH",  // ⚡ مهم جداً!
    "notification": {
      "priority": "high",
      "sound": "default"
    }
  }
}
```

---

## 📝 الخطوات العملية

### الخطوة 1: تفعيل pg_net Extension

في SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### الخطوة 2: تحديث Triggers

شغّل الملف: `supabase/OPTIMIZE_NOTIFICATIONS_FAST.sql`

هذا سيستبدل Triggers القديمة ببساطة.

### الخطوة 3: تعيين Environment Variables

في Supabase Dashboard → Database → Custom Config:

```sql
-- استبدل YOUR_PROJECT_REF بمشروعك الفعلي
ALTER DATABASE postgres SET app.edge_function_url = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification-fast';

-- احصل على Service Role Key من: Settings → API
ALTER DATABASE postgres SET app.service_role_key = 'your-service-role-key-here';
```

**أو** يمكنك تعديل القيمة الافتراضية في `OPTIMIZE_NOTIFICATIONS_FAST.sql` مباشرة.

### الخطوة 4: نشر Edge Function الجديد

1. انشر Function جديد: `send-push-notification-fast`
   - انسخ من: `supabase/functions/send-push-notification-fast/`
   - أو استبدل الـ function القديم

2. تأكد من وجود Secrets:
   - `FIREBASE_SERVICE_ACCOUNT`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   
   📖 **دليل مفصل لإضافة Firebase:** راجع `docs/ADD_FIREBASE_FOR_NOTIFICATIONS.md`

---

## 🎯 التحسينات الرئيسية

### قبل (بطيء ❌):

```
INSERT offer
  ↓
Trigger (معقد) → Joins → Selects → Inserts (200ms)
  ↓
Edge Function (ثقيل) → AI Call (2000ms!) → Joins → Fetches (500ms)
  ↓
FCM (عادي) → 300ms
────────────────────────
إجمالي: ~3000ms (3 ثواني!) ❌
```

### بعد (سريع ✅):

```
INSERT offer
  ↓
Trigger (بسيط) → net.http_post (async, 10ms)
  ↓
Edge Function (نحيف) → جلب token (50ms) → إرسال FCM High Priority (100ms)
────────────────────────
إجمالي: ~160ms (أقل من 0.2 ثانية!) ✅
```

---

## 📱 Android Channel Configuration

✅ **تم إضافة الكود تلقائياً!**

تم تحديث `MainActivity.java` لإنشاء Notification Channel بأهمية عالية عند بدء التطبيق.

**إذا كنت تريد التحقق يدوياً:**

1. افتح: `android/app/src/main/java/com/servicelink/app/MainActivity.java`
2. تأكد من وجود `createNotificationChannel()` مع `IMPORTANCE_HIGH`
3. بعد تحديث الكود، أعد بناء التطبيق:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleDebug
   ```

**للتحقق من أن القناة تم إنشاؤها بشكل صحيح:**

```bash
# على جهاز Android متصل
adb shell dumpsys notification | grep -A 10 "default"
```

يجب أن ترى:
```
importance: HIGH
lights: true
vibration: true
sound: default
```

---

## 🧪 اختبار السرعة

بعد التطبيق:

1. حدث في DB (INSERT offer أو message)
2. استخدم stopwatch أو console.time
3. قس الوقت حتى وصول الإشعار

**الهدف: أقل من 0.7 ثانية** ✅

---

## ⚠️ ملاحظات مهمة

1. **AI Content (اختياري)**: إذا كنت تريد استخدام AI للمحتوى، اجعله **async/background** ولا تنتظر الرد:
   ```typescript
   // أرسل إشعار فوري أولاً
   await sendFCMFast(...);
   
   // بعدين (في background) حسّن المحتوى بـ AI
   await improveContentWithAI(...); // لا تنتظر!
   ```

2. **pg_net**: الاستدعاءات غير متزامنة - الـ transaction لا ينتظر الرد

3. **Multiple Tokens**: الكود الحالي يرسل لأول token فقط. يمكن تحسينه ليرسل لجميع tokens إذا لزم.

4. **Error Handling**: في حالة فشل Edge Function، الـ INSERT/UPDATE الأساسي لا يتأثر.

---

## 📊 Monitoring

راقب logs:
- Supabase Dashboard → Edge Functions → Logs
- Firebase Console → Cloud Messaging → Reports

ابحث عن:
- Latency (يجب أن يكون < 200ms)
- Success rate (يجب أن يكون > 95%)

---

## 🔄 Rollback (إذا احتجت للرجوع)

إذا احتجت للرجوع للكود القديم:

```sql
-- شغّل الملفات الأصلية:
-- supabase/CATEGORIES_AND_NOTIFICATIONS_SETUP.sql
-- supabase/CREATE_FUNCTIONS_AND_TRIGGERS_V2.sql
```

---

## ✅ Checklist

- [ ] تفعيل `pg_net` extension
- [ ] شغّل `OPTIMIZE_NOTIFICATIONS_FAST.sql`
- [ ] تعيين `app.edge_function_url` و `app.service_role_key`
- [ ] نشر `send-push-notification-fast` Edge Function
- [ ] التحقق من Secrets
- [ ] اختبار السرعة (< 0.7s)
- [ ] تحديث `MainActivity.java` (تم تلقائياً ✅)
- [ ] إعادة بناء التطبيق Android
- [ ] التحقق من Channel (adb shell dumpsys notification)
- [ ] مراقبة Logs

---

**تم إنشاء هذا الدليل بناءً على أفضل الممارسات لتسريع Push Notifications**
