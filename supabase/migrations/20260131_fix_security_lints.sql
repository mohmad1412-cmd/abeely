-- ==============================================================================
-- Security Fixes Migration
-- Addresses security linter warnings:
-- 1. function_search_path_mutable (public.update_user_ratings)
-- 2. extension_in_public (pg_net)
-- 3. auth_allow_anonymous_sign_ins (Tighten RLS to TO authenticated where appropriate)
-- ==============================================================================

-- 1. Fix mutable search path for update_user_ratings
ALTER FUNCTION public.update_user_ratings() SET search_path = public;

-- 2. Move pg_net extension to proper schema
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net' AND extnamespace = 'public'::regnamespace) THEN
      ALTER EXTENSION pg_net SET SCHEMA extensions;
      RAISE NOTICE 'Moved pg_net to extensions schema';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not move pg_net extension: %', SQLERRM;
END $$;

-- 3. TIGHTEN RLS POLICIES
-- Many policies default to "TO public" (including anon). We restrict sensitive user policies to "TO authenticated".

-- A. Categories
ALTER POLICY "Anyone can view categories" ON public.categories TO authenticated;

-- B. AI Conversations
DROP POLICY IF EXISTS "Users can view their own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users can view their own AI conversations" ON public.ai_conversations
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view AI messages in their conversations" ON public.ai_conversation_messages;
CREATE POLICY "Users can view AI messages in their conversations" ON public.ai_conversation_messages
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM ai_conversations c
    WHERE c.id = ai_conversation_messages.conversation_id
    AND c.user_id = auth.uid()
  )
);

-- C. Notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- D. FCM Tokens
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.fcm_tokens;
CREATE POLICY "Users can manage their own tokens" ON public.fcm_tokens
FOR ALL TO authenticated USING (auth.uid() = user_id);

-- E. Request Views (Registered Users Only)
DROP POLICY IF EXISTS "Users can view their own request views" ON public.request_views;
CREATE POLICY "Users can view their own request views" ON public.request_views
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- F. Conversations & Messages
-- Note: conversations uses participant1_id and participant2_id
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations" ON public.conversations
FOR SELECT TO authenticated USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  )
);

-- G. Profiles (Hardening)
-- Ensure profiles are only viewable by authenticated users
ALTER POLICY "Public profiles are viewable by everyone" ON public.profiles TO authenticated;

-- H. Reports (Registered Users Only)
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports" ON public.reports
FOR SELECT TO authenticated USING (reporter_id = auth.uid());

-- I. Reviews (Update/Delete)
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews" ON public.reviews
FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" ON public.reviews
FOR DELETE TO authenticated USING (auth.uid() = reviewer_id);

-- J. Request Categories
DROP POLICY IF EXISTS "Users can update request categories" ON public.request_categories;
CREATE POLICY "Users can update request categories" ON public.request_categories
FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM requests r 
        WHERE r.id = request_categories.request_id 
        AND r.author_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete request categories" ON public.request_categories;
CREATE POLICY "Users can delete request categories" ON public.request_categories
FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM requests r 
        WHERE r.id = request_categories.request_id 
        AND r.author_id = auth.uid()
    )
);

-- K. Request View Logs
DROP POLICY IF EXISTS "Users can view their own request view logs" ON public.request_view_logs;
CREATE POLICY "Users can view their own request view logs" ON public.request_view_logs
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. Hardening Other Policies
-- -----------------------------
-- (Add other hardening tasks here if needed)
