# 🔍 ANÁLISE COMPLETA: Dashboards vs ETL Data Files

**Data da Análise:** 20/01/2026  
**ETL Version:** v2.0  
**Arquivo ETL:** `scripts/local-etl/run-sync-v2.js`

---

## 📊 RESUMO EXECUTIVO

### Situação Geral
- **Dashboards Analisados:** 16
- **Arquivos Faltantes Críticos:** 7
- **Dashboards BLOQUEADOS:** 3
- **Dashboards PARCIALMENTE FUNCIONANDO:** 7
- **Dashboards OK:** 6

---

## 🔴 ARQUIVOS CRÍTICOS FALTANTES NO ETL

### 1. **`fat_propostas_*.json`** ⚠️ CRÍTICO
- **Usado por:** CommercialDashboard, ExecutiveDashboard
- **Status:** ❌ **NÃO EXISTE NO ETL**
- **Tabela alternativa disponível:** `fat_propostas_blufleet` (apenas ano 2022-2026)
- **Impacto:** Pipeline comercial BLOQUEADO
- **Ação:** Renomear referências de `fat_propostas_*.json` para `fat_propostas_blufleet_*.json` nos dashboards OU criar alias no ETL

### 2. **`agg_rentabilidade_contratos_mensal.json`**
- **Usado por:** ContractAnalysisDashboard
- **Status:** ❌ **NÃO EXISTE NO ETL**
- **Alternativa:** `rentabilidade_360_geral.json` (agregado diferente)
- **Impacto:** Dashboard de análise de contratos BLOQUEADO
- **Ação:** Criar agregação `agg_rentabilidade_contratos_mensal` no ETL OU adaptar dashboard para usar `rentabilidade_360_geral`

### 3. **`rentabilidade_360_geral.json`**
- **Usado por:** ContractsDashboard
- **Status:** ✅ **EXISTE NO ETL** (tabela `rentabilidade_360_geral`)
- **Observação:** Nome correto da tabela

### 4. **`auditoria_consolidada.json`**
- **Usado por:** ExecutiveDashboard
- **Status:** ❌ **NÃO EXISTE NO ETL**
- **Impacto:** KPIs de qualidade e alertas do dashboard executivo não funcionam
- **Ação:** Criar agregação de auditoria no ETL

### 5. **`historico_situacao_veiculos.json`**
- **Usado por:** FleetIdleDashboard, MaintenanceDashboard
- **Status:** ⚠️ **REFERENCIADO MAS NÃO LISTADO** nas tabelas principais do ETL
- **Ação:** Verificar se tabela existe no DW fonte e adicionar ao ETL

### 6. **`alienacoes.json`**
- **Usado por:** FundingDashboard
- **Status:** ✅ **EXISTE NO ETL** como `dim_alienacoes`
- **Ação:** Corrigir referência no dashboard de `alienacoes.json` para `dim_alienacoes.json`

### 7. **`fat_vendas_*.json`**
- **Usado por:** SalesDashboard
- **Status:** ✅ **EXISTE NO ETL** como `fat_vendas` (particionado por ano)
- **Padrão:** `fat_vendas_2022.json`, `fat_vendas_2023.json`, etc.

---

## 📋 ANÁLISE POR DASHBOARD

### 1. **ChurnDashboard** ✅ FUNCIONANDO
**Arquivos Requeridos:**
- ✅ `fat_churn.json`
- ✅ `dim_contratos_locacao.json`

**Status:** ✅ Todos os arquivos existem  
**Prioridade:** Baixa  
**Impacto:** Funcionando

---

### 2. **ClaimsDashboard** ✅ FUNCIONANDO
**Arquivos Requeridos:**
- ✅ `fat_sinistros_*.json` (particionado por ano)

**Status:** ✅ Arquivo existe  
**Prioridade:** Baixa  
**Impacto:** Funcionando

**Observação:** ETL gera `fat_sinistros` por ano (2022-2026)

---

### 3. **ClientsDashboard** ⚠️ PARCIAL
**Arquivos Requeridos:**
- ✅ `dim_clientes.json`
- ✅ `fat_faturamentos_*.json` (particionado)
- ✅ `fat_churn.json`
- ✅ `fat_inadimplencia.json`

**Status:** ✅ Todos os arquivos existem  
**Prioridade:** Baixa  
**Impacto:** Funcionando

---

### 4. **CommercialDashboard** 🔴 BLOQUEADO
**Arquivos Requeridos:**
- ❌ `fat_propostas_*.json` **FALTANDO**
- ✅ `dim_contratos_locacao.json`

**Status:** ❌ Dashboard BLOQUEADO por falta de `fat_propostas`  
**Prioridade:** **ALTA**  
**Impacto:** **Bloqueado** - Vendas e pipeline comercial não funcionam

**Ação Corretiva:**
```javascript
// Alterar no dashboard:
// DE:
const { data: rawPropostas } = useBIData('fat_propostas_*.json');
// PARA:
const { data: rawPropostas } = useBIData('fat_propostas_blufleet_*.json');
```

---

### 5. **ContractAnalysisDashboard** 🔴 BLOQUEADO
**Arquivos Requeridos:**
- ❌ `agg_rentabilidade_contratos_mensal.json` **FALTANDO**

**Status:** ❌ Dashboard BLOQUEADO  
**Prioridade:** **ALTA**  
**Impacto:** **Bloqueado** - Análise de rentabilidade de contratos não funciona

**Ação Corretiva:**
- **Opção 1:** Criar agregação `agg_rentabilidade_contratos_mensal` no ETL
- **Opção 2:** Adaptar dashboard para usar `rentabilidade_360_geral.json`

---

### 6. **ContractsDashboard** ⚠️ PARCIAL
**Arquivos Requeridos:**
- ✅ `dim_contratos_locacao.json`
- ✅ `fat_churn.json`
- ✅ `rentabilidade_360_geral.json`
- ✅ `fat_faturamentos_*.json`
- ✅ `fat_manutencao_unificado.json`

**Status:** ✅ Todos os arquivos existem  
**Prioridade:** Baixa  
**Impacto:** Funcionando

---

### 7. **DREDashboard** ⚠️ PRECISA AJUSTE
**Arquivos Requeridos:**
- ⚠️ `agg_dre_mensal.json` (via hook customizado `useDREData`)

**Status:** ✅ Arquivo existe no ETL  
**Prioridade:** Média  
**Impacto:** Funcionando (usa hook customizado que pode buscar diretamente do ETL)

**Observação:** Dashboard usa `useDREData` que faz transformações customizadas

---

### 8. **ExecutiveDashboard** 🔴 PARCIAL CRÍTICO
**Arquivos Requeridos:**
- ✅ `dim_frota.json`
- ✅ `dim_contratos_locacao.json`
- ✅ `dim_clientes.json`
- ✅ `fat_faturamentos_*.json`
- ✅ `fat_manutencao_unificado.json`
- ✅ `fat_inadimplencia.json`
- ✅ `fat_churn.json`
- ❌ `fat_propostas_*.json` **FALTANDO**
- ❌ `auditoria_consolidada.json` **FALTANDO**

**Status:** ⚠️ Dashboard PARCIALMENTE bloqueado  
**Prioridade:** **ALTA**  
**Impacto:** **Parcial** - KPIs comerciais e auditoria não funcionam

---

### 9. **FinancialDashboard** ✅ FUNCIONANDO
**Arquivos Requeridos:**
- ✅ `fat_faturamentos_*.json`
- ✅ `agg_dre_mensal.json`
- ✅ `fat_inadimplencia.json`

**Status:** ✅ Todos os arquivos existem  
**Prioridade:** Baixa  
**Impacto:** Funcionando

---

### 10. **FleetDashboard** ⚠️ PARCIAL
**Arquivos Requeridos:**
- ✅ `dim_frota.json`
- ✅ `fat_manutencao_unificado.json`
- ✅ `fat_movimentacao_ocorrencias.json`
- ⚠️ `fat_sinistros.json` (sem wildcard)
- ⚠️ `fat_multas.json` (sem wildcard)
- ✅ `fat_carro_reserva.json`
- ✅ `dim_movimentacao_patios.json`
- ✅ `dim_movimentacao_veiculos.json`
- ✅ `dim_contratos_locacao.json`

**Status:** ⚠️ Funcionando mas com ajustes necessários  
**Prioridade:** Média  
**Impacto:** Funcionando (mas usa `fat_sinistros` e `fat_multas` sem wildcard - pode não pegar todos os anos)

**Ação Corretiva:**
```javascript
// Alterar no dashboard:
// DE:
const { data: sinistrosRaw } = useBIData('fat_sinistros');
const { data: multasRaw } = useBIData('fat_multas');
// PARA:
const { data: sinistrosRaw } = useBIData('fat_sinistros_*.json');
const { data: multasRaw } = useBIData('fat_multas_*.json');
```

---

### 11. **FleetIdleDashboard** ⚠️ PRECISA AJUSTE
**Arquivos Requeridos:**
- ✅ `dim_frota.json`
- ✅ `dim_movimentacao_patios.json`
- ✅ `dim_movimentacao_veiculos.json`
- ❌ `historico_situacao_veiculos.json` **FALTANDO**

**Status:** ⚠️ Dashboard pode ter limitações  
**Prioridade:** Média  
**Impacto:** **Parcial** - Histórico de situação não disponível

**Ação Corretiva:** Adicionar `historico_situacao_veiculos` ao ETL

---

### 12. **FundingDashboard** ⚠️ PRECISA AJUSTE
**Arquivos Requeridos:**
- ⚠️ `alienacoes.json` (nome incorreto)

**Status:** ⚠️ Precisa correção de nome  
**Prioridade:** Baixa  
**Impacto:** **Bloqueado** (nome incorreto)

**Ação Corretiva:**
```javascript
// Alterar no dashboard:
// DE:
const { data: rawAlienacoes } = useBIData('alienacoes.json');
// PARA:
const { data: rawAlienacoes } = useBIData('dim_alienacoes.json');
```

---

### 13. **InfractionsDashboard** ✅ FUNCIONANDO
**Arquivos Requeridos:**
- ✅ `fat_multas_*.json` (particionado por ano)

**Status:** ✅ Arquivo existe  
**Prioridade:** Baixa  
**Impacto:** Funcionando

---

### 14. **MaintenanceDashboard** ⚠️ PARCIAL
**Arquivos Requeridos:**
- ✅ `fat_manutencao_unificado.json`
- ✅ `fat_faturamentos_*.json`
- ✅ `dim_frota.json`
- ✅ `dim_contratos_locacao.json`
- ❌ `historico_situacao_veiculos.json` **FALTANDO**

**Status:** ⚠️ Funcionando mas sem histórico completo  
**Prioridade:** Média  
**Impacto:** **Parcial** - Análises históricas limitadas

---

### 15. **PurchasesDashboard** ⚠️ PRECISA AJUSTE
**Arquivos Requeridos:**
- ✅ `dim_compras.json`
- ⚠️ `dim_alienacoes.json` (referenciado como `alienacoes`)
- ✅ `dim_frota.json`

**Status:** ⚠️ Precisa correção de nome  
**Prioridade:** Baixa  
**Impacto:** Funcionando (mas pode ter problemas com alienações)

---

### 16. **SalesDashboard** ✅ FUNCIONANDO
**Arquivos Requeridos:**
- ✅ `fat_vendas_*.json` (particionado por ano)

**Status:** ✅ Arquivo existe  
**Prioridade:** Baixa  
**Impacto:** Funcionando

---

## 🎯 PLANO DE AÇÃO PRIORITÁRIO

### 🔴 PRIORIDADE ALTA (Resolver Imediatamente)

#### 1. **Corrigir `fat_propostas` no CommercialDashboard**
```typescript
// Arquivo: src/pages/analytics/CommercialDashboard.tsx
// Linha: ~30
const { data: rawPropostas, loading } = useBIData<AnyObject[]>('fat_propostas_blufleet_*.json');
```

#### 2. **Criar ou Adaptar `agg_rentabilidade_contratos_mensal`**

**Opção A - Adicionar ao ETL:**
```javascript
// Adicionar em CONSOLIDATED (run-sync-v2.js):
{
    table: 'agg_rentabilidade_contratos_mensal',
    query: `
        SELECT 
            c.Cliente,
            cl.IdContratoComercial,
            cl.IdContratoLocacao,
            v.Grupo,
            v.Modelo,
            cl.PlacaPrincipal as Placa,
            FORMAT(f.DataCompetencia, 'yyyy-MM') as Competencia,
            SUM(${castM('f.ValorTotal')}) as Faturamento,
            SUM(${castM('os.ValorTotal')}) as GastoManutencao,
            SUM(${castM('os.ValorReembolsavel')}) as ReembolsoManutencao
        FROM ContratosLocacao cl
        JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
        JOIN Clientes c ON cc.IdCliente = c.IdCliente
        JOIN Veiculos v ON cl.PlacaPrincipal = v.Placa
        LEFT JOIN Faturamentos f ON f.IdCliente = c.IdCliente 
        LEFT JOIN OrdensServico os ON os.Placa = v.Placa
        WHERE f.SituacaoNota <> 'Cancelada'
        GROUP BY c.Cliente, cl.IdContratoComercial, cl.IdContratoLocacao, 
                 v.Grupo, v.Modelo, cl.PlacaPrincipal, FORMAT(f.DataCompetencia, 'yyyy-MM')
    `
}
```

**Opção B - Adaptar Dashboard:**
```typescript
// Modificar ContractAnalysisDashboard para usar rentabilidade_360_geral
const { data: rawData } = useBIData<AnyObject[]>('rentabilidade_360_geral.json');
```

#### 3. **Criar `auditoria_consolidada`**
```javascript
// Adicionar em CONSOLIDATED (run-sync-v2.js):
{
    table: 'auditoria_consolidada',
    query: `
        SELECT 
            'DATA_QUALITY' as Categoria,
            'Veículos sem Placa' as Tipo,
            COUNT(*) as Quantidade,
            'Alta' as Gravidade
        FROM Veiculos WHERE Placa IS NULL OR Placa = ''
        
        UNION ALL
        
        SELECT 
            'DATA_QUALITY',
            'Contratos sem Cliente',
            COUNT(*),
            'Alta'
        FROM ContratosLocacao WHERE IdCliente IS NULL
        
        UNION ALL
        
        SELECT 
            'OPERATIONAL',
            'OS Pendentes >30 dias',
            COUNT(*),
            'Média'
        FROM OrdensServico 
        WHERE SituacaoOrdemServico = 'Aberta' 
          AND DATEDIFF(DAY, DataInicioServico, GETDATE()) > 30
    `
}
```

#### 4. **Corrigir referência de alienações em múltiplos dashboards**
```typescript
// FundingDashboard e PurchasesDashboard
const { data: rawAlienacoes } = useBIData<AnyObject[]>('dim_alienacoes.json');
```

---

### 🟡 PRIORIDADE MÉDIA

#### 5. **Adicionar `historico_situacao_veiculos` ao ETL**
```javascript
// Adicionar em DIMENSIONS (run-sync-v2.js):
{
    table: 'historico_situacao_veiculos',
    query: `
        SELECT 
            v.IdVeiculo,
            v.Placa,
            v.SituacaoVeiculo,
            FORMAT(v.DataAtualizacaoDados, 'yyyy-MM-dd HH:mm:ss') as UltimaAtualizacao,
            v.DataCompra,
            v.DataVenda
        FROM Veiculos v
        ORDER BY v.Placa, v.DataAtualizacaoDados
    `
}
```

#### 6. **Padronizar uso de wildcards em FleetDashboard**
```typescript
const { data: sinistrosRaw } = useBIData<AnyObject[]>('fat_sinistros_*.json');
const { data: multasRaw } = useBIData<AnyObject[]>('fat_multas_*.json');
```

---

## 📊 TABELAS DISPONÍVEIS NO ETL (run-sync-v2.js)

### ✅ DIMENSÕES (23 tabelas)
1. `dim_clientes.json`
2. `dim_condutores.json`
3. `dim_fornecedores.json`
4. `dim_frota.json`
5. `dim_veiculos_acessorios.json`
6. `dim_contratos_locacao.json`
7. `dim_itens_contrato.json`
8. `dim_regras_contrato.json`
9. `dim_movimentacao_patios.json`
10. `dim_movimentacao_veiculos.json`
11. `dim_compras.json`
12. `dim_alienacoes.json`

### ✅ FATOS (Particionados por Ano: 2022-2026)
13. `fat_faturamentos_2022.json` ... `fat_faturamentos_2026.json`
14. `fat_detalhe_itens_os_2022.json` ... `fat_detalhe_itens_os_2026.json`
15. `fat_ocorrencias_master_2022.json` ... `fat_ocorrencias_master_2026.json`
16. `fat_sinistros_2022.json` ... `fat_sinistros_2026.json`
17. `fat_multas_2022.json` ... `fat_multas_2026.json`
18. `fat_propostas_blufleet_2022.json` ... `fat_propostas_blufleet_2026.json`
19. `fat_vendas_2022.json` ... `fat_vendas_2026.json`
20. `fat_financeiro_universal_YYYY_MM.json` (por mês/ano)

### ✅ CONSOLIDADOS (11 tabelas)
21. `fat_historico_mobilizacao.json`
22. `rentabilidade_360_geral.json`
23. `hist_vida_veiculo_timeline.json`
24. `fat_churn.json`
25. `fat_inadimplencia.json`
26. `agg_dre_mensal.json`
27. `fat_carro_reserva.json`
28. `fat_manutencao_unificado.json`
29. `agg_kpis_manutencao_mensal.json`
30. `fat_movimentacao_ocorrencias.json`
31. `agg_lead_time_etapas.json`
32. `agg_funil_conversao.json`
33. `agg_performance_usuarios.json`
34. `agg_custos_detalhados.json`

---

## 🔧 SCRIPT DE CORREÇÃO RÁPIDA

```bash
# Execute este script para corrigir as referências nos dashboards

# 1. Corrigir CommercialDashboard
sed -i "s/fat_propostas_\*\.json/fat_propostas_blufleet_*.json/g" src/pages/analytics/CommercialDashboard.tsx

# 2. Corrigir ExecutiveDashboard
sed -i "s/fat_propostas_\*\.json/fat_propostas_blufleet_*.json/g" src/pages/analytics/ExecutiveDashboard.tsx

# 3. Corrigir FundingDashboard
sed -i "s/alienacoes\.json/dim_alienacoes.json/g" src/pages/analytics/FundingDashboard.tsx

# 4. Corrigir PurchasesDashboard
sed -i "s/alienacoes/dim_alienacoes/g" src/pages/analytics/PurchasesDashboard.tsx

# 5. Corrigir FleetDashboard (sinistros e multas)
sed -i "s/useBIData('fat_sinistros')/useBIData('fat_sinistros_*.json')/g" src/pages/analytics/FleetDashboard.tsx
sed -i "s/useBIData('fat_multas')/useBIData('fat_multas_*.json')/g" src/pages/analytics/FleetDashboard.tsx
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Corrigir `fat_propostas` em CommercialDashboard
- [ ] Corrigir `fat_propostas` em ExecutiveDashboard
- [ ] Criar `agg_rentabilidade_contratos_mensal` OU adaptar ContractAnalysisDashboard
- [ ] Criar `auditoria_consolidada`
- [ ] Corrigir `alienacoes.json` para `dim_alienacoes.json` em FundingDashboard
- [ ] Corrigir `alienacoes` para `dim_alienacoes` em PurchasesDashboard
- [ ] Adicionar wildcards em FleetDashboard (`fat_sinistros_*.json`, `fat_multas_*.json`)
- [ ] Adicionar `historico_situacao_veiculos` ao ETL
- [ ] Testar todos os dashboards após correções
- [ ] Verificar logs de erro no console do navegador
- [ ] Validar carregamento de dados em cada dashboard

---

## 📈 MÉTRICAS DE IMPACTO

| Dashboard | Status Atual | Prioridade | Tempo Estimado | Usuários Impactados |
|-----------|--------------|------------|----------------|---------------------|
| CommercialDashboard | 🔴 Bloqueado | Alta | 5 min | Gestão Comercial |
| ExecutiveDashboard | 🟡 Parcial | Alta | 20 min | C-Level |
| ContractAnalysisDashboard | 🔴 Bloqueado | Alta | 2h | Financeiro |
| FundingDashboard | 🟡 Bloqueado | Baixa | 2 min | Financeiro |
| FleetIdleDashboard | 🟡 Parcial | Média | 1h | Operações |
| MaintenanceDashboard | 🟡 Parcial | Média | 1h | Manutenção |
| FleetDashboard | 🟢 Funcionando | Média | 5 min | Operações |
| PurchasesDashboard | 🟡 Parcial | Baixa | 2 min | Compras |

**TOTAL DE TEMPO ESTIMADO:** ~5h 30min

---

## 🎓 RECOMENDAÇÕES FUTURAS

1. **Padronização de Nomenclatura:**
   - Todas as tabelas de dimensão devem começar com `dim_`
   - Todas as tabelas de fato devem começar com `fat_`
   - Agregações devem começar com `agg_`

2. **Convenção de Wildcards:**
   - Sempre usar `_*.json` para tabelas particionadas por ano
   - Usar `_YYYY_MM.json` para particionamento mensal

3. **Documentação:**
   - Criar um arquivo `DATA_CATALOG.md` listando todas as tabelas disponíveis
   - Documentar schema de cada tabela
   - Adicionar exemplo de uso para cada tabela

4. **Monitoramento:**
   - Implementar validação automática de arquivos ao subir dashboards
   - Criar alertas quando arquivos esperados não existem
   - Log de uso de cada arquivo para identificar dependências

5. **Testes Automatizados:**
   - Criar testes que validem existência de arquivos antes do deploy
   - Validar schema dos arquivos JSON
   - Testar carregamento de dados em cada dashboard

---

## 📞 SUPORTE

Para dúvidas ou problemas relacionados a esta análise:
- **ETL:** Verificar `scripts/local-etl/run-sync-v2.js`
- **Hook de Dados:** Verificar `src/hooks/useBIData.tsx`
- **Documentação:** `docs/ARQUITETURA_BI_ANALYTICS.md`

---

**Última Atualização:** 20/01/2026  
**Versão do Documento:** 1.0
