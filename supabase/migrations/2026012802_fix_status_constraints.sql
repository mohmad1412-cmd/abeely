
-- Fix offers status constraint
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
ALTER TABLE offers ADD CONSTRAINT offers_status_check 
  CHECK (status IN ('pending', 'accepted', 'rejected', 'negotiating', 'cancelled', 'completed', 'archived'));

-- Fix requests status constraint
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE requests ADD CONSTRAINT requests_status_check 
  CHECK (status IN ('active', 'assigned', 'completed', 'archived', 'draft'));
