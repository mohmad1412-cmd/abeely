# إعداد المشروع - Setup Guide

## المتطلبات (Requirements)

### 1. Google Gemini API
- اذهب إلى: https://makersuite.google.com/app/apikey
- أنشئ مفتاح API جديد
- ضع المفتاح في ملف `.env` كـ `VITE_GEMINI_API_KEY`

### 2. Supabase Database
- أنشئ مشروع جديد على: https://supabase.com
- احصل على:
  - `VITE_SUPABASE_URL` (Project URL)
  - `VITE_SUPABASE_ANON_KEY` (anon/public key)
- ضعها في ملف `.env`

### 3. إنشاء جداول Supabase

قم بتشغيل هذه الاستعلامات في SQL Editor في Supabase:

```sql
-- جدول الطلبات
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'assigned', 'completed', 'archived')),
  is_public BOOLEAN DEFAULT true,
  budget_min TEXT,
  budget_max TEXT,
  budget_type TEXT CHECK (budget_type IN ('not-specified', 'negotiable', 'fixed')),
  location TEXT,
  delivery_type TEXT CHECK (delivery_type IN ('immediate', 'range', 'not-specified')),
  delivery_from TEXT,
  delivery_to TEXT,
  seriousness INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الفئات
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول ربط الطلبات بالفئات
CREATE TABLE IF NOT EXISTS request_categories (
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, category_id)
);

-- جدول العروض
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES auth.users(id),
  provider_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price TEXT,
  delivery_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'negotiating', 'completed', 'archived')),
  is_negotiable BOOLEAN DEFAULT true,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل Row Level Security (RLS)
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_categories ENABLE ROW LEVEL SECURITY;

-- Policies للطلبات (يمكن للجميع قراءة الطلبات العامة)
CREATE POLICY "Anyone can view public requests" ON requests
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert their own requests" ON requests
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own requests" ON requests
  FOR UPDATE USING (auth.uid() = author_id);

-- Policies للعروض
CREATE POLICY "Anyone can view offers" ON offers
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own offers" ON offers
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Users can update their own offers" ON offers
  FOR UPDATE USING (auth.uid() = provider_id);

-- Policies للفئات
CREATE POLICY "Anyone can view categories" ON categories
  FOR SELECT USING (true);

-- Policies لربط الفئات
CREATE POLICY "Anyone can view request categories" ON request_categories
  FOR SELECT USING (true);
```

## ⚠️ مهم: إصلاح سياسات RLS للسماح للضيوف برؤية الطلبات

إذا كان الضيوف (غير المسجلين) **لا يرون الطلبات** في التطبيق، شغّل هذا الملف في Supabase SQL Editor:

```
supabase/FIX_REQUESTS_RLS_FOR_GUESTS.sql
```

هذا الملف يُنشئ سياسة RLS تسمح للجميع (حتى بدون تسجيل دخول) بقراءة الطلبات العامة (`is_public = true`).

## ملاحظة مهمة: وضع الضيف (Guest Mode)

حالياً — ومع سياسة RLS أعلاه — **لا يمكن إنشاء/نشر طلبات في Supabase بدون تسجيل دخول** لأن سياسة الإدخال تتحقق من `auth.uid() = author_id`.

- ✅ **الضيوف يمكنهم رؤية الطلبات العامة** (بعد تطبيق السياسات أعلاه)
- ❌ **الضيوف لا يمكنهم إنشاء طلبات أو تقديم عروض** إلا بعد تسجيل الدخول

> ملاحظة: واجهة التطبيق قد تحتوي على تحقق جوال للضيف، لكنه **لا ينشئ جلسة Supabase Auth** تلقائياً ما لم تستخدم Phone OTP الخاص بـ Supabase.

### 4. إنشاء ملف .env

انسخ `.env.example` إلى `.env` واملأ القيم:

```bash
cp .env.example .env
```

ثم عدّل ملف `.env` وأضف القيم الحقيقية.

### 4. إنشاء ملف .env

أنشئ ملف `.env` في جذر المشروع وأضف المتغيرات التالية:

```env
# Google Gemini AI API Key
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration
VITE_SUPABASE_URL=hhttps://iwfvlrtmbixequntufjr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3ZnZscnRtYml4ZXF1bnR1ZmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzMxMjcsImV4cCI6MjA4MjAwOTEyN30.NCgLu7sP87odD-W3JW8Gp_6BTcI3w4VFgBhskZ5D0RA
     ```

## التحقق من الاتصال

بعد إعداد المتغيرات:

1. **شغّل التطبيق**: `npm run dev`
2. **افتح المتصفح**: سترى شريط تحذيري في الأعلى إذا كان هناك مشاكل في الاتصال
3. **افتح Console**: اضغط F12 وتحقق من وجود أخطاء
4. **جرب إنشاء طلب**: إذا كان كل شيء متصل، سيتم حفظ الطلب في Supabase

## ملاحظات مهمة

### الذكاء الاصطناعي (Gemini)
- ✅ الآن يستخدم **Gemini 2.0 Flash** - أحدث نموذج من Google
- ✅ **ذكي ومرن** - يفهم السياق ويسأل أسئلة توضيحية ذكية
- ✅ **لا يختلق معلومات** - يستخدم فقط ما يذكره المستخدم
- ✅ **يفهم اللغة العربية** بشكل ممتاز

### قاعدة البيانات (Supabase)
- ✅ جميع الطلبات تُحفظ في Supabase (ليست وهمية)
- ✅ جميع العروض تُحفظ في Supabase
- ✅ البيانات تُجلب من Supabase عند فتح التطبيق
- ✅ تأكد من تفعيل Authentication في Supabase
- ✅ تأكد من أن RLS Policies صحيحة

### ما تم تغييره
- ❌ **إزالة البيانات الوهمية** - لا مزيد من MOCK_REQUESTS
- ✅ **استخدام بيانات حقيقية** من Supabase
- ✅ **الذكاء الاصطناعي ذكي** - يسأل أسئلة توضيحية قبل إنشاء المسودة
- ✅ **فحص الاتصال تلقائياً** - يظهر تحذير إذا كان هناك مشاكل

## استكشاف الأخطاء

### مشكلة: "Supabase not connected"
- تحقق من `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` في ملف `.env`
- تأكد من أن الجداول موجودة في Supabase
- تحقق من RLS Policies

### مشكلة: "AI not connected"
- تحقق من `VITE_GEMINI_API_KEY` في ملف `.env`
- تأكد من أن المفتاح صحيح وليس منتهي الصلاحية
- تحقق من اتصال الإنترنت

### مشكلة: البيانات لا تظهر
- تحقق من Console للأخطاء
- تأكد من أن المستخدم مسجل دخول (إذا كنت تستخدم Authentication)
- تحقق من RLS Policies تسمح بالقراءة
