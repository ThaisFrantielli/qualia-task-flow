-- SQL_ADD_CALENDAR_EVENTS_COLUMNS.sql
-- Safe migration to ensure `calendar_events` has expected columns used by the frontend.
-- Run this in Supabase SQL Editor or via psql. It will only add columns if they don't exist.

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

-- Optional: populate owner_id from user_id if present (safe update)
UPDATE public.calendar_events
SET owner_id = user_id
WHERE owner_id IS NULL
  AND user_id IS NOT NULL;

-- Add index on owner_id for faster lookups (if not exists)
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

-- Notes:
-- 1) After running this, PostgREST/Supabase should see the updated schema. If you still see PGRST204 errors,
--    try re-running the request or restart the local dev proxy/edge function that fronts PostgREST.
-- 2) To run locally via psql:
--    psql "postgresql://<db_user>:<db_pass>@<db_host>:<port>/<db_name>" -f SQL_ADD_CALENDAR_EVENTS_COLUMNS.sql
-- 3) To run in Supabase Dashboard: open SQL Editor, paste the contents and run.
-- 4) If you prefer a specific type for `color` (e.g., hex color length), adjust the varchar length.
-- 5) If you need to also add other missing columns (start_date, end_date, task_id, etc.) tell me which types you want and I can extend the migration.
