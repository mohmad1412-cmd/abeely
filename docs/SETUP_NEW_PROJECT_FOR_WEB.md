# إعداد المشروع الجديد وتشغيله على الويب 🌐

دليل شامل لإعداد المشروع الجديد مع Supabase و Firebase وتشغيله على المتصفحات.

---

## 📋 الخطوات (ترتيب واضح)

### 1️⃣ تحديث ملف `.env` للمشروع الجديد

1. **احصل على معلومات المشروع الجديد:**
   - افتح **Supabase Dashboard** → **المشروع الجديد**
   - Settings → API

2. **انسخ القيم:**
   - **Project URL** → سيصبح `VITE_SUPABASE_URL`
   - **anon public key** → سيصبح `VITE_SUPABASE_ANON_KEY`

3. **حدّث ملف `.env` أو `.env.local`:**
   ```env
   VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT_ID.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

⚠️ **مهم**: استبدل `YOUR_NEW_PROJECT_ID` و `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` بالقيم الحقيقية من Dashboard.

---

### 2️⃣ إضافة Firebase Service Account (للإشعارات)

📖 **راجع الدليل المفصل**: `docs/ADD_FIREBASE_FOR_NOTIFICATIONS.md`

**الخطوات السريعة:**

1. Firebase Console → Project Settings → **Service accounts**
2. اضغط **"Generate new private key"** → سيتم تحميل ملف JSON
3. افتح الملف → انسخ كل المحتوى
4. Supabase Dashboard → Edge Functions → `send-push-notification-fast`
5. Settings → Secrets → Add secret
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: الصق محتوى JSON
6. أضف أيضاً:
   - `SUPABASE_URL` (من Dashboard → Settings → API → Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (من Dashboard → Settings → API → service_role key)

---

### 3️⃣ ربط Supabase MCP (اختياري - للتطوير)

⚠️ **ملاحظة**: Supabase MCP يحتاج إعداد في Cursor Settings أولاً.

**إذا كان MCP مفعّل:**

1. **في Cursor:**
   - Settings → MCP Servers
   - تأكد من أن Supabase MCP مفعّل

2. **الحصول على Project Ref:**
   - Dashboard → Settings → General → **Reference ID**
   - أو من الـ URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

3. **الحصول على Access Token (للـ MCP):**
   - Dashboard → Settings → Access Tokens
   - أنشئ token جديد

**الآن يمكنك استخدام MCP tools مباشرة!**

---

### 4️⃣ تشغيل التطبيق على الويب

#### الخطوة 1: تثبيت Dependencies

```bash
npm install
```

#### الخطوة 2: التأكد من ملف `.env`

تحقق من وجود `.env` أو `.env.local` في جذر المشروع:

```env
VITE_SUPABASE_URL=https://your-new-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_anon_key_here

# باقي المتغيرات (اختيارية حسب احتياجك)
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_OPENAI_API_KEY=sk-...
# ... إلخ
```

#### الخطوة 3: تشغيل السيرفر

```bash
npm run dev
```

سيبدأ السيرفر على: **http://localhost:3005**

#### الخطوة 4: فتح المتصفح

افتح المتصفح واذهب إلى:
```
http://localhost:3005
```

✅ **تم! التطبيق يعمل الآن على الويب**

---

## 🔍 التحقق من أن كل شيء يعمل

### 1. تحقق من الاتصال بـ Supabase

- افتح Console في المتصفح (F12)
- يجب ألا ترى أخطاء عن `VITE_SUPABASE_URL`
- جرّب تسجيل الدخول - يجب أن يعمل

### 2. تحقق من Firebase (إذا أضفته)

- Dashboard → Edge Functions → `send-push-notification-fast` → Logs
- تأكد من عدم وجود أخطاء `FIREBASE_SERVICE_ACCOUNT not configured`

### 3. تحقق من الوظائف الأساسية

- ✅ تسجيل الدخول
- ✅ عرض الطلبات
- ✅ إنشاء طلب جديد
- ✅ الإشعارات (إذا أضفت Firebase)

---

## 🚀 البناء للإنتاج (Production Build)

عندما تكون جاهزاً لنشر التطبيق على الويب:

```bash
# 1. بناء المشروع
npm run build

# 2. المعاينة (اختياري)
npm run preview

# 3. رفع ملفات مجلد `dist` إلى خادمك
# (مثل: Vercel, Netlify, أو أي hosting)
```

الملفات الجاهزة ستكون في مجلد `dist/`.

---

## 📝 Checklist

- [ ] حدّثت `.env` أو `.env.local` بالقيم الجديدة
- [ ] أضفت `VITE_SUPABASE_URL` من المشروع الجديد
- [ ] أضفت `VITE_SUPABASE_ANON_KEY` من المشروع الجديد
- [ ] أضفت Firebase Service Account في Supabase Secrets
- [ ] أضفت `SUPABASE_URL` في Edge Function Secrets
- [ ] أضفت `SUPABASE_SERVICE_ROLE_KEY` في Edge Function Secrets
- [ ] شغّلت `npm install`
- [ ] شغّلت `npm run dev`
- [ ] فتحت `http://localhost:3005` في المتصفح
- [ ] تحققت من أن التطبيق يعمل

---

## 🐛 حل المشاكل

### المشكلة: "Supabase: Missing VITE_SUPABASE_URL"

**السبب**: ملف `.env` غير موجود أو المتغيرات غير موجودة

**الحل:**
1. تأكد من وجود `.env` أو `.env.local` في جذر المشروع
2. تأكد من أن المتغيرات تبدأ بـ `VITE_`
3. أعد تشغيل `npm run dev`

---

### المشكلة: "CORS error" أو "Network error"

**السبب**: المشروع القديم لا يزال في `.env`

**الحل:**
1. تحقق من `VITE_SUPABASE_URL` في `.env`
2. تأكد من أنها تشير للمشروع الجديد
3. أعد تحميل الصفحة (Ctrl+Shift+R)

---

### المشكلة: التطبيق لا يفتح على `http://localhost:3005`

**السبب**: البورت 3005 مستخدم من قبل تطبيق آخر

**الحل:**
1. غير البورت في `vite.config.ts`:
   ```typescript
   server: {
     port: 3006, // غيّر الرقم
   }
   ```
2. أو أوقف التطبيق الذي يستخدم البورت 3005

---

### المشكلة: الإشعارات لا تعمل

**التحقق:**
1. Dashboard → Edge Functions → `send-push-notification-fast` → Settings
2. تأكد من وجود جميع Secrets:
   - `FIREBASE_SERVICE_ACCOUNT`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. راجع Logs للأخطاء

**راجع**: `docs/ADD_FIREBASE_FOR_NOTIFICATIONS.md`

---

## 🔗 روابط مفيدة

- 📖 **إضافة Firebase**: `docs/ADD_FIREBASE_FOR_NOTIFICATIONS.md`
- 📖 **نقل Edge Functions**: `docs/MIGRATE_EDGE_FUNCTIONS.md`
- 📖 **نقل Schema**: `docs/MIGRATE_TO_NEW_SUPABASE_PROJECT.md`
- 📖 **الفرق بين Firebase Service Account و VAPID**: `docs/FIREBASE_WEB_PUSH_VS_SERVICE_ACCOUNT.md`

---

## 💡 نصائح إضافية

### للعمل على الويب فقط (بدون Capacitor):

التطبيق يعمل بشكل طبيعي على الويب. Capacitor فقط للإضافات المخصصة للأجهزة (Android/iOS).

### للتطوير السريع:

استخدم `npm run dev` مع Live Reload - أي تغيير في الكود سيُحدّث المتصفح تلقائياً.

### للاختبار:

يمكنك استخدام أدوات التطوير في المتصفح (F12) لفحص Network requests والتحقق من الاتصال بـ Supabase.

---

**تم: 2025-01-26**
