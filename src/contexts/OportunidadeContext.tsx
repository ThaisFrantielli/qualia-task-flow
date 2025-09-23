import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import api from '@/services/api';
import type { Oportunidade, OportunidadeContextType, PaginatedResponse, PaginationMeta } from '@/types/api';

const OportunidadeContext = createContext<OportunidadeContextType | null>(null);

export function OportunidadeProvider({ children }: { children: ReactNode }) {
    const [oportunidades, setOportunidades] = useState<Oportunidade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationMeta | null>(null);

    const fetchOportunidades = useCallback(async (page: number = 1) => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await api.get<PaginatedResponse<Oportunidade>>('/oportunidades', {
                params: { page }
            });
            
            setOportunidades(response.data.data);
            setPagination(response.data.meta);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch opportunities');
            console.error('Error fetching opportunities:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshOportunidade = useCallback(async (id: number) => {
        try {
            const response = await api.get<{ data: Oportunidade }>(`/oportunidades/${id}`);
            
            setOportunidades(current => 
                current.map(op => op.id === id ? response.data.data : op)
            );
        } catch (err) {
            console.error('Error refreshing opportunity:', err);
        }
    }, []);

    // Initial fetch on mount
    useEffect(() => {
        fetchOportunidades();
    }, [fetchOportunidades]);

    const value = {
        oportunidades,
        loading,
        error,
        pagination,
        fetchOportunidades,
        refreshOportunidade,
    };

    return (
        <OportunidadeContext.Provider value={value}>
            {children}
        </OportunidadeContext.Provider>
    );
}

export function useOportunidades() {
    const context = useContext(OportunidadeContext);
    if (!context) {
        throw new Error('useOportunidades must be used within an OportunidadeProvider');
    }
    return context;
}