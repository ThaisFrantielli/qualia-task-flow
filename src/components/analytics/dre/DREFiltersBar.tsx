import { useMemo } from 'react';
import { X, Filter } from 'lucide-react';
import { Card } from '@tremor/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { MultiSelect } from '@/components/ui/multi-select';
import { useDREFilters } from '@/contexts/DREFiltersContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DREFiltersBarProps {
  clientesList: string[];
  contratosComerciais: string[];
  naturezasList: string[];
  situacoesContratoList: string[];
}

export default function DREFiltersBar({
  clientesList,
  contratosComerciais,
  naturezasList,
  situacoesContratoList,
}: DREFiltersBarProps) {
  const {
    filters,
    setDateRange,
    setClientes,
    setContratosComerciais,
    setNaturezas,
    setSituacoesContrato,
    clearAllFilters,
    hasActiveFilters,
  } = useDREFilters();

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange?.from || filters.dateRange?.to) count++;
    if (filters.clientes.length > 0) count++;
    if (filters.contratosComerciais.length > 0) count++;
    if (filters.naturezas.length > 0) count++;
    if (filters.situacoesContrato.length > 0) count++;
    return count;
  }, [filters]);

  // Format date range for badge
  const dateRangeLabel = useMemo(() => {
    if (!filters.dateRange?.from) return null;
    const from = format(filters.dateRange.from, 'dd/MM/yy', { locale: ptBR });
    const to = filters.dateRange.to
      ? format(filters.dateRange.to, 'dd/MM/yy', { locale: ptBR })
      : from;
    return `${from} - ${to}`;
  }, [filters.dateRange]);

  return (
    <Card className="mb-4">
      <div className="space-y-4">
        {/* Filter Controls */}
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filtros</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} ativo{activeFilterCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date Range Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Período
            </label>
            <DateRangePicker
              value={filters.dateRange}
              onChange={setDateRange}
              className="w-full"
            />
          </div>

          {/* Cliente MultiSelect */}
          <div>
            <MultiSelect
              label="Cliente"
              options={clientesList}
              selected={filters.clientes}
              onSelectedChange={setClientes}
              placeholder="Todos os clientes"
              searchPlaceholder="Buscar cliente..."
              emptyMessage="Nenhum cliente encontrado"
              maxDisplay={1}
            />
          </div>

          {/* Contrato Comercial MultiSelect */}
          <div>
            <MultiSelect
              label="Contrato Comercial"
              options={contratosComerciais}
              selected={filters.contratosComerciais}
              onSelectedChange={setContratosComerciais}
              placeholder="Todos os contratos"
              searchPlaceholder="Buscar contrato..."
              emptyMessage="Nenhum contrato encontrado"
              maxDisplay={1}
            />
          </div>

          {/* Natureza MultiSelect */}
          <div>
            <MultiSelect
              label="Natureza"
              options={naturezasList}
              selected={filters.naturezas}
              onSelectedChange={setNaturezas}
              placeholder="Todas as naturezas"
              searchPlaceholder="Buscar natureza..."
              emptyMessage="Nenhuma natureza encontrada"
              maxDisplay={1}
            />
          </div>

          {/* Situação Contrato MultiSelect */}
          <div>
            <MultiSelect
              label="Situação Contrato"
              options={situacoesContratoList}
              selected={filters.situacoesContrato}
              onSelectedChange={setSituacoesContrato}
              placeholder="Todas as situações"
              searchPlaceholder="Buscar situação..."
              emptyMessage="Nenhuma situação encontrada"
              maxDisplay={1}
            />
          </div>
        </div>

        {/* Active Filters Badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500">Filtros ativos:</span>

            {dateRangeLabel && (
              <Badge variant="outline" className="text-xs gap-1 pr-1">
                Período: {dateRangeLabel}
                <button
                  onClick={() => setDateRange(undefined)}
                  className="ml-1 hover:bg-slate-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.clientes.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1 pr-1">
                Clientes: {filters.clientes.length}
                <button
                  onClick={() => setClientes([])}
                  className="ml-1 hover:bg-slate-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.contratosComerciais.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1 pr-1">
                Contratos: {filters.contratosComerciais.length}
                <button
                  onClick={() => setContratosComerciais([])}
                  className="ml-1 hover:bg-slate-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.naturezas.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1 pr-1">
                Naturezas: {filters.naturezas.length}
                <button
                  onClick={() => setNaturezas([])}
                  className="ml-1 hover:bg-slate-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            {filters.situacoesContrato.length > 0 && (
              <Badge variant="outline" className="text-xs gap-1 pr-1">
                Situações: {filters.situacoesContrato.length}
                <button
                  onClick={() => setSituacoesContrato([])}
                  className="ml-1 hover:bg-slate-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-6"
            >
              Limpar todos
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
