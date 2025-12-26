# 📋 دليل الاختبار الشامل

## 🎯 الهدف
التحقق من أن جميع الـ Functions والـ Triggers تعمل بشكل صحيح بعد تطبيق إصلاحات الأمان.

---

## 📝 الخطوات خطوة بخطوة

### **الخطوة 1: فتح Supabase SQL Editor**
1. افتح [Supabase Dashboard](https://app.supabase.com)
2. اختر مشروعك
3. اذهب إلى **SQL Editor** من القائمة الجانبية
4. اضغط **New Query**

---

### **الخطوة 2: تشغيل ملف الاختبار**
1. افتح ملف `supabase/TEST_FUNCTIONS.sql`
2. انسخ المحتوى بالكامل
3. الصقه في Supabase SQL Editor
4. اضغط **Run** (أو F5)

---

### **الخطوة 3: فحص النتائج**

#### ✅ **النتيجة المتوقعة للخطوة 1:**
```
routine_name                    | routine_type | security_type
-------------------------------|--------------|---------------
get_unread_interests_count     | FUNCTION     | DEFINER
get_unread_notifications_count | FUNCTION     | DEFINER
mark_all_notifications_read    | FUNCTION     | DEFINER
mark_notification_read         | FUNCTION     | DEFINER
mark_request_read              | FUNCTION     | DEFINER
mark_request_viewed            | FUNCTION     | DEFINER
notify_on_new_interest_request | FUNCTION     | INVOKER
notify_on_new_message          | FUNCTION     | INVOKER
notify_on_new_offer            | FUNCTION     | INVOKER
notify_on_offer_accepted       | FUNCTION     | INVOKER
update_conversation_on_message  | FUNCTION     | INVOKER
```

**إذا رأيت جميع الـ functions = ✅ نجح**
**إذا أي function مفقود = ❌ راجع FIX_SECURITY_WARNINGS.sql**

---

#### ✅ **النتيجة المتوقعة للخطوة 2:**
في نتائج الخطوة 2، ابحث في عمود `function_definition` عن:
```
SET search_path = public
```

**يجب أن يظهر في كل function يستخدم SECURITY DEFINER**

**إذا ظهر في كل function = ✅ نجح**
**إذا أي function بدون SET search_path = ❌ راجع FIX_SECURITY_WARNINGS.sql**

---

#### ✅ **النتيجة المتوقعة للخطوة 3:**
```
test_result | unread_count | unread_notifications | marked_count
------------|--------------|---------------------|-------------
false       | 0            | 0                   | 0
```

**إذا لم تظهر أخطاء = ✅ نجح**
**إذا ظهرت أخطاء = ❌ راجع رسالة الخطأ**

---

#### ✅ **النتيجة المتوقعة للخطوة 4:**
```
trigger_name                          | event_object_table | event_manipulation
--------------------------------------|-------------------|-------------------
trigger_notify_on_new_offer          | offers            | INSERT
trigger_notify_on_offer_accepted     | offers            | UPDATE
trigger_notify_on_new_message         | messages          | INSERT
trigger_notify_on_new_interest_request| requests          | INSERT
trigger_update_conversation_on_message | messages          | INSERT
```

**إذا رأيت جميع الـ triggers = ✅ نجح**
**إذا أي trigger مفقود = ❌ راجع CREATE_FUNCTIONS_AND_TRIGGERS_V2.sql**

---

#### ✅ **النتيجة المتوقعة للخطوة 5:**
يجب أن ترى policies لكل جدول:
- `request_views`: SELECT, INSERT, UPDATE
- `notifications`: SELECT, INSERT, UPDATE, DELETE
- `conversations`: SELECT, INSERT, UPDATE
- `messages`: SELECT, INSERT, UPDATE

**إذا رأيت policies لكل جدول = ✅ نجح**
**إذا أي جدول بدون policies = ❌ راجع CREATE_RLS_POLICIES_V2.sql**

---

#### ✅ **النتيجة المتوقعة للخطوة 6:**
```
pubname            | tablename
-------------------|----------
supabase_realtime  | conversations
supabase_realtime  | messages
supabase_realtime  | notifications
supabase_realtime  | request_views
supabase_realtime  | requests
```

**إذا رأيت جميع الجداول = ✅ نجح**
**إذا أي جدول مفقود = ❌ شغّل:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE [table_name];
```

---

### **الخطوة 4: اختبار من التطبيق**

#### **اختبار 1: تتبع المشاهدة**
1. افتح التطبيق
2. اذهب إلى **السوق** (Marketplace)
3. اضغط على أي طلب
4. افتح **Supabase Dashboard > Table Editor > request_views**
5. يجب أن ترى سجل جديد مع `viewed_at` = الوقت الحالي

**✅ إذا ظهر السجل = نجح**
**❌ إذا لم يظهر = راجع `requestViewsService.ts`**

---

#### **اختبار 2: تتبع القراءة**
1. في نفس الطلب من الاختبار السابق
2. مرّر لأسفل حتى تصل 50% من المحتوى
3. افتح **Supabase Dashboard > Table Editor > request_views**
4. يجب أن ترى `is_read = true` و `read_at` = الوقت الحالي

**✅ إذا تم التحديث = نجح**
**❌ إذا لم يتم التحديث = راجع `requestViewsService.ts`**

---

#### **اختبار 3: عداد الاهتمامات**
1. افتح التطبيق
2. اذهب إلى **السوق** (Marketplace)
3. اضغط على **اهتماماتي**
4. يجب أن ترى رقم بجانب الزر (عدد الطلبات غير المقروءة)

**✅ إذا ظهر الرقم = نجح**
**❌ إذا لم يظهر = راجع `App.tsx` و `requestViewsService.ts`**

---

#### **اختبار 4: الإشعارات**
1. افتح التطبيق
2. اذهب إلى **الإشعارات**
3. يجب أن ترى قائمة بالإشعارات (إن وجدت)

**✅ إذا ظهرت القائمة = نجح**
**❌ إذا ظهرت أخطاء = راجع `notificationsService.ts`**

---

#### **اختبار 5: إنشاء عرض (اختبار Trigger)**
1. افتح أي طلب
2. املأ بيانات العرض
3. اضغط **إرسال العرض**
4. افتح **Supabase Dashboard > Table Editor > notifications**
5. يجب أن ترى إشعار جديد للمستخدم صاحب الطلب

**✅ إذا ظهر الإشعار = نجح**
**❌ إذا لم يظهر = راجع `notify_on_new_offer` trigger**

---

### **الخطوة 5: التحقق من Security Advisor**

1. في Supabase Dashboard
2. اذهب إلى **Database > Security Advisor**
3. يجب أن تختفي (أو تقل) التحذيرات المتعلقة بـ `function_search_path_mutable`

**✅ إذا اختفت التحذيرات = نجح**
**❌ إذا بقيت = راجع FIX_SECURITY_WARNINGS.sql**

---

## 🐛 حل المشاكل الشائعة

### **مشكلة: Function غير موجود**
**الحل:**
```sql
-- شغّل FIX_SECURITY_WARNINGS.sql مرة أخرى
```

---

### **مشكلة: Trigger غير موجود**
**الحل:**
```sql
-- شغّل CREATE_FUNCTIONS_AND_TRIGGERS_V2.sql
```

---

### **مشكلة: RLS Policy غير موجود**
**الحل:**
```sql
-- شغّل CREATE_RLS_POLICIES_V2.sql
```

---

### **مشكلة: Realtime غير مفعّل**
**الحل:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
ALTER PUBLICATION supabase_realtime ADD TABLE request_views;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

---

### **مشكلة: Function يرجع خطأ**
**الحل:**
1. افتح **Supabase Dashboard > Logs > Postgres Logs**
2. ابحث عن رسالة الخطأ
3. راجع الـ function في FIX_SECURITY_WARNINGS.sql
4. تأكد من أن الجداول موجودة والـ columns صحيحة

---

## ✅ قائمة التحقق النهائية

- [ ] جميع الـ Functions موجودة
- [ ] جميع الـ Functions لديها `SET search_path = public`
- [ ] جميع الـ Functions تعمل بدون أخطاء
- [ ] جميع الـ Triggers موجودة
- [ ] جميع الـ RLS Policies موجودة
- [ ] Realtime مفعّل على جميع الجداول
- [ ] تتبع المشاهدة يعمل في التطبيق
- [ ] تتبع القراءة يعمل في التطبيق
- [ ] عداد الاهتمامات يعمل في التطبيق
- [ ] الإشعارات تعمل في التطبيق
- [ ] Triggers تعمل عند إنشاء عرض
- [ ] Security Advisor لا يظهر تحذيرات

---

## 📞 إذا واجهت مشكلة

1. افتح **Supabase Dashboard > Logs > Postgres Logs**
2. انسخ رسالة الخطأ
3. راجع الملفات التالية حسب نوع المشكلة:
   - Functions: `FIX_SECURITY_WARNINGS.sql`
   - Triggers: `CREATE_FUNCTIONS_AND_TRIGGERS_V2.sql`
   - RLS: `CREATE_RLS_POLICIES_V2.sql`
   - Realtime: `ENABLE_REALTIME_FOR_REQUESTS.sql`

---

## 🎉 النجاح!

إذا أكملت جميع الخطوات بنجاح، فأنت جاهز للمتابعة! 🚀

