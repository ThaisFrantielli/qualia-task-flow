-- Rotina de saneamento contínuo de clientes/contatos
-- Objetivo: reduzir reincidência de redundância operacional

CREATE OR REPLACE FUNCTION public.run_clientes_saneamento()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1) Normaliza codigo_cliente vazio/nulo para formato CLI-XXXXXX
  UPDATE public.clientes
  SET codigo_cliente = 'CLI-' || lpad((abs(('x' || substr(md5(id::text), 1, 8))::bit(32)::int)::bigint % 1000000)::text, 6, '0')
  WHERE coalesce(trim(codigo_cliente), '') = '';

  -- 2) Remove contatos duplicados por cliente + telefone normalizado
  WITH ranked_phone AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY cliente_id, right(regexp_replace(coalesce(telefone_contato, ''), '\\D', '', 'g'), 9)
        ORDER BY id ASC
      ) AS rn
    FROM public.cliente_contatos
    WHERE right(regexp_replace(coalesce(telefone_contato, ''), '\\D', '', 'g'), 9) <> ''
  )
  DELETE FROM public.cliente_contatos cc
  USING ranked_phone r
  WHERE cc.id = r.id
    AND r.rn > 1;

  -- 3) Remove contatos duplicados por cliente + email normalizado
  WITH ranked_email AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY cliente_id, lower(trim(coalesce(email_contato, '')))
        ORDER BY id ASC
      ) AS rn
    FROM public.cliente_contatos
    WHERE lower(trim(coalesce(email_contato, ''))) <> ''
  )
  DELETE FROM public.cliente_contatos cc
  USING ranked_email r
  WHERE cc.id = r.id
    AND r.rn > 1;
END;
$$;

-- Agenda execução diária às 02:30 UTC quando pg_cron estiver habilitado
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'clientes_saneamento_daily'
    ) THEN
      PERFORM cron.schedule(
        'clientes_saneamento_daily',
        '30 2 * * *',
        'SELECT public.run_clientes_saneamento();'
      );
    END IF;
  END IF;
END $$;
