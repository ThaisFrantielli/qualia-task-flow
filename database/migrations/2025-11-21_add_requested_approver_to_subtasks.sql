-- Migration: adicionar requested_approver_id em subtasks
BEGIN;

ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS requested_approver_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    WHERE c.conname = 'subtasks_requested_approver_id_fkey'
  ) THEN
    ALTER TABLE public.subtasks
      ADD CONSTRAINT subtasks_requested_approver_id_fkey FOREIGN KEY (requested_approver_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_subtasks_requested_approver_id ON public.subtasks (requested_approver_id);

COMMIT;

-- Down (manual):
-- ALTER TABLE public.subtasks DROP CONSTRAINT IF EXISTS subtasks_requested_approver_id_fkey;
-- DROP INDEX IF EXISTS idx_subtasks_requested_approver_id;
-- ALTER TABLE public.subtasks DROP COLUMN IF EXISTS requested_approver_id;
