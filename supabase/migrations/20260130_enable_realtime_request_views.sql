-- ==========================================
-- Enable Realtime for request_views table
-- ==========================================
-- This enables realtime subscriptions for request_views changes
-- Required for real-time badge count updates

-- Enable Realtime publication for request_views
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'request_views'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE request_views;
  END IF;
END $$;

-- Set REPLICA IDENTITY to FULL for better realtime performance
-- This allows tracking of all column changes (not just primary key)
ALTER TABLE request_views REPLICA IDENTITY FULL;

-- Verify Realtime is enabled
SELECT 
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'request_views';
