# دليل سريع لنسخ Edge Functions

## 📋 الملفات المطلوبة لكل Function

### 1️⃣ ai-chat (العنونة والتصنيف الذكي)

**الوظيفة**: إنشاء عنوان وتصنيف تلقائي للطلبات (وضع draft فقط - ليس محادثات)

**الملفات:**
- `index.ts` → انسخ من `supabase/functions/ai-chat/index.ts` (1233 سطر)
- `deno.json` → محتوى:
```json
{
  "imports": {
    "@supabase/functions-js": "jsr:@supabase/functions-js"
  }
}
```

**Secrets المطلوبة:**
```
ANTHROPIC_API_KEY
OPENAI_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

**إعدادات:**
- ✅ Verify JWT: مفعّل

**الاستخدام:**
- Frontend يستدعي: `{ prompt: "نص الطلب", mode: "draft" }`
- المخرج: `{ title: "عنوان", categories: ["تصنيف1", "تصنيف2"] }`

---

### 2️⃣ find-interested-users

**الملفات:**
- `index.ts` → انسخ من `supabase/functions/find-interested-users/index.ts`
- `deno.json` → محتوى:
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.39.3"
  }
}
```

**Secrets المطلوبة:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

**إعدادات:**
- ✅ Verify JWT: مفعّل

---

### 3️⃣ send-push-notification

**الملفات:**
- `index.ts` → انسخ من `supabase/functions/send-push-notification/index.ts`
- `deno.json` → محتوى:
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.39.3"
  }
}
```

**Secrets المطلوبة:**
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
FIREBASE_SERVICE_ACCOUNT
ANTHROPIC_API_KEY (اختياري)
```

**إعدادات:**
- ❌ Verify JWT: غير مفعّل (يتحقق داخلياً)

---

## 🚀 خطوات سريعة

### الطريقة 1: CLI (موصى به - يدعم deno.json)

```bash
# 1. تسجيل الدخول وربط المشروع
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# 2. نشر كل Function
cd supabase/functions/ai-chat && supabase functions deploy ai-chat --verify-jwt
cd ../find-interested-users && supabase functions deploy find-interested-users --verify-jwt
cd ../send-push-notification && supabase functions deploy send-push-notification --no-verify-jwt

# 3. إضافة Secrets من Dashboard → Edge Functions → Function name → Settings → Secrets
```

**الوقت المتوقع: 5 دقائق لجميع Functions** ⚡

### الطريقة 2: Dashboard (بدون deno.json)

1. Dashboard → Edge Functions → Deploy new function
2. اسم Function → انسخ الكود (index.ts فقط)
3. Settings → Secrets → أضف جميع Secrets
4. Deploy ✅

**ملاحظة**: Dashboard لا يدعم `deno.json`، لكن الكود يعمل بدونها.

---

**راجع `docs/HOW_TO_ADD_DENO_JSON.md` للتفاصيل الكاملة**
