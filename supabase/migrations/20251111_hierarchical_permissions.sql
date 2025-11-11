-- ============================================
-- SISTEMA DE PERMISSÕES HIERÁRQUICAS
-- Data: 2025-11-11
-- Autor: Sistema de Gestão de Tarefas
-- ============================================

-- ============================================
-- PARTE 1: CRIAR TABELA DE HIERARQUIA
-- ============================================

-- Criar tabela de hierarquia (se não existir)
CREATE TABLE IF NOT EXISTS public.user_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, supervisor_id),
  -- Prevenir que um usuário seja seu próprio supervisor
  CHECK (user_id != supervisor_id)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_hierarchy_user ON public.user_hierarchy(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hierarchy_supervisor ON public.user_hierarchy(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_user_hierarchy_created ON public.user_hierarchy(created_at);

-- Comentários para documentação
COMMENT ON TABLE public.user_hierarchy IS 'Tabela de hierarquia organizacional - define quem reporta para quem';
COMMENT ON COLUMN public.user_hierarchy.user_id IS 'ID do usuário subordinado';
COMMENT ON COLUMN public.user_hierarchy.supervisor_id IS 'ID do supervisor/gestor';

-- ============================================
-- PARTE 2: FUNÇÕES DE HIERARQUIA
-- ============================================

-- Função para obter todos os membros da equipe (recursivo)
CREATE OR REPLACE FUNCTION public.get_user_team_hierarchy(user_uuid UUID)
RETURNS TABLE(team_member_id UUID) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE team_tree AS (
    -- Base: usuários diretos sob supervisão
    SELECT user_id as team_member_id
    FROM public.user_hierarchy
    WHERE supervisor_id = user_uuid
    
    UNION
    
    -- Recursivo: subordinados dos subordinados (múltiplos níveis)
    SELECT uh.user_id
    FROM public.user_hierarchy uh
    INNER JOIN team_tree tt ON uh.supervisor_id = tt.team_member_id
  )
  SELECT DISTINCT team_member_id FROM team_tree;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_team_hierarchy IS 'Retorna todos os membros da equipe de um supervisor (recursivo em múltiplos níveis)';

-- Função para verificar se um usuário é admin
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT 
    (profiles.nivelAcesso = 'Admin' OR COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true)
  INTO is_admin
  FROM public.profiles
  WHERE profiles.id = user_uuid;
  
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_user_admin IS 'Verifica se um usuário é administrador';

-- Função para verificar se um usuário é supervisor/gestor
CREATE OR REPLACE FUNCTION public.is_user_supervisor(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_supervisor BOOLEAN;
BEGIN
  SELECT 
    profiles.nivelAcesso IN ('Supervisão', 'Gestão', 'Admin')
  INTO is_supervisor
  FROM public.profiles
  WHERE profiles.id = user_uuid;
  
  RETURN COALESCE(is_supervisor, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_user_supervisor IS 'Verifica se um usuário tem nível de supervisão ou superior';

-- ============================================
-- PARTE 3: RLS PARA TAREFAS (TASKS)
-- ============================================

-- Remover políticas antigas se existirem (para evitar conflito)
DROP POLICY IF EXISTS "users_view_own_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_view_project_member_tasks" ON public.tasks;
DROP POLICY IF EXISTS "supervisors_view_team_tasks" ON public.tasks;
DROP POLICY IF EXISTS "admins_view_all_tasks" ON public.tasks;
DROP POLICY IF EXISTS "authenticated_users_create_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_update_own_tasks" ON public.tasks;
DROP POLICY IF EXISTS "supervisors_update_team_tasks" ON public.tasks;
DROP POLICY IF EXISTS "admins_update_all_tasks" ON public.tasks;
DROP POLICY IF EXISTS "users_delete_own_tasks" ON public.tasks;
DROP POLICY IF EXISTS "supervisors_delete_team_tasks" ON public.tasks;
DROP POLICY IF EXISTS "admins_delete_all_tasks" ON public.tasks;

-- Habilitar RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- === POLÍTICAS DE SELECT (VISUALIZAÇÃO) ===

-- 1. Usuários veem suas próprias tarefas (criadas ou atribuídas)
CREATE POLICY "users_view_own_tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR assignee_id = auth.uid()
);

-- 2. Usuários veem tarefas de projetos em que participam
CREATE POLICY "users_view_project_member_tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT project_id 
    FROM public.project_members 
    WHERE user_id = auth.uid()
  )
);

-- 3. Supervisores/Gestores veem tarefas de sua equipe
CREATE POLICY "supervisors_view_team_tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.is_user_supervisor(auth.uid())
  AND (
    user_id IN (SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid()))
    OR assignee_id IN (SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid()))
  )
);

-- 4. Admins veem todas as tarefas
CREATE POLICY "admins_view_all_tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.is_user_admin(auth.uid())
);

-- === POLÍTICAS DE INSERT (CRIAR) ===

-- Todos os usuários autenticados podem criar tarefas
CREATE POLICY "authenticated_users_create_tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- === POLÍTICAS DE UPDATE (EDITAR) ===

-- 1. Usuários editam suas próprias tarefas ou tarefas atribuídas a eles
CREATE POLICY "users_update_own_tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  OR assignee_id = auth.uid()
  OR project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'aprovador', 'colaborador')
  )
);

-- 2. Supervisores/Gestores editam tarefas de sua equipe
CREATE POLICY "supervisors_update_team_tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.is_user_supervisor(auth.uid())
  AND (
    user_id IN (SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid()))
    OR assignee_id IN (SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid()))
  )
);

-- 3. Admins editam todas as tarefas
CREATE POLICY "admins_update_all_tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.is_user_admin(auth.uid())
);

-- === POLÍTICAS DE DELETE (EXCLUIR) ===

-- 1. Usuários excluem suas próprias tarefas ou tarefas atribuídas
CREATE POLICY "users_delete_own_tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() 
  OR assignee_id = auth.uid()
  OR project_id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'aprovador')
  )
);

-- 2. Supervisores/Gestores excluem tarefas de sua equipe
CREATE POLICY "supervisors_delete_team_tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  public.is_user_supervisor(auth.uid())
  AND (
    user_id IN (SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid()))
    OR assignee_id IN (SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid()))
  )
);

-- 3. Admins excluem todas as tarefas
CREATE POLICY "admins_delete_all_tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (
  public.is_user_admin(auth.uid())
);

-- ============================================
-- PARTE 4: RLS PARA PROJETOS (PROJECTS)
-- ============================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "users_view_own_projects" ON public.projects;
DROP POLICY IF EXISTS "users_view_member_projects" ON public.projects;
DROP POLICY IF EXISTS "supervisors_view_team_projects" ON public.projects;
DROP POLICY IF EXISTS "admins_view_all_projects" ON public.projects;
DROP POLICY IF EXISTS "authenticated_users_create_projects" ON public.projects;
DROP POLICY IF EXISTS "users_update_own_projects" ON public.projects;
DROP POLICY IF EXISTS "supervisors_update_team_projects" ON public.projects;
DROP POLICY IF EXISTS "admins_update_all_projects" ON public.projects;
DROP POLICY IF EXISTS "users_delete_own_projects" ON public.projects;
DROP POLICY IF EXISTS "supervisors_delete_team_projects" ON public.projects;
DROP POLICY IF EXISTS "admins_delete_all_projects" ON public.projects;

-- Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- === POLÍTICAS DE SELECT (VISUALIZAÇÃO) ===

-- 1. Usuários veem seus próprios projetos
CREATE POLICY "users_view_own_projects"
ON public.projects
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. Usuários veem projetos em que participam como membros
CREATE POLICY "users_view_member_projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT project_id 
    FROM public.project_members 
    WHERE user_id = auth.uid()
  )
);

-- 3. Supervisores/Gestores veem projetos de sua equipe
CREATE POLICY "supervisors_view_team_projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_user_supervisor(auth.uid())
  AND user_id IN (SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid()))
);

-- 4. Admins veem todos os projetos
CREATE POLICY "admins_view_all_projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_user_admin(auth.uid())
);

-- === POLÍTICAS DE INSERT (CRIAR) ===

-- Todos os usuários autenticados podem criar projetos
CREATE POLICY "authenticated_users_create_projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (true);

-- === POLÍTICAS DE UPDATE (EDITAR) ===

-- 1. Usuários editam seus próprios projetos ou projetos onde são membros com permissão
CREATE POLICY "users_update_own_projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'aprovador', 'colaborador')
  )
);

-- 2. Supervisores/Gestores editam projetos de sua equipe
CREATE POLICY "supervisors_update_team_projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  public.is_user_supervisor(auth.uid())
  AND user_id IN (SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid()))
);

-- 3. Admins editam todos os projetos
CREATE POLICY "admins_update_all_projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  public.is_user_admin(auth.uid())
);

-- === POLÍTICAS DE DELETE (EXCLUIR) ===

-- 1. Usuários excluem seus próprios projetos ou onde são owners
CREATE POLICY "users_delete_own_projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR id IN (
    SELECT project_id FROM public.project_members 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);

-- 2. Supervisores/Gestores excluem projetos de sua equipe
CREATE POLICY "supervisors_delete_team_projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  public.is_user_supervisor(auth.uid())
  AND user_id IN (SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid()))
);

-- 3. Admins excluem todos os projetos
CREATE POLICY "admins_delete_all_projects"
ON public.projects
FOR DELETE
TO authenticated
USING (
  public.is_user_admin(auth.uid())
);

-- ============================================
-- PARTE 5: RLS PARA USER_HIERARCHY
-- ============================================

-- Habilitar RLS na própria tabela de hierarquia
ALTER TABLE public.user_hierarchy ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar toda a hierarquia
CREATE POLICY "admins_manage_hierarchy"
ON public.user_hierarchy
FOR ALL
TO authenticated
USING (
  public.is_user_admin(auth.uid())
)
WITH CHECK (
  public.is_user_admin(auth.uid())
);

-- Supervisores/Gestores podem gerenciar sua própria equipe
CREATE POLICY "supervisors_manage_team_hierarchy"
ON public.user_hierarchy
FOR ALL
TO authenticated
USING (
  public.is_user_supervisor(auth.uid())
  AND (
    supervisor_id = auth.uid()
    OR supervisor_id IN (SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid()))
  )
)
WITH CHECK (
  public.is_user_supervisor(auth.uid())
  AND supervisor_id = auth.uid()
);

-- Usuários podem ver sua própria hierarquia (quem é seu supervisor)
CREATE POLICY "users_view_own_hierarchy"
ON public.user_hierarchy
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- PARTE 6: TRIGGER PARA PREVENIR CICLOS
-- ============================================

-- Função para prevenir ciclos na hierarquia
CREATE OR REPLACE FUNCTION public.prevent_hierarchy_cycle()
RETURNS TRIGGER AS $$
DECLARE
  has_cycle BOOLEAN;
BEGIN
  -- Verificar se o usuário está se tornando seu próprio supervisor (direto)
  IF NEW.user_id = NEW.supervisor_id THEN
    RAISE EXCEPTION 'Um usuário não pode ser seu próprio supervisor';
  END IF;
  
  -- Verificar ciclos indiretos (se o supervisor já está na cadeia hierárquica do usuário)
  WITH RECURSIVE supervisor_chain AS (
    SELECT supervisor_id
    FROM public.user_hierarchy
    WHERE user_id = NEW.supervisor_id
    
    UNION
    
    SELECT uh.supervisor_id
    FROM public.user_hierarchy uh
    INNER JOIN supervisor_chain sc ON uh.user_id = sc.supervisor_id
  )
  SELECT EXISTS (
    SELECT 1 FROM supervisor_chain WHERE supervisor_id = NEW.user_id
  ) INTO has_cycle;
  
  IF has_cycle THEN
    RAISE EXCEPTION 'Esta operação criaria um ciclo na hierarquia organizacional';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS check_hierarchy_cycle ON public.user_hierarchy;
CREATE TRIGGER check_hierarchy_cycle
BEFORE INSERT OR UPDATE ON public.user_hierarchy
FOR EACH ROW EXECUTE FUNCTION public.prevent_hierarchy_cycle();

-- ============================================
-- PARTE 7: FUNÇÕES AUXILIARES
-- ============================================

-- Função para obter contagem da equipe
CREATE OR REPLACE FUNCTION public.get_team_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  team_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT team_member_id)
  INTO team_count
  FROM public.get_user_team_hierarchy(user_uuid);
  
  RETURN COALESCE(team_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_team_count IS 'Retorna o número de pessoas na equipe de um supervisor';

-- Função para obter supervisor direto de um usuário
CREATE OR REPLACE FUNCTION public.get_direct_supervisor(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  supervisor_uuid UUID;
BEGIN
  SELECT supervisor_id
  INTO supervisor_uuid
  FROM public.user_hierarchy
  WHERE user_id = user_uuid
  LIMIT 1;
  
  RETURN supervisor_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_direct_supervisor IS 'Retorna o supervisor direto de um usuário';

-- ============================================
-- PARTE 8: ATUALIZAR TIMESTAMP AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_hierarchy_updated_at ON public.user_hierarchy;
CREATE TRIGGER update_user_hierarchy_updated_at
BEFORE UPDATE ON public.user_hierarchy
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- CONCLUÍDO!
-- ============================================

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de Permissões Hierárquicas instalado com sucesso!';
  RAISE NOTICE '📋 Tabelas criadas: user_hierarchy';
  RAISE NOTICE '🔧 Funções criadas: get_user_team_hierarchy, is_user_admin, is_user_supervisor, get_team_count, get_direct_supervisor';
  RAISE NOTICE '🔒 RLS habilitado para: tasks, projects, user_hierarchy';
  RAISE NOTICE '🛡️ Políticas criadas: SELECT, INSERT, UPDATE, DELETE para cada nível de acesso';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Próximo passo: Use a interface /configuracoes/equipes para gerenciar hierarquias';
END $$;
