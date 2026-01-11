# الفروقات بين Schema القديم والجديد

## 📊 ملخص الفروقات

### ✅ الجداول المضافة في الجديد (موجودة في الملف الشامل):
- ✅ profiles
- ✅ verified_guests
- ✅ requests
- ✅ offers
- ✅ categories
- ✅ request_categories
- ✅ conversations
- ✅ messages
- ✅ notifications
- ✅ fcm_tokens
- ✅ request_views
- ✅ reports

### ❌ الجداول المفقودة في الجديد (تم إضافتها في `ADD_MISSING_TABLES_AND_COLUMNS.sql`):
- ❌ `ai_conversations` - محادثات الذكاء الاصطناعي
- ❌ `ai_conversation_messages` - رسائل محادثات AI
- ❌ `cities` - جدول المدن
- ❌ `pending_categories` - التصنيفات المعلقة (للموافقة)
- ❌ `request_view_logs` - سجلات المشاهدات (مفصل)
- ❌ `reviews` - التقييمات

### ⚠️ جدول تم دمجها:
- `user_preferences` → البيانات موجودة في `profiles` (interested_categories, interested_cities, إلخ)

---

## 🔍 الفروقات في الأعمدة

### 1. **categories**
| القديم | الجديد |
|--------|--------|
| ✅ label_en | ❌ مفقود |
| ✅ label_ur | ❌ مفقود |
| ✅ icon | ❌ مفقود |

### 2. **conversations**
| القديم | الجديد |
|--------|--------|
| ✅ is_closed | ❌ مفقود |
| ✅ closed_reason | ❌ مفقود |

### 3. **messages** (فروقات كبيرة!)
| القديم | الجديد |
|--------|--------|
| ✅ request_id | ❌ مفقود |
| ✅ offer_id | ❌ مفقود |
| ✅ receiver_id | ❌ مفقود |
| ✅ is_draft_preview | ❌ مفقود |
| ✅ draft_data | ❌ مفقود |
| ✅ sender (USER-DEFINED) | ✅ sender_id (UUID) |
| ❌ conversation_id | ✅ conversation_id |

**ملاحظة**: الجديد يستخدم `conversation_id` بدلاً من `request_id/offer_id` مباشرة.

### 4. **notifications**
| القديم | الجديد |
|--------|--------|
| ✅ data (JSONB) | ❌ مفقود |
| ✅ type (USER-DEFINED) | ✅ type (CHECK constraint) |

### 5. **offers** (فروقات كبيرة!)
| القديم | الجديد |
|--------|--------|
| ✅ provider_avatar | ❌ مفقود |
| ✅ delivery_time | ❌ مفقود |
| ✅ is_negotiable | ❌ مفقود |
| ✅ location | ❌ مفقود |
| ✅ images (TEXT[]) | ❌ مفقود |
| ✅ provider_phone | ❌ مفقود |
| ✅ provider_rating | ❌ مفقود |
| ✅ is_read | ❌ مفقود |
| ✅ read_at | ❌ مفقود |
| ✅ price (TEXT) | ✅ price (NUMERIC) |
| ✅ status (USER-DEFINED) | ✅ status (CHECK constraint) |

### 6. **requests** (فروقات كبيرة!)
| القديم | الجديد |
|--------|--------|
| ✅ budget_type | ❌ مفقود |
| ✅ delivery_type | ❌ مفقود |
| ✅ delivery_from | ❌ مفقود |
| ✅ delivery_to | ❌ مفقود |
| ✅ images (TEXT[]) | ❌ مفقود |
| ✅ accepted_offer_id | ❌ مفقود |
| ✅ accepted_offer_provider | ❌ مفقود |
| ✅ seriousness | ❌ مفقود |
| ✅ author_name | ❌ مفقود |
| ✅ is_guest_request | ❌ مفقود |
| ✅ location_lat | ❌ مفقود |
| ✅ location_lng | ❌ مفقود |
| ✅ is_remote | ❌ مفقود |
| ✅ contact_phone | ❌ مفقود |
| ✅ contact_phone_verified | ❌ مفقود |
| ✅ contact_whatsapp | ❌ مفقود |
| ✅ contact_call | ❌ مفقود |
| ✅ contact_chat | ❌ مفقود |
| ✅ views_count | ❌ مفقود |
| ✅ offers_count | ❌ مفقود |
| ✅ published_at | ❌ مفقود |
| ✅ expires_at | ❌ مفقود |
| ✅ view_count | ❌ مفقود |
| ✅ budget_min (TEXT) | ✅ budget_min (NUMERIC) |
| ✅ budget_max (TEXT) | ✅ budget_max (NUMERIC) |
| ✅ status (USER-DEFINED) | ✅ status (CHECK constraint) |

---

## 📝 كيفية إضافة المفقود

### الخيار 1: استخدم ملف الإضافة الشامل
```sql
-- شغّل هذا الملف لإضافة كل المفقود
supabase/ADD_MISSING_TABLES_AND_COLUMNS.sql
```

### الخيار 2: أضف يدوياً حسب الحاجة
- راجع القائمة أعلاه
- أضف فقط ما تحتاجه فعلاً

---

## ⚠️ ملاحظات مهمة

1. **USER-DEFINED Types**: القديم يستخدم أنواع مخصصة مثل `offer_status`, `request_status`. الجديد يستخدم `CHECK constraints` بدلاً منها.

2. **price و budget**: 
   - القديم: `TEXT`
   - الجديد: `NUMERIC`
   - يمكن تغييرها في الملف إذا احتجت

3. **messages**: 
   - القديم: يعتمد على `request_id/offer_id`
   - الجديد: يعتمد على `conversation_id`
   - الملف يضيف الأعمدة القديمة للتوافق مع البيانات القديمة

4. **user_preferences**: 
   - لا حاجة لجدول منفصل
   - البيانات موجودة في `profiles`

---

## ✅ Checklist

- [ ] قراءة الفروقات أعلاه
- [ ] تحديد ما تحتاجه فعلاً
- [ ] شغّل `ADD_MISSING_TABLES_AND_COLUMNS.sql` (أو أجزاء منه)
- [ ] اختبار التطبيق
- [ ] تحديث الكود إذا لزم (خاصة messages و offers)

---

**تم إنشاء: 2025-01-26**
