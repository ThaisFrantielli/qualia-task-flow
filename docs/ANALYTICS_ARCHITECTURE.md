# Arquitetura do Módulo de Analytics

## Visão Geral

O módulo de Analytics fornece dashboards interativos estilo Power BI para análise de dados de BI da frota, manutenção, financeiro, clientes e operações.

## Estrutura de Arquivos

```
src/
├── components/analytics/
│   ├── charts/                    # Componentes de gráficos reutilizáveis
│   │   ├── index.ts              # Re-exports
│   │   ├── KPICard.tsx           # Cards de KPI com trend/semáforo
│   │   ├── TimeSeriesChart.tsx   # Gráficos temporais
│   │   ├── RankingChart.tsx      # Rankings horizontais
│   │   └── DistributionChart.tsx # Pie/Donut charts
│   ├── AnalyticsLoading.tsx      # Skeleton loading
│   ├── AnalyticsError.tsx        # Error states
│   ├── AnalyticsLayout.tsx       # Layout padrão
│   ├── EmptyState.tsx            # Estados vazios
│   └── ChartFilterBadges.tsx     # Badges de filtros ativos
├── hooks/
│   ├── useBIData.ts              # Hook principal para dados BI
│   └── useChartFilter.ts         # Hook para filtros Power BI style
├── lib/analytics/
│   └── formatters.ts             # Funções de formatação centralizadas
├── types/
│   └── analytics.ts              # Tipos TypeScript para BI
└── pages/analytics/
    ├── FleetDashboard.tsx        # Dashboard de Frota
    ├── MaintenanceDashboard.tsx  # Dashboard de Manutenção
    ├── FinancialDashboard.tsx    # Dashboard Financeiro
    └── ...                       # Outros dashboards
```

## Fluxo de Dados

```
ETL Pipeline (Node.js externo)
        │
        ▼
Supabase Storage (bi-reports bucket)
        │
        ▼
useBIData Hook (fetch + cache + retry)
        │
        ▼
Dashboard Component
        │
        ├── Filtros (useChartFilter + MaintenanceFiltersContext)
        ├── KPIs (useMemo)
        └── Gráficos (Recharts)
```

## Hook useBIData

```typescript
const { data, metadata, loading, error, refetch, lastUpdated } = useBIData<T>('filename.json', {
  staleTime: 300000, // 5 min cache
  enabled: true,
});
```

### Features:
- **Retry automático**: 3 tentativas com backoff exponencial
- **Cache**: 5 minutos de staleTime padrão
- **Sharding**: Suporta arquivos sharded (`fat_*.json`, `fat_*_*.json`)
- **Chunks**: Detecta automaticamente arquivos particionados
- **Refetch**: Função para forçar refresh

## Padrão de Filtros Power BI

```typescript
const { filters, handleChartClick, clearFilter, clearAllFilters, hasActiveFilters, isValueSelected, getFilterValues } = useChartFilter();

// No gráfico:
<Bar onClick={(d, _, e) => handleChartClick('cliente', d.name, e as React.MouseEvent)}>
  {data.map(entry => (
    <Cell fill={isValueSelected('cliente', entry.name) ? '#be123c' : '#f43f5e'} />
  ))}
</Bar>

// Ctrl+Click para multi-seleção
```

## Componentes Reutilizáveis

### KPICard
```tsx
<KPICard
  title="Faturamento"
  value={1500000}
  previousValue={1400000}
  unit="currency"
  decorationColor="emerald"
  showTrend
/>
```

### TimeSeriesChart
```tsx
<TimeSeriesChart
  data={monthlyData}
  primaryKey="valor"
  secondaryKey="quantidade"
  primaryType="bar"
  secondaryType="line"
  onClick={handleChartClick}
/>
```

### RankingChart
```tsx
<RankingChart
  data={topClientes}
  title="Top 10 Clientes"
  formatValue={fmtCompact}
  onClick={(d, e) => handleChartClick('cliente', d.name, e)}
/>
```

## Formatadores

```typescript
import { fmtBRL, fmtCompact, fmtPercent, monthLabel, getDeltaColor } from '@/lib/analytics/formatters';

fmtBRL(1500000)     // "R$ 1.500.000,00"
fmtCompact(1500000) // "R$ 1.5M"
fmtPercent(85.5)    // "85.5%"
monthLabel('2024-03') // "Mar/24"
```

## Checklist para Novos Dashboards

1. [ ] Criar arquivo em `src/pages/analytics/`
2. [ ] Usar `AnalyticsLayout` como wrapper
3. [ ] Usar `useBIData` para carregar dados
4. [ ] Implementar loading com `AnalyticsLoading`
5. [ ] Implementar error com `AnalyticsError`
6. [ ] Implementar empty state com `EmptyState`
7. [ ] Usar `useChartFilter` para filtros interativos
8. [ ] Usar componentes de `@/components/analytics/charts`
9. [ ] Usar formatadores de `@/lib/analytics/formatters`
10. [ ] Adicionar rota em `App.tsx`
11. [ ] Adicionar entrada na tabela `analytics_pages` do Supabase

## ETL e Arquivos de Dados

### Dimensões (dim_*.json)
- `dim_frota.json` - Cadastro de veículos
- `dim_contratos.json` - Contratos
- `dim_clientes.json` - Clientes

### Fatos Sharded por Ano (fat_*_YYYY.json)
- `fat_faturamento_*.json` - Faturamento
- `fat_manutencao_os_*.json` - Ordens de serviço
- `fat_multas_*.json` - Multas

### Fatos Sharded por Mês (fat_*_YYYY_MM.json)
- `fat_financeiro_universal_*_*.json` - Financeiro detalhado

### Arquivos Especiais
- `hist_vida_veiculo_timeline.json` - Timeline de eventos
- `auditoria_consolidada.json` - Dados de qualidade
