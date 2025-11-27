-- ============================================
-- 🚨 EXECUTAR ESTE SQL URGENTEMENTE NO SUPABASE
-- ============================================
-- Copie TUDO abaixo e cole no Supabase SQL Editor
-- ============================================

-- 1. CRIAR TABELA user_hierarchy
CREATE TABLE IF NOT EXISTS public.user_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, supervisor_id),
  CHECK (user_id != supervisor_id)
);

-- 2. CRIAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_user_hierarchy_user ON public.user_hierarchy(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hierarchy_supervisor ON public.user_hierarchy(supervisor_id);

-- 3. HABILITAR RLS
ALTER TABLE public.user_hierarchy ENABLE ROW LEVEL SECURITY;

-- 4. FUNÇÃO: Obter hierarquia da equipe (recursivo)
CREATE OR REPLACE FUNCTION public.get_user_team_hierarchy(user_uuid UUID)
RETURNS TABLE(team_member_id UUID) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNÇÃO: Contar membros da equipe
CREATE OR REPLACE FUNCTION public.get_team_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  team_size INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO team_size
  FROM public.get_user_team_hierarchy(user_uuid);
  
  RETURN team_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNÇÃO: Obter supervisor direto
CREATE OR REPLACE FUNCTION public.get_direct_supervisor(user_uuid UUID)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  nivelAcesso TEXT,
  funcao TEXT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNÇÃO: Verificar se é admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT "nivelAcesso" = 'Admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. POLÍTICAS RLS para user_hierarchy

-- Limpar políticas antigas
DROP POLICY IF EXISTS "users_view_hierarchy" ON public.user_hierarchy;
DROP POLICY IF EXISTS "users_manage_own_team" ON public.user_hierarchy;
DROP POLICY IF EXISTS "admins_view_all_hierarchy" ON public.user_hierarchy;

-- Visualizar: próprios relacionamentos + hierarquia
CREATE POLICY "users_view_hierarchy" ON public.user_hierarchy
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = supervisor_id
    OR auth.uid() IN (
      SELECT team_member_id FROM public.get_user_team_hierarchy(auth.uid())
    )
  );

-- Gerenciar: supervisores podem adicionar/remover da própria equipe
CREATE POLICY "users_manage_own_team" ON public.user_hierarchy
  FOR ALL
  USING (auth.uid() = supervisor_id)
  WITH CHECK (auth.uid() = supervisor_id);

-- Admins veem tudo
CREATE POLICY "admins_view_all_hierarchy" ON public.user_hierarchy
  FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- ============================================
-- ✅ PRONTO! Agora atualize a página
-- ============================================
