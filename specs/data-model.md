# نموذج البيانات: نظام التقييمات والمراجعات

**التاريخ:** 2025-01-27  
**الميزة:** نظام التقييمات والمراجعات  
**الحالة:** ✅ مكتمل

---

## 1. نظرة عامة

يحتوي نظام التقييمات والمراجعات على جدولين رئيسيين:
1. **`reviews`** - جدول التقييمات والمراجعات الفردية
2. **`user_ratings`** - جدول إحصائيات التقييمات المجمعة (Materialized View)

---

## 2. جدول `reviews`

### 2.1 الوصف
جدول يحتوي على جميع التقييمات والمراجعات التي يتركها المستخدمون لبعضهم البعض بعد إتمام الطلبات.

### 2.2 الأعمدة

| العمود | النوع | القيود | الوصف |
|--------|-------|--------|-------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | المعرف الفريد للتقييم |
| `request_id` | UUID | NOT NULL, FOREIGN KEY → requests(id) ON DELETE CASCADE | معرف الطلب المرتبط |
| `reviewer_id` | UUID | NOT NULL, FOREIGN KEY → auth.users(id) ON DELETE CASCADE | معرف المستخدم الذي كتب التقييم |
| `reviewee_id` | UUID | NOT NULL, FOREIGN KEY → auth.users(id) ON DELETE CASCADE | معرف المستخدم الذي تم تقييمه |
| `rating` | INTEGER | NOT NULL, CHECK (rating >= 1 AND rating <= 5) | التقييم من 1 إلى 5 نجوم |
| `comment` | TEXT | NULL | التعليق النصي (اختياري، 10-1000 حرف) |
| `created_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | تاريخ إنشاء التقييم |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | تاريخ آخر تحديث |

### 2.3 Constraints

```sql
-- Primary Key
PRIMARY KEY (id)

-- Foreign Keys
FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
FOREIGN KEY (reviewer_id) REFERENCES auth.users(id) ON DELETE CASCADE
FOREIGN KEY (reviewee_id) REFERENCES auth.users(id) ON DELETE CASCADE

-- Unique Constraint (منع التقييمات المكررة)
UNIQUE(request_id, reviewer_id)

-- Check Constraint (التقييم من 1 إلى 5)
CHECK (rating >= 1 AND rating <= 5)
```

### 2.4 Indexes

```sql
-- Index للبحث السريع حسب المستخدم المقيم
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);

-- Index للبحث السريع حسب الطلب
CREATE INDEX idx_reviews_request_id ON reviews(request_id);

-- Index للترتيب حسب التاريخ (الأحدث أولاً)
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
```

### 2.5 RLS Policies

#### Policy 1: القراءة (SELECT)
```sql
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  USING (true);
```
**الوصف:** الجميع يمكنهم قراءة المراجعات (للعرض العام)

#### Policy 2: الإنشاء (INSERT)
```sql
CREATE POLICY "Users can create reviews for completed requests"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM requests
      WHERE id = request_id
      AND status = 'completed'
      AND (
        author_id = reviewer_id OR 
        EXISTS (
          SELECT 1 FROM offers
          WHERE request_id = reviews.request_id
          AND provider_id = reviewer_id
          AND status = 'accepted'
        )
      )
    )
  );
```
**الوصف:** يمكن للمستخدمين إنشاء تقييمات فقط للطلبات المكتملة التي شاركوا فيها

#### Policy 3: التعديل (UPDATE)
```sql
CREATE POLICY "Users can update their reviews within 24 hours"
  ON reviews FOR UPDATE
  USING (
    auth.uid() = reviewer_id AND
    created_at > NOW() - INTERVAL '24 hours'
  );
```
**الوصف:** يمكن للمستخدمين تعديل تقييماتهم فقط خلال 24 ساعة من إنشائها

#### Policy 4: الحذف (DELETE)
```sql
CREATE POLICY "Users can delete their reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = reviewer_id);
```
**الوصف:** يمكن للمستخدمين حذف تقييماتهم فقط

---

## 3. جدول `user_ratings`

### 3.1 الوصف
جدول Materialized View يحتوي على إحصائيات التقييمات المجمعة لكل مستخدم. يتم تحديثه تلقائياً عند إنشاء/تعديل/حذف تقييم.

### 3.2 الأعمدة

| العمود | النوع | القيود | الوصف |
|--------|-------|--------|-------|
| `user_id` | UUID | PRIMARY KEY, FOREIGN KEY → auth.users(id) ON DELETE CASCADE | معرف المستخدم |
| `average_rating` | NUMERIC(3, 2) | DEFAULT 0.00 | متوسط التقييم (0.00 - 5.00) |
| `total_reviews` | INTEGER | DEFAULT 0 | العدد الإجمالي للمراجعات |
| `five_star_count` | INTEGER | DEFAULT 0 | عدد التقييمات 5 نجوم |
| `four_star_count` | INTEGER | DEFAULT 0 | عدد التقييمات 4 نجوم |
| `three_star_count` | INTEGER | DEFAULT 0 | عدد التقييمات 3 نجوم |
| `two_star_count` | INTEGER | DEFAULT 0 | عدد التقييمات نجمتين |
| `one_star_count` | INTEGER | DEFAULT 0 | عدد التقييمات نجمة واحدة |
| `updated_at` | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | تاريخ آخر تحديث |

### 3.3 Constraints

```sql
-- Primary Key
PRIMARY KEY (user_id)

-- Foreign Key
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
```

### 3.4 Function: `update_user_ratings()`

```sql
CREATE OR REPLACE FUNCTION update_user_ratings()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث إحصائيات المستخدم المقيم (reviewee_id)
  INSERT INTO user_ratings (
    user_id, 
    average_rating, 
    total_reviews, 
    five_star_count, 
    four_star_count, 
    three_star_count, 
    two_star_count, 
    one_star_count, 
    updated_at
  )
  SELECT
    reviewee_id,
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*),
    COUNT(*) FILTER (WHERE rating = 5),
    COUNT(*) FILTER (WHERE rating = 4),
    COUNT(*) FILTER (WHERE rating = 3),
    COUNT(*) FILTER (WHERE rating = 2),
    COUNT(*) FILTER (WHERE rating = 1),
    NOW()
  FROM reviews
  WHERE reviewee_id = COALESCE(NEW.reviewee_id, OLD.reviewee_id)
  GROUP BY reviewee_id
  ON CONFLICT (user_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_reviews = EXCLUDED.total_reviews,
    five_star_count = EXCLUDED.five_star_count,
    four_star_count = EXCLUDED.four_star_count,
    three_star_count = EXCLUDED.three_star_count,
    two_star_count = EXCLUDED.two_star_count,
    one_star_count = EXCLUDED.one_star_count,
    updated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

**الوصف:** Function لتحديث إحصائيات التقييمات تلقائياً عند تغيير جدول `reviews`

### 3.5 Trigger: `trigger_update_user_ratings`

```sql
CREATE TRIGGER trigger_update_user_ratings
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_ratings();
```

**الوصف:** Trigger يستدعي Function `update_user_ratings()` عند أي تغيير في جدول `reviews`

---

## 4. العلاقات مع الجداول الأخرى

### 4.1 علاقة مع `requests`
- **نوع العلاقة:** Many-to-One (كل تقييم مرتبط بطلب واحد)
- **Foreign Key:** `reviews.request_id → requests.id`
- **ON DELETE:** CASCADE (عند حذف الطلب، تُحذف المراجعات المرتبطة)

### 4.2 علاقة مع `auth.users` (reviewer)
- **نوع العلاقة:** Many-to-One (كل تقييم له كاتب واحد)
- **Foreign Key:** `reviews.reviewer_id → auth.users.id`
- **ON DELETE:** CASCADE (عند حذف المستخدم، تُحذف تقييماته)

### 4.3 علاقة مع `auth.users` (reviewee)
- **نوع العلاقة:** Many-to-One (كل تقييم لمستخدم واحد)
- **Foreign Key:** `reviews.reviewee_id → auth.users.id`
- **ON DELETE:** CASCADE (عند حذف المستخدم، تُحذف التقييمات الموجهة له)

### 4.4 علاقة مع `offers` (غير مباشرة)
- **نوع العلاقة:** غير مباشرة عبر `requests`
- **الاستخدام:** للتحقق من أن مقدم الخدمة هو الذي تم قبول عرضه

---

## 5. TypeScript Types

### 5.1 Interface: `Review`

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
  // Related request info (joined)
  requestTitle?: string;
  requestStatus?: string;
}
```

### 5.2 Interface: `UserRating`

```typescript
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
```

### 5.3 Type: `CreateReviewInput`

```typescript
export type CreateReviewInput = {
  requestId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment?: string; // 10-1000 characters
};
```

### 5.4 Type: `UpdateReviewInput`

```typescript
export type UpdateReviewInput = {
  rating?: number; // 1-5
  comment?: string; // 10-1000 characters
};
```

### 5.5 Type: `ReviewFilters`

```typescript
export type ReviewFilters = {
  minRating?: number; // 1-5
  maxRating?: number; // 1-5
  searchQuery?: string; // للبحث في التعليقات
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest';
  page?: number;
  pageSize?: number; // default: 10
};
```

---

## 6. أمثلة على الاستعلامات

### 6.1 جلب جميع المراجعات لمستخدم معين

```sql
SELECT 
  r.*,
  req.title as request_title,
  reviewer.display_name as reviewer_name,
  reviewer.avatar_url as reviewer_avatar
FROM reviews r
JOIN requests req ON r.request_id = req.id
JOIN profiles reviewer ON r.reviewer_id = reviewer.id
WHERE r.reviewee_id = $1
ORDER BY r.created_at DESC
LIMIT 10 OFFSET $2;
```

### 6.2 جلب إحصائيات مستخدم

```sql
SELECT * FROM user_ratings
WHERE user_id = $1;
```

### 6.3 التحقق من إمكانية التقييم

```sql
SELECT 
  CASE 
    WHEN req.status = 'completed' AND 
         (req.author_id = $1 OR 
          EXISTS (
            SELECT 1 FROM offers 
            WHERE request_id = req.id 
            AND provider_id = $1 
            AND status = 'accepted'
          )) AND
         NOT EXISTS (
           SELECT 1 FROM reviews 
           WHERE request_id = req.id 
           AND reviewer_id = $1
         )
    THEN true
    ELSE false
  END as can_review
FROM requests req
WHERE req.id = $2;
```

---

## 7. ملاحظات الأداء

### 7.1 Indexes
- جميع الاستعلامات الشائعة لها indexes مناسبة
- Index على `reviewee_id` للبحث السريع
- Index على `created_at DESC` للترتيب السريع

### 7.2 Materialized View
- `user_ratings` يتم تحديثه تلقائياً لتجنب حساب الإحصائيات في كل مرة
- يحسن الأداء بشكل كبير مع عدد كبير من المراجعات

### 7.3 Pagination
- جميع الاستعلامات تدعم pagination
- حجم الصفحة الافتراضي: 10 مراجعات

---

**آخر تحديث:** 2025-01-27  
**الحالة:** ✅ مكتمل
