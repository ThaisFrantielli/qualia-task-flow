import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { DateRange } from 'react-day-picker';

export interface DREFilters {
  dateRange?: DateRange;
  clientes: string[];
  contratosComerciais: string[];
  naturezas: string[];
  situacoesContrato: string[];
}

interface DREFiltersContextType {
  filters: DREFilters;
  setDateRange: (range: DateRange | undefined) => void;
  setClientes: (clientes: string[]) => void;
  setContratosComerciais: (contratos: string[]) => void;
  setNaturezas: (naturezas: string[]) => void;
  setSituacoesContrato: (situacoes: string[]) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

const defaultFilters: DREFilters = {
  dateRange: undefined,
  clientes: [],
  contratosComerciais: [],
  naturezas: [],
  situacoesContrato: [],
};

const DREFiltersContext = createContext<DREFiltersContextType | undefined>(undefined);

export function DREFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<DREFilters>(defaultFilters);

  const setDateRange = useCallback((range: DateRange | undefined) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  }, []);

  const setClientes = useCallback((clientes: string[]) => {
    setFilters(prev => ({ ...prev, clientes }));
  }, []);

  const setContratosComerciais = useCallback((contratos: string[]) => {
    setFilters(prev => ({ ...prev, contratosComerciais: contratos }));
  }, []);

  const setNaturezas = useCallback((naturezas: string[]) => {
    setFilters(prev => ({ ...prev, naturezas }));
  }, []);

  const setSituacoesContrato = useCallback((situacoes: string[]) => {
    setFilters(prev => ({ ...prev, situacoesContrato: situacoes }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.dateRange?.from ||
      filters.dateRange?.to ||
      filters.clientes.length > 0 ||
      filters.contratosComerciais.length > 0 ||
      filters.naturezas.length > 0 ||
      filters.situacoesContrato.length > 0
    );
  }, [filters]);

  const value = useMemo(() => ({
    filters,
    setDateRange,
    setClientes,
    setContratosComerciais,
    setNaturezas,
    setSituacoesContrato,
    clearAllFilters,
    hasActiveFilters,
  }), [filters, setDateRange, setClientes, setContratosComerciais, setNaturezas, setSituacoesContrato, clearAllFilters, hasActiveFilters]);

  return (
    <DREFiltersContext.Provider value={value}>
      {children}
    </DREFiltersContext.Provider>
  );
}

export function useDREFilters() {
  const context = useContext(DREFiltersContext);
  if (!context) {
    throw new Error('useDREFilters must be used within a DREFiltersProvider');
  }
  return context;
}
