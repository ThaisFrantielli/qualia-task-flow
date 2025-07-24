-- Melhoria da função de histórico de tarefas
-- Criar trigger para adicionar automaticamente entradas no histórico quando tarefas são modificadas

CREATE OR REPLACE FUNCTION public.add_task_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Para inserções (criação de tarefa)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_history (task_id, user_name, action, field_changed, new_value)
    VALUES (NEW.id, COALESCE(NEW.assignee_name, 'Sistema'), 'created', 'status', NEW.status);
    RETURN NEW;
  END IF;

  -- Para atualizações
  IF TG_OP = 'UPDATE' THEN
    -- Status mudou
    IF OLD.status != NEW.status THEN
      INSERT INTO public.task_history (task_id, user_name, action, field_changed, old_value, new_value)
      VALUES (NEW.id, COALESCE(NEW.assignee_name, 'Sistema'), 'status_changed', 'status', OLD.status, NEW.status);
    END IF;
    
    -- Responsável mudou
    IF COALESCE(OLD.assignee_name, '') != COALESCE(NEW.assignee_name, '') THEN
      INSERT INTO public.task_history (task_id, user_name, action, field_changed, old_value, new_value)
      VALUES (NEW.id, COALESCE(NEW.assignee_name, 'Sistema'), 'assigned', 'assignee', OLD.assignee_name, NEW.assignee_name);
    END IF;
    
    -- Prioridade mudou
    IF OLD.priority != NEW.priority THEN
      INSERT INTO public.task_history (task_id, user_name, action, field_changed, old_value, new_value)
      VALUES (NEW.id, COALESCE(NEW.assignee_name, 'Sistema'), 'updated', 'priority', OLD.priority, NEW.priority);
    END IF;
    
    -- Título mudou
    IF OLD.title != NEW.title THEN
      INSERT INTO public.task_history (task_id, user_name, action, field_changed, old_value, new_value)
      VALUES (NEW.id, COALESCE(NEW.assignee_name, 'Sistema'), 'updated', 'title', OLD.title, NEW.title);
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para tarefas
DROP TRIGGER IF EXISTS task_history_trigger ON public.tasks;
CREATE TRIGGER task_history_trigger
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.add_task_history();

-- Melhorar a tabela de menções para funcionar com notificações
CREATE OR REPLACE FUNCTION public.process_comment_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mention_text TEXT;
  mentioned_user TEXT;
BEGIN
  -- Extrair menções do comentário
  FOR mention_text IN 
    SELECT unnest(regexp_split_to_array(NEW.content, '\s+'))
    WHERE unnest LIKE '@%'
  LOOP
    mentioned_user := substring(mention_text from 2); -- Remove o @
    
    -- Inserir na tabela de menções
    INSERT INTO public.comment_mentions (comment_id, mentioned_user)
    VALUES (NEW.id, mentioned_user)
    ON CONFLICT DO NOTHING;
    
    -- Criar notificação para o usuário mencionado
    INSERT INTO public.notifications (user_id, title, message, type, task_id, data)
    VALUES (
      mentioned_user, -- Em um sistema real, buscar o user_id pelo nome
      'Você foi mencionado',
      'Você foi mencionado em um comentário da tarefa: ' || (SELECT title FROM tasks WHERE id = NEW.task_id),
      'mention',
      NEW.task_id,
      json_build_object('comment_id', NEW.id, 'author', NEW.author_name)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para processar menções
DROP TRIGGER IF EXISTS process_mentions_trigger ON public.comments;
CREATE TRIGGER process_mentions_trigger
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.process_comment_mentions();