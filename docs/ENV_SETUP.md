# إعداد ملف .env - Quick Setup

## الملف المطلوب

أنشئ ملف اسمه `.env` في جذر المشروع (نفس مكان `package.json`)

## محتوى الملف

افتح ملف `.env` وأضف التالي:

```env
VITE_GEMINI_API_KEY=ضع_مفتاح_gemini_هنا
VITE_SUPABASE_URL=ضع_رابط_supabase_هنا
VITE_SUPABASE_ANON_KEY=ضع_مفتاح_supabase_هنا
```

## كيفية الحصول على المفاتيح

### 1. Gemini API Key
1. اذهب إلى: https://makersuite.google.com/app/apikey
2. سجّل دخول بحساب Google
3. اضغط "Create API Key"
4. انسخ المفتاح وضعه في `.env` مكان `VITE_GEMINI_API_KEY`

### 2. Supabase Keys
1. اذهب إلى: https://supabase.com
2. أنشئ مشروع جديد أو افتح مشروع موجود
3. اذهب إلى Settings → API
4. انسخ:
   - **Project URL** → ضعه في `VITE_SUPABASE_URL`
   - **anon/public key** → ضعه في `VITE_SUPABASE_ANON_KEY`

## بعد الإعداد

1. **أعد تشغيل الخادم**: أوقف `npm run dev` واضغط Ctrl+C ثم شغّله مرة أخرى
2. **تحقق من Console**: افتح F12 وتحقق من عدم وجود أخطاء
3. **جرب إنشاء طلب**: إذا كان كل شيء صحيح، سيعمل الذكاء الاصطناعي

## ملاحظات

- ملف `.env` موجود في `.gitignore` - لن يتم رفعه للـ Git
- لا تشارك مفتاح API مع أحد
- إذا ظهر خطأ "quota exceeded"، يعني تجاوز الحد المجاني - تحتاج ترقية الحساب

