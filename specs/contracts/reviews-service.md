# عقد API: Reviews Service

**التاريخ:** 2025-01-27  
**الخدمة:** `services/reviewsService.ts`  
**الحالة:** ✅ مكتمل

---

## 1. نظرة عامة

`reviewsService` يوفر جميع الوظائف المتعلقة بإنشاء وإدارة التقييمات والمراجعات.

---

## 2. الدوال

### 2.1 `createReview`

**الوصف:** إنشاء تقييم جديد

**التوقيع:**
```typescript
async function createReview(
  input: CreateReviewInput,
  userId: string
): Promise<{ success: boolean; data?: Review; error?: string }>
```

**المدخلات:**
- `input.requestId: string` - معرف الطلب
- `input.revieweeId: string` - معرف المستخدم الذي يتم تقييمه
- `input.rating: number` - التقييم (1-5)
- `input.comment?: string` - التعليق النصي (اختياري، 10-1000 حرف)
- `userId: string` - معرف المستخدم الذي ينشئ التقييم

**المخرجات:**
- `success: boolean` - نجاح العملية
- `data?: Review` - بيانات التقييم المنشأ
- `error?: string` - رسالة الخطأ (إن وجدت)

**التحققات:**
- ✅ الطلب موجود وفي حالة `completed`
- ✅ المستخدم مشارك في الطلب (صاحب الطلب أو مقدم الخدمة المعتمد)
- ✅ التقييم بين 1 و 5
- ✅ التعليق (إن وجد) بين 10 و 1000 حرف
- ✅ لا يوجد تقييم مكرر لنفس الطلب من نفس المستخدم

**الأخطاء المحتملة:**
- `"الطلب غير موجود"` - الطلب غير موجود
- `"الطلب غير مكتمل"` - الطلب ليس في حالة `completed`
- `"غير مصرح لك بإنشاء تقييم لهذا الطلب"` - المستخدم غير مشارك في الطلب
- `"التقييم غير صحيح"` - التقييم ليس بين 1 و 5
- `"التعليق قصير جداً"` - التعليق أقل من 10 أحرف
- `"التعليق طويل جداً"` - التعليق أكثر من 1000 حرف
- `"تم إنشاء تقييم لهذا الطلب مسبقاً"` - تقييم مكرر

---

### 2.2 `updateReview`

**الوصف:** تحديث تقييم موجود

**التوقيع:**
```typescript
async function updateReview(
  reviewId: string,
  input: UpdateReviewInput,
  userId: string
): Promise<{ success: boolean; data?: Review; error?: string }>
```

**المدخلات:**
- `reviewId: string` - معرف التقييم
- `input.rating?: number` - التقييم الجديد (1-5)
- `input.comment?: string` - التعليق الجديد (10-1000 حرف)
- `userId: string` - معرف المستخدم الذي يحدث التقييم

**المخرجات:**
- `success: boolean` - نجاح العملية
- `data?: Review` - بيانات التقييم المحدث
- `error?: string` - رسالة الخطأ (إن وجدت)

**التحققات:**
- ✅ التقييم موجود
- ✅ المستخدم هو منشئ التقييم
- ✅ التقييم تم إنشاؤه خلال آخر 24 ساعة
- ✅ التقييم الجديد بين 1 و 5
- ✅ التعليق الجديد (إن وجد) بين 10 و 1000 حرف

**الأخطاء المحتملة:**
- `"التقييم غير موجود"` - التقييم غير موجود
- `"غير مصرح لك بتحديث هذا التقييم"` - المستخدم ليس منشئ التقييم
- `"لا يمكن تعديل التقييم بعد 24 ساعة"` - انتهت فترة التعديل
- `"التقييم غير صحيح"` - التقييم ليس بين 1 و 5
- `"التعليق قصير جداً"` - التعليق أقل من 10 أحرف
- `"التعليق طويل جداً"` - التعليق أكثر من 1000 حرف

---

### 2.3 `deleteReview`

**الوصف:** حذف تقييم

**التوقيع:**
```typescript
async function deleteReview(
  reviewId: string,
  userId: string
): Promise<{ success: boolean; error?: string }>
```

**المدخلات:**
- `reviewId: string` - معرف التقييم
- `userId: string` - معرف المستخدم الذي يحذف التقييم

**المخرجات:**
- `success: boolean` - نجاح العملية
- `error?: string` - رسالة الخطأ (إن وجدت)

**التحققات:**
- ✅ التقييم موجود
- ✅ المستخدم هو منشئ التقييم

**الأخطاء المحتملة:**
- `"التقييم غير موجود"` - التقييم غير موجود
- `"غير مصرح لك بحذف هذا التقييم"` - المستخدم ليس منشئ التقييم

---

### 2.4 `getReviewsForUser`

**الوصف:** جلب جميع المراجعات لمستخدم معين

**التوقيع:**
```typescript
async function getReviewsForUser(
  userId: string,
  filters?: ReviewFilters
): Promise<{ success: boolean; data?: Review[]; total?: number; error?: string }>
```

**المدخلات:**
- `userId: string` - معرف المستخدم
- `filters?: ReviewFilters` - فلاتر البحث (اختياري)
  - `minRating?: number` - الحد الأدنى للتقييم (1-5)
  - `maxRating?: number` - الحد الأقصى للتقييم (1-5)
  - `searchQuery?: string` - البحث في التعليقات
  - `sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest'` - طريقة الترتيب
  - `page?: number` - رقم الصفحة (افتراضي: 1)
  - `pageSize?: number` - حجم الصفحة (افتراضي: 10)

**المخرجات:**
- `success: boolean` - نجاح العملية
- `data?: Review[]` - قائمة المراجعات
- `total?: number` - العدد الإجمالي للمراجعات
- `error?: string` - رسالة الخطأ (إن وجدت)

**الأخطاء المحتملة:**
- `"المستخدم غير موجود"` - المستخدم غير موجود
- `"فلاتر البحث غير صحيحة"` - الفلاتر غير صحيحة

---

### 2.5 `getReviewById`

**الوصف:** جلب تقييم معين بالمعرف

**التوقيع:**
```typescript
async function getReviewById(
  reviewId: string
): Promise<{ success: boolean; data?: Review; error?: string }>
```

**المدخلات:**
- `reviewId: string` - معرف التقييم

**المخرجات:**
- `success: boolean` - نجاح العملية
- `data?: Review` - بيانات التقييم
- `error?: string` - رسالة الخطأ (إن وجدت)

**الأخطاء المحتملة:**
- `"التقييم غير موجود"` - التقييم غير موجود

---

### 2.6 `getUserRating`

**الوصف:** جلب إحصائيات التقييمات لمستخدم معين

**التوقيع:**
```typescript
async function getUserRating(
  userId: string
): Promise<{ success: boolean; data?: UserRating; error?: string }>
```

**المدخلات:**
- `userId: string` - معرف المستخدم

**المخرجات:**
- `success: boolean` - نجاح العملية
- `data?: UserRating` - إحصائيات التقييمات
- `error?: string` - رسالة الخطأ (إن وجدت)

**الأخطاء المحتملة:**
- `"المستخدم غير موجود"` - المستخدم غير موجود

---

### 2.7 `canUserReviewRequest`

**الوصف:** التحقق من إمكانية تقييم مستخدم لطلب معين

**التوقيع:**
```typescript
async function canUserReviewRequest(
  userId: string,
  requestId: string
): Promise<{ success: boolean; canReview: boolean; reason?: string }>
```

**المدخلات:**
- `userId: string` - معرف المستخدم
- `requestId: string` - معرف الطلب

**المخرجات:**
- `success: boolean` - نجاح العملية
- `canReview: boolean` - هل يمكن التقييم؟
- `reason?: string` - سبب عدم إمكانية التقييم (إن وجد)

**التحققات:**
- ✅ الطلب موجود وفي حالة `completed`
- ✅ المستخدم مشارك في الطلب
- ✅ لا يوجد تقييم مكرر

**الأسباب المحتملة لعدم إمكانية التقييم:**
- `"الطلب غير موجود"`
- `"الطلب غير مكتمل"`
- `"غير مشارك في الطلب"`
- `"تم إنشاء تقييم مسبقاً"`

---

## 3. أمثلة الاستخدام

### 3.1 إنشاء تقييم

```typescript
const result = await createReview(
  {
    requestId: "123e4567-e89b-12d3-a456-426614174000",
    revieweeId: "987fcdeb-51a2-43d7-8f9e-123456789abc",
    rating: 5,
    comment: "خدمة ممتازة، أنصح به بشدة!"
  },
  currentUserId
);

if (result.success) {
  console.log("تم إنشاء التقييم:", result.data);
} else {
  console.error("خطأ:", result.error);
}
```

### 3.2 جلب المراجعات

```typescript
const result = await getReviewsForUser(
  userId,
  {
    minRating: 4,
    sortBy: 'newest',
    page: 1,
    pageSize: 10
  }
);

if (result.success) {
  console.log("المراجعات:", result.data);
  console.log("العدد الإجمالي:", result.total);
}
```

### 3.3 التحقق من إمكانية التقييم

```typescript
const result = await canUserReviewRequest(userId, requestId);

if (result.canReview) {
  // عرض نموذج التقييم
} else {
  // عرض رسالة: result.reason
}
```

---

**آخر تحديث:** 2025-01-27  
**الحالة:** ✅ مكتمل
