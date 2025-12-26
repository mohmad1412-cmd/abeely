-- ============================================================
-- PART 1: Add 'archived' to enum types
-- ============================================================
-- IMPORTANT: Run this FIRST, wait for it to complete, then run Part 2

-- Step 1: Add 'archived' to request_status enum (if using enum type)
DO $$ 
BEGIN
  -- Check if request_status enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
    -- Check if 'archived' already exists in the enum
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'archived' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'request_status')
    ) THEN
      -- Add 'archived' to the enum
      ALTER TYPE request_status ADD VALUE 'archived';
    END IF;
  END IF;
END $$;

-- Step 2: Add 'archived' to offer_status enum (if using enum type)
DO $$ 
BEGIN
  -- Check if offer_status enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'offer_status') THEN
    -- Check if 'archived' already exists in the enum
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'archived' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
    ) THEN
      -- Add 'archived' to the enum
      ALTER TYPE offer_status ADD VALUE 'archived';
    END IF;
  END IF;
END $$;

-- After running this, wait for completion, then run archive_schema_part2.sql

