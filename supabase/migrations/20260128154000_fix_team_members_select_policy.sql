-- Permitir que membros do time vejam a lista completa de membros do mesmo time
-- (corrige dropdown de responsáveis no fluxo de Apoio de Departamento)

-- Função usada pela policy (mantida idempotente via OR REPLACE)
CREATE OR REPLACE FUNCTION public.can_view_team_members(_team_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    public.is_user_admin()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.owner_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = _team_id AND tm.user_id = _user_id);
$$;

GRANT EXECUTE ON FUNCTION public.can_view_team_members(uuid, uuid) TO authenticated;

-- Policy RLS em team_members: permitir SELECT para membros do time e admins
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
CREATE POLICY "Team members can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  public.can_view_team_members(team_id, auth.uid())
);
