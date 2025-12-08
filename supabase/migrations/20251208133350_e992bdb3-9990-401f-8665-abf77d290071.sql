-- Função para buscar subordinados de um gerente específico (recursiva)
CREATE OR REPLACE FUNCTION public.get_subordinates_of_manager(manager_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subordinates AS (
    -- Subordinados diretos do gerente
    SELECT uh.user_id
    FROM user_hierarchy uh
    WHERE uh.supervisor_id = manager_id
    
    UNION
    
    -- Subordinados dos subordinados (recursivo)
    SELECT uh.user_id
    FROM user_hierarchy uh
    INNER JOIN subordinates s ON uh.supervisor_id = s.user_id
  )
  SELECT user_id FROM subordinates;
END;
$$;

-- Função para buscar apenas subordinados DIRETOS (não recursivo)
CREATE OR REPLACE FUNCTION public.get_direct_reports(supervisor_uuid uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text,
  nivel_acesso text,
  has_subordinates boolean,
  subordinates_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    p."nivelAcesso" as nivel_acesso,
    EXISTS(SELECT 1 FROM user_hierarchy uh2 WHERE uh2.supervisor_id = p.id) as has_subordinates,
    (SELECT COUNT(*) FROM user_hierarchy uh3 WHERE uh3.supervisor_id = p.id) as subordinates_count
  FROM user_hierarchy uh
  INNER JOIN profiles p ON p.id = uh.user_id
  WHERE uh.supervisor_id = supervisor_uuid;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_subordinates_of_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_reports(uuid) TO authenticated;