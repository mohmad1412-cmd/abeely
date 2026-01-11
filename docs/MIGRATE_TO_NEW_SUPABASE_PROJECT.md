# دليل نقل المشروع إلى Supabase Project جديد

هذا الدليل يشرح كيفية نقل جميع الجداول والوظائف والـ Secrets من المشروع الحالي إلى مشروع Supabase جديد **بدون نقل البيانات الفعلية**.

---

## 📋 المتطلبات

1. مشروع Supabase جديد (تم إنشاؤه بالفعل)
2. الوصول إلى Supabase Dashboard للمشروع الجديد
3. معرفة بـ SQL Editor في Supabase
4. معرفة بـ Edge Functions في Supabase

---

## 🔑 الخطوة 1: إعداد Secrets (المفاتيح)

### 1.1 الذهاب إلى Edge Functions Secrets

1. افتح Supabase Dashboard → المشروع الجديد
2. اذهب إلى **Settings** → **Edge Functions** → **Secrets**
3. أضف المفاتيح التالية:

```bash
# AI API Keys
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here

# Supabase (ستحصل عليها من المشروع الجديد)
SUPABASE_URL=https://your-new-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Firebase (للإشعارات المنبثقة)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# Twilio (لرسائل SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_MESSAGE_SERVICE_SID=your-message-service-sid
TWILIO_AUTH_TOKEN=your-auth-token

# Google OAuth
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-secret

# Apple OAuth (إذا كان مستخدماً)
SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID=your-apple-client-id
SUPABASE_AUTH_EXTERNAL_APPLE_SECRET=your-apple-secret
```

### 1.2 ملاحظة مهمة

- **SUPABASE_URL** و **SUPABASE_SERVICE_ROLE_KEY**: احصل عليهما من:
  - Dashboard → Settings → API → Project URL و Service Role Key
- **FIREBASE_SERVICE_ACCOUNT**: يجب أن يكون JSON كامل (على سطر واحد أو متعدد أسطر)
- جميع المفاتيح الأخرى: انسخها من المشروع القديم أو أعد إنشاءها

---

## 📊 الخطوة 2: نقل الجداول (Schema فقط)

### 2.1 خياران للتنفيذ

#### 🎯 الخيار الأول (السهل - موصى به):
استخدم ملف SQL شامل واحد يجمع كل شيء:
- **`supabase/MIGRATE_ALL_SCHEMA.sql`** - ملف واحد شامل لجميع الجداول والوظائف

#### 📝 الخيار الثاني (التحكم التفصيلي):
**⚠️ مهم: نفّذ الملفات بالترتيب التالي:**

1. `AUTH_SCHEMA.sql` - جداول المستخدمين الأساسية
2. `CREATE_TABLES_ONLY.sql` - جداول المحادثات والرسائل
3. `CATEGORIES_AND_NOTIFICATIONS_SETUP.sql` - التصنيفات والإشعارات
4. `PUSH_NOTIFICATIONS_SETUP.sql` - جداول الإشعارات المنبثقة
5. `REQUEST_VIEWS_SCHEMA.sql` - تتبع قراءة الطلبات
6. `migrations/create_reports_table.sql` - جدول البلاغات
7. `user_preferences_schema.sql` - وظائف الاهتمامات (find_interested_users)
8. `CREATE_FUNCTIONS_AND_TRIGGERS_V2.sql` - الوظائف والـ Triggers
9. `CREATE_RLS_POLICIES_V2.sql` - سياسات الأمان (RLS)

### 2.2 كيفية التنفيذ

1. افتح **Supabase Dashboard** → **SQL Editor**
2. لكل ملف من الملفات أعلاه:
   - افتح الملف من مجلد `supabase/`
   - انسخ المحتوى
   - الصقه في SQL Editor
   - اضغط **Run** (أو Ctrl+Enter)
   - تأكد من عدم وجود أخطاء

### 2.3 جداول requests و offers

✅ **تم إضافة هذه الجداول تلقائياً في الملف الشامل!**

الملف `supabase/MIGRATE_ALL_SCHEMA.sql` يحتوي على تعريفات كاملة لـ:
- جدول `requests` (13 عمود)
- جدول `offers` (11 عمود)

**إذا كنت تريد إضافتها فقط (بدون باقي الجداول):**

استخدم الملف المنفصل: `supabase/ADD_REQUESTS_AND_OFFERS.sql`

هذا الملف يحتوي على:
- تعريفات الجداول (من الـ schema الفعلي)
- Indexes للأداء
- RLS Policies الأساسية

**💡 التحقق من الـ Schema في المشروع القديم:**

إذا أردت التأكد من تطابق البنية، استخدم:

```sql
-- في المشروع القديم، شغّل هذا لاستخراج بنية جدول
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'requests'
ORDER BY ordinal_position;

-- ونفس الشيء لـ offers
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'offers'
ORDER BY ordinal_position;
```

---

## 🔧 الخطوة 3: نقل Edge Functions

### 3.1 Function: ai-chat

1. افتح **Supabase Dashboard** → **Edge Functions**
2. اضغط **Create a new function**
3. اسم الوظيفة: `ai-chat`
4. انسخ محتوى الملف: `supabase/functions/ai-chat/index.ts`
5. أضف ملف `deno.json` من نفس المجلد:

```json
{
  "imports": {
    "@supabase/functions-js": "jsr:@supabase/functions-js"
  }
}
```

6. تأكد من تفعيل **Verify JWT** في الإعدادات
7. احفظ ونشّر

### 3.2 Function: find-interested-users

1. اسم الوظيفة: `find-interested-users`
2. انسخ محتوى: `supabase/functions/find-interested-users/index.ts`
3. أضف `deno.json`:

```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2.39.3"
  }
}
```

4. احفظ ونشّر

### 3.3 Function: send-push-notification

1. اسم الوظيفة: `send-push-notification`
2. انسخ محتوى: `supabase/functions/send-push-notification/index.ts`
3. أضف `deno.json` (نفس ملف `find-interested-users`)
4. احفظ ونشّر

---

## ✅ الخطوة 4: التحقق والاختبار

### 4.1 التحقق من الجداول

شغّل في SQL Editor:

```sql
-- التحقق من وجود جميع الجداول
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- يجب أن ترى على الأقل:
-- - profiles
-- - verified_guests
-- - categories
-- - request_categories
-- - conversations
-- - messages
-- - notifications
-- - request_views
-- - fcm_tokens
-- - reports
```

### 4.2 التحقق من Functions

```sql
-- التحقق من وجود جميع Functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- يجب أن ترى على الأقل:
-- - update_conversation_on_message
-- - notify_on_new_offer
-- - notify_on_offer_accepted
-- - notify_on_new_message
-- - mark_notification_read
-- - mark_all_notifications_read
-- - get_unread_notifications_count
-- - get_active_categories
-- - set_request_categories
-- - get_request_categories
-- - find_interested_users (مهم جداً لـ Edge Function)
```

### 4.3 التحقق من Triggers

```sql
-- التحقق من Triggers
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### 4.4 اختبار Edge Functions

1. **ai-chat**: 
   ```bash
   curl -X POST 'https://your-project.supabase.co/functions/v1/ai-chat' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{"prompt": "test", "mode": "chat"}'
   ```

2. **find-interested-users**: (يتطلب admin role)
3. **send-push-notification**: (يتطلب بيانات صحيحة)

---

## 🔐 الخطوة 5: إعداد Authentication Providers

### 5.1 Google OAuth

1. Dashboard → **Authentication** → **Providers**
2. فعّل **Google**
3. أدخل:
   - **Client ID**: نفس القيمة في Secrets
   - **Client Secret**: نفس القيمة في Secrets
4. أضف **Redirect URLs**:
   - `https://your-project.supabase.co/auth/v1/callback`

### 5.2 Apple OAuth (إذا كان مستخدماً)

1. نفس الخطوات لكن لـ **Apple**

### 5.3 SMS (Twilio)

1. Dashboard → **Authentication** → **Phone**
2. فعّل **Enable phone signup**
3. Dashboard → **Settings** → **Auth** → **Phone Auth**
4. أدخل بيانات Twilio (من Secrets)

---

## 🗄️ الخطوة 6: Realtime (اختياري)

إذا كنت تستخدم Realtime:

```sql
-- تفعيل Realtime للجداول المهمة
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
ALTER PUBLICATION supabase_realtime ADD TABLE offers;
```

---

## 📝 قائمة الملفات المطلوبة (للرجوع السريع)

### SQL Files:

#### ملف شامل (موصى به):
- ✅ `supabase/MIGRATE_ALL_SCHEMA.sql` - ملف واحد شامل لكل شيء

#### أو ملفات منفصلة (بالترتيب):
1. ✅ `supabase/AUTH_SCHEMA.sql`
2. ✅ `supabase/CREATE_TABLES_ONLY.sql`
3. ✅ `supabase/CATEGORIES_AND_NOTIFICATIONS_SETUP.sql`
4. ✅ `supabase/PUSH_NOTIFICATIONS_SETUP.sql`
5. ✅ `supabase/REQUEST_VIEWS_SCHEMA.sql`
6. ✅ `supabase/migrations/create_reports_table.sql`
7. ✅ `supabase/user_preferences_schema.sql` (يحتوي على find_interested_users)
8. ✅ `supabase/CREATE_FUNCTIONS_AND_TRIGGERS_V2.sql`
9. ✅ `supabase/CREATE_RLS_POLICIES_V2.sql`

### Edge Functions:
1. ✅ `supabase/functions/ai-chat/index.ts` + `deno.json`
2. ✅ `supabase/functions/find-interested-users/index.ts` + `deno.json`
3. ✅ `supabase/functions/send-push-notification/index.ts` + `deno.json`

---

## ⚠️ ملاحظات مهمة

1. **لا تنسى**: هذا الدليل ينقل **Schema فقط** وليس البيانات. الجداول ستكون فارغة.

2. **جداول requests و offers**: قد تحتاج لإنشائها يدوياً إذا لم تكن في ملفات SQL. استخدم `\d+ requests` في psql أو استخرجها من المشروع القديم.

3. **Migrations**: إذا كان لديك migrations أخرى في `supabase/migrations/`، قم بتنفيذها أيضاً بالترتيب.

4. **Storage Buckets**: إذا كنت تستخدم Storage، ستحتاج لإنشاء Buckets يدوياً:
   - Dashboard → **Storage** → **Buckets** → **New bucket**

5. **RLS Policies**: تأكد من تنفيذ جميع ملفات RLS Policies لتأمين الجداول.

6. **Testing**: اختبر كل Edge Function بعد النشر للتأكد من عملها.

---

## 🎯 الخطوة النهائية: تحديث Environment Variables

بعد نقل كل شيء، **يجب** تحديث جميع المتغيرات البيئية:

### 1. Frontend (`.env` أو `.env.local`):

```env
VITE_SUPABASE_URL=https://your-new-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key
```

### 2. Edge Functions Secrets (في Supabase Dashboard):

```env
SUPABASE_URL=https://your-new-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
```

### 3. Database Connection (إذا كنت تستخدم psql أو أدوات DB):

```env
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-new-project-id.supabase.co:5432/postgres
```

### 📍 أين تجد هذه القيم؟

**في Supabase Dashboard → Settings → API:**
- **Project URL** → `VITE_SUPABASE_URL` و `SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

**في Supabase Dashboard → Settings → Database:**
- **Connection string** → `SUPABASE_DB_URL`
  - نسخ **Connection string** أو **URI** (يحتوي على password)

---

## ✅ Checklist

- [ ] إضافة جميع Secrets في Edge Functions
- [ ] تنفيذ جميع ملفات SQL بالترتيب
- [ ] إنشاء/نقل جداول requests و offers (إذا لم تكن موجودة)
- [ ] نشر جميع Edge Functions
- [ ] التحقق من وجود جميع الجداول
- [ ] التحقق من وجود جميع Functions والـ Triggers
- [ ] إعداد Authentication Providers (Google, Apple, Phone)
- [ ] تفعيل Realtime للجداول المطلوبة (اختياري)
- [ ] تحديث Frontend بمفاتيح المشروع الجديد
- [ ] اختبار جميع Edge Functions
- [ ] اختبار Authentication flows
- [ ] اختبار إنشاء طلب جديد (اختبار كامل للنظام)

---

## 🆘 حل المشاكل

### مشكلة: خطأ في RLS Policies
- تأكد من تنفيذ `CREATE_RLS_POLICIES_V2.sql` بعد إنشاء الجداول

### مشكلة: Edge Function لا يعمل
- تحقق من Secrets
- تحقق من logs في Dashboard → Edge Functions → Function name → Logs

### مشكلة: Trigger لا يعمل
- تحقق من وجود Function المرتبطة
- تحقق من صحة الكود في SQL Editor

---

**تم إنشاء هذا الدليل بواسطة AI Assistant**
**تاريخ الإنشاء**: 2025-01-26
