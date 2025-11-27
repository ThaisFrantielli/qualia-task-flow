import { createContext, useContext, ReactNode } from 'react';
import { useOportunidades } from '@/hooks/useOportunidades';
import type { OportunidadeWithDetails, Oportunidade } from '@/types';

// Define o tipo do valor que o contexto irá fornecer
interface OportunidadeContextType {
  oportunidades: OportunidadeWithDetails[];
  isLoading: boolean;
  error: Error | null;
  createOportunidade: (newOpp: Partial<Oportunidade>) => Promise<any>;
}

// Cria o contexto com um valor padrão undefined
const OportunidadeContext = createContext<OportunidadeContextType | undefined>(undefined);

// Cria o Provedor do Contexto
export const OportunidadeProvider = ({ children }: { children: ReactNode }) => {
  // O contexto agora usa o hook como sua única fonte da verdade
  const { oportunidades, isLoading, error, createOportunidade } = useOportunidades();

  const value = {
    oportunidades,
    isLoading,
    error,
    createOportunidade,
  };

  return (
    <OportunidadeContext.Provider value={value}>
      {children}
    </OportunidadeContext.Provider>
  );
};

// Hook customizado para consumir o contexto facilmente nos componentes
export const useOportunidadeContext = () => {
  const context = useContext(OportunidadeContext);
  if (context === undefined) {
    throw new Error('useOportunidadeContext must be used within an OportunidadeProvider');
  }
  return context;
};