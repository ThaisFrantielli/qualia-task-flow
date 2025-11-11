-- ============================================
-- 🔍 VERIFICAR ESTRUTURA DA TABELA TEAMS
-- ============================================
-- Execute esta query primeiro para ver as colunas

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'teams'
ORDER BY ordinal_position;

-- Ver dados existentes (se houver)
SELECT * FROM teams LIMIT 5;
