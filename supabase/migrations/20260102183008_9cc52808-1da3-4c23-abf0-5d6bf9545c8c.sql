
-- Primeiro dropar a função existente
DROP FUNCTION IF EXISTS public.get_projects_with_stats();

-- Recriar com os campos adicionais
CREATE OR REPLACE FUNCTION public.get_projects_with_stats()
RETURNS TABLE(
  id uuid, 
  name text, 
  description text, 
  color text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  user_id uuid, 
  portfolio_id uuid,
  team_id uuid,
  privacy text,
  task_count integer, 
  completed_count integer, 
  late_count integer
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.description,
    p.color,
    p.created_at,
    p.updated_at,
    p.user_id,
    p.portfolio_id,
    p.team_id,
    p.privacy,
    count(t.id)::integer as task_count,
    count(t.id) filter (where t.status = 'done')::integer as completed_count,
    count(t.id) filter (where t.status = 'late')::integer as late_count
  FROM projects p
  LEFT JOIN tasks t ON t.project_id = p.id
  GROUP BY p.id
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_projects_with_stats() TO authenticated;
