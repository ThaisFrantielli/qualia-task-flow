import { X, ChevronDown } from 'lucide-react';
import { useSinistrosFilters } from '@/contexts/SinistrosFiltersContext';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SinistrosFiltersBarProps {
  culpabilidadeList: string[];
  tiposDanoList: string[];
  placasList: string[];
  statusList: string[];
}

export function SinistrosFiltersBar({
  culpabilidadeList,
  tiposDanoList,
  placasList,
  statusList,
}: SinistrosFiltersBarProps) {
  const {
    filters,
    setDateRange,
    setCulpabilidade,
    setTiposDano,
    setPlacas,
    setStatus,
    clearAllFilters,
    hasActiveFilters,
  } = useSinistrosFilters();

  const [showMoreFilters, setShowMoreFilters] = useState(false);

  return (
    <div className="bg-white border rounded-lg p-3 space-y-2">
      {/* Linha principal de filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker
          value={filters.dateRange}
          onChange={setDateRange}
        />

        <MultiSelect
          label="Culpabilidade"
          options={culpabilidadeList.filter(c => c && c.trim())}
          selected={filters.culpabilidade}
          onSelectedChange={setCulpabilidade}
          placeholder="Culpa..."
          searchPlaceholder="Buscar..."
          className="w-40"
        />

        <MultiSelect
          label="Tipo de Dano"
          options={tiposDanoList.filter(t => t && t.trim())}
          selected={filters.tiposDano}
          onSelectedChange={setTiposDano}
          placeholder="Tipo..."
          searchPlaceholder="Buscar tipo..."
          className="w-44"
        />

        <Collapsible open={showMoreFilters} onOpenChange={setShowMoreFilters}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <ChevronDown className={`w-3 h-3 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`} />
              Mais Filtros
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
                label="Status"
                options={statusList.filter(s => s && s.trim())}
                selected={filters.status}
                onSelectedChange={setStatus}
                placeholder="Status..."
                searchPlaceholder="Buscar status..."
                className="w-40"
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
          {filters.culpabilidade.length > 0 && (
            <Badge variant="secondary" className="text-xs">⚖️ {filters.culpabilidade.length} Culpa</Badge>
          )}
          {filters.tiposDano.length > 0 && (
            <Badge variant="secondary" className="text-xs">💥 {filters.tiposDano.length} Tipo(s)</Badge>
          )}
          {filters.placas.length > 0 && (
            <Badge variant="secondary" className="text-xs">🚗 {filters.placas.length} Placa(s)</Badge>
          )}
          {filters.status.length > 0 && (
            <Badge variant="secondary" className="text-xs">🔖 {filters.status.length} Status</Badge>
          )}
        </div>
      )}
    </div>
  );
}
