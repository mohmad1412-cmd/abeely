# 🔧 إصلاح مشكلة ربط الـ AI والـ Backend

## 📋 المشكلة

الـ AI service لا يعمل لأن:
1. **Edge Functions غير مرفوعة** على Supabase
2. **API Keys غير موجودة** في Supabase Secrets أو ملف `.env.local`

---

## ✅ الحلول

### الحل 1: رفع Edge Functions على Supabase (مُوصى به)

#### الخطوة 1: تثبيت Supabase CLI (إذا لم يكن مثبتاً)

```bash
# Windows (PowerShell)
npm install -g supabase

# أو باستخدام Scoop
scoop install supabase
```

#### الخطوة 2: تسجيل الدخول إلى Supabase

```bash
supabase login
```

#### الخطوة 3: ربط المشروع بـ Supabase

```bash
# من مجلد المشروع
supabase link --project-ref YOUR_PROJECT_REF
```

> **ملاحظة**: يمكنك الحصول على `project-ref` من Supabase Dashboard → Settings → General → Reference ID

#### الخطوة 4: إضافة API Keys في Supabase Secrets

```bash
# إضافة مفتاح Anthropic
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# إضافة مفتاح OpenAI (اختياري - للـ Whisper)
supabase secrets set OPENAI_API_KEY=sk-xxxxx
```

> **بديل**: يمكنك إضافة الـ secrets من Supabase Dashboard:
> - اذهب إلى: **Settings → Edge Functions → Secrets**
> - أضف `ANTHROPIC_API_KEY` و `OPENAI_API_KEY`

#### الخطوة 5: رفع Edge Functions

```bash
# رفع ai-chat function
supabase functions deploy ai-chat

# رفع customer-service-ai function
supabase functions deploy customer-service-ai

# رفع image-search function (إذا كان موجوداً)
supabase functions deploy image-search
```

#### الخطوة 6: التحقق من الرفع

```bash
# عرض جميع الـ functions المرفوعة
supabase functions list
```

---

### الحل 2: استخدام API Key مباشرة من Frontend (Fallback)

إذا لم تستطع رفع Edge Functions، يمكنك استخدام API Key مباشرة من الـ frontend:

#### الخطوة 1: إنشاء ملف `.env.local`

```bash
# من مجلد المشروع
copy env.local.example .env.local
```

#### الخطوة 2: إضافة API Keys في `.env.local`

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# AI Configuration
VITE_ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
VITE_OPENAI_API_KEY=sk-xxxxx
```

#### الخطوة 3: إعادة تشغيل الـ dev server

```bash
npm run dev
```

> **⚠️ تحذير**: هذا الحل أقل أماناً لأن API Key سيكون مرئياً في الـ frontend code. استخدمه فقط للتطوير المحلي.

---

## 🔍 التحقق من الربط

### 1. اختبار Edge Function من الكود

افتح Console في المتصفح وتحقق من:
- ✅ إذا ظهرت رسالة: `✅ Supabase Edge Function 'ai-chat' is healthy.`
- ❌ إذا ظهرت رسالة: `❌ Supabase Edge Function Error: ...`

### 2. اختبار مباشر من Supabase Dashboard

1. اذهب إلى: **Edge Functions → ai-chat → Invoke**
2. أرسل:
```json
{
  "prompt": "test",
  "mode": "chat"
}
```
3. تحقق من الرد

### 3. اختبار من Terminal

```bash
# اختبار ai-chat
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/ai-chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test", "mode": "chat"}'
```

---

## 🐛 حل المشاكل الشائعة

### مشكلة: "ANTHROPIC_API_KEY not configured"

**الحل:**
1. تأكد من إضافة المفتاح في Supabase Secrets:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
   ```
2. أعد رفع الـ function:
   ```bash
   supabase functions deploy ai-chat
   ```

### مشكلة: "Edge Function not found" أو "404"

**الحل:**
1. تأكد من رفع الـ function:
   ```bash
   supabase functions deploy ai-chat
   ```
2. تحقق من أن الـ function موجودة:
   ```bash
   supabase functions list
   ```

### مشكلة: "CORS error" أو "Network error"

**الحل:**
1. تأكد من إضافة `Authorization` header في الطلب
2. تحقق من أن `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` صحيحة في `.env.local`

### مشكلة: Edge Function تعمل لكن الـ AI لا يرد

**الحل:**
1. تحقق من صحة API Key:
   ```bash
   # اختبار API Key مباشرة
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: sk-ant-xxxxx" \
     -H "anthropic-version: 2023-06-01" \
     -H "Content-Type: application/json" \
     -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
   ```
2. تحقق من الـ logs في Supabase Dashboard:
   - **Edge Functions → ai-chat → Logs**

---

## 📝 ملاحظات مهمة

1. **الأمان**: 
   - ✅ استخدم Supabase Secrets للـ API Keys (آمن)
   - ❌ لا تضع API Keys في `.env.local` في الإنتاج

2. **الترتيب المفضل**:
   - Edge Functions (Supabase) → إذا فشل → Direct API (Frontend)

3. **التكلفة**:
   - Edge Functions تستخدم API Keys من Supabase (آمن)
   - Direct API من Frontend يكشف API Key (غير آمن)

---

## 🚀 الخطوات التالية

بعد إصلاح الربط:

1. ✅ اختبر إنشاء طلب جديد
2. ✅ اختبر خدمة العملاء الذكية
3. ✅ تحقق من الـ logs في Supabase Dashboard
4. ✅ راقب استخدام API (لتجنب تجاوز الحد)

---

## 📞 المساعدة

إذا استمرت المشكلة:
1. تحقق من الـ logs في Supabase Dashboard
2. تحقق من Console في المتصفح
3. راجع ملف `services/aiService.ts` لفهم flow الـ fallback

