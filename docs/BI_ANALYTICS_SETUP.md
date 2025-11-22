# Bloco BI & Analytics - Static Snapshot ETL

Este documento descreve os passos para habilitar o fluxo "Static Snapshot ETL" descrito:
- Fonte: SQL Server externo
- Processamento: Edge Function roda 3x ao dia (ou conforme agendamento)
- Armazenamento: JSON estático no Supabase Storage (bucket público `bi-reports`)
- Visualização: Frontend baixa JSON direto do Storage

=== Variáveis de ambiente necessárias ===
- `SUPABASE_URL` - URL do projeto Supabase (ex: https://abcd1234.supabase.co)
- `SUPABASE_SERVICE_ROLE_KEY` - chave service_role (MANTER SECRETA) usada pela Edge Function para gravar no Storage
- `SQL_CONNECTION_STRING` - connection string para o SQL Server (ex: "mssql://user:pass@host:1433/database")
- `VITE_SUPABASE_PROJECT_REF` - (frontend) seu project ref para montar a URL pública do arquivo no Storage

=== Passos resumidos ===
1) Executar `supabase/sql/enable_pg_cron.sql` no SQL Editor do Supabase para tentar habilitar `pg_cron`.
2) Executar `supabase/sql/create_bi_bucket_and_policies.sql` para criar o bucket `bi-reports` e políticas.
3) Deploy da Edge Function em `supabase/functions/sync-dw-to-storage`:
   - A função usa `npm:mssql` e `npm:@supabase/supabase-js`.
   - Defina variáveis de ambiente `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SQL_CONNECTION_STRING` no painel de Functions.
   - Deploy: `supabase functions deploy sync-dw-to-storage --project-ref [PROJECT_REF]`

4) Agendamento:
   - Tente executar `supabase/sql/schedule_sync_cron.sql` para criar um job no `pg_cron` que faça um POST para a função a cada 8 horas.
   - Se `http_post` não existir no banco, use um scheduler externo (recomendado):
     - GitHub Actions (workflow que executa a cada 8 horas e faz POST)
     - Cloud Scheduler ou cron em VM com `curl`

5) Frontend:
   - Instale `@tremor/react`: `npm install @tremor/react`
   - Ajuste `VITE_SUPABASE_PROJECT_REF` em `.env` para apontar seu project ref
   - Importar a página `src/pages/Analytics.tsx` na sua rota (ex: `/analytics`)

=== Observações de segurança ===
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Para a chamada agendada, prefira um Scheduler externo que mantenha segredos seguros (GitHub Actions Secrets, Cloud Secret Manager).

=== Exemplo de GitHub Actions (call every 8 hours) ===
```yaml
name: sync-dw-to-storage
on:
  schedule:
    - cron: '0 */8 * * *'
jobs:
  call:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            https://[PROJECT_REF].functions.supabase.co/sync-dw-to-storage -d '{"trigger":"cron"}'
```
