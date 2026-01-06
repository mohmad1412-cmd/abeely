# إصلاح مشكلة Edge Functions Unhealthy

## المشكلة
Edge Functions تظهر كـ "Unhealthy" في Project Status.

## الحلول الممكنة

### الحل 1: نشر Edge Functions على السحابة (موصى به)

إذا كنت تستخدم Supabase على السحابة، يجب نشر Edge Functions:

#### المتطلبات:
1. تثبيت Supabase CLI:
```bash
npm install -g supabase
```

2. تسجيل الدخول:
```bash
supabase login
```

3. ربط المشروع:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

4. نشر جميع Edge Functions:
```bash
# نشر function واحدة
supabase functions deploy ai-chat

# أو نشر جميع الـ functions
supabase functions deploy ai-chat
supabase functions deploy customer-service-ai
supabase functions deploy image-search
```

#### إعداد متغيرات البيئة:

بعد النشر، يجب إضافة متغيرات البيئة من Dashboard:

1. اذهب إلى: **Edge Functions** → **Settings** → **Secrets**
2. أضف المتغيرات التالية:
   - `ANTHROPIC_API_KEY` أو `VITE_ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY` أو `VITE_OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

أو من CLI:
```bash
supabase secrets set ANTHROPIC_API_KEY=your_key_here
supabase secrets set OPENAI_API_KEY=your_key_here
supabase secrets set SUPABASE_URL=your_url_here
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

### الحل 2: إذا كنت تستخدم Supabase محلياً

إذا كنت تعمل محلياً، تأكد من:

1. تشغيل Supabase محلياً:
```bash
supabase start
```

2. التحقق من أن Edge Runtime مفعل في `config.toml`:
```toml
[edge_runtime]
enabled = true
```

3. اختبار الـ functions محلياً:
```bash
supabase functions serve ai-chat
```

### الحل 3: التحقق من الأخطاء

1. **تحقق من Logs:**
   - اذهب إلى Dashboard → Edge Functions → Logs
   - ابحث عن أخطاء في الـ functions

2. **تحقق من الكود:**
   - تأكد من أن جميع الـ imports صحيحة
   - تأكد من أن `deno.json` موجود في كل function

3. **تحقق من متغيرات البيئة:**
   - تأكد من أن جميع المتغيرات المطلوبة موجودة
   - تحقق من أن القيم صحيحة

### الحل 4: إعادة تشغيل Edge Functions

إذا كان المشروع تم استعادته مؤخراً:

1. انتظر 5 دقائق (كما هو موضح في الرسالة)
2. إذا استمرت المشكلة، جرب:
   - إعادة نشر الـ functions
   - التحقق من Logs
   - الاتصال بدعم Supabase

## التحقق من الإصلاح

بعد تطبيق الحلول:

1. اذهب إلى Dashboard → Project Status
2. تحقق من أن Edge Functions أصبحت "Healthy" ✅
3. اختبر الـ functions:
```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-chat' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"prompt":"test"}'
```

## ملاحظات مهمة

- Edge Functions تحتاج إلى نشر على السحابة لتعمل
- تأكد من إضافة جميع متغيرات البيئة المطلوبة
- تحقق من Logs إذا استمرت المشكلة
- إذا كان المشروع مستعاداً مؤخراً، قد تحتاج إلى الانتظار 5 دقائق

## روابط مفيدة

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Deploying Edge Functions](https://supabase.com/docs/guides/functions/deploy)
- [Environment Variables](https://supabase.com/docs/guides/functions/secrets)

