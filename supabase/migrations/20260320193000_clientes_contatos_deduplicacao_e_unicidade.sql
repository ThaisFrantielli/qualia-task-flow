-- Mitigacao de redundancia em clientes/contatos
-- 1) Deduplica clientes por CPF/CNPJ normalizado
-- 2) Deduplica contatos por cliente (telefone/email)
-- 3) Cria indices unicos parciais para prevenir reincidencia

DO $$
BEGIN
  -- Safety: aborta silenciosamente se a tabela principal nao existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clientes'
  ) THEN
    RETURN;
  END IF;

  -- A) Deduplicacao de clientes por documento
  CREATE TEMP TABLE tmp_clientes_doc_dupes AS
  WITH ranked AS (
    SELECT
      c.id,
      regexp_replace(coalesce(c.cpf_cnpj, ''), '\\D', '', 'g') AS doc_key,
      row_number() OVER (
        PARTITION BY regexp_replace(coalesce(c.cpf_cnpj, ''), '\\D', '', 'g')
        ORDER BY
          (
            (CASE WHEN c.nome_fantasia IS NOT NULL AND btrim(c.nome_fantasia) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN c.razao_social IS NOT NULL AND btrim(c.razao_social) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN c.email IS NOT NULL AND btrim(c.email) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN c.telefone IS NOT NULL AND btrim(c.telefone) <> '' THEN 1 ELSE 0 END) +
            (CASE WHEN c.whatsapp_number IS NOT NULL AND btrim(c.whatsapp_number) <> '' THEN 1 ELSE 0 END)
          ) DESC,
          c.id ASC
      ) AS rn
    FROM public.clientes c
    WHERE regexp_replace(coalesce(c.cpf_cnpj, ''), '\\D', '', 'g') <> ''
  ), keeps AS (
    SELECT doc_key, id AS keep_id
    FROM ranked
    WHERE rn = 1
  )
  SELECT r.id AS drop_id, k.keep_id
  FROM ranked r
  JOIN keeps k ON k.doc_key = r.doc_key
  WHERE r.rn > 1;

  -- Reaponta FKs conhecidas para cliente principal
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cliente_contatos' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.cliente_contatos cc SET cliente_id = m.keep_id FROM tmp_clientes_doc_dupes m WHERE cc.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tickets' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.tickets t SET cliente_id = m.keep_id FROM tmp_clientes_doc_dupes m WHERE t.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='atendimentos' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.atendimentos a SET cliente_id = m.keep_id FROM tmp_clientes_doc_dupes m WHERE a.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='oportunidades' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.oportunidades o SET cliente_id = m.keep_id FROM tmp_clientes_doc_dupes m WHERE o.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='propostas' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.propostas p SET cliente_id = m.keep_id FROM tmp_clientes_doc_dupes m WHERE p.cliente_id = m.drop_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='surveys' AND column_name='cliente_id') THEN
    EXECUTE 'UPDATE public.surveys s SET cliente_id = m.keep_id FROM tmp_clientes_doc_dupes m WHERE s.cliente_id = m.drop_id';
  END IF;

  -- Remove clientes duplicados por documento
  DELETE FROM public.clientes c
  USING tmp_clientes_doc_dupes m
  WHERE c.id = m.drop_id;

  -- B) Deduplicacao de contatos por cliente + telefone normalizado
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cliente_contatos'
  ) THEN
    CREATE TEMP TABLE tmp_contatos_drop AS
    WITH ranked_phone AS (
      SELECT
        cc.id,
        row_number() OVER (
          PARTITION BY cc.cliente_id, right(regexp_replace(coalesce(cc.telefone_contato, ''), '\\D', '', 'g'), 9)
          ORDER BY cc.id ASC
        ) AS rn
      FROM public.cliente_contatos cc
      WHERE right(regexp_replace(coalesce(cc.telefone_contato, ''), '\\D', '', 'g'), 9) <> ''
    )
    SELECT id FROM ranked_phone WHERE rn > 1;

    DELETE FROM public.cliente_contatos cc
    USING tmp_contatos_drop d
    WHERE cc.id = d.id;

    CREATE TEMP TABLE tmp_contatos_drop_email AS
    WITH ranked_email AS (
      SELECT
        cc.id,
        row_number() OVER (
          PARTITION BY cc.cliente_id, lower(trim(coalesce(cc.email_contato, '')))
          ORDER BY cc.id ASC
        ) AS rn
      FROM public.cliente_contatos cc
      WHERE lower(trim(coalesce(cc.email_contato, ''))) <> ''
    )
    SELECT id FROM ranked_email WHERE rn > 1;

    DELETE FROM public.cliente_contatos cc
    USING tmp_contatos_drop_email d
    WHERE cc.id = d.id;
  END IF;

  -- C) Travas de unicidade
  CREATE UNIQUE INDEX IF NOT EXISTS ux_clientes_cpf_cnpj_normalized
    ON public.clientes ((regexp_replace(coalesce(cpf_cnpj, ''), '\\D', '', 'g')))
    WHERE regexp_replace(coalesce(cpf_cnpj, ''), '\\D', '', 'g') <> '';

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cliente_contatos'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_contatos_cliente_phone_norm
      ON public.cliente_contatos (cliente_id, right(regexp_replace(coalesce(telefone_contato, ''), '\\D', '', 'g'), 9))
      WHERE right(regexp_replace(coalesce(telefone_contato, ''), '\\D', '', 'g'), 9) <> '';

    CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_contatos_cliente_email_norm
      ON public.cliente_contatos (cliente_id, lower(trim(coalesce(email_contato, ''))))
      WHERE lower(trim(coalesce(email_contato, ''))) <> '';
  END IF;
END $$;
