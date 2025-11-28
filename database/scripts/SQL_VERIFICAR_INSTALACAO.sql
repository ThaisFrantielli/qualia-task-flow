-- ============================================
-- VERIFICAR INSTALAÇÃO DO SQL
-- ============================================
-- Execute estas queries uma por uma para verificar se tudo foi criado corretamente

-- 1. Verificar se a tabela user_hierarchy existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'user_hierarchy'
);

-- 2. Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_hierarchy'
ORDER BY ordinal_position;

-- 3. Verificar se as funções existem
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_user_team_hierarchy',
  'get_team_count',
  'get_direct_supervisor',
  'is_user_admin'
);

-- 4. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'user_hierarchy';

-- 5. Verificar se RLS está habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'user_hierarchy';

-- 6. Testar inserção de teste (substitua pelos IDs reais)
-- ATENÇÃO: Substitua os IDs pelos IDs reais de usuários do seu banco
-- SELECT id, full_name FROM profiles LIMIT 5;

-- Depois de pegar os IDs, teste inserir:
-- INSERT INTO user_hierarchy (user_id, supervisor_id)
-- VALUES ('ID_USUARIO_1', 'ID_SUPERVISOR')
-- RETURNING *;

-- 7. Testar função get_user_team_hierarchy
-- SELECT * FROM get_user_team_hierarchy('ID_DO_SUPERVISOR');

-- 8. Testar função get_team_count
-- SELECT get_team_count('ID_DO_SUPERVISOR');

-- 9. Testar função get_direct_supervisor
-- SELECT * FROM get_direct_supervisor('ID_DO_USUARIO');

-- 10. Testar função is_user_admin
-- SELECT is_user_admin();

-- ============================================
-- QUERIES ÚTEIS PARA DEBUG
-- ============================================

-- Ver todos os registros de hierarquia
SELECT 
  uh.id,
  u.full_name as usuario,
  u.email as usuario_email,
  s.full_name as supervisor,
  s.email as supervisor_email,
  uh.created_at
FROM user_hierarchy uh
JOIN profiles u ON u.id = uh.user_id
JOIN profiles s ON s.id = uh.supervisor_id
ORDER BY uh.created_at DESC;

-- Ver usuários sem supervisor
SELECT id, full_name, email, "nivelAcesso"
FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_hierarchy);

-- Ver supervisores e quantos subordinados têm
SELECT 
  p.full_name as supervisor,
  p.email,
  COUNT(uh.user_id) as total_subordinados
FROM profiles p
LEFT JOIN user_hierarchy uh ON uh.supervisor_id = p.id
WHERE p."nivelAcesso" IN ('Supervisão', 'Gestão', 'Admin')
GROUP BY p.id, p.full_name, p.email
ORDER BY total_subordinados DESC;

-- ============================================
-- SE HOUVER ERROS, USE ESTAS QUERIES DE LIMPEZA
-- ============================================

-- Remover todas as políticas (se necessário recriar)
-- DROP POLICY IF EXISTS "users_view_hierarchy" ON public.user_hierarchy;
-- DROP POLICY IF EXISTS "users_manage_own_team" ON public.user_hierarchy;
-- DROP POLICY IF EXISTS "admins_view_all_hierarchy" ON public.user_hierarchy;

-- Remover todas as funções (se necessário recriar)
-- DROP FUNCTION IF EXISTS public.get_user_team_hierarchy(UUID);
-- DROP FUNCTION IF EXISTS public.get_team_count(UUID);
-- DROP FUNCTION IF EXISTS public.get_direct_supervisor(UUID);
-- DROP FUNCTION IF EXISTS public.is_user_admin();

-- Remover tabela (CUIDADO: apaga todos os dados!)
-- DROP TABLE IF EXISTS public.user_hierarchy CASCADE;
