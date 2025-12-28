# دليل إعداد نظام المصادقة

هذا الدليل يشرح كيفية إعداد نظام المصادقة والتسجيل في المشروع.

## الملفات المُنشأة

1. **AUTH_SCHEMA.sql** - إنشاء جداول `profiles` و `verified_guests`
2. **AUTH_TRIGGERS.sql** - Triggers لإنشاء profiles تلقائياً عند التسجيل
3. **AUTH_RLS_POLICIES.sql** - RLS policies للأمان
4. **AUTH_SETUP_COMPLETE.sql** - ملف شامل لتنفيذ كل شيء مرة واحدة

## خطوات التنفيذ

### الطريقة السريعة (موصى بها)

شغّل الملف الشامل مرة واحدة:

```sql
-- في Supabase SQL Editor أو psql
\i supabase/AUTH_SETUP_COMPLETE.sql
```

أو انسخ محتوى الملف والصقه في Supabase Dashboard > SQL Editor.

### الطريقة التدريجية

إذا كنت تريد تنفيذ الملفات بشكل منفصل:

1. **إنشاء الجداول:**
   ```sql
   \i supabase/AUTH_SCHEMA.sql
   ```

2. **إضافة Triggers:**
   ```sql
   \i supabase/AUTH_TRIGGERS.sql
   ```

3. **إضافة RLS Policies:**
   ```sql
   \i supabase/AUTH_RLS_POLICIES.sql
   ```

## إعداد OAuth Providers

### Google OAuth

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. اذهب إلى **APIs & Services > Credentials**
4. أنشئ **OAuth 2.0 Client ID**
5. أضف Redirect URIs:
   - `http://127.0.0.1:54321/auth/v1/callback` (للتنمية المحلية)
   - `https://your-project.supabase.co/auth/v1/callback` (للإنتاج)
6. انسخ `Client ID` و `Client Secret`
7. أضفهم كمتغيرات بيئية في Supabase:
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`

### Apple OAuth

1. اذهب إلى [Apple Developer Portal](https://developer.apple.com/)
2. أنشئ **Services ID** جديد
3. فعّل **Sign in with Apple**
4. أضف Redirect URIs (نفس Google)
5. أنشئ **Key** جديد وانسخ `Key ID` و `Team ID`
6. أضفهم كمتغيرات بيئية:
   - `SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID` (Services ID)
   - `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET` (Private Key)

## إعداد SMS (Twilio)

1. سجّل في [Twilio](https://www.twilio.com/)
2. احصل على `Account SID` و `Auth Token`
3. أضفهم كمتغيرات بيئية:
   - `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN`
4. في `config.toml`، أضف:
   ```toml
   [auth.sms.twilio]
   enabled = true
   account_sid = "your_account_sid"
   message_service_sid = "your_service_sid"
   ```

## التحقق من الإعداد

بعد التنفيذ، تحقق من:

1. **الجداول موجودة:**
   ```sql
   SELECT * FROM profiles LIMIT 1;
   SELECT * FROM verified_guests LIMIT 1;
   ```

2. **Triggers تعمل:**
   - سجّل مستخدم جديد وتحقق من إنشاء profile تلقائياً

3. **RLS Policies مفعلة:**
   ```sql
   SELECT tablename, policyname FROM pg_policies 
   WHERE schemaname = 'public' 
   AND tablename IN ('profiles', 'verified_guests');
   ```

## الميزات المُضافة

### في authService.ts

- ✅ معالجة أخطاء محسّنة مع رسائل واضحة
- ✅ إنشاء profile تلقائياً إذا لم يكن موجوداً
- ✅ وظيفة `ensureProfileExists()` للتحقق من وجود profile
- ✅ وظيفة `checkProfileExists()` للتحقق السريع
- ✅ استخدام دالة قاعدة البيانات `verify_guest_phone()` للتحقق من الضيوف
- ✅ تحسين معالجة OAuth redirect URLs

### في قاعدة البيانات

- ✅ جدول `profiles` مع جميع الحقول المطلوبة
- ✅ جدول `verified_guests` للضيوف
- ✅ Triggers تلقائية لإنشاء profiles عند التسجيل
- ✅ RLS policies للأمان
- ✅ Functions مساعدة: `create_profile_for_user()`, `verify_guest_phone()`, `clean_expired_guest_records()`

## ملاحظات مهمة

1. **للإنتاج:** تأكد من إزالة `console.log` الذي يعرض رمز التحقق للضيوف
2. **الأمان:** جميع RLS policies مفعلة - تأكد من اختبارها
3. **البيئة:** تأكد من وجود المتغيرات البيئية المطلوبة
4. **النسخ الاحتياطي:** احتفظ بنسخة احتياطية قبل التنفيذ

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من سجلات Supabase
2. تأكد من صلاحيات قاعدة البيانات
3. راجع ملفات SQL للتأكد من عدم وجود أخطاء

