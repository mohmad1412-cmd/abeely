-- ==============================================================================
-- Security Remediation Migration V2
-- Addresses remaining security linter warnings:
-- 1. extension_in_public (pg_net)
-- 2. auth_allow_anonymous_sign_ins (Harden RLS for categories, cities, requests, etc.)
-- ==============================================================================

-- 1. Ensure extensions schema exists and move pg_net
-- Note: 'ALTER EXTENSION pg_net SET SCHEMA extensions' is not supported.
-- We drop and recreate it instead.
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net' AND extnamespace = 'public'::regnamespace) THEN
      DROP EXTENSION pg_net;
      CREATE EXTENSION pg_net SCHEMA extensions;
  END IF;
END $$;

-- 2. HARDEN RLS POLICIES (Restrict from public/anon to authenticated)

-- A. Categories (Make viewable only by authenticated users)
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories
FOR SELECT TO authenticated USING (true);

-- B. Cities
DROP POLICY IF EXISTS "Anyone can view active cities" ON public.cities;
CREATE POLICY "Anyone can view active cities" ON public.cities
FOR SELECT TO authenticated USING (is_active = true);

-- C. Requests
DROP POLICY IF EXISTS "Public requests are viewable by everyone" ON public.requests;
CREATE POLICY "Public requests are viewable by everyone" ON public.requests
FOR SELECT TO authenticated USING (status = 'active' OR author_id = auth.uid());

-- D. Offers
DROP POLICY IF EXISTS "Anyone can view offers" ON public.offers;
DROP POLICY IF EXISTS "Anyone can view offers for public requests" ON public.offers;
CREATE POLICY "Authenticated users can view offers" ON public.offers
FOR SELECT TO authenticated USING (
    provider_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM requests r 
        WHERE r.id = offers.request_id 
        AND r.author_id = auth.uid()
    )
);

-- E. Verified Guests
DROP POLICY IF EXISTS "Guests can view their own verified guest records" ON public.verified_guests;
CREATE POLICY "Guests can view their own verified guest records" ON public.verified_guests
FOR SELECT TO authenticated USING (code_expires_at > NOW());

DROP POLICY IF EXISTS "Guests can update their own verified guest records" ON public.verified_guests;
CREATE POLICY "Guests can update their own verified guest records" ON public.verified_guests
FOR UPDATE TO authenticated USING (code_expires_at > NOW());

-- H. Profiles (Harden SELECT)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles
FOR SELECT TO authenticated USING (true);

-- I. Request View Logs
DROP POLICY IF EXISTS "Request owners can view their request view logs" ON public.request_view_logs;
DROP POLICY IF EXISTS "Users can view their own view logs" ON public.request_view_logs;
CREATE POLICY "Users can view their own view logs" ON public.request_view_logs
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM requests r 
        WHERE r.id = request_view_logs.request_id 
        AND r.author_id = auth.uid()
    )
);

-- J. User Ratings
DROP POLICY IF EXISTS "user_ratings_select_policy" ON public.user_ratings;
CREATE POLICY "user_ratings_select_policy" ON public.user_ratings
FOR SELECT TO authenticated USING (true);

-- F. Realtime Schema
DO $$
BEGIN
  -- Check if table exists AND column exists before applying policy
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') 
     AND EXISTS (
       SELECT 1 FROM information_schema.columns 
       WHERE table_schema = 'realtime' AND table_name = 'messages' AND column_name = 'conversation_id'
     ) 
  THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view messages in their conversations" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Users can view messages in their conversations" ON realtime.messages 
             FOR SELECT TO authenticated USING (
               EXISTS (
                 SELECT 1 FROM public.conversations c
                 WHERE c.id = messages.conversation_id
                 AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
               )
             )';
  END IF;
END $$;
-- G. Note on Storage Schema
-- Note: Storage policies should be updated via the Supabase Dashboard 
-- to avoid permission issues with the 'storage.objects' table ownership.
