# Fluxo Completo de Atualização: ETL → Analytics

**Data de Criação**: 19 de Janeiro de 2026  
**Versão**: 1.0  
**Status**: ✅ Operacional

---

## 📊 Visão Geral do Pipeline

O sistema utiliza uma arquitetura ETL híbrida que extrai dados de um SQL Server remoto, processa localmente em PostgreSQL, e publica JSONs estáticos no Supabase Storage para consumo pelos 22 dashboards React.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PIPELINE COMPLETO                             │
└──────────────────────────────────────────────────────────────────────┘

   [SQL SERVER]          [NODE.JS ETL]         [POSTGRESQL]       [SUPABASE]         [REACT]
   blufleet-dw     →    run-sync-v2.js    →   BluConecta_Dw  →   Storage      →    Dashboards
       │                      │                     │               │                   │
  (Origem DW)         (Extração +             (Backup +        (JSON          (useBIData Hook)
  200+ tabelas        Transformação)           Cache)          Estáticos)      21 páginas
       │                      │                     │               │                   │
       └──────────────────────┴─────────────────────┴───────────────┴───────────────────┘
                                   25-48 minutos total
```

---

## 🔄 Etapas Detalhadas

### **Etapa 1: Extração (SQL Server → Node.js)**

**Script**: [scripts/local-etl/run-sync-v2.js](../scripts/local-etl/run-sync-v2.js)  
**Duração**: 15-25 minutos  
**Tecnologia**: `mssql` (Node.js driver)

#### Processo:
1. **Conexão ao SQL Server**
   - Host: `200.219.192.34:3494`
   - Database: `blufleet-dw`
   - Autenticação: SQL Server Authentication
   - Timeout: 300 segundos

2. **Execução de Queries**
   - 128 queries SQL parametrizadas
   - Uso de `WITH (NOLOCK)` para evitar bloqueios
   - Uso de `OPTION (MAXDOP 2)` para limitar paralelismo
   - JOINs complexos para relacionar dimensões

3. **Estrutura de Queries**
   ```sql
   -- Exemplo: fat_sinistros
   SELECT 
     os.IdOcorrenciaSinistro,
     os.DataOcorrencia,
     os.ValorSinistro,
     cli.IdCliente,
     cli.Cliente AS NomeCliente,
     v.IdVeiculo,
     v.Placa
   FROM OcorrenciasSinistro os WITH (NOLOCK)
   LEFT JOIN ContratosLocacao cl ON os.IdContrato = cl.IdContrato
   LEFT JOIN ContratosComerciais cc ON cl.IdContratoComercial = cc.IdContratoComercial
   LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente
   LEFT JOIN Veiculos v ON os.IdVeiculo = v.IdVeiculo
   WHERE os.DataOcorrencia >= '2022-01-01'
   OPTION (MAXDOP 2)
   ```

#### Dados Extraídos:
| Tipo | Quantidade | Registros Totais |
|------|-----------|------------------|
| Dimensões | 8 tabelas | 188.159 |
| Fatos Anuais | 25 tabelas (5 anos) | 579.535 |
| Financeiro Universal | 60 meses | 414.658 |
| Consolidados | 10 tabelas | 759.052 |
| **TOTAL** | **103 arquivos** | **1.941.404 registros** |

---

### **Etapa 2: Transformação (Node.js)**

**Duração**: Inline (durante extração)  
**Tecnologia**: JavaScript

#### Processos:
1. **Normalização de Tipos**
   ```javascript
   // Conversão de decimals SQL Server → Number
   valor_km_adicional: parseFloat(row.ValorKmAdicional) || 0
   
   // Conversão de datas
   data_ocorrencia: row.DataOcorrencia ? 
     new Date(row.DataOcorrencia).toISOString() : null
   
   // Snake_case para campos
   id_veiculo: row.IdVeiculo
   ```

2. **Agregações e Cálculos**
   - TCO (Total Cost of Ownership)
   - Margens de rentabilidade
   - KPIs consolidados (churn rate, utilização de frota)

3. **Chunking Automático**
   ```javascript
   // Divisão de arquivos grandes (>10.000 rows)
   if (data.length > 10000) {
     const chunkSize = 10000;
     const chunks = Math.ceil(data.length / chunkSize);
     
     for (let i = 0; i < chunks; i++) {
       const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
       await uploadChunk(fileName, i + 1, chunk, chunks);
     }
     
     // Gera manifest.json para o frontend
     await generateManifest(fileName, chunks);
   }
   ```

4. **Metadados Enriquecidos**
   ```json
   {
     "generated_at": "2026-01-19T14:30:00.000Z",
     "dw_last_update": "2026-01-19T12:00:00.000Z",
     "source": "external_sync",
     "table": "dim_frota",
     "record_count": 5780,
     "etl_version": "2.0",
     "execution_time_ms": 45234,
     "data": [...]
   }
   ```

---

### **Etapa 3: Gravação no PostgreSQL (Opcional)**

**Duração**: 5-10 minutos  
**Tecnologia**: `pg` (Node.js driver)  
**Status**: ⚠️ Opcional (pode ser desabilitado com flag `--json-only`)

#### Processo:
1. **Truncate + Insert**
   ```sql
   -- Limpa tabela existente
   TRUNCATE TABLE bluconecta_dw.public.dim_frota CASCADE;
   
   -- Insere novos dados
   INSERT INTO bluconecta_dw.public.dim_frota 
   (id_veiculo, placa, modelo, ano, valor_fipe, ...)
   VALUES ($1, $2, $3, $4, $5, ...);
   ```

2. **Finalidade**
   - Backup local dos dados
   - Queries ad-hoc via pgAdmin
   - Suporte a foreign data wrappers (FDW)
   - Não é usado diretamente pelos dashboards

#### Configuração:
```env
PG_HOST=localhost
PG_PORT=5432
PG_USER=Quality_etl_user
PG_PASSWORD=F4tu5xy3
PG_DATABASE=BluConecta_Dw
```

---

### **Etapa 4: Upload para Supabase Storage**

**Duração**: 10-15 minutos  
**Tecnologia**: Supabase Edge Function  
**Endpoint**: `/functions/v1/sync-dw-to-storage`

#### Processo:
1. **Requisição POST**
   ```javascript
   const response = await fetch(
     'https://apqrjkobktjcyrxhqwtm.supabase.co/functions/v1/sync-dw-to-storage',
     {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
       },
       body: JSON.stringify({
         fileName: 'dim_frota.json',
         data: { generated_at, record_count, data: [...] },
         metadata: { contentType: 'application/json' }
       })
     }
   );
   ```

2. **Edge Function** ([supabase/functions/sync-dw-to-storage/index.ts](../supabase/functions/sync-dw-to-storage/index.ts))
   ```typescript
   // Recebe JSON via POST
   const { fileName, data, metadata } = await req.json();
   
   // Salva no bucket bi-reports
   const { error } = await supabase.storage
     .from('bi-reports')
     .upload(fileName, JSON.stringify(data), {
       contentType: 'application/json',
       upsert: true,
       metadata
     });
   ```

3. **Estrutura do Bucket**
   ```
   bi-reports/
   ├── dim_clientes.json
   ├── dim_frota.json
   ├── fat_faturamentos_2022.json
   ├── fat_faturamentos_2023.json
   ├── fat_faturamentos_2024.json
   ├── fat_faturamentos_2025.json
   ├── fat_faturamentos_2026.json
   ├── fat_sinistros_2022.json
   ├── fat_sinistros_2023.json
   ├── fat_multas_2022.json
   ├── fat_multas_2023.json
   ├── fat_financeiro_universal_2022_01.json
   ├── fat_financeiro_universal_2022_02.json
   ├── ...
   ├── fat_manutencao_unificado_part_1.json
   ├── fat_manutencao_unificado_part_2.json
   ├── ...
   ├── fat_manutencao_unificado_manifest.json
   └── (128 arquivos totais)
   ```

4. **Permissões**
   - Bucket: `bi-reports` (público para leitura)
   - RLS: Desabilitado para leitura anônima
   - CORS: Habilitado para domínio Vercel

---

### **Etapa 5: Consumo pelos Dashboards**

**Hook Principal**: [src/hooks/useBIData.ts](../src/hooks/useBIData.ts)  
**Tecnologia**: React + SWR (stale-while-revalidate)  
**Cache**: 5 minutos

#### Processo:

1. **Requisição do Dashboard**
   ```typescript
   // Em FleetDashboard.tsx
   const { data: frota, isLoading, error } = useBIData<DimFrota[]>('dim_frota.json');
   const { data: faturamentos } = useBIData('fat_faturamentos_*.json'); // Sharding
   ```

2. **Lógica do Hook**
   ```typescript
   export function useBIData<T>(fileName: string) {
     const fetcher = async (url: string) => {
       // 1. Verifica cache em memória (5 min)
       const cached = memoryCache.get(url);
       if (cached && Date.now() - cached.timestamp < 300000) {
         return cached.data;
       }
       
       // 2. Detecta sharding (* ou *_*)
       if (fileName.includes('*')) {
         return await fetchShardedFile(fileName);
       }
       
       // 3. Detecta chunking (manifest.json)
       const manifestUrl = url.replace('.json', '_manifest.json');
       const manifestRes = await fetch(manifestUrl);
       
       if (manifestRes.ok) {
         const manifest = await manifestRes.json();
         return await fetchChunkedFile(fileName, manifest);
       }
       
       // 4. Fetch simples
       const response = await fetch(url);
       if (!response.ok) throw new Error(`HTTP ${response.status}`);
       
       const json = await response.json();
       memoryCache.set(url, { data: json.data, timestamp: Date.now() });
       
       return json.data;
     };
     
     return useSWR<T>(
       `${SUPABASE_URL}/storage/v1/object/public/bi-reports/${fileName}`,
       fetcher,
       { revalidateOnFocus: false, dedupingInterval: 300000 }
     );
   }
   ```

3. **Sharding Automático**
   ```typescript
   // fat_faturamentos_*.json → busca 2022, 2023, 2024, 2025, 2026
   async function fetchShardedFile(pattern: string) {
     const years = [2022, 2023, 2024, 2025, 2026];
     const files = years.map(year => pattern.replace('*', year.toString()));
     
     const responses = await Promise.all(
       files.map(file => fetch(`${baseUrl}/${file}`))
     );
     
     const allData = [];
     for (const res of responses) {
       if (res.ok) {
         const json = await res.json();
         allData.push(...json.data);
       }
     }
     
     return allData;
   }
   ```

4. **Chunking Automático**
   ```typescript
   // fat_manutencao_unificado.json → lê manifest e combina 11 partes
   async function fetchChunkedFile(fileName: string, manifest: Manifest) {
     const { totalChunks } = manifest;
     const baseName = fileName.replace('.json', '');
     
     const chunks = await Promise.all(
       Array.from({ length: totalChunks }, (_, i) =>
         fetch(`${baseUrl}/${baseName}_part_${i + 1}.json`)
           .then(res => res.json())
           .then(json => json.data)
       )
     );
     
     return chunks.flat();
   }
   ```

#### Exemplo de Uso no Dashboard:
```typescript
// FleetDashboard.tsx
import { useBIData } from '@/hooks/useBIData';

export default function FleetDashboard() {
  const { data: frota, isLoading } = useBIData<DimFrota[]>('dim_frota.json');
  const { data: sinistros } = useBIData<FatSinistros[]>('fat_sinistros_*.json');
  const { data: multas } = useBIData<FatMultas[]>('fat_multas_*.json');
  
  if (isLoading) return <Skeleton />;
  
  const veiculosAtivos = frota?.filter(v => v.situacao === 'Ativo').length;
  const custoSinistros = sinistros?.reduce((sum, s) => sum + s.valor_sinistro, 0);
  
  return (
    <div>
      <KPICard title="Veículos Ativos" value={veiculosAtivos} />
      <KPICard title="Custo Sinistros" value={formatCurrency(custoSinistros)} />
      <BarChart data={frota} />
    </div>
  );
}
```

---

## ⏱️ Frequência de Atualização

### **Método 1: GitHub Actions (Atual)** ⚠️

**Arquivo**: [.github/workflows/db-sync.yml](../.github/workflows/db-sync.yml)  
**Status**: Parcialmente ativo (modo `--json-only`)  
**Frequência**: 3x por dia

```yaml
on:
  schedule:
    - cron: '30 13 * * *'  # 13:30 UTC = 10:30 BRT
    - cron: '30 18 * * *'  # 18:30 UTC = 15:30 BRT
    - cron: '30 3 * * *'   # 03:30 UTC = 00:30 BRT
  workflow_dispatch:       # Manual via GitHub UI
```

**Limitação**: GitHub runner não consegue conectar ao SQL Server local (200.219.192.34). Só faz upload de JSONs já gerados, não executa ETL completo.

---

### **Método 2: Execução Local Manual (Recomendado)** ✅

**Comando**:
```bash
cd scripts/local-etl
node run-sync-v2.js
```

**Vantagens**:
- ✅ Execução completa (SQL Server + PostgreSQL + Supabase)
- ✅ Acesso direto ao SQL Server
- ✅ Logs detalhados
- ✅ Controle total sobre o processo

**Desvantagens**:
- ⚠️ Requer intervenção manual
- ⚠️ Dependente de máquina local estar ligada
- ⚠️ Sem alertas automáticos de falha

---

### **Método 3: Windows Task Scheduler (Planejado)** 🚧

**PowerShell Script**:
```powershell
# Criar tarefa agendada para rodar diariamente às 02:00
$action = New-ScheduledTaskAction `
  -Execute 'node' `
  -Argument 'C:\Users\frant\Documents\qualia-task-flow\scripts\local-etl\run-sync-v2.js' `
  -WorkingDirectory 'C:\Users\frant\Documents\qualia-task-flow\scripts\local-etl'

$trigger = New-ScheduledTaskTrigger -Daily -At 2am

$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -RunOnlyIfNetworkAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
  -TaskName "ETL BluConecta DW" `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -User "SYSTEM" `
  -Description "Sincronização diária de dados DW → Supabase"
```

**Vantagens**:
- ✅ Automático
- ✅ Não requer intervenção
- ✅ Logs nativos do Windows

**Desvantagens**:
- ⚠️ Requer máquina sempre ligada
- ⚠️ Sem redundância (se máquina falhar, ETL não roda)

---

### **Método 4: Cron Job (Linux/Docker)** 🚧

```bash
# Adicionar ao crontab
0 2 * * * cd /app/scripts/local-etl && /usr/bin/node run-sync-v2.js >> /var/log/etl.log 2>&1
```

**Vantagens**:
- ✅ Robusto
- ✅ Integração com Docker
- ✅ Redundância (pode rodar em servidor dedicado)

**Status**: Planejado para fase 2 (migração para servidor dedicado)

---

## 📋 Checklist de Execução Manual

### **Pré-requisitos**
- [ ] SQL Server acessível (`200.219.192.34:3494`)
- [ ] PostgreSQL rodando (`localhost:5432`)
- [ ] Variáveis de ambiente configuradas (`.env`)
- [ ] Node.js instalado (`v18+`)
- [ ] Dependências instaladas (`npm install`)

### **Verificação Antes de Executar**
```bash
# 1. Validar configuração
node verify-config.js

# Saída esperada:
# ✅ SQL Server: Conectado
# ✅ PostgreSQL: Conectado
# ✅ Supabase: Conectado
# ✅ Variáveis de ambiente: OK
```

### **Execução**
```bash
# 2. Executar ETL completo
node run-sync-v2.js

# Saída esperada (simplified):
# [11:45:33] Iniciando sincronização...
# [11:45:35] ✅ dim_clientes (1.577 registros)
# [11:45:37] ✅ dim_frota (5.780 registros)
# ...
# [11:47:08] ✅ fat_manutencao_unificado_part_11.json
# [11:47:10] 🎉 Concluído: 103/103 tabelas (100%)
```

### **Verificação Pós-Execução**
```bash
# 3. Verificar arquivos no Supabase Storage
# Acessar: https://apqrjkobktjcyrxhqwtm.supabase.co/storage/v1/object/public/bi-reports/

# 4. Testar dashboard
# Acessar: http://localhost:5173/analytics/fleet
# Verificar se dados carregam sem erro
```

---

## 🚨 Monitoramento e Alertas

### **Status Atual** ⚠️
- ❌ Sem sistema de alertas automático
- ❌ Sem dashboard de monitoramento do ETL
- ❌ Sem métricas de SLA (tempo de execução, taxa de sucesso)
- ✅ Logs manuais via console

### **Plano de Melhoria** 🚧

#### **Fase 1: Logging Estruturado**
```javascript
// Adicionar ao run-sync-v2.js
const winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.File({ filename: 'etl-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'etl-combined.log' })
  ]
});

logger.info('ETL iniciado', { timestamp: new Date(), tablesCount: 103 });
logger.error('Falha em fat_sinistros', { error: err.message, stack: err.stack });
```

#### **Fase 2: Webhooks de Notificação**
```javascript
// Notificar via Slack/Discord/Email ao final
async function notifyCompletion(stats) {
  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `ETL Concluído: ${stats.success}/${stats.total} tabelas em ${stats.duration}`,
      attachments: [
        {
          color: stats.success === stats.total ? 'good' : 'warning',
          fields: [
            { title: 'Registros Processados', value: stats.recordCount, short: true },
            { title: 'Tempo de Execução', value: `${stats.duration}min`, short: true }
          ]
        }
      ]
    })
  });
}
```

#### **Fase 3: Dashboard de Saúde**
- Criar página `/analytics/etl-health`
- Exibir:
  - Última execução (timestamp)
  - Status de cada tabela (✅/⚠️/❌)
  - Histórico de execuções (últimos 30 dias)
  - Tempo médio de processamento por tabela
  - Alertas de anomalias (ex: queda >50% no record_count)

---

## 🔧 Troubleshooting

### **Problema 1: SQL Server Connection Timeout**
```
Error: Connection timeout
```

**Solução**:
```javascript
// Aumentar timeout em run-sync-v2.js
const config = {
  server: process.env.SQL_SERVER,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 60000,  // Aumentar de 30s para 60s
    requestTimeout: 300000  // 5 minutos
  }
};
```

---

### **Problema 2: Supabase Upload Failed (413 Payload Too Large)**
```
Error: Request entity too large
```

**Solução**: Chunking já implementado automaticamente para arquivos >10K rows. Verificar se manifest está sendo gerado corretamente.

---

### **Problema 3: Frontend Showing Stale Data**
```
Dashboard mostra dados antigos mesmo após ETL
```

**Solução**:
```typescript
// Limpar cache do useBIData manualmente
import { mutate } from 'swr';

// No componente:
const refreshData = () => {
  mutate(key => typeof key === 'string' && key.includes('bi-reports'), undefined, { revalidate: true });
};
```

---

## 📊 Métricas de Performance

### **Última Execução (05/01/2026)**
| Etapa | Duração | Observações |
|-------|---------|-------------|
| Extração (SQL Server) | 15min 23s | 103 queries, 1.9M registros |
| Transformação | Inline | 0s adicional (processamento durante extração) |
| Gravação PostgreSQL | 8min 12s | TRUNCATE + INSERT de 103 tabelas |
| Upload Supabase | 12min 35s | 128 arquivos (incluindo chunks) |
| **TOTAL** | **36min 10s** | ✅ Dentro do esperado (25-48min) |

### **Tamanho dos Dados**
| Categoria | Arquivos | Tamanho Total | Maior Arquivo |
|-----------|----------|---------------|---------------|
| Dimensões | 8 | 42 MB | dim_veiculos_acessorios (15 MB) |
| Fatos Anuais | 25 | 128 MB | fat_detalhe_itens_os (52 MB) |
| Financeiro | 60 | 186 MB | fat_financeiro_universal_2024_12 (8 MB) |
| Consolidados | 10 | 234 MB | fat_manutencao_unificado (98 MB) |
| **TOTAL** | **103** | **590 MB** | fat_manutencao_unificado_part_1 (12 MB) |

---

## 🎯 Roadmap de Melhorias

### **Q1 2026** (Curto Prazo)
- [ ] Implementar Windows Task Scheduler
- [ ] Adicionar webhooks de notificação (Slack)
- [ ] Criar dashboard de monitoramento ETL
- [ ] Documentar estrutura esperada de cada JSON

### **Q2 2026** (Médio Prazo)
- [ ] Migrar para servidor dedicado (Linux)
- [ ] Implementar retry automático em caso de falha
- [ ] Adicionar validação de anomalias pós-ETL
- [ ] Criar testes automatizados de integridade

### **Q3 2026** (Longo Prazo)
- [ ] Avaliar migração de JSONs para queries diretas no Supabase Database
- [ ] Implementar incremental ETL (delta sync)
- [ ] Adicionar compressão gzip nos uploads
- [ ] Criar pipeline de CI/CD para deploy automático

---

## 📚 Referências

- [GUIA_RAPIDO_MIGRACAO.md](./GUIA_RAPIDO_MIGRACAO.md) - Guia de início rápido
- [ETL_EXECUTION_REPORT_2026-01-05.md](./ETL_EXECUTION_REPORT_2026-01-05.md) - Relatório de execução detalhado
- [MAPEAMENTO_DASHBOARDS_ETL.md](./MAPEAMENTO_DASHBOARDS_ETL.md) - Mapeamento tabelas → dashboards
- [scripts/local-etl/README.md](../scripts/local-etl/README.md) - Documentação técnica do ETL
- [ANALYTICS_ARCHITECTURE.md](./ANALYTICS_ARCHITECTURE.md) - Arquitetura geral do módulo Analytics

---

**Última Atualização**: 19 de Janeiro de 2026  
**Responsável**: Equipe BluConecta DW  
**Status**: ✅ Documentação Completa
