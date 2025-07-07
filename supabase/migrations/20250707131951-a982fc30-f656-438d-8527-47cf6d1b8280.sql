
-- Criar tabela para notificações
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  task_id UUID REFERENCES public.tasks,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_completed', 'task_overdue', 'task_commented', 'task_delegated')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data JSONB
);

-- Criar tabela para histórico de alterações
CREATE TABLE public.task_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para menções nos comentários
CREATE TABLE public.comment_mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES public.comments NOT NULL,
  mentioned_user TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS para notificações
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid()::text IN (SELECT user_id::text FROM public.notifications WHERE id = notifications.id));

CREATE POLICY "Anyone can create notifications" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (auth.uid()::text IN (SELECT user_id::text FROM public.notifications WHERE id = notifications.id));

-- Adicionar RLS para histórico
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view task history" 
  ON public.task_history 
  FOR SELECT 
  USING (true);

CREATE POLICY "Everyone can create task history" 
  ON public.task_history 
  FOR INSERT 
  WITH CHECK (true);

-- Adicionar RLS para menções
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view mentions" 
  ON public.comment_mentions 
  FOR SELECT 
  USING (true);

CREATE POLICY "Everyone can create mentions" 
  ON public.comment_mentions 
  FOR INSERT 
  WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_comment_mentions_comment_id ON public.comment_mentions(comment_id);
