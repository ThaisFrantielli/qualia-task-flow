-- =============================================
-- FASE 2: CORRIGIR EXPOSIÇÕES CRÍTICAS DE DADOS
-- =============================================

-- 2.1 Habilitar RLS em tabelas desprotegidas
ALTER TABLE IF EXISTS public.ticket_motivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_distribution_rules ENABLE ROW LEVEL SECURITY;

-- Policies para ticket_motivos (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_motivos' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can view ticket_motivos" ON public.ticket_motivos';
    EXECUTE 'CREATE POLICY "Authenticated can view ticket_motivos" ON public.ticket_motivos FOR SELECT USING (auth.role() = ''authenticated'')';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage ticket_motivos" ON public.ticket_motivos';
    EXECUTE 'CREATE POLICY "Admins can manage ticket_motivos" ON public.ticket_motivos FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user())';
  END IF;
END $$;

-- Policies para whatsapp_distribution_rules (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_distribution_rules' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage whatsapp_distribution_rules" ON public.whatsapp_distribution_rules';
    EXECUTE 'CREATE POLICY "Admins can manage whatsapp_distribution_rules" ON public.whatsapp_distribution_rules FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user())';
  END IF;
END $$;

-- 2.2 Corrigir atendimentos (remover USING true)
DROP POLICY IF EXISTS "Allow authenticated users to view all tickets" ON public.atendimentos;
DROP POLICY IF EXISTS "Allow authenticated users to update tickets" ON public.atendimentos;

-- SELECT: Próprios OU da equipe (baseado no nível)
CREATE POLICY "View own or team atendimentos" ON public.atendimentos
FOR SELECT USING (
  auth.uid() = assignee_id
  OR public.is_admin_user()
  OR (public.is_supervisor_or_above() 
      AND assignee_id IN (SELECT public.get_direct_subordinates(auth.uid())))
  OR (public.is_gestao_or_above()
      AND assignee_id IN (SELECT public.get_all_subordinates(auth.uid())))
);

-- UPDATE: Próprios ou admin
CREATE POLICY "Update own or admin atendimentos" ON public.atendimentos
FOR UPDATE USING (
  auth.uid() = assignee_id OR public.is_admin_user()
);

-- DELETE: Apenas admin
CREATE POLICY "Delete atendimentos" ON public.atendimentos
FOR DELETE USING (public.is_admin_user());

-- 2.3 Corrigir clientes (remover conflito de policies)
DROP POLICY IF EXISTS "Permitir leitura de clientes para usuários autenticados" ON public.clientes;

-- 2.4 Corrigir oportunidades
DROP POLICY IF EXISTS "Permitir acesso total para usuários autenticados (Exemplo)" ON public.oportunidades;
DROP POLICY IF EXISTS "Permitir acesso total para mensagens (Exemplo)" ON public.oportunidade_messages;
DROP POLICY IF EXISTS "Permitir acesso total para produtos (Exemplo)" ON public.oportunidade_produtos;

-- oportunidades: baseado em ownership + equipe
CREATE POLICY "View own or team opportunities" ON public.oportunidades
FOR SELECT USING (
  auth.uid() = user_id
  OR public.is_admin_user()
  OR (public.is_supervisor_or_above() 
      AND user_id IN (SELECT public.get_direct_subordinates(auth.uid())))
  OR (public.is_gestao_or_above()
      AND user_id IN (SELECT public.get_all_subordinates(auth.uid())))
);

CREATE POLICY "Manage own opportunities" ON public.oportunidades
FOR ALL USING (auth.uid() = user_id OR public.is_admin_user())
WITH CHECK (auth.uid() = user_id OR public.is_admin_user());

-- oportunidade_messages: vinculado à oportunidade
CREATE POLICY "View messages of accessible opportunities" ON public.oportunidade_messages
FOR SELECT USING (
  oportunidade_id IN (SELECT id FROM oportunidades)
);

-- oportunidade_produtos: vinculado à oportunidade
CREATE POLICY "View products of accessible opportunities" ON public.oportunidade_produtos
FOR SELECT USING (
  oportunidade_id IN (SELECT id FROM oportunidades)
);

-- 2.5 Corrigir attachments (vincular à tarefa)
DROP POLICY IF EXISTS "Todos podem visualizar anexos" ON public.attachments;
DROP POLICY IF EXISTS "Todos podem atualizar anexos" ON public.attachments;
DROP POLICY IF EXISTS "Todos podem excluir anexos" ON public.attachments;
DROP POLICY IF EXISTS "Todos podem criar anexos" ON public.attachments;

-- SELECT: Se pode ver a tarefa, pode ver os anexos
CREATE POLICY "View attachments of accessible tasks" ON public.attachments
FOR SELECT USING (
  task_id IN (SELECT id FROM tasks)
);

-- INSERT/UPDATE/DELETE: Se é assignee ou criador da tarefa
CREATE POLICY "Manage attachments of own tasks" ON public.attachments
FOR ALL USING (
  task_id IN (SELECT id FROM tasks WHERE assignee_id = auth.uid() OR user_id = auth.uid())
  OR public.is_admin_user()
)
WITH CHECK (
  task_id IN (SELECT id FROM tasks WHERE assignee_id = auth.uid() OR user_id = auth.uid())
  OR public.is_admin_user()
);

-- 2.6 Corrigir calendar_events (remover duplicatas)
DROP POLICY IF EXISTS "Todos podem visualizar eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Todos podem atualizar eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Todos podem excluir eventos" ON public.calendar_events;
DROP POLICY IF EXISTS "Todos podem criar eventos" ON public.calendar_events;

-- 2.7 Corrigir cliente_contatos
DROP POLICY IF EXISTS "Permitir leitura de contatos para usuários autenticados" ON public.cliente_contatos;