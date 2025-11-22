-- Agendamento via pg_cron para chamar a Edge Function 'sync-dw-to-storage' a cada 8 horas
-- Este exemplo assume que a extensão 'pg_cron' e a extensão 'http' (postgres-http)
-- estão disponíveis no banco. Caso não haja a extensão 'http', use um job externo
-- (ex: GitHub Actions, Cloud Scheduler) para chamar a URL da Edge Function.

-- Substitua as variáveis [PROJECT_REF] e [SERVICE_ROLE_KEY] abaixo pelos valores do seu projeto.

-- Exemplo de schedule (a cada 8 horas):
SELECT cron.schedule(
  'sync_dw_to_storage_every_8h',
  '0 */8 * * *',
  $$
    -- Chamada HTTP POST para a Edge Function
    SELECT * FROM http_post(
      'https://[PROJECT_REF].functions.supabase.co/sync-dw-to-storage',
      json_build_object('Content-Type','application/json', 'Authorization', 'Bearer [SERVICE_ROLE_KEY]')::text,
      '{"trigger": "cron"}'
    );
  $$
);

-- IMPORTANTE:
-- - Se o banco NÃO tiver a função http_post (postgres-http), essa query falhará.
-- - Alternativa recomendada: usar um scheduler externo (Cloud Scheduler, GitHub Actions,
--   cron em um servidor ou a própria UI/Functions scheduler) para chamar a URL da função.
-- - Nunca deixe a service_role key exposta em código público; armazene-a como segredo.
