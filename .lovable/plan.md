

# Plano de Acao: DRE Gerencial Completo

## Situacao Atual

### O que ja existe (componentes orfaos -- nunca montados em nenhuma rota)
- `src/utils/dreUtils.ts` -- logica de hierarquia contabil, KPIs, analise horizontal/vertical
- `src/hooks/useDREData.ts` -- hook que carrega `fato_financeiro_dre` (187k registros em 19 chunks)
- `src/contexts/DREFiltersContext.tsx` -- contexto de filtros (DateRange, Cliente, Contrato, Natureza, Situacao)
- `src/components/analytics/DREPivotTable.tsx` -- tabela pivot hierarquica com expand/collapse
- `src/components/analytics/DREKPICard.tsx` -- card de KPI com sparkline
- `src/components/analytics/dre/DREFiltersBar.tsx` -- barra de filtros multi-select
- `src/components/analytics/MonthFilter.tsx` -- seletor de meses

**Problema**: Nenhuma pagina/rota `DREDashboard` existe. Todos esses componentes estao "soltos" -- nunca foram integrados. O Hub Financeiro no index de Analytics so tem "Faturamento".

### Dados disponiveis
- `fato_financeiro_dre_part{1..19}of19.json` -- 187.182 registros (fonte principal, via `useBIData`)
- `agg_dre_mensal.json` -- agregado mensal pre-calculado (Receita/Despesa por competencia, mas com Receita = 0 em todos os meses)
- `fat_financeiro_universal_YYYY_MM*.json` -- dados financeiros universais mensais
- `agg_dre_mensal.json` parece ter dados so de Despesa (2024), sem Receita -- possivel problema de ETL

### Arquivos remanescentes para limpeza (ndjson LFS nao utilizados)
- `fato_financeiro_dre_dw.ndjson` (31MB)
- `fato_financeiro_dre_dw2.ndjson` (238MB)
- `fato_financeiro_dre_dw_canonical.ndjson` (125MB)
- `fato_financeiro_dre_fast.ndjson` (100MB)
- `fato_financeiro_dre_stream.ndjson` (26MB)
- `fato_financeiro_dre_fast_enriched_sample.ndjson` (2.5KB)
- `fato_financeiro_dre_fast_manifest.json`
- `dre_all_discrepancies_*.csv`, `dre_compare_natureza_*.csv`, `dre_top20_discrepancies_*.csv` (CSVs de debug)
- `mapa_universal_*.ndjson` (3 arquivos, ~160MB total)
- `public/data/analisar-campos-vazios.cjs`, `analyze-idade.cjs`, `analyze-tipos.cjs`, `count-alerts.cjs` (scripts de debug)

---

## Plano de Implementacao

### Etapa 1: Criar a Pagina DRE Gerencial

**Novo arquivo**: `src/pages/analytics/DREGerencialDashboard.tsx`

Estrutura com 4 abas:
1. **Visao Geral** -- 5 KPIs (Receita Total, Despesa Total, EBITDA, Lucro Liquido, Margem %) + grafico de evolucao mensal (area chart Receita vs Despesa vs Lucro) + top 5 naturezas por valor
2. **Demonstrativo** -- Tabela pivot hierarquica (`DREPivotTable`) com analise horizontal e vertical, usando `buildAccountHierarchyByType`
3. **Evolucao** -- Graficos de tendencia: evolucao mensal por grupo contabil, waterfall chart receita-despesa-lucro
4. **Detalhamento** -- Tabela paginada de lancamentos com busca por natureza, entidade, valor

### Etapa 2: Registrar Rota e Navegacao

- `src/App.tsx`: Adicionar rota `/analytics/dre` apontando para `DREGerencialDashboard`
- `src/pages/analytics/index.tsx`: Adicionar link "DRE Gerencial" no Hub Financeiro, junto ao Faturamento existente

### Etapa 3: Integrar Componentes Existentes

Reutilizar todos os componentes orfaos ja prontos:
- `DREFiltersProvider` envolvendo a pagina
- `DREFiltersBar` para filtros globais
- `DREPivotTable` na aba Demonstrativo
- `DREKPICard` na aba Visao Geral
- `MonthFilter` como controle complementar

### Etapa 4: Otimizar Carregamento de Dados

O `useDREData` carrega 187k registros (19 chunks). Melhorias:
- Adicionar indicador de progresso de carregamento (X de 19 chunks)
- Filtrar transacoes por `DREFiltersContext` (dateRange, cliente, natureza) em um `useMemo` antes de passar aos componentes
- Considerar usar `agg_dre_mensal.json` para KPIs iniciais (carregamento instantaneo) enquanto os dados completos carregam

### Etapa 5: Design e UX (Melhores Praticas do Segmento)

Padroes de DRE gerencial do mercado:
- **Header**: Titulo "DRE Gerencial", seletor de periodo, botao exportar Excel
- **KPIs**: Cards com sparkline e indicador de tendencia (ja implementado no `DREKPICard`)
- **Tabela Pivot**: Coluna fixa esquerda (sticky), cores por nivel hierarquico, expand/collapse (ja implementado)
- **Exportacao**: Botao para exportar DRE completo em XLSX com formatacao
- **Responsivo**: Layout mobile-first com scroll horizontal na tabela

### Etapa 6: Limpeza de Remanescentes

Deletar arquivos que nao sao mais utilizados por nenhum componente:

```text
public/data/fato_financeiro_dre_dw.ndjson
public/data/fato_financeiro_dre_dw2.ndjson
public/data/fato_financeiro_dre_dw_canonical.ndjson
public/data/fato_financeiro_dre_fast.ndjson
public/data/fato_financeiro_dre_stream.ndjson
public/data/fato_financeiro_dre_fast_enriched_sample.ndjson
public/data/fato_financeiro_dre_fast_manifest.json
public/data/dre_all_discrepancies_2025-10.csv
public/data/dre_all_discrepancies_2026-01.csv
public/data/dre_compare_natureza_2025-10.csv
public/data/dre_compare_natureza_2026-01.csv
public/data/dre_top20_discrepancies_2025-10.csv
public/data/dre_top20_discrepancies_2026-01.csv
public/data/mapa_universal_sources_raw.ndjson
public/data/mapa_universal_full_with_fontes.ndjson
public/data/mapa_universal_sample.ndjson
public/data/analisar-campos-vazios.cjs
public/data/analyze-idade.cjs
public/data/analyze-tipos.cjs
public/data/count-alerts.cjs
```

### Etapa 7: Fix Build Errors Existentes

- `FleetIdleDashboard.tsx`: Corrigir tipo do objeto na tabela de detalhes (adicionar campos `Chassi`, `Patio`, `DataInicioStatus`, `UltimaMovimentacao`, `UsuarioMovimentacao` ao tipo)

---

## Resumo de Arquivos

| Acao | Arquivo |
|---|---|
| Criar | `src/pages/analytics/DREGerencialDashboard.tsx` |
| Editar | `src/App.tsx` (adicionar rota) |
| Editar | `src/pages/analytics/index.tsx` (link no hub) |
| Editar | `src/pages/analytics/FleetIdleDashboard.tsx` (fix build) |
| Deletar | ~20 arquivos ndjson/csv/cjs remanescentes |

