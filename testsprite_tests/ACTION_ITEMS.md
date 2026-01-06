# 📋 Action Items - TestSprite Testing

## 🔴 Critical - يجب إصلاحها قبل الاختبار

### 1. إزالة/تنظيم Console Statements
**الملفات المتأثرة:** 15+ ملف
**الحل:** استخدم `utils/logger.ts` الذي تم إنشاؤه

**خطوات التنفيذ:**
1. استبدل `console.log` بـ `logger.log`
2. استبدل `console.error` بـ `logger.error`
3. استبدل `console.warn` بـ `logger.warn`

**أمثلة:**
```typescript
// قبل
console.error('خطأ في حفظ الاسم:', error);

// بعد
import { logger } from '../utils/logger';
logger.error('خطأ في حفظ الاسم', error, 'Settings');
```

**الملفات ذات الأولوية:**
- `components/Settings.tsx`
- `components/RequestDetail.tsx`
- `components/CreateRequestV2.tsx`
- `components/Marketplace.tsx`
- `components/Messages.tsx`

---

### 2. تحسين Error Handling
**الحل المطلوب:**
- إنشاء Error Boundary شامل
- إضافة toast notifications للأخطاء
- تحسين رسائل الخطأ

**خطوات التنفيذ:**
1. مراجعة جميع try-catch blocks
2. إضافة error notifications للمستخدم
3. تحسين error messages

---

### 3. إصلاح Supabase Client
**الملف:** `services/supabaseClient.ts`

**الحل:**
```typescript
if (!isValidUrl || !isValidKey) {
  if (import.meta.env.PROD) {
    throw new Error('Supabase configuration is missing. Please contact support.');
  }
  console.warn('⚠️ Supabase client initialized with empty values.');
}
```

---

## 🟡 Medium Priority

### 4. Test Phone Logic
**الملف:** `services/authService.ts`

**الحل:** نقل منطق الاختبار إلى ملف منفصل أو إضافة flag

---

## ✅ ما تم إنجازه

1. ✅ إنشاء `utils/logger.ts` - Logger utility جاهز للاستخدام
2. ✅ إنشاء `testsprite_tests/TEST_REPORT.md` - تقرير شامل
3. ✅ إنشاء `testsprite_tests/ACTION_ITEMS.md` - هذا الملف

---

## 📝 Checklist

### قبل البدء في الاختبار:

- [ ] استبدال console statements بـ logger
- [ ] تحسين error handling
- [ ] إصلاح Supabase client
- [ ] مراجعة TODO comments
- [ ] المشروع يعمل على localhost:3005
- [ ] جميع environment variables موجودة

---

**الوقت المتوقع لإصلاح Critical Issues:** 3-4 ساعات

