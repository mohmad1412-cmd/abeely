# Supabase SQL Run Order

This is a safe, non-destructive order for an existing project. For a fresh
setup, use AUTH_SETUP_COMPLETE.sql first (it drops tables).

## Existing project (recommended)
1. supabase/AUTH_TRIGGERS.sql
2. supabase/AUTH_RLS_POLICIES.sql
3. supabase/user_preferences_schema.sql
4. supabase/archive_schema.sql (or supabase/archive_schema_part2.sql, not both)
5. supabase/UPDATE_ARCHIVE_FUNCTION.sql (optional: archive sets is_public=false)
6. supabase/CHAT_CONVERSATIONS_SCHEMA.sql
7. supabase/CATEGORIES_AND_NOTIFICATIONS_SETUP.sql (if not already applied)
8. supabase/FIX_TRIGGER_ERROR.sql
9. supabase/FIX_SECURITY_WARNINGS.sql
10. supabase/FIX_FUNCTION_SEARCH_PATH.sql
11. supabase/FIX_NOTIFICATIONS_RLS.sql
12. supabase/FIX_SUPABASE_WARNINGS.sql (optional if 9/10 already ran)

## Fresh install (destructive)
1. supabase/AUTH_SETUP_COMPLETE.sql
2. supabase/CHAT_CONVERSATIONS_SCHEMA.sql
3. supabase/user_preferences_schema.sql
4. supabase/archive_schema.sql (or supabase/archive_schema_part2.sql)
5. supabase/UPDATE_ARCHIVE_FUNCTION.sql (optional)
6. supabase/CATEGORIES_AND_NOTIFICATIONS_SETUP.sql
7. supabase/FIX_TRIGGER_ERROR.sql
8. supabase/FIX_SECURITY_WARNINGS.sql
9. supabase/FIX_FUNCTION_SEARCH_PATH.sql
10. supabase/FIX_NOTIFICATIONS_RLS.sql

## Notes
- Do not run both archive_schema.sql and archive_schema_part2.sql.
- The last script that defines a function wins; keep the order above to preserve
  the security checks.
