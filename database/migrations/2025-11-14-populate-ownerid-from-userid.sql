-- 2025-11-14-populate-ownerid-from-userid.sql
-- Populate `owner_id` from `user_id` safely (idempotent).
-- Safe to run multiple times. Skips if table/columns missing.

BEGIN;

-- Ensure table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events' AND table_schema = 'public') THEN
        RAISE WARNING 'Table public.calendar_events does not exist; aborting populate migration.';
        RETURN;
    END IF;
END$$;

-- Ensure owner_id column exists
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Populate owner_id from user_id if user_id column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'user_id'
    ) THEN
        -- Only set where owner_id is NULL and user_id is not NULL
        UPDATE public.calendar_events
        SET owner_id = user_id
        WHERE owner_id IS NULL AND user_id IS NOT NULL;
    ELSE
        RAISE NOTICE 'Column user_id not found on public.calendar_events; skipping population.';
    END IF;
END$$;

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

-- Notes:
-- - This migration is idempotent and will not overwrite existing owner_id values.
-- - If your source-of-truth for creators is a different column (e.g. creator_id), adjust the UPDATE accordingly.
