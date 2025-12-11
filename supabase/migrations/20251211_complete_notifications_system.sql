-- =====================================================
-- SISTEMA COMPLETO DE NOTIFICAÇÕES
-- Criado em: 2025-12-11
-- Descrição: Triggers e funções para notificações automáticas
-- =====================================================

-- =====================================================
-- 1. TRIGGER: Notificação de Transferência de Conversas WhatsApp
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_notify_whatsapp_conversation_transfer()
RETURNS TRIGGER AS $$
DECLARE
    from_agent_name TEXT;
    customer_name TEXT;
BEGIN
    -- Somente notificar se assigned_agent_id mudou e não é nulo
    IF NEW.assigned_agent_id IS NOT NULL AND 
       (OLD.assigned_agent_id IS NULL OR OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id) THEN
        
        -- Obter nome do agente anterior (se existir)
        IF OLD.assigned_agent_id IS NOT NULL THEN
            SELECT full_name INTO from_agent_name 
            FROM public.profiles 
            WHERE id = OLD.assigned_agent_id;
        END IF;
        
        -- Obter nome do cliente da conversa
        SELECT COALESCE(customer_name, customer_phone) INTO customer_name
        FROM public.whatsapp_conversations
        WHERE id = NEW.id;
        
        -- Criar notificação
        INSERT INTO public.notifications (user_id, type, title, message, data, read, created_at)
        VALUES (
            NEW.assigned_agent_id,
            'conversation_transfer',
            CASE 
                WHEN OLD.assigned_agent_id IS NULL THEN 'Nova conversa atribuída'
                ELSE 'Conversa transferida'
            END,
            CASE 
                WHEN OLD.assigned_agent_id IS NULL THEN 
                    'Uma conversa de ' || COALESCE(customer_name, 'Cliente') || ' foi atribuída a você'
                ELSE 
                    COALESCE(from_agent_name, 'Um agente') || ' transferiu uma conversa de ' || COALESCE(customer_name, 'Cliente') || ' para você'
            END,
            jsonb_build_object(
                'conversation_id', NEW.id,
                'client_name', customer_name,
                'from_agent_id', OLD.assigned_agent_id,
                'from_agent', from_agent_name,
                'auto_assigned', COALESCE(NEW.auto_assigned, false),
                'phone', NEW.customer_phone
            ),
            false,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS tr_notify_whatsapp_conversation_transfer ON public.whatsapp_conversations;

-- Criar trigger
CREATE TRIGGER tr_notify_whatsapp_conversation_transfer
AFTER INSERT OR UPDATE OF assigned_agent_id ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_whatsapp_conversation_transfer();

-- =====================================================
-- 2. TRIGGER: Notificação de Mudança de Status Crítico em Tickets
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_notify_ticket_status_change()
RETURNS TRIGGER AS $$
DECLARE
    agent_name TEXT;
    ticket_title TEXT;
BEGIN
    -- Somente se o status mudou
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        
        -- Obter título do ticket
        ticket_title := COALESCE(NEW.titulo, 'Ticket #' || NEW.numero_ticket);
        
        -- Status URGENTE - notificar atendente
        IF NEW.status = 'urgente' AND NEW.atendente_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, title, message, data, read)
            VALUES (
                NEW.atendente_id,
                'ticket_urgent',
                '🚨 Ticket URGENTE',
                'O ticket "' || ticket_title || '" foi marcado como URGENTE',
                jsonb_build_object(
                    'ticket_id', NEW.id,
                    'ticket_number', NEW.numero_ticket,
                    'priority', NEW.prioridade,
                    'status', NEW.status
                ),
                false
            );
        END IF;
        
        -- Status RESOLVIDO - notificar cliente (se tiver email/phone)
        IF NEW.status = 'resolvido' THEN
            -- Notificar atendente
            IF NEW.atendente_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, type, title, message, data, read)
                VALUES (
                    NEW.atendente_id,
                    'ticket_resolved',
                    '✅ Ticket Resolvido',
                    'O ticket "' || ticket_title || '" foi marcado como resolvido',
                    jsonb_build_object(
                        'ticket_id', NEW.id,
                        'ticket_number', NEW.numero_ticket,
                        'resolved_at', NEW.updated_at
                    ),
                    false
                );
            END IF;
        END IF;
        
        -- Status AGUARDANDO_SETOR - notificar responsável do setor (futura implementação)
        IF NEW.status = 'aguardando_setor' AND NEW.setor_responsavel IS NOT NULL THEN
            -- TODO: Implementar lógica para encontrar gestor do setor
            -- Por enquanto, notificar o atendente
            IF NEW.atendente_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, type, title, message, data, read)
                VALUES (
                    NEW.atendente_id,
                    'ticket_awaiting_department',
                    '⏳ Aguardando Setor',
                    'O ticket "' || ticket_title || '" está aguardando o setor ' || NEW.setor_responsavel,
                    jsonb_build_object(
                        'ticket_id', NEW.id,
                        'ticket_number', NEW.numero_ticket,
                        'department', NEW.setor_responsavel
                    ),
                    false
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_ticket_status_change ON public.tickets;
CREATE TRIGGER tr_notify_ticket_status_change
AFTER UPDATE OF status ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_ticket_status_change();

-- =====================================================
-- 3. TRIGGER: Notificação de Conclusão de Tarefas Críticas
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_notify_critical_task_completion()
RETURNS TRIGGER AS $$
DECLARE
    task_creator_id UUID;
    delegated_by_id UUID;
    task_title TEXT;
BEGIN
    -- Somente quando status muda para 'done' e prioridade é alta/urgent
    IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM NEW.status 
       AND NEW.priority IN ('high', 'urgent') THEN
        
        task_title := NEW.title;
        
        -- Obter ID do criador/delegante da tarefa
        delegated_by_id := NEW.user_id; -- Campo que guarda quem criou a tarefa
        
        -- Se foi delegada, notificar quem delegou
        IF NEW.delegated_by IS NOT NULL THEN
            -- Tentar encontrar o ID pelo nome
            SELECT id INTO delegated_by_id 
            FROM public.profiles 
            WHERE full_name = NEW.delegated_by 
            LIMIT 1;
        END IF;
        
        -- Notificar o delegante/criador
        IF delegated_by_id IS NOT NULL AND delegated_by_id != NEW.assignee_id THEN
            INSERT INTO public.notifications (user_id, type, title, message, data, read)
            VALUES (
                delegated_by_id,
                'task_completed',
                '✅ Tarefa Prioritária Concluída',
                'A tarefa "' || task_title || '" foi concluída',
                jsonb_build_object(
                    'task_id', NEW.id,
                    'task_title', task_title,
                    'priority', NEW.priority,
                    'completed_by', NEW.assignee_id,
                    'completed_at', NEW.end_date
                ),
                false
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_critical_task_completion ON public.tasks;
CREATE TRIGGER tr_notify_critical_task_completion
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_critical_task_completion();

-- =====================================================
-- 4. TRIGGER: Notificação de Conclusão de Subtarefas Críticas
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_notify_critical_subtask_completion()
RETURNS TRIGGER AS $$
DECLARE
    task_owner_id UUID;
    subtask_title TEXT;
    task_title TEXT;
BEGIN
    -- Somente quando status muda para 'done' e prioridade é alta/urgent
    IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM NEW.status 
       AND NEW.priority IN ('high', 'urgent') THEN
        
        subtask_title := NEW.title;
        
        -- Obter dono da tarefa pai
        SELECT assignee_id, title INTO task_owner_id, task_title
        FROM public.tasks 
        WHERE id = NEW.task_id;
        
        -- Notificar o dono da tarefa pai (se não for o mesmo que concluiu)
        IF task_owner_id IS NOT NULL AND task_owner_id != NEW.assignee_id THEN
            INSERT INTO public.notifications (user_id, type, title, message, data, read)
            VALUES (
                task_owner_id,
                'subtask_completed',
                '✅ Ação Prioritária Concluída',
                'A ação "' || subtask_title || '" da tarefa "' || task_title || '" foi concluída',
                jsonb_build_object(
                    'subtask_id', NEW.id,
                    'subtask_title', subtask_title,
                    'task_id', NEW.task_id,
                    'task_title', task_title,
                    'priority', NEW.priority,
                    'completed_by', NEW.assignee_id
                ),
                false
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_critical_subtask_completion ON public.subtasks;
CREATE TRIGGER tr_notify_critical_subtask_completion
AFTER UPDATE OF status ON public.subtasks
FOR EACH ROW
EXECUTE FUNCTION public.trigger_notify_critical_subtask_completion();

-- =====================================================
-- 5. FUNÇÃO: Alertas de SLA em Risco (chamada por cron job)
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_sla_at_risk()
RETURNS void AS $$
DECLARE
    ticket_record RECORD;
BEGIN
    -- Tickets com SLA de primeira resposta em risco (1h antes do vencimento)
    FOR ticket_record IN
        SELECT t.id, t.numero_ticket, t.titulo, t.atendente_id, t.sla_primeira_resposta
        FROM public.tickets t
        WHERE t.status NOT IN ('resolvido', 'fechado')
        AND t.sla_primeira_resposta IS NOT NULL
        AND t.tempo_primeira_resposta IS NULL
        AND t.sla_primeira_resposta > NOW()
        AND t.sla_primeira_resposta <= NOW() + INTERVAL '1 hour'
        AND t.atendente_id IS NOT NULL
        -- Evitar duplicatas: verificar se já não existe notificação nos últimos 30 min
        AND NOT EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.user_id = t.atendente_id
            AND n.type = 'sla_first_response_warning'
            AND (n.data->>'ticket_id')::TEXT = t.id::TEXT
            AND n.created_at > NOW() - INTERVAL '30 minutes'
        )
    LOOP
        INSERT INTO public.notifications (user_id, type, title, message, data, read)
        VALUES (
            ticket_record.atendente_id,
            'sla_first_response_warning',
            '⚠️ SLA de Primeira Resposta em Risco',
            'O ticket #' || ticket_record.numero_ticket || ' vence em menos de 1 hora',
            jsonb_build_object(
                'ticket_id', ticket_record.id,
                'ticket_number', ticket_record.numero_ticket,
                'ticket_title', ticket_record.titulo,
                'sla_deadline', ticket_record.sla_primeira_resposta
            ),
            false
        );
    END LOOP;
    
    -- Tickets com SLA de resolução em risco (4h antes do vencimento)
    FOR ticket_record IN
        SELECT t.id, t.numero_ticket, t.titulo, t.atendente_id, t.sla_resolucao
        FROM public.tickets t
        WHERE t.status NOT IN ('resolvido', 'fechado')
        AND t.sla_resolucao IS NOT NULL
        AND t.sla_resolucao > NOW()
        AND t.sla_resolucao <= NOW() + INTERVAL '4 hours'
        AND t.atendente_id IS NOT NULL
        -- Evitar duplicatas
        AND NOT EXISTS (
            SELECT 1 FROM public.notifications n
            WHERE n.user_id = t.atendente_id
            AND n.type = 'sla_resolution_warning'
            AND (n.data->>'ticket_id')::TEXT = t.id::TEXT
            AND n.created_at > NOW() - INTERVAL '2 hours'
        )
    LOOP
        INSERT INTO public.notifications (user_id, type, title, message, data, read)
        VALUES (
            ticket_record.atendente_id,
            'sla_resolution_warning',
            '⚠️ SLA de Resolução em Risco',
            'O ticket #' || ticket_record.numero_ticket || ' vence em menos de 4 horas',
            jsonb_build_object(
                'ticket_id', ticket_record.id,
                'ticket_number', ticket_record.numero_ticket,
                'ticket_title', ticket_record.titulo,
                'sla_deadline', ticket_record.sla_resolucao
            ),
            false
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 6. ÍNDICES para Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_type_read 
ON public.notifications (user_id, type, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_sla_status 
ON public.tickets (status, sla_primeira_resposta, sla_resolucao) 
WHERE status NOT IN ('resolvido', 'fechado');

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assigned 
ON public.whatsapp_conversations (assigned_agent_id, status, updated_at);

-- =====================================================
-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================
COMMENT ON FUNCTION public.trigger_notify_whatsapp_conversation_transfer() IS 
'Notifica agente quando conversa WhatsApp é transferida ou atribuída';

COMMENT ON FUNCTION public.trigger_notify_ticket_status_change() IS 
'Notifica mudanças críticas de status em tickets (urgente, resolvido, aguardando setor)';

COMMENT ON FUNCTION public.trigger_notify_critical_task_completion() IS 
'Notifica delegante quando tarefa de alta/urgente prioridade é concluída';

COMMENT ON FUNCTION public.trigger_notify_critical_subtask_completion() IS 
'Notifica dono da tarefa quando ação de alta/urgente prioridade é concluída';

COMMENT ON FUNCTION public.notify_sla_at_risk() IS 
'Envia alertas de SLA em risco (executar via cron: a cada 30 minutos)';

-- =====================================================
-- 8. GRANTS (permissões)
-- =====================================================
GRANT EXECUTE ON FUNCTION public.notify_sla_at_risk() TO authenticated;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
