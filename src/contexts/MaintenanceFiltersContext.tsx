import React, { createContext, useContext, useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

export type TimeGranularity = 'year' | 'month' | 'day';

export interface MaintenanceFilters {
  dateRange?: DateRange;
  timeGranularity: TimeGranularity;
  status: string;
  fornecedores: string[];
  tipos: string[];
  clientes: string[];
  etapas: string[];
  placas: string[];
}

interface MaintenanceFiltersContextType {
  filters: MaintenanceFilters;
  updateFilters: (partial: Partial<MaintenanceFilters>) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

const MaintenanceFiltersContext = createContext<MaintenanceFiltersContextType | undefined>(undefined);

const initialFilters: MaintenanceFilters = {
  timeGranularity: 'month',
  status: 'Todos',
  fornecedores: [],
  tipos: [],
  clientes: [],
  etapas: [],
  placas: [],
};

export const MaintenanceFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<MaintenanceFilters>(initialFilters);

  const updateFilters = (partial: Partial<MaintenanceFilters>) => {
    setFilters(prev => ({ ...prev, ...partial }));
  };

  const clearAllFilters = () => setFilters(initialFilters);

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.dateRange ||
      (filters.status && filters.status !== 'Todos') ||
      filters.fornecedores.length > 0 ||
      filters.tipos.length > 0 ||
      filters.clientes.length > 0 ||
      filters.etapas.length > 0 ||
      filters.placas.length > 0
    );
  }, [filters]);

  return (
    <MaintenanceFiltersContext.Provider value={{ filters, updateFilters, clearAllFilters, hasActiveFilters }}>
      {children}
    </MaintenanceFiltersContext.Provider>
  );
};

export const useMaintenanceFilters = () => {
  const context = useContext(MaintenanceFiltersContext);
  if (!context) throw new Error('useMaintenanceFilters must be used within MaintenanceFiltersProvider');
  return context;
};
