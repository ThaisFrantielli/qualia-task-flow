# Catálogo Completo de Dashboards Analytics

**Data de Criação**: 19 de Janeiro de 2026  
**Versão**: 1.0  
**Total de Páginas**: 22

---

## 📊 Índice de Dashboards

| # | Dashboard | Categoria | Status | Prioridade |
|---|-----------|-----------|--------|------------|
| 1 | [index.tsx](#1-nexus-intelligence-indextsx) | Hub | ✅ OK | - |
| 2 | [ExecutiveDashboard](#2-executivedashboard) | Executivo | ⚠️ Parcial | 🔴 Alta |
| 3 | [FleetDashboard](#3-fleetdashboard) | Frota | ✅ OK | - |
| 4 | [FleetIdleDashboard](#4-fleetidledashboard) | Frota | ✅ OK | - |
| 5 | [FleetMethodologyPage](#5-fleetmethodologypage) | Documentação | ✅ OK | - |
| 6 | [MaintenanceDashboard](#6-maintenancedashboard) | Manutenção | ✅ OK | - |
| 7 | [FinancialDashboard](#7-financialdashboard) | Financeiro | ✅ OK | - |
| 8 | [FinancialAnalytics](#8-financialanalytics) | Financeiro | ✅ OK | - |
| 9 | [FinancialResult](#9-financialresult) | Financeiro | ⚠️ Parcial | 🟡 Média |
| 10 | [DREDashboard](#10-dredashboard) | Financeiro | ✅ OK | - |
| 11 | [ClientsDashboard](#11-clientsdashboard) | Clientes | ⚠️ Schema Error | 🟡 Média |
| 12 | [CustomerAnalytics](#12-customeranalytics) | Clientes | ✅ OK | - |
| 13 | [ChurnDashboard](#13-churndashboard) | Clientes | ⚠️ Schema Error | 🟡 Média |
| 14 | [ContractsDashboard](#14-contractsdashboard) | Contratos | ✅ OK | - |
| 15 | [ContractAnalysisDashboard](#15-contractanalysisdashboard) | Contratos | ❌ Sem dados | 🟡 Média |
| 16 | [CommercialDashboard](#16-commercialdashboard) | Comercial | ❌ Sem dados | 🟡 Média |
| 17 | [PurchasesDashboard](#17-purchasesdashboard) | Compras | ❌ Sem dados | 🟡 Média |
| 18 | [SalesDashboard](#18-salesdashboard) | Vendas | ❌ Sem dados | 🟡 Média |
| 19 | [FundingDashboard](#19-fundingdashboard) | Financiamentos | ❌ Sem dados | 🟢 Baixa |
| 20 | [ClaimsDashboard](#20-claimsdashboard) | Sinistros | ✅ OK | - |
| 21 | [InfractionsDashboard](#21-infractionsdashboard) | Multas | ✅ OK | - |
| 22 | [DataAudit](#22-dataaudit) | Governança | ✅ OK | - |

---

## 1. Nexus Intelligence (index.tsx)

**Propósito**: Hub central de navegação para todos os dashboards  
**Tipo**: Página de entrada (menu visual)  
**Arquivo**: [src/pages/analytics/index.tsx](../src/pages/analytics/index.tsx)

### Características:
- 🎨 Design em grade com cards interativos
- 🔍 Sistema de busca por nome/descrição
- 🏷️ Filtros por categoria (Frota, Financeiro, Clientes, etc.)
- 📊 Badges de status (Novo, Atualizado, Beta)

### Tabelas Consultadas:
- Nenhuma (apenas navegação)

### Dependências:
- React Router para navegação
- Lucide Icons para ícones

### KPIs Exibidos:
- Contador de dashboards disponíveis
- Última atualização dos dados

---

## 2. ExecutiveDashboard

**Propósito**: Visão geral executiva consolidada (C-Level)  
**Tipo**: Scorecard estratégico  
**Arquivo**: [src/pages/analytics/ExecutiveDashboard.tsx](../src/pages/analytics/ExecutiveDashboard.tsx)

### Funcionalidades:
- 📊 Scorecard com 12+ KPIs consolidados
- 🎯 Análise de tendências (MoM, YoY)
- 📈 Gráficos de linha para evolução temporal
- 🔴🟡🟢 Semáforos de alertas

### Gráficos:
- `<LineChart>` (Recharts) - Evolução de receita
- `<BarChart>` (Recharts) - Comparativo mensal
- `<AreaChart>` (Recharts) - Margem operacional

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `dim_frota.json` | Total de veículos, taxa de utilização | ✅ OK |
| `dim_clientes.json` | Total de clientes ativos | ✅ OK |
| `dim_contratos_locacao.json` | Contratos ativos | ✅ OK |
| `fat_faturamentos_*.json` | Receita total, tendências | ✅ OK |
| `agg_dre_mensal.json` | EBITDA, margem operacional | ✅ OK |
| `fat_churn.json` | Taxa de churn | ⚠️ Schema Error |
| `auditoria_consolidada.json` | Score de qualidade de dados | ✅ OK |
| `fat_propostas_*.json` | Pipeline comercial | ❌ NÃO EXISTE |

### KPIs Principais:
1. **Frota**
   - Total de veículos
   - Taxa de utilização (%)
   - Veículos disponíveis para locação

2. **Financeiro**
   - Receita mensal
   - Margem operacional (%)
   - EBITDA
   - Taxa de inadimplência

3. **Clientes**
   - Total de clientes ativos
   - Churn rate (%)
   - Receita média por cliente (ARPC)

4. **Qualidade**
   - Score de qualidade de dados (0-100)
   - Alertas críticos

### Filtros:
- 📅 Período: Último mês, Trimestre, Semestre, Ano, Customizado
- 🏢 Unidade de negócio: Todas, Locação, Frotas, Terceirização
- 📊 Tipo de visualização: Cards, Gráficos, Tabela

### Hooks Utilizados:
- `useBIData('dim_frota.json')`
- `useBIData('fat_faturamentos_*.json')`
- `useBIData('agg_dre_mensal.json')`
- `useBIData('fat_churn.json')`

### Ações Necessárias:
- ⚠️ Corrigir schema de `fat_churn` (erros SQL)
- ❌ Criar `fat_propostas_*.json` para KPI de pipeline comercial

---

## 3. FleetDashboard

**Propósito**: Gestão completa da frota de veículos  
**Tipo**: Dashboard operacional  
**Arquivo**: [src/pages/analytics/FleetDashboard.tsx](../src/pages/analytics/FleetDashboard.tsx)  
**Tamanho**: 2.868 linhas (maior arquivo do projeto)

### Funcionalidades:
- 🗺️ Mapa interativo (Leaflet) com localização de veículos
- 📊 Análise de situação (Locado, Disponível, Manutenção, Improdutivo)
- 💰 Análise de TCO (Total Cost of Ownership)
- 📈 Histórico de movimentações
- 🔍 Drill-down por veículo individual
- 📄 Exportação para Excel/PDF

### Gráficos:
- `<BarChart>` - Situação de frota
- `<LineChart>` - Evolução de frota ao longo do tempo
- `<PieChart>` - Distribuição por marca/modelo
- `<ScatterChart>` - Relação idade vs. custo de manutenção
- `<Map>` (Leaflet) - Localização geográfica

### Componentes Filhos:
- `<FleetMap>` - Mapa interativo
- `<VehicleDetailModal>` - Modal com detalhes de veículo
- `<FleetTable>` - Tabela paginada com filtros avançados
- `<TCOAnalysisCard>` - Card de análise de TCO

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `dim_frota.json` | Dados mestres de veículos | ✅ OK (5.780 rows) |
| `dim_movimentacao_veiculos.json` | Histórico de movimentações | ✅ OK (6.827 rows) |
| `dim_movimentacao_patios.json` | Localizações | ✅ OK (5.560 rows) |
| `dim_contratos_locacao.json` | Contratos ativos por veículo | ✅ OK (6.962 rows) |
| `fat_manutencao_unificado.json` | Custos de manutenção | ✅ OK (326K rows, chunked) |
| `fat_carro_reserva.json` | Histórico de carro reserva | ✅ OK (2.947 rows) |
| `fat_sinistros_*.json` | Sinistros por veículo | ✅ OK (6.187 rows) |
| `fat_multas_*.json` | Multas por veículo | ✅ OK (24.320 rows) |
| `fat_movimentacao_ocorrencias.json` | Ocorrências de movimentação | ✅ OK |

### KPIs Principais:
1. **Visão Geral**
   - Total de frota
   - Veículos locados
   - Disponíveis para locação
   - Em manutenção
   - Improdutivos

2. **Financeiro**
   - Valor FIPE total da frota
   - TCO médio por veículo
   - Custo de manutenção (total e médio)
   - Custo de sinistros
   - Custo de multas

3. **Performance**
   - Taxa de utilização (%)
   - Idade média da frota (anos)
   - Km média da frota
   - Tempo médio em manutenção (dias)

### Filtros Avançados:
- 📅 Período de análise
- 🚗 Situação (Locado, Disponível, Manutenção, Improdutivo)
- 🏢 Cliente (para veículos locados)
- 🏭 Marca/Modelo
- 📍 Pátio/Localização
- 📆 Ano de fabricação
- 🔢 Faixa de Km rodados

### Abas:
1. **Visão Geral** - KPIs e gráficos principais
2. **Mapa** - Localização geográfica
3. **Lista de Veículos** - Tabela completa com filtros
4. **TCO Analysis** - Análise de custo total
5. **Histórico** - Timeline de eventos

### Hooks Utilizados:
- `useBIData('dim_frota.json')`
- `useBIData('fat_manutencao_unificado.json')`
- `useBIData('fat_sinistros_*.json')`
- `useBIData('fat_multas_*.json')`
- `useTimelineData()` (hook customizado)

### Exportação:
- Excel: Tabela completa de veículos
- PDF: Relatório executivo com gráficos
- CSV: Dados brutos para análise externa

---

## 4. FleetIdleDashboard

**Propósito**: Análise de frota improdutiva/ociosa  
**Tipo**: Dashboard operacional especializado  
**Arquivo**: [src/pages/analytics/FleetIdleDashboard.tsx](../src/pages/analytics/FleetIdleDashboard.tsx)

### Funcionalidades:
- 📊 Análise de veículos improdutivos (não gerando receita)
- 📈 Histórico de dias improdutivos (30/90/180 dias)
- 🔍 Drill-down por veículo com timeline
- 📅 Análise de tendências (semanal, mensal)
- 💡 Recomendações de ação (vender, locar, manutenção)

### Gráficos:
- `<BarChart>` - Top 10 veículos com mais dias improdutivos
- `<LineChart>` - Evolução de improdutividade ao longo do tempo
- `<HeatMap>` - Calendário de disponibilidade
- `<TreeMap>` - Distribuição por motivo de improdutividade

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `dim_frota.json` | Situação atual dos veículos | ✅ OK |
| `dim_movimentacao_veiculos.json` | Histórico de movimentações | ✅ OK |
| `dim_movimentacao_patios.json` | Localização atual | ✅ OK |
| `historico_situacao_veiculos.json` | Histórico de mudanças de situação | ✅ OK (204K rows) |

### KPIs Principais:
1. **Improdutividade Atual**
   - Veículos improdutivos
   - % da frota improdutiva
   - Dias médios improdutivos
   - Valor FIPE improdutivo

2. **Motivos**
   - Aguardando documentação
   - Aguardando reparo
   - Sem demanda
   - Outros

3. **Histórico**
   - Dias improdutivos (últimos 30/90/180 dias)
   - Tendência (crescente/decrescente)
   - Pico de improdutividade

### Filtros:
- 📅 Período de análise (30/90/180 dias)
- 🏭 Marca/Modelo
- 📍 Pátio
- 📆 Ano de fabricação
- 🔍 Motivo de improdutividade

### Ações Recomendadas:
- 🔴 **Crítico** (>90 dias): Considerar venda
- 🟡 **Atenção** (30-90 dias): Analisar viabilidade de locação
- 🟢 **Normal** (<30 dias): Manter monitoramento

### Hooks Utilizados:
- `useBIData('dim_frota.json')`
- `useBIData('historico_situacao_veiculos.json')`
- `useIdleAnalysis()` (hook customizado)

---

## 5. FleetMethodologyPage

**Propósito**: Documentação da metodologia de cálculos de frota  
**Tipo**: Página de documentação técnica  
**Arquivo**: [src/pages/analytics/FleetMethodologyPage.tsx](../src/pages/analytics/FleetMethodologyPage.tsx)

### Conteúdo:
- 📖 Definições de KPIs (Taxa de Utilização, TCO, etc.)
- 🧮 Fórmulas de cálculo
- 📊 Exemplos práticos
- 🔍 Fontes de dados para cada métrica
- ❓ FAQ

### Estrutura:
1. **Taxa de Utilização**
   ```
   Taxa de Utilização = (Veículos Locados / Total de Frota Disponível) × 100
   ```

2. **TCO (Total Cost of Ownership)**
   ```
   TCO = Valor de Aquisição + Manutenção + Sinistros + Multas - Valor Residual
   ```

3. **Custo por Km**
   ```
   Custo/Km = Total de Custos / Total de Km Rodados
   ```

### Tabelas Consultadas:
- Nenhuma (apenas documentação estática)

---

## 6. MaintenanceDashboard

**Propósito**: Gestão de manutenção de veículos  
**Tipo**: Dashboard operacional multi-abas  
**Arquivo**: [src/pages/analytics/MaintenanceDashboard.tsx](../src/pages/analytics/MaintenanceDashboard.tsx)

### Funcionalidades:
- 📊 Análise de ordens de serviço (OS)
- ⏱️ Monitoramento de SLA e lead time
- 💰 Análise de custos de manutenção
- 🔍 Drill-down por veículo, fornecedor, tipo de serviço
- 📈 Tendências de manutenção preventiva vs. corretiva
- 🚨 Alertas de manutenção crítica

### Abas (Lazy Loading):
1. **Visão Geral** - KPIs consolidados
2. **Operacional** - OS abertas, em andamento, concluídas
3. **Performance/SLA** - Lead time, MTTR, MTBF
4. **Custos/ROI** - Análise financeira de manutenção
5. **Workflow** - Fluxo de aprovação de OS
6. **Fluxo** - Diagrama de processos
7. **Auditoria** - Logs de alterações
8. **Detalhamento** - Análise por item de OS

### Gráficos:
- `<BarChart>` - OS por status
- `<LineChart>` - Evolução de custos
- `<PieChart>` - Manutenção preventiva vs. corretiva
- `<ScatterChart>` - Relação custo vs. tempo de reparo
- `<GanttChart>` - Timeline de OS (aba Workflow)

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `fat_manutencao_unificado.json` | OS consolidadas | ✅ OK (326K rows, 11 chunks) |
| `fat_manutencao_completa.json` | Detalhes de OS | ✅ OK (318K rows, 11 chunks) |
| `fat_detalhe_itens_os_*.json` | Itens de serviço | ✅ OK (278K rows) |
| `dim_fornecedores.json` | Fornecedores de serviço | ✅ OK (4.227 rows) |
| `agg_lead_time_etapas.json` | Métricas de performance | ✅ OK (111K rows) |

### KPIs Principais:
1. **Operacionais**
   - OS abertas
   - OS em andamento
   - OS concluídas
   - OS atrasadas
   - Lead time médio (dias)

2. **Financeiros**
   - Custo total de manutenção
   - Custo médio por OS
   - Custo por veículo
   - % Preventiva vs. Corretiva

3. **Performance**
   - MTTR (Mean Time To Repair) - Tempo médio de reparo
   - MTBF (Mean Time Between Failures) - Tempo médio entre falhas
   - SLA de atendimento (%)
   - Taxa de retrabalho (%)

### Filtros:
- 📅 Período
- 🚗 Veículo
- 🏭 Fornecedor
- 📋 Tipo de serviço (Preventiva, Corretiva, Preditiva)
- 📊 Status (Aberta, Em andamento, Concluída, Cancelada)
- 💰 Faixa de valor

### Context API:
```typescript
<MaintenanceContext.Provider value={{ filters, setFilters }}>
  <MaintenanceDashboard />
</MaintenanceContext.Provider>
```

### Hooks Utilizados:
- `useBIData('fat_manutencao_unificado.json')`
- `useBIData('fat_detalhe_itens_os_*.json')`
- `useMaintenanceAlerts()` (hook customizado)

### Alertas:
- 🔴 **Crítico**: OS atrasadas >30 dias
- 🟡 **Atenção**: Veículos sem manutenção preventiva >6 meses
- 🟢 **Info**: Manutenções programadas próximas

---

## 7. FinancialDashboard

**Propósito**: Análise financeira consolidada  
**Tipo**: Dashboard financeiro multi-abas  
**Arquivo**: [src/pages/analytics/FinancialDashboard.tsx](../src/pages/analytics/FinancialDashboard.tsx)

### Abas:
1. **Visão Geral** - KPIs consolidados
2. **DRE** - Demonstração do Resultado do Exercício
3. **Cash Flow** - Fluxo de caixa
4. **Inadimplência** - Análise de inadimplência
5. **Detalhamento** - Drill-down por cliente/contrato

### Gráficos:
- `<LineChart>` - Evolução de receita
- `<BarChart>` - Comparativo de despesas
- `<AreaChart>` - Fluxo de caixa acumulado
- `<WaterfallChart>` - DRE em cascata
- `<PieChart>` - Composição de receitas

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `fat_faturamentos_*.json` | Receita bruta | ✅ OK (174K rows) |
| `fat_financeiro_universal_*_*.json` | Lançamentos financeiros | ✅ OK (415K rows, 60 meses) |
| `agg_dre_mensal.json` | DRE consolidado | ✅ OK (78 rows) |
| `fat_inadimplencia.json` | Títulos inadimplentes | ✅ OK (0 rows - esperado) |
| `dim_clientes.json` | Dados de clientes | ✅ OK |

### KPIs Principais:
1. **Receita**
   - Receita total
   - Receita média mensal
   - Crescimento MoM (%)
   - Crescimento YoY (%)

2. **Margens**
   - Margem bruta (%)
   - Margem operacional (%)
   - EBITDA
   - Margem líquida (%)

3. **Inadimplência**
   - Taxa de inadimplência (%)
   - Valor inadimplente
   - DMR (Dias Médios de Recebimento)
   - Provisão para perdas

### Filtros:
- 📅 Período (mensal, trimestral, anual)
- 🏢 Unidade de negócio
- 🏷️ Tipo de receita (Locação, Serviços, Vendas)
- 👤 Cliente (para drill-down)

### Hooks Utilizados:
- `useBIData('fat_faturamentos_*.json')`
- `useBIData('fat_financeiro_universal_*_*.json')`
- `useBIData('agg_dre_mensal.json')`

---

## 8. FinancialAnalytics

**Propósito**: Auditoria de receita (Revenue Assurance)  
**Tipo**: Dashboard de análise detalhada  
**Arquivo**: [src/pages/analytics/FinancialAnalytics.tsx](../src/pages/analytics/FinancialAnalytics.tsx)

### Funcionalidades:
- 🔍 Análise de divergências entre faturamento e contratos
- 📊 Comparação de receita realizada vs. projetada
- 💡 Identificação de oportunidades de cobrança
- 🚨 Alertas de anomalias financeiras

### Gráficos:
- `<BarChart>` - Realizado vs. Projetado
- `<LineChart>` - Evolução de divergências
- `<HeatMap>` - Clientes com maior divergência

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `fat_faturamentos_*.json` | Receita realizada | ✅ OK |
| `dim_contratos_locacao.json` | Receita projetada | ✅ OK |
| `dim_clientes.json` | Dados de clientes | ✅ OK |

### KPIs:
- Divergência total (R$)
- % Divergência
- Clientes com divergência
- Oportunidades identificadas

---

## 9. FinancialResult

**Propósito**: DRE Gerencial (Resultado Econômico)  
**Tipo**: Dashboard financeiro  
**Arquivo**: [src/pages/analytics/FinancialResult.tsx](../src/pages/analytics/FinancialResult.tsx)

### Funcionalidades:
- 📊 DRE gerencial detalhado
- 📈 Análise de resultado econômico
- 💰 Comparação orçado vs. realizado

### Gráficos:
- `<WaterfallChart>` (Tremor) - DRE em cascata
- `<BarChart>` - Comparativo de períodos

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `agg_dre_mensal.json` | DRE consolidado | ✅ OK |
| `fat_financeiro_universal_*_*.json` | Lançamentos detalhados | ✅ OK |
| `fat_lancamentos_*.json` | Lançamentos específicos | ⚠️ MAPEAR (usar fat_financeiro_universal) |

### Ações Necessárias:
- ⚠️ Verificar se `fat_lancamentos_*.json` é necessário ou se `fat_financeiro_universal` é suficiente

---

## 10. DREDashboard

**Propósito**: DRE detalhado com análise horizontal/vertical  
**Tipo**: Dashboard financeiro especializado  
**Arquivo**: [src/pages/analytics/DREDashboard.tsx](../src/pages/analytics/DREDashboard.tsx)

### Funcionalidades:
- 📊 DRE completo (Receita, Custos, Despesas, Lucro)
- 📈 Análise horizontal (comparação de períodos)
- 📉 Análise vertical (% sobre receita)
- 🎯 Drill-down por centro de custo

### Componentes:
- `<DRETable>` - Tabela estruturada de DRE
- `<DREChart>` - Gráfico de cascata
- `<AnalysisTab>` - Abas de análise

### Hooks Especializados:
- `useDREData()` - Hook customizado que consome `agg_dre_mensal.json`

### Utilitários:
- `dreCalculations.ts` - Funções de cálculo de margens
- `dreFormatters.ts` - Formatação de valores

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `agg_dre_mensal.json` | Dados base do DRE | ✅ OK (78 meses) |

### KPIs:
- Receita Total
- Custo Total
- EBITDA
- Lucro Líquido
- Margem de Lucro (%)
- ROE (Return on Equity)

---

## 11. ClientsDashboard

**Propósito**: Análise de carteira de clientes  
**Tipo**: Dashboard comercial  
**Arquivo**: [src/pages/analytics/ClientsDashboard.tsx](../src/pages/analytics/ClientsDashboard.tsx)

### Funcionalidades:
- 📊 Análise de base de clientes
- 💰 Receita por cliente (ARPC)
- 📈 Análise de crescimento/churn
- 🏆 Curva ABC de clientes
- 🔍 Drill-down por cliente

### Gráficos:
- `<BarChart>` - Top clientes por receita
- `<LineChart>` - Evolução de base de clientes
- `<PieChart>` - Segmentação por porte
- `<ScatterChart>` - Relação receita vs. veículos

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `dim_clientes.json` | Dados mestres de clientes | ✅ OK (1.577 rows) |
| `dim_contratos_locacao.json` | Contratos por cliente | ✅ OK |
| `fat_faturamentos_*.json` | Receita por cliente | ✅ OK |
| `fat_churn.json` | Clientes cancelados | ⚠️ Schema Error |

### KPIs:
1. **Base de Clientes**
   - Total de clientes
   - Clientes ativos
   - Clientes inativos
   - Novos clientes (período)
   - Clientes perdidos (churn)

2. **Receita**
   - Receita total
   - ARPC (Average Revenue Per Customer)
   - Crescimento de receita (%)

3. **Curva ABC**
   - Classe A (80% da receita)
   - Classe B (15% da receita)
   - Classe C (5% da receita)

### Ações Necessárias:
- ⚠️ Corrigir schema de `fat_churn.json`

---

## 12. CustomerAnalytics

**Propósito**: Análise detalhada por cliente individual  
**Tipo**: Dashboard de drill-down  
**Arquivo**: [src/pages/analytics/CustomerAnalytics.tsx](../src/pages/analytics/CustomerAnalytics.tsx)

### Funcionalidades:
- 👤 Seleção de cliente via dropdown/busca
- 📊 Visão 360° do cliente (faturamento, contratos, custos)
- 📈 Histórico completo de transações
- 🚗 Veículos locados pelo cliente
- 💰 Análise de rentabilidade

### Gráficos:
- `<LineChart>` - Evolução de faturamento
- `<BarChart>` - Custos por categoria (manutenção, sinistros, multas)

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `dim_clientes.json` | Dados do cliente | ✅ OK |
| `dim_contratos_locacao.json` | Contratos do cliente | ✅ OK |
| `fat_faturamentos_*.json` | Faturamento do cliente | ✅ OK |
| `fat_manutencao_unificado.json` | Custos de manutenção | ✅ OK |
| `fat_sinistros_*.json` | Custos de sinistros | ✅ OK |
| `fat_multas_*.json` | Custos de multas | ✅ OK |

### KPIs por Cliente:
- Faturamento total
- Contratos ativos
- Veículos locados
- Custo total (manutenção + sinistros + multas)
- % Custo sobre faturamento
- Rentabilidade

---

## 13. ChurnDashboard

**Propósito**: Análise de cancelamentos  
**Tipo**: Dashboard analítico  
**Arquivo**: [src/pages/analytics/ChurnDashboard.tsx](../src/pages/analytics/ChurnDashboard.tsx)

### Funcionalidades:
- 📊 Taxa de churn mensal/anual
- 📉 Análise de motivos de cancelamento
- 💰 Receita perdida (MRR Lost)
- 🔍 Identificação de clientes em risco

### Gráficos:
- `<LineChart>` - Evolução de churn rate
- `<BarChart>` - Motivos de cancelamento
- `<PieChart>` - Segmentação de churn por porte de cliente

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `fat_churn.json` | Dados de churn | ⚠️ Schema Error (1.653 rows) |
| `dim_clientes.json` | Dados de clientes | ✅ OK |

### KPIs:
- Contratos cancelados
- Churn rate (%)
- MRR perdido
- Duração média de contrato (meses)
- Tempo de vida médio do cliente (LTV)

### Ações Necessárias:
- ⚠️ Corrigir schema SQL de `fat_churn`

---

## 14. ContractsDashboard

**Propósito**: Gestão de contratos (visão 360°)  
**Tipo**: Dashboard operacional  
**Arquivo**: [src/pages/analytics/ContractsDashboard.tsx](../src/pages/analytics/ContractsDashboard.tsx)

### Abas:
1. **Visão Geral** - KPIs consolidados
2. **Desempenho** - Performance de contratos
3. **Carteira** - Contratos ativos/inativos
4. **Rentabilidade** - Análise de margem

### Gráficos:
- `<BarChart>` - Contratos por status
- `<LineChart>` - Evolução de carteira
- `<DonutChart>` (Tremor) - Distribuição por tipo de contrato

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `dim_contratos_locacao.json` | Dados de contratos | ✅ OK (6.962 rows) |
| `dim_itens_contrato.json` | Itens de contrato | ✅ OK (2.598 rows) |
| `dim_regras_contrato.json` | Regras comerciais | ✅ OK (77K rows) |
| `fat_faturamentos_*.json` | Receita por contrato | ✅ OK |
| `rentabilidade_360_geral.json` | Análise de rentabilidade | ✅ OK (5.780 rows) |

### KPIs:
- Total de contratos ativos
- Contratos a vencer (30/60/90 dias)
- Veículos contratados
- Receita mensal recorrente (MRR)
- Ticket médio por contrato

---

## 15. ContractAnalysisDashboard

**Propósito**: Análise de rentabilidade de contratos  
**Tipo**: Dashboard analítico  
**Arquivo**: [src/pages/analytics/ContractAnalysisDashboard.tsx](../src/pages/analytics/ContractAnalysisDashboard.tsx)

### Funcionalidades:
- 📊 Análise histórica de rentabilidade
- 📈 Simulação de reequilíbrio de contratos
- 🎯 Classificação de contratos (rentável/marginal/prejuízo)
- 💡 Recomendações de ação

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `agg_rentabilidade_contratos_mensal.json` | Rentabilidade por contrato | ❌ NÃO EXISTE |

### Ações Necessárias:
- ❌ Criar agregação `agg_rentabilidade_contratos_mensal` no ETL

---

## 16. CommercialDashboard

**Propósito**: Pipeline comercial e vendas  
**Tipo**: Dashboard comercial  
**Arquivo**: [src/pages/analytics/CommercialDashboard.tsx](../src/pages/analytics/CommercialDashboard.tsx)

### Funcionalidades:
- 📊 Funil de vendas (pipeline)
- 🎯 Taxa de conversão
- 💰 Valor do pipeline
- 📈 Previsão de fechamento

### Gráficos:
- `<FunnelChart>` (Recharts) - Funil de vendas
- `<BarChart>` - Propostas por status
- `<LineChart>` - Taxa de conversão ao longo do tempo

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `fat_propostas_*.json` | Propostas comerciais | ❌ NÃO EXISTE |
| `dim_contratos_locacao.json` | Contratos fechados | ✅ OK |

### KPIs Esperados:
- Propostas abertas
- Taxa de conversão (%)
- Pipeline (valor total)
- Ticket médio
- Veículos propostos

### Ações Necessárias:
- ❌ Criar `fat_propostas_*.json` no ETL (fonte: tabela Propostas no SQL Server)

---

## 17. PurchasesDashboard

**Propósito**: Aquisição de veículos  
**Tipo**: Dashboard operacional  
**Arquivo**: [src/pages/analytics/PurchasesDashboard.tsx](../src/pages/analytics/PurchasesDashboard.tsx)

### Funcionalidades:
- 📊 Análise de compras de veículos
- 💰 Valor investido vs. FIPE
- 📈 Análise YoY de investimentos

### Gráficos:
- `<BarChart>` - Compras por mês
- `<LineChart>` - Evolução de investimento
- `<ScatterChart>` - Relação preço vs. FIPE
- `<PieChart>` - Distribuição por marca

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `dim_compras.json` | Dados de compras | ❌ NÃO EXISTE |
| `dim_alienacoes.json` | Dados de financiamentos | ❌ NÃO EXISTE |
| `dim_frota.json` | Frota atual | ✅ OK |

### Ações Necessárias:
- ❌ Criar `dim_compras` (fonte: ComprasVeiculos)
- ❌ Criar `dim_alienacoes` (fonte: AlienacaoVeiculos)

---

## 18. SalesDashboard

**Propósito**: Desmobilização de ativos (vendas)  
**Tipo**: Dashboard operacional  
**Arquivo**: [src/pages/analytics/SalesDashboard.tsx](../src/pages/analytics/SalesDashboard.tsx)

### Funcionalidades:
- 📊 Análise de vendas de veículos
- 💰 Margem de lucro (preço venda vs. valor contábil)
- 📈 ROI de veículos vendidos

### Gráficos:
- `<BarChart>` - Vendas por mês
- `<LineChart>` - Evolução de margem
- `<ScatterChart>` - Relação idade vs. valor de venda

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `fat_vendas_*.json` | Dados de vendas | ❌ NÃO EXISTE |

### KPIs Esperados:
- Total de vendas
- Margem total (R$)
- ROI médio (%)
- Idade média dos veículos vendidos
- % Vendas com lucro vs. prejuízo

### Ações Necessárias:
- ❌ Criar `fat_vendas_*.json` (fonte: VeiculosVendidos)

---

## 19. FundingDashboard

**Propósito**: Gestão de financiamentos  
**Tipo**: Dashboard financeiro  
**Arquivo**: [src/pages/analytics/FundingDashboard.tsx](../src/pages/analytics/FundingDashboard.tsx)

### Funcionalidades:
- 📊 Saldo de financiamentos (alienações)
- 💰 Fluxo de pagamento mensal
- 📈 Análise de concentração de risco

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `fat_financiamentos.json` | Dados de financiamentos | ❌ NÃO EXISTE |

### KPIs Esperados:
- Saldo total de financiamentos
- Fluxo mensal (pagamentos)
- Quantidade de contratos
- Taxa média ponderada
- Concentração (top 5 bancos)

### Ações Necessárias:
- ❌ Criar `fat_financiamentos` (fonte: AlienacaoVeiculos)

---

## 20. ClaimsDashboard

**Propósito**: Gestão de sinistros  
**Tipo**: Dashboard operacional  
**Arquivo**: [src/pages/analytics/ClaimsDashboard.tsx](../src/pages/analytics/ClaimsDashboard.tsx)

### Funcionalidades:
- 📊 Análise de sinistros
- 💰 Valor de sinistros vs. recuperação
- 📈 Taxa de recuperação
- 🔍 Drill-down por veículo/cliente

### Gráficos:
- `<BarChart>` - Sinistros por mês
- `<LineChart>` - Taxa de recuperação

### Context API:
```typescript
<ClaimsContext.Provider value={{ filters, setFilters }}>
  <ClaimsDashboard />
</ClaimsContext.Provider>
```

### Componentes:
- `<ClaimsOverview>` - Visão geral
- `<ClaimsTable>` - Tabela de sinistros
- `<ClaimsChart>` - Gráficos

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `fat_sinistros_*.json` | Dados de sinistros | ✅ OK (6.187 rows) |

### KPIs:
- Valor total de sinistros
- Valor recuperado
- Taxa de recuperação (%)
- Custo líquido de sinistros
- Quantidade de sinistros

---

## 21. InfractionsDashboard

**Propósito**: Gestão de multas e infrações  
**Tipo**: Dashboard operacional  
**Arquivo**: [src/pages/analytics/InfractionsDashboard.tsx](../src/pages/analytics/InfractionsDashboard.tsx)

### Funcionalidades:
- 📊 Análise de multas
- 💰 Valor de multas vs. reembolso
- 📈 Análise de pontos na CNH
- 🔍 Top infratores

### Gráficos:
- `<BarChart>` - Multas por mês
- `<PieChart>` - Tipo de infração

### Context API:
```typescript
<InfractionsContext.Provider value={{ filters, setFilters }}>
  <InfractionsDashboard />
</InfractionsContext.Provider>
```

### Componentes:
- `<InfractionsOverview>` - Visão geral
- `<InfractionsTable>` - Tabela de multas
- `<InfractionsChart>` - Gráficos

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `fat_multas_*.json` | Dados de multas | ✅ OK (24.320 rows) |

### KPIs:
- Valor total de multas
- Valor reembolsado (cliente)
- Valor líquido (empresa)
- Total de pontos
- Top infratores (veículos/condutores)

---

## 22. DataAudit

**Propósito**: Monitoramento de qualidade de dados  
**Tipo**: Dashboard de governança  
**Arquivo**: [src/pages/analytics/DataAudit.tsx](../src/pages/analytics/DataAudit.tsx)

### Funcionalidades:
- 📊 Score de qualidade de dados (0-100)
- 🚨 Alertas de inconsistências
- 📈 Tendências de qualidade
- 🔍 Drill-down por tabela/campo

### Gráficos:
- `<RadialChart>` - Score de qualidade
- `<BarChart>` - Erros por gravidade

### Tabelas Consultadas:
| Tabela | Uso | Status |
|--------|-----|--------|
| `auditoria_consolidada.json` | Logs de auditoria | ✅ OK (102 rows) |

### KPIs:
- Score de qualidade (ponderado)
- Erros críticos
- Avisos
- Impacto financeiro estimado (erros críticos)

### Dimensões de Qualidade:
1. **Completude** - Campos obrigatórios preenchidos
2. **Consistência** - Valores dentro do esperado
3. **Unicidade** - Ausência de duplicados
4. **Atualidade** - Dados recentes

---

## 📋 Resumo de Status

### ✅ Dashboards Funcionais (17/22)
- ExecutiveDashboard (parcial)
- FleetDashboard
- FleetIdleDashboard
- FleetMethodologyPage
- MaintenanceDashboard
- FinancialDashboard
- FinancialAnalytics
- FinancialResult (parcial)
- DREDashboard
- ClientsDashboard (parcial)
- CustomerAnalytics
- ChurnDashboard (parcial)
- ContractsDashboard
- ClaimsDashboard
- InfractionsDashboard
- DataAudit
- index.tsx

### ⚠️ Dashboards com Dados Parciais (3/22)
- ExecutiveDashboard - Falta `fat_propostas`
- FinancialResult - Verificar mapeamento
- ClientsDashboard - Schema error em `fat_churn`
- ChurnDashboard - Schema error em `fat_churn`

### ❌ Dashboards Sem Dados (5/22)
- ContractAnalysisDashboard - Falta `agg_rentabilidade_contratos_mensal`
- CommercialDashboard - Falta `fat_propostas`
- PurchasesDashboard - Falta `dim_compras`, `dim_alienacoes`
- SalesDashboard - Falta `fat_vendas`
- FundingDashboard - Falta `fat_financiamentos`

---

## 🎯 Prioridades de Implementação

### 🔴 Alta (Bloqueadores)
1. Criar `fat_propostas_*.json` → ExecutiveDashboard, CommercialDashboard
2. Corrigir schema de `fat_churn.json` → ClientsDashboard, ChurnDashboard

### 🟡 Média (Funcionalidade)
1. Criar `fat_vendas_*.json` → SalesDashboard
2. Criar `dim_compras.json` → PurchasesDashboard
3. Criar `dim_alienacoes.json` → PurchasesDashboard
4. Criar `agg_rentabilidade_contratos_mensal.json` → ContractAnalysisDashboard
5. Criar `fat_financiamentos.json` → FundingDashboard

### 🟢 Baixa (Otimização)
1. Validar mapeamento `fat_lancamentos` vs. `fat_financeiro_universal`
2. Adicionar compressão gzip nos uploads
3. Implementar cache mais agressivo (15-30 min)

---

**Última Atualização**: 19 de Janeiro de 2026  
**Total de Tabelas ETL**: 128 arquivos JSON  
**Total de Registros**: 1.941.404  
**Tamanho Total**: 590 MB
