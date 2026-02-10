# Refatoração ETL - Dashboard de Frota Exclusivo

**Data**: 10 de Fevereiro de 2026  
**Objetivo**: Manter apenas o Dashboard de Frota e remover todos os demais dashboards e suas respectivas tabelas do ETL.

---

## 📊 Dashboards Mantidos (3)

### Hub de Ativos - Frota
1. **FleetDashboard** (`/analytics/frota`)
   - Gestão completa da frota de veículos
   - Análise de situação, TCO, movimentações
   - Mapa interativo e drill-down por veículo

2. **FleetIdleDashboard** (`/analytics/frota-idle`)
   - Análise de frota improdutiva/ociosa
   - Histórico de dias improdutivos
   - Recomendações de ação

3. **FleetMethodologyPage** (`/analytics/frota-metodologia`)
   - Documentação de metodologia de cálculos
   - Definições de KPIs e fórmulas
   - Fontes de dados

---

## 🗑️ Dashboards Removidos (17)

### Executivo (1)
- ❌ ExecutiveDashboard

### Financeiro (4)
- ❌ FinancialDashboard
- ❌ FinancialAnalytics
- ❌ FinancialResult
- ❌ DREDashboard

### Clientes (3)
- ❌ ClientsDashboard
- ❌ CustomerAnalytics
- ❌ ChurnDashboard

### Contratos (2)
- ❌ ContractsDashboard
- ❌ ContractAnalysisDashboard

### Comercial (1)
- ❌ CommercialDashboard

### Operacional (3)
- ❌ MaintenanceDashboard  
- ❌ InfractionsDashboard
- ❌ ClaimsDashboard

### Compras/Vendas (2)
- ❌ PurchasesDashboard
- ❌ SalesDashboard

### Auditoria (1)
- ❌ DataAudit

---

## 📦 Tabelas ETL Mantidas

### Dimensões (4)
| Tabela | Uso | Registros |
|--------|-----|-----------|
| `dim_frota.json` | Dados mestres de veículos | 5.780 |
| `dim_movimentacao_veiculos.json` | Histórico de movimentações | 6.827 |
| `dim_movimentacao_patios.json` | Localizações | 5.560 |
| `dim_contratos_locacao.json` | Contratos ativos | 6.962 |

### Fatos Consolidados (3)
| Tabela | Uso | Registros |
|--------|-----|-----------|
| `hist_vida_veiculo_timeline` | Timeline completa de eventos | >100K |
| `fat_carro_reserva.json` | Histórico de carro reserva | 2.947 |
| `fat_manutencao_unificado.json` | Custos de manutenção (chunked) | 326K |
| `fat_movimentacao_ocorrencias.json` | Workflow de ocorrências | - |

### Fatos Anuais (2 tipos × 5 anos = 10 arquivos)
| Tabela | Anos | Total Registros |
|--------|------|------------------|
| `fat_sinistros_*.json` | 2022-2026 | 6.187 |
| `fat_multas_*.json` | 2022-2026 | 24.320 |

**Total de Tabelas Mantidas**: 17  
**Total de Registros**: ~478K

---

## 🗑️ Tabelas ETL Removidas

### Dimensões Removidas (8)
- ❌ dim_alienacoes
- ❌ dim_clientes
- ❌ dim_condutores
- ❌ dim_fornecedores
- ❌ dim_veiculos_acessorios
- ❌ dim_itens_contrato
- ❌ dim_regras_contrato
- ❌ dim_compras

### Consolidados Removidos (12)
- ❌ fat_historico_mobilizacao
- ❌ rentabilidade_360_geral
- ❌ fat_churn
- ❌ fat_inadimplencia
- ❌ agg_dre_mensal
- ❌ fato_financeiro_dre
- ❌ auditoria_consolidada
- ❌ agg_kpis_manutencao_mensal
- ❌ agg_lead_time_etapas
- ❌ agg_funil_conversao
- ❌ agg_performance_usuarios
- ❌ agg_rentabilidade_contratos_mensal
- ❌ agg_custos_detalhados

### Fatos Anuais Removidos (4 tipos × 5 anos = 20 arquivos)
- ❌ fat_faturamentos_* (2022-2026)
- ❌ fat_detalhe_itens_os_* (2022-2026)
- ❌ fat_ocorrencias_master_* (2022-2026)
- ❌ fat_propostas_blufleet_* (2022-2026)
- ❌ fat_vendas_* (2022-2026)

### Fatos Mensais Removidos (~60 arquivos)
- ❌ fat_financeiro_universal_* (2022-01 a 2026-12)

**Total de Tabelas Removidas**: ~100  
**Redução de Processamento**: ~85%

---

## 🎯 Melhorias de Performance Esperadas

### Tempo de Execução
- **Antes**: ~97 segundos (1min 37s)
- **Esperado**: ~15-20 segundos
- **Redução**: ~80%

### Volume de Dados
- **Antes**: 1.913.748 registros / 590 MB
- **Esperado**: ~478.000 registros / ~120 MB
- **Redução**: ~75%

### Uploads Supabase
- **Antes**: 129 arquivos JSON
- **Esperado**: ~17 arquivos JSON
- **Redução**: ~87%

---

## 📝 Arquivos Modificados

### Frontend
1. ✅ `src/pages/analytics/index.tsx` - Mantido apenas Hub de Frota
2. ✅ `src/App.tsx` - Removidas rotas de dashboards excluídos
3. ✅ Removidos 17 arquivos `.tsx` de dashboards

### Backend (ETL)
1. 🔄 `scripts/local-etl/run-sync-v2.js` - Simplificado para Frota apenas
2. ✅ `scripts/local-etl/run-sync-v2.js.backup` - Backup do original

### Documentação
1. ✅ `REFATORACAO_ETL_FROTA.md` - Este arquivo

---

## 🚀 Próximos Passos

1. ✅ Remover dashboards não utilizados  
2. ✅ Atualizar rotas e navegação  
3. 🔄 Simplificar queries do ETL  
4. ⏳ Executar ETL simplificado  
5. ⏳ Validar funcionamento dos dashboards de Frota
6. ⏳ Limpar arquivos JSON antigos no Supabase Storage

---

**Status**: ✅ Refatoração de Frontend concluída | 🔄 Refatoração de ETL em andamento
