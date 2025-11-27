-- ============================================
-- 🔧 SQL ATUALIZADO E CORRIGIDO
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- PASSO 1: Remover tudo (se já existe)
DROP POLICY IF EXISTS "users_view_hierarchy" ON public.user_hierarchy;
DROP POLICY IF EXISTS "users_manage_own_team" ON public.user_hierarchy;
DROP POLICY IF EXISTS "admins_view_all_hierarchy" ON public.user_hierarchy;
DROP FUNCTION IF EXISTS public.get_user_team_hierarchy(UUID);
DROP FUNCTION IF EXISTS public.get_team_count(UUID);
DROP FUNCTION IF EXISTS public.get_direct_supervisor(UUID);
DROP FUNCTION IF EXISTS public.is_user_admin();
DROP TABLE IF EXISTS public.user_hierarchy CASCADE;

-- PASSO 2: Criar tabela
CREATE TABLE public.user_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, supervisor_id),
  CHECK (user_id != supervisor_id)
);

-- PASSO 3: Criar índices
CREATE INDEX idx_user_hierarchy_user ON public.user_hierarchy(user_id);
CREATE INDEX idx_user_hierarchy_supervisor ON public.user_hierarchy(supervisor_id);

-- PASSO 4: Habilitar RLS
ALTER TABLE public.user_hierarchy ENABLE ROW LEVEL SECURITY;

-- PASSO 5: Função - Verificar se é admin
CREATE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT "nivelAcesso" = 'Admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- PASSO 6: Função - Obter hierarquia da equipe (recursivo)
CREATE FUNCTION public.get_user_team_hierarchy(user_uuid UUID)
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

-- PASSO 7: Função - Contar membros da equipe
CREATE FUNCTION public.get_team_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_size INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO team_size
  FROM public.get_user_team_hierarchy(user_uuid);
  
  RETURN team_size;
END;
$$;

-- PASSO 8: Função - Obter supervisor direto
CREATE FUNCTION public.get_direct_supervisor(user_uuid UUID)
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

-- PASSO 9: Políticas RLS

-- Visualizar: próprios relacionamentos + hierarquia
CREATE POLICY "users_view_hierarchy" ON public.user_hierarchy
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = supervisor_id
    OR auth.uid() IN (
      SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid())
    )
    OR public.is_user_admin()
  );

-- Gerenciar: supervisores podem adicionar/remover da própria equipe
CREATE POLICY "users_manage_own_team" ON public.user_hierarchy
  FOR ALL
  USING (
    auth.uid() = supervisor_id 
    OR public.is_user_admin()
  )
  WITH CHECK (
    auth.uid() = supervisor_id 
    OR public.is_user_admin()
  );

-- PASSO 10: Garantir que as funções são executáveis
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_team_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_supervisor(UUID) TO authenticated;

-- PASSO 11: Garantir permissões na tabela
GRANT ALL ON public.user_hierarchy TO authenticated;

-- ============================================
-- ✅ VERIFICAÇÃO FINAL
-- ============================================
-- Execute estas queries para confirmar que tudo foi criado:

-- Ver tabela
SELECT * FROM information_schema.tables 
WHERE table_name = 'user_hierarchy';

-- Ver funções
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%team%' OR routine_name LIKE '%supervisor%' OR routine_name = 'is_user_admin';

-- Ver políticas
SELECT policyname FROM pg_policies
WHERE tablename = 'user_hierarchy';

-- ============================================
-- ✅ PRONTO! Recarregue a página do aplicativo
-- ============================================
