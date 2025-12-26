-- ==========================================
-- تفعيل Realtime لجدول requests
-- ==========================================
-- شغّل هذا الملف لتفعيل Realtime على جدول requests
-- (مطلوب لنظام مراقبة الطلبات الجديدة)

ALTER PUBLICATION supabase_realtime ADD TABLE requests;

