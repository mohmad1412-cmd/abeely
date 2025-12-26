-- ============================================================
-- PART 2: Create functions and indexes
-- ============================================================
-- IMPORTANT: Run this AFTER Part 1 has been committed!

-- Step 3: Create function to archive a request
CREATE OR REPLACE FUNCTION archive_request(request_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the request belongs to the user
  IF EXISTS (
    SELECT 1 FROM requests 
    WHERE id = request_id_param AND author_id = user_id_param
  ) THEN
    -- Update status to archived
    UPDATE requests
    SET status = 'archived'
    WHERE id = request_id_param AND author_id = user_id_param;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Step 4: Create function to archive an offer
CREATE OR REPLACE FUNCTION archive_offer(offer_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the offer belongs to the user
  IF EXISTS (
    SELECT 1 FROM offers 
    WHERE id = offer_id_param AND provider_id = user_id_param
  ) THEN
    -- Update status to archived
    UPDATE offers
    SET status = 'archived'
    WHERE id = offer_id_param AND provider_id = user_id_param;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Step 5: Create function to unarchive a request
CREATE OR REPLACE FUNCTION unarchive_request(request_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  original_status TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM requests 
    WHERE id = request_id_param AND author_id = user_id_param AND status = 'archived'
  ) THEN
    -- Restore to 'completed' status
    UPDATE requests
    SET status = 'completed'
    WHERE id = request_id_param AND author_id = user_id_param;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Step 6: Create function to unarchive an offer
CREATE OR REPLACE FUNCTION unarchive_offer(offer_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM offers 
    WHERE id = offer_id_param AND provider_id = user_id_param AND status = 'archived'
  ) THEN
    -- Restore to 'rejected' status
    UPDATE offers
    SET status = 'rejected'
    WHERE id = offer_id_param AND provider_id = user_id_param;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Step 7: Add indexes for better performance when filtering archived items
CREATE INDEX IF NOT EXISTS idx_requests_status_archived 
ON requests(status) 
WHERE status = 'archived';

CREATE INDEX IF NOT EXISTS idx_offers_status_archived 
ON offers(status) 
WHERE status = 'archived';

-- Step 8: Add composite indexes for user's archived items
CREATE INDEX IF NOT EXISTS idx_requests_author_archived 
ON requests(author_id, status) 
WHERE status = 'archived';

CREATE INDEX IF NOT EXISTS idx_offers_provider_archived 
ON offers(provider_id, status) 
WHERE status = 'archived';

-- Step 9: Add comments to functions
COMMENT ON FUNCTION archive_request IS 'Archives a request (sets status to archived). Only the request owner can archive their requests.';
COMMENT ON FUNCTION archive_offer IS 'Archives an offer (sets status to archived). Only the offer provider can archive their offers.';
COMMENT ON FUNCTION unarchive_request IS 'Unarchives a request (restores status to completed). Only the request owner can unarchive their requests.';
COMMENT ON FUNCTION unarchive_offer IS 'Unarchives an offer (restores status to rejected). Only the offer provider can unarchive their offers.';

-- Note: Make sure your RLS policies allow users to:
-- 1. Update their own requests/offers to 'archived' status
-- 2. Select their own archived requests/offers
-- 3. Call the archive/unarchive functions

