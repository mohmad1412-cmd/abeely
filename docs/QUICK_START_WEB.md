# ⚡ تشغيل سريع على الويب (5 دقائق)

## الخطوات السريعة:

### 1. تحديث `.env`:
```env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_key_here
```

### 2. تثبيت وتشغيل:
```bash
npm install
npm run dev
```

### 3. افتح المتصفح:
```
http://localhost:3005
```

✅ **تم!**

---

## 🔥 إضافة Firebase للإشعارات:

📖 راجع: `docs/ADD_FIREBASE_FOR_NOTIFICATIONS.md`

**سريع:**
1. Firebase Console → Project Settings → Service accounts → Generate new private key
2. Supabase Dashboard → Edge Functions → `send-push-notification-fast` → Settings → Secrets
3. Add: `FIREBASE_SERVICE_ACCOUNT` = (محتوى JSON)

---

**للتشغيل الكامل**: راجع `docs/SETUP_NEW_PROJECT_FOR_WEB.md`
