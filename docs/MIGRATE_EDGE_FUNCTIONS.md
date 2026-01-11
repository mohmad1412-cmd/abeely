# دليل نقل Edge Functions إلى المشروع الجديد

هذا الدليل يشرح كيفية نقل جميع Edge Functions من المشروع القديم إلى المشروع الجديد.

---

## 📋 Edge Functions المطلوب نقلها

1. ✅ `ai-chat` - **إنشاء عنوان وتصنيف للطلبات** (وضع draft فقط)
2. ✅ `find-interested-users` - البحث عن مستخدمين مهتمين
3. ✅ `send-push-notification` - إرسال إشعارات منبثقة

**ملاحظة**: `ai-chat` لا يستخدم لمحادثات - فقط للعنونة والتصنيف الذكي للطلبات (draft mode).

---

## 🔧 الطريقة 1: استخدام Supabase CLI (الموصى به - يدعم deno.json)

⚠️ **مهم**: Dashboard لا يدعم إضافة `deno.json` مباشرة. استخدم CLI لنشر Functions مع deno.json.

### المتطلبات:
```bash
# تثبيت Supabase CLI (إذا لم يكن مثبتاً)
npm install -g supabase

# أو
brew install supabase/tap/supabase
```

### خطوات لكل Function:

#### 1. Function: `ai-chat` (العنونة والتصنيف الذكي)

**الوظيفة**: إنشاء عنوان وتصنيف تلقائي للطلبات من النص المدخل.

**⚠️ مهم**: هذا Function يُستخدم فقط في **وضع draft** (عنونة وتصنيف)، وليس لمحادثات.

1. **من Terminal:**
   ```bash
   # تسجيل الدخول
   supabase login
   
   # ربط المشروع الجديد
   supabase link --project-ref YOUR_NEW_PROJECT_REF
   
   # الانتقال لمجلد Function
   cd supabase/functions/ai-chat
   
   # نشر Function (سيأخذ deno.json تلقائياً)
   supabase functions deploy ai-chat --verify-jwt
   ```

2. **التحقق:**
   - تأكد من وجود `deno.json` في نفس المجلد
   - Function سيُنشر مع جميع الملفات

---

## 🔧 الطريقة 2: استخدام Supabase Dashboard (بدون deno.json)

⚠️ **ملاحظة**: Dashboard لا يدعم `deno.json`، لكن يمكن نشر Function بدونها (سيستخدم imports مباشرة في الكود).

### خطوات لكل Function:

#### 1. Function: `ai-chat`

1. **في المشروع الجديد:**
   - افتح **Supabase Dashboard** → **Edge Functions**
   - اضغط **"Deploy a new function"**

2. **إعدادات الـ Function:**
   - **Function name**: `ai-chat`
   - **Entrypoint**: `index.ts`
   - ✅ فعّل **Verify JWT** (مهم للأمان)

3. **نسخ الكود:**
   - افتح الملف: `supabase/functions/ai-chat/index.ts`
   - انسخ كل المحتوى (1233 سطر)
   - الصقه في Editor

4. **⚠️ deno.json:**
   - Dashboard **لا يدعم** إضافة `deno.json`
   - لكن الكود يعمل بدونها (يستخدم imports مباشرة)
   - أو استخدم **CLI** (الطريقة 1) لنشر مع deno.json

5. **احفظ ونشر** ✅

**كيفية الاستخدام:**
- من Frontend يتم استدعاؤه بـ `mode: "draft"`
- المدخل: نص الطلب من المستخدم
- المخرج: `{ title: "...", categories: [...] }`

#### 2. Function: `find-interested-users`

**باستخدام CLI (موصى به):**
```bash
cd supabase/functions/find-interested-users
supabase functions deploy find-interested-users --verify-jwt
```

**أو Dashboard:**
1. **Function name**: `find-interested-users`
2. انسخ: `supabase/functions/find-interested-users/index.ts`
3. ✅ فعّل **Verify JWT**
4. احفظ ونشر ✅

#### 3. Function: `send-push-notification` أو `send-push-notification-fast`

⚠️ **مهم**: استخدم `send-push-notification-fast` للحصول على أسرع إشعارات (راجع `docs/OPTIMIZE_PUSH_NOTIFICATIONS_SPEED.md`).

**باستخدام CLI (موصى به):**
```bash
cd supabase/functions/send-push-notification-fast
supabase functions deploy send-push-notification-fast --no-verify-jwt
```

**أو Dashboard:**
1. **Function name**: `send-push-notification-fast`
2. انسخ: `supabase/functions/send-push-notification-fast/index.ts`
3. ⚠️ **لا تفعّل Verify JWT** (يتم التحقق داخلياً)
4. احفظ ونشر ✅

**📖 لإضافة Firebase Service Account:** راجع `docs/ADD_FIREBASE_FOR_NOTIFICATIONS.md` (خطوات واضحة وبسيطة)

---

## 🚀 الطريقة 2: استخدام Supabase CLI (الموصى به - يدعم deno.json)

✅ **هذه هي الطريقة الموصى بها** لأنها تدعم `deno.json` تلقائياً.

### التثبيت (إذا لم يكن مثبتاً):

```bash
# باستخدام npm
npm install -g supabase

# أو Homebrew (Mac/Linux)
brew install supabase/tap/supabase
```

### خطوات النشر:

```bash
# 1. تسجيل الدخول
supabase login

# 2. ربط المشروع الجديد
# احصل على Project Ref من: Dashboard → Settings → General → Reference ID
supabase link --project-ref YOUR_NEW_PROJECT_REF

# 3. نشر كل Function (مع deno.json تلقائياً)
supabase functions deploy ai-chat --verify-jwt
supabase functions deploy find-interested-users --verify-jwt
supabase functions deploy send-push-notification --no-verify-jwt

# أو نشر جميع Functions دفعة واحدة (من جذر المشروع)
supabase functions deploy
```

**✅ المميزات:**
- يأخذ `deno.json` تلقائياً من المجلد
- أسرع للنشر المتعدد
- أفضل للمشاريع الكبيرة

**📖 للمزيد**: راجع `docs/HOW_TO_ADD_DENO_JSON.md`

---

## 🔑 الخطوة المهمة: إضافة Secrets

بعد نشر Functions، **يجب** إضافة Secrets في Dashboard:

### Secrets المطلوبة:

#### 1. للـ Function `ai-chat`:
```
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
SUPABASE_URL=https://your-new-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 2. للـ Function `find-interested-users`:
```
SUPABASE_URL=https://your-new-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 3. للـ Function `send-push-notification-fast`:
```
SUPABASE_URL=https://your-new-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### كيفية الإضافة:

1. **Dashboard** → **Edge Functions** → اختر Function
2. **Settings** → **Secrets**
3. اضغط **"Add new secret"**
4. أدخل الاسم والقيمة
5. احفظ

**📖 دليل مفصل لإضافة Firebase Service Account:** راجع `docs/ADD_FIREBASE_FOR_NOTIFICATIONS.md`

---

## ✅ Checklist لكل Function

### Function: ai-chat
- [ ] نشر Function باسم `ai-chat`
- [ ] إضافة `index.ts` (من `supabase/functions/ai-chat/index.ts`)
- [ ] إضافة `deno.json` (imports صحيحة)
- [ ] تفعيل **Verify JWT**
- [ ] إضافة Secrets: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] اختبار Function (من Dashboard أو Frontend)

### Function: find-interested-users
- [ ] نشر Function باسم `find-interested-users`
- [ ] إضافة `index.ts` (من `supabase/functions/find-interested-users/index.ts`)
- [ ] إضافة `deno.json`
- [ ] تفعيل **Verify JWT**
- [ ] إضافة Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] اختبار Function

### Function: send-push-notification-fast
- [ ] نشر Function باسم `send-push-notification-fast`
- [ ] إضافة `index.ts` (من `supabase/functions/send-push-notification-fast/index.ts`)
- [ ] إضافة `deno.json`
- [ ] ⚠️ **لا تفعّل Verify JWT** (يتم التحقق داخلياً)
- [ ] إضافة Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_SERVICE_ACCOUNT`
  - 📖 **لإضافة Firebase**: راجع `docs/ADD_FIREBASE_FOR_NOTIFICATIONS.md`
- [ ] اختبار Function

---

## 🧪 اختبار Functions

### 1. اختبار ai-chat:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/ai-chat' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "test",
    "mode": "chat"
  }'
```

### 2. اختبار find-interested-users:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/find-interested-users' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "category": "تصميم جرافيك",
    "city": "الرياض"
  }'
```

### 3. اختبار send-push-notification:

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "notificationType": "new_offer",
    "requestId": "test-id",
    "requestTitle": "اختبار",
    "authorId": "user-id",
    "recipientId": "recipient-id"
  }'
```

---

## 📁 الملفات المطلوبة

### ai-chat:
- ✅ `supabase/functions/ai-chat/index.ts`
- ✅ `supabase/functions/ai-chat/deno.json`
- ✅ `supabase/functions/ai-chat/.npmrc` (إذا كان موجوداً)

### find-interested-users:
- ✅ `supabase/functions/find-interested-users/index.ts`
- ✅ `supabase/functions/find-interested-users/deno.json`

### send-push-notification:
- ✅ `supabase/functions/send-push-notification/index.ts`
- ✅ `supabase/functions/send-push-notification/deno.json`

---

## ⚠️ ملاحظات مهمة

1. **URLs ستتغير**: 
   - القديم: `https://iwfvlrtmbixequntufjr.supabase.co/...`
   - الجديد: `https://YOUR_NEW_PROJECT_ID.supabase.co/...`
   - **تأكد من تحديث Frontend** بالـ URLs الجديدة

2. **Service Role Key**:
   - احصل عليه من: Dashboard → Settings → API → service_role key
   - **مهم جداً** للـ Functions

3. **FIREBASE_SERVICE_ACCOUNT**:
   - يجب أن يكون JSON كامل
   - يمكن نسخه من المشروع القديم أو إعادة إنشائه

4. **Verify JWT**:
   - `ai-chat`: ✅ فعّله
   - `find-interested-users`: ✅ فعّله
   - `send-push-notification`: ❌ لا تفعله (يتحقق داخلياً)

---

## 🎯 بعد الانتهاء

1. ✅ تحديث Frontend بـ URLs الجديدة
2. ✅ اختبار كل Function
3. ✅ مراقبة Logs في Dashboard
4. ✅ التحقق من عمل الإشعارات والـ AI

---

**تم إنشاء: 2025-01-26**
