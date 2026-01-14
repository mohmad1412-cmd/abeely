# دليل استخدام المكونات في v0.dev

## المشكلة

v0.dev لم يتعرف على المكونات لأن:

1. **الاستيرادات الخارجية**: المكونات تعتمد على ملفات خارجية مثل:
   - `services/hapticService.ts`
   - `services/routingService.ts`
   - `services/placesService.ts`
   - `utils/categoryColors.ts`
   - `types.ts`
   - `data.ts`

2. **عدم وجود ملفات التكوين**: v0.dev يحتاج إلى:
   - `package.json` (لفهم التبعيات)
   - `tsconfig.json` (لإعدادات TypeScript)
   - `tailwind.config.js` (لإعدادات Tailwind)

3. **CSS Variables**: المكونات تستخدم CSS Variables من `globals.css`

## الحل

تم إنشاء ملفين:

### 1. `ui-files.zip` (النسخة الأولى - فقط المكونات)
   - مكونات UI فقط
   - ملفات CSS
   - `tailwind.config.js`
   
### 2. `ui-files-complete.zip` (النسخة الشاملة - مُوصى بها)
   - جميع المكونات
   - جميع الخدمات المطلوبة (`services/`)
   - جميع الأدوات المساعدة (`utils/`)
   - `types.ts` و `data.ts`
   - `package.json` و `tsconfig.json`
   - ملفات CSS كاملة
   - `README.md` للتوثيق

## كيفية الاستخدام في v0.dev

### الطريقة 1: استخدام النسخة الشاملة (الأفضل)

1. قم بفك ضغط `ui-files-complete.zip`
2. ارفع جميع الملفات إلى v0.dev
3. تأكد من تثبيت التبعيات:
   ```bash
   npm install react react-dom framer-motion lucide-react tailwindcss
   ```
4. قم باستيراد CSS:
   ```typescript
   import './styles/globals.css'
   ```

### الطريقة 2: استخدام مكونات محددة فقط

إذا كنت تريد استخدام مكون واحد فقط (مثل `Button.tsx`):

1. انسخ المكون
2. انسخ التبعيات المطلوبة فقط
3. قم بإزالة الاستيرادات غير الضرورية أو استبدلها بـ mock functions

## المكونات التي لا تحتاج خدمات خارجية

هذه المكونات يمكن استخدامها بشكل مستقل:

- `Badge.tsx`
- `EmptyState.tsx` (يعتمد على `Button.tsx`)
- `LoadingSkeleton.tsx`
- `StarRating.tsx`
- `StarRatingInput.tsx`
- `HighlightedText.tsx`

## المكونات التي تحتاج خدمات

- `Button.tsx` → `services/hapticService.ts`
- `CityAutocomplete.tsx` → `services/placesService.ts` + `hooks/useGoogleMapsLoader.ts`
- `CompactListView.tsx` → عدة خدمات و utils
- `ReportModal.tsx` → `services/reportsService.ts`
- وغيرها...

## نصيحة للمصمم

إذا كان v0.dev لا يزال لا يتعرف على المكونات:

1. **استخدم مكونات بسيطة أولاً**: ابدأ بـ `Badge.tsx` أو `StarRating.tsx`
2. **أضف التبعيات يدوياً**: قم بتثبيت المكتبات المطلوبة في v0.dev
3. **استخدم Mock functions**: إذا كان المكون يعتمد على خدمة، يمكن استبدالها بدالة بسيطة
4. **تحقق من الأخطاء**: راجع Console في v0.dev لمعرفة الأخطاء

## مثال على Mock function

بدلاً من `hapticService.tap()`, يمكنك استخدام:

```typescript
// Mock haptic service for v0.dev
export const hapticService = {
  tap: () => {},
  success: () => {},
  error: () => {},
  // ... etc
};
```
