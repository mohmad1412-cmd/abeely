# اختبار اتصال Supabase

## الخطوة 1: تحقق من المتغيرات البيئية

افتح ملف `.env` وتأكد من وجود:
```
VITE_SUPABASE_URL=https://iwfvlrtmbixequntufjr.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here
```

## الخطوة 2: شغّل SQL في Supabase

اذهب إلى **Supabase Dashboard > SQL Editor** وشغّل هذا الكود:

```sql
-- تفعيل RLS
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- حذف جميع السياسات القديمة
DROP POLICY IF EXISTS "Anyone can view public requests" ON requests;
DROP POLICY IF EXISTS "Public requests are viewable by everyone" ON requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON requests;

-- سياسة القراءة للجميع (الضيوف والمسجلين)
CREATE POLICY "Public requests are viewable by everyone"
ON requests FOR SELECT
USING (is_public = true);

-- سياسة القراءة للمستخدمين لطلباتهم الخاصة
CREATE POLICY "Users can view their own requests"
ON requests FOR SELECT
USING (auth.uid() = author_id);

-- سياسة الإدراج
CREATE POLICY "Users can insert their own requests"
ON requests FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- سياسة التحديث
CREATE POLICY "Users can update their own requests"
ON requests FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- سياسة الحذف
CREATE POLICY "Users can delete their own requests"
ON requests FOR DELETE
USING (auth.uid() = author_id);
```

## الخطوة 3: تحقق من وجود طلبات

شغّل هذا في SQL Editor:

```sql
SELECT COUNT(*) FROM requests WHERE is_public = true;
```

إذا كانت النتيجة `0`، يعني **لا توجد طلبات عامة** في قاعدة البيانات!

## الخطوة 4: إنشاء طلب تجريبي (اختياري)

إذا لم توجد طلبات، أنشئ طلب تجريبي:

```sql
INSERT INTO requests (title, description, status, is_public, author_id)
VALUES (
  'طلب تجريبي',
  'هذا طلب تجريبي للاختبار',
  'active',
  true,
  NULL  -- أو UUID لمستخدم مسجل
);
```

## الخطوة 5: أعد تحميل التطبيق

بعد تطبيق SQL، أعد تحميل التطبيق (F5) وتحقق من Console.

