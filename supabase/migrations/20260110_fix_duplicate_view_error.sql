-- Fix duplicate key error in mark_request_read by using ON CONFLICT (Upsert)
-- This prevents race conditions where parallel calls (or rapid double-clicks) try to insert the same view record twice.

CREATE OR REPLACE FUNCTION mark_request_read(request_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Use UPSERT (Insert ... On Conflict) instead of Update + Insert
  -- This is atomic and prevents "duplicate key value" errors.
  INSERT INTO request_views (user_id, request_id, viewed_at, is_read, read_at)
  VALUES (current_user_id, request_id_param, NOW(), TRUE, NOW())
  ON CONFLICT (user_id, request_id)
  DO UPDATE SET
    is_read = TRUE,
    read_at = NOW(), -- Update read time to newest
    updated_at = NOW();

  RETURN TRUE;
END;
$$;
