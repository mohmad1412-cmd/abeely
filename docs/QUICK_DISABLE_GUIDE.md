# ⚡ دليل سريع لتعطيل المفاتيح المكشوفة في .env

## 🎯 الهدف

تعطيل جميع API Keys المكشوفة في ملف `.env` (السطور 1-19) وإنشاء مفاتيح جديدة.

---

## 📝 خطوات سريعة

### 1. افتح ملف `.env` وانسخ المفاتيح

افتح ملف `.env` وانسخ جميع المفاتيح من السطور 1-19 إلى ملف مؤقت (مثل `old-keys.txt`).

---

### 2. تعطيل المفاتيح حسب النوع

#### Supabase
- **الرابط**: https://supabase.com/dashboard → Settings → API
- **المفاتيح**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **⚠️ مهم**: لا يمكن إنشاء anon key جديد لمشروع موجود (المفتاح ثابت)
- **الإجراء**: 
  - إذا كان المفتاح مكشوفاً: أنشئ مشروع Supabase جديد
  - إذا لم يكن مكشوفاً: استخدم المفتاح الحالي
- **راجع**: `docs/CREATE_SUPABASE_ANON_KEY.md` للتفاصيل الكاملة

#### Anthropic
- **الرابط**: https://console.anthropic.com/ → API Keys
- **المفتاح**: `VITE_ANTHROPIC_API_KEY`
- **الإجراء**: Delete المفتاح القديم → Create Key

#### OpenAI
- **الرابط**: https://platform.openai.com/api-keys
- **المفتاح**: `VITE_OPENAI_API_KEY`
- **الإجراء**: Delete المفتاح القديم → Create new secret key

#### Google Gemini
- **الرابط**: https://makersuite.google.com/app/apikey
- **المفتاح**: `VITE_GEMINI_API_KEY`
- **الإجراء**: Delete المفتاح القديم → Create API Key

#### Google Maps
- **الرابط**: https://console.cloud.google.com/ → APIs & Services → Credentials
- **المفاتيح**: `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GOOGLE_MAPS_MAP_ID`
- **الإجراء**: Delete المفتاح القديم → Create Credentials → API Key
- **⚠️ مهم**: قم بتقييد المفتاح الجديد (API restrictions + Application restrictions)

#### Google OAuth
- **الرابط**: https://console.cloud.google.com/ → APIs & Services → Credentials
- **المفتاح**: `VITE_GOOGLE_CLIENT_ID`
- **الإجراء**: Delete المعرف القديم → Create Credentials → OAuth client ID

#### Twilio
- **الرابط**: https://console.twilio.com/ → Account → API Keys & Tokens
- **المفاتيح**: `VITE_TWILIO_ACCOUNT_SID`, `VITE_TWILIO_AUTH_TOKEN`, `VITE_TWILIO_VERIFY_SERVICE_SID`
- **الإجراء**: Regenerate Auth Token + Delete/Recreate Verify Service

---

### 3. تحديث ملف `.env`

استبدل جميع المفاتيح القديمة بالمفاتيح الجديدة في ملف `.env`.

---

### 4. تحديث Supabase Secrets (إن وجدت)

```bash
supabase secrets unset ANTHROPIC_API_KEY
supabase secrets set ANTHROPIC_API_KEY=your_new_key_here
```

---

### 5. التحقق من Git

```bash
# تحقق من أن .env غير موجود في Git
git ls-files | grep .env

# إذا ظهر .env، احذفه من Git
git rm --cached .env
git commit -m "Remove .env from git (contains exposed API keys)"
```

---

## ✅ Checklist سريع

- [ ] نسخت المفاتيح من `.env` (السطور 1-19)
- [ ] عطلت Supabase keys وأنشأت مفاتيح جديدة
- [ ] عطلت Anthropic key وأنشأت مفتاح جديد
- [ ] عطلت OpenAI key وأنشأت مفتاح جديد
- [ ] عطلت Google Gemini key وأنشأت مفتاح جديد
- [ ] عطلت Google Maps key وأنشأت مفتاح جديد مع تقييدات
- [ ] عطلت Google OAuth key وأنشأت معرف جديد
- [ ] عطلت Twilio keys وأنشأت مفاتيح جديدة
- [ ] حدثت جميع المفاتيح في `.env`
- [ ] حدثت Supabase Secrets (إن وجدت)
- [ ] تأكدت من أن `.env` غير موجود في Git
- [ ] أعدت تشغيل المشروع واختبرت الخدمات

---

## 📚 للمزيد من التفاصيل

راجع: `docs/DISABLE_EXPOSED_KEYS.md` للدليل الكامل.

