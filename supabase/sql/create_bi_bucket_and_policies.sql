-- Cria o bucket público 'bi-reports' e políticas de acesso
-- Execute no SQL Editor do Supabase (schema public)

-- 1) Cria bucket público
SELECT storage.create_bucket('bi-reports', true);

-- 2) Políticas de Storage (objetos)
-- Permite que apenas a role 'service_role' escreva (INSERT/UPDATE/DELETE)
-- e que qualquer um leia (SELECT) objetos do bucket 'bi-reports'.

-- Policy: service_role pode escrever apenas no bucket 'bi-reports'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'bi_reports_service_role_write'
  ) THEN
    EXECUTE $$
      CREATE POLICY bi_reports_service_role_write
      ON storage.objects
      FOR INSERT, UPDATE, DELETE
      USING (auth.role() = 'service_role' AND bucket_id = 'bi-reports');
    $$;
  END IF;
END$$;

-- Policy: leitura pública do bucket 'bi-reports'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE polname = 'bi_reports_public_read'
  ) THEN
    EXECUTE $$
      CREATE POLICY bi_reports_public_read
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'bi-reports');
    $$;
  END IF;
END$$;

-- Observações de segurança:
-- - A policy de escrita usa auth.role() = 'service_role' para restringir.
--   Em muitos fluxos, operações escritas são feitas via supabase service_role key
--   (do backend/Edge Function). Não exponha essa chave no frontend.
