-- ==========================================
-- تفعيل Realtime لجميع الجداول المطلوبة
-- ==========================================
-- شغّل هذا الملف لتفعيل Realtime على جميع الجداول
-- (مطلوب لنظام المراقبة والإشعارات الفورية)

-- تفعيل Realtime على requests (للطلبات الجديدة)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE requests;
  END IF;
END $$;

-- تفعيل Realtime على request_views (لتتبع القراءة)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'request_views'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE request_views;
  END IF;
END $$;

-- تفعيل Realtime على conversations (للمحادثات)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;
END $$;

-- تفعيل Realtime على messages (للرسائل)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- تفعيل Realtime على notifications (للإشعارات)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- التحقق من الجداول المفعّلة
SELECT 
  pubname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN (
    'requests',
    'request_views',
    'conversations',
    'messages',
    'notifications'
  )
ORDER BY tablename;

