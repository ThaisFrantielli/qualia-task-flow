-- =============================================
-- FASE 3: CORRIGIR SISTEMA DE EQUIPES
-- =============================================

-- 3.1 Corrigir RLS de teams
DROP POLICY IF EXISTS "Users can view teams they own" ON public.teams;

-- SELECT: Ver equipes onde é owner OU membro OU admin
CREATE POLICY "View accessible teams" ON public.teams
FOR SELECT USING (
  auth.uid() = owner_id
  OR id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  OR public.is_admin_user()
);

-- 3.2 Corrigir RLS de team_members
DROP POLICY IF EXISTS "authenticated_select_team_members" ON public.team_members;

-- SELECT: Ver membros das equipes que pode acessar
CREATE POLICY "View members of accessible teams" ON public.team_members
FOR SELECT USING (
  team_id IN (SELECT id FROM teams)
  OR public.is_admin_user()
);

-- =============================================
-- FASE 4: DIFERENCIAR SUPERVISÃO VS GESTÃO NAS RLS
-- =============================================

-- 4.1 Atualizar políticas de tasks
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "Supervisors can view team tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks they're assigned to" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks
FOR SELECT USING (
  -- Próprias tarefas
  auth.uid() = user_id
  OR auth.uid() = assignee_id
  -- Membro do projeto
  OR public.is_member_of_project(project_id)
  -- Admin vê tudo
  OR public.is_admin_user()
  -- Supervisão: apenas subordinados DIRETOS
  OR (
    NOT public.is_gestao_or_above()
    AND public.is_supervisor_or_above()
    AND (
      user_id IN (SELECT public.get_direct_subordinates(auth.uid()))
      OR assignee_id IN (SELECT public.get_direct_subordinates(auth.uid()))
    )
  )
  -- Gestão: TODOS subordinados recursivamente
  OR (
    public.is_gestao_or_above()
    AND (
      user_id IN (SELECT public.get_all_subordinates(auth.uid()))
      OR assignee_id IN (SELECT public.get_all_subordinates(auth.uid()))
    )
  )
);

-- 4.2 Atualizar políticas de projects
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects they're member of" ON public.projects;

CREATE POLICY "projects_select" ON public.projects
FOR SELECT USING (
  auth.uid() = user_id
  OR public.is_member_of_project(id)
  OR public.is_admin_user()
  OR (privacy = 'organization')
  -- Supervisão: apenas projetos de subordinados DIRETOS
  OR (
    NOT public.is_gestao_or_above()
    AND public.is_supervisor_or_above()
    AND user_id IN (SELECT public.get_direct_subordinates(auth.uid()))
  )
  -- Gestão: projetos de TODOS subordinados recursivamente
  OR (
    public.is_gestao_or_above()
    AND user_id IN (SELECT public.get_all_subordinates(auth.uid()))
  )
);