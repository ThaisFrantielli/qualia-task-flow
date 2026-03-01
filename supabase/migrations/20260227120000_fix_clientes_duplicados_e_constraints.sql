-- =============================================================================
-- MIGRAÇÃO: Limpeza de clientes duplicados + Correção de constraints
-- Data: 2026-02-27
-- 
-- Problemas corrigidos:
-- 1. Remove o índice UNIQUE em nome_fantasia (muito restritivo: bloqueia
--    múltiplos clientes sem nome_fantasia)
-- 2. Deduplica clientes pelo cpf_cnpj (mantém o registro mais completo)
-- 3. Remove clientes com código aleatório `bi_<timestamp>_<random>` que
--    são duplicatas de clientes existentes com cpf_cnpj igual
-- 4. Remove clientes `bi_random` sem nenhum dado relacional (junk data)
-- 5. Garante constraint UNIQUE em cpf_cnpj (apenas para valores não-nulos)
-- =============================================================================

DO $$
DECLARE
  removed_count  integer := 0;
  merged_count   integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clientes'
  ) THEN
    RAISE NOTICE 'Tabela clientes não encontrada - abortando migração.';
    RETURN;
  END IF;

  -- =========================================================================
  -- 0) Backup automático antes de qualquer alteração
  -- =========================================================================
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clientes_backup'
  ) THEN
    CREATE TABLE public.clientes_backup AS TABLE public.clientes WITH NO DATA;
    ALTER TABLE public.clientes_backup ADD COLUMN IF NOT EXISTS backup_at timestamptz DEFAULT now();
  END IF;

  -- Registrar estado atual antes das modificações
  INSERT INTO public.clientes_backup
  SELECT c.*, now()
  FROM public.clientes c
  WHERE NOT EXISTS (SELECT 1 FROM public.clientes_backup b WHERE b.id = c.id);

  -- =========================================================================
  -- 1) Remover índice ÚNICO em nome_fantasia se existir
  --    (muito restritivo: impede inserção de múltiplos clientes sem nome_fantasia)
  -- =========================================================================
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'clientes_nome_fantasia_key'
  ) THEN
    EXECUTE 'DROP INDEX public.clientes_nome_fantasia_key';
    RAISE NOTICE '✓ Índice clientes_nome_fantasia_key removido';
  END IF;

  -- =========================================================================
  -- 2) Deduplicar por cpf_cnpj (ignora nulos/vazios)
  --    Estratégia: manter o registro com mais campos preenchidos; em empate, menor id
  -- =========================================================================
  CREATE TEMP TABLE tmp_cpfcnpj_keep AS
  SELECT
    btrim(regexp_replace(cpf_cnpj, '\D', '', 'g')) AS cnpj_norm,
    (
      ARRAY_AGG(
        id
        ORDER BY
          (
            (CASE WHEN nome_fantasia IS NOT NULL AND btrim(nome_fantasia) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN razao_social  IS NOT NULL AND btrim(razao_social)  <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN email         IS NOT NULL AND btrim(email)         <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN telefone      IS NOT NULL AND btrim(telefone)      <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN whatsapp_number IS NOT NULL AND btrim(whatsapp_number) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN cidade        IS NOT NULL AND btrim(cidade)        <> '' THEN 1 ELSE 0 END)
          ) DESC,
          id ASC
      )
    )[1] AS keep_id
  FROM public.clientes
  WHERE cpf_cnpj IS NOT NULL
    AND btrim(regexp_replace(cpf_cnpj, '\D', '', 'g')) <> ''
  GROUP BY btrim(regexp_replace(cpf_cnpj, '\D', '', 'g'))
  HAVING COUNT(*) > 1;

  -- Se há duplicatas por cpf_cnpj, reapontar FKs e remover extras
  IF EXISTS (SELECT 1 FROM tmp_cpfcnpj_keep LIMIT 1) THEN
    CREATE TEMP TABLE tmp_cpfcnpj_drop AS
    SELECT c.id AS drop_id, k.keep_id, c.cpf_cnpj, k.cnpj_norm
    FROM public.clientes c
    JOIN tmp_cpfcnpj_keep k
      ON btrim(regexp_replace(c.cpf_cnpj, '\D', '', 'g')) = k.cnpj_norm
    WHERE c.id <> k.keep_id;

    GET DIAGNOSTICS merged_count = ROW_COUNT;

    -- Reapontar FKs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='cliente_id') THEN
      EXECUTE 'UPDATE public.tickets t SET cliente_id = d.keep_id FROM tmp_cpfcnpj_drop d WHERE t.cliente_id = d.drop_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cliente_contatos' AND column_name='cliente_id') THEN
      EXECUTE 'UPDATE public.cliente_contatos cc SET cliente_id = d.keep_id FROM tmp_cpfcnpj_drop d WHERE cc.cliente_id = d.drop_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='atendimentos' AND column_name='cliente_id') THEN
      EXECUTE 'UPDATE public.atendimentos a SET cliente_id = d.keep_id FROM tmp_cpfcnpj_drop d WHERE a.cliente_id = d.drop_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='oportunidades' AND column_name='cliente_id') THEN
      EXECUTE 'UPDATE public.oportunidades o SET cliente_id = d.keep_id FROM tmp_cpfcnpj_drop d WHERE o.cliente_id = d.drop_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propostas' AND column_name='cliente_id') THEN
      EXECUTE 'UPDATE public.propostas p SET cliente_id = d.keep_id FROM tmp_cpfcnpj_drop d WHERE p.cliente_id = d.drop_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='whatsapp_conversations' AND column_name='cliente_id') THEN
      EXECUTE 'UPDATE public.whatsapp_conversations wc SET cliente_id = d.keep_id FROM tmp_cpfcnpj_drop d WHERE wc.cliente_id = d.drop_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='whatsapp_broadcast_recipients' AND column_name='cliente_id') THEN
      EXECUTE 'UPDATE public.whatsapp_broadcast_recipients wbr SET cliente_id = d.keep_id FROM tmp_cpfcnpj_drop d WHERE wbr.cliente_id = d.drop_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='triagem_descartes' AND column_name='cliente_id') THEN
      EXECUTE 'UPDATE public.triagem_descartes td SET cliente_id = d.keep_id FROM tmp_cpfcnpj_drop d WHERE td.cliente_id = d.drop_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='cliente_id') THEN
      EXECUTE 'UPDATE public.tasks ta SET cliente_id = d.keep_id FROM tmp_cpfcnpj_drop d WHERE ta.cliente_id = d.drop_id';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='surveys' AND column_name='cliente_id') THEN
      EXECUTE 'UPDATE public.surveys s SET cliente_id = d.keep_id FROM tmp_cpfcnpj_drop d WHERE s.cliente_id = d.drop_id';
    END IF;

    -- Remover duplicados por cpf_cnpj
    EXECUTE 'DELETE FROM public.clientes c USING tmp_cpfcnpj_drop d WHERE c.id = d.drop_id';
    GET DIAGNOSTICS removed_count = ROW_COUNT;
    RAISE NOTICE '✓ % clientes duplicados por cpf_cnpj removidos (merge de %)', removed_count, merged_count;

    DROP TABLE tmp_cpfcnpj_drop;
  END IF;
  DROP TABLE IF EXISTS tmp_cpfcnpj_keep;

  -- =========================================================================
  -- 3) Remover clientes com código aleatório `bi_<digits>_<alphanum>`
  --    que sejam duplicatas de outros clientes (mesmo cpf_cnpj)
  -- =========================================================================
  CREATE TEMP TABLE tmp_bi_random_orphans AS
  SELECT c.id
  FROM public.clientes c
  WHERE c.codigo_cliente ~ '^bi_[0-9]+_[a-z0-9]+$'
    AND c.cpf_cnpj IS NOT NULL
    AND btrim(regexp_replace(c.cpf_cnpj, '\D', '', 'g')) <> ''
    AND EXISTS (
      SELECT 1 FROM public.clientes other
      WHERE other.id <> c.id
        AND btrim(regexp_replace(other.cpf_cnpj, '\D', '', 'g'))
            = btrim(regexp_replace(c.cpf_cnpj, '\D', '', 'g'))
        -- Preferir manter o que não tem codigo aleatório
        AND other.codigo_cliente !~ '^bi_[0-9]+_[a-z0-9]+$'
    );

  IF EXISTS (SELECT 1 FROM tmp_bi_random_orphans LIMIT 1) THEN
    -- Migrações de FK para esses registros (podem ter sido criados com contatos)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cliente_contatos' AND column_name='cliente_id') THEN
      -- Reatribuir para o principal com mesmo cpf_cnpj
      EXECUTE '
        UPDATE public.cliente_contatos cc
        SET cliente_id = principal.id
        FROM tmp_bi_random_orphans orphan
        JOIN public.clientes dup ON dup.id = orphan.id
        JOIN public.clientes principal
          ON principal.id <> dup.id
          AND btrim(regexp_replace(principal.cpf_cnpj, ''\D'', '''', ''g''))
              = btrim(regexp_replace(dup.cpf_cnpj, ''\D'', '''', ''g''))
          AND principal.codigo_cliente !~ ''^bi_[0-9]+_[a-z0-9]+$''
        WHERE cc.cliente_id = orphan.id
      ';
    END IF;

    EXECUTE 'DELETE FROM public.clientes WHERE id IN (SELECT id FROM tmp_bi_random_orphans)';
    GET DIAGNOSTICS removed_count = ROW_COUNT;
    RAISE NOTICE '✓ % clientes com código aleatório (bi_<random>) removidos por ter cpf_cnpj duplicado', removed_count;
  END IF;
  DROP TABLE IF EXISTS tmp_bi_random_orphans;

  -- =========================================================================
  -- 4) Remover clientes `bi_<random>` completamente vazios (sem relações)
  --    São resíduos de sincronizações com código aleatório sem dados úteis
  -- =========================================================================
  CREATE TEMP TABLE tmp_bi_junk AS
  SELECT c.id
  FROM public.clientes c
  WHERE c.codigo_cliente ~ '^bi_[0-9]+_[a-z0-9]+$'
    AND (c.cpf_cnpj IS NULL OR btrim(regexp_replace(c.cpf_cnpj, '\D', '', 'g')) = '')
    AND (c.email IS NULL OR btrim(c.email) = '')
    AND (c.telefone IS NULL OR btrim(c.telefone) = '')
    AND NOT EXISTS (SELECT 1 FROM public.cliente_contatos cc WHERE cc.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.tickets t WHERE t.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.atendimentos a WHERE a.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.oportunidades o WHERE o.cliente_id = c.id);

  IF EXISTS (SELECT 1 FROM tmp_bi_junk LIMIT 1) THEN
    EXECUTE 'DELETE FROM public.clientes WHERE id IN (SELECT id FROM tmp_bi_junk)';
    GET DIAGNOSTICS removed_count = ROW_COUNT;
    RAISE NOTICE '✓ % clientes bi_random sem dados removidos (junk cleanup)', removed_count;
  END IF;
  DROP TABLE IF EXISTS tmp_bi_junk;

  -- =========================================================================
  -- 5) Garantir UNIQUE em cpf_cnpj para valores não-nulos
  --    (índice parcial — não afeta clientes sem cpf_cnpj)
  -- =========================================================================
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'clientes_cpf_cnpj_unique_notnull'
  ) THEN
    EXECUTE '
      CREATE UNIQUE INDEX clientes_cpf_cnpj_unique_notnull
      ON public.clientes (btrim(regexp_replace(cpf_cnpj, ''\D'', '''', ''g'')))
      WHERE cpf_cnpj IS NOT NULL
        AND btrim(regexp_replace(cpf_cnpj, ''\D'', '''', ''g'')) <> ''''
    ';
    RAISE NOTICE '✓ Índice UNIQUE parcial em cpf_cnpj criado';
  END IF;

  -- =========================================================================
  -- 6) Garantir UNIQUE em codigo_cliente (se ainda não existir)
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_codigo_cliente_key') THEN
    ALTER TABLE public.clientes ADD CONSTRAINT clientes_codigo_cliente_key UNIQUE (codigo_cliente);
    RAISE NOTICE '✓ Constraint UNIQUE em codigo_cliente criada';
  END IF;

  RAISE NOTICE '=== Migração concluída com sucesso ===';
END $$;
