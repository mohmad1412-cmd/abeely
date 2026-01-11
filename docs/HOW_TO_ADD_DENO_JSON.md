# كيفية إضافة deno.json في Edge Functions

## ⚠️ معلومة مهمة

**Supabase Dashboard لا يدعم إضافة `deno.json` مباشرة.**

يمكنك إضافة الملف فقط عند استخدام **Supabase CLI**.

---

## ✅ الطريقة الصحيحة: استخدام CLI

### 1. تثبيت Supabase CLI

```bash
# باستخدام npm
npm install -g supabase

# أو باستخدام Homebrew (Mac/Linux)
brew install supabase/tap/supabase

# أو باستخدام Scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. تسجيل الدخول

```bash
supabase login
```

### 3. ربط المشروع الجديد

```bash
# احصل على Project Ref من Dashboard → Settings → General → Reference ID
supabase link --project-ref YOUR_NEW_PROJECT_REF
```

### 4. نشر Function مع deno.json

```bash
# نشر ai-chat
cd supabase/functions/ai-chat
supabase functions deploy ai-chat --verify-jwt

# نشر find-interested-users
cd ../find-interested-users
supabase functions deploy find-interested-users --verify-jwt

# نشر send-push-notification (بدون verify-jwt)
cd ../send-push-notification
supabase functions deploy send-push-notification --no-verify-jwt
```

**ملاحظة**: CLI يأخذ `deno.json` تلقائياً من نفس المجلد إذا كان موجوداً.

---

## ❌ ماذا لو استخدمت Dashboard؟

إذا نشرت Function من Dashboard:

### ✅ **سيعمل بدون deno.json**
- الكود يستخدم imports مباشرة في الملف
- مثال: `import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";`
- لا حاجة لـ `deno.json` في هذه الحالة

### ⚠️ **لكن:**
- لا يمكنك إدارة imports من ملف منفصل
- كل imports يجب أن تكون مباشرة في الكود

---

## 📁 هيكل المجلدات

```
supabase/functions/
├── ai-chat/
│   ├── index.ts
│   └── deno.json          ← يُستخدم فقط مع CLI
├── find-interested-users/
│   ├── index.ts
│   └── deno.json          ← يُستخدم فقط مع CLI
└── send-push-notification/
    ├── index.ts
    └── deno.json          ← يُستخدم فقط مع CLI
```

---

## 🎯 الخلاصة

| الطريقة | يدعم deno.json؟ | متى تستخدم |
|---------|----------------|-----------|
| **Supabase CLI** | ✅ نعم | موصى به - للنشر الكامل |
| **Dashboard** | ❌ لا | للاختبار السريع فقط |

---

## 💡 نصيحة

**استخدم CLI** لأنه:
- ✅ يدعم `deno.json`
- ✅ أسرع في نشر متعدد Functions
- ✅ أفضل للمشاريع الكبيرة
- ✅ يمكنك التحكم الكامل

**Dashboard** مناسب فقط لـ:
- اختبار سريع
- تعديلات بسيطة
- Functions بدون `deno.json`

---

**تم: 2025-01-26**
