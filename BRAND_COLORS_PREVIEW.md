# معاينة ألوان الهوية البصرية - Brand Colors Preview

## الألوان المستخدمة:
- **Primary (اللون الأساسي)**: `#1E968C` - Teal/أخضر مزرق
- **Accent (اللون الثانوي)**: `#153659` - أزرق داكن

---

## التعديلات المقترحة:

### 1. ملف `styles/globals.css`

#### التغييرات في الألوان:

**قبل:**
```css
--primary: #2563eb;  /* أزرق فاتح */
--accent: #6366f1;   /* بنفسجي */
```

**بعد:**
```css
--primary: #1E968C;  /* Teal - لون الهوية */
--accent: #153659;   /* أزرق داكن - لون الهوية */
```

#### التغييرات في التأثيرات:

**قبل:**
```css
.card-glow:hover {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.3);
}
```

**بعد:**
```css
.card-glow:hover {
    box-shadow: 0 0 20px rgba(30, 150, 140, 0.25);
    border-color: rgba(30, 150, 140, 0.3);
}
```

**قبل:**
```css
.input-premium:focus {
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}
```

**بعد:**
```css
.input-premium:focus {
    box-shadow: 0 0 0 3px rgba(30, 150, 140, 0.1);
}
```

**قبل:**
```css
::-webkit-scrollbar-thumb {
    background: var(--muted-foreground);
}
```

**بعد:**
```css
::-webkit-scrollbar-thumb {
    background: var(--primary); /* سيستخدم #1E968C */
}
```

---

### 2. ملف `tailwind.config.js`

#### إضافة تدرجات الألوان:

**إضافة:**
```js
boxShadow: {
    glow: "0 0 20px rgba(30, 150, 140, 0.3)",
    "glow-lg": "0 0 40px rgba(30, 150, 140, 0.4)",
    "glow-accent": "0 0 20px rgba(21, 54, 89, 0.3)",
    // ... باقي الظلال
},
backgroundImage: {
    "gradient-brand": "linear-gradient(135deg, #1E968C 0%, #153659 100%)",
    "gradient-brand-light": "linear-gradient(135deg, #2db5a9 0%, #1e4a73 100%)",
},
```

---

### 3. ملف `App.tsx`

#### التغييرات في Header:

**قبل:**
```tsx
<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent">
```

**بعد:**
```tsx
<div className="w-10 h-10 rounded-xl bg-gradient-brand">
```

---

## ملخص التغييرات:

✅ **الألوان الأساسية:**
- Primary: `#2563eb` → `#1E968C`
- Accent: `#6366f1` → `#153659`

✅ **التأثيرات البصرية:**
- جميع الظلال (shadows) ستستخدم ألوان الهوية
- تأثيرات الـ hover ستستخدم ألوان الهوية
- الـ focus states ستستخدم ألوان الهوية
- الـ scrollbar سيستخدم لون الهوية

✅ **التدرجات:**
- إضافة gradient classes جديدة للاستخدام في الأزرار والكروت

---

## الأماكن التي ستتأثر:

1. ✅ جميع الأزرار (Buttons)
2. ✅ الكروت (Cards) عند الـ hover
3. ✅ حقول الإدخال (Inputs) عند الـ focus
4. ✅ الـ scrollbar
5. ✅ الـ badges والتسميات
6. ✅ الـ links والروابط
7. ✅ أي عنصر يستخدم `primary` أو `accent` colors

---

## ملاحظات:

- التغييرات ستكون متسقة في جميع أنحاء التطبيق
- الوضع الداكن سيستخدم درجات أفتح من الألوان نفسها
- جميع التأثيرات البصرية ستتوافق مع الهوية البصرية

