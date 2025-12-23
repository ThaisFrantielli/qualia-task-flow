import { X } from 'lucide-react';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { TimeGranularityToggle } from '@/components/analytics/TimeGranularityToggle';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface GlobalFiltersBarProps {
  fornecedoresList: string[];
  tiposOcorrenciaList: string[];
  clientesList: string[];
  modelosList: string[];
}

export function GlobalFiltersBar({
  fornecedoresList,
  tiposOcorrenciaList,
  clientesList,
  modelosList,
}: GlobalFiltersBarProps) {
  const {
    filters,
    setDateRange,
    setTimeGranularity,
    setFornecedores,
    setTiposOcorrencia,
    setClientes,
    setModelos,
    clearAllFilters,
    hasActiveFilters,
  } = useMaintenanceFilters();

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-slate-700">Filtros Globais</div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            <X className="w-3 h-3 mr-1" />
            Limpar todos
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <DateRangePicker
          value={filters.dateRange}
          onChange={setDateRange}
        />

        <TimeGranularityToggle
          value={filters.timeGranularity}
          onChange={setTimeGranularity}
        />

        <Select
          value={filters.fornecedores[0] || ''}
          onValueChange={(value) => setFornecedores(value && value !== '__all__' ? [value] : [])}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {fornecedoresList.filter(f => f && f.trim()).map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.tiposOcorrencia[0] || ''}
          onValueChange={(value) => setTiposOcorrencia(value && value !== '__all__' ? [value] : [])}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo Ocorrência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {tiposOcorrenciaList.filter(t => t && t.trim()).map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.clientes[0] || ''}
          onValueChange={(value) => setClientes(value && value !== '__all__' ? [value] : [])}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {clientesList.filter(c => c && c.trim()).slice(0, 50).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.modelos[0] || ''}
          onValueChange={(value) => setModelos(value && value !== '__all__' ? [value] : [])}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Modelo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {modelosList.filter(m => m && m.trim()).slice(0, 50).map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {filters.dateRange && (
            <Badge variant="secondary" className="text-xs">
              📅 Período selecionado
            </Badge>
          )}
          {filters.fornecedores.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              🏭 Fornecedor: {filters.fornecedores[0]}
            </Badge>
          )}
          {filters.tiposOcorrencia.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              🔧 Tipo: {filters.tiposOcorrencia[0]}
            </Badge>
          )}
          {filters.clientes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              👤 Cliente: {filters.clientes[0]}
            </Badge>
          )}
          {filters.modelos.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              🚗 Modelo: {filters.modelos[0]}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
