# 📋 PLANO DE MIGRAÇÃO: Sistema BI para Novo Data Warehouse

**Data de Criação:** 05/01/2026  
**Responsável:** Equipe de Desenvolvimento  
**Status:** 🟡 Em Planejamento  
**Prazo Estimado:** 3-5 semanas  

---

## 🎯 OBJETIVO DA MIGRAÇÃO

Migrar o sistema de Business Intelligence (21 dashboards) para utilizar o novo Data Warehouse **BluConecta_Dw** (PostgreSQL local), substituindo a arquitetura atual que consome dados do SQL Server remoto (blufleet-dw).

### Motivação
- ✅ Centralizar dados em PostgreSQL para melhor performance
- ✅ Reduzir dependência de servidor SQL Server remoto
- ✅ Facilitar manutenção e evolução do sistema
- ✅ Manter compatibilidade com arquitetura atual (JSON no Supabase Storage)

---

## 🏗️ ARQUITETURA

### **ARQUITETURA ATUAL**
```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│  SQL Server     │───ETL──>│  Supabase Edge   │───────>│ Supabase Storage│
│  blufleet-dw    │        │  Function        │        │  (bi-reports)   │
│  (Remoto)       │        │                  │        │  128 JSONs      │
└─────────────────┘        └──────────────────┘        └─────────────────┘
                                                                │
                                                                │ HTTP
                                                                ▼
                                                        ┌─────────────────┐
                                                        │  Frontend React │
                                                        │  21 Dashboards  │
                                                        │  useBIData hook │
                                                        └─────────────────┘
```

### **NOVA ARQUITETURA (PÓS-MIGRAÇÃO)**
```
┌─────────────────┐        ┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│  SQL Server     │───ETL──>│  PostgreSQL     │───POST─>│  Supabase Edge   │───────>│ Supabase Storage│
│  blufleet-dw    │        │  BluConecta_Dw  │        │  Function        │        │  (bi-reports)   │
│  (Origem)       │        │  (Intermediário)│        │                  │        │  128 JSONs      │
└─────────────────┘        └─────────────────┘        └──────────────────┘        └─────────────────┘
                                                                                            │
                                                                                            │ HTTP
                                                                                            ▼
                                                                                    ┌─────────────────┐
                                                                                    │  Frontend React │
                                                                                    │  21 Dashboards  │
                                                                                    │  (SEM MUDANÇAS) │
                                                                                    └─────────────────┘
```

**🎉 BENEFÍCIO:** Frontend não precisa ser alterado! Apenas o backend ETL muda.

---

## 📊 ESCOPO DA MIGRAÇÃO

### **Componentes Afetados**

| Componente | Arquivo | Mudança | Risco |
|------------|---------|---------|-------|
| **Script ETL** | `scripts/local-etl/run-sync.js` | ✏️ Adicionar POST para Supabase | 🟡 Médio |
| **Edge Function** | `supabase/functions/sync-dw-to-storage/index.ts` | ✅ Já funciona | 🟢 Baixo |
| **21 Dashboards** | `src/pages/analytics/*.tsx` | ❌ Nenhuma | 🟢 Baixo |
| **Hook useBIData** | `src/hooks/useBIData.ts` | ❌ Nenhuma | 🟢 Baixo |
| **128 Arquivos JSON** | Supabase Storage `bi-reports/` | ⚠️ Validar estrutura | 🟡 Médio |

### **Tabelas/Dados Impactados**

#### **Dimensões (11 tabelas)**
- ✅ `dim_clientes` - 8 dashboards dependem
- ✅ `dim_condutores` - 0 dashboards (auxiliar)
- ✅ `dim_fornecedores` - 1 dashboard (MaintenanceDashboard)
- ✅ `dim_frota` - 8 dashboards dependem
- ✅ `dim_veiculos_acessorios` - 0 dashboards (auxiliar)
- ✅ `dim_contratos_locacao` - 5 dashboards dependem
- ✅ `dim_itens_contrato` - 2 dashboards (ContractsDashboard)
- ✅ `dim_regras_contrato` - 1 dashboard (ContractAnalysisDashboard)

#### **Fatos Consolidados (10 tabelas)**
- ✅ `fat_historico_mobilizacao` - 0 dashboards (histórico)
- ✅ `rentabilidade_360_geral` - 1 dashboard (FleetDashboard)
- ✅ `hist_vida_veiculo_timeline` - 1 dashboard (FleetDashboard)
- ✅ `fat_churn` - 2 dashboards (ChurnDashboard, ExecutiveDashboard)
- ✅ `fat_inadimplencia` - 2 dashboards (FinancialDashboard, ExecutiveDashboard)
- ✅ `agg_dre_mensal` - 2 dashboards (DREDashboard, FinancialDashboard)
- ✅ `auditoria_consolidada` - 2 dashboards (DataAudit, ExecutiveDashboard)
- ✅ `fat_carro_reserva` - 1 dashboard (FleetDashboard)
- ✅ `fat_manutencao_unificado` - 1 dashboard (MaintenanceDashboard)
- ✅ `fat_manutencao_completa` - 1 dashboard (MaintenanceDashboard)

#### **Fatos Anuais (3 tipos x 5 anos = 15 tabelas)**
- ✅ `fat_faturamentos` (2022-2026) - 7 dashboards dependem
- ✅ `fat_detalhe_itens_os` (2022-2026) - 1 dashboard (MaintenanceDashboard)
- ✅ `fat_ocorrencias_master` (2022-2026) - 3 dashboards (InfractionsDashboard, ClaimsDashboard)

#### **Financeiro Universal (60 arquivos mensais)**
- ✅ `fat_financeiro_universal` (2022-01 até 2026-12) - 5 dashboards dependem

**TOTAL:** 128 arquivos JSON distribuídos entre dimensões, consolidados e sharding anual/mensal

---

## 🔧 ALTERAÇÕES TÉCNICAS NECESSÁRIAS

### **1. Script ETL (run-sync.js)**

**Arquivo:** `scripts/local-etl/run-sync.js`

**Mudanças:**
```javascript
// ADICIONAR: Função para enviar dados para Supabase Storage via Edge Function
async function uploadToSupabase(tableName, data, year = null, month = null) {
    const fileName = year 
        ? (month ? `${tableName}_${year}_${month.toString().padStart(2, '0')}.json` 
                  : `${tableName}_${year}.json`)
        : `${tableName}.json`;
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-dw-to-storage`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fileName: fileName,
            data: data,
            bucket: 'bi-reports'
        })
    });
    
    if (!response.ok) {
        throw new Error(`Erro ao fazer upload de ${fileName}: ${response.statusText}`);
    }
}

// MODIFICAR: processQuery() para retornar os dados e fazer upload
async function processQuery(pgClient, sqlPool, tableName, query, appendMode = false, progressStr = '', year = null, month = null) {
    // ... código existente ...
    
    // ADICIONAR após inserir no PostgreSQL:
    await uploadToSupabase(tableName, recordset, year, month);
    
    // ... resto do código ...
}
```

**Variáveis de Ambiente Necessárias:**
```env
SUPABASE_URL=https://apqrjkobktjcyrxhqwtm.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>  # Obter do Supabase Dashboard
```

### **2. Edge Function (NENHUMA MUDANÇA)**

**Arquivo:** `supabase/functions/sync-dw-to-storage/index.ts`

✅ **Já está pronta** - Edge Function atual já aceita POST com dados JSON e salva no Storage.

### **3. Frontend (NENHUMA MUDANÇA)**

✅ **Dashboards não precisam ser alterados** - Continuam consumindo os mesmos arquivos JSON do Storage.

✅ **Hook `useBIData`** - Continua com a mesma lógica de sharding anual/mensal.

---

## 📅 CRONOGRAMA DE EXECUÇÃO

### **SEMANA 1: Preparação e Configuração**
- [ ] Validar conexão PostgreSQL (BluConecta_Dw)
- [ ] Configurar variáveis de ambiente (SUPABASE_SERVICE_KEY)
- [ ] Criar backup dos arquivos JSON atuais no Storage
- [ ] Implementar função `uploadToSupabase()` no script ETL
- [ ] Testes unitários da função de upload

### **SEMANA 2: Execução do ETL e Validação de Dados**
- [ ] Executar ETL completo (primeira rodada)
- [ ] Validar geração dos 128 arquivos JSON
- [ ] Comparar estrutura JSON antiga vs nova (schema validation)
- [ ] Validar dados críticos:
  - [ ] `dim_veiculos.json` (8 dashboards dependem)
  - [ ] `fat_faturamentos_2024.json` (7 dashboards dependem)
  - [ ] `fat_financeiro_universal_2024_*.json` (5 dashboards dependem)
  - [ ] `fat_manutencao_completa.json` (MaintenanceDashboard)
- [ ] Verificar sharding temporal (60 arquivos mensais)

### **SEMANA 3: Testes de Dashboards - Fase 1 e 2**

#### **Fase 1 - Críticos**
- [ ] **ExecutiveDashboard** - 9 fontes de dados
  - [ ] KPIs principais carregando
  - [ ] Gráficos renderizando (receita, custos, frota)
  - [ ] Performance < 3s
  - [ ] Filtros interativos funcionando
- [ ] **MaintenanceDashboard** - 8 fontes de dados
  - [ ] 5 abas carregando corretamente
  - [ ] Filtros globais (MaintenanceFiltersContext)
  - [ ] Tabelas de vazão, lead time, custos
  - [ ] Charts de análise por veículo/fornecedor

#### **Fase 2 - Alto Impacto**
- [ ] **FinancialDashboard** - 3 fontes
  - [ ] DRE mensal
  - [ ] Gráficos de receita/despesa
  - [ ] Análise de inadimplência
- [ ] **ContractsDashboard** - 5 fontes
  - [ ] Lista de contratos ativos
  - [ ] Análise de rentabilidade
  - [ ] Métricas de locação
- [ ] **FleetDashboard** - 4 fontes
  - [ ] Mapa de veículos (Leaflet)
  - [ ] Timeline de eventos
  - [ ] Status da frota

### **SEMANA 4: Testes de Dashboards - Fase 3**
- [ ] **DREDashboard** - Pivot table funcionando
- [ ] **ChurnDashboard** - Análise de cancelamentos
- [ ] **InfractionsDashboard** - Multas e infrações
- [ ] **ClaimsDashboard** - Sinistros
- [ ] **CommercialDashboard** - Pipeline comercial
- [ ] **ClientsDashboard** - Análise de clientes
- [ ] **CustomerAnalytics** - 6 fontes de dados
- [ ] **PurchasesDashboard** - Compras de veículos
- [ ] **SalesDashboard** - Vendas/desmobilização
- [ ] **FundingDashboard** - Gestão de passivo
- [ ] **ContractAnalysisDashboard** - Análise de contrato
- [ ] **DataAudit** - Auditoria de dados
- [ ] Demais dashboards (FinancialAnalytics, FinancialResult, etc)

### **SEMANA 5: Validação Final e Go-Live**
- [ ] Teste de performance completo (todos os dashboards)
- [ ] Validação de permissões (useAnalyticsAccess)
- [ ] Testes de carga (múltiplos usuários simultâneos)
- [ ] Documentação atualizada
- [ ] Treinamento da equipe
- [ ] **Go-Live** 🚀
- [ ] Monitoramento pós-migração (7 dias)

---

## ✅ CHECKLIST DE VALIDAÇÃO

### **Validação de Dados**
- [ ] Todas as 128 tabelas/arquivos foram gerados
- [ ] Estrutura JSON mantém schema consistente
- [ ] Dados numéricos convertidos corretamente (castM)
- [ ] Datas formatadas como 'yyyy-MM-dd'
- [ ] Sharding anual funciona (2022-2026)
- [ ] Sharding mensal funciona (60 arquivos fat_financeiro_universal)
- [ ] Nenhum arquivo JSON com 0 bytes
- [ ] Comparação spot-check: 10 registros aleatórios de cada tabela crítica

### **Validação de Performance**
- [ ] Tempo de carregamento de dashboards < 3s
- [ ] Hook useBIData carrega dados sem erros
- [ ] Filtros interativos (useChartFilter) respondem < 500ms
- [ ] Drill-down em gráficos funciona corretamente
- [ ] Sem memory leaks em navegação entre dashboards

### **Validação Funcional**
- [ ] Todos os 21 dashboards carregam sem erros
- [ ] KPIs principais batem com dados do sistema transacional
- [ ] Gráficos renderizam corretamente (Tremor, Recharts)
- [ ] Tabelas exibem dados paginados
- [ ] Filtros temporais funcionam (DateRangePicker)
- [ ] Sistema de permissões preservado (useAnalyticsAccess)

### **Validação de Integração**
- [ ] Edge Function processa POST sem timeout
- [ ] Upload para Supabase Storage concluído (128 arquivos)
- [ ] Bucket bi-reports acessível publicamente (leitura)
- [ ] Frontend consome JSON sem CORS errors
- [ ] ETL pode ser executado manualmente sem erros

---

## 🔄 ESTRATÉGIA DE ROLLBACK

### **Cenário 1: Erro durante ETL**
1. ✅ Interromper execução do script
2. ✅ Logs detalhados identificam tabela/query com problema
3. ✅ Corrigir query SQL específica
4. ✅ Re-executar ETL do ponto de falha (modo append)

### **Cenário 2: Dados Inconsistentes**
1. ✅ Manter backup dos 128 arquivos JSON antigos por 30 dias
2. ✅ Script de restauração: `restore-bi-backup.sh`
3. ✅ Comparar novos dados vs backup (validação automática)
4. ✅ Se diferença > 5%, alertar e parar migração

### **Cenário 3: Performance Degradada**
1. ✅ Implementar cache mais agressivo no useBIData
2. ✅ Consolidar arquivos mensais em trimestrais
3. ✅ Lazy loading para dashboards com múltiplas abas
4. ✅ CDN para arquivos JSON (Supabase Storage já tem)

### **Cenário 4: Rollback Total Necessário**
1. 🚨 **Feature Flag:** Adicionar `VITE_USE_OLD_DW=true` no .env
2. 🚨 Frontend alterna entre fonte antiga/nova baseado na flag
3. 🚨 Período de transição: 14 dias com ambas fontes ativas
4. 🚨 Após estabilização, desligar fonte antiga

**Tempo de Rollback:** < 10 minutos (apenas restaurar backup JSON)

---

## 🎯 DEPENDÊNCIAS CRÍTICAS

### **Tabelas Mais Utilizadas (Alto Risco)**
1. 🔴 **dim_frota** → 8 dashboards
2. 🔴 **fat_faturamentos** → 7 dashboards (sharding anual)
3. 🔴 **fat_financeiro_universal** → 5 dashboards (sharding mensal - 60 arquivos!)
4. 🟡 **dim_contratos_locacao** → 5 dashboards
5. 🟡 **dim_clientes** → 3 dashboards

### **Dashboards Mais Complexos (Alto Risco)**
1. 🔴 **MaintenanceDashboard** - 8 fontes + 5 abas + filtros complexos
2. 🔴 **ExecutiveDashboard** - 9 fontes + agregações pesadas
3. 🟡 **ContractAnalysisDashboard** - Cálculos de rentabilidade complexos
4. 🟡 **CustomerAnalytics** - 6 fontes + análise 360°

### **Hooks Críticos**
- 🔴 **useBIData** - Todos os 21 dashboards dependem
- 🟡 **useChartFilter** - 15 dashboards utilizam
- 🟢 **useAnalyticsAccess** - Sistema de permissões

---

## 📞 COMUNICAÇÃO E STAKEHOLDERS

### **Equipe de Desenvolvimento**
- **Responsável ETL:** Dev Backend
- **Responsável Frontend:** Dev Frontend
- **Responsável Testes:** QA
- **Responsável DevOps:** Infra

### **Usuários Finais**
- 📧 Email de notificação 48h antes da migração
- 📧 Email de confirmação pós-migração
- 📄 Changelog com melhorias (se houver)

### **Manutenção e Suporte**
- 📞 Canal de suporte dedicado durante primeira semana
- 📊 Dashboard de monitoramento de performance
- 🚨 Alertas automáticos para erros no ETL

---

## 📚 DOCUMENTAÇÃO A ATUALIZAR

1. **docs/ETL_QUERIES_V2_COMPLETO.md**
   - ✏️ Adicionar queries corrigidas (fat_churn, fat_carro_reserva)
   - ✏️ Documentar mapeamento SQL Server → PostgreSQL
   - ✏️ Explicar função castM() e conversões

2. **docs/BI_ANALYTICS_SETUP.md**
   - ✏️ Nova arquitetura (diagrama atualizado)
   - ✏️ Configuração do PostgreSQL BluConecta_Dw
   - ✏️ Como rodar o ETL manualmente
   - ✏️ Troubleshooting comum

3. **README.md** (raiz do projeto)
   - ✏️ Seção de BI/Analytics atualizada
   - ✏️ Comandos para rodar ETL
   - ✏️ Requisitos de ambiente

4. **Criar: docs/BI_MAINTENANCE.md** (NOVO)
   - 📝 Como adicionar novos dashboards
   - 📝 Como adicionar novas tabelas no ETL
   - 📝 Boas práticas de performance
   - 📝 Cronograma de execução do ETL (diário/semanal)

---

## 🚀 MELHORIAS FUTURAS (PÓS-MIGRAÇÃO)

### **Curto Prazo (1-3 meses)**
- [ ] Agendar ETL automático (cron job diário)
- [ ] Implementar versionamento de arquivos JSON
- [ ] Cache Redis para queries mais usadas
- [ ] Monitoramento de anomalias de dados (Sentry)

### **Médio Prazo (3-6 meses)**
- [ ] Substituir JSON por PostgreSQL direto (eliminar Storage)
- [ ] Implementar GraphQL para queries flexíveis
- [ ] Real-time updates via websockets
- [ ] Dashboard de data quality

### **Longo Prazo (6-12 meses)**
- [ ] Data Lake para dados históricos (3+ anos)
- [ ] Machine Learning para predições
- [ ] Self-service BI (usuários criam dashboards)
- [ ] Mobile app para dashboards executivos

---

## 📊 MÉTRICAS DE SUCESSO

### **Técnicas**
- ✅ 100% dos dashboards funcionais
- ✅ 0 erros no console do navegador
- ✅ Tempo de carregamento < 3s (95º percentil)
- ✅ 99.9% uptime do ETL

### **Negócio**
- ✅ Satisfação dos usuários > 4.5/5
- ✅ Redução de 50% em tickets de suporte
- ✅ Aumento de 30% no uso dos dashboards
- ✅ Tempo de análise reduzido em 40%

---

## 🔐 SEGURANÇA E COMPLIANCE

### **Credenciais Sensíveis**
- 🔒 Service Role Key do Supabase **NUNCA** commitar no Git
- 🔒 Senhas do PostgreSQL em variáveis de ambiente
- 🔒 Credenciais SQL Server em arquivo .env (gitignored)

### **Controle de Acesso**
- 🔐 Sistema de permissões existente preservado
- 🔐 RLS (Row Level Security) do Supabase mantido
- 🔐 Logs de auditoria para acesso aos dashboards

### **Backup e Recuperação**
- 💾 Backup automático do PostgreSQL (diário)
- 💾 Versionamento de arquivos JSON (30 dias)
- 💾 Snapshot do bucket bi-reports (semanal)

---

## ✍️ ASSINATURAS E APROVAÇÕES

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| **Product Owner** | ___________ | ___/___/___ | ___________ |
| **Tech Lead** | ___________ | ___/___/___ | ___________ |
| **DevOps** | ___________ | ___/___/___ | ___________ |
| **QA Lead** | ___________ | ___/___/___ | ___________ |

---

**Última Atualização:** 05/01/2026  
**Versão do Documento:** 1.0  
**Status:** 🟡 Aguardando Aprovação
