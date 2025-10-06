-- Atualização das políticas RLS para usar a função has_role

-- Políticas para tabela clientes
DROP POLICY IF EXISTS "Permitir leitura de clientes para usuários autenticados" ON public.clientes;
CREATE POLICY "Permitir leitura de clientes para usuários autenticados" 
ON public.clientes FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir edição de clientes para usuários com role admin ou manager" ON public.clientes;
CREATE POLICY "Permitir edição de clientes para usuários com role admin ou manager" 
ON public.clientes FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Permitir inserção de clientes para usuários com role admin ou manager" ON public.clientes;
CREATE POLICY "Permitir inserção de clientes para usuários com role admin ou manager" 
ON public.clientes FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Permitir exclusão de clientes para usuários com role admin" ON public.clientes;
CREATE POLICY "Permitir exclusão de clientes para usuários com role admin" 
ON public.clientes FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para tabela atendimentos
DROP POLICY IF EXISTS "Permitir leitura de atendimentos para usuários autenticados" ON public.atendimentos;
CREATE POLICY "Permitir leitura de atendimentos para usuários autenticados" 
ON public.atendimentos FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir edição de atendimentos para assignees ou admin" ON public.atendimentos;
CREATE POLICY "Permitir edição de atendimentos para assignees ou admin" 
ON public.atendimentos FOR UPDATE 
USING (assignee_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Permitir inserção de atendimentos para todos usuários autenticados" ON public.atendimentos;
CREATE POLICY "Permitir inserção de atendimentos para todos usuários autenticados" 
ON public.atendimentos FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir exclusão de atendimentos para admin" ON public.atendimentos;
CREATE POLICY "Permitir exclusão de atendimentos para admin" 
ON public.atendimentos FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para tabela whatsapp_conversations
DROP POLICY IF EXISTS "Permitir leitura de conversas WhatsApp para usuários autenticados" ON public.whatsapp_conversations;
CREATE POLICY "Permitir leitura de conversas WhatsApp para usuários autenticados" 
ON public.whatsapp_conversations FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir edição de conversas WhatsApp para admin ou support" ON public.whatsapp_conversations;
CREATE POLICY "Permitir edição de conversas WhatsApp para admin ou support" 
ON public.whatsapp_conversations FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

DROP POLICY IF EXISTS "Permitir inserção de conversas WhatsApp para admin ou support" ON public.whatsapp_conversations;
CREATE POLICY "Permitir inserção de conversas WhatsApp para admin ou support" 
ON public.whatsapp_conversations FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

-- Políticas para tabela whatsapp_messages
DROP POLICY IF EXISTS "Permitir leitura de mensagens WhatsApp para usuários autenticados" ON public.whatsapp_messages;
CREATE POLICY "Permitir leitura de mensagens WhatsApp para usuários autenticados" 
ON public.whatsapp_messages FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Permitir inserção de mensagens WhatsApp para admin ou support" ON public.whatsapp_messages;
CREATE POLICY "Permitir inserção de mensagens WhatsApp para admin ou support" 
ON public.whatsapp_messages FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));