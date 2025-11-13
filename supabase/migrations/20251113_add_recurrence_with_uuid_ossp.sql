-- Migration variante: cria history table e usa uuid_generate_v4() (uuid-ossp)
-- Atenção: requer permissão para criar extensão "uuid-ossp" no banco

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_pattern VARCHAR(20),
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_days VARCHAR(100),
  ADD COLUMN IF NOT EXISTS recurrence_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurrence_date DATE;

CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring_end ON public.tasks(is_recurring, recurrence_end) WHERE is_recurring = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- Tabela de histórico com uuid_generate_v4()
CREATE TABLE IF NOT EXISTS public.task_recurrence_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  generated_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  occurrence_date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurrence_history_parent ON public.task_recurrence_history(parent_task_id);
