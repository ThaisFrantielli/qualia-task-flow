-- =============================================
-- FASE 1: CORREÇÃO DAS POLÍTICAS RLS
-- =============================================

-- Remover políticas duplicadas/bugadas
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Criar política UPDATE correta
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Permitir DELETE das próprias notificações
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- FASE 2: TRIGGERS AUTOMÁTICOS
-- =============================================

-- Trigger para atribuição de tarefas
CREATE OR REPLACE FUNCTION public.trigger_notify_on_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
    INSERT INTO public.notifications (user_id, type, title, message, task_id, data)
    VALUES (
      NEW.assignee_id,
      'task_assigned',
      'Nova tarefa atribuída',
      'Você foi atribuído à tarefa: ' || NEW.title,
      NEW.id,
      jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title, 'priority', NEW.priority)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_task_assignment ON public.tasks;
CREATE TRIGGER tr_notify_on_task_assignment
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_on_task_assignment();

-- Trigger para solicitação de aprovação de subtarefas
CREATE OR REPLACE FUNCTION public.trigger_notify_on_approval_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.requested_approver_id IS NOT NULL AND (OLD.requested_approver_id IS NULL OR OLD.requested_approver_id IS DISTINCT FROM NEW.requested_approver_id) THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.requested_approver_id,
      'approval_request',
      'Solicitação de aprovação',
      'Uma subtarefa aguarda sua aprovação: ' || NEW.title,
      jsonb_build_object('subtask_id', NEW.id, 'subtask_title', NEW.title, 'task_id', NEW.task_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_approval_request ON public.subtasks;
CREATE TRIGGER tr_notify_on_approval_request
AFTER INSERT OR UPDATE ON public.subtasks
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_on_approval_request();

-- Trigger para aprovação de subtarefas
CREATE OR REPLACE FUNCTION public.trigger_notify_on_subtask_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved_by_id IS NOT NULL AND OLD.approved_by_id IS NULL AND NEW.assignee_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.assignee_id,
      'subtask_approved',
      'Subtarefa aprovada',
      'Sua subtarefa foi aprovada: ' || NEW.title,
      jsonb_build_object('subtask_id', NEW.id, 'subtask_title', NEW.title, 'approved_by', NEW.approved_by_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_subtask_approval ON public.subtasks;
CREATE TRIGGER tr_notify_on_subtask_approval
AFTER UPDATE ON public.subtasks
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_on_subtask_approval();

-- Trigger para atribuição de atendimentos/tickets
CREATE OR REPLACE FUNCTION public.trigger_notify_on_atendimento_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.assignee_id,
      'ticket_assigned',
      'Ticket atribuído',
      'Você foi atribuído ao ticket: ' || COALESCE(NEW.titulo, NEW.client_name, 'Novo ticket'),
      jsonb_build_object('atendimento_id', NEW.id, 'client_name', NEW.client_name, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_atendimento_assignment ON public.atendimentos;
CREATE TRIGGER tr_notify_on_atendimento_assignment
AFTER INSERT OR UPDATE ON public.atendimentos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_on_atendimento_assignment();

-- Trigger para menções em comentários
CREATE OR REPLACE FUNCTION public.trigger_notify_on_comment_mention()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user_id uuid;
  comment_author text;
BEGIN
  -- Buscar o nome do autor do comentário
  SELECT author_name INTO comment_author FROM public.comments WHERE id = NEW.comment_id;
  
  -- Buscar o user_id do usuário mencionado pelo nome
  SELECT id INTO mentioned_user_id FROM public.profiles WHERE full_name = NEW.mentioned_user OR email = NEW.mentioned_user;
  
  IF mentioned_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      mentioned_user_id,
      'mention',
      'Você foi mencionado',
      comment_author || ' mencionou você em um comentário',
      jsonb_build_object('comment_id', NEW.comment_id, 'mentioned_by', comment_author)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_on_comment_mention ON public.comment_mentions;
CREATE TRIGGER tr_notify_on_comment_mention
AFTER INSERT ON public.comment_mentions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_on_comment_mention();

-- Index para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, read, created_at DESC);