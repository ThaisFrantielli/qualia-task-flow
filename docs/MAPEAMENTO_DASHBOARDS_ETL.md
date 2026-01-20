# Mapeamento de Dashboards para Novas Tabelas ETL

## Status: Em Andamento
**Data**: 05/01/2026  
**Objetivo**: Ajustar todos os dashboards para utilizar as novas tabelas geradas pelo ETL otimizado

---

## Estrutura do Sistema

### Hook de Dados: `useBIData`
- **Localização**: `src/hooks/useBIData.ts`
- **Funcionamento**: Busca arquivos JSON do bucket `bi-reports` no Supabase Storage
- **Suporte a Sharding**:
  - `*` = Arquivos anuais (ex: `fat_faturamento_*.json` → `fat_faturamento_2022.json`, `fat_faturamento_2023.json`, etc.)
  - `*_*` = Arquivos mensais (ex: `fat_financeiro_universal_*_*.json` → `fat_financeiro_universal_2022_01.json`, etc.)

---

## Mapeamento de Arquivos: Antigos → Novos

### ✅ Dimensões (Já Corretas)
Essas tabelas já estão sendo geradas pelo ETL e os dashboards já as utilizam:

| Arquivo Atual | Tabela ETL | Status | Usado Por |
|--------------|-----------|--------|-----------|
| `dim_clientes.json` | `dim_clientes` | ✅ OK | ClientsDashboard, ExecutiveDashboard, CustomerAnalytics |
| `dim_fornecedores.json` | `dim_fornecedores` | ✅ OK | MaintenanceDashboard |
| `dim_frota.json` | `dim_frota` | ✅ OK | FleetDashboard, ExecutiveDashboard, PurchasesDashboard |
| `dim_contratos.json` | `dim_contratos_locacao` | ⚠️ **RENOMEAR** | ExecutiveDashboard, ContractsDashboard, CommercialDashboard |

**Ação 1**: Verificar se `dim_contratos.json` deve mapear para `dim_contratos_locacao` ou se precisamos criar um consolidado.

---

### ✅ Fatos Consolidados (Já Gerados pelo ETL)
| Arquivo Atual | Tabela ETL | Status | Usado Por |
|--------------|-----------|--------|-----------|
| `fat_churn.json` | `fat_churn` | ⚠️ Erros SQL | ClientsDashboard, ExecutiveDashboard, ChurnDashboard |
| `fat_inadimplencia.json` | `fat_inadimplencia` | ✅ OK (0 rows) | FinancialDashboard, ExecutiveDashboard, ClientsDashboard |
| `agg_dre_mensal.json` | `agg_dre_mensal` | ✅ OK | FinancialDashboard |
| `auditoria_consolidada.json` | `auditoria_consolidada` | ✅ OK | DataAudit, ExecutiveDashboard |
| `fat_carro_reserva.json` | `fat_carro_reserva` | ✅ OK | FleetDashboard |

---

### ⚠️ Fatos que Precisam ser Criados/Ajustados
| Arquivo Atual | Tabela ETL Disponível | Status | Usado Por | Ação |
|--------------|----------------------|--------|-----------|------|
| `fat_manutencao_os_*.json` | `fat_manutencao_unificado` ou `fat_manutencao_completa` | 🔄 **MAPEAR** | MaintenanceDashboard, FleetDashboard, ExecutiveDashboard | Verificar estrutura esperada vs disponível |
| `fat_manutencao_completa.json` | `fat_manutencao_completa` | ⚠️ Erros SQL | MaintenanceDashboard | Corrigir schema no ETL |
| `fat_manutencao_unificado.json` | `fat_manutencao_unificado` | ✅ OK (326K rows) | MaintenanceDashboard | Já chunked em 7 partes |
| `fat_faturamento_*.json` | `fat_faturamentos` | 🔄 **RENOMEAR** | FinancialDashboard, ClientsDashboard, ExecutiveDashboard | Verificar se estrutura é compatível |
| `hist_vida_veiculo.json` | `hist_vida_veiculo_timeline` | 🔄 **RENOMEAR** | FleetDashboard | Simples rename |

---

### ✅ Fatos Anuais Gerados pelo ETL (Novos)
| Arquivo Atual | Tabela ETL | Status | Usado Por | Registros |
|--------------|-----------|--------|-----------|----------|
| `fat_sinistros_*.json` | `fat_sinistros` | ✅ **FUNCIONAL** | ClaimsDashboard, CustomerAnalytics, FleetDashboard | 6.187 (2022-2026) |
| `fat_multas_*.json` | `fat_multas` | ✅ **FUNCIONAL** | InfractionsDashboard, CustomerAnalytics, FleetDashboard | 24.320 (2022-2026) |
| `fat_ocorrencias_master_*.json` | `fat_ocorrencias_master` | ✅ **FUNCIONAL** | MaintenanceDashboard, ExecutiveDashboard | 97.085 (2022-2026) |

---

### ❌ Fatos NÃO Gerados pelo ETL (Precisam ser Adicionados)
| Arquivo Atual | Tabela Necessária | Status | Usado Por | Prioridade |
|--------------|------------------|--------|-----------|-----------|
| `fat_vendas_*.json` | ❌ Não existe | **CRIAR** | SalesDashboard | 🟡 Média |
| `fat_propostas_*.json` | ❌ Não existe | **CRIAR** | CommercialDashboard, ExecutiveDashboard | 🟡 Média |
| `fat_lancamentos_*.json` | `fat_financeiro_universal` | 🔄 **MAPEAR** | FinancialResult | 🟢 Baixa |
| `dim_compras.json` | ❌ Não existe | **CRIAR** | PurchasesDashboard | 🟡 Média |
| `dim_alienacoes.json` | ❌ Não existe | **CRIAR** | PurchasesDashboard, FundingDashboard | 🟡 Média |
| `alienacoes.json` | ❌ Não existe | **CRIAR** | FundingDashboard | 🟡 Média |
| `dim_rentabilidade.json` | `rentabilidade_360_geral` | 🔄 **RENOMEAR** | ContractsDashboard | 🟢 Baixa |
| `dim_churn.json` | `fat_churn` | 🔄 **RENOMEAR** | ContractsDashboard | 🟢 Baixa |
| `agg_rentabilidade_contratos_mensal.json` | ❌ Não existe | **CRIAR** | ContractAnalysisDashboard | 🟡 Média |

---

## Arquivos Gerados pelo ETL (93 tabelas)

### Dimensões (8 tabelas - ✅ 100% sucesso)
1. ✅ `dim_clientes` (191K rows)
2. ✅ `dim_condutores`
3. ✅ `dim_fornecedores`
4. ✅ `dim_frota`
5. ✅ `dim_veiculos_acessorios`
6. ✅ `dim_contratos_locacao`
7. ✅ `dim_itens_contrato`
8. ✅ `dim_regras_contrato`

### Fatos Anuais (25 tabelas - ✅ 100% sucesso)
- ✅ `fat_faturamentos` (anos 2022-2026) - 174K rows
- ✅ `fat_detalhe_itens_os` (anos 2022-2026) - 278K rows
- ✅ `fat_ocorrencias_master` (anos 2022-2026) - 97K rows
- ✅ `fat_sinistros` (anos 2022-2026) - 6.2K rows
- ✅ `fat_multas` (anos 2022-2026) - 24.3K rows

### Financeiro Universal (60 meses - ✅ 100% sucesso)
- ✅ `fat_financeiro_universal` (2022-2026, mensalizado) - 426K rows

### Consolidados (10 tabelas - ⚠️ 80% sucesso)
1. ✅ `fat_historico_mobilizacao`
2. ✅ `rentabilidade_360_geral`
3. ✅ `hist_vida_veiculo_timeline`
4. ⚠️ `fat_churn` (erros de schema)
5. ✅ `fat_inadimplencia` (0 registros - esperado)
6. ✅ `agg_dre_mensal`
7. ✅ `auditoria_consolidada`
8. ✅ `fat_carro_reserva`
9. ✅ `fat_manutencao_unificado` (326K rows - chunked em 7 partes)
10. ⚠️ `fat_manutencao_completa` (erros de schema)

---

## Plano de Ação

### Fase 1: Corrigir ETL (Prioridade Imediata)
1. ✅ Implementar chunking para uploads >50K registros
2. ⏳ Corrigir `fat_churn` (schema errors)
3. ⏳ Corrigir `fat_manutencao_completa` (schema errors)
4. ⏳ Re-executar ETL para validar chunking

### Fase 2: Adicionar Tabelas Faltantes (Prioridade Alta)
1. **Sinistros**: `fat_sinistros_*` (anos 2022-2026)
   - Fonte: `OcorrenciasSinistro`
   - Campos: IdOcorrencia, Placa, DataSinistro, Descricao, ValorOrcamento, SituacaoOcorrencia
   
2. **Multas**: `fat_multas_*` (anos 2022-2026)
   - Fonte: `OcorrenciasInfracoes`
   - Campos: IdOcorrencia, Placa, DataInfracao, DescricaoInfracao, OrgaoAutuador, ValorInfracao, SituacaoOcorrencia

3. **Vendas**: `fat_vendas_*` (anos 2022-2026)
   - Fonte: `VeiculosVendidos`
   - Campos: IdVeiculo, Placa, DataVenda, ValorVenda, Comprador

### Fase 3: Ajustar Dashboards (Prioridade Média)
Para cada dashboard, atualizar `useBIData` para usar os novos nomes de arquivo:

#### Mudanças Simples (Rename)
```typescript
// FleetDashboard.tsx
- useBIData('hist_vida_veiculo.json')
+ useBIData('hist_vida_veiculo_timeline.json')

// ContractsDashboard.tsx
- useBIData('dim_rentabilidade.json')
+ useBIData('rentabilidade_360_geral.json')

- useBIData('dim_churn.json')
+ useBIData('fat_churn.json')
```

#### Mudanças com Verificação de Estrutura
```typescript
// MaintenanceDashboard.tsx
- useBIData('fat_manutencao_os_*.json')
+ useBIData('fat_manutencao_unificado.json') 
// OU
+ useBIData('fat_manutencao_completa.json')
// VERIFICAR: Qual estrutura os dashboards esperam?

// FinancialDashboard.tsx
- useBIData('fat_faturamento_*.json')
+ useBIData('fat_faturamentos_*.json')  // Note o 's' adicional
// VERIFICAR: Estrutura de campos é compatível?
```

### Fase 4: Atualizar Hook useBIData (Opcional)
Adicionar suporte para leitura de arquivos chunked:
```typescript
// Exemplo: fat_manutencao_unificado_part1of7.json
if (fileName.includes('_part')) {
  // Detectar automaticamente todas as partes e combinar
}
```

---

## Dashboards Afetados (Por Prioridade)

### 🔴 Alta Prioridade (Bloqueados por Dados Faltantes)
1. **MaintenanceDashboard** (principal dashboard operacional)
   - ⚠️ `fat_manutencao_completa` com erro
   - ✅ `fat_manutencao_unificado` funcionando
   - ❌ `fat_sinistros_*` não existe

2. **InfractionsDashboard**
   - ❌ `fat_multas_*` não existe

3. **ClaimsDashboard**
   - ❌ `fat_sinistros_*` não existe

### 🟡 Média Prioridade (Precisam Ajustes Menores)
4. **FleetDashboard**
   - 🔄 Renomear `hist_vida_veiculo.json` → `hist_vida_veiculo_timeline.json`
   - ⚠️ `fat_manutencao_os_*` precisa mapeamento

5. **FinancialDashboard**
   - 🔄 Verificar `fat_faturamento_*` vs `fat_faturamentos`

6. **ExecutiveDashboard** (usa múltiplas fontes)
   - ❌ `fat_propostas_*` não existe
   - 🔄 Vários renames menores

### 🟢 Baixa Prioridade (Funcionando ou Poucos Ajustes)
7. **ClientsDashboard** - ✅ Praticamente OK
8. **ChurnDashboard** - ⚠️ Aguardando fix do `fat_churn`
9. **DataAudit** - ✅ OK
10. **CustomerAnalytics** - ❌ Precisa `fat_sinistros_*` e `fat_multas_*`

---

## Próximos Passos Imediatos

1. ✅ Criar este documento de mapeamento
2. ⏳ Adicionar queries para sinistros e multas no ETL
3. ⏳ Re-executar ETL e validar sucesso 100%
4. ⏳ Iniciar ajustes nos dashboards de Alta Prioridade
5. ⏳ Testar cada dashboard após ajuste

---

## Notas Técnicas

### Estrutura Esperada de Manutenção
Analisar qual estrutura os dashboards esperam:
- `fat_manutencao_os_*` (antigo) - estrutura?
- `fat_manutencao_unificado` (novo) - eventos de chegada/conclusão
- `fat_manutencao_completa` (novo) - detalhes completos da OS

### Chunking de Arquivos Grandes
Arquivos com >50K registros são automaticamente divididos:
- `fat_manutencao_unificado_part1of7.json` (50K registros cada)
- `fat_manutencao_unificado_part2of7.json`
- ... até `part7of7.json`

**Decisão**: Manter arquivos separados ou combinar no useBIData?

---

**Última Atualização**: 05/01/2026 - Documento criado durante análise inicial
