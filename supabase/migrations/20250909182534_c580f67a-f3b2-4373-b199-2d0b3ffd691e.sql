-- Corrigir políticas de segurança críticas das tabelas expostas

-- 1. Corrigir tabela surveys - restringir acesso apenas a usuários autenticados
DROP POLICY IF EXISTS "Allow public read access to surveys" ON public.surveys;
CREATE POLICY "Authenticated users can view surveys" 
ON public.surveys 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Corrigir tabela task_history - apenas usuários autenticados podem ver histórico
DROP POLICY IF EXISTS "Everyone can view task history" ON public.task_history;
CREATE POLICY "Authenticated users can view task history" 
ON public.task_history 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 3. Corrigir tabela subtasks - apenas usuários autenticados
DROP POLICY IF EXISTS "Todos podem visualizar subtarefas" ON public.subtasks;
CREATE POLICY "Authenticated users can view subtasks" 
ON public.subtasks 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 4. Corrigir tabela task_delegations - apenas usuários autenticados
DROP POLICY IF EXISTS "Todos podem visualizar delegações" ON public.task_delegations;
CREATE POLICY "Authenticated users can view task delegations" 
ON public.task_delegations 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 5. Corrigir tabela survey_responses - apenas usuários autenticados podem ler
DROP POLICY IF EXISTS "Allow authenticated users to read responses" ON public.survey_responses;
CREATE POLICY "Authenticated users can read survey responses" 
ON public.survey_responses 
FOR SELECT 
USING (auth.role() = 'authenticated');