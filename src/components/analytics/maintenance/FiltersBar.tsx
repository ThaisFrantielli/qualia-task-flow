import { useState, useEffect, useRef } from 'react';
import { X, SlidersHorizontal, Settings2 } from 'lucide-react';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';

interface FiltersBarProps {
  fornecedoresList: string[];
  tiposList: string[];
  clientesList: string[];
  contratosList: string[];
  etapasList: string[];
  placasList: string[];
}

const STATUS_OPTIONS = ['Todos', 'Ativa', 'Concluída', 'Cancelada', 'Aguardando Chegada'];

const ALL_FILTER_KEYS = ['periodo', 'status', 'cliente', 'contrato', 'fornecedor', 'tipo', 'etapa', 'placa'] as const;
type FilterKey = typeof ALL_FILTER_KEYS[number];

const FILTER_LABELS: Record<FilterKey, string> = {
  periodo: 'Período',
  status: 'Status',
  cliente: 'Cliente',
  contrato: 'Contrato',
  fornecedor: 'Fornecedor',
  tipo: 'Tipo',
  etapa: 'Etapa',
  placa: 'Placa',
};

const DEFAULT_VISIBLE: FilterKey[] = ['periodo', 'status', 'cliente', 'contrato', 'fornecedor', 'tipo'];
const LS_KEY = 'maintenance_visible_filters';

function loadVisible(): FilterKey[] {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as FilterKey[];
    }
  } catch { /* ignore */ }
  return DEFAULT_VISIBLE;
}

export function FiltersBar({ fornecedoresList, tiposList, clientesList, contratosList, etapasList, placasList }: FiltersBarProps) {
  const { filters, updateFilters, clearAllFilters, hasActiveFilters } = useMaintenanceFilters();
  const [visible, setVisible] = useState<FilterKey[]>(loadVisible);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const custRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(visible));
  }, [visible]);

  useEffect(() => {
    if (!showCustomizer) return;
    const handler = (e: MouseEvent) => {
      if (custRef.current && !custRef.current.contains(e.target as Node))
        setShowCustomizer(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCustomizer]);

  const toggleFilter = (key: FilterKey) =>
    setVisible(v => v.includes(key) ? v.filter(k => k !== key) : [...v, key]);

  const activeCount = [
    filters.dateRange ? 1 : 0,
    filters.status !== 'Todos' ? 1 : 0,
    filters.clientes.length > 0 ? 1 : 0,
    filters.contratos.length > 0 ? 1 : 0,
    filters.fornecedores.length > 0 ? 1 : 0,
    filters.tipos.length > 0 ? 1 : 0,
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
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground h-7">
              <X className="w-3 h-3 mr-1" /> Limpar
            </Button>
          )}
          <div className="relative" ref={custRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomizer(v => !v)}
              className={`text-xs h-7 gap-1 ${showCustomizer ? 'border-indigo-400 text-indigo-600' : ''}`}
            >
              <Settings2 className="w-3 h-3" />
              Personalizar
            </Button>
            {showCustomizer && (
              <div className="absolute right-0 top-9 z-50 bg-popover border border-border rounded-xl shadow-xl p-3 min-w-[200px]">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Filtros visíveis</p>
                <div className="space-y-1">
                  {ALL_FILTER_KEYS.map(key => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-sm rounded px-1.5 py-1 hover:bg-muted select-none">
                      <input
                        type="checkbox"
                        checked={visible.includes(key)}
                        onChange={() => toggleFilter(key)}
                        className="accent-indigo-600 w-3.5 h-3.5"
                      />
                      <span className="text-foreground">{FILTER_LABELS[key]}</span>
                      {/* Show badge if this filter is active */}
                      {(key === 'cliente' && filters.clientes.length > 0) && <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 rounded-full px-1.5">{filters.clientes.length}</span>}
                      {(key === 'contrato' && filters.contratos.length > 0) && <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 rounded-full px-1.5">{filters.contratos.length}</span>}
                    </label>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border">
                  <button
                    className="text-xs text-indigo-600 hover:underline"
                    onClick={() => setVisible(DEFAULT_VISIBLE)}
                  >
                    Restaurar padrão
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        {visible.includes('periodo') && (
          <div className="min-w-[200px]">
            <DateRangePicker
              value={filters.dateRange}
              onChange={(range) => updateFilters({ dateRange: range })}
            />
          </div>
        )}

        {visible.includes('status') && (
          <div className="min-w-[140px]">
            <select
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
              value={filters.status}
              onChange={(e) => updateFilters({ status: e.target.value })}
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        {visible.includes('cliente') && (
          <MultiSelect
            options={clientesList}
            selected={filters.clientes}
            onSelectedChange={(v: string[]) => updateFilters({ clientes: v })}
            placeholder="Cliente"
            className="min-w-[160px]"
          />
        )}

        {visible.includes('contrato') && (
          <MultiSelect
            options={contratosList}
            selected={filters.contratos}
            onSelectedChange={(v: string[]) => updateFilters({ contratos: v })}
            placeholder="Contrato"
            className="min-w-[190px]"
          />
        )}

        {visible.includes('fornecedor') && (
          <MultiSelect
            options={fornecedoresList}
            selected={filters.fornecedores}
            onSelectedChange={(v: string[]) => updateFilters({ fornecedores: v })}
            placeholder="Fornecedor"
            className="min-w-[160px]"
          />
        )}

        {visible.includes('tipo') && (
          <MultiSelect
            options={tiposList}
            selected={filters.tipos}
            onSelectedChange={(v: string[]) => updateFilters({ tipos: v })}
            placeholder="Tipo"
            className="min-w-[140px]"
          />
        )}

        {visible.includes('etapa') && (
          <MultiSelect
            options={etapasList}
            selected={filters.etapas}
            onSelectedChange={(v: string[]) => updateFilters({ etapas: v })}
            placeholder="Etapa"
            className="min-w-[120px]"
          />
        )}

        {visible.includes('placa') && (
          <MultiSelect
            options={placasList}
            selected={filters.placas}
            onSelectedChange={(v: string[]) => updateFilters({ placas: v })}
            placeholder="Placa"
            className="min-w-[120px]"
          />
        )}
      </div>
    </div>
  );
}

