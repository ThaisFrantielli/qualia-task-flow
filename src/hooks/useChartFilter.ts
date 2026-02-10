import { useState, useCallback } from 'react';

export type ChartFilterState = Record<string, string[]>;

interface UseChartFilterReturn {
  filters: ChartFilterState;
  handleChartClick: (key: string, value: string, event?: React.MouseEvent) => void;
  setFilterValues: (key: string, values: string[]) => void;
  setFiltersBulk: (next: ChartFilterState) => void;
  clearFilter: (key: string, value?: string) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
  isValueSelected: (key: string, value: string) => boolean;
  getFilterValues: (key: string) => string[];
}

/**
 * Hook para filtros estilo Power BI em dashboards analíticos
 * - Click simples: substitui o filtro atual
 * - Ctrl+Click: adiciona/remove ao filtro existente (multi-select)
 */
export function useChartFilter(initialFilters: ChartFilterState = {}): UseChartFilterReturn {
  const [filters, setFilters] = useState<ChartFilterState>(initialFilters);

  const setFilterValues = useCallback((key: string, values: string[]) => {
    setFilters(prev => ({ ...prev, [key]: values }));
  }, []);

  const setFiltersBulk = useCallback((next: ChartFilterState) => {
    setFilters(prev => ({ ...prev, ...next }));
  }, []);

  const handleChartClick = useCallback((key: string, value: string, event?: React.MouseEvent) => {
    const isCtrlPressed = event?.ctrlKey || event?.metaKey;
    
    setFilters(prev => {
      const currentValues = prev[key] || [];
      
      if (isCtrlPressed) {
        // Ctrl+Click: toggle value in array
        if (currentValues.includes(value)) {
          const newValues = currentValues.filter(v => v !== value);
          return { ...prev, [key]: newValues };
        } else {
          return { ...prev, [key]: [...currentValues, value] };
        }
      } else {
        // Click simples: toggle single value or replace
        if (currentValues.length === 1 && currentValues[0] === value) {
          // Se já é o único selecionado, limpar
          return { ...prev, [key]: [] };
        }
        return { ...prev, [key]: [value] };
      }
    });
  }, []);

  const clearFilter = useCallback((key: string, value?: string) => {
    setFilters(prev => {
      if (value) {
        return { ...prev, [key]: (prev[key] || []).filter(v => v !== value) };
      }
      return { ...prev, [key]: [] };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  const isValueSelected = useCallback((key: string, value: string) => {
    return (filters[key] || []).includes(value);
  }, [filters]);

  const getFilterValues = useCallback((key: string) => {
    return filters[key] || [];
  }, [filters]);

  return {
    filters,
    handleChartClick,
    setFilterValues,
    setFiltersBulk,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
    isValueSelected,
    getFilterValues
  };
}

export default useChartFilter;
