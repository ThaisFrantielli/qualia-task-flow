import { useMemo } from 'react';
import useBIData from './useBIData';
import { DRETransaction, getAvailableMonths } from '@/utils/dreUtils';

interface UseDREDataResult {
    transactions: DRETransaction[];
    availableMonths: string[];
    loading: boolean;
    error: string | null;
    // Filter lists
    uniqueClientes: string[];
    uniqueNaturezas: string[];
    uniqueContratosComerciais: string[];
    uniqueSituacoesContrato: string[];
}

/**
 * Custom hook for loading and processing DRE data
 */
export default function useDREData(): UseDREDataResult {
    const { data: rawData, loading, error } = useBIData<DRETransaction[]>('fato_financeiro_dre.json');

    const transactions = useMemo(() => {
        if (!Array.isArray(rawData)) return [];

        // Validate and clean data
        return rawData.filter(t => {
            // Must have required fields
            return t.Natureza &&
                t.DataCompetencia &&
                t.TipoLancamento &&
                typeof t.Valor === 'number';
        });
    }, [rawData]);

    const availableMonths = useMemo(() => {
        return getAvailableMonths(transactions);
    }, [transactions]);

    // Extract unique clients
    const uniqueClientes = useMemo(() => {
        const clientSet = new Set<string>();
        transactions.forEach(t => {
            if (t.Cliente) {
                clientSet.add(t.Cliente);
            } else if (t.NomeEntidade) {
                clientSet.add(t.NomeEntidade);
            }
        });
        return Array.from(clientSet).sort((a, b) => 
            a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
        );
    }, [transactions]);

    // Extract unique naturezas (accounting codes)
    const uniqueNaturezas = useMemo(() => {
        const naturezaSet = new Set<string>();
        transactions.forEach(t => {
            if (t.Natureza) {
                naturezaSet.add(t.Natureza);
            }
        });
        return Array.from(naturezaSet).sort((a, b) => 
            a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
        );
    }, [transactions]);

    // Extract unique contratos comerciais (if available in data)
    const uniqueContratosComerciais = useMemo(() => {
        const contratoSet = new Set<string>();
        transactions.forEach(t => {
            // Check various possible field names for commercial contract
            const contrato = (t as any).ContratoComercial || 
                            (t as any).NumeroContrato ||
                            (t as any).Contrato;
            if (contrato) {
                contratoSet.add(String(contrato));
            }
        });
        return Array.from(contratoSet).sort((a, b) => 
            a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
        );
    }, [transactions]);

    // Extract unique situações de contrato
    const uniqueSituacoesContrato = useMemo(() => {
        const situacaoSet = new Set<string>();
        transactions.forEach(t => {
            const situacao = (t as any).SituacaoContrato || 
                            (t as any).StatusContrato ||
                            (t as any).Situacao;
            if (situacao) {
                situacaoSet.add(String(situacao));
            }
        });
        return Array.from(situacaoSet).sort((a, b) => 
            a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
        );
    }, [transactions]);

    return {
        transactions,
        availableMonths,
        loading,
        error,
        uniqueClientes,
        uniqueNaturezas,
        uniqueContratosComerciais,
        uniqueSituacoesContrato,
    };
}
