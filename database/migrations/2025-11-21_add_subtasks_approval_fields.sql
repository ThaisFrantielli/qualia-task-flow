-- Migration: adicionar campos de aprovação em subtasks
-- Adiciona colunas explícitas para controlar aprovação de subtarefas

BEGIN;

ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS needs_approval boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by_id uuid NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS approval_notes text NULL;

-- Cria FK para profiles (usuário que aprovou)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'subtasks_approved_by_id_fkey'
  ) THEN
    ALTER TABLE public.subtasks
      ADD CONSTRAINT subtasks_approved_by_id_fkey FOREIGN KEY (approved_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END$$;

-- Índice para acelerar consultas de subtarefas pendentes de aprovação
CREATE INDEX IF NOT EXISTS idx_subtasks_needs_approval ON public.subtasks (needs_approval) WHERE needs_approval = true;

COMMIT;

-- Down (opcional): para reverter as alterações, execute as instruções abaixo manualmente
-- ALTER TABLE public.subtasks DROP CONSTRAINT IF EXISTS subtasks_approved_by_id_fkey;
-- DROP INDEX IF EXISTS idx_subtasks_needs_approval;
-- ALTER TABLE public.subtasks DROP COLUMN IF EXISTS approval_notes, DROP COLUMN IF EXISTS approved_at, DROP COLUMN IF EXISTS approved_by_id, DROP COLUMN IF EXISTS needs_approval;
