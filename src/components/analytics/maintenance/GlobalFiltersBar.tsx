import { X } from 'lucide-react';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { TimeGranularityToggle } from '@/components/analytics/TimeGranularityToggle';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';

interface GlobalFiltersBarProps {
  fornecedoresList: string[];
  tiposOcorrenciaList: string[];
  clientesList: string[];
  modelosList: string[];
  contratosComerciais: string[];
  contratosLocacao: string[];
  placasList: string[];
}

export function GlobalFiltersBar({
  fornecedoresList,
  tiposOcorrenciaList,
  clientesList,
  modelosList,
  contratosComerciais,
  contratosLocacao,
  placasList,
}: GlobalFiltersBarProps) {
  const {
    filters,
    setDateRange,
    setTimeGranularity,
    setFornecedores,
    setTiposOcorrencia,
    setClientes,
    setModelos,
    setContratosComerciais,
    setContratosLocacao,
    setPlacas,
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <DateRangePicker
          value={filters.dateRange}
          onChange={setDateRange}
        />

        <TimeGranularityToggle
          value={filters.timeGranularity}
          onChange={setTimeGranularity}
        />

        <MultiSelect
          options={fornecedoresList.filter(f => f && f.trim())}
          selected={filters.fornecedores}
          onSelectedChange={setFornecedores}
          placeholder="Fornecedores"
          searchPlaceholder="Buscar fornecedor..."
        />

        <MultiSelect
          options={tiposOcorrenciaList.filter(t => t && t.trim())}
          selected={filters.tiposOcorrencia}
          onSelectedChange={setTiposOcorrencia}
          placeholder="Tipos de Ocorrência"
          searchPlaceholder="Buscar tipo..."
        />

        <MultiSelect
          options={clientesList.filter(c => c && c.trim())}
          selected={filters.clientes}
          onSelectedChange={setClientes}
          placeholder="Clientes"
          searchPlaceholder="Buscar cliente..."
        />

        <MultiSelect
          options={modelosList.filter(m => m && m.trim())}
          selected={filters.modelos}
          onSelectedChange={setModelos}
          placeholder="Modelos"
          searchPlaceholder="Buscar modelo..."
        />

        <MultiSelect
          options={contratosComerciais.filter(c => c && c.trim())}
          selected={filters.contratosComerciais}
          onSelectedChange={setContratosComerciais}
          placeholder="Contratos Comerciais"
          searchPlaceholder="Buscar contrato..."
        />

        <MultiSelect
          options={contratosLocacao.filter(c => c && c.trim())}
          selected={filters.contratosLocacao}
          onSelectedChange={setContratosLocacao}
          placeholder="Contratos Locação"
          searchPlaceholder="Buscar contrato..."
        />

        <MultiSelect
          options={placasList.filter(p => p && p.trim())}
          selected={filters.placas}
          onSelectedChange={setPlacas}
          placeholder="Placas"
          searchPlaceholder="Buscar placa..."
        />
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
              🏭 {filters.fornecedores.length} Fornecedor(es)
            </Badge>
          )}
          {filters.tiposOcorrencia.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              🔧 {filters.tiposOcorrencia.length} Tipo(s)
            </Badge>
          )}
          {filters.clientes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              👤 {filters.clientes.length} Cliente(s)
            </Badge>
          )}
          {filters.modelos.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              🚗 {filters.modelos.length} Modelo(s)
            </Badge>
          )}
          {filters.contratosComerciais.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              📄 {filters.contratosComerciais.length} Contrato(s) Comercial(is)
            </Badge>
          )}
          {filters.contratosLocacao.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              📋 {filters.contratosLocacao.length} Contrato(s) Locação
            </Badge>
          )}
          {filters.placas.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              🚙 {filters.placas.length} Placa(s)
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
