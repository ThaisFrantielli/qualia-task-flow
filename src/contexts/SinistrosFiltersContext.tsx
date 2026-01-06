import React, { createContext, useContext, useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

export interface SinistrosFilters {
  dateRange?: DateRange;
  culpabilidade: string[];
  tiposDano: string[];
  placas: string[];
  status: string[];
}

interface SinistrosFiltersContextType {
  filters: SinistrosFilters;
  setDateRange: (range: DateRange | undefined) => void;
  setCulpabilidade: (culpa: string[]) => void;
  setTiposDano: (tipos: string[]) => void;
  setPlacas: (placas: string[]) => void;
  setStatus: (status: string[]) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

const SinistrosFiltersContext = createContext<SinistrosFiltersContextType | undefined>(undefined);

const initialFilters: SinistrosFilters = {
  culpabilidade: [],
  tiposDano: [],
  placas: [],
  status: [],
};

export const SinistrosFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<SinistrosFilters>(initialFilters);

  const setDateRange = (range: DateRange | undefined) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  };

  const setCulpabilidade = (culpa: string[]) => {
    setFilters(prev => ({ ...prev, culpabilidade: culpa }));
  };

  const setTiposDano = (tipos: string[]) => {
    setFilters(prev => ({ ...prev, tiposDano: tipos }));
  };

  const setPlacas = (placas: string[]) => {
    setFilters(prev => ({ ...prev, placas }));
  };

  const setStatus = (status: string[]) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const clearAllFilters = () => {
    setFilters(initialFilters);
  };

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.dateRange ||
      filters.culpabilidade.length > 0 ||
      filters.tiposDano.length > 0 ||
      filters.placas.length > 0 ||
      filters.status.length > 0
    );
  }, [filters]);

  return (
    <SinistrosFiltersContext.Provider value={{
      filters,
      setDateRange,
      setCulpabilidade,
      setTiposDano,
      setPlacas,
      setStatus,
      clearAllFilters,
      hasActiveFilters,
    }}>
      {children}
    </SinistrosFiltersContext.Provider>
  );
};

export const useSinistrosFilters = () => {
  const context = useContext(SinistrosFiltersContext);
  if (!context) {
    throw new Error('useSinistrosFilters must be used within SinistrosFiltersProvider');
  }
  return context;
};
