
-- Adicionar campos de data de início e término às tarefas
ALTER TABLE public.tasks 
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE;

-- Criar tabela para checklists dos projetos
CREATE TABLE public.project_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para checklists
ALTER TABLE public.project_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar checklists" 
  ON public.project_checklists 
  FOR SELECT 
  USING (true);

CREATE POLICY "Todos podem criar checklists" 
  ON public.project_checklists 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Todos podem atualizar checklists" 
  ON public.project_checklists 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Todos podem excluir checklists" 
  ON public.project_checklists 
  FOR DELETE 
  USING (true);

-- Adicionar campo de descrição às subtarefas
ALTER TABLE public.subtasks 
ADD COLUMN description TEXT;

-- Adicionar campo archived às tarefas
ALTER TABLE public.tasks 
ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;

-- Criar tabela para eventos do calendário
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para eventos do calendário
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar eventos" 
  ON public.calendar_events 
  FOR SELECT 
  USING (true);

CREATE POLICY "Todos podem criar eventos" 
  ON public.calendar_events 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Todos podem atualizar eventos" 
  ON public.calendar_events 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Todos podem excluir eventos" 
  ON public.calendar_events 
  FOR DELETE 
  USING (true);

-- Criar tabela para delegação de tarefas
CREATE TABLE public.task_delegations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  delegated_by TEXT NOT NULL,
  delegated_to TEXT NOT NULL,
  delegated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT
);

-- Adicionar RLS para delegações
ALTER TABLE public.task_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar delegações" 
  ON public.task_delegations 
  FOR SELECT 
  USING (true);

CREATE POLICY "Todos podem criar delegações" 
  ON public.task_delegations 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Todos podem atualizar delegações" 
  ON public.task_delegations 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Todos podem excluir delegações" 
  ON public.task_delegations 
  FOR DELETE 
  USING (true);
