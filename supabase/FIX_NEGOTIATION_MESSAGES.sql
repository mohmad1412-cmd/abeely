-- ============================================
-- إصلاح مشاكل التفاوض والرسائل
-- قم بتشغيل هذا الملف مباشرة في Supabase SQL Editor
-- ============================================

-- 1. إضافة عمود attachments لجدول messages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'attachments'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
        RAISE NOTICE 'تم إضافة عمود attachments';
    END IF;
END $$;

-- 2. إضافة أعمدة الرسائل الصوتية
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'audio_url'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN audio_url text;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'audio_duration'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN audio_duration integer;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_type'
    ) THEN
        ALTER TABLE public.messages ADD COLUMN message_type text DEFAULT 'text';
    END IF;
END $$;

-- 3. إصلاح سياسات RLS لجدول notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 4. إضافة فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, is_read) WHERE is_read = false;

-- تم الانتهاء ✅
SELECT 'تم تطبيق جميع الإصلاحات بنجاح!' as result;
