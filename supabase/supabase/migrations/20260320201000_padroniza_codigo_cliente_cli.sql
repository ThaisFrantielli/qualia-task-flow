-- Padroniza codigo_cliente para formato CLI-* sem quebrar unicidade existente
-- Regras:
-- 1) Somente digitos -> CLI-000000
-- 2) CLI + digitos (qualquer separador) -> CLI-000000
-- 3) Outros valores -> CLI-<slug>
-- 4) Se a versao normalizada conflitar com outro registro, mantem valor original

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'clientes'
  ) THEN
    RETURN;
  END IF;

  CREATE TEMP TABLE tmp_codigo_norm AS
  SELECT
    c.id,
    c.codigo_cliente AS old_code,
    CASE
      WHEN c.codigo_cliente ~ '^\s*\d+\s*$' THEN
        'CLI-' || lpad(regexp_replace(c.codigo_cliente, '\\D', '', 'g'), 6, '0')
      WHEN upper(c.codigo_cliente) ~ '^\s*CLI[-_ ]*\d+\s*$' THEN
        'CLI-' || lpad(regexp_replace(upper(c.codigo_cliente), '[^0-9]', '', 'g'), 6, '0')
      ELSE
        'CLI-' || regexp_replace(
          regexp_replace(upper(trim(c.codigo_cliente)), '^CLI[-_ ]*', ''),
          '[^A-Z0-9]+', '-', 'g'
        )
    END AS new_code
  FROM public.clientes c
  WHERE coalesce(trim(c.codigo_cliente), '') <> '';

  UPDATE tmp_codigo_norm
  SET new_code = regexp_replace(regexp_replace(new_code, '-+', '-', 'g'), '^-|-$', '', 'g');

  UPDATE tmp_codigo_norm
  SET new_code =
    CASE
      WHEN new_code = 'CLI' THEN old_code
      WHEN new_code NOT LIKE 'CLI-%' THEN 'CLI-' || new_code
      ELSE new_code
    END;

  UPDATE public.clientes c
  SET codigo_cliente = t.new_code
  FROM tmp_codigo_norm t
  WHERE c.id = t.id
    AND t.new_code IS NOT NULL
    AND t.new_code <> ''
    AND c.codigo_cliente <> t.new_code
    AND NOT EXISTS (
      SELECT 1
      FROM public.clientes c2
      WHERE c2.codigo_cliente = t.new_code
        AND c2.id <> c.id
    );
END $$;
