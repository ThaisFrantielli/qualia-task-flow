-- =============================================================================
-- HOTFIX: Remover índice UNIQUE de cpf_cnpj que bloqueia o Sincronizar BI
-- O BI tem 5 pares de CNPJ duplicados com IdCliente diferentes → não pode ser UNIQUE.
-- Substituímos por índice de performance (não-unique) somente se não existir ainda.
-- =============================================================================

-- 1) Derrubar o índice UNIQUE que está causando o erro 409 Conflict
DROP INDEX IF EXISTS public.clientes_cpf_cnpj_unique_notnull;

-- 2) Criar índice de performance (não-unique) caso ainda não exista
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'clientes_cpf_cnpj_idx'
  ) THEN
    CREATE INDEX clientes_cpf_cnpj_idx
      ON public.clientes (btrim(regexp_replace(cpf_cnpj, '\D', '', 'g')))
      WHERE cpf_cnpj IS NOT NULL
        AND btrim(regexp_replace(cpf_cnpj, '\D', '', 'g')) <> '';
    RAISE NOTICE '✓ Índice de performance clientes_cpf_cnpj_idx criado';
  ELSE
    RAISE NOTICE '- Índice clientes_cpf_cnpj_idx já existe (ok)';
  END IF;
END $$;

-- Confirmar que o índice UNIQUE foi removido
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'clientes'
  AND indexname LIKE '%cpf_cnpj%';
