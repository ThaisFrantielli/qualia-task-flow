# Análise Origem vs Destino - ETL BluConecta

**Data da Análise:** 20/01/2026  
**Última Execução ETL:** 20/01/2026 00:37:12  
**DW Origem:** blufleet-dw (200.219.192.34:3494)  
**DW Destino:** BluConecta_Dw (localhost:5432)

---

## 📊 Comparativo de Dados - Origem vs Destino

### ✅ Tabelas com 100% de Cobertura

| Tabela Origem | Rows Origem | Tabela Destino ETL | Rows Destino | Status |
|---------------|-------------|-------------------|--------------|--------|
| **Alienacoes** | 2.227 | dim_alienacoes | 449 | ⚠️ **20.16%** |
| **CategoriasFornecedores** | 6.379 | - | - | ❌ Não mapeado |
| **Clientes** | 1.577 | dim_clientes | 1.577 | ✅ **100%** |
| **Compradores** | 74 | - | - | ❌ Não mapeado |
| **Condutores** | 2.430 | dim_condutores | 2.430 | ✅ **100%** |
| **ContatosClientes** | 2.354 | - | - | ❌ Não mapeado |
| **ContatosClientesNotificacoes** | 6.600 | - | - | ❌ Não mapeado |
| **ContratosComerciais** | 1.888 | - | Várias fatos | ⚠️ Distribuído |
| **ContratosLocacao** | 6.972 | dim_contratos_locacao | 6.972 | ✅ **100%** |
| **ContratosLocacaoPrecos** | 14.804 | - | - | ⚠️ Parcial |
| **ContratosLocacaoRac** | 15 | - | - | ❌ Não mapeado |
| **ContratosReajuste** | 140 | - | - | ❌ Não mapeado |
| **CoresVeiculos** | 13 | - | - | ❌ Não mapeado |
| **DepreciacaoVeiculo** | 5.877 | - | - | ❌ Não mapeado |
| **EstimativaFaturamento** | 2.249 | - | - | ❌ Não mapeado |
| **FaturamentoItems** | 176.498 | - | fat_faturamentos | ⚠️ Agregado |
| **FaturamentoItemsAgrupados** | 40.684 | - | - | ❌ Não mapeado |
| **Faturamentos** | 43.935 | fat_faturamentos (2022-2026) | 43.533 | ✅ **99.08%** |
| **Filiais** | 9 | - | - | ⚠️ Parte de dim_frota |
| **FinalidadesUsoVeiculos** | 3 | - | - | ❌ Não mapeado |
| **Fornecedores** | 4.227 | dim_fornecedores | 4.227 | ✅ **100%** |
| **GruposDespesa** | 211 | - | - | ❌ Não mapeado |
| **GruposPermissaoUsuarios** | 382 | - | - | ❌ Não mapeado |
| **GruposVeiculos** | 27 | - | Parte de dim_frota | ⚠️ Mesclado |
| **HistoricoMobilizacao** | 2.499 | fat_historico_mobilizacao | 2.499 | ✅ **100%** |
| **HistoricoPrecosContratos** | 18.447 | - | - | ❌ Não mapeado |
| **HistoricoSituacaoVeiculos** | 204.739 | historico_situacao_veiculos | 204.709 | ✅ **99.99%** |
| **IndicesReajuste** | 11 | - | - | ❌ Não mapeado |
| **ItensContratos** | 2.599 | dim_itens_contrato | 2.599 | ✅ **100%** |
| **ItensOrdemServico** | 497.851 | fat_detalhe_itens_os (2022-2026) | 241.505 | ⚠️ **48.51%** |
| **ItensProposta** | 2.623 | - | - | ❌ Não mapeado |
| **Lancamentos** | 155.230 | - | fat_financeiro_universal | ⚠️ Agregado |
| **LancamentosComNaturezas** | 186.065 | fat_financeiro_universal (60 meses) | 470.009 | ⚠️ Expandido |
| **LocalizacoesVeiculos** | 7 | - | Parte de dim_frota | ⚠️ Mesclado |
| **MapaFaturamento** | 4.844 | - | - | ❌ Não mapeado |
| **ModificacoesFaturamento** | 27.448 | - | - | ❌ Não mapeado |
| **Montadoras** | 318 | - | Parte de dim_frota | ⚠️ Mesclado |
| **MotivosAdicionaisOcorrencias** | 9.533 | - | - | ❌ Não mapeado |
| **MotivosOcorrencia** | 63 | - | - | ❌ Não mapeado |
| **MovimentacaoOcorrencias** | 213.636 | fat_movimentacao_ocorrencias | 136.663 | ⚠️ **64.01%** |
| **MovimentacaoPatios** | 71.675 | dim_movimentacao_patios | 5.562 | ⚠️ **7.76%** |
| **MovimentacaoVeiculos** | 6.883 | dim_movimentacao_veiculos | 6.832 | ✅ **99.26%** |
| **NaturezasFinanceiras** | 300 | - | - | ❌ Não mapeado |
| **NotasFiscais** | 80.203 | - | - | ❌ Não mapeado |
| **OcorrenciasDevolucao** | 4.559 | - | fat_ocorrencias_master | ⚠️ Consolidado |
| **OcorrenciasInfracoes** | 24.565 | fat_multas (2022-2026) | 24.361 | ✅ **99.17%** |
| **OcorrenciasManutencao** | 59.281 | - | fat_ocorrencias_master | ⚠️ Consolidado |
| **OcorrenciasSinistro** | 6.199 | fat_sinistros (2022-2026) | 6.195 | ✅ **99.94%** |
| **OcorrenciasVeiculoTemporario** | 2.987 | fat_carro_reserva | 2.987 | ✅ **100%** |
| **OrdensServico** | 306.185 | fat_manutencao_unificado | 39.478 | ⚠️ **12.89%** |
| **Patios** | 48 | - | Parte de dim_frota | ⚠️ Mesclado |
| **PecasServicos** | 2.854 | - | - | ❌ Não mapeado |
| **PerfilContrato** | 70.178 | - | dim_regras_contrato | ⚠️ Parcial |
| **PerfisProposta** | 81 | - | - | ❌ Não mapeado |
| **PoliticasContrato** | 407 | - | - | ❌ Não mapeado |
| **PoliticasProposta** | 48 | - | - | ❌ Não mapeado |
| **PrecosFIPE** | 309.368 | - | - | ❌ Não mapeado |
| **Promotores** | 791 | - | - | ❌ Não mapeado |
| **Propostas** | 1.849 | fat_propostas_blufleet (2022-2026) | 1.849 | ✅ **100%** |
| **QualificacoesFornecedores** | 6.612 | - | - | ❌ Não mapeado |
| **RentabilidadeCliente** | 543 | - | - | ❌ Não mapeado |
| **RentabilidadeFrota** | 3.320 | rentabilidade_360_geral | 5.781 | ⚠️ Expandido |
| **SituacoesContratosComerciais** | 2 | - | - | ❌ Não mapeado |
| **SituacoesItemOrdemServico** | 6 | - | - | ❌ Não mapeado |
| **SituacoesOcorrencia** | 4 | - | - | ❌ Não mapeado |
| **SituacoesOrdemServico** | 3 | - | - | ❌ Não mapeado |
| **SituacoesVeiculos** | 22 | - | Parte de dim_frota | ⚠️ Mesclado |
| **TiposContratoComercial** | 2 | - | - | ❌ Não mapeado |
| **TiposLocacao** | 5 | - | - | ❌ Não mapeado |
| **TiposOcorrencia** | 9 | - | - | ❌ Não mapeado |
| **TiposPeriodoContratoComercial** | 4 | - | - | ❌ Não mapeado |
| **TiposRodagemProposta** | 1.400 | - | - | ❌ Não mapeado |
| **Usuarios** | 1.549 | - | agg_performance_usuarios | ⚠️ Agregado |
| **Veiculos** | 5.819 | dim_frota | 5.781 | ✅ **99.35%** |
| **VeiculosAcessorios** | 88.063 | dim_veiculos_acessorios | 5.798 | ⚠️ **6.58%** |
| **VeiculosComprados** | 5.819 | dim_compras | 5.754 | ✅ **98.88%** |
| **VeiculosVendidos** | 3.212 | fat_vendas (2022-2026) | 3.174 | ✅ **98.82%** |

---

## 🔍 Análise Detalhada de Discrepâncias

### 1. **Alienacoes: 20.16% de cobertura** ⚠️
- **Origem:** 2.227 registros
- **Destino:** 449 registros (com 1.778 duplicatas removidas)
- **Causa:** Query filtrando apenas registros com `DataEntrada IS NOT NULL`
- **Solução:** Revisar filtros e considerar incluir alienações em andamento

### 2. **ItensOrdemServico: 48.51% de cobertura** ⚠️
- **Origem:** 497.851 registros
- **Destino:** 241.505 registros (soma 2022-2026)
- **Causa:** 
  - Filtro por ano pode estar excluindo registros antigos (pré-2022)
  - Filtro `SituacaoOrdemServico <> 'Cancelada'` pode estar removendo muitos itens
- **Solução:** 
  - Adicionar anos anteriores a 2022 se necessário
  - Revisar se canceladas devem ser incluídas para análise histórica

### 3. **OrdensServico: 12.89% de cobertura** ⚠️
- **Origem:** 306.185 registros
- **Destino:** 39.478 registros
- **Causa:** Query `fat_manutencao_unificado` está muito seletiva
- **Solução:** Revisar filtros e agregações

### 4. **MovimentacaoOcorrencias: 64.01% de cobertura** ⚠️
- **Origem:** 213.636 registros
- **Destino:** 136.663 registros
- **Causa:** Possível filtro temporal ou de status
- **Solução:** Verificar condições WHERE na query

### 5. **MovimentacaoPatios: 7.76% de cobertura** ⚠️
- **Origem:** 71.675 registros
- **Destino:** 5.562 registros (com 66.113 duplicatas removidas)
- **Causa:** Remoção agressiva de duplicatas
- **Solução:** Revisar lógica de deduplicação - pode estar removendo registros válidos

### 6. **VeiculosAcessorios: 6.58% de cobertura** ⚠️
- **Origem:** 88.063 registros
- **Destino:** 5.798 registros (com 82.265 duplicatas removidas)
- **Causa:** Remoção massiva de duplicatas
- **Solução:** Verificar se há registros históricos legítimos sendo removidos

---

## 📈 Resumo de Cobertura

| Status | Quantidade | Percentual |
|--------|------------|------------|
| ✅ 100% de cobertura | 8 tabelas | 13.33% |
| ✅ 95-99% de cobertura | 8 tabelas | 13.33% |
| ⚠️ 50-94% de cobertura | 4 tabelas | 6.67% |
| ⚠️ <50% de cobertura | 6 tabelas | 10% |
| ❌ Não mapeado | 34 tabelas | 56.67% |
| **Total** | **60 tabelas** | **100%** |

---

## 🎯 Ações Recomendadas

### Alta Prioridade
1. **Alienacoes** - Ajustar filtro `DataEntrada IS NOT NULL` 
2. **ItensOrdemServico** - Revisar filtro de anos e status cancelado
3. **OrdensServico** - Simplificar query de `fat_manutencao_unificado`
4. **MovimentacaoPatios** - Revisar lógica de deduplicação
5. **VeiculosAcessorios** - Verificar remoção excessiva de duplicatas

### Média Prioridade
6. **MovimentacaoOcorrencias** - Verificar filtros temporais
7. **FaturamentoItems** - Validar agregação em `fat_faturamentos`
8. **PerfilContrato** - Mapear para `dim_regras_contrato` completo

### Baixa Prioridade
9. Mapear tabelas de suporte (CategoriasFornecedores, Compradores, etc.)
10. Criar views para tabelas de domínio (TiposOcorrencia, SituacoesVeiculos, etc.)

---

## 🔧 Queries a Revisar

### 1. dim_alienacoes (Prioridade: ALTA)
```sql
-- Problema: Filtro DataEntrada IS NOT NULL muito restritivo
-- Solução: Incluir registros sem data de entrada
SELECT ... FROM Alienacoes av
WHERE 1=1  -- Remover ou relaxar filtro de DataEntrada
```

### 2. fat_detalhe_itens_os (Prioridade: ALTA)
```sql
-- Problema: Anos limitados e filtro de canceladas
-- Solução: Expandir range de anos
queryGen: (year) => `... 
WHERE YEAR(os.DataInicioServico) = ${year}
-- AND os.SituacaoOrdemServico <> 'Cancelada'  -- Considerar incluir
```

### 3. dim_movimentacao_patios (Prioridade: ALTA)
```sql
-- Problema: Remoção de 66.113 duplicatas (92.24%)
-- Solução: Revisar critérios de DISTINCT ou GROUP BY
```

### 4. dim_veiculos_acessorios (Prioridade: ALTA)
```sql
-- Problema: Remoção de 82.265 duplicatas (93.42%)
-- Solução: Manter histórico de acessórios por veículo/data
```

---

**Próximos Passos:**
1. ✅ Implementar correções nas queries de alta prioridade
2. ⏳ Re-executar ETL e validar melhorias
3. ⏳ Documentar regras de negócio para cada filtro aplicado
4. ⏳ Criar testes automatizados de cobertura de dados
