-- =============================================================================
-- MIGRAÇÃO COMPLEMENTAR: Finaliza limpeza bi_random + constraints
-- Data: 2026-02-27 (parte 2 — após fix surveys FK)
-- Pré-requisito: executar APÓS os 3 scripts de correção de surveys FK
-- =============================================================================

DO $$
DECLARE
  removed_count integer := 0;
BEGIN

  -- =========================================================================
  -- 1) Remover índice ÚNICO em nome_fantasia se ainda existir
  -- =========================================================================
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'clientes_nome_fantasia_key'
  ) THEN
    EXECUTE 'DROP INDEX public.clientes_nome_fantasia_key';
    RAISE NOTICE '✓ Índice clientes_nome_fantasia_key removido';
  ELSE
    RAISE NOTICE '- Índice clientes_nome_fantasia_key já não existe (ok)';
  END IF;

  -- =========================================================================
  -- 2) Deduplica por cpf_cnpj (caso não tenha rodado ainda)
  -- =========================================================================
  IF EXISTS (
    SELECT 1 FROM public.clientes
    WHERE cpf_cnpj IS NOT NULL
      AND btrim(regexp_replace(cpf_cnpj, '\D', '', 'g')) <> ''
    GROUP BY btrim(regexp_replace(cpf_cnpj, '\D', '', 'g'))
    HAVING COUNT(*) > 1
    LIMIT 1
  ) THEN
    RAISE NOTICE 'Deduplicando por cpf_cnpj...';

    CREATE TEMP TABLE tmp_cpf_keep2 AS
    SELECT
      btrim(regexp_replace(cpf_cnpj, '\D', '', 'g')) AS cnpj_norm,
      (ARRAY_AGG(id ORDER BY
        (CASE WHEN nome_fantasia IS NOT NULL AND btrim(nome_fantasia)<>'' THEN 1 ELSE 0 END +
         CASE WHEN razao_social IS NOT NULL AND btrim(razao_social)<>'' THEN 1 ELSE 0 END +
         CASE WHEN email IS NOT NULL AND btrim(email)<>'' THEN 1 ELSE 0 END +
         CASE WHEN telefone IS NOT NULL AND btrim(telefone)<>'' THEN 1 ELSE 0 END) DESC,
        id ASC
      ))[1] AS keep_id
    FROM public.clientes
    WHERE cpf_cnpj IS NOT NULL AND btrim(regexp_replace(cpf_cnpj,'\D','','g'))<>''
    GROUP BY btrim(regexp_replace(cpf_cnpj,'\D','','g'))
    HAVING COUNT(*) > 1;

    CREATE TEMP TABLE tmp_cpf_drop2 AS
    SELECT c.id AS drop_id, k.keep_id
    FROM public.clientes c
    JOIN tmp_cpf_keep2 k ON btrim(regexp_replace(c.cpf_cnpj,'\D','','g'))=k.cnpj_norm
    WHERE c.id <> k.keep_id;

    -- Reapontar todas as FKs conhecidas
    UPDATE public.tickets t SET cliente_id=d.keep_id FROM tmp_cpf_drop2 d WHERE t.cliente_id=d.drop_id;
    UPDATE public.cliente_contatos cc SET cliente_id=d.keep_id FROM tmp_cpf_drop2 d WHERE cc.cliente_id=d.drop_id;
    UPDATE public.atendimentos a SET cliente_id=d.keep_id FROM tmp_cpf_drop2 d WHERE a.cliente_id=d.drop_id;
    UPDATE public.oportunidades o SET cliente_id=d.keep_id FROM tmp_cpf_drop2 d WHERE o.cliente_id=d.drop_id;
    UPDATE public.propostas p SET cliente_id=d.keep_id FROM tmp_cpf_drop2 d WHERE p.cliente_id=d.drop_id;
    UPDATE public.surveys s SET cliente_id=d.keep_id FROM tmp_cpf_drop2 d WHERE s.cliente_id=d.drop_id;
    UPDATE public.whatsapp_conversations wc SET cliente_id=d.keep_id FROM tmp_cpf_drop2 d WHERE wc.cliente_id=d.drop_id;
    UPDATE public.whatsapp_broadcast_recipients wbr SET cliente_id=d.keep_id FROM tmp_cpf_drop2 d WHERE wbr.cliente_id=d.drop_id;
    UPDATE public.tasks ta SET cliente_id=d.keep_id FROM tmp_cpf_drop2 d WHERE ta.cliente_id=d.drop_id;
    UPDATE public.triagem_descartes td SET cliente_id=d.keep_id FROM tmp_cpf_drop2 d WHERE td.cliente_id=d.drop_id;

    DELETE FROM public.clientes WHERE id IN (SELECT drop_id FROM tmp_cpf_drop2);
    GET DIAGNOSTICS removed_count = ROW_COUNT;
    RAISE NOTICE '✓ % clientes duplicados por cpf_cnpj removidos', removed_count;

    DROP TABLE tmp_cpf_keep2;
    DROP TABLE tmp_cpf_drop2;
  ELSE
    RAISE NOTICE '- Sem duplicatas por cpf_cnpj (ok)';
  END IF;

  -- =========================================================================
  -- 3) Remover clientes bi_<random> completamente vazios (todas FKs verificadas)
  -- =========================================================================
  -- =========================================================================
  -- 3) Remover clientes bi_<random> sem nenhuma atividade CRM real
  --    (independente de ter CNPJ/email/telefone — serão re-importados
  --     corretamente na próxima sincronização com IdCliente correto)
  -- =========================================================================
  CREATE TEMP TABLE tmp_bi_junk2 AS
  SELECT c.id
  FROM public.clientes c
  WHERE c.codigo_cliente ~ '^bi_[0-9]+_[a-z0-9]+$'
    AND NOT EXISTS (SELECT 1 FROM public.cliente_contatos cc WHERE cc.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.tickets t WHERE t.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.atendimentos a WHERE a.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.oportunidades o WHERE o.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.surveys s WHERE s.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.propostas p WHERE p.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.whatsapp_conversations wc WHERE wc.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.tasks ta WHERE ta.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.whatsapp_broadcast_recipients wbr WHERE wbr.cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.triagem_descartes td WHERE td.cliente_id = c.id);

  IF EXISTS (SELECT 1 FROM tmp_bi_junk2 LIMIT 1) THEN
    DELETE FROM public.clientes WHERE id IN (SELECT id FROM tmp_bi_junk2);
    GET DIAGNOSTICS removed_count = ROW_COUNT;
    RAISE NOTICE '✓ % clientes bi_random sem dados removidos (junk cleanup)', removed_count;
  ELSE
    RAISE NOTICE '- Nenhum cliente bi_random isolado encontrado (ok)';
  END IF;
  DROP TABLE IF EXISTS tmp_bi_junk2;

  -- =========================================================================
  -- 4) Índice em cpf_cnpj para performance de busca (não UNIQUE porque
  --    o BI pode ter variantes do mesmo CNPJ com IdCliente diferente)
  -- =========================================================================
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'clientes_cpf_cnpj_idx'
  ) THEN
    EXECUTE $idx$
      CREATE INDEX clientes_cpf_cnpj_idx
      ON public.clientes (btrim(regexp_replace(cpf_cnpj, '\D', '', 'g')))
      WHERE cpf_cnpj IS NOT NULL
        AND btrim(regexp_replace(cpf_cnpj, '\D', '', 'g')) <> ''
    $idx$;
    RAISE NOTICE '✓ Índice de performance em cpf_cnpj criado';
  ELSE
    RAISE NOTICE '- Índice cpf_cnpj já existe (ok)';
  END IF;

  -- =========================================================================
  -- 5) Garantir UNIQUE em codigo_cliente
  -- =========================================================================
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_codigo_cliente_key') THEN
    ALTER TABLE public.clientes ADD CONSTRAINT clientes_codigo_cliente_key UNIQUE (codigo_cliente);
    RAISE NOTICE '✓ Constraint UNIQUE em codigo_cliente criada';
  ELSE
    RAISE NOTICE '- Constraint codigo_cliente já existe (ok)';
  END IF;

  RAISE NOTICE '=== Migração complementar concluída com sucesso ===';
END $$;

-- Verificações finais (retornam ao SQL Editor para conferência)
SELECT
  (SELECT count(*) FROM public.clientes) AS total_clientes,
  (SELECT count(*) FROM public.clientes WHERE codigo_cliente ~ '^bi_[0-9]+_[a-z0-9]+$') AS bi_random_restantes,
  (SELECT count(*) FROM public.clientes WHERE status = 'ativo') AS clientes_ativos,
  (SELECT count(*) FROM public.clientes WHERE status = 'inativo') AS clientes_inativos,
  (SELECT count(*) FROM (
    SELECT btrim(regexp_replace(cpf_cnpj,'\D','','g')) AS cnpj
    FROM public.clientes
    WHERE cpf_cnpj IS NOT NULL AND btrim(regexp_replace(cpf_cnpj,'\D','','g'))<>''
    GROUP BY 1 HAVING count(*)>1
  ) dup) AS cpf_cnpj_duplas_restantes;
