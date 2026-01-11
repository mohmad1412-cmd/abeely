
-- Force update RLS policies for Offers Visibility
-- This migration drops existing policies to ensure a clean slate and re-applies the correct ones.

-- 1. Enable RLS on offers table (just in case)
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- 2. "Request authors can view offers on their requests"
-- Drop potentially broken or conflicting old policies
DROP POLICY IF EXISTS "Request authors can view offers on their requests" ON offers;
DROP POLICY IF EXISTS "request_authors_view_offers" ON offers;

-- Create the policy using a direct EXISTS check
-- This allows a user to SELECT an offer row IF there exists a request with matching ID owned by that user.
CREATE POLICY "Request authors can view offers on their requests"
ON offers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM requests
    WHERE requests.id = offers.request_id
    AND requests.author_id = auth.uid()
  )
);

-- 3. "Service providers can view their own offers" (Provider side)
DROP POLICY IF EXISTS "Service providers can view their own offers" ON offers;
DROP POLICY IF EXISTS "providers_view_own_offers" ON offers;

CREATE POLICY "Service providers can view their own offers"
ON offers FOR ALL
USING (
  provider_id = auth.uid()
);

-- 4. "Service providers can update their own offers" (Explicit Update)
-- Sometimes ALL covers it, but being explicit helps avoid ambiguity if other policies exist.
-- (The ALL policy above covers SELECT, INSERT, UPDATE, DELETE for provider)

-- 5. "Service providers can delete their own pending offers"
-- (Covered by ALL above)

-- Verification Helper Comment:
-- After applying, verify by running:
-- SELECT count(*) FROM offers; -- as the user.
