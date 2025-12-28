# إعداد Google OAuth - خطوة بخطوة مع الصور

## 📸 الخطوة الحالية: Create OAuth client ID

### 1️⃣ Application type
**اختر:** ✅ **Web application** (محدد بالفعل - صح!)

### 2️⃣ Name
**اكتب:** أي اسم (مثلاً: "Abeely Web" أو "ServiceLink Web")

### 3️⃣ Authorized JavaScript origins
**اتركه فارغ** أو أضف:
```
http://localhost:3000
http://localhost:3005
https://YOUR_PROJECT_REF.supabase.co
```
(استبدل `YOUR_PROJECT_REF` بـ project reference من Supabase Dashboard)

### 4️⃣ Authorized redirect URIs ⭐ (الأهم!)
**اضغط "+ Add URI" وأضف:**

#### للتطوير المحلي (Local):
```
http://127.0.0.1:54321/auth/v1/callback
```

#### للإنتاج (Supabase Cloud):
```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

**مثال:**
إذا كان project reference هو `abcdefghijklmnop`، أضف:
```
https://abcdefghijklmnop.supabase.co/auth/v1/callback
```

### 5️⃣ اضغط "Create"

---

## 📋 بعد الإنشاء

ستحصل على:
- **Client ID** (مثل: `123456789-abcdefg.apps.googleusercontent.com`)
- **Client Secret** (مثل: `GOCSPX-xxxxxxxxxxxxx`)

**احفظهم!** ستحتاجهم في الخطوة التالية.

---

## 🔧 الخطوة التالية: إضافة في Supabase

1. اذهب إلى **Supabase Dashboard**
2. **Project Settings > Auth**
3. ابحث عن **Google** في قائمة Providers
4. فعّل **Enable Google provider**
5. الصق:
   - **Client ID (for OAuth)**: Client ID من Google
   - **Client Secret (for OAuth)**: Client Secret من Google
6. احفظ

---

## ✅ جاهز!

الآن جرب تسجيل الدخول بـ Google في التطبيق!

---

## 🆘 ملاحظات مهمة

- ⏰ قد يستغرق التفعيل من 5 دقائق إلى ساعات قليلة (عادة 5 دقائق)
- 🔒 تأكد من إضافة Redirect URI الصحيح تماماً
- 📝 يمكنك إضافة أكثر من URI (للتنمية والإنتاج)

