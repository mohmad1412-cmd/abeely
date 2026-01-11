# دليل البدء السريع: نظام التقييمات والمراجعات

**التاريخ:** 2025-01-27  
**الميزة:** نظام التقييمات والمراجعات  
**الحالة:** ✅ مكتمل

---

## 1. نظرة عامة

هذا الدليل يوضح كيفية البدء في تنفيذ نظام التقييمات والمراجعات خطوة بخطوة.

---

## 2. المتطلبات الأساسية

### 2.1 التبعيات المطلوبة
- ✅ نظام إتمام الطلبات (`completeRequest` موجود)
- ✅ نظام الملفات الشخصية (`Profile.tsx` موجود)
- ✅ نظام الإشعارات (موجود)
- ✅ مكون `StarRating` (موجود)

### 2.2 الأدوات المطلوبة
- Supabase CLI (للتطوير المحلي)
- Node.js 18+
- TypeScript
- React 18+

---

## 3. خطوات التنفيذ

### الخطوة 1: إنشاء قاعدة البيانات (يوم 1)

#### 1.1 إنشاء Migration
```bash
cd supabase
supabase migration new create_reviews_system
```

#### 1.2 إضافة SQL
انسخ محتوى ملف `supabase/migrations/[timestamp]_create_reviews_system.sql` من `data-model.md`

#### 1.3 تطبيق Migration
```bash
supabase db push
```

#### 1.4 التحقق
```sql
-- التحقق من الجداول
SELECT * FROM reviews LIMIT 1;
SELECT * FROM user_ratings LIMIT 1;

-- التحقق من RLS
SELECT * FROM pg_policies WHERE tablename = 'reviews';
```

---

### الخطوة 2: إنشاء TypeScript Types (يوم 1)

#### 2.1 تحديث `types.ts`
أضف الـ interfaces من `data-model.md`:
- `Review`
- `UserRating`
- `CreateReviewInput`
- `UpdateReviewInput`
- `ReviewFilters`

---

### الخطوة 3: إنشاء Service Layer (يوم 2-3)

#### 3.1 إنشاء `services/reviewsService.ts`
انسخ الدوال من `contracts/reviews-service.md` وطبقها

#### 3.2 اختبار الدوال
```typescript
// اختبار إنشاء تقييم
const result = await createReview({...}, userId);
console.log(result);

// اختبار جلب المراجعات
const reviews = await getReviewsForUser(userId);
console.log(reviews);
```

---

### الخطوة 4: إنشاء Components (يوم 4-7)

#### 4.1 `components/ui/StarRatingInput.tsx`
- مكون لإدخال التقييم بالنجوم
- تفاعلي مع hover effects
- دعم RTL

#### 4.2 `components/ReviewForm.tsx`
- نموذج لإنشاء/تعديل تقييم
- استخدام `StarRatingInput`
- Validation شامل

#### 4.3 `components/ReviewCard.tsx`
- عرض مراجعة واحدة
- استخدام `StarRating` الموجود
- دعم RTL

#### 4.4 `components/ReviewsList.tsx`
- قائمة المراجعات مع pagination
- تصفية وترتيب
- دعم RTL

#### 4.5 `components/RatingStats.tsx`
- إحصائيات التقييمات
- رسم بياني للتوزيع
- دعم RTL

---

### الخطوة 5: التكامل (يوم 8-9)

#### 5.1 تحديث `components/Profile.tsx`
```typescript
// إضافة قسم المراجعات
<RatingStats userId={user.id} />
<ReviewsList userId={user.id} />
```

#### 5.2 تحديث `components/RequestDetail.tsx`
```typescript
// إضافة زر/قسم للتقييم بعد إكمال الطلب
{request.status === 'completed' && canReview && (
  <ReviewForm requestId={request.id} />
)}
```

#### 5.3 تحديث `components/Marketplace.tsx`
```typescript
// إضافة تصفية حسب التقييم
<FilterOption label="4+ نجوم" value="minRating:4" />
```

---

### الخطوة 6: الاختبار (يوم 10-11)

#### 6.1 Unit Tests
```bash
npm test -- reviewsService.test.ts
```

#### 6.2 Integration Tests
- اختبار التكامل مع Supabase
- اختبار RLS policies
- اختبار Triggers

#### 6.3 E2E Tests
- اختبار سيناريو إنشاء تقييم كامل
- اختبار سيناريو عرض المراجعات

---

### الخطوة 7: الإطلاق (يوم 12)

#### 7.1 مراجعة نهائية
- ✅ جميع المهام مكتملة
- ✅ جميع الاختبارات ناجحة
- ✅ لا توجد أخطاء

#### 7.2 النشر
```bash
# تطبيق migrations على الإنتاج
supabase db push --linked

# بناء المشروع
npm run build

# النشر
vercel deploy
```

---

## 4. أمثلة الكود

### 4.1 إنشاء تقييم من Component

```typescript
const handleSubmitReview = async () => {
  const result = await createReview(
    {
      requestId: request.id,
      revieweeId: revieweeId,
      rating: selectedRating,
      comment: commentText
    },
    currentUser.id
  );

  if (result.success) {
    toast.success("تم إنشاء التقييم بنجاح");
    // تحديث UI
  } else {
    toast.error(result.error);
  }
};
```

### 4.2 عرض المراجعات

```typescript
const { data: reviews, loading } = useReviewsForUser(userId, {
  minRating: 4,
  sortBy: 'newest',
  page: currentPage
});

return (
  <div>
    {reviews?.map(review => (
      <ReviewCard key={review.id} review={review} />
    ))}
  </div>
);
```

---

## 5. نصائح وحيل

### 5.1 الأداء
- استخدم pagination دائماً
- استخدم `user_ratings` بدلاً من حساب الإحصائيات في كل مرة
- استخدم indexes بشكل صحيح

### 5.2 الأمان
- تحقق دائماً من RLS policies
- تحقق من صحة البيانات على Client و Server
- استخدم validation شامل

### 5.3 تجربة المستخدم
- أضف loading states
- أضف error handling
- أضف success messages
- استخدم animations سلسة

---

## 6. استكشاف الأخطاء

### 6.1 مشكلة: التقييم لا يُنشأ
**الحل:**
- تحقق من أن الطلب في حالة `completed`
- تحقق من أن المستخدم مشارك في الطلب
- تحقق من RLS policies

### 6.2 مشكلة: الإحصائيات غير محدثة
**الحل:**
- تحقق من Trigger `trigger_update_user_ratings`
- تحقق من Function `update_user_ratings()`

### 6.3 مشكلة: التعديل لا يعمل
**الحل:**
- تحقق من أن الوقت < 24 ساعة
- تحقق من أن المستخدم هو منشئ التقييم

---

## 7. المراجع

- [research.md](./research.md) - البحث والتحليل
- [data-model.md](./data-model.md) - نموذج البيانات
- [contracts/reviews-service.md](./contracts/reviews-service.md) - عقد API
- [tasks.md](./tasks.md) - قائمة المهام التفصيلية

---

**آخر تحديث:** 2025-01-27  
**الحالة:** ✅ مكتمل
