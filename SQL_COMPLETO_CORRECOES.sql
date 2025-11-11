-- ============================================
-- 🔧 SQL COMPLETO - CORREÇÕES FINAIS
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ============================================
-- PARTE 1: CORRIGIR POLÍTICAS DE TASKS
-- ============================================

-- Remover políticas antigas restritivas
DROP POLICY IF EXISTS "Leitura de tarefas baseada na função do usuário" ON public.tasks;
DROP POLICY IF EXISTS "Atualização de tarefas baseada na função do usuário" ON public.tasks;
DROP POLICY IF EXISTS "Exclusão de tarefas baseada na função do usuário" ON public.tasks;
DROP POLICY IF EXISTS "Usuários autenticados podem criar tarefas" ON public.tasks;

-- 1. CRIAR (INSERT) - Todos podem criar tarefas
CREATE POLICY "users_can_create_tasks" ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. VISUALIZAR (SELECT) - Ver próprias tarefas + tarefas de projetos + tarefas da equipe
CREATE POLICY "users_can_view_tasks" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    -- Admin vê tudo
    public.is_user_admin()
    -- Criador da tarefa
    OR user_id = auth.uid()
    -- Responsável pela tarefa
    OR assignee_id = auth.uid()
    -- Membro do projeto
    OR project_id IN (
      SELECT pm.project_id 
      FROM public.project_members pm 
      WHERE pm.user_id = auth.uid()
    )
    -- Supervisor vê tarefas da equipe
    OR user_id IN (
      SELECT team_member_id 
      FROM public.get_user_team_hierarchy(auth.uid())
    )
    OR assignee_id IN (
      SELECT team_member_id 
      FROM public.get_user_team_hierarchy(auth.uid())
    )
  );

-- 3. ATUALIZAR (UPDATE) - Criador, responsável, membros do projeto ou admin
CREATE POLICY "users_can_update_tasks" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    public.is_user_admin()
    OR user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR project_id IN (
      SELECT pm.project_id 
      FROM public.project_members pm 
      WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_user_admin()
    OR user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR project_id IN (
      SELECT pm.project_id 
      FROM public.project_members pm 
      WHERE pm.user_id = auth.uid()
    )
  );

-- 4. EXCLUIR (DELETE) - Apenas criador ou admin
CREATE POLICY "users_can_delete_tasks" ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    public.is_user_admin()
    OR user_id = auth.uid()
  );

-- ============================================
-- PARTE 2: CORRIGIR POLÍTICAS DE PROJECTS
-- ============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios projetos" ON public.projects;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios projetos" ON public.projects;
DROP POLICY IF EXISTS "Usuários podem excluir seus próprios projetos" ON public.projects;
DROP POLICY IF EXISTS "Usuários podem visualizar seus próprios projetos" ON public.projects;

-- 1. CRIAR (INSERT) - Todos podem criar projetos
CREATE POLICY "users_can_create_projects" ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. VISUALIZAR (SELECT) - Ver próprios projetos + projetos onde é membro + projetos da equipe
CREATE POLICY "users_can_view_projects" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    -- Admin vê tudo
    public.is_user_admin()
    -- Dono do projeto
    OR user_id = auth.uid()
    -- Membro do projeto
    OR id IN (
      SELECT pm.project_id 
      FROM public.project_members pm 
      WHERE pm.user_id = auth.uid()
    )
    -- Supervisor vê projetos da equipe
    OR user_id IN (
      SELECT team_member_id 
      FROM public.get_user_team_hierarchy(auth.uid())
    )
  );

-- 3. ATUALIZAR (UPDATE) - Dono, membros com permissão ou admin
CREATE POLICY "users_can_update_projects" ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    public.is_user_admin()
    OR user_id = auth.uid()
    OR id IN (
      SELECT pm.project_id 
      FROM public.project_members pm 
      WHERE pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'approver')
    )
  )
  WITH CHECK (
    public.is_user_admin()
    OR user_id = auth.uid()
    OR id IN (
      SELECT pm.project_id 
      FROM public.project_members pm 
      WHERE pm.user_id = auth.uid() 
      AND pm.role IN ('owner', 'approver')
    )
  );

-- 4. EXCLUIR (DELETE) - Apenas dono ou admin
CREATE POLICY "users_can_delete_projects" ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    public.is_user_admin()
    OR user_id = auth.uid()
  );

-- ============================================
-- PARTE 3: USER_HIERARCHY (já criado anteriormente)
-- ============================================
-- Se ainda não executou, execute o SQL_CORRIGIDO_FINAL.sql primeiro

-- ============================================
-- PARTE 4: GARANTIR PERMISSÕES
-- ============================================

-- Garantir que todos têm acesso às tabelas
GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.project_members TO authenticated;
GRANT ALL ON public.subtasks TO authenticated;

-- ============================================
-- PARTE 5: VERIFICAÇÃO FINAL
-- ============================================

-- Ver políticas de tasks
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'tasks'
ORDER BY policyname;

-- Ver políticas de projects
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;

-- Ver políticas de user_hierarchy
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'user_hierarchy'
ORDER BY policyname;

-- Testar se a função is_user_admin existe
SELECT public.is_user_admin();

-- ============================================
-- ✅ PRONTO! Agora:
-- 1. Recarregue a página do aplicativo
-- 2. Tente criar uma tarefa
-- 3. Tente adicionar membro à equipe
-- ============================================
