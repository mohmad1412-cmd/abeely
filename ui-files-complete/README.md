# ServiceLink UI Components

## البنية (Structure)

```
ui-files-complete/
├── components/
│   └── ui/          # جميع مكونات UI (31 ملف)
├── services/        # الخدمات المطلوبة للمكونات
├── utils/           # أدوات مساعدة (colors, icons, timeFormat, etc.)
├── hooks/           # React hooks المطلوبة
├── styles/          # ملفات CSS
├── types.ts         # تعريفات TypeScript
├── data.ts          # بيانات الفئات (Categories)
├── package.json     # التبعيات والمكتبات المطلوبة
├── tsconfig.json    # إعدادات TypeScript
└── tailwind.config.js # إعدادات Tailwind CSS
```

## التبعيات المطلوبة (Required Dependencies)

- `react` & `react-dom`
- `framer-motion` (للأنيميشن)
- `lucide-react` (للأيقونات)
- `tailwindcss` (للتنسيق)
- `@supabase/supabase-js` (للبعض المكونات)

## كيفية الاستخدام في v0.dev

1. **رفع الملفات**: قم برفع جميع الملفات في v0.dev
2. **تثبيت التبعيات**: تأكد من تثبيت جميع المكتبات المذكورة في `package.json`
3. **إعداد Tailwind**: تأكد من تهيئة Tailwind CSS بشكل صحيح
4. **استيراد CSS**: قم باستيراد `styles/globals.css` في ملفك الرئيسي

## ملاحظات مهمة

- بعض المكونات تعتمد على خدمات Supabase (مثل `CityAutocomplete`, `ReportModal`)
- المكونات تستخدم CSS Variables المعرّفة في `globals.css`
- بعض المكونات تحتاج إلى Context (مثل `AppContext`) - قد تحتاج إلى تبسيطها للاستخدام في v0

## المكونات المتاحة

### مكونات أساسية
- `Button.tsx` - زر متعدد الأشكال
- `Badge.tsx` - شارة/علامة
- `EmptyState.tsx` - حالة فارغة
- `LoadingSkeleton.tsx` - هيكل التحميل
- `ErrorToast.tsx` - رسالة خطأ

### مكونات العرض
- `FullScreenCardsView.tsx` - عرض الكروت كاملة الشاشة
- `CompactListView.tsx` - عرض مضغوط
- `SnapCardView.tsx` - عرض بطاقات Snap
- `SimpleRequestCard.tsx` - بطاقة طلب بسيطة

### مكونات متقدمة
- `UnifiedHeader.tsx` - رأس موحد
- `UnifiedFilterIsland.tsx` - جزيرة الفلاتر
- `ViewModeSwitcher.tsx` - مبدل نمط العرض
- `StarRating.tsx` - تقييم بالنجوم
- `CategoryIcon.tsx` - أيقونة الفئة

وغيرها الكثير...

## الألوان المستخدمة

- **Primary**: #1E968C (تركوازي)
- **Secondary**: #C9A99A (لحمي دافئ)
- **Background**: #faf9f8 (فاتح)
- **Foreground**: #2d2a26 (داكن)

جميع الألوان معرّفة في `styles/globals.css` كـ CSS Variables.
