import { useMemo } from 'react';
import useBIData from './useBIData';
import { DRETransaction, getAvailableMonths } from '@/utils/dreUtils';

interface UseDREDataResult {
    transactions: DRETransaction[];
    availableMonths: string[];
    loading: boolean;
    error: string | null;
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

    return {
        transactions,
        availableMonths,
        loading,
        error
    };
}
