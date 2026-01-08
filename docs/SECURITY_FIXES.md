# إصلاحات الأمان - Security Fixes

## نظرة عامة

تم إصلاح جميع التحذيرات الأمنية التي ظهرت في Supabase Advisors. هذا المستند يشرح المشاكل والحلول.

---

## التحذيرات التي تم إصلاحها

### 1. Function Search Path Mutable (5 دوال)

**المشكلة:**
- الدوال بدون `SET search_path` معرضة لـ SQL injection attacks
- المهاجم يمكنه تغيير `search_path` وتنفيذ كود خبيث

**الدوال التي تم إصلاحها:**
- `find_similar_categories`
- `suggest_new_category`
- `ensure_request_has_category`
- `auto_assign_unspecified_category`
- `get_categories_for_ai`

**الحل:**
تم إضافة `SET search_path = public` لجميع الدوال.

```sql
CREATE OR REPLACE FUNCTION function_name(...)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public  -- ✅ تم إضافته
AS $$ ... $$;
```

---

### 2. RLS Policy Always True (8 policies)

**المشكلة:**
- بعض الـ RLS policies تستخدم `USING (true)` أو `WITH CHECK (true)`
- هذا يعني أن أي شخص يمكنه الوصول للبيانات بدون قيود
- يلغي فائدة Row Level Security تماماً

**الـ Policies التي تم إصلاحها:**

#### أ. `pending_categories` - "Service role can manage pending categories"
- **قبل:** `USING (TRUE) WITH CHECK (TRUE)` - أي شخص يمكنه التعديل
- **بعد:** يسمح فقط للـ `service_role`

#### ب. `request_view_logs` - "Anyone can log views via function"
- **قبل:** `WITH CHECK (TRUE)` - أي شخص يمكنه إضافة سجلات
- **بعد:** يسمح فقط للمستخدمين المسجلين أو عبر الدالة

#### ج. `requests` - "Authenticated can create requests"
- **قبل:** `WITH CHECK (true)` - أي شخص مسجل يمكنه إنشاء أي طلب
- **بعد:** يجب أن يكون `author_id = auth.uid()`

#### د. `requests` - "anon_insert_requests"
- **قبل:** `WITH CHECK (true)` - أي زائر يمكنه إنشاء طلبات
- **بعد:** تم استبداله بـ "Guests can create guest requests" مع قيود:
  - يجب أن يكون `is_guest_request = TRUE`
  - يجب أن يكون `contact_phone_verified = TRUE`

#### هـ. `reviews` - "Users can create their own reviews"
- **قبل:** `WITH CHECK (true)` - أي شخص يمكنه إنشاء reviews
- **بعد:** يجب أن يكون `author_id = auth.uid()`

#### و. `reviews` - "Users can update their own reviews"
- **قبل:** `USING (true) WITH CHECK (true)` - أي شخص يمكنه تحديث أي review
- **بعد:** يمكن التحديث فقط إذا كان `author_id = auth.uid()`

#### ز. `reviews` - "Users can delete their own reviews"
- **قبل:** `USING (true)` - أي شخص يمكنه حذف أي review
- **بعد:** يمكن الحذف فقط إذا كان `author_id = auth.uid()`

#### ح. `verified_guests` - "Guests can create verified guest records"
- **قبل:** `WITH CHECK (true)` - أي شخص يمكنه إنشاء سجلات
- **بعد:** قيود على البيانات:
  - `phone IS NOT NULL AND LENGTH(phone) >= 10`
  - `verification_code IS NOT NULL AND LENGTH(verification_code) >= 4`
  - `code_expires_at > NOW()`

---

### 3. Leaked Password Protection Disabled

**المشكلة:**
- Supabase Auth لا يتحقق من كلمات المرور المسربة
- المستخدمون يمكنهم استخدام كلمات مرور معروفة في قواعد البيانات المسربة

**الحل:**
يجب تفعيل هذه الميزة من Supabase Dashboard:

1. اذهب إلى **Authentication** → **Policies**
2. ابحث عن **Password Security**
3. فعّل **Leaked Password Protection**
4. سيتم التحقق من كلمات المرور ضد قاعدة بيانات HaveIBeenPwned.org

**ملاحظة:** هذه الميزة متاحة فقط في Supabase Dashboard وليس في `config.toml` للتطوير المحلي.

---

## كيفية التحقق من الإصلاحات

### 1. التحقق من Function Search Path

```sql
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'find_similar_categories',
    'suggest_new_category',
    'ensure_request_has_category',
    'auto_assign_unspecified_category',
    'get_categories_for_ai'
  );
```

يجب أن ترى `SET search_path = public` في التعريف.

### 2. التحقق من RLS Policies

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN (
  'pending_categories',
  'request_view_logs',
  'requests',
  'reviews',
  'verified_guests'
)
ORDER BY tablename, policyname;
```

يجب ألا ترى `USING (true)` أو `WITH CHECK (true)` في أي policy.

### 3. التحقق من Advisors

استخدم MCP Supabase:

```typescript
// في Cursor مع MCP
mcp_supabase_get_advisors({ type: "security" })
```

يجب ألا تظهر أي تحذيرات أمنية.

---

## الملفات المعدلة

- `supabase/migrations/fix_security_warnings.sql` - Migration شامل لجميع الإصلاحات
- `docs/SECURITY_FIXES.md` - هذا الملف (التوثيق)

---

## ملاحظات مهمة

1. **اختبار التطبيق:** بعد تطبيق الإصلاحات، تأكد من أن التطبيق يعمل بشكل صحيح
2. **التراجع:** إذا واجهت مشاكل، يمكنك التراجع عن الـ migration
3. **النسخ الاحتياطي:** دائماً قم بعمل backup قبل تطبيق migrations أمنية

---

## المراجع

- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/security)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Function Security](https://supabase.com/docs/guides/database/functions#security)
- [Password Security](https://supabase.com/docs/guides/auth/password-security)

