-- Deduplicação de clientes (por codigo_cliente) e trava para evitar novas duplicidades
--
-- O app depende de `clientes` como entidade central; duplicidades geram inconsistências em tickets,
-- contatos, atendimentos, conversas WhatsApp, etc.
--
-- Estratégia:
-- 1) Para cada `codigo_cliente` com duplicidade, escolhe 1 registro "principal" (heurística por campos preenchidos)
-- 2) Reaponta FKs nas tabelas conhecidas para o registro principal
-- 3) Remove os duplicados
-- 4) Cria constraint UNIQUE para evitar reincidência

DO $$
DECLARE
  has_dupes boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clientes'
  ) THEN
    RETURN;
  END IF;

  -- 0) Criar backup automático dos registros duplicados (idempotente)
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clientes_backup'
  ) THEN
    CREATE TABLE public.clientes_backup AS TABLE public.clientes WITH NO DATA;
    ALTER TABLE public.clientes_backup ADD COLUMN backup_at timestamptz;
  END IF;

  -- Inserir os registros duplicados no backup (somente novos)
  INSERT INTO public.clientes_backup
  SELECT c.*, now() as backup_at
  FROM public.clientes c
  WHERE c.codigo_cliente IN (
    SELECT codigo_cliente FROM public.clientes GROUP BY codigo_cliente HAVING COUNT(*) > 1
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.clientes_backup b WHERE b.id = c.id
  );

  SELECT EXISTS (
    SELECT 1
    FROM public.clientes
    GROUP BY codigo_cliente
    HAVING COUNT(*) > 1
  ) INTO has_dupes;

  IF NOT has_dupes THEN
    -- Ainda cria a constraint se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clientes_codigo_cliente_key') THEN
      ALTER TABLE public.clientes ADD CONSTRAINT clientes_codigo_cliente_key UNIQUE (codigo_cliente);
    END IF;
    RETURN;
  END IF;

  -- 1) Escolher registro principal por nome_fantasia normalizado (mais campos preenchidos ganha; desempate por id)
  CREATE TEMP TABLE tmp_cliente_keep AS
  SELECT
    lower(trim(coalesce(nome_fantasia, ''))) AS key,
    (
      ARRAY_AGG(
        id
        ORDER BY
          (
            (CASE WHEN nome_fantasia IS NOT NULL AND btrim(nome_fantasia) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN razao_social IS NOT NULL AND btrim(razao_social) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN cpf_cnpj IS NOT NULL AND btrim(cpf_cnpj) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN email IS NOT NULL AND btrim(email) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN telefone IS NOT NULL AND btrim(telefone) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN whatsapp_number IS NOT NULL AND btrim(whatsapp_number) <> '' THEN 1 ELSE 0 END)
          ) DESC,
          id ASC
      )
    )[1] AS keep_id
  FROM public.clientes
  GROUP BY lower(trim(coalesce(nome_fantasia, '')))
  HAVING COUNT(*) > 1;

  CREATE TEMP TABLE tmp_cliente_merge AS
  SELECT c.id AS drop_id, k.keep_id, c.codigo_cliente, k.key
  FROM public.clientes c
  JOIN tmp_cliente_keep k ON lower(trim(coalesce(c.nome_fantasia, ''))) = k.key
  WHERE c.id <> k.keep_id;

  -- 2) Reapontar FKs (só executa se a tabela/coluna existir)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.tickets t SET cliente_id = m.keep_id FROM tmp_cliente_merge m WHERE t.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cliente_contatos' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.cliente_contatos cc SET cliente_id = m.keep_id FROM tmp_cliente_merge m WHERE cc.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='atendimentos' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.atendimentos a SET cliente_id = m.keep_id FROM tmp_cliente_merge m WHERE a.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='triagem_descartes' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.triagem_descartes td SET cliente_id = m.keep_id FROM tmp_cliente_merge m WHERE td.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='oportunidades' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.oportunidades o SET cliente_id = m.keep_id FROM tmp_cliente_merge m WHERE o.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propostas' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.propostas p SET cliente_id = m.keep_id FROM tmp_cliente_merge m WHERE p.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='surveys' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.surveys s SET cliente_id = m.keep_id FROM tmp_cliente_merge m WHERE s.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.tasks ta SET cliente_id = m.keep_id FROM tmp_cliente_merge m WHERE ta.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='whatsapp_broadcast_recipients' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.whatsapp_broadcast_recipients wbr SET cliente_id = m.keep_id FROM tmp_cliente_merge m WHERE wbr.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='whatsapp_conversations' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.whatsapp_conversations wc SET cliente_id = m.keep_id FROM tmp_cliente_merge m WHERE wc.cliente_id = m.drop_id';
  END IF;

  -- 3) Remover duplicados
  EXECUTE 'DELETE FROM public.clientes c USING tmp_cliente_merge m WHERE c.id = m.drop_id';

  -- 4) Trava para evitar novas duplicidades por nome_fantasia normalizado
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'clientes_nome_fantasia_key') THEN
    EXECUTE 'CREATE UNIQUE INDEX clientes_nome_fantasia_key ON public.clientes (lower(trim(coalesce(nome_fantasia, ''''))))';
  END IF;
END $$;
