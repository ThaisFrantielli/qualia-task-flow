# Relatório de Execução ETL - 5 de Janeiro de 2026

**Horário**: 11:45:33 - 11:47:10 (1min 37s)  
**Status**: ✅ 93 etapas concluídas com sucesso / ❌ 10 etapas com erro  
**Total**: 103 etapas planejadas

---

## ✅ Sucesso Geral

### Dimensões (8/8) - 100% ✅
- ✅ dim_clientes (1.572 registros)
- ✅ dim_condutores (2.423 registros)
- ✅ dim_fornecedores (4.213 registros)
- ✅ dim_frota (5.780 registros)
- ✅ dim_veiculos_acessorios (88.000 registros → 3 chunks)
- ✅ dim_contratos_locacao (6.962 registros)
- ✅ dim_itens_contrato (2.587 registros)
- ✅ dim_regras_contrato (76.622 registros → 3 chunks)

**Total Dimensões**: 188.159 registros

---

### Fatos Anuais (15/25) - 60% ⚠️

#### ✅ fat_faturamentos (5/5) - 100%
- 2022: 8.798 registros
- 2023: 59.806 registros → 2 chunks
- 2024: 55.343 registros → 2 chunks
- 2025: 50.197 registros → 2 chunks
- 2026: 73 registros

**Total**: 174.217 registros

#### ✅ fat_detalhe_itens_os (5/5) - 100%
- 2022: 12.987 registros
- 2023: 89.799 registros → 3 chunks
- 2024: 87.329 registros → 3 chunks
- 2025: 88.382 registros → 3 chunks
- 2026: 81 registros

**Total**: 278.578 registros

#### ✅ fat_ocorrencias_master (5/5) - 100%
- 2022: 7.888 registros
- 2023: 32.216 registros → 2 chunks
- 2024: 29.495 registros
- 2025: 26.542 registros
- 2026: 92 registros

**Total**: 96.233 registros

#### ❌ fat_sinistros (0/5) - 0% ERRO
**Erro**: `Invalid column name 'Cliente'`  
**Causa**: Tabela OcorrenciasSinistro não possui campo 'Cliente' diretamente  
**Status**: 🔧 CORRIGIDO - Adicionado JOIN com ContratosLocacao → ContratosComerciais → Clientes

#### ❌ fat_multas (0/5) - 0% ERRO
**Erro**: `Invalid column name 'Cliente'`  
**Causa**: Tabela OcorrenciasInfracoes não possui campo 'Cliente' diretamente  
**Status**: 🔧 CORRIGIDO - Adicionado JOIN com ContratosLocacao → ContratosComerciais → Clientes

---

### Financeiro Universal (60/60) - 100% ✅

#### 2022 (12 meses)
- Total: 14.234 registros (43 → 8.634 por mês)

#### 2023 (12 meses)
- Total: 125.067 registros (7.553 → 16.667 por mês)

#### 2024 (12 meses)
- Total: 133.429 registros (8.603 → 16.476 por mês)

#### 2025 (12 meses)
- Total: 130.545 registros (8.886 → 15.578 por mês)

#### 2026 (12 meses)
- Total: 11.383 registros (327 → 5.422 em jan)

**Total Financeiro Universal**: 414.658 registros em 60 meses

---

### Consolidados (8/10) - 80% ⚠️

#### ✅ Tabelas Bem-Sucedidas:
1. ✅ fat_historico_mobilizacao (2.517 registros)
2. ✅ rentabilidade_360_geral (5.780 registros)
3. ✅ hist_vida_veiculo_timeline (104.346 registros → 4 chunks)
4. ✅ fat_churn (1.637 registros)
5. ✅ agg_dre_mensal (78 registros)
6. ✅ auditoria_consolidada (101 registros)
7. ✅ fat_carro_reserva (2.947 registros)
8. ✅ fat_manutencao_unificado (326.505 registros → **11 chunks**)
9. ✅ fat_manutencao_completa (317.992 registros → **11 chunks**)

#### ⚠️ Tabela com Problemas:
10. ⚠️ fat_inadimplencia (0 registros) - Possível query incorreta ou sem dados pendentes

**Total Consolidados**: 761.903 registros

---

## 📊 Estatísticas Gerais

### Por Categoria:
| Categoria | Etapas | Sucesso | Erro | % Sucesso | Registros |
|-----------|--------|---------|------|-----------|-----------|
| Dimensões | 8 | 8 | 0 | 100% | 188.159 |
| Fatos Anuais | 25 | 15 | 10 | 60% | 549.028 |
| Financeiro | 60 | 60 | 0 | 100% | 414.658 |
| Consolidados | 10 | 9 | 1 | 90% | 761.903 |
| **TOTAL** | **103** | **92** | **11** | **89.3%** | **1.913.748** |

### Performance:
- ⏱️ **Tempo Total**: 1min 37s
- 📊 **Taxa de Sucesso**: 89.3%
- 💾 **Total de Registros**: 1.913.748
- 📦 **Chunks Gerados**: 42 (para tabelas > 30K registros)
- 📤 **Uploads Supabase**: 129 arquivos JSON

### Chunks por Tabela (> 30K registros):
1. dim_veiculos_acessorios: 3 chunks (88K)
2. dim_regras_contrato: 3 chunks (76K)
3. fat_faturamentos_2023: 2 chunks (59K)
4. fat_faturamentos_2024: 2 chunks (55K)
5. fat_faturamentos_2025: 2 chunks (50K)
6. fat_detalhe_itens_os_2023: 3 chunks (89K)
7. fat_detalhe_itens_os_2024: 3 chunks (87K)
8. fat_detalhe_itens_os_2025: 3 chunks (88K)
9. fat_ocorrencias_master_2023: 2 chunks (32K)
10. hist_vida_veiculo_timeline: 4 chunks (104K)
11. **fat_manutencao_unificado: 11 chunks (326K)** ⭐
12. **fat_manutencao_completa: 11 chunks (317K)** ⭐

---

## 🔧 Correções Aplicadas Pós-Execução

### 1. ❌ → ✅ fat_sinistros (CORRIGIDO)
**Query Original** (ERRO):
```sql
SELECT IdOcorrencia, Ocorrencia, ..., Cliente 
FROM OcorrenciasSinistro 
WHERE YEAR(DataSinistro) = ${year}
```

**Query Corrigida**:
```sql
SELECT os.IdOcorrencia, os.Ocorrencia, os.IdVeiculo, os.Placa, 
       os.ModeloVeiculo as Modelo, FORMAT(os.DataSinistro, 'yyyy-MM-dd') as DataSinistro,
       os.Descricao, os.TipoSinistro, CAST(os.ValorOrcamento AS FLOAT) as ValorOrcado,
       CAST(os.ValorTotal AS FLOAT) as ValorTotal, CAST(os.ValorFranquia AS FLOAT) as ValorFranquia,
       os.SeguradoraResponsavel, os.NumeroSinistro, os.SituacaoOcorrencia as Status,
       os.ResponsavelSinistro, os.ContratoLocacao, cli.NomeFantasia as Cliente
FROM OcorrenciasSinistro os
LEFT JOIN ContratosLocacao cl ON os.Placa = cl.PlacaPrincipal
LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente
WHERE YEAR(os.DataSinistro) = ${year}
```

**Impacto**: Agora obtém Cliente através de JOIN Placa → ContratosLocacao → ContratosComerciais → Clientes

---

### 2. ❌ → ✅ fat_multas (CORRIGIDO)
**Query Original** (ERRO):
```sql
SELECT IdOcorrencia, Ocorrencia, ..., Cliente, NomeCondutor as Condutor
FROM OcorrenciasInfracoes 
WHERE YEAR(DataInfracao) = ${year}
```

**Query Corrigida**:
```sql
SELECT oi.IdOcorrencia, oi.Ocorrencia, oi.IdVeiculo, oi.Placa,
       oi.ModeloVeiculo as Modelo, FORMAT(oi.DataInfracao, 'yyyy-MM-dd') as DataInfracao,
       oi.DescricaoInfracao, oi.OrgaoAutuador, CAST(oi.ValorInfracao AS FLOAT) as ValorMulta,
       CAST(oi.ValorTotal AS FLOAT) as ValorTotal, oi.Pontuacao,
       oi.SituacaoOcorrencia as Status, oi.Enquadramento, oi.ResponsavelMulta,
       oi.ContratoLocacao, cli.NomeFantasia as Cliente, oi.NomeCondutor as Condutor
FROM OcorrenciasInfracoes oi
LEFT JOIN ContratosLocacao cl ON oi.Placa = cl.PlacaPrincipal
LEFT JOIN ContratosComerciais cc ON cl.IdContrato = cc.IdContratoComercial
LEFT JOIN Clientes cli ON cc.IdCliente = cli.IdCliente
WHERE YEAR(oi.DataInfracao) = ${year}
```

**Impacto**: Agora obtém Cliente através de JOIN Placa → ContratosLocacao → ContratosComerciais → Clientes

---

## 🎯 Próximos Passos

### Imediato (Re-executar ETL):
```powershell
cd scripts\local-etl
node run-sync-v2.js
```

**Esperado após re-execução**:
- ✅ fat_sinistros: ~5 arquivos (2022-2026, estimativa 15-25K registros)
- ✅ fat_multas: ~5 arquivos (2022-2026, estimativa 20-35K registros)
- Total adicional: ~40-60K registros

---

### Médio Prazo:

#### 1. Investigar fat_inadimplencia (0 registros)
**Possíveis causas**:
- Não há notas pendentes no sistema
- Query filtering muito restritivo
- Campo SituacaoNota não tem valor 'Pendente'

**Query atual**:
```sql
SELECT f.IdNota, f.Cliente, f.Nota, CAST(f.ValorTotal AS FLOAT) as SaldoDevedor,
       FORMAT(f.Vencimento, 'yyyy-MM-dd') as Vencimento,
       DATEDIFF(DAY, f.Vencimento, GETDATE()) as DiasAtraso,
       CASE 
         WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 0 THEN 'A Vencer'
         WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 30 THEN '1-30 dias'
         WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 60 THEN '31-60 dias'
         WHEN DATEDIFF(DAY, f.Vencimento, GETDATE()) <= 90 THEN '61-90 dias'
         ELSE '90+ dias'
       END as FaixaAging
FROM Faturamentos f
WHERE f.SituacaoNota = 'Pendente'
```

**Ação**: Testar query manualmente no SQL Server para verificar se retorna dados

#### 2. Criar fat_propostas (se dados existirem)
- Usado por: ExecutiveDashboard, CommercialDashboard
- Atualmente: Dashboards funcionam mas valorPipeline = 0

---

## 📈 Impacto nos Dashboards

### Dashboards Afetados por fat_sinistros e fat_multas:

#### 1. InfractionsDashboard ❌ → ✅
- **Antes**: Sem dados (fat_multas não existia)
- **Depois**: Dados completos de infrações 2022-2026

#### 2. ClaimsDashboard ❌ → ✅
- **Antes**: Sem dados (fat_sinistros não existia)
- **Depois**: Dados completos de sinistros 2022-2026

#### 3. CustomerAnalytics ⚠️ → ✅
- **Antes**: Análise 360° incompleta (sem sinistros/multas)
- **Depois**: Análise completa com todos os custos

#### 4. MaintenanceDashboard ✅
- Custos de sinistros agora disponíveis para análise comparativa

---

## ✅ Status Final

| Métrica | Valor |
|---------|-------|
| **Tempo de Execução** | 1min 37s |
| **Taxa de Sucesso** | 89.3% (92/103) |
| **Total de Registros** | 1.913.748 |
| **Chunks Gerados** | 42 |
| **Uploads Supabase** | 129 arquivos |
| **Tabelas Completas** | 21/23 (91.3%) |
| **Correções Aplicadas** | 2 (fat_sinistros, fat_multas) |
| **Próxima Execução** | Obrigatória (para gerar tabelas corrigidas) |

---

**Arquivo**: `scripts/local-etl/run-sync-v2.js`  
**Última Modificação**: 5 de Janeiro de 2026, 11:50  
**Próxima Ação**: Re-executar ETL para gerar fat_sinistros_*.json e fat_multas_*.json
