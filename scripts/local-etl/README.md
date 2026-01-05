# 🔧 Guia de Configuração e Execução do ETL v2.0

## 📋 Pré-requisitos

### 1. Variáveis de Ambiente

Adicione no arquivo `.env` na raiz do projeto:

```env
# SQL Server (ORIGEM - blufleet-dw)
SQL_SERVER=200.219.192.34
SQL_USER=qualidade
SQL_PASSWORD=AWJ5A95cD5fW
SQL_DATABASE=blufleet-dw

# PostgreSQL (DESTINO - BluConecta_Dw)
PG_HOST=localhost
PG_PORT=5432
PG_USER=Quality_etl_user
PG_PASSWORD=F4tu5xy3
PG_DATABASE=BluConecta_Dw

# Supabase (para upload de JSON)
VITE_SUPABASE_URL=https://apqrjkobktjcyrxhqwtm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<obter_no_supabase_dashboard>
```

### 2. Dependências Node.js

```bash
cd scripts/local-etl
npm install
```

Pacotes necessários (já no `package.json`):
- `mssql` - Conexão SQL Server
- `pg` - Conexão PostgreSQL  
- `dotenv` - Variáveis de ambiente
- `@supabase/supabase-js` - Cliente Supabase (opcional para verificações)

### 3. PostgreSQL Local

Certifique-se de que o PostgreSQL está rodando:

```bash
# Windows
sc query postgresql-x64-16

# Testar conexão
psql -h localhost -U Quality_etl_user -d BluConecta_Dw
```

### 4. Obter Service Role Key do Supabase

1. Acesse: https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/settings/api
2. Copie a **service_role key** (secret)
3. Adicione no `.env` como `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **NUNCA commite essa chave no Git!**

---

## 🚀 Executando o ETL

### Opção 1: Node.js Direto

```bash
cd scripts/local-etl
node run-sync-v2.js
```

### Opção 2: PowerShell (Recomendado)

```powershell
cd scripts/local-etl
$env:NODE_ENV="production"
node run-sync-v2.js
```

### Opção 3: Script Automatizado (Criar)

Crie `run-etl.bat`:

```batch
@echo off
cd /d "%~dp0"
echo ========================================
echo    ETL BluConecta DW - Inicializando
echo ========================================
echo.

node run-sync-v2.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo    ETL CONCLUIDO COM SUCESSO!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo    ERRO NO ETL! Verifique os logs
    echo ========================================
)

pause
```

---

## 📊 O que o ETL Faz

### FASE 1: Dimensões (8 tabelas)
- ✅ `dim_clientes` - Cadastro de clientes
- ✅ `dim_condutores` - Condutores/motoristas
- ✅ `dim_fornecedores` - Fornecedores
- ✅ `dim_frota` - Veículos da frota
- ✅ `dim_veiculos_acessorios` - Acessórios instalados
- ✅ `dim_contratos_locacao` - Contratos de locação
- ✅ `dim_itens_contrato` - Itens dos contratos
- ✅ `dim_regras_contrato` - Regras e políticas

### FASE 2: Fatos Anuais (15 arquivos - 3 tipos x 5 anos)
- ✅ `fat_faturamentos` (2022-2026)
- ✅ `fat_detalhe_itens_os` (2022-2026)
- ✅ `fat_ocorrencias_master` (2022-2026)

### FASE 3: Financeiro Universal (60 arquivos - 5 anos x 12 meses)
- ✅ `fat_financeiro_universal_YYYY_MM` (2022-01 até 2026-12)

### FASE 4: Consolidados (10 tabelas)
- ✅ `fat_historico_mobilizacao`
- ✅ `rentabilidade_360_geral`
- ✅ `hist_vida_veiculo_timeline`
- ✅ `fat_churn`
- ✅ `fat_inadimplencia`
- ✅ `agg_dre_mensal`
- ✅ `auditoria_consolidada`
- ✅ `fat_carro_reserva`
- ✅ `fat_manutencao_unificado`
- ✅ `fat_manutencao_completa`

**TOTAL:** ~128 tabelas no PostgreSQL + 128 arquivos JSON no Supabase Storage

---

## 📤 Upload para Supabase Storage

Para cada tabela processada, o ETL:

1. ✅ Extrai dados do SQL Server
2. ✅ Salva no PostgreSQL (BluConecta_Dw)
3. ✅ Faz POST para Edge Function `sync-dw-to-storage`
4. ✅ Edge Function salva JSON no bucket `bi-reports`

### Estrutura dos Arquivos JSON

```json
{
  "generated_at": "2026-01-05T14:30:00.000Z",
  "source": "external_sync",
  "record_count": 1523,
  "data": [
    { "IdVeiculo": 1, "Placa": "ABC-1234", ... },
    { "IdVeiculo": 2, "Placa": "DEF-5678", ... }
  ]
}
```

### Nomenclatura dos Arquivos

- **Dimensões:** `dim_clientes.json`, `dim_frota.json`
- **Consolidados:** `fat_churn.json`, `agg_dre_mensal.json`
- **Anuais:** `fat_faturamentos_2024.json`, `fat_ocorrencias_master_2025.json`
- **Mensais:** `fat_financeiro_universal_2024_03.json`, `fat_financeiro_universal_2025_12.json`

---

## ⏱️ Tempo de Execução Estimado

| Fase | Etapas | Tempo Estimado |
|------|--------|----------------|
| Fase 1 (Dimensões) | 8 tabelas | 2-5 min |
| Fase 2 (Anuais) | 15 arquivos | 5-10 min |
| Fase 3 (Financeiro) | 60 arquivos | 15-25 min |
| Fase 4 (Consolidados) | 10 tabelas | 3-8 min |
| **TOTAL** | **93 etapas** | **25-48 min** |

*Tempos variam conforme volume de dados e latência de rede.*

---

## 🔍 Verificando Resultados

### PostgreSQL

```sql
-- Listar todas as tabelas criadas
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'dim_%' OR tablename LIKE 'fat_%' OR tablename LIKE 'agg_%'
ORDER BY tablename;

-- Verificar contagem de registros
SELECT 'dim_frota' as tabela, COUNT(*) FROM dim_frota
UNION ALL
SELECT 'fat_faturamentos', COUNT(*) FROM fat_faturamentos
UNION ALL
SELECT 'fat_financeiro_universal', COUNT(*) FROM fat_financeiro_universal;
```

### Supabase Storage

1. Acesse: https://supabase.com/dashboard/project/apqrjkobktjcyrxhqwtm/storage/buckets/bi-reports
2. Verifique que existem ~128 arquivos `.json`
3. Baixe um arquivo de exemplo e valide a estrutura

### Frontend (Dashboards)

1. Acesse: http://localhost:5173/analytics
2. Abra qualquer dashboard (ex: `/analytics/executive`)
3. Verifique que os dados carregam sem erros
4. Abra DevTools Console - não deve haver erros

---

## 🐛 Troubleshooting

### Erro: "Connection timeout SQL Server"

**Causa:** Firewall bloqueando porta 3494  
**Solução:**
```bash
# Testar conectividade
telnet 200.219.192.34 3494

# Adicionar regra de firewall (Windows)
New-NetFirewallRule -DisplayName "SQL Server 3494" -Direction Outbound -LocalPort 3494 -Protocol TCP -Action Allow
```

### Erro: "ECONNREFUSED PostgreSQL"

**Causa:** PostgreSQL não está rodando  
**Solução:**
```bash
# Iniciar serviço
sc start postgresql-x64-16

# Verificar status
sc query postgresql-x64-16
```

### Erro: "SUPABASE_SERVICE_ROLE_KEY is not defined"

**Causa:** Variável de ambiente não configurada  
**Solução:**
1. Obter chave no Dashboard do Supabase (Settings > API)
2. Adicionar no `.env`: `SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...`
3. Reiniciar terminal/script

### Erro: "Upload failed: 401 Unauthorized"

**Causa:** Service Role Key inválida ou expirada  
**Solução:**
1. Gerar nova chave no Supabase Dashboard
2. Atualizar `.env`
3. Verificar que está usando `SUPABASE_SERVICE_ROLE_KEY` e não `SUPABASE_ANON_KEY`

### Erro: "Query timeout exceeded"

**Causa:** Query muito pesada (ex: financeiro universal com muitos anos)  
**Solução:**
```javascript
// Aumentar timeout no sqlConfig
const sqlConfig = {
    // ...
    requestTimeout: 1200000, // 20 minutos
};
```

### Erro: "Table already exists"

**Causa:** Tabela não foi dropada antes de recriar  
**Solução:** O script já faz `DROP TABLE IF EXISTS`. Se persistir:
```sql
-- Dropar manualmente
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO Quality_etl_user;
```

---

## 🔄 Agendamento Automático

### Windows Task Scheduler

```powershell
# Criar tarefa agendada (executar diariamente às 02:00)
$action = New-ScheduledTaskAction -Execute 'node' -Argument 'C:\Users\frant\Documents\qualia-task-flow\scripts\local-etl\run-sync-v2.js' -WorkingDirectory 'C:\Users\frant\Documents\qualia-task-flow\scripts\local-etl'
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable
Register-ScheduledTask -TaskName "ETL BluConecta DW" -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM"
```

### Cron (Linux/Mac)

```bash
# Adicionar ao crontab (executar diariamente às 02:00)
0 2 * * * cd /path/to/qualia-task-flow/scripts/local-etl && node run-sync-v2.js >> /var/log/etl-dw.log 2>&1
```

---

## 📧 Notificações (Opcional)

Adicionar ao final de `run-sync-v2.js`:

```javascript
// Enviar email de notificação (usar Nodemailer ou serviço SMTP)
async function sendNotification(success, errorMsg = null) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({ /* config SMTP */ });
    
    await transporter.sendMail({
        from: 'etl@bluconecta.com',
        to: 'equipe@bluconecta.com',
        subject: success ? '✅ ETL Concluído' : '❌ ETL Falhou',
        text: success 
            ? 'ETL executado com sucesso!'
            : `Erro no ETL: ${errorMsg}`
    });
}

// No bloco catch:
sendNotification(false, err.message);

// No final (sucesso):
sendNotification(true);
```

---

## 🎯 Próximos Passos

Após rodar o ETL com sucesso:

1. ✅ Validar arquivos JSON no Supabase Storage
2. ✅ Testar dashboards críticos (Executive, Maintenance)
3. ✅ Comparar dados com sistema antigo (spot-check)
4. ✅ Documentar anomalias encontradas
5. ✅ Treinar equipe para rodar ETL manualmente (se necessário)
6. ✅ Configurar monitoramento de erros (Sentry)

---

**Última Atualização:** 05/01/2026  
**Versão:** 2.0  
**Autor:** Equipe BluConecta
