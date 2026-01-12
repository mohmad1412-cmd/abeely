-- ==============================================================================
-- Final Comprehensive Security Hardening
-- This script ensures ALL active policies are restricted TO authenticated users.
-- This addresses the "Anonymous Access Policies" (auth_allow_anonymous_sign_ins) lints.
-- ==============================================================================

-- 1. Hardening Public Schema Tables
-- ---------------------------------

-- AI Conversations
ALTER POLICY "Users can view their own AI conversations" ON public.ai_conversations TO authenticated;

-- AI Conversation Messages
ALTER POLICY "Users can view AI messages in their conversations" ON public.ai_conversation_messages TO authenticated;

-- Categories
ALTER POLICY "Anyone can view categories" ON public.categories TO authenticated;

-- Cities
ALTER POLICY "Anyone can view active cities" ON public.cities TO authenticated;

-- Conversations
ALTER POLICY "Users can view their own conversations" ON public.conversations TO authenticated;

-- FCM Tokens
ALTER POLICY "Users can manage their own tokens" ON public.fcm_tokens TO authenticated;

-- Messages
ALTER POLICY "Users can view messages in their conversations" ON public.messages TO authenticated;

-- Notifications
ALTER POLICY "Users can view their own notifications" ON public.notifications TO authenticated;
ALTER POLICY "Users can update their own notifications" ON public.notifications TO authenticated;
ALTER POLICY "Users can delete their own notifications" ON public.notifications TO authenticated;

-- Offers
ALTER POLICY "Authenticated users can view offers" ON public.offers TO authenticated;
ALTER POLICY "Providers can delete their own pending offers" ON public.offers TO authenticated;
ALTER POLICY "Providers can update their own offers" ON public.offers TO authenticated;
ALTER POLICY "Providers can view their own offers" ON public.offers TO authenticated;
ALTER POLICY "Request authors can view offers on their requests" ON public.offers TO authenticated;
-- Handle other existing offer policies identified by lints
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Request owners can update offer status') THEN
    ALTER POLICY "Request owners can update offer status" ON public.offers TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Service providers can view their own offers') THEN
    ALTER POLICY "Service providers can view their own offers" ON public.offers TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Users can delete their own offers') THEN
    ALTER POLICY "Users can delete their own offers" ON public.offers TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offers' AND policyname = 'Users can update their own offers') THEN
    ALTER POLICY "Users can update their own offers" ON public.offers TO authenticated;
  END IF;
END $$;

-- Pending Categories
ALTER POLICY "Users can view pending categories" ON public.pending_categories TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_categories' AND policyname = 'Admins can delete pending categories') THEN
    ALTER POLICY "Admins can delete pending categories" ON public.pending_categories TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_categories' AND policyname = 'Admins can update pending categories') THEN
    ALTER POLICY "Admins can update pending categories" ON public.pending_categories TO authenticated;
  END IF;
END $$;

-- Profiles
ALTER POLICY "Public profiles are viewable by authenticated users" ON public.profiles TO authenticated;
ALTER POLICY "Users can update own profile" ON public.profiles TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    ALTER POLICY "Users can update their own profile" ON public.profiles TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
    ALTER POLICY "Users can view their own profile" ON public.profiles TO authenticated;
  END IF;
END $$;

-- Reports
ALTER POLICY "Users can view their own reports" ON public.reports TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Admins can delete reports') THEN
    ALTER POLICY "Admins can delete reports" ON public.reports TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports' AND policyname = 'Admins can update reports') THEN
    ALTER POLICY "Admins can update reports" ON public.reports TO authenticated;
  END IF;
END $$;

-- Request Categories
ALTER POLICY "Users can delete request categories" ON public.request_categories TO authenticated;
ALTER POLICY "Users can update request categories" ON public.request_categories TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'request_categories' AND policyname = 'Anyone can view request categories') THEN
    ALTER POLICY "Anyone can view request categories" ON public.request_categories TO authenticated;
  END IF;
END $$;

-- Request View Logs
ALTER POLICY "Users can view their own view logs" ON public.request_view_logs TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'request_view_logs' AND policyname = 'Users can view their own request view logs') THEN
    ALTER POLICY "Users can view their own request view logs" ON public.request_view_logs TO authenticated;
  END IF;
END $$;

-- Request Views
ALTER POLICY "Users can view their own request views" ON public.request_views TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'request_views' AND policyname = 'Users can delete their own request views') THEN
    ALTER POLICY "Users can delete their own request views" ON public.request_views TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'request_views' AND policyname = 'Users can update their own request views') THEN
    ALTER POLICY "Users can update their own request views" ON public.request_views TO authenticated;
  END IF;
END $$;

-- Requests
ALTER POLICY "Public requests are viewable by everyone" ON public.requests TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requests' AND policyname = 'Users can delete their own requests') THEN
    ALTER POLICY "Users can delete their own requests" ON public.requests TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requests' AND policyname = 'Users can update their own requests') THEN
    ALTER POLICY "Users can update their own requests" ON public.requests TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requests' AND policyname = 'Users can view their own requests') THEN
    ALTER POLICY "Users can view their own requests" ON public.requests TO authenticated;
  END IF;
END $$;

-- Reviews
ALTER POLICY "Users can delete their own reviews" ON public.reviews TO authenticated;
ALTER POLICY "Users can update their own reviews" ON public.reviews TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_delete_policy') THEN
    ALTER POLICY "reviews_delete_policy" ON public.reviews TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_select_policy') THEN
    ALTER POLICY "reviews_select_policy" ON public.reviews TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'reviews_update_policy') THEN
    ALTER POLICY "reviews_update_policy" ON public.reviews TO authenticated;
  END IF;
END $$;

-- User Ratings
ALTER POLICY "user_ratings_select_policy" ON public.user_ratings TO authenticated;

-- Verified Guests
ALTER POLICY "Guests can update their own verified guest records" ON public.verified_guests TO authenticated;
ALTER POLICY "Guests can view their own verified guest records" ON public.verified_guests TO authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'verified_guests' AND policyname = 'System can clean expired guest records') THEN
    ALTER POLICY "System can clean expired guest records" ON public.verified_guests TO authenticated;
  END IF;
END $$;

-- 2. Hardening Realtime & Storage (Note: Storage might require Dashboard/Owner)
-- --------------------------------------------------------------------------

-- Realtime Messages
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'realtime' AND tablename = 'messages') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'realtime' AND tablename = 'messages' AND policyname = 'Users can view messages in their conversations') THEN
      EXECUTE 'ALTER POLICY "Users can view messages in their conversations" ON realtime.messages TO authenticated';
    END IF;
  END IF;
END $$;

-- Note: storage.objects policies cannot be modified via simple SQL without ownership.
-- Use Supabase Dashboard to change "Public can read..." policies to "TO authenticated".
