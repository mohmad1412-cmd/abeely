-- Create reports table for handling user reports on requests, offers, and users
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('request', 'offer', 'user')),
  target_id TEXT NOT NULL, -- ID of the reported item (request_id, offer_id, or user_id)
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'fraud', 'harassment', 'misleading', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_id, report_type);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create reports (anyone authenticated)
CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Policy: Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Policy: Admins can view all reports (you'll need to create an admin role)
-- CREATE POLICY "Admins can view all reports"
--   ON reports
--   FOR ALL
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles 
--       WHERE profiles.id = auth.uid() 
--       AND profiles.role = 'admin'
--     )
--   );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Unique constraint to prevent duplicate reports from same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_per_user 
  ON reports(reporter_id, target_id, report_type);

