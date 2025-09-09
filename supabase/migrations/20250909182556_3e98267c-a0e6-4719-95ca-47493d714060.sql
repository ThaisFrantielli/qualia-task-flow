-- Corrigir políticas de segurança críticas das tabelas expostas (versão 2)

-- 1. Corrigir tabela surveys - restringir acesso público
DROP POLICY IF EXISTS "Allow public read access to surveys" ON public.surveys;
CREATE POLICY "Authenticated users only can view surveys" 
ON public.surveys 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Corrigir tabela task_history - remover acesso público
DROP POLICY IF EXISTS "Everyone can view task history" ON public.task_history;
CREATE POLICY "Authenticated users only can view task history" 
ON public.task_history 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. Corrigir tabela subtasks - remover acesso público para visualização
DROP POLICY IF EXISTS "Todos podem visualizar subtarefas" ON public.subtasks;
CREATE POLICY "Authenticated users only can view subtasks" 
ON public.subtasks 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 4. Corrigir tabela task_delegations - remover acesso público para visualização
DROP POLICY IF EXISTS "Todos podem visualizar delegações" ON public.task_delegations;
CREATE POLICY "Authenticated users only can view task delegations" 
ON public.task_delegations 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 5. Corrigir tabela survey_responses - restringir leitura apenas a autenticados
DROP POLICY IF EXISTS "Allow authenticated users to read responses" ON public.survey_responses;
CREATE POLICY "Authenticated users only can read survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (auth.role() = 'authenticated');