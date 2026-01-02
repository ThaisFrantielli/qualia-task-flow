
-- Criar funções SECURITY DEFINER para evitar recursão infinita

-- Função para verificar se usuário é membro de uma equipe
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = _team_id AND user_id = _user_id
  );
$$;

-- Função para verificar se usuário é owner de uma equipe
CREATE OR REPLACE FUNCTION public.is_team_owner(_team_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams
    WHERE id = _team_id AND owner_id = _user_id
  );
$$;

-- Função para obter IDs das equipes do usuário
CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid DEFAULT auth.uid())
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM team_members WHERE user_id = _user_id
  UNION
  SELECT id FROM teams WHERE owner_id = _user_id;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_team_ids(uuid) TO authenticated;

-- CORRIGIR POLICY DE TEAMS (usar função em vez de subconsulta em team_members)
DROP POLICY IF EXISTS "View accessible teams" ON public.teams;
CREATE POLICY "View accessible teams" ON public.teams
FOR SELECT USING (
  auth.uid() = owner_id
  OR public.is_team_member(id)
  OR public.is_admin_user()
);

-- CORRIGIR POLICY DE TEAM_MEMBERS (usar função em vez de subconsulta em teams)
DROP POLICY IF EXISTS "View members of accessible teams" ON public.team_members;
CREATE POLICY "View members of accessible teams" ON public.team_members
FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_team_owner(team_id)
  OR public.is_admin_user()
);

-- Também corrigir policy de delete de team_members
DROP POLICY IF EXISTS "authenticated_delete_team_members" ON public.team_members;
CREATE POLICY "authenticated_delete_team_members" ON public.team_members
FOR DELETE USING (
  auth.uid() = user_id
  OR public.is_team_owner(team_id)
  OR public.is_admin_user()
);

-- CORRIGIR POLICY DE PROJECTS que usa team_members (projects_select_policy_with_privacy)
DROP POLICY IF EXISTS "projects_select_policy_with_privacy" ON public.projects;
-- Esta policy é duplicada e causando conflitos, removemos ela
-- A policy projects_select já cobre os casos necessários

-- Atualizar projects_select para usar funções sem recursão
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects
FOR SELECT USING (
  auth.uid() = user_id
  OR public.is_member_of_project(id)
  OR public.is_admin_user()
  OR privacy = 'organization'
  OR (privacy = 'team' AND team_id IN (SELECT public.get_user_team_ids(auth.uid())))
  OR (
    NOT public.is_gestao_or_above()
    AND public.is_supervisor_or_above()
    AND user_id IN (SELECT public.get_direct_subordinates(auth.uid()))
  )
  OR (
    public.is_gestao_or_above()
    AND user_id IN (SELECT public.get_all_subordinates(auth.uid()))
  )
);

-- Corrigir project_members também
DROP POLICY IF EXISTS "Users can view project memberships where they are members" ON public.project_members;
CREATE POLICY "Users can view project memberships" ON public.project_members
FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_owner_of_project(project_id)
  OR public.is_admin_user()
);
