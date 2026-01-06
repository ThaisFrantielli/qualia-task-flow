import React, { createContext, useContext, useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

export interface MultasFilters {
  dateRange?: DateRange;
  status: string[];
  condutores: string[];
  placas: string[];
  tiposInfracao: string[];
}

interface MultasFiltersContextType {
  filters: MultasFilters;
  setDateRange: (range: DateRange | undefined) => void;
  setStatus: (status: string[]) => void;
  setCondutores: (condutores: string[]) => void;
  setPlacas: (placas: string[]) => void;
  setTiposInfracao: (tipos: string[]) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

const MultasFiltersContext = createContext<MultasFiltersContextType | undefined>(undefined);

const initialFilters: MultasFilters = {
  status: [],
  condutores: [],
  placas: [],
  tiposInfracao: [],
};

export const MultasFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<MultasFilters>(initialFilters);

  const setDateRange = (range: DateRange | undefined) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  };

  const setStatus = (status: string[]) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const setCondutores = (condutores: string[]) => {
    setFilters(prev => ({ ...prev, condutores }));
  };

  const setPlacas = (placas: string[]) => {
    setFilters(prev => ({ ...prev, placas }));
  };

  const setTiposInfracao = (tipos: string[]) => {
    setFilters(prev => ({ ...prev, tiposInfracao: tipos }));
  };

  const clearAllFilters = () => {
    setFilters(initialFilters);
  };

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.dateRange ||
      filters.status.length > 0 ||
      filters.condutores.length > 0 ||
      filters.placas.length > 0 ||
      filters.tiposInfracao.length > 0
    );
  }, [filters]);

  return (
    <MultasFiltersContext.Provider value={{
      filters,
      setDateRange,
      setStatus,
      setCondutores,
      setPlacas,
      setTiposInfracao,
      clearAllFilters,
      hasActiveFilters,
    }}>
      {children}
    </MultasFiltersContext.Provider>
  );
};

export const useMultasFilters = () => {
  const context = useContext(MultasFiltersContext);
  if (!context) {
    throw new Error('useMultasFilters must be used within MultasFiltersProvider');
  }
  return context;
};
