-- Fix security_definer_view lint error for public.request_views_summary
-- The linter reports that this view is defined with SECURITY DEFINER property (security_invoker = false),
-- which enforces permissions of the view creator instead of the querying user.
-- This migration changes it to SECURITY INVOKER (security_invoker = true) to follow best practices.

ALTER VIEW public.request_views_summary SET (security_invoker = true);
