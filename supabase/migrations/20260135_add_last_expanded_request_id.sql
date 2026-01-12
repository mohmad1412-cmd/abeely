-- Add last_expanded_request_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_expanded_request_id TEXT;

-- Add comment
COMMENT ON COLUMN public.profiles.last_expanded_request_id IS 'آخر طلب تم فتحه من قبل المستخدم';
