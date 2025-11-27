-- ============================================
-- 🚀 SQL MÍNIMO - VERSÃO SUPER SIMPLIFICADA
-- ============================================
-- Execute este SQL se o outro der erro
-- ============================================

-- 1. LIMPAR TUDO PRIMEIRO
DROP POLICY IF EXISTS "users_view_hierarchy" ON public.user_hierarchy;
DROP POLICY IF EXISTS "users_manage_own_team" ON public.user_hierarchy;
DROP FUNCTION IF EXISTS public.get_user_team_hierarchy(UUID);
DROP FUNCTION IF EXISTS public.get_team_count(UUID);
DROP FUNCTION IF EXISTS public.get_direct_supervisor(UUID);
DROP FUNCTION IF EXISTS public.is_user_admin();
DROP TABLE IF EXISTS public.user_hierarchy CASCADE;

-- 2. CRIAR TABELA
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

-- 3. FUNÇÃO: Verificar admin
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

-- 4. FUNÇÃO: Hierarquia da equipe
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

-- 5. FUNÇÃO: Contar equipe
CREATE OR REPLACE FUNCTION public.get_team_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.get_user_team_hierarchy(user_uuid))::INTEGER;
END;
$$;

-- 6. FUNÇÃO: Supervisor direto
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

-- 7. POLÍTICA: Ver próprios registros + equipe
CREATE POLICY "users_view_hierarchy" 
ON public.user_hierarchy
FOR SELECT
USING (
  auth.uid() = user_id 
  OR auth.uid() = supervisor_id
  OR public.is_user_admin()
);

-- 8. POLÍTICA: Gerenciar própria equipe
CREATE POLICY "users_manage_own_team" 
ON public.user_hierarchy
FOR ALL
USING (auth.uid() = supervisor_id OR public.is_user_admin())
WITH CHECK (auth.uid() = supervisor_id OR public.is_user_admin());

-- 9. PERMISSÕES
GRANT ALL ON public.user_hierarchy TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_team_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_supervisor(UUID) TO authenticated;

-- ============================================
-- ✅ PRONTO! Atualize a página
-- ============================================
