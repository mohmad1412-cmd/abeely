# إعداد بحث الصور - Image Search Setup

## نظرة عامة
خدمة البحث عن الصور تدعم 3 مصادر:
1. **Google Custom Search** (الأفضل - يبحث في كل الإنترنت)
2. **Unsplash** (صور عالية الجودة مجانية)
3. **Pexels** (صور عالية الجودة مجانية)

## إعداد Google Custom Search (موصى به)

### الخطوة 1: إنشاء مفتاح API
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. اذهب إلى **APIs & Services** > **Credentials**
4. انقر **Create Credentials** > **API Key**
5. انسخ المفتاح

### الخطوة 2: تفعيل Custom Search API
1. اذهب إلى **APIs & Services** > **Library**
2. ابحث عن "Custom Search API"
3. انقر **Enable**

### الخطوة 3: إنشاء Search Engine
1. اذهب إلى [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. انقر **Add** لإنشاء محرك بحث جديد
3. في "Sites to search" اختر **Search the entire web**
4. فعّل **Image search**
5. انسخ **Search engine ID** (cx)

### الخطوة 4: إضافة المتغيرات إلى Supabase
```bash
# من خلال Supabase Dashboard > Project Settings > Edge Functions
# أو باستخدام CLI:
supabase secrets set GOOGLE_API_KEY=your_google_api_key
supabase secrets set GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
```

## إعداد Unsplash (بديل مجاني)

1. اذهب إلى [Unsplash Developers](https://unsplash.com/developers)
2. سجل تطبيق جديد
3. انسخ **Access Key**
4. أضفه كـ secret:
```bash
supabase secrets set UNSPLASH_ACCESS_KEY=your_unsplash_access_key
```

## إعداد Pexels (بديل مجاني)

1. اذهب إلى [Pexels API](https://www.pexels.com/api/)
2. سجل للحصول على API Key
3. أضفه كـ secret:
```bash
supabase secrets set PEXELS_API_KEY=your_pexels_api_key
```

## نشر Edge Function

```bash
# من مجلد المشروع
supabase functions deploy image-search
```

## اختبار الخدمة

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/image-search' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"query": "تنظيف منزل", "count": 3}'
```

## الاستجابة المتوقعة

```json
{
  "success": true,
  "images": [
    {
      "url": "https://...",
      "thumbnail": "https://...",
      "title": "House Cleaning Service",
      "source": "google"
    }
  ],
  "source": "google",
  "query": "تنظيف منزل",
  "enhanced_query": "تنظيف منزل cleaning service",
  "count": 3
}
```

## ملاحظات
- Google Custom Search API لديه حد 100 طلب/يوم مجاناً
- Unsplash لديه حد 50 طلب/ساعة في الخطة المجانية
- Pexels لديه حد 200 طلب/ساعة
- الخدمة تستخدم fallback تلقائي بين المصادر

