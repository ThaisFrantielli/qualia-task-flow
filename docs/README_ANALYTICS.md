# Índice de Documentação - Módulo Analytics

**Data de Atualização**: 19 de Janeiro de 2026  
**Versão**: 2.0  
**Status**: ✅ Documentação Completa e Atualizada

---

## 📚 Visão Geral

Este índice conecta toda a documentação do módulo de Analytics do projeto qualia-task-flow, desde a extração de dados (ETL) até o consumo nos 22 dashboards React.

---

## 🗂️ Estrutura de Documentos

### 📊 **1. Documentos de Análise e Catálogo**

#### [CATALOGO_DASHBOARDS_ANALYTICS.md](./CATALOGO_DASHBOARDS_ANALYTICS.md)
**Propósito**: Catálogo detalhado das 22 páginas de analytics  
**Conteúdo**:
- Descrição funcional de cada dashboard
- Gráficos e componentes utilizados
- KPIs principais
- Tabelas ETL consultadas
- Hooks e contexts utilizados
- Status de implementação (✅ OK / ⚠️ Parcial / ❌ Sem dados)

**Use este documento quando**:
- Precisa entender o que cada dashboard faz
- Quer saber quais tabelas um dashboard usa
- Precisa identificar dependências entre dashboards e dados

---

#### [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md)
**Propósito**: Matriz completa de relacionamento entre 128 tabelas ETL e 22 dashboards  
**Conteúdo**:
- Tabela cruzada: Tabelas × Dashboards
- Indicação de uso principal (📊) vs. secundário (📈)
- Status de cada tabela (✅ / ⚠️ / ❌)
- Top 10 tabelas mais usadas
- Estatísticas de cobertura por dashboard
- Plano de ação por prioridade

**Use este documento quando**:
- Precisa saber quais dashboards serão afetados se uma tabela falhar
- Quer priorizar criação de tabelas faltantes
- Precisa mapear impacto de mudanças em tabelas

---

### 🔄 **2. Documentos de ETL e Pipeline**

#### [FLUXO_ETL_ANALYTICS.md](./FLUXO_ETL_ANALYTICS.md)
**Propósito**: Documentação completa do fluxo de atualização de dados  
**Conteúdo**:
- Arquitetura do pipeline (SQL Server → PostgreSQL → Supabase → React)
- Etapas detalhadas (Extração, Transformação, Upload, Consumo)
- Frequência de atualização (GitHub Actions, Manual, Task Scheduler)
- Checklist de execução manual
- Monitoramento e alertas (planejado)
- Troubleshooting comum

**Use este documento quando**:
- Precisa executar o ETL manualmente
- Quer entender como os dados chegam nos dashboards
- Precisa configurar agendamento automático
- Está debugando problemas no pipeline

---

#### [ETL_EXECUTION_REPORT_2026-01-05.md](./ETL_EXECUTION_REPORT_2026-01-05.md)
**Propósito**: Relatório detalhado de execução do ETL  
**Conteúdo**:
- ✅ **STATUS ATUALIZADO (19/01/2026)**: 103/103 etapas (100%)
- Contagem de registros por tabela
- Tempo de execução por etapa
- Tabelas com chunking (>10K rows)
- **Correção**: `fat_sinistros` e `fat_multas` estão funcionais

**Use este documento quando**:
- Quer saber quantos registros cada tabela tem
- Precisa verificar se o ETL rodou com sucesso
- Está analisando performance de queries

---

#### [MAPEAMENTO_DASHBOARDS_ETL.md](./MAPEAMENTO_DASHBOARDS_ETL.md)
**Propósito**: Mapeamento de arquivos antigos → novos (migração)  
**Conteúdo**:
- ✅ **STATUS ATUALIZADO (19/01/2026)**: `fat_sinistros` e `fat_multas` movidos para "Funcionais"
- Nomenclatura de arquivos (rename necessários)
- Arquivos gerados pelo ETL vs. esperados pelos dashboards
- Ações de migração necessárias

**Use este documento quando**:
- Está migrando de sistema legado
- Precisa renomear arquivos para compatibilidade
- Quer entender a estrutura de nomes dos arquivos

---

### 🏗️ **3. Documentos de Arquitetura e Planejamento**

#### [ANALYTICS_ARCHITECTURE.md](./ANALYTICS_ARCHITECTURE.md)
**Propósito**: Arquitetura técnica do módulo Analytics  
**Conteúdo**:
- Estrutura de pastas e arquivos
- Padrões de código (hooks, components, contexts)
- Biblioteca de gráficos (Recharts, Tremor)
- Cache e otimizações

**Use este documento quando**:
- Está criando um novo dashboard
- Precisa entender a estrutura do projeto
- Quer seguir padrões de código existentes

---

#### [ARQUITETURA_BI_ANALYTICS.md](./ARQUITETURA_BI_ANALYTICS.md)
**Propósito**: Arquitetura de BI e Analytics (visão estratégica)  
**Conteúdo**:
- Camadas de dados (Origem, ETL, Storage, Apresentação)
- Estratégia de governança de dados
- Roadmap de evolução

**Use este documento quando**:
- Precisa de visão estratégica do BI
- Está planejando novas funcionalidades
- Quer entender decisões arquiteturais

---

#### [PLANO_MIGRACAO_DW_BI.md](./PLANO_MIGRACAO_DW_BI.md)
**Propósito**: Plano de migração do DW legado para nova arquitetura  
**Conteúdo**:
- Etapas de migração
- Tabelas antigas vs. novas
- Cronograma de implementação

**Use este documento quando**:
- Está executando a migração
- Precisa validar se migração está completa
- Quer saber o histórico de mudanças

---

### 📖 **4. Guias e Documentação Operacional**

#### [GUIA_RAPIDO_MIGRACAO.md](./GUIA_RAPIDO_MIGRACAO.md)
**Propósito**: Guia rápido de início  
**Conteúdo**:
- Como executar o ETL pela primeira vez
- Como acessar dashboards
- Primeiros passos

**Use este documento quando**:
- É novo no projeto
- Precisa de instruções rápidas
- Quer validar instalação

---

#### [scripts/local-etl/README.md](../scripts/local-etl/README.md)
**Propósito**: Documentação técnica do script ETL  
**Conteúdo**:
- Como instalar dependências
- Como configurar variáveis de ambiente
- Como executar o ETL
- Flags e opções disponíveis

**Use este documento quando**:
- Está configurando o ETL pela primeira vez
- Precisa de referência de comandos
- Quer entender flags como `--json-only`

---

### 🔧 **5. Documentos de Troubleshooting**

#### [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
**Propósito**: Resolução de problemas comuns  
**Conteúdo**:
- Erros de conexão SQL Server
- Problemas de upload Supabase
- Dashboards sem dados
- Cache desatualizado

**Use este documento quando**:
- Está com erro e não sabe como resolver
- Dashboard não está carregando dados
- ETL está falhando

---

## 🔍 Guia de Uso por Cenário

### **Cenário 1: Sou novo no projeto e quero entender a arquitetura**

1. Comece com [ANALYTICS_ARCHITECTURE.md](./ANALYTICS_ARCHITECTURE.md) para visão geral
2. Leia [FLUXO_ETL_ANALYTICS.md](./FLUXO_ETL_ANALYTICS.md) para entender o pipeline
3. Explore [CATALOGO_DASHBOARDS_ANALYTICS.md](./CATALOGO_DASHBOARDS_ANALYTICS.md) para conhecer os dashboards

---

### **Cenário 2: Preciso executar o ETL**

1. Leia [scripts/local-etl/README.md](../scripts/local-etl/README.md) para configurar
2. Siga checklist em [FLUXO_ETL_ANALYTICS.md](./FLUXO_ETL_ANALYTICS.md#checklist-de-execução-manual)
3. Valide execução com [ETL_EXECUTION_REPORT_2026-01-05.md](./ETL_EXECUTION_REPORT_2026-01-05.md) (referência de contagens esperadas)

---

### **Cenário 3: Dashboard está sem dados**

1. Identifique quais tabelas o dashboard usa em [CATALOGO_DASHBOARDS_ANALYTICS.md](./CATALOGO_DASHBOARDS_ANALYTICS.md)
2. Verifique status das tabelas em [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md)
3. Se tabela não existe, veja prioridade em [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md#plano-de-ação](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md#🎯-plano-de-ação-por-prioridade)
4. Se tabela existe mas dashboard não carrega, consulte [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

### **Cenário 4: Quero criar um novo dashboard**

1. Estude estrutura de hooks em [ANALYTICS_ARCHITECTURE.md](./ANALYTICS_ARCHITECTURE.md)
2. Veja exemplos de dashboards em [CATALOGO_DASHBOARDS_ANALYTICS.md](./CATALOGO_DASHBOARDS_ANALYTICS.md)
3. Verifique tabelas disponíveis em [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md)
4. Use `useBIData` hook conforme documentado em [FLUXO_ETL_ANALYTICS.md#etapa-5](./FLUXO_ETL_ANALYTICS.md#etapa-5-consumo-pelos-dashboards)

---

### **Cenário 5: Preciso criar uma nova tabela no ETL**

1. Analise estrutura esperada em [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md#tabelas-necessárias](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md#❌-tabelas-necessárias-não-existem)
2. Adicione query SQL em [scripts/local-etl/run-sync-v2.js](../scripts/local-etl/run-sync-v2.js)
3. Siga padrão de transformação documentado em [FLUXO_ETL_ANALYTICS.md#etapa-2](./FLUXO_ETL_ANALYTICS.md#etapa-2-transformação-nodejs)
4. Execute ETL e valide upload no Supabase Storage

---

### **Cenário 6: Quero priorizar correções**

1. Veja dashboards por status em [CATALOGO_DASHBOARDS_ANALYTICS.md#resumo-de-status](./CATALOGO_DASHBOARDS_ANALYTICS.md#📋-resumo-de-status)
2. Consulte prioridades em [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md#plano-de-ação](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md#🎯-plano-de-ação-por-prioridade)
3. Foque em:
   - 🔴 **Alta**: `fat_propostas`, correção de `fat_churn`
   - 🟡 **Média**: `fat_vendas`, `dim_compras`, `agg_rentabilidade_contratos_mensal`
   - 🟢 **Baixa**: `fat_financiamentos`

---

## 📊 Status Atual (19/01/2026)

### ✅ Conquistas Recentes

1. **Correção de Documentação Desatualizada**
   - ✅ `fat_sinistros` e `fat_multas` agora corretamente documentados como FUNCIONAIS
   - ✅ [ETL_EXECUTION_REPORT_2026-01-05.md](./ETL_EXECUTION_REPORT_2026-01-05.md) atualizado
   - ✅ [MAPEAMENTO_DASHBOARDS_ETL.md](./MAPEAMENTO_DASHBOARDS_ETL.md) atualizado

2. **Novos Documentos Criados**
   - ✅ [FLUXO_ETL_ANALYTICS.md](./FLUXO_ETL_ANALYTICS.md) - Fluxo completo do pipeline
   - ✅ [CATALOGO_DASHBOARDS_ANALYTICS.md](./CATALOGO_DASHBOARDS_ANALYTICS.md) - Catálogo de 22 dashboards
   - ✅ [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md) - Matriz de dependências
   - ✅ Este índice

### 📈 Métricas Atualizadas

- **Tabelas ETL**: 128/135 (95% implementado)
- **Dashboards Funcionais**: 17/22 (77%)
- **Dashboards Parciais**: 3/22 (14%)
- **Dashboards Sem Dados**: 5/22 (23%)

### 🎯 Próximas Ações Priorizadas

1. 🔴 **Corrigir schema de `fat_churn.json`** (afeta 3 dashboards)
2. 🔴 **Criar `fat_propostas_*.json`** (afeta 2 dashboards críticos)
3. 🟡 **Criar `fat_vendas_*.json`** (habilita SalesDashboard)
4. 🟡 **Criar `dim_compras` e `dim_alienacoes`** (habilita PurchasesDashboard)

---

## 🔗 Links Rápidos

### Código Principal
- [src/hooks/useBIData.ts](../src/hooks/useBIData.ts) - Hook principal de consumo de dados
- [scripts/local-etl/run-sync-v2.js](../scripts/local-etl/run-sync-v2.js) - Script ETL
- [supabase/functions/sync-dw-to-storage](../supabase/functions/sync-dw-to-storage/index.ts) - Edge Function de upload
- [src/pages/analytics/](../src/pages/analytics/) - Pasta de dashboards

### Configuração
- [scripts/local-etl/.env](../scripts/local-etl/.env) - Variáveis de ambiente
- [.github/workflows/db-sync.yml](../.github/workflows/db-sync.yml) - GitHub Action

### Storage
- [Supabase Storage: bi-reports](https://apqrjkobktjcyrxhqwtm.supabase.co/storage/v1/object/public/bi-reports/) - Arquivos JSON públicos

---

## 📝 Convenções de Nomenclatura

### Arquivos JSON no Supabase Storage

| Padrão | Exemplo | Descrição |
|--------|---------|-----------|
| `dim_*.json` | `dim_frota.json` | Dimensões (cadastros) |
| `fat_*_YYYY.json` | `fat_faturamentos_2024.json` | Fatos anuais (sharding por ano) |
| `fat_*_YYYY_MM.json` | `fat_financeiro_universal_2024_01.json` | Fatos mensais (sharding por ano/mês) |
| `agg_*.json` | `agg_dre_mensal.json` | Agregações consolidadas |
| `*_part_N.json` | `fat_manutencao_unificado_part_1.json` | Arquivos chunked (>10K rows) |
| `*_manifest.json` | `fat_manutencao_unificado_manifest.json` | Metadata de chunking |

### Padrão de Consumo no Frontend

```typescript
// Arquivo único
useBIData('dim_frota.json')

// Sharding anual (* = todos os anos)
useBIData('fat_faturamentos_*.json')

// Sharding mensal (*_* = todos os anos e meses)
useBIData('fat_financeiro_universal_*_*.json')

// Chunking automático (detecta manifest)
useBIData('fat_manutencao_unificado.json')
```

---

## 🆘 Suporte

### Em caso de dúvidas:

1. **Consulte primeiro**: Este índice e documentos relacionados
2. **Verifique código**: Exemplos em [src/pages/analytics/](../src/pages/analytics/)
3. **Debug**: Console do navegador (F12) mostra erros de fetch
4. **Logs ETL**: [scripts/local-etl/](../scripts/local-etl/) (console output)

### Contatos:
- **Equipe DW**: BluConecta DW Team
- **Repositório**: [qualia-task-flow](https://github.com/seu-repo/qualia-task-flow)

---

## 📅 Histórico de Atualizações

| Data | Versão | Mudanças |
|------|--------|----------|
| 19/01/2026 | 2.0 | Correção massiva de documentação: `fat_sinistros` e `fat_multas` agora documentados como funcionais. Criação de 3 novos documentos abrangentes. |
| 05/01/2026 | 1.5 | Execução do ETL com 103 etapas. Primeiros relatórios de execução. |
| 01/01/2026 | 1.0 | Início da documentação estruturada. |

---

**Última Atualização**: 19 de Janeiro de 2026  
**Responsável**: Equipe BluConecta DW  
**Status**: ✅ Índice Completo e Atualizado

---

## 🎯 Matriz de Decisão Rápida

Use esta matriz para decidir qual documento ler:

| Pergunta | Documento Recomendado |
|----------|----------------------|
| Como funciona o pipeline de dados? | [FLUXO_ETL_ANALYTICS.md](./FLUXO_ETL_ANALYTICS.md) |
| O que cada dashboard faz? | [CATALOGO_DASHBOARDS_ANALYTICS.md](./CATALOGO_DASHBOARDS_ANALYTICS.md) |
| Quais tabelas um dashboard usa? | [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md) |
| Como executar o ETL? | [scripts/local-etl/README.md](../scripts/local-etl/README.md) |
| Por que dashboard não tem dados? | [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md) |
| Como criar novo dashboard? | [ANALYTICS_ARCHITECTURE.md](./ANALYTICS_ARCHITECTURE.md) |
| Como adicionar nova tabela no ETL? | [FLUXO_ETL_ANALYTICS.md](./FLUXO_ETL_ANALYTICS.md) + [scripts/local-etl/run-sync-v2.js](../scripts/local-etl/run-sync-v2.js) |
| Quantos registros cada tabela tem? | [ETL_EXECUTION_REPORT_2026-01-05.md](./ETL_EXECUTION_REPORT_2026-01-05.md) |
| Quais tabelas estão faltando? | [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md#tabelas-necessárias](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md#❌-tabelas-necessárias-não-existem) |
| Qual a prioridade de correções? | [MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md#plano-de-ação](./MATRIZ_RELACIONAMENTO_ETL_DASHBOARDS.md#🎯-plano-de-ação-por-prioridade) |
| ETL está com erro, o que fazer? | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| Sou novo, por onde começar? | [GUIA_RAPIDO_MIGRACAO.md](./GUIA_RAPIDO_MIGRACAO.md) |
