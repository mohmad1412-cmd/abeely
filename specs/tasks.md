# قائمة المهام: نظام التقييمات والمراجعات

**التاريخ:** 2025-01-27  
**الميزة:** نظام التقييمات والمراجعات  
**الحالة:** ✅ مكتمل  
**المدة المتوقعة:** 3-4 أسابيع

---

## نظرة عامة

هذه قائمة المهام التفصيلية لتنفيذ نظام التقييمات والمراجعات. تم تنظيم المهام حسب المراحل والأولويات.

---

## المرحلة 0: البحث والتحليل ✅

**الحالة:** ✅ مكتمل  
**المدة:** 2 أيام  
**الملفات المخرجة:**
- ✅ `specs/research.md` - تحليل النظام الحالي والمتطلبات

### المهام المكتملة:
- [x] تحليل النظام الحالي لقبول العروض وإكمال الطلبات
- [x] تحديد المشاكل والثغرات في النظام الحالي
- [x] مراجعة قاعدة البيانات والـ RLS policies
- [x] تحديد التغييرات المطلوبة في قاعدة البيانات
- [x] مراجعة المواصفات والتحقق من الاتساق

---

## المرحلة 1: قاعدة البيانات والـ Backend

**الحالة:** ⏳ قيد الانتظار  
**المدة:** 3-4 أيام  
**الأولوية:** عالية

### المهمة 1.1: إنشاء جدول `reviews`

**الملفات:**
- `supabase/migrations/[timestamp]_create_reviews_table.sql`

**المهام:**
- [ ] إنشاء جدول `reviews` مع جميع الأعمدة المطلوبة
- [ ] إضافة constraints (UNIQUE, CHECK)
- [ ] إضافة indexes للأداء
- [ ] إضافة foreign keys مع CASCADE
- [ ] اختبار الجدول

**SQL المطلوب:**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(request_id, reviewer_id)
);

CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_request_id ON reviews(request_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
```

**المعايير:**
- ✅ الجدول موجود ويعمل بشكل صحيح
- ✅ جميع constraints مطبقة
- ✅ جميع indexes موجودة
- ✅ Foreign keys تعمل بشكل صحيح

---

### المهمة 1.2: إنشاء جدول `user_ratings`

**الملفات:**
- `supabase/migrations/[timestamp]_create_user_ratings_table.sql`

**المهام:**
- [ ] إنشاء جدول `user_ratings`
- [ ] إنشاء function `update_user_ratings()`
- [ ] إنشاء trigger لتحديث الإحصائيات تلقائياً
- [ ] اختبار التحديث التلقائي

**SQL المطلوب:**
```sql
CREATE TABLE user_ratings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  average_rating NUMERIC(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  five_star_count INTEGER DEFAULT 0,
  four_star_count INTEGER DEFAULT 0,
  three_star_count INTEGER DEFAULT 0,
  two_star_count INTEGER DEFAULT 0,
  one_star_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_user_ratings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_ratings (...)
  SELECT ... FROM reviews
  WHERE reviewee_id = COALESCE(NEW.reviewee_id, OLD.reviewee_id)
  GROUP BY reviewee_id
  ON CONFLICT (user_id) DO UPDATE SET ...;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_ratings
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ratings();
```

**المعايير:**
- ✅ الجدول موجود ويعمل
- ✅ Function تعمل بشكل صحيح
- ✅ Trigger يحدث الإحصائيات تلقائياً
- ✅ الاختبارات ناجحة

---

### المهمة 1.3: إضافة RLS Policies

**الملفات:**
- `supabase/migrations/[timestamp]_add_reviews_rls.sql`

**المهام:**
- [ ] تفعيل RLS على جدول `reviews`
- [ ] إضافة policy للقراءة (الجميع يمكنهم القراءة)
- [ ] إضافة policy للإنشاء (فقط المشاركون في الطلب المكتمل)
- [ ] إضافة policy للتعديل (فقط خلال 24 ساعة)
- [ ] إضافة policy للحذف (فقط منشئ التقييم)
- [ ] اختبار جميع الـ policies

**المعايير:**
- ✅ جميع policies مطبقة
- ✅ الاختبارات ناجحة
- ✅ الأمان محقق

---

## المرحلة 2: TypeScript Types و Services

**الحالة:** ⏳ قيد الانتظار  
**المدة:** 2-3 أيام  
**الأولوية:** عالية

### المهمة 2.1: تحديث Types

**الملفات:**
- `types.ts`

**المهام:**
- [ ] تحديث interface `Review` حسب المواصفات
- [ ] إضافة interface `UserRating`
- [ ] إضافة types للـ inputs (CreateReviewInput, UpdateReviewInput)
- [ ] إضافة types للـ filters (ReviewFilters)

**الكود المطلوب:**
```typescript
export interface Review {
  id: string;
  requestId: string;
  reviewerId: string;
  revieweeId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: Date;
  updatedAt?: Date;
  requestTitle?: string;
  requestStatus?: string;
}

export interface UserRating {
  userId: string;
  averageRating: number; // 0.00 - 5.00
  totalReviews: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  updatedAt: Date;
}

export type CreateReviewInput = {
  requestId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment?: string; // 10-1000 characters
};

export type UpdateReviewInput = {
  rating?: number; // 1-5
  comment?: string; // 10-1000 characters
};

export type ReviewFilters = {
  minRating?: number; // 1-5
  maxRating?: number; // 1-5
  searchQuery?: string;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest';
  page?: number;
  pageSize?: number; // default: 10
};
```

**المعايير:**
- ✅ جميع types موجودة
- ✅ TypeScript strict mode يعمل بدون أخطاء
- ✅ Types متوافقة مع قاعدة البيانات

---

### المهمة 2.2: إنشاء `reviewsService.ts`

**الملفات:**
- `services/reviewsService.ts` (جديد)

**المهام:**
- [ ] إنشاء دالة `createReview`
- [ ] إنشاء دالة `updateReview`
- [ ] إنشاء دالة `deleteReview`
- [ ] إنشاء دالة `getReviewsForUser`
- [ ] إنشاء دالة `getReviewById`
- [ ] إنشاء دالة `getUserRating`
- [ ] إنشاء دالة `canUserReviewRequest`
- [ ] إضافة error handling شامل
- [ ] إضافة logging

**الدوال المطلوبة:**
```typescript
// إنشاء تقييم
export async function createReview(
  input: CreateReviewInput,
  userId: string
): Promise<{ success: boolean; data?: Review; error?: string }>

// تحديث تقييم
export async function updateReview(
  reviewId: string,
  input: UpdateReviewInput,
  userId: string
): Promise<{ success: boolean; data?: Review; error?: string }>

// حذف تقييم
export async function deleteReview(
  reviewId: string,
  userId: string
): Promise<{ success: boolean; error?: string }>

// جلب المراجعات لمستخدم
export async function getReviewsForUser(
  userId: string,
  filters?: ReviewFilters
): Promise<{ success: boolean; data?: Review[]; total?: number; error?: string }>

// جلب تقييم بالمعرف
export async function getReviewById(
  reviewId: string
): Promise<{ success: boolean; data?: Review; error?: string }>

// جلب إحصائيات التقييمات
export async function getUserRating(
  userId: string
): Promise<{ success: boolean; data?: UserRating; error?: string }>

// التحقق من إمكانية التقييم
export async function canUserReviewRequest(
  userId: string,
  requestId: string
): Promise<{ success: boolean; canReview: boolean; reason?: string }>
```

**المعايير:**
- ✅ جميع الدوال موجودة وتعمل
- ✅ Error handling شامل
- ✅ Logging موجود
- ✅ الاختبارات ناجحة

---

## المرحلة 3: Components - النماذج والإدخال

**الحالة:** ⏳ قيد الانتظار  
**المدة:** 3-4 أيام  
**الأولوية:** عالية

### المهمة 3.1: إنشاء `StarRatingInput.tsx`

**الملفات:**
- `components/ui/StarRatingInput.tsx` (جديد)

**المهام:**
- [ ] إنشاء component لإدخال التقييم بالنجوم
- [ ] دعم RTL
- [ ] إضافة hover effects
- [ ] إضافة animations (Framer Motion)
- [ ] دعم الوضع الداكن والفاتح
- [ ] جعله قابل للوصول (accessibility)

**المعايير:**
- ✅ Component يعمل بشكل صحيح
- ✅ دعم RTL كامل
- ✅ دعم الوضع الداكن والفاتح
- ✅ Accessibility محقق

---

### المهمة 3.2: إنشاء `ReviewForm.tsx`

**الملفات:**
- `components/ReviewForm.tsx` (جديد)

**المهام:**
- [ ] إنشاء نموذج لإنشاء/تعديل تقييم
- [ ] استخدام `StarRatingInput` للنجوم
- [ ] إضافة حقل نصي للتعليق (textarea)
- [ ] إضافة validation (الحد الأدنى 10 أحرف للتعليق)
- [ ] إضافة loading state
- [ ] إضافة error handling
- [ ] دعم RTL
- [ ] إضافة تأكيد قبل الحفظ

**المعايير:**
- ✅ النموذج يعمل بشكل صحيح
- ✅ Validation شامل
- ✅ Error handling موجود
- ✅ دعم RTL كامل

---

### المهمة 3.3: دمج `ReviewForm` في `RequestDetail`

**الملفات:**
- `components/RequestDetail.tsx`

**المهام:**
- [ ] إضافة زر "تقييم" يظهر فقط للطلبات المكتملة
- [ ] فتح `ReviewForm` في modal أو bottom sheet
- [ ] التحقق من إمكانية التقييم قبل عرض الزر
- [ ] تحديث UI بعد إنشاء التقييم

**المعايير:**
- ✅ الزر يظهر في الوقت المناسب
- ✅ النموذج يفتح بشكل صحيح
- ✅ UI يتحدث بعد إنشاء التقييم

---

## المرحلة 4: Components - العرض والقوائم

**الحالة:** ⏳ قيد الانتظار  
**المدة:** 3-4 أيام  
**الأولوية:** عالية

### المهمة 4.1: إنشاء `ReviewCard.tsx`

**الملفات:**
- `components/ReviewCard.tsx` (جديد)

**المهام:**
- [ ] إنشاء component لعرض مراجعة واحدة
- [ ] عرض النجوم (استخدام `StarRating` الموجود)
- [ ] عرض التعليق النصي
- [ ] عرض اسم وصورة الكاتب
- [ ] عرض التاريخ
- [ ] رابط للطلب المرتبط
- [ ] دعم RTL
- [ ] دعم الوضع الداكن والفاتح

**المعايير:**
- ✅ Component يعمل بشكل صحيح
- ✅ دعم RTL كامل
- ✅ دعم الوضع الداكن والفاتح

---

### المهمة 4.2: إنشاء `ReviewsList.tsx`

**الملفات:**
- `components/ReviewsList.tsx` (جديد)

**المهام:**
- [ ] إنشاء component لعرض قائمة المراجعات
- [ ] إضافة pagination (10 مراجعات لكل صفحة)
- [ ] إضافة تصفية حسب التقييم
- [ ] إضافة ترتيب (الأحدث أولاً)
- [ ] إضافة loading state
- [ ] إضافة empty state (لا توجد مراجعات)
- [ ] دعم RTL

**المعايير:**
- ✅ Component يعمل بشكل صحيح
- ✅ Pagination يعمل
- ✅ التصفية والترتيب يعملان
- ✅ دعم RTL كامل

---

### المهمة 4.3: إنشاء `RatingStats.tsx`

**الملفات:**
- `components/RatingStats.tsx` (جديد)

**المهام:**
- [ ] إنشاء component لعرض إحصائيات التقييمات
- [ ] عرض متوسط التقييم
- [ ] عرض عدد المراجعات
- [ ] عرض توزيع التقييمات (رسم بياني أو قائمة)
- [ ] دعم RTL
- [ ] دعم الوضع الداكن والفاتح

**المعايير:**
- ✅ Component يعمل بشكل صحيح
- ✅ الإحصائيات دقيقة
- ✅ دعم RTL كامل

---

### المهمة 4.4: دمج المراجعات في `Profile.tsx`

**الملفات:**
- `components/Profile.tsx`

**المهام:**
- [ ] إضافة قسم "المراجعات" في الملف الشخصي
- [ ] عرض `RatingStats` في أعلى القسم
- [ ] عرض `ReviewsList` أسفل الإحصائيات
- [ ] إضافة tabs إذا لزم الأمر (المراجعات التي تلقيتها / التي كتبتها)

**المعايير:**
- ✅ القسم يظهر بشكل صحيح
- ✅ الإحصائيات والمراجعات تظهر
- ✅ دعم RTL كامل

---

## المرحلة 5: التصفية والبحث

**الحالة:** ⏳ قيد الانتظار  
**المدة:** 2-3 أيام  
**الأولوية:** متوسطة

### المهمة 5.1: إضافة تصفية التقييمات في `Marketplace`

**الملفات:**
- `components/Marketplace.tsx`
- `components/ui/FloatingFilterIsland.tsx`

**المهام:**
- [ ] إضافة filter للتصفية حسب متوسط التقييم
- [ ] إضافة sort option للترتيب حسب التقييم
- [ ] تحديث `FloatingFilterIsland` لإضافة خيارات التقييم
- [ ] اختبار التصفية والترتيب

**المعايير:**
- ✅ التصفية تعمل بشكل صحيح
- ✅ الترتيب يعمل بشكل صحيح
- ✅ الاختبارات ناجحة

---

### المهمة 5.2: إضافة البحث في المراجعات

**الملفات:**
- `components/ReviewsList.tsx`

**المهام:**
- [ ] إضافة search box للبحث في نص المراجعات
- [ ] إضافة highlighting للنتائج المطابقة
- [ ] اختبار البحث

**المعايير:**
- ✅ البحث يعمل بشكل صحيح
- ✅ Highlighting يعمل
- ✅ الاختبارات ناجحة

---

## المرحلة 6: الإشعارات

**الحالة:** ⏳ قيد الانتظار  
**المدة:** 1-2 أيام  
**الأولوية:** متوسطة

### المهمة 6.1: إضافة إشعارات للتقييمات

**الملفات:**
- `services/notificationsService.ts`
- `services/reviewsService.ts`

**المهام:**
- [ ] إضافة نوع إشعار جديد "review"
- [ ] إرسال إشعار عند استقبال تقييم جديد
- [ ] إرسال إشعار عند تعديل/حذف تقييم (اختياري)
- [ ] إضافة push notifications
- [ ] اختبار الإشعارات

**المعايير:**
- ✅ الإشعارات ترسل بشكل صحيح
- ✅ Push notifications تعمل
- ✅ الاختبارات ناجحة

---

## المرحلة 7: الاختبار والتحسين

**الحالة:** ⏳ قيد الانتظار  
**المدة:** 3-4 أيام  
**الأولوية:** عالية

### المهمة 7.1: Unit Tests

**الملفات:**
- `tests/reviewsService.test.ts` (جديد)
- `tests/reviewComponents.test.tsx` (جديد)

**المهام:**
- [ ] اختبار جميع functions في `reviewsService`
- [ ] اختبار جميع components
- [ ] اختبار edge cases
- [ ] تحقيق coverage 80%+

**المعايير:**
- ✅ جميع الاختبارات ناجحة
- ✅ Coverage 80%+
- ✅ Edge cases مغطاة

---

### المهمة 7.2: Integration Tests

**المهام:**
- [ ] اختبار التكامل مع Supabase
- [ ] اختبار RLS policies
- [ ] اختبار triggers و functions
- [ ] اختبار الإشعارات

**المعايير:**
- ✅ جميع الاختبارات ناجحة
- ✅ RLS policies تعمل بشكل صحيح
- ✅ Triggers تعمل بشكل صحيح

---

### المهمة 7.3: E2E Tests

**المهام:**
- [ ] اختبار سيناريو إنشاء تقييم كامل
- [ ] اختبار سيناريو تعديل تقييم
- [ ] اختبار سيناريو حذف تقييم
- [ ] اختبار سيناريو عرض المراجعات
- [ ] اختبار سيناريو التصفية والبحث

**المعايير:**
- ✅ جميع السيناريوهات ناجحة
- ✅ لا توجد أخطاء

---

### المهمة 7.4: Performance Testing

**المهام:**
- [ ] اختبار وقت تحميل صفحة المراجعات
- [ ] اختبار وقت إنشاء تقييم
- [ ] اختبار مع 100+ مراجعة
- [ ] تحسين الاستعلامات إذا لزم الأمر

**المعايير:**
- ✅ وقت التحميل < 1 ثانية
- ✅ وقت الإنشاء < 500ms
- ✅ الأداء جيد مع 100+ مراجعة

---

### المهمة 7.5: Security Testing

**المهام:**
- [ ] اختبار RLS policies
- [ ] اختبار validation
- [ ] اختبار rate limiting
- [ ] اختبار spam protection

**المعايير:**
- ✅ الأمان محقق
- ✅ RLS policies تعمل بشكل صحيح
- ✅ Validation شامل

---

## المرحلة 8: التوثيق والإطلاق

**الحالة:** ⏳ قيد الانتظار  
**المدة:** 1-2 أيام  
**الأولوية:** عالية

### المهمة 8.1: التوثيق

**الملفات:**
- `docs/RATINGS_AND_REVIEWS_GUIDE.md` (جديد)

**المهام:**
- [ ] كتابة دليل استخدام للمستخدمين
- [ ] كتابة دليل للمطورين
- [ ] تحديث README إذا لزم الأمر

**المعايير:**
- ✅ التوثيق مكتمل
- ✅ واضح وسهل الفهم

---

### المهمة 8.2: الإطلاق

**المهام:**
- [ ] مراجعة نهائية للكود
- [ ] اختبار نهائي شامل
- [ ] نشر التحديثات
- [ ] مراقبة الأخطاء بعد الإطلاق

**المعايير:**
- ✅ جميع المهام مكتملة
- ✅ جميع الاختبارات ناجحة
- ✅ لا توجد أخطاء حرجة

---

## الجدول الزمني

| المرحلة | المدة | الحالة |
|---------|-------|--------|
| المرحلة 0: البحث والتحليل | 2 أيام | ✅ مكتمل |
| المرحلة 1: قاعدة البيانات | 3-4 أيام | ⏳ قيد الانتظار |
| المرحلة 2: Types و Services | 2-3 أيام | ⏳ قيد الانتظار |
| المرحلة 3: Components - النماذج | 3-4 أيام | ⏳ قيد الانتظار |
| المرحلة 4: Components - العرض | 3-4 أيام | ⏳ قيد الانتظار |
| المرحلة 5: التصفية والبحث | 2-3 أيام | ⏳ قيد الانتظار |
| المرحلة 6: الإشعارات | 1-2 أيام | ⏳ قيد الانتظار |
| المرحلة 7: الاختبار | 3-4 أيام | ⏳ قيد الانتظار |
| المرحلة 8: التوثيق والإطلاق | 1-2 أيام | ⏳ قيد الانتظار |
| **المجموع** | **23-33 يوم** | |

---

## المعايير النهائية

قبل اعتبار المشروع مكتملاً، يجب تحقيق:

- [ ] جميع المهام في جميع المراحل مكتملة
- [ ] جميع الاختبارات ناجحة (Unit, Integration, E2E)
- [ ] الأداء يلبي المتطلبات (< 1 ثانية لتحميل المراجعات)
- [ ] الأمان محقق (RLS policies تعمل بشكل صحيح)
- [ ] التوثيق مكتمل
- [ ] لا توجد أخطاء حرجة في الإنتاج

---

**آخر تحديث:** 2025-01-27  
**الحالة:** ✅ مكتمل - جاهز للتنفيذ
