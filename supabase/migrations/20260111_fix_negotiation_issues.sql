-- إصلاح مشاكل التفاوض والرسائل
-- 1. إضافة عمود attachments لجدول messages
-- 2. إصلاح سياسات RLS لجدول notifications

-- ============================================
-- 1. إضافة عمود attachments لجدول messages
-- ============================================
DO $$
BEGIN
    -- التحقق من وجود العمود قبل إضافته
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'attachments'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
        RAISE NOTICE 'تم إضافة عمود attachments لجدول messages';
    ELSE
        RAISE NOTICE 'عمود attachments موجود بالفعل';
    END IF;
END $$;

-- ============================================
-- 2. إضافة أعمدة إضافية للرسائل الصوتية
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'audio_url'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN audio_url text;
        RAISE NOTICE 'تم إضافة عمود audio_url لجدول messages';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'audio_duration'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN audio_duration integer;
        RAISE NOTICE 'تم إضافة عمود audio_duration لجدول messages';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'image', 'file', 'mixed'));
        RAISE NOTICE 'تم إضافة عمود message_type لجدول messages';
    END IF;
END $$;

-- ============================================
-- 3. إصلاح سياسات RLS لجدول notifications
-- ============================================

-- حذف السياسات القديمة إذا وجدت
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark their notifications as read" ON public.notifications;

-- تفعيل RLS على جدول notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدم يرى إشعاراته فقط
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- سياسة الإدراج: أي مستخدم مسجل يمكنه إرسال إشعارات للآخرين
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- سياسة التحديث: المستخدم يمكنه تحديث إشعاراته فقط (مثل تعليمها كمقروءة)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- سياسة الحذف: المستخدم يمكنه حذف إشعاراته فقط
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- 4. التأكد من وجود الأعمدة المطلوبة في جدول notifications
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'related_message_id'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN related_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
        RAISE NOTICE 'تم إضافة عمود related_message_id لجدول notifications';
    END IF;
END $$;

-- ============================================
-- 5. إضافة فهارس لتحسين الأداء
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_attachments 
ON public.messages USING gin(attachments) 
WHERE attachments IS NOT NULL AND attachments != '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, is_read) 
WHERE is_read = false;

-- ============================================
-- تم الانتهاء من الإصلاحات
-- ============================================
