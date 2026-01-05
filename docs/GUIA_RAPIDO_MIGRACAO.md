# ⚡ Guia Rápido: Migração BI para Novo DW

## 🎯 O que foi feito

✅ **Plano de migração completo** criado em `docs/PLANO_MIGRACAO_DW_BI.md`  
✅ **Novo script ETL v2.0** criado em `scripts/local-etl/run-sync-v2.js`  
✅ **Script de verificação** criado em `scripts/local-etl/verify-config.js`  
✅ **Documentação técnica** criada em `scripts/local-etl/README.md`  

## 🚀 Como Executar (Passo a Passo)

### 1️⃣ Configurar Supabase Service Key

```bash
# Acesse o dashboard do Supabase
https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/settings/api

# Copie a "service_role key" (secret)
# Adicione no .env na RAIZ do projeto:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

⚠️ **IMPORTANTE:** Essa chave é secreta e nunca deve ser commitada no Git!

### 2️⃣ Instalar Dependências

```powershell
cd scripts/local-etl
npm install
```

### 3️⃣ Verificar Configuração

```powershell
node verify-config.js
```

**Esperado:** Todas as verificações devem passar ✅

Se houver erro:
- ❌ SQL Server: Verifique firewall e credenciais
- ❌ PostgreSQL: Inicie o serviço `sc start postgresql-x64-16`
- ❌ Supabase: Confirme que a Service Key está correta

### 4️⃣ Executar ETL

```powershell
node run-sync-v2.js
```

**Tempo estimado:** 25-48 minutos  
**Progresso:** Você verá `[X/93 | X.X%]` em cada etapa

### 5️⃣ Verificar Resultados

#### PostgreSQL
```sql
-- Ver todas as tabelas criadas
SELECT tablename, pg_size_pretty(pg_total_relation_size('public.'||tablename))
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'dim_%' OR tablename LIKE 'fat_%' OR tablename LIKE 'agg_%')
ORDER BY tablename;
```

#### Supabase Storage
1. Acesse: https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/storage/buckets/bi-reports
2. Confirme ~128 arquivos `.json`

#### Frontend
1. Acesse: http://localhost:5173/analytics
2. Abra qualquer dashboard
3. Dados devem carregar normalmente

## 📊 Estrutura Gerada

```
PostgreSQL (BluConecta_Dw)
├── dim_clientes (8 colunas)
├── dim_condutores (10 colunas)
├── dim_fornecedores (13 colunas)
├── dim_frota (23 colunas) ⭐ Crítico
├── dim_veiculos_acessorios (3 colunas)
├── dim_contratos_locacao (19 colunas)
├── dim_itens_contrato (6 colunas)
├── dim_regras_contrato (5 colunas)
├── fat_faturamentos (14 colunas) ⭐ Crítico
├── fat_detalhe_itens_os (7 colunas)
├── fat_ocorrencias_master (7 colunas)
├── fat_financeiro_universal (6 colunas) ⭐ Crítico (60 arquivos)
└── [10 tabelas consolidadas]

Supabase Storage (bi-reports)
├── dim_clientes.json
├── dim_frota.json
├── fat_faturamentos_2024.json
├── fat_financeiro_universal_2024_01.json
├── fat_financeiro_universal_2024_02.json
└── ... (total ~128 arquivos)
```

## 🔄 Próximos Passos

### ✅ Imediato (Hoje)
1. Rodar o ETL pela primeira vez
2. Validar que 128 arquivos foram gerados
3. Testar 3-5 dashboards principais

### ✅ Curto Prazo (Esta Semana)
1. Testar TODOS os 21 dashboards
2. Validar dados críticos (spot-check)
3. Documentar anomalias
4. Configurar agendamento diário do ETL

### ✅ Médio Prazo (Próximas Semanas)
1. Monitoramento de erros (Sentry)
2. Alertas de falha no ETL (email/Slack)
3. Dashboard de qualidade de dados
4. Treinamento da equipe

## 🆘 Problemas Comuns

### "Connection timeout SQL Server"
```powershell
# Testar conectividade
Test-NetConnection -ComputerName 200.219.192.34 -Port 3494
```

### "PostgreSQL connection refused"
```powershell
# Iniciar serviço
sc start postgresql-x64-16

# Verificar status
sc query postgresql-x64-16
```

### "Upload failed: 401 Unauthorized"
- Confirme que `SUPABASE_SERVICE_ROLE_KEY` está correto
- Verifique que não está usando `SUPABASE_ANON_KEY` por engano

### "Query timeout exceeded"
- Normal em primeira execução
- Aguarde até 20 minutos para queries financeiras

## 📞 Suporte

Se encontrar problemas:

1. Verifique logs no console do terminal
2. Consulte `scripts/local-etl/README.md` (documentação completa)
3. Revise `docs/PLANO_MIGRACAO_DW_BI.md` (plano completo)
4. Entre em contato com a equipe de desenvolvimento

---

**Última Atualização:** 05/01/2026  
**Versão:** 1.0
