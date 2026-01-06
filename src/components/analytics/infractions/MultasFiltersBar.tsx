import { X, ChevronDown } from 'lucide-react';
import { useMultasFilters } from '@/contexts/MultasFiltersContext';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MultasFiltersBarProps {
  condutoresList: string[];
  placasList: string[];
  tiposInfracaoList: string[];
  statusList: string[];
}

export function MultasFiltersBar({
  condutoresList,
  placasList,
  tiposInfracaoList,
  statusList,
}: MultasFiltersBarProps) {
  const {
    filters,
    setDateRange,
    setStatus,
    setCondutores,
    setPlacas,
    setTiposInfracao,
    clearAllFilters,
    hasActiveFilters,
  } = useMultasFilters();

  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const activeCount = [
    filters.dateRange,
    filters.status.length > 0,
    filters.condutores.length > 0,
    filters.placas.length > 0,
    filters.tiposInfracao.length > 0,
  ].filter(Boolean).length;

  return (
    <div className="bg-white border rounded-lg p-3 space-y-2">
      {/* Linha principal de filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker
          value={filters.dateRange}
          onChange={setDateRange}
        />

        <MultiSelect
          label="Status"
          options={statusList.filter(s => s && s.trim())}
          selected={filters.status}
          onSelectedChange={setStatus}
          placeholder="Status..."
          searchPlaceholder="Buscar..."
          className="w-36"
        />

        <MultiSelect
          label="Condutor"
          options={condutoresList.filter(c => c && c.trim())}
          selected={filters.condutores}
          onSelectedChange={setCondutores}
          placeholder="Condutor..."
          searchPlaceholder="Buscar condutor..."
          className="w-44"
        />

        <Collapsible open={showMoreFilters} onOpenChange={setShowMoreFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <ChevronDown className={`w-3 h-3 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`} />
              Mais Filtros
              {activeCount > 2 && <Badge variant="secondary" className="ml-1 text-xs">{activeCount - 2}</Badge>}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="absolute z-50 mt-2 p-3 bg-white border rounded-lg shadow-lg">
            <div className="flex gap-3">
              <MultiSelect
                label="Placas"
                options={placasList.filter(p => p && p.trim())}
                selected={filters.placas}
                onSelectedChange={setPlacas}
                placeholder="Placas..."
                searchPlaceholder="Buscar placa..."
                className="w-40"
              />
              <MultiSelect
                label="Tipo Infração"
                options={tiposInfracaoList.filter(t => t && t.trim())}
                selected={filters.tiposInfracao}
                onSelectedChange={setTiposInfracao}
                placeholder="Tipo..."
                searchPlaceholder="Buscar tipo..."
                className="w-48"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-slate-500 hover:text-rose-600"
          >
            <X className="w-3 h-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Badges de filtros ativos */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filters.dateRange && (
            <Badge variant="secondary" className="text-xs">📅 Período</Badge>
          )}
          {filters.status.length > 0 && (
            <Badge variant="secondary" className="text-xs">🔖 {filters.status.length} Status</Badge>
          )}
          {filters.condutores.length > 0 && (
            <Badge variant="secondary" className="text-xs">👤 {filters.condutores.length} Condutor(es)</Badge>
          )}
          {filters.placas.length > 0 && (
            <Badge variant="secondary" className="text-xs">🚗 {filters.placas.length} Placa(s)</Badge>
          )}
          {filters.tiposInfracao.length > 0 && (
            <Badge variant="secondary" className="text-xs">⚠️ {filters.tiposInfracao.length} Tipo(s)</Badge>
          )}
        </div>
      )}
    </div>
  );
}
