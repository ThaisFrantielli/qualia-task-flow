-- ============================================
-- 🚀 SQL TUDO-EM-UM - SOLUÇÃO COMPLETA
-- ============================================
-- Execute ESTE SQL no Supabase SQL Editor
-- Resolve TUDO de uma vez: hierarquia + tasks + projects
-- ============================================

-- ============================================
-- ETAPA 1: CRIAR FUNÇÕES E TABELA DE HIERARQUIA
-- ============================================

-- Limpar tudo antes
DROP POLICY IF EXISTS "users_view_hierarchy" ON public.user_hierarchy;
DROP POLICY IF EXISTS "users_manage_own_team" ON public.user_hierarchy;
DROP FUNCTION IF EXISTS public.get_user_team_hierarchy(UUID);
DROP FUNCTION IF EXISTS public.get_team_count(UUID);
DROP FUNCTION IF EXISTS public.get_direct_supervisor(UUID);
DROP FUNCTION IF EXISTS public.is_user_admin();
DROP TABLE IF EXISTS public.user_hierarchy CASCADE;

-- Criar função is_user_admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT "nivelAcesso" = 'Admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$;

-- Criar tabela user_hierarchy
CREATE TABLE public.user_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, supervisor_id),
  CHECK (user_id != supervisor_id)
);

CREATE INDEX idx_user_hierarchy_user ON public.user_hierarchy(user_id);
CREATE INDEX idx_user_hierarchy_supervisor ON public.user_hierarchy(supervisor_id);
ALTER TABLE public.user_hierarchy ENABLE ROW LEVEL SECURITY;

-- Criar função get_user_team_hierarchy
CREATE OR REPLACE FUNCTION public.get_user_team_hierarchy(user_uuid UUID)
RETURNS TABLE(team_member_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE team_tree AS (
    SELECT user_id as team_member_id
    FROM public.user_hierarchy
    WHERE supervisor_id = user_uuid
    
    UNION
    
    SELECT uh.user_id
    FROM public.user_hierarchy uh
    INNER JOIN team_tree tt ON uh.supervisor_id = tt.team_member_id
  )
  SELECT * FROM team_tree;
END;
$$;

-- Criar função get_team_count
CREATE OR REPLACE FUNCTION public.get_team_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.get_user_team_hierarchy(user_uuid))::INTEGER;
END;
$$;

-- Criar função get_direct_supervisor
CREATE OR REPLACE FUNCTION public.get_direct_supervisor(user_uuid UUID)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  nivelAcesso TEXT,
  funcao TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.avatar_url,
    p."nivelAcesso",
    p.funcao
  FROM public.user_hierarchy uh
  INNER JOIN public.profiles p ON p.id = uh.supervisor_id
  WHERE uh.user_id = user_uuid
  LIMIT 1;
END;
$$;

-- Políticas RLS para user_hierarchy
CREATE POLICY "users_view_hierarchy" ON public.user_hierarchy
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = supervisor_id
    OR public.is_user_admin()
  );

CREATE POLICY "users_manage_own_team" ON public.user_hierarchy
  FOR ALL
  USING (auth.uid() = supervisor_id OR public.is_user_admin())
  WITH CHECK (auth.uid() = supervisor_id OR public.is_user_admin());

-- Permissões
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_team_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_supervisor(UUID) TO authenticated;
GRANT ALL ON public.user_hierarchy TO authenticated;

-- ============================================
-- ETAPA 2: CORRIGIR POLÍTICAS DE TASKS
-- ============================================

-- Remover políticas antigas de tasks
DROP POLICY IF EXISTS "Leitura de tarefas baseada na função do usuário" ON public.tasks;
DROP POLICY IF EXISTS "Atualização de tarefas baseada na função do usuário" ON public.tasks;
DROP POLICY IF EXISTS "Exclusão de tarefas baseada na função do usuário" ON public.tasks;
DROP POLICY IF EXISTS "Usuários autenticados podem criar tarefas" ON public.tasks;
DROP POLICY IF EXISTS "users_can_create_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_can_view_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_can_update_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_can_delete_tasks" ON public.tasks;

-- CRIAR - Todos autenticados podem criar tarefas
CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- VISUALIZAR - Ver próprias + projetos + equipe
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    public.is_user_admin()
    OR user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
    OR user_id IN (
      SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid())
    )
    OR assignee_id IN (
      SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid())
    )
  );

-- ATUALIZAR - Criador, responsável, membros do projeto
CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    public.is_user_admin()
    OR user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_user_admin()
    OR user_id = auth.uid()
    OR assignee_id = auth.uid()
    OR project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

-- EXCLUIR - Apenas criador ou admin
CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    public.is_user_admin()
    OR user_id = auth.uid()
  );

-- ============================================
-- ETAPA 3: CORRIGIR POLÍTICAS DE PROJECTS
-- ============================================

-- Remover políticas antigas de projects
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios projetos" ON public.projects;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios projetos" ON public.projects;
DROP POLICY IF EXISTS "Usuários podem excluir seus próprios projetos" ON public.projects;
DROP POLICY IF EXISTS "Usuários podem visualizar seus próprios projetos" ON public.projects;
DROP POLICY IF EXISTS "users_can_create_projects" ON public.projects;
DROP POLICY IF EXISTS "users_can_view_projects" ON public.projects;
DROP POLICY IF EXISTS "users_can_update_projects" ON public.projects;
DROP POLICY IF EXISTS "users_can_delete_projects" ON public.projects;

-- CRIAR - Todos autenticados podem criar projetos
CREATE POLICY "projects_insert_policy" ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- VISUALIZAR - Ver próprios + onde é membro + da equipe
CREATE POLICY "projects_select_policy" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_user_admin()
    OR user_id = auth.uid()
    OR id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
    OR user_id IN (
      SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid())
    )
  );

-- ATUALIZAR - Dono ou membros com permissão
CREATE POLICY "projects_update_policy" ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    public.is_user_admin()
    OR user_id = auth.uid()
    OR id IN (
      SELECT pm.project_id FROM public.project_members pm 
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'approver')
    )
  )
  WITH CHECK (
    public.is_user_admin()
    OR user_id = auth.uid()
    OR id IN (
      SELECT pm.project_id FROM public.project_members pm 
      WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'approver')
    )
  );

-- EXCLUIR - Apenas dono ou admin
CREATE POLICY "projects_delete_policy" ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    public.is_user_admin()
    OR user_id = auth.uid()
  );

-- ============================================
-- ETAPA 4: GARANTIR PERMISSÕES
-- ============================================

GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.project_members TO authenticated;

-- ============================================
-- ETAPA 5: VERIFICAÇÃO
-- ============================================

-- Ver políticas criadas
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies
WHERE tablename IN ('tasks', 'projects', 'user_hierarchy')
ORDER BY tablename, policyname;

-- Verificar funções
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_user_admin', 'get_user_team_hierarchy', 'get_team_count', 'get_direct_supervisor');

-- ============================================
-- ✅ PRONTO! 
-- Agora você pode:
-- 1. Criar tarefas ✅
-- 2. Gerenciar equipes ✅  
-- 3. Criar projetos ✅
-- 4. Ver tarefas da equipe ✅
-- ============================================
