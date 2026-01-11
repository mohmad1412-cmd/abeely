# خطة تنفيذ نظام التقييمات والمراجعات

## نظرة عامة

هذه الخطة تشرح كيفية تنفيذ نظام التقييمات والمراجعات بشكل متدرج، مع إصلاح وتحسين نظام قبول العروض وإكمال الطلبات أولاً كتبعية أساسية.

**المدة المتوقعة:** 3-4 أسابيع  
**الأولوية:** عالية (المرحلة 2)  
**الحالة:** جاهز للتنفيذ

---

## التبعيات والاعتمادات

### ⚠️ تبعية حرجة: إصلاح نظام قبول العروض وإكمال الطلبات

**المشكلة الحالية:**
- نظام قبول العروض موجود لكنه غير مستقر
- لا توجد وظيفة واضحة لإكمال الطلب (تغيير الحالة من "assigned" إلى "completed")
- زر "تم إكمال الطلب" موجود لكنه يعتمد على callback غير مستقر

**الحل المطلوب:**
1. إصلاح وتحسين دالة `acceptOffer` في `services/requestsService.ts`
2. إنشاء دالة `completeRequest` لإكمال الطلب
3. إضافة واجهة مستخدم واضحة لإكمال الطلب
4. اختبار شامل للنظام قبل المتابعة

**الوقت المتوقع:** 3-5 أيام

---

## المراحل التنفيذية

### المرحلة 0: البحث والتحليل (2 أيام)

#### المهام:
- [ ] تحليل النظام الحالي لقبول العروض وإكمال الطلبات
- [ ] تحديد المشاكل والثغرات في النظام الحالي
- [ ] مراجعة قاعدة البيانات والـ RLS policies
- [ ] تحديد التغييرات المطلوبة في قاعدة البيانات
- [ ] مراجعة المواصفات والتحقق من الاتساق

#### المخرجات:
- ملف `research.md` يحتوي على:
  - تحليل النظام الحالي
  - قائمة المشاكل والثغرات
  - الحلول المقترحة
  - التغييرات المطلوبة في قاعدة البيانات

---

### المرحلة 1: إصلاح نظام قبول العروض وإكمال الطلبات (3-5 أيام)

#### المهمة 1.1: إصلاح دالة `acceptOffer`
**الملفات:**
- `services/requestsService.ts`

**المهام:**
- [ ] مراجعة وتحسين دالة `acceptOffer` الحالية
- [ ] إضافة معالجة أخطاء أفضل
- [ ] إضافة التحقق من صحة البيانات
- [ ] إضافة logging شامل
- [ ] اختبار الدالة بشكل شامل

**المعايير:**
- الدالة تعمل بشكل مستقر 100%
- معالجة جميع حالات الخطأ
- رسائل خطأ واضحة بالعربية

#### المهمة 1.2: إنشاء دالة `completeRequest`
**الملفات:**
- `services/requestsService.ts`

**المهام:**
- [ ] إنشاء دالة `completeRequest(requestId: string, userId: string)`
- [ ] التحقق من أن المستخدم هو صاحب الطلب أو مقدم الخدمة المعتمد
- [ ] التحقق من أن الطلب في حالة "assigned"
- [ ] تحديث حالة الطلب إلى "completed"
- [ ] إرسال إشعارات للطرفين
- [ ] إضافة RLS policies إذا لزم الأمر

**الكود المقترح:**
```typescript
export async function completeRequest(
  requestId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. التحقق من وجود الطلب وحالته
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("author_id, status, accepted_offer_id")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return { success: false, error: "الطلب غير موجود" };
    }

    // 2. التحقق من أن الطلب في حالة "assigned"
    if (request.status !== "assigned") {
      return { 
        success: false, 
        error: "لا يمكن إكمال الطلب إلا بعد قبول عرض" 
      };
    }

    // 3. التحقق من أن المستخدم هو صاحب الطلب أو مقدم الخدمة المعتمد
    const isRequester = request.author_id === userId;
    const isProvider = request.accepted_offer_id 
      ? await checkIfUserIsProvider(requestId, userId)
      : false;

    if (!isRequester && !isProvider) {
      return { 
        success: false, 
        error: "غير مصرح لك بإكمال هذا الطلب" 
      };
    }

    // 4. تحديث حالة الطلب إلى "completed"
    const { error: updateError } = await supabase
      .from("requests")
      .update({ 
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (updateError) {
      logger.error("خطأ في إكمال الطلب:", updateError);
      return { success: false, error: "فشل في إكمال الطلب" };
    }

    // 5. إرسال إشعارات
    await sendNotificationsForCompletedRequest(requestId, userId);

    return { success: true };
  } catch (error) {
    logger.error("خطأ في إكمال الطلب:", error);
    return { success: false, error: "حدث خطأ غير متوقع" };
  }
}
```

#### المهمة 1.3: إضافة واجهة مستخدم لإكمال الطلب
**الملفات:**
- `components/RequestDetail.tsx`
- `App.tsx` (لإضافة handler)

**المهام:**
- [ ] إضافة زر "تم إكمال الطلب" في `RequestDetail.tsx`
- [ ] إضافة handler `handleCompleteRequest` في `App.tsx`
- [ ] إضافة تأكيد قبل إكمال الطلب
- [ ] إضافة loading state
- [ ] إضافة رسائل نجاح/خطأ
- [ ] تحديث UI بعد إكمال الطلب

**التصميم:**
- الزر يظهر فقط عندما يكون الطلب في حالة "assigned"
- الزر يظهر لصاحب الطلب ومقدم الخدمة المعتمد
- تأكيد قبل الإكمال: "هل أنت متأكد من إكمال هذا الطلب؟"
- بعد الإكمال: إظهار رسالة نجاح وإخفاء الزر

#### المهمة 1.4: اختبار شامل
**المهام:**
- [ ] اختبار قبول العرض
- [ ] اختبار إكمال الطلب من قبل صاحب الطلب
- [ ] اختبار إكمال الطلب من قبل مقدم الخدمة
- [ ] اختبار الحالات الاستثنائية (أخطاء، صلاحيات، إلخ)
- [ ] اختبار الإشعارات

---

### المرحلة 2: قاعدة البيانات والـ Backend (3-4 أيام)

#### المهمة 2.1: إنشاء جدول `reviews`
**الملفات:**
- `supabase/migrations/[timestamp]_create_reviews_table.sql`

**المهام:**
- [ ] إنشاء جدول `reviews` مع جميع الأعمدة المطلوبة
- [ ] إضافة constraints (UNIQUE, CHECK)
- [ ] إضافة indexes للأداء
- [ ] إضافة foreign keys مع CASCADE
- [ ] اختبار الجدول

**SQL:**
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

#### المهمة 2.2: إنشاء جدول `user_ratings`
**الملفات:**
- `supabase/migrations/[timestamp]_create_user_ratings_table.sql`

**المهام:**
- [ ] إنشاء جدول `user_ratings`
- [ ] إنشاء function `update_user_ratings()`
- [ ] إنشاء trigger لتحديث الإحصائيات تلقائياً
- [ ] اختبار التحديث التلقائي

#### المهمة 2.3: إضافة RLS Policies
**الملفات:**
- `supabase/migrations/[timestamp]_add_reviews_rls.sql`

**المهام:**
- [ ] تفعيل RLS على جدول `reviews`
- [ ] إضافة policy للقراءة (الجميع يمكنهم القراءة)
- [ ] إضافة policy للإنشاء (فقط المشاركون في الطلب المكتمل)
- [ ] إضافة policy للتعديل (فقط خلال 24 ساعة)
- [ ] إضافة policy للحذف (فقط منشئ التقييم)
- [ ] اختبار جميع الـ policies

---

### المرحلة 3: TypeScript Types و Services (2-3 أيام)

#### المهمة 3.1: تحديث Types
**الملفات:**
- `types.ts`

**المهام:**
- [ ] تحديث interface `Review` حسب المواصفات
- [ ] إضافة interface `UserRating`
- [ ] إضافة types للـ inputs (CreateReviewInput, UpdateReviewInput)
- [ ] إضافة types للـ filters (ReviewFilters)

#### المهمة 3.2: إنشاء `reviewsService.ts`
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

---

### المرحلة 4: Components - النماذج والإدخال (3-4 أيام)

#### المهمة 4.1: إنشاء `StarRatingInput.tsx`
**الملفات:**
- `components/ui/StarRatingInput.tsx` (جديد)

**المهام:**
- [ ] إنشاء component لإدخال التقييم بالنجوم
- [ ] دعم RTL
- [ ] إضافة hover effects
- [ ] إضافة animations (Framer Motion)
- [ ] دعم الوضع الداكن والفاتح
- [ ] جعله قابل للوصول (accessibility)

#### المهمة 4.2: إنشاء `ReviewForm.tsx`
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

#### المهمة 4.3: دمج `ReviewForm` في `RequestDetail`
**الملفات:**
- `components/RequestDetail.tsx`

**المهام:**
- [ ] إضافة زر "تقييم" يظهر فقط للطلبات المكتملة
- [ ] فتح `ReviewForm` في modal أو bottom sheet
- [ ] التحقق من إمكانية التقييم قبل عرض الزر
- [ ] تحديث UI بعد إنشاء التقييم

---

### المرحلة 5: Components - العرض والقوائم (3-4 أيام)

#### المهمة 5.1: إنشاء `ReviewCard.tsx`
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

#### المهمة 5.2: إنشاء `ReviewsList.tsx`
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

#### المهمة 5.3: إنشاء `RatingStats.tsx`
**الملفات:**
- `components/RatingStats.tsx` (جديد)

**المهام:**
- [ ] إنشاء component لعرض إحصائيات التقييمات
- [ ] عرض متوسط التقييم
- [ ] عرض عدد المراجعات
- [ ] عرض توزيع التقييمات (رسم بياني أو قائمة)
- [ ] دعم RTL
- [ ] دعم الوضع الداكن والفاتح

#### المهمة 5.4: دمج المراجعات في `Profile.tsx`
**الملفات:**
- `components/Profile.tsx`

**المهام:**
- [ ] إضافة قسم "المراجعات" في الملف الشخصي
- [ ] عرض `RatingStats` في أعلى القسم
- [ ] عرض `ReviewsList` أسفل الإحصائيات
- [ ] إضافة tabs إذا لزم الأمر (المراجعات التي تلقيتها / التي كتبتها)

---

### المرحلة 6: التصفية والبحث (2-3 أيام)

#### المهمة 6.1: إضافة تصفية التقييمات في `Marketplace`
**الملفات:**
- `components/Marketplace.tsx`
- `components/ui/FloatingFilterIsland.tsx`

**المهام:**
- [ ] إضافة filter للتصفية حسب متوسط التقييم
- [ ] إضافة sort option للترتيب حسب التقييم
- [ ] تحديث `FloatingFilterIsland` لإضافة خيارات التقييم
- [ ] اختبار التصفية والترتيب

#### المهمة 6.2: إضافة البحث في المراجعات
**الملفات:**
- `components/ReviewsList.tsx`

**المهام:**
- [ ] إضافة search box للبحث في نص المراجعات
- [ ] إضافة highlighting للنتائج المطابقة
- [ ] اختبار البحث

---

### المرحلة 7: الإشعارات (1-2 أيام)

#### المهمة 7.1: إضافة إشعارات للتقييمات
**الملفات:**
- `services/notificationsService.ts`
- `services/reviewsService.ts`

**المهام:**
- [ ] إضافة نوع إشعار جديد "review"
- [ ] إرسال إشعار عند استقبال تقييم جديد
- [ ] إرسال إشعار عند تعديل/حذف تقييم (اختياري)
- [ ] إضافة push notifications
- [ ] اختبار الإشعارات

---

### المرحلة 8: الاختبار والتحسين (3-4 أيام)

#### المهمة 8.1: Unit Tests
**الملفات:**
- `tests/reviewsService.test.ts` (جديد)
- `tests/reviewComponents.test.tsx` (جديد)

**المهام:**
- [ ] اختبار جميع functions في `reviewsService`
- [ ] اختبار جميع components
- [ ] اختبار edge cases
- [ ] تحقيق coverage 80%+

#### المهمة 8.2: Integration Tests
**المهام:**
- [ ] اختبار التكامل مع Supabase
- [ ] اختبار RLS policies
- [ ] اختبار triggers و functions
- [ ] اختبار الإشعارات

#### المهمة 8.3: E2E Tests
**المهام:**
- [ ] اختبار سيناريو إنشاء تقييم كامل
- [ ] اختبار سيناريو تعديل تقييم
- [ ] اختبار سيناريو حذف تقييم
- [ ] اختبار سيناريو عرض المراجعات
- [ ] اختبار سيناريو التصفية والبحث

#### المهمة 8.4: Performance Testing
**المهام:**
- [ ] اختبار وقت تحميل صفحة المراجعات
- [ ] اختبار وقت إنشاء تقييم
- [ ] اختبار مع 100+ مراجعة
- [ ] تحسين الاستعلامات إذا لزم الأمر

#### المهمة 8.5: Security Testing
**المهام:**
- [ ] اختبار RLS policies
- [ ] اختبار validation
- [ ] اختبار rate limiting
- [ ] اختبار spam protection

---

### المرحلة 9: التوثيق والإطلاق (1-2 أيام)

#### المهمة 9.1: التوثيق
**الملفات:**
- `docs/RATINGS_AND_REVIEWS_GUIDE.md` (جديد)

**المهام:**
- [ ] كتابة دليل استخدام للمستخدمين
- [ ] كتابة دليل للمطورين
- [ ] تحديث README إذا لزم الأمر

#### المهمة 9.2: الإطلاق
**المهام:**
- [ ] مراجعة نهائية للكود
- [ ] اختبار نهائي شامل
- [ ] نشر التحديثات
- [ ] مراقبة الأخطاء بعد الإطلاق

---

## الجدول الزمني

| المرحلة | المدة | الحالة |
|---------|-------|--------|
| المرحلة 0: البحث والتحليل | 2 أيام | ⏳ |
| المرحلة 1: إصلاح نظام قبول العروض | 3-5 أيام | ⚠️ حرجة |
| المرحلة 2: قاعدة البيانات | 3-4 أيام | ⏳ |
| المرحلة 3: Types و Services | 2-3 أيام | ⏳ |
| المرحلة 4: Components - النماذج | 3-4 أيام | ⏳ |
| المرحلة 5: Components - العرض | 3-4 أيام | ⏳ |
| المرحلة 6: التصفية والبحث | 2-3 أيام | ⏳ |
| المرحلة 7: الإشعارات | 1-2 أيام | ⏳ |
| المرحلة 8: الاختبار | 3-4 أيام | ⏳ |
| المرحلة 9: التوثيق والإطلاق | 1-2 أيام | ⏳ |
| **المجموع** | **23-33 يوم** | |

---

## المخاطر والتحديات

### مخاطر عالية
1. **عدم استقرار نظام قبول العروض:** قد يؤخر المرحلة 1
   - **الحل:** إعطاء أولوية عالية لإصلاح النظام قبل المتابعة

2. **تعقيد RLS Policies:** قد يكون صعباً
   - **الحل:** اختبار شامل ومراجعة مع فريق

3. **الأداء مع عدد كبير من المراجعات:** قد يكون بطيئاً
   - **الحل:** استخدام pagination و indexes و caching

### مخاطر متوسطة
4. **التوافق مع النظام الحالي:** قد يكون هناك تعارضات
   - **الحل:** اختبار شامل قبل الإطلاق

5. **تجربة المستخدم:** قد تكون معقدة
   - **الحل:** اختبار مع مستخدمين حقيقيين

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
**الحالة:** جاهز للتنفيذ  
**الإصدار:** 1.0.0
