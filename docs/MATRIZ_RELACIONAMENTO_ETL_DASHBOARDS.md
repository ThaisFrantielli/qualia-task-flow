# Matriz de Relacionamento: Tabelas ETL ↔ Dashboards

**Data de Criação**: 19 de Janeiro de 2026  
**Versão**: 1.0  
**Total de Arquivos JSON**: 128  
**Total de Dashboards**: 22

---

## 📊 Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Tabela existe e é consumida |
| ⚠️ | Tabela existe mas com problemas (schema error, 0 rows) |
| ❌ | Tabela não existe (precisa ser criada) |
| 🔄 | Tabela existe mas precisa de mapeamento/rename |
| 📊 | Uso principal (KPI crítico) |
| 📈 | Uso secundário (análise complementar) |

---

## 🗂️ Dimensões (8 tabelas)

| Tabela ETL | Rows | Executive | Fleet | FleetIdle | Maintenance | Financial | Clients | Customer | Churn | Contracts | ContractAnalysis | Commercial | Purchases | Sales | Funding | Claims | Infractions | DataAudit |
|-----------|------|-----------|-------|-----------|-------------|-----------|---------|----------|-------|-----------|-----------------|------------|-----------|-------|---------|--------|-------------|-----------|
| `dim_clientes.json` | 1.577 | 📊✅ | 📈✅ | - | - | 📈✅ | 📊✅ | 📊✅ | 📈✅ | 📈✅ | - | 📈✅ | - | - | - | - | - | - |
| `dim_condutores.json` | 2.430 | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | 📈✅ | - |
| `dim_fornecedores.json` | 4.227 | - | 📈✅ | - | 📊✅ | - | - | - | - | - | - | - | - | - | - | - | - | - |
| `dim_frota.json` | 5.781 | 📊✅ | 📊✅ | 📊✅ | 📈✅ | - | 📈✅ | 📈✅ | - | 📈✅ | - | - | 📊✅ | 📊✅ | - | 📈✅ | 📈✅ | - |
| `dim_veiculos_acessorios.json` | 5.798 | - | 📈✅ | - | 📈✅ | - | - | - | - | - | - | - | - | - | - | - | - | - |
| `dim_contratos_locacao.json` | 6.962 | 📊✅ | 📊✅ | - | - | 📈✅ | 📊✅ | 📊✅ | - | 📊✅ | 📊✅ | 📊✅ | - | - | - | 📈✅ | 📈✅ | - |
| `dim_itens_contrato.json` | 2.598 | - | - | - | - | - | - | - | - | 📈✅ | - | - | - | - | - | - | - | - |
| `dim_regras_contrato.json` | 77.172 | - | 📈✅ | - | - | 📈✅ | - | 📈✅ | - | 📊✅ | 📈✅ | - | - | - | - | - | - | - |

### Resumo de Uso:
- **dim_clientes**: Usado em 9 dashboards (crítico)
- **dim_frota**: Usado em 11 dashboards (crítico)
- **dim_contratos_locacao**: Usado em 10 dashboards (crítico)
- **dim_fornecedores**: Usado em 2 dashboards (específico de manutenção)
- **dim_condutores**: Usado em 1 dashboard (infrações)

---

## 📅 Fatos Anuais (25 tabelas = 5 tipos × 5 anos)

### fat_faturamentos_*.json (2022-2026) - 174.217 rows total

| Ano | Rows | Executive | Financial | FinancialAnalytics | Clients | Customer | Contracts | Commercial |
|-----|------|-----------|-----------|-------------------|---------|----------|-----------|------------|
| 2022 | 8.798 | 📊✅ | 📊✅ | 📊✅ | 📊✅ | 📊✅ | 📈✅ | - |
| 2023 | 59.806 | 📊✅ | 📊✅ | 📊✅ | 📊✅ | 📊✅ | 📈✅ | - |
| 2024 | 55.343 | 📊✅ | 📊✅ | 📊✅ | 📊✅ | 📊✅ | 📈✅ | - |
| 2025 | 50.197 | 📊✅ | 📊✅ | 📊✅ | 📊✅ | 📊✅ | 📈✅ | - |
| 2026 | 73 | 📊✅ | 📊✅ | 📊✅ | 📊✅ | 📊✅ | 📈✅ | - |

**Padrão de Consumo**: `useBIData('fat_faturamentos_*.json')` → Combina automaticamente todos os anos

---

### fat_detalhe_itens_os_*.json (2022-2026) - 278.578 rows total

| Ano | Rows | Maintenance | Fleet | Customer |
|-----|------|-------------|-------|----------|
| 2022 | 12.987 | 📊✅ | 📈✅ | 📈✅ |
| 2023 | 89.799 | 📊✅ | 📈✅ | 📈✅ |
| 2024 | 87.329 | 📊✅ | 📈✅ | 📈✅ |
| 2025 | 88.382 | 📊✅ | 📈✅ | 📈✅ |
| 2026 | 81 | 📊✅ | 📈✅ | 📈✅ |

**Padrão de Consumo**: `useBIData('fat_detalhe_itens_os_*.json')` → Usado para drill-down de OS

---

### fat_ocorrencias_master_*.json (2022-2026) - 97.085 rows total

| Ano | Rows | Fleet | Maintenance | Executive |
|-----|------|-------|-------------|-----------|
| 2022 | 7.888 | 📈✅ | 📈✅ | 📈✅ |
| 2023 | 32.216 | 📈✅ | 📈✅ | 📈✅ |
| 2024 | 29.495 | 📈✅ | 📈✅ | 📈✅ |
| 2025 | 26.542 | 📈✅ | 📈✅ | 📈✅ |
| 2026 | 944 | 📈✅ | 📈✅ | 📈✅ |

**Padrão de Consumo**: `useBIData('fat_ocorrencias_master_*.json')` → Timeline de eventos

---

### fat_sinistros_*.json (2022-2026) - 6.187 rows total ✅

| Ano | Rows (estimado) | Fleet | Customer | Claims | Executive |
|-----|----------------|-------|----------|--------|-----------|
| 2022 | 567 | 📊✅ | 📊✅ | 📊✅ | 📈✅ |
| 2023 | 1.823 | 📊✅ | 📊✅ | 📊✅ | 📈✅ |
| 2024 | 1.956 | 📊✅ | 📊✅ | 📊✅ | 📈✅ |
| 2025 | 1.798 | 📊✅ | 📊✅ | 📊✅ | 📈✅ |
| 2026 | 43 | 📊✅ | 📊✅ | 📊✅ | 📈✅ |

**Status**: ✅ Tabela EXISTE e é FUNCIONAL (documentação anterior estava incorreta)  
**Uso Principal**: ClaimsDashboard (KPI de custo de sinistros)  
**Estrutura**: JOIN OcorrenciasSinistro → ContratosLocacao → Clientes

---

### fat_multas_*.json (2022-2026) - 24.320 rows total ✅

| Ano | Rows (estimado) | Fleet | Customer | Infractions | Executive |
|-----|----------------|-------|----------|-------------|-----------|
| 2022 | 2.234 | 📊✅ | 📊✅ | 📊✅ | 📈✅ |
| 2023 | 7.456 | 📊✅ | 📊✅ | 📊✅ | 📈✅ |
| 2024 | 6.892 | 📊✅ | 📊✅ | 📊✅ | 📈✅ |
| 2025 | 7.289 | 📊✅ | 📊✅ | 📊✅ | 📈✅ |
| 2026 | 449 | 📊✅ | 📊✅ | 📊✅ | 📈✅ |

**Status**: ✅ Tabela EXISTE e é FUNCIONAL (documentação anterior estava incorreta)  
**Uso Principal**: InfractionsDashboard (KPI de custo de multas)  
**Estrutura**: JOIN OcorrenciasInfracoes → Placa → ContratosLocacao → Clientes

---

## 💰 Financeiro Universal (60 tabelas = 5 anos × 12 meses)

### fat_financeiro_universal_YYYY_MM.json - 415.013 rows total

**Padrão**: `fat_financeiro_universal_2022_01.json` até `fat_financeiro_universal_2026_12.json`

| Dashboard | Uso | Importância | Filtros Aplicados |
|-----------|-----|-------------|-------------------|
| FinancialDashboard | 📊 Principal | 🔴 Crítico | Tipo de lançamento, Centro de custo |
| DREDashboard | 📊 Principal | 🔴 Crítico | Categoria contábil (Receita, Custo, Despesa) |
| FinancialResult | 📊 Principal | 🔴 Crítico | Análise de resultado econômico |
| Executive | 📈 Secundário | 🟡 Importante | Agregado mensal |

**Distribuição de Registros por Ano**:
| Ano | Total Rows | Média/Mês |
|-----|-----------|-----------|
| 2022 | 14.234 | 1.186 |
| 2023 | 125.067 | 10.422 |
| 2024 | 133.429 | 11.119 |
| 2025 | 130.545 | 10.879 |
| 2026 | 11.738 | 978 (jan apenas) |

**Campos Principais**:
- `tipo_lancamento`: Receita, Custo, Despesa
- `categoria`: DRE classification
- `valor`: Valor monetário
- `data_lancamento`: Data do lançamento
- `centro_custo`: Alocação de custo

**Padrão de Consumo**:
```typescript
// Mensal específico
useBIData('fat_financeiro_universal_2024_01.json')

// Todos os meses de um ano
useBIData('fat_financeiro_universal_2024_*.json')

// Sharding automático (todos os anos e meses)
useBIData('fat_financeiro_universal_*_*.json')
```

---

## 📦 Consolidados (10 tabelas)

### fat_historico_mobilizacao.json - 2.498 rows

| Dashboard | Uso | Tipo |
|-----------|-----|------|
| Fleet | 📊✅ | Histórico de entrada/saída de frota |
| Purchases | 📊✅ | Análise de aquisições |

---

### rentabilidade_360_geral.json - 5.781 rows

| Dashboard | Uso | Tipo |
|-----------|-----|------|
| Contracts | 📊✅ | Análise de rentabilidade por contrato |
| ContractAnalysis | 📊✅ | Base para simulações |
| Fleet | 📈✅ | TCO e análise financeira |

**Campos Principais**:
- `id_contrato`
- `receita_total`
- `custo_total`
- `margem_liquida`
- `roi`

---

### hist_vida_veiculo_timeline.json - 107.151 rows (4 chunks)

| Dashboard | Uso | Tipo |
|-----------|-----|------|
| Fleet | 📊✅ | Timeline completa de vida do veículo |
| FleetIdle | 📊✅ | Análise de dias improdutivos |
| Customer | 📈✅ | Histórico por cliente |

**Estrutura de Chunking**:
- `hist_vida_veiculo_timeline_part_1.json` (27K rows)
- `hist_vida_veiculo_timeline_part_2.json` (27K rows)
- `hist_vida_veiculo_timeline_part_3.json` (27K rows)
- `hist_vida_veiculo_timeline_part_4.json` (26K rows)
- `hist_vida_veiculo_timeline_manifest.json` (metadata)

**Padrão de Consumo**:
```typescript
// Hook detecta manifest automaticamente
const { data } = useBIData('hist_vida_veiculo_timeline.json');
// Retorna array combinado de 107K rows
```

---

### fat_churn.json - 1.653 rows ⚠️

| Dashboard | Uso | Status |
|-----------|-----|--------|
| Executive | 📊 | ⚠️ Schema Error (query SQL precisa correção) |
| Clients | 📊 | ⚠️ Schema Error |
| Churn | 📊 | ⚠️ Schema Error |

**Problema**: Query SQL retorna schema inconsistente  
**Ação Necessária**: Corrigir query no ETL (run-sync-v2.js)  
**Impacto**: KPI de churn rate não funciona corretamente

---

### agg_dre_mensal.json - 78 rows

| Dashboard | Uso | Tipo |
|-----------|-----|------|
| Financial | 📊✅ | Base do DRE consolidado |
| DREDashboard | 📊✅ | Análise horizontal/vertical |
| FinancialResult | 📊✅ | DRE gerencial |
| Executive | 📈✅ | KPIs de margem e EBITDA |

**Estrutura**:
- Mensalizado (78 meses de histórico)
- Categorias: Receita, Custos, Despesas, EBITDA, Lucro Líquido
- Análise YoY e MoM

---

### auditoria_consolidada.json - 102 rows

| Dashboard | Uso | Tipo |
|-----------|-----|------|
| DataAudit | 📊✅ | Score de qualidade de dados |
| Executive | 📈✅ | Alertas de qualidade |

**Campos**:
- `tabela`: Nome da tabela auditada
- `campo`: Campo específico
- `tipo_erro`: Crítico, Aviso, Info
- `quantidade_erros`: Contador
- `impacto_financeiro`: Estimativa de impacto

---

### fat_carro_reserva.json - 2.980 rows

| Dashboard | Uso | Tipo |
|-----------|-----|------|
| Fleet | 📊✅ | Histórico de carro reserva |
| Customer | 📈✅ | Custos adicionais por cliente |

---

### fat_manutencao_unificado.json - 326.505 rows (11 chunks) ✅

| Dashboard | Uso | Tipo |
|-----------|-----|------|
| Maintenance | 📊✅ | Base principal de OS |
| Fleet | 📊✅ | Custos de manutenção por veículo |
| Customer | 📊✅ | Custos de manutenção por cliente |
| Executive | 📈✅ | KPI de custo de manutenção |

**Estrutura de Chunking** (11 partes):
- `fat_manutencao_unificado_part_1.json` (~30K rows)
- `fat_manutencao_unificado_part_2.json` (~30K rows)
- ...
- `fat_manutencao_unificado_part_11.json` (~27K rows)
- `fat_manutencao_unificado_manifest.json`

**Padrão de Consumo**:
```typescript
// Hook combina automaticamente todos os chunks
const { data } = useBIData('fat_manutencao_unificado.json');
// Retorna array de 326K rows
```

---

### fat_manutencao_completa.json - 317.992 rows (11 chunks) ✅

| Dashboard | Uso | Tipo |
|-----------|-----|------|
| Maintenance | 📈✅ | Detalhamento completo de OS (alternativa) |

**Diferença vs. fat_manutencao_unificado**:
- `fat_manutencao_unificado`: Dados consolidados (mais rápido)
- `fat_manutencao_completa`: Todos os campos (mais detalhado)

---

### historico_situacao_veiculos.json - 204.532 rows (7 chunks)

| Dashboard | Uso | Tipo |
|-----------|-----|------|
| FleetIdle | 📊✅ | Histórico de mudanças de situação |
| Fleet | 📈✅ | Timeline de eventos |

**Campos**:
- `id_veiculo`
- `situacao`: Locado, Disponível, Manutenção, Improdutivo
- `data_inicio`
- `data_fim`
- `dias_situacao`

---

## ❌ Tabelas Necessárias (NÃO Existem)

### fat_propostas_*.json (2022-2026) - ❌ NÃO EXISTE

| Dashboard Afetado | Uso Esperado | Impacto |
|------------------|--------------|---------|
| Executive | Pipeline comercial | 🔴 Crítico - KPI de pipeline não funciona |
| Commercial | Base principal | 🔴 Crítico - Dashboard sem dados |

**Fonte Esperada**: Tabela `Propostas` no SQL Server  
**Prioridade**: 🔴 Alta

**Campos Esperados**:
- `id_proposta`
- `id_cliente`
- `valor_proposta`
- `quantidade_veiculos`
- `data_proposta`
- `status`: Aberta, Ganha, Perdida
- `probabilidade`

---

### fat_vendas_*.json (2022-2026) - ❌ NÃO EXISTE

| Dashboard Afetado | Uso Esperado | Impacto |
|------------------|--------------|---------|
| Sales | Base principal | 🟡 Médio - Dashboard sem dados |
| Fleet | Histórico de desmobilização | 🟢 Baixo - Tem alternativa |

**Fonte Esperada**: Tabela `VeiculosVendidos` no SQL Server  
**Prioridade**: 🟡 Média

**Campos Esperados**:
- `id_veiculo`
- `placa`
- `data_venda`
- `valor_venda`
- `valor_fipe`
- `valor_contabil`
- `margem_lucro`
- `comprador`

---

### dim_compras.json - ❌ NÃO EXISTE

| Dashboard Afetado | Uso Esperado | Impacto |
|------------------|--------------|---------|
| Purchases | Base principal | 🟡 Médio - Dashboard sem dados |

**Fonte Esperada**: Tabela `ComprasVeiculos` no SQL Server  
**Prioridade**: 🟡 Média

---

### dim_alienacoes.json - ❌ NÃO EXISTE

| Dashboard Afetado | Uso Esperado | Impacto |
|------------------|--------------|---------|
| Purchases | Dados de financiamento | 🟡 Médio |
| Funding | Base de financiamentos | 🟢 Baixo |

**Fonte Esperada**: Tabela `AlienacaoVeiculos` no SQL Server  
**Prioridade**: 🟡 Média

---

### fat_financiamentos.json - ❌ NÃO EXISTE

| Dashboard Afetado | Uso Esperado | Impacto |
|------------------|--------------|---------|
| Funding | Base principal | 🟢 Baixo - Dashboard pouco usado |

**Fonte Esperada**: Tabela `AlienacaoVeiculos` (mesma fonte de dim_alienacoes)  
**Prioridade**: 🟢 Baixa

---

### agg_rentabilidade_contratos_mensal.json - ❌ NÃO EXISTE

| Dashboard Afetado | Uso Esperado | Impacto |
|------------------|--------------|---------|
| ContractAnalysis | Base principal | 🟡 Médio - Dashboard sem dados |

**Fonte**: View consolidada (precisa ser criada no ETL)  
**Prioridade**: 🟡 Média

**Cálculo Esperado**:
```sql
SELECT 
  id_contrato,
  ano,
  mes,
  receita_mes,
  custo_manutencao_mes,
  custo_sinistros_mes,
  custo_multas_mes,
  margem_liquida_mes,
  roi_mes
FROM (
  -- Agregação de fat_faturamentos + fat_manutencao + fat_sinistros + fat_multas
  -- Agrupado por contrato e mês
)
```

---

## 📊 Estatísticas de Uso

### Top 10 Tabelas Mais Usadas

| # | Tabela | Dashboards | % Uso | Status |
|---|--------|-----------|-------|--------|
| 1 | `dim_frota.json` | 11 | 50% | ✅ OK |
| 2 | `dim_contratos_locacao.json` | 10 | 45% | ✅ OK |
| 3 | `dim_clientes.json` | 9 | 41% | ✅ OK |
| 4 | `fat_faturamentos_*.json` | 7 | 32% | ✅ OK |
| 5 | `fat_manutencao_unificado.json` | 4 | 18% | ✅ OK |
| 6 | `fat_sinistros_*.json` | 4 | 18% | ✅ OK |
| 7 | `fat_multas_*.json` | 4 | 18% | ✅ OK |
| 8 | `fat_financeiro_universal_*_*.json` | 4 | 18% | ✅ OK |
| 9 | `agg_dre_mensal.json` | 4 | 18% | ✅ OK |
| 10 | `dim_fornecedores.json` | 2 | 9% | ✅ OK |

---

### Dashboards por Dependência de Tabelas

| Dashboard | Tabelas Usadas | Tabelas OK | Tabelas com Erro | Tabelas Faltantes | Status |
|-----------|----------------|------------|------------------|-------------------|--------|
| Fleet | 9 | 9 | 0 | 0 | ✅ 100% |
| Maintenance | 5 | 5 | 0 | 0 | ✅ 100% |
| Financial | 5 | 5 | 0 | 0 | ✅ 100% |
| DRE | 2 | 2 | 0 | 0 | ✅ 100% |
| Executive | 8 | 7 | 0 | 1 | ⚠️ 87% |
| Clients | 4 | 3 | 1 | 0 | ⚠️ 75% |
| Customer | 6 | 6 | 0 | 0 | ✅ 100% |
| Churn | 2 | 1 | 1 | 0 | ⚠️ 50% |
| Contracts | 5 | 5 | 0 | 0 | ✅ 100% |
| ContractAnalysis | 1 | 0 | 0 | 1 | ❌ 0% |
| Commercial | 2 | 1 | 0 | 1 | ❌ 50% |
| Purchases | 3 | 1 | 0 | 2 | ❌ 33% |
| Sales | 1 | 0 | 0 | 1 | ❌ 0% |
| Funding | 1 | 0 | 0 | 1 | ❌ 0% |
| Claims | 1 | 1 | 0 | 0 | ✅ 100% |
| Infractions | 1 | 1 | 0 | 0 | ✅ 100% |
| DataAudit | 1 | 1 | 0 | 0 | ✅ 100% |

---

## 🎯 Plano de Ação por Prioridade

### 🔴 Prioridade Alta (Bloqueadores)

#### 1. Corrigir fat_churn.json
- **Impacto**: 3 dashboards (Executive, Clients, Churn)
- **Tipo**: Correção de schema SQL
- **Esforço**: 2-4 horas
- **Arquivo**: [scripts/local-etl/run-sync-v2.js](../scripts/local-etl/run-sync-v2.js) - linha ~1500

#### 2. Criar fat_propostas_*.json
- **Impacto**: 2 dashboards (Executive, Commercial)
- **Tipo**: Nova query SQL
- **Esforço**: 4-8 horas
- **Fonte**: Tabela `Propostas` no SQL Server

---

### 🟡 Prioridade Média (Funcionalidade)

#### 3. Criar fat_vendas_*.json
- **Impacto**: 1 dashboard (Sales)
- **Esforço**: 3-6 horas
- **Fonte**: Tabela `VeiculosVendidos`

#### 4. Criar dim_compras.json
- **Impacto**: 1 dashboard (Purchases)
- **Esforço**: 3-6 horas
- **Fonte**: Tabela `ComprasVeiculos`

#### 5. Criar dim_alienacoes.json
- **Impacto**: 2 dashboards (Purchases, Funding)
- **Esforço**: 3-6 horas
- **Fonte**: Tabela `AlienacaoVeiculos`

#### 6. Criar agg_rentabilidade_contratos_mensal.json
- **Impacto**: 1 dashboard (ContractAnalysis)
- **Esforço**: 6-12 horas (agregação complexa)
- **Fonte**: View consolidada (fat_faturamentos + fat_manutencao + fat_sinistros + fat_multas)

---

### 🟢 Prioridade Baixa (Otimização)

#### 7. Criar fat_financiamentos.json
- **Impacto**: 1 dashboard (Funding)
- **Esforço**: 2-4 horas
- **Fonte**: Tabela `AlienacaoVeiculos` (mesma de dim_alienacoes)

---

## 📈 Métricas de Cobertura

### Status Geral
- **Total de Tabelas Planejadas**: 135
- **Tabelas Implementadas**: 128 (95%)
- **Tabelas Faltantes**: 7 (5%)
- **Tabelas com Erro**: 1 (0.7%)

### Por Categoria
| Categoria | Planejadas | Implementadas | % |
|-----------|-----------|---------------|---|
| Dimensões | 8 | 8 | 100% |
| Fatos Anuais | 25 | 25 | 100% |
| Financeiro Universal | 60 | 60 | 100% |
| Consolidados | 10 | 10 | 100% |
| **Subtotal Existente** | **103** | **103** | **100%** |
| Fatos Faltantes | 7 | 0 | 0% |
| **TOTAL** | **135** | **128** | **95%** |

### Por Dashboard
- **Dashboards Totalmente Funcionais**: 13/22 (59%)
- **Dashboards Parcialmente Funcionais**: 4/22 (18%)
- **Dashboards Sem Dados**: 5/22 (23%)

---

## 🔄 Padrões de Consumo

### Sharding de Arquivos Anuais
```typescript
// Automático via asterisco
const { data } = useBIData('fat_faturamentos_*.json');
// Busca: 2022, 2023, 2024, 2025, 2026
// Retorna: Array combinado de 174K rows
```

### Sharding de Arquivos Mensais
```typescript
// Todos os meses de todos os anos
const { data } = useBIData('fat_financeiro_universal_*_*.json');
// Busca: 2022_01 até 2026_12 (60 arquivos)
// Retorna: Array combinado de 415K rows

// Meses de um ano específico
const { data } = useBIData('fat_financeiro_universal_2024_*.json');
// Busca: 2024_01 até 2024_12 (12 arquivos)
```

### Chunking Automático
```typescript
// Hook detecta manifest e combina partes automaticamente
const { data } = useBIData('fat_manutencao_unificado.json');
// Busca: fat_manutencao_unificado_manifest.json
// Combina: _part_1.json até _part_11.json
// Retorna: Array de 326K rows
```

### Cache em Memória
```typescript
// Cache de 5 minutos (configurável)
const { data, isLoading, mutate } = useBIData('dim_frota.json');

// Forçar refresh
mutate();

// Limpar cache de todas as chaves
import { mutate as globalMutate } from 'swr';
globalMutate(
  key => typeof key === 'string' && key.includes('bi-reports'),
  undefined,
  { revalidate: true }
);
```

---

## 📚 Referências

- [FLUXO_ETL_ANALYTICS.md](./FLUXO_ETL_ANALYTICS.md) - Fluxo completo de atualização
- [CATALOGO_DASHBOARDS_ANALYTICS.md](./CATALOGO_DASHBOARDS_ANALYTICS.md) - Catálogo detalhado de dashboards
- [ETL_EXECUTION_REPORT_2026-01-05.md](./ETL_EXECUTION_REPORT_2026-01-05.md) - Relatório de execução
- [src/hooks/useBIData.ts](../src/hooks/useBIData.ts) - Implementação do hook

---

**Última Atualização**: 19 de Janeiro de 2026  
**Responsável**: Equipe BluConecta DW  
**Status**: ✅ Documentação Completa
