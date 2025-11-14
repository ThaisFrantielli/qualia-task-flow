-- 2025-11-14-populate-ownerid-from-tasks.sql
-- Populate calendar_events.owner_id from tasks.user_id using task_id foreign key.
-- Idempotent and safe: only sets owner_id where it is currently NULL.

BEGIN;

-- Ensure calendar_events and tasks tables exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_events') THEN
        RAISE WARNING 'Table public.calendar_events does not exist; aborting populate-from-tasks migration.';
        RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        RAISE WARNING 'Table public.tasks does not exist; aborting populate-from-tasks migration.';
        RETURN;
    END IF;
END$$;

-- Ensure tasks.user_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'user_id'
    ) THEN
        RAISE NOTICE 'Column tasks.user_id not found; skipping populate-from-tasks migration.';
        RETURN;
    END IF;
END$$;

-- Ensure owner_id column exists on calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Update owner_id by joining to tasks.user_id where owner_id is NULL
-- This will only fill rows where calendar_events.task_id is present and matches tasks.id
UPDATE public.calendar_events ce
SET owner_id = t.user_id
FROM public.tasks t
WHERE ce.owner_id IS NULL
  AND ce.task_id IS NOT NULL
  AND t.id = ce.task_id
  AND t.user_id IS NOT NULL;

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
-- - Idempotent: safe to re-run; will not overwrite existing owner_id values.
-- - If your tasks table has a different column name for the task owner (e.g. owner_id), adjust the script accordingly.
