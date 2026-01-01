# 🤖 Customer Service AI - دليل الإعداد والاستخدام

## 📋 نظرة عامة

نظام خدمة العملاء الذكي (Abeely Linguistic Orchestrator) يوفر:
- ✅ فهم الطلبات بجميع اللغات واللهجات (Mirror Principle)
- ✅ تحويل الصوت لنص عبر Whisper API
- ✅ أسئلة توضيحية ذكية (5 صفحات كحد أقصى)
- ✅ إعادة صياغة احترافية
- ✅ تصنيف ذكي مع اقتراح تصنيفات جديدة
- ✅ سحب الفئات ديناميكياً من قاعدة البيانات

---

## 🔧 إعداد البيئة

### 1. إضافة مفاتيح API في Supabase

اذهب إلى: **Supabase Dashboard → Settings → Edge Functions → Secrets**

أضف المفاتيح التالية:

```bash
# مفتاح Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# مفتاح OpenAI (لـ Whisper)
OPENAI_API_KEY=sk-xxxxx
```

### 2. نشر Edge Function

```bash
# من مجلد المشروع
supabase functions deploy customer-service-ai
```

### 3. التأكد من جدول التصنيفات

تأكد من وجود جدول `categories` في Supabase:

```sql
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  emoji TEXT DEFAULT '📋',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- إدخال التصنيفات الأساسية
INSERT INTO categories (id, label, emoji, description, sort_order) VALUES
  ('tech-support', 'الدعم التقني', '💻', 'مشاكل تقنية وتطبيقات', 1),
  ('complaints', 'الشكاوى والاقتراحات', '📝', 'تقديم شكوى أو اقتراح', 2),
  ('financial', 'الاستفسارات المالية', '💰', 'فواتير ومدفوعات', 3),
  ('driving', 'طلبات السياقة', '🚗', 'خدمات التوصيل والسائقين', 4),
  ('delivery', 'خدمات التوصيل', '📦', 'توصيل طرود ومنتجات', 5),
  ('booking', 'حجز المواعيد', '📅', 'حجز موعد أو خدمة', 6),
  ('refund', 'استرجاع والغاء', '↩️', 'طلب استرجاع أو إلغاء', 7),
  ('profile', 'تحديث البيانات الشخصية', '👤', 'تعديل الملف الشخصي', 8),
  ('help', 'المساعدة في استخدام التطبيق', '❓', 'كيفية استخدام التطبيق', 9),
  ('partnership', 'طلبات الشراكة', '🤝', 'فرص الشراكة والتعاون', 10),
  ('jobs', 'التوظيف والعمل', '💼', 'فرص العمل والتوظيف', 11),
  ('other', 'أخرى', '📋', 'طلبات أخرى', 100);
```

### 4. جدول التصنيفات المقترحة

```sql
CREATE TABLE IF NOT EXISTS pending_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_label TEXT NOT NULL,
  suggested_emoji TEXT DEFAULT '📋',
  suggested_description TEXT,
  suggested_by_ai BOOLEAN DEFAULT false,
  request_id UUID,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, merged
  merged_with TEXT, -- إذا تم دمجه مع تصنيف موجود
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🚀 كيفية الاستخدام

### في الواجهة الأمامية

```tsx
import { CustomerServiceChat } from './components/CustomerServiceChat';

function App() {
  return (
    <CustomerServiceChat
      onBack={() => navigate('/')}
      onSubmit={(finalReview) => {
        console.log('تم إرسال الطلب:', finalReview);
        // إرسال للباك إند
      }}
    />
  );
}
```

### استخدام الـ Service مباشرة

```tsx
import { 
  processCustomerRequest,
  startInteraction,
  answerClarification 
} from './services/customerServiceAI';

// معالجة طلب مباشر
const response = await processCustomerRequest(
  'أبغى سباك يصلح تسريب في الحمام',
  audioBlob, // اختياري
  previousAnswers // اختياري
);

if (response.data?.clarification_needed) {
  // عرض الأسئلة التوضيحية
  console.log(response.data.clarification_pages);
} else {
  // الطلب جاهز
  console.log(response.data?.final_review);
}
```

---

## 📊 بنية الاستجابة

```typescript
{
  "success": true,
  "data": {
    "scratchpad": "Internal reasoning...",
    "language_detected": "Arabic-Najdi",
    "clarification_needed": false,
    "total_pages": 0,
    "clarification_pages": [],
    "final_review": {
      "title": "طلب خدمة سباكة - إصلاح تسريب",
      "reformulated_request": "أحتاج فني سباكة لإصلاح تسريب مياه في الحمام...",
      "system_category": "maintenance",
      "new_category_suggestion": "لا يوجد",
      "ui_action": "show_confirmation_screen"
    }
  },
  "meta": {
    "model": "claude-sonnet-4-20250514",
    "categories_count": 12,
    "has_audio": false,
    "timestamp": "2026-01-01T12:00:00Z"
  }
}
```

---

## 🎯 اقتراحات لتحسين البرومبت

### 1. إضافة أمثلة للهجات (Few-shot)

```
## Examples of Dialect Matching:

Input (Najdi): "أبي واحد يصلح المكيف"
Output: "أحتاج فني تكييف يصلح لي المكيف"

Input (Hijazi): "عايز حد يوصلني للمطار"
Output: "أحتاج سواق يوصلني للمطار"

Input (Egyptian): "محتاج حد ينضفلي الشقة"
Output: "محتاج خدمة تنظيف للشقة"
```

### 2. إضافة Confidence Score

```json
{
  "final_review": {
    ...
    "confidence_score": 0.95,
    "confidence_reason": "Request is clear and matches existing category"
  }
}
```

### 3. إضافة Urgency Detection

```json
{
  "final_review": {
    ...
    "urgency": "high", // low, medium, high, critical
    "urgency_reason": "User mentioned 'عاجل' and 'الآن'"
  }
}
```

### 4. إضافة Sentiment Analysis

```json
{
  "final_review": {
    ...
    "sentiment": "neutral", // positive, neutral, negative, frustrated
    "requires_escalation": false
  }
}
```

---

## 🔒 ملاحظات أمنية

1. **لا تخزن مفاتيح API في الكود** - استخدم Supabase Secrets
2. **حدد Rate Limiting** - لمنع الاستخدام المفرط
3. **راجع الـ Logs** - لمتابعة أي مشاكل

---

## 📁 الملفات المُنشأة

```
supabase/functions/customer-service-ai/
├── index.ts          # Edge Function الرئيسية
└── deno.json         # إعدادات Deno

services/
└── customerServiceAI.ts  # Service للواجهة الأمامية

components/
└── CustomerServiceChat.tsx  # واجهة المستخدم
```

---

## 🐛 حل المشاكل

### خطأ: "ANTHROPIC_API_KEY not configured"
- تأكد من إضافة المفتاح في Supabase Secrets
- أعد نشر الـ Edge Function

### خطأ: "Whisper transcription failed"
- تأكد من صحة مفتاح OpenAI
- تأكد من أن صيغة الصوت مدعومة (webm, mp3, wav)

### الفئات لا تظهر
- تأكد من وجود جدول `categories`
- تأكد من أن `is_active = true`

---

## 🚀 الخطوات التالية

1. [ ] إضافة لوحة تحكم للأدمن لإدارة التصنيفات المقترحة
2. [ ] إضافة تحليلات للطلبات الأكثر شيوعاً
3. [ ] إضافة نظام تقييم لجودة الردود
4. [ ] دعم المرفقات (صور، ملفات)

