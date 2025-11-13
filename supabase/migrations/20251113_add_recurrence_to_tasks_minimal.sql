-- Minimal migration: apenas adiciona colunas à tabela tasks
-- Use este SQL se for colar no SQL Editor do Supabase e não quiser criar tabelas extras

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(20),
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_days VARCHAR(100),
  ADD COLUMN IF NOT EXISTS recurrence_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurrence_date DATE;

-- Indexes para busca
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring_end ON public.tasks(is_recurring, recurrence_end) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
