import React, { createContext, useContext, useState, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

export type TimeGranularity = 'year' | 'month' | 'day';

export interface MaintenanceFilters {
  dateRange?: DateRange;
  timeGranularity: TimeGranularity;
  status?: 'Todos' | 'Ativa' | 'Produtiva' | 'Improdutiva' | 'Inativa';
  fornecedores: string[];
  tiposOcorrencia: string[];
  tiposContrato: string[];
  clientes: string[];
  contratosComerciais: string[];
  contratosLocacao: string[];
  modelos: string[];
  placas: string[];
}

interface MaintenanceFiltersContextType {
  filters: MaintenanceFilters;
  setDateRange: (range: DateRange | undefined) => void;
  setTimeGranularity: (granularity: TimeGranularity) => void;
  setStatus: (status: MaintenanceFilters['status']) => void;
  setFornecedores: (fornecedores: string[]) => void;
  setTiposOcorrencia: (tipos: string[]) => void;
  setTiposContrato: (tipos: string[]) => void;
  setClientes: (clientes: string[]) => void;
  setContratosComerciais: (contratos: string[]) => void;
  setContratosLocacao: (contratos: string[]) => void;
  setModelos: (modelos: string[]) => void;
  setPlacas: (placas: string[]) => void;
  updateFilters: (partialFilters: Partial<MaintenanceFilters>) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

const MaintenanceFiltersContext = createContext<MaintenanceFiltersContextType | undefined>(undefined);

const initialFilters: MaintenanceFilters = {
  timeGranularity: 'month',
  status: 'Todos',
  fornecedores: [],
  tiposOcorrencia: [],
  tiposContrato: [],
  clientes: [],
  contratosComerciais: [],
  contratosLocacao: [],
  modelos: [],
  placas: [],
};

export const MaintenanceFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<MaintenanceFilters>(initialFilters);

  const setDateRange = (range: DateRange | undefined) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  };

  const setStatus = (status: MaintenanceFilters['status']) => {
    setFilters(prev => ({ ...prev, status }));
  };

  const setTimeGranularity = (granularity: TimeGranularity) => {
    setFilters(prev => ({ ...prev, timeGranularity: granularity }));
  };

  const setFornecedores = (fornecedores: string[]) => {
    setFilters(prev => ({ ...prev, fornecedores }));
  };

  const setTiposOcorrencia = (tipos: string[]) => {
    setFilters(prev => ({ ...prev, tiposOcorrencia: tipos }));
  };

  const setTiposContrato = (tipos: string[]) => {
    setFilters(prev => ({ ...prev, tiposContrato: tipos }));
  };

  const setClientes = (clientes: string[]) => {
    setFilters(prev => ({ ...prev, clientes }));
  };

  const setContratosComerciais = (contratos: string[]) => {
    setFilters(prev => ({ ...prev, contratosComerciais: contratos }));
  };

  const setContratosLocacao = (contratos: string[]) => {
    setFilters(prev => ({ ...prev, contratosLocacao: contratos }));
  };

  const setModelos = (modelos: string[]) => {
    setFilters(prev => ({ ...prev, modelos }));
  };

  const setPlacas = (placas: string[]) => {
    setFilters(prev => ({ ...prev, placas }));
  };

  const clearAllFilters = () => {
    setFilters(initialFilters);
  };

  const updateFilters = (partialFilters: Partial<MaintenanceFilters>) => {
    setFilters(prev => ({ ...prev, ...partialFilters }));
  };

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.dateRange ||
      (filters.status && filters.status !== 'Todos') ||
      filters.fornecedores.length > 0 ||
      filters.tiposOcorrencia.length > 0 ||
      filters.tiposContrato.length > 0 ||
      filters.clientes.length > 0 ||
      filters.contratosComerciais.length > 0 ||
      filters.contratosLocacao.length > 0 ||
      filters.modelos.length > 0 ||
      filters.placas.length > 0
    );
  }, [filters]);

  const value = {
    filters,
    setDateRange,
    setTimeGranularity,
    setStatus,
    setFornecedores,
    setTiposOcorrencia,
    setTiposContrato,
    setClientes,
    setContratosComerciais,
    setContratosLocacao,
    setModelos,
    setPlacas,
    updateFilters,
    clearAllFilters,
    hasActiveFilters,
  };

  return (
    <MaintenanceFiltersContext.Provider value={value}>
      {children}
    </MaintenanceFiltersContext.Provider>
  );
};

export const useMaintenanceFilters = () => {
  const context = useContext(MaintenanceFiltersContext);
  if (!context) {
    throw new Error('useMaintenanceFilters must be used within MaintenanceFiltersProvider');
  }
  return context;
};
