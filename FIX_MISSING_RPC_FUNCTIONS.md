# Fix Missing Supabase RPC Functions

## Problem

The application is calling three Supabase RPC functions that don't exist in the database, causing `404 (Not Found)` errors with code `PGRST202`:

1. `mark_request_viewed` - Called when a user opens a request detail page
2. `mark_request_read` - Called when a user fully reads a request
3. `increment_request_views` - Called to track view counts for requests

Additionally, these related functions may also be missing:
- `get_unread_interests_count` - Gets count of unread requests matching user interests
- `get_request_view_count` - Gets view count for a specific request
- `get_request_view_stats` - Gets detailed view statistics for a request

## Error Details

From the console logs:
```
POST .../rpc/mark_request_viewed 404 (Not Found)
POST .../rpc/mark_request_read 404 (Not Found)
POST .../rpc/increment_request_views 404 (Not Found)
```

Error code: `PGRST202` - Function not found in schema cache

## Solution

A migration file has been created at:
```
supabase/migrations/20260127_add_request_views_functions.sql
```

This migration includes:
- All missing RPC functions
- Required database tables (`request_views`, `request_view_logs`)
- Required indexes
- RLS policies for security
- Proper permissions for `anon` and `authenticated` roles

## How to Apply the Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Open the file: `supabase/migrations/20260127_add_request_views_functions.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run** to execute

### Option 2: Using Supabase CLI

If you have Supabase CLI installed and linked to your project:

```bash
# Navigate to your project root
cd c:\dev\copy-of-copy-of-servicelink-ai-platform

# Apply the migration
supabase db push
```

Or if you want to apply a specific migration:

```bash
# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### Option 3: Manual Application

If the above options don't work, you can manually run the SQL commands from the migration file in your Supabase Dashboard SQL Editor.

## Verification

After applying the migration, verify the functions exist:

1. Go to Supabase Dashboard → Database → Functions
2. You should see these functions listed:
   - `mark_request_viewed`
   - `mark_request_read`
   - `increment_request_views`
   - `get_unread_interests_count`
   - `get_request_view_count`
   - `get_request_view_stats`

Or test via SQL Editor:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'mark_request_viewed',
    'mark_request_read',
    'increment_request_views',
    'get_unread_interests_count',
    'get_request_view_count',
    'get_request_view_stats'
  );
```

## What This Fixes

- ✅ Eliminates `404` errors when clicking on service cards in the Marketplace
- ✅ Enables proper tracking of request views
- ✅ Enables marking requests as viewed/read
- ✅ Enables view count tracking for requests
- ✅ Fixes the "WebSocket connection closed" warning (if related)

## Files Modified

- ✅ Created: `supabase/migrations/20260127_add_request_views_functions.sql`

## Notes

- The migration uses `CREATE OR REPLACE FUNCTION`, so it's safe to run multiple times
- All functions use `SECURITY DEFINER` with `SET search_path = public` for security
- RLS policies ensure users can only access their own view data
- The migration is idempotent (safe to run multiple times)
