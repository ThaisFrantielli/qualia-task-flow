
-- Allow team members with supervisor/gestão roles + team owners to update projects
DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
CREATE POLICY "projects_update_policy" ON public.projects
FOR UPDATE TO authenticated
USING (
  is_user_admin()
  OR (user_id = auth.uid())
  OR (id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'approver', 'aprovador')
  ))
  OR (team_id IS NOT NULL AND is_team_owner(team_id))
  OR (team_id IS NOT NULL AND is_supervisor_or_above() AND is_team_member(team_id))
)
WITH CHECK (
  is_user_admin()
  OR (user_id = auth.uid())
  OR (id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = auth.uid() AND pm.role IN ('owner', 'approver', 'aprovador')
  ))
  OR (team_id IS NOT NULL AND is_team_owner(team_id))
  OR (team_id IS NOT NULL AND is_supervisor_or_above() AND is_team_member(team_id))
);

-- Allow project members with owner/approver role AND team owners to manage project_members
DROP POLICY IF EXISTS "Project owners can manage project members" ON public.project_members;
CREATE POLICY "Project owners can manage project members" ON public.project_members
FOR ALL TO authenticated
USING (
  is_owner_of_project(project_id)
  OR is_admin_user()
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND p.team_id IS NOT NULL
    AND (is_team_owner(p.team_id) OR (is_supervisor_or_above() AND is_team_member(p.team_id)))
  )
)
WITH CHECK (
  is_owner_of_project(project_id)
  OR is_admin_user()
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND p.team_id IS NOT NULL
    AND (is_team_owner(p.team_id) OR (is_supervisor_or_above() AND is_team_member(p.team_id)))
  )
);
