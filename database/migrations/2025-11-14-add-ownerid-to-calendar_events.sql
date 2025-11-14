-- 2025-11-14-add-ownerid-to-calendar_events.sql
-- Add `owner_id` and ensure columns exist without assuming `user_id` is present.
-- This migration avoids referencing nonexistent columns.

BEGIN;

-- Ensure table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events' AND table_schema = 'public') THEN
        RAISE WARNING 'Table public.calendar_events does not exist; aborting.';
        RETURN;
    END IF;
END$$;

-- Add columns if missing
ALTER TABLE public.calendar_events
    ADD COLUMN IF NOT EXISTS owner_id uuid,
    ADD COLUMN IF NOT EXISTS color varchar(64),
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Note: do NOT attempt to populate owner_id from user_id because this database
-- does not have a `user_id` column (caused the earlier error). If you have a
-- different source column to populate owner_id from (e.g. creator_id), run a
-- separate migration with the correct column name.

-- Create index on owner_id if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_calendar_events_owner_id' AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_calendar_events_owner_id ON public.calendar_events(owner_id);
    END IF;
END$$;

COMMIT;

-- After running: re-run the failing request or restart local PostgREST server.
-- To run: paste into Supabase SQL Editor and execute, or run with psql.
