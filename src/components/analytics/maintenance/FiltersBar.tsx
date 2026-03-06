import { X, SlidersHorizontal } from 'lucide-react';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';

interface FiltersBarProps {
  fornecedoresList: string[];
  tiposList: string[];
  clientesList: string[];
  etapasList: string[];
  placasList: string[];
}

const STATUS_OPTIONS = ['Todos', 'Ativa', 'Concluída', 'Cancelada', 'Aguardando Chegada'];

export function FiltersBar({ fornecedoresList, tiposList, clientesList, etapasList, placasList }: FiltersBarProps) {
  const { filters, updateFilters, clearAllFilters, hasActiveFilters } = useMaintenanceFilters();

  const activeCount = [
    filters.dateRange ? 1 : 0,
    filters.status !== 'Todos' ? 1 : 0,
    filters.fornecedores.length > 0 ? 1 : 0,
    filters.tipos.length > 0 ? 1 : 0,
    filters.clientes.length > 0 ? 1 : 0,
    filters.etapas.length > 0 ? 1 : 0,
    filters.placas.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Filtros</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeCount} ativo{activeCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground h-7">
            <X className="w-3 h-3 mr-1" /> Limpar
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div className="min-w-[200px]">
          <DateRangePicker
            value={filters.dateRange}
            onChange={(range) => updateFilters({ dateRange: range })}
          />
        </div>

        <div className="min-w-[140px]">
          <select
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <MultiSelect
          options={fornecedoresList}
          selected={filters.fornecedores}
          onSelectedChange={(v: string[]) => updateFilters({ fornecedores: v })}
          placeholder="Fornecedor"
          className="min-w-[160px]"
        />

        <MultiSelect
          options={tiposList}
          selected={filters.tipos}
          onSelectedChange={(v: string[]) => updateFilters({ tipos: v })}
          placeholder="Tipo"
          className="min-w-[140px]"
        />

        <MultiSelect
          options={clientesList}
          selected={filters.clientes}
          onSelectedChange={(v: string[]) => updateFilters({ clientes: v })}
          placeholder="Cliente"
          className="min-w-[140px]"
        />

        <MultiSelect
          options={etapasList}
          selected={filters.etapas}
          onSelectedChange={(v: string[]) => updateFilters({ etapas: v })}
          placeholder="Etapa"
          className="min-w-[120px]"
        />

        <MultiSelect
          options={placasList}
          selected={filters.placas}
          onSelectedChange={(v: string[]) => updateFilters({ placas: v })}
          placeholder="Placa"
          className="min-w-[120px]"
        />
      </div>
    </div>
  );
}
