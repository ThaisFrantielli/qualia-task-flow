
# Plano de Ajuste - Analytics DRE GERENCIAL

## Objetivo
Implementar sistema de filtros avançados no Dashboard DRE Gerencial, substituindo o seletor de meses atual por um conjunto de filtros mais flexível e poderoso, similar ao padrão usado nos dashboards de Manutenção, Multas e Sinistros.

---

## Análise da Situação Atual

### Dashboard Existente (DREDashboard.tsx)
- Utiliza `MonthFilter` para seleção de períodos (lista de checkboxes de meses)
- Dados carregados via `useDREData` hook que busca `fato_financeiro_dre.json`
- ~101.835 registros no dataset (11 partes/chunks)
- Interface `DRETransaction` já possui campos: `Cliente`, `IdCliente`, `Natureza`, `DataCompetencia`

### Estrutura de Dados DRE (fato_financeiro_dre)
```text
- NumeroLancamento: string
- TipoLancamento: 'Entrada' | 'Saída'
- Natureza: string (código e descrição, ex: "01.01.01 - RECEITA LOCAÇÃO")
- DataCompetencia: string (YYYY-MM-DD)
- Valor: number
- Cliente?: string
- IdCliente?: number
```

### Fontes de Dados Relacionadas
- `dim_clientes.json`: Lista de clientes com IdCliente, NomeFantasia, Nome
- `dim_contratos_locacao.json`: Contratos com ContratoComercial, NumeroContrato

---

## Novos Filtros a Implementar

| Filtro | Tipo | Comportamento |
|--------|------|---------------|
| **Período** | DateRangePicker | Substituir MonthFilter por seleção de data início/fim com presets |
| **Cliente** | MultiSelect | Lista de clientes únicos extraída dos dados DRE |
| **Contrato Comercial** | MultiSelect | Lista de contratos (requer enriquecimento de dados) |
| **Natureza** | MultiSelect | Lista de naturezas únicas (códigos contábeis) |

---

## Arquitetura da Solução

### Fase 1: Criar Contexto de Filtros DRE

Criar `src/contexts/DREFiltersContext.tsx` seguindo o padrão do `MaintenanceFiltersContext`:

```text
Interface DREFilters:
  - dateRange?: DateRange
  - clientes: string[]
  - contratosComerciais: string[]
  - naturezas: string[]

Métodos:
  - setDateRange()
  - setClientes()
  - setContratosComerciais()
  - setNaturezas()
  - clearAllFilters()
  - hasActiveFilters
```

### Fase 2: Criar Barra de Filtros DRE

Criar `src/components/analytics/dre/DREFiltersBar.tsx`:

```text
Layout (grid 4 colunas):
┌─────────────────┬───────────────┬─────────────────────┬─────────────┐
│ DateRangePicker │  MultiSelect  │    MultiSelect      │ MultiSelect │
│   (Período)     │   (Cliente)   │ (Contrato Comercial)│  (Natureza) │
└─────────────────┴───────────────┴─────────────────────┴─────────────┘

+ Badges mostrando filtros ativos
+ Botão "Limpar todos"
```

### Fase 3: Atualizar Interface DRETransaction

Adicionar campos opcionais para suportar contrato comercial:

```typescript
export interface DRETransaction {
  // ... campos existentes ...
  ContratoComercial?: string;
  NumeroContrato?: string;
}
```

### Fase 4: Atualizar useDREData Hook

Modificar para enriquecer dados com informações de contrato quando disponível:
- Buscar `dim_contratos_locacao.json` para relacionar Cliente -> Contrato
- Extrair listas únicas para alimentar os filtros

### Fase 5: Refatorar DREDashboard.tsx

**Antes:**
```typescript
<MonthFilter
  availableMonths={availableMonths}
  selectedMonths={selectedMonths}
  onChange={setSelectedMonths}
/>
```

**Depois:**
```typescript
<DREFiltersProvider>
  <DREFiltersBar
    clientesList={uniqueClientes}
    contratosComerciais={uniqueContratos}
    naturezasList={uniqueNaturezas}
  />
  {/* ... resto do dashboard ... */}
</DREFiltersProvider>
```

### Fase 6: Atualizar Lógica de Filtragem

```typescript
const filteredTransactions = useMemo(() => {
  return transactions.filter(t => {
    // Filtro de período
    if (filters.dateRange?.from || filters.dateRange?.to) {
      const date = new Date(t.DataCompetencia);
      if (filters.dateRange.from && date < filters.dateRange.from) return false;
      if (filters.dateRange.to && date > filters.dateRange.to) return false;
    }
    
    // Filtro de cliente
    if (filters.clientes.length > 0) {
      if (!t.Cliente || !filters.clientes.includes(t.Cliente)) return false;
    }
    
    // Filtro de contrato comercial
    if (filters.contratosComerciais.length > 0) {
      if (!t.ContratoComercial || !filters.contratosComerciais.includes(t.ContratoComercial)) return false;
    }
    
    // Filtro de natureza
    if (filters.naturezas.length > 0) {
      if (!t.Natureza || !filters.naturezas.includes(t.Natureza)) return false;
    }
    
    return true;
  });
}, [transactions, filters]);
```

---

## Arquivos a Criar/Modificar

### Novos Arquivos
1. `src/contexts/DREFiltersContext.tsx` - Contexto de filtros
2. `src/components/analytics/dre/DREFiltersBar.tsx` - Barra de filtros

### Arquivos a Modificar
1. `src/utils/dreUtils.ts` - Atualizar interface DRETransaction
2. `src/hooks/useDREData.ts` - Adicionar extração de listas únicas
3. `src/pages/analytics/DREDashboard.tsx` - Integrar novo sistema de filtros
4. `src/App.tsx` - Adicionar DREFiltersProvider no roteamento

---

## Detalhes Técnicos

### Extração de Listas Únicas para Filtros

```typescript
// Em useDREData.ts
const uniqueClientes = useMemo(() => {
  return Array.from(new Set(
    transactions
      .map(t => t.Cliente)
      .filter(Boolean)
  )).sort();
}, [transactions]);

const uniqueNaturezas = useMemo(() => {
  return Array.from(new Set(
    transactions
      .map(t => t.Natureza)
      .filter(Boolean)
  )).sort();
}, [transactions]);
```

### DateRangePicker - Presets Sugeridos

O componente DateRangePicker existente já possui:
- Hoje
- Últimos 7 dias
- Últimos 30 dias
- Este mês
- Mês passado
- Este ano

Adicionar presets específicos para DRE:
- **Último trimestre** (3 meses)
- **Último semestre** (6 meses)
- **Ano anterior**

### Performance

Para dataset de ~100k registros:
- Usar `useMemo` para filtragem
- MultiSelect já possui virtualização implementada
- Cache de 5 minutos via useBIData

---

## Questão sobre Dados de Contrato Comercial

O dataset atual `fato_financeiro_dre.json` pode **não conter** o campo `ContratoComercial` diretamente. Verificar:

1. **Se existir** no JSON: Usar diretamente
2. **Se não existir**: 
   - Opção A: Cruzar com `dim_contratos_locacao.json` usando IdCliente
   - Opção B: Solicitar atualização do pipeline ETL para incluir este campo

Recomendação: Verificar a estrutura real do arquivo JSON durante implementação e ajustar conforme necessário.

---

## Resultado Esperado

Dashboard DRE Gerencial com:
- Filtro de período flexível (data início/fim com presets)
- Filtro multi-seleção de clientes
- Filtro multi-seleção de contratos comerciais
- Filtro multi-seleção de naturezas contábeis
- Badges indicando filtros ativos
- Botão para limpar todos os filtros
- Integração completa com todos os gráficos e tabelas existentes

---

## Ordem de Implementação

1. Criar `DREFiltersContext.tsx`
2. Criar `DREFiltersBar.tsx`
3. Atualizar `dreUtils.ts` (interface)
4. Atualizar `useDREData.ts` (listas únicas)
5. Refatorar `DREDashboard.tsx`
6. Testar integração e performance
