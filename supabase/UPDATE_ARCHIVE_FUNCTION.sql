-- تحديث دالة archive_request لتعيين is_public = false تلقائياً
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

  IF EXISTS (
    SELECT 1 FROM requests 
    WHERE id = request_id_param AND author_id = user_id_param
  ) THEN
    UPDATE requests
    SET status = 'archived', is_public = false
    WHERE id = request_id_param AND author_id = user_id_param;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- تحديث دالة unarchive_request لاستعادة الحالة إلى 'active' بدلاً من 'completed'
CREATE OR REPLACE FUNCTION unarchive_request(request_id_param UUID, user_id_param UUID)
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
    SELECT 1 FROM requests 
    WHERE id = request_id_param AND author_id = user_id_param AND status = 'archived'
  ) THEN
    UPDATE requests
    SET status = 'active'
    WHERE id = request_id_param AND author_id = user_id_param;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

