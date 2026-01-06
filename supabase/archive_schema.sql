-- Archive Schema for Requests and Offers
-- This SQL adds 'archived' status to requests and offers tables
-- IMPORTANT: Run this file in TWO separate transactions!
-- First, run Steps 1-2 to add enum values, then commit.
-- Then run Steps 4-10 in a new transaction.

-- ============================================================
-- PART 1: Add 'archived' to enum types (RUN THIS FIRST, THEN COMMIT)
-- ============================================================

-- Step 1: Add 'archived' to request_status enum (if using enum type)
DO $$ 
BEGIN
  -- Check if request_status enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    -- Check if 'archived' already exists in the enum
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'archived' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
    ) THEN
      -- Add 'archived' to the enum (this must be in a separate transaction)
      ALTER TYPE request_status ADD VALUE 'archived';
    END IF;
  END IF;
END $$;

-- Step 2: Add 'archived' to offer_status enum (if using enum type)
DO $$ 
BEGIN
  -- Check if offer_status enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
    -- Check if 'archived' already exists in the enum
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'archived' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
    ) THEN
      -- Add 'archived' to the enum (this must be in a separate transaction)
      ALTER TYPE offer_status ADD VALUE 'archived';
    END IF;
  END IF;
END $$;

-- ============================================================
-- IMPORTANT: COMMIT THE TRANSACTION HERE BEFORE CONTINUING!
-- ============================================================
-- In Supabase SQL Editor, click "Run" to execute Steps 1-2 above,
-- wait for it to complete, then run Steps 4-10 below in a NEW query.

-- ============================================================
-- PART 2: Create functions and indexes (RUN THIS AFTER PART 1)
-- ============================================================

-- Step 3: Create function to archive a request
CREATE OR REPLACE FUNCTION archive_request(request_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF user_id_param IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RETURN FALSE;
  END IF;

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
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF user_id_param IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RETURN FALSE;
  END IF;
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
SET search_path = public
AS $$
DECLARE
  original_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF user_id_param IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RETURN FALSE;
  END IF;
  -- Get the original status before archiving (we'll use 'completed' as default, or you can store it separately)
  -- For now, we'll restore to 'completed' if it was archived, or keep as is
  IF EXISTS (
    SELECT 1 FROM requests 
    WHERE id = request_id_param AND author_id = user_id_param AND status = 'archived'
  ) THEN
    -- Restore to 'completed' status (you might want to store original status separately)
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
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF user_id_param IS DISTINCT FROM auth.uid() AND auth.role() <> 'service_role' THEN
    RETURN FALSE;
  END IF;
  IF EXISTS (
    SELECT 1 FROM offers 
    WHERE id = offer_id_param AND provider_id = user_id_param AND status = 'archived'
  ) THEN
    -- Restore to 'rejected' status (or you can store original status)
    UPDATE offers
    SET status = 'rejected'
    WHERE id = offer_id_param AND provider_id = user_id_param;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Step 7: Grant execute permissions (adjust based on your RLS policies)
-- These functions use SECURITY DEFINER, so they run with the function creator's privileges
-- Make sure your RLS policies allow the operations

-- Step 8: Add indexes for better performance when filtering archived items
-- Note: These indexes will work after 'archived' is added to the enum types
CREATE INDEX IF NOT EXISTS idx_requests_status_archived 
ON requests(status) 
WHERE status = 'archived';

CREATE INDEX IF NOT EXISTS idx_offers_status_archived 
ON offers(status) 
WHERE status = 'archived';

-- Step 9: Add composite indexes for user's archived items
-- Note: These indexes will work after 'archived' is added to the enum types
CREATE INDEX IF NOT EXISTS idx_requests_author_archived 
ON requests(author_id, status) 
WHERE status = 'archived';

CREATE INDEX IF NOT EXISTS idx_offers_provider_archived 
ON offers(provider_id, status) 
WHERE status = 'archived';

-- Note: Make sure your RLS policies allow users to:
-- 1. Update their own requests/offers to 'archived' status
-- 2. Select their own archived requests/offers
-- 3. Call the archive/unarchive functions

COMMENT ON FUNCTION archive_request IS 'Archives a request (sets status to archived). Only the request owner can archive their requests.';
COMMENT ON FUNCTION archive_offer IS 'Archives an offer (sets status to archived). Only the offer provider can archive their offers.';
COMMENT ON FUNCTION unarchive_request IS 'Unarchives a request (restores status to completed). Only the request owner can unarchive their requests.';
COMMENT ON FUNCTION unarchive_offer IS 'Unarchives an offer (restores status to rejected). Only the offer provider can unarchive their offers.';

