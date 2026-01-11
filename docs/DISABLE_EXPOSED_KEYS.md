# 🚨 تعطيل المفاتيح المكشوفة في ملف .env

## ⚠️ تحذير أمني

تم اكتشاف أن ملف `.env` يحتوي على مفاتيح API مكشوفة (السطور 1-19). يجب تعطيل جميع هذه المفاتيح فوراً.

---

## 📋 المفاتيح التي يجب تعطيلها

بناءً على ملف `vite-env.d.ts`، هذه هي المفاتيح المحتملة في `.env`:

### 1. Supabase
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 2. Anthropic (Claude AI)
- `VITE_ANTHROPIC_API_KEY`

### 3. OpenAI
- `VITE_OPENAI_API_KEY`

### 4. Google Gemini
- `VITE_GEMINI_API_KEY`

### 5. Google Maps
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_GOOGLE_MAPS_MAP_ID`

### 6. Google OAuth
- `VITE_GOOGLE_CLIENT_ID`

### 7. Twilio
- `VITE_TWILIO_ACCOUNT_SID`
- `VITE_TWILIO_AUTH_TOKEN`
- `VITE_TWILIO_VERIFY_SERVICE_SID`

---

## 🛑 خطوات تعطيل المفاتيح المكشوفة

### الخطوة 1: نسخ المفاتيح الحالية

افتح ملف `.env` وانسخ جميع المفاتيح الموجودة (السطور 1-19) إلى ملف مؤقت لتتمكن من تعطيلها لاحقاً.

---

### الخطوة 2: تعطيل المفاتيح في لوحات التحكم

#### 🔵 Supabase Keys

1. اذهب إلى: https://supabase.com/dashboard
2. اختر مشروعك
3. اذهب إلى **Settings** → **API**
4. في قسم **Project API keys**:
   - ابحث عن المفتاح القديم (انسخه من `.env`)
   - اضغط **Revoke** لتعطيله
5. أنشئ مفتاح جديد:
   - اضغط **Generate new key**
   - انسخ المفتاح الجديد

**المفاتيح**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

#### 🟣 Anthropic API Key

1. اذهب إلى: https://console.anthropic.com/
2. سجل الدخول
3. اذهب إلى **API Keys**
4. ابحث عن المفتاح القديم (يبدأ بـ `sk-ant-api03-...`)
5. اضغط **Delete** لحذف المفتاح
6. أنشئ مفتاح جديد:
   - اضغط **Create Key**
   - انسخ المفتاح الجديد

**المفتاح**: `VITE_ANTHROPIC_API_KEY`

**⚠️ مهم**: إذا كنت تستخدم Supabase Edge Functions:
```bash
# إزالة المفتاح القديم
supabase secrets unset ANTHROPIC_API_KEY

# إضافة المفتاح الجديد
supabase secrets set ANTHROPIC_API_KEY=your_new_key_here
```

---

#### 🟢 OpenAI API Key

1. اذهب إلى: https://platform.openai.com/api-keys
2. سجل الدخول
3. ابحث عن المفتاح القديم (يبدأ بـ `sk-proj-...` أو `sk-...`)
4. اضغط **Delete** لحذف المفتاح
5. أنشئ مفتاح جديد:
   - اضغط **Create new secret key**
   - انسخ المفتاح الجديد

**المفتاح**: `VITE_OPENAI_API_KEY`

---

#### 🟡 Google Gemini API Key

1. اذهب إلى: https://makersuite.google.com/app/apikey
2. سجل الدخول
3. ابحث عن المفتاح القديم
4. اضغط **Delete** لحذف المفتاح
5. أنشئ مفتاح جديد:
   - اضغط **Create API Key**
   - انسخ المفتاح الجديد

**المفتاح**: `VITE_GEMINI_API_KEY`

---

#### 🔴 Google Maps API Key (مهم جداً - كان مكشوف في index.html أيضاً)

1. اذهب إلى: https://console.cloud.google.com/
2. اختر مشروعك
3. اذهب إلى **APIs & Services** → **Credentials**
4. ابحث عن API Key القديم (يبدأ بـ `AIzaSy...`)
5. اضغط على المفتاح
6. اضغط **Delete** لحذف المفتاح
7. أنشئ مفتاح جديد:
   - اضغط **Create Credentials** → **API Key**
   - انسخ المفتاح الجديد
8. **مهم جداً**: قم بتقييد المفتاح الجديد:
   - اضغط على المفتاح الجديد
   - في **API restrictions**:
     - اختر **Restrict key**
     - اختر فقط: **Maps JavaScript API** و **Places API**
   - في **Application restrictions**:
     - اختر **HTTP referrers (web sites)**
     - أضف نطاقات موقعك فقط (مثل: `https://yourdomain.com/*`)

**المفاتيح**: `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`

---

#### 🟠 Google OAuth Client ID

1. اذهب إلى: https://console.cloud.google.com/
2. اختر مشروعك
3. اذهب إلى **APIs & Services** → **Credentials**
4. ابحث عن **OAuth 2.0 Client ID** القديم
5. اضغط على المعرف
6. اضغط **Delete** لحذف المعرف
7. أنشئ معرف جديد:
   - اضغط **Create Credentials** → **OAuth client ID**
   - اختر **Web application**
   - أضف **Authorized JavaScript origins** و **Authorized redirect URIs**
   - انسخ **Client ID**

**المفتاح**: `VITE_GOOGLE_CLIENT_ID`

---

#### 🔵 Twilio Keys

1. اذهب إلى: https://console.twilio.com/
2. سجل الدخول
3. اذهب إلى **Account** → **API Keys & Tokens**
4. لتعطيل **Auth Token**:
   - اضغط **Regenerate** لإنشاء token جديد
   - أو احذف الحساب إذا لم تعد بحاجة إليه
5. لتعطيل **Verify Service**:
   - اذهب إلى **Verify** → **Services**
   - احذف الخدمة القديمة
   - أنشئ خدمة جديدة واحصل على `Service SID`

**المفاتيح**: 
- `VITE_TWILIO_ACCOUNT_SID`
- `VITE_TWILIO_AUTH_TOKEN`
- `VITE_TWILIO_VERIFY_SERVICE_SID`

---

### الخطوة 3: تحديث ملف .env

بعد تعطيل جميع المفاتيح القديمة وإنشاء مفاتيح جديدة:

1. افتح ملف `.env`
2. استبدل جميع المفاتيح القديمة (السطور 1-19) بالمفاتيح الجديدة:

```env
# Supabase
VITE_SUPABASE_URL=https://your-new-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...NEW_KEY

# Anthropic
VITE_ANTHROPIC_API_KEY=sk-ant-api03-NEW_KEY_HERE

# OpenAI
VITE_OPENAI_API_KEY=sk-proj-NEW_KEY_HERE

# Google Gemini
VITE_GEMINI_API_KEY=NEW_GEMINI_KEY_HERE

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=AIzaSyNEW_KEY_HERE
VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here

# Google OAuth
VITE_GOOGLE_CLIENT_ID=NEW_CLIENT_ID_HERE.apps.googleusercontent.com

# Twilio
VITE_TWILIO_ACCOUNT_SID=AC_NEW_ACCOUNT_SID
VITE_TWILIO_AUTH_TOKEN=NEW_AUTH_TOKEN
VITE_TWILIO_VERIFY_SERVICE_SID=VA_NEW_SERVICE_SID
```

3. احفظ الملف

---

### الخطوة 4: تحديث Supabase Edge Functions (إن وجدت)

إذا كنت تستخدم Supabase Edge Functions مع Anthropic:

```bash
# إزالة المفتاح القديم
supabase secrets unset ANTHROPIC_API_KEY

# إضافة المفتاح الجديد
supabase secrets set ANTHROPIC_API_KEY=your_new_anthropic_key_here
```

---

### الخطوة 5: التأكد من عدم رفع .env إلى Git

1. تأكد من وجود `.env` في `.gitignore`:
   ```gitignore
   .env
   .env.local
   .env.*.local
   ```

2. تحقق من أن `.env` غير موجود في Git:
   ```bash
   git ls-files | grep .env
   ```
   
   إذا ظهر `.env` في النتيجة، يجب حذفه من Git:
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from git (contains exposed API keys)"
   ```

---

## ✅ قائمة التحقق

- [ ] نسخت جميع المفاتيح من `.env` (السطور 1-19) إلى ملف مؤقت
- [ ] عطلت `VITE_SUPABASE_ANON_KEY` في Supabase Dashboard وأنشأت مفتاح جديد
- [ ] عطلت `VITE_ANTHROPIC_API_KEY` في Anthropic Dashboard وأنشأت مفتاح جديد
- [ ] عطلت `ANTHROPIC_API_KEY` في Supabase Secrets (إن وجد) وأنشأت مفتاح جديد
- [ ] عطلت `VITE_OPENAI_API_KEY` في OpenAI Dashboard وأنشأت مفتاح جديد
- [ ] عطلت `VITE_GEMINI_API_KEY` في Google AI Studio وأنشأت مفتاح جديد
- [ ] عطلت `VITE_GOOGLE_MAPS_API_KEY` في Google Cloud Console وأنشأت مفتاح جديد مع تقييدات
- [ ] عطلت `VITE_GOOGLE_CLIENT_ID` في Google Cloud Console وأنشأت معرف جديد
- [ ] عطلت جميع مفاتيح Twilio وأنشأت مفاتيح جديدة
- [ ] حدثت جميع المفاتيح في ملف `.env`
- [ ] حدثت `ANTHROPIC_API_KEY` في Supabase Secrets (إن وجد)
- [ ] تأكدت من أن `.env` موجود في `.gitignore`
- [ ] تأكدت من أن `.env` غير موجود في Git
- [ ] أعدت تشغيل المشروع واختبرت جميع الخدمات

---

## 🔐 نصائح أمنية إضافية

1. **لا ترفع `.env` إلى Git أبداً**
   - تأكد من وجود `.env` في `.gitignore`
   - استخدم `.env.example` كقالب بدون قيم حقيقية

2. **استخدم تقييدات API Keys**
   - قم بتقييد Google Maps API Key حسب النطاق
   - قم بتقييد API Keys حسب الخدمات المستخدمة فقط

3. **راقب استخدام API Keys**
   - راجع استخدام المفاتيح بانتظام في لوحات التحكم
   - فعّل التنبيهات عند تجاوز الحدود

4. **استخدم Environment Variables في الإنتاج**
   - لا تضع API Keys في الكود مباشرة
   - استخدم متغيرات البيئة في منصة النشر (Vercel, Netlify, etc.)

---

## 🆘 في حالة الطوارئ

إذا اكتشفت أن API Key مكشوف ومستخدم بشكل خاطئ:

1. **عطل المفتاح فوراً** في لوحة التحكم
2. **أنشئ مفتاح جديد** فوراً
3. **راجع الاستخدام** في لوحة التحكم للتحقق من أي نشاط مشبوه
4. **حدث المفتاح** في جميع الأماكن (`.env`, Supabase Secrets, etc.)
5. **أعد تشغيل الخدمات** للتأكد من استخدام المفاتيح الجديدة

---

## 📞 روابط سريعة

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Anthropic Console](https://console.anthropic.com/)
- [OpenAI Platform](https://platform.openai.com/api-keys)
- [Google AI Studio](https://makersuite.google.com/app/apikey)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Twilio Console](https://console.twilio.com/)

---

**⚠️ مهم**: بعد تعطيل جميع المفاتيح المكشوفة، تأكد من تحديث ملف `.env` بالمفاتيح الجديدة وإعادة تشغيل المشروع.

