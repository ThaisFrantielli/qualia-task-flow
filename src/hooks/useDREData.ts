import { useMemo } from 'react';
import useBIData from './useBIData';
import { DRETransaction, getAvailableMonths } from '@/utils/dreUtils';

const DRE_MIN_MONTH = '2022-01';

type DRELikeRow = Record<string, unknown>;

function asString(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (value == null) return '';
    return String(value).trim();
}

function parseNumeric(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'bigint') {
        return Number(value);
    }

    if (typeof value === 'string') {
        const raw = value.trim();
        if (!raw) return null;

        const normalized = raw.includes(',')
            ? raw.replace(/\./g, '').replace(',', '.')
            : raw;

        const cleaned = normalized.replace(/[^0-9.-]/g, '');
        if (!cleaned) return null;

        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function normalizeDate(value: unknown): string | null {
    const raw = asString(value);
    if (!raw) return null;

    const isoLike = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoLike) {
        return `${isoLike[1]}-${isoLike[2]}-${isoLike[3]}`;
    }

    const brLike = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brLike) {
        return `${brLike[3]}-${brLike[2]}-${brLike[1]}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;

    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function normalizeTipoLancamento(value: unknown): 'Entrada' | 'Saída' | null {
    const raw = asString(value).toLowerCase();
    if (!raw) return null;

    const normalized = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (normalized.includes('entrada')) return 'Entrada';
    if (normalized.includes('saida') || normalized.startsWith('sa')) return 'Saída';
    return null;
}

function mapToTransaction(row: DRELikeRow): DRETransaction | null {
    const natureza = asString(row.Natureza);
    const tipoLancamento = normalizeTipoLancamento(row.TipoLancamento);
    const dataCompetencia = normalizeDate(row.DataCompetencia ?? row.Data);
    const valor = parseNumeric(row.Valor ?? row.valor);

    if (!natureza || !tipoLancamento || !dataCompetencia || valor == null) {
        return null;
    }

    const naturezaCode = natureza.split(' - ')[0] || natureza;
    const naturezaDescricao = asString(row.Natureza_Descricao) ||
        (natureza.includes(' - ') ? natureza.split(' - ').slice(1).join(' - ').trim() : natureza);

    const codeSegments = naturezaCode.split('.').filter(Boolean);
    const fallbackGroup1 = codeSegments[0] || '';
    const fallbackGroup2 = codeSegments.slice(0, 2).join('.');
    const fallbackGroup3 = codeSegments.slice(0, 3).join('.');
    const fallbackGroup4 = codeSegments.slice(0, 4).join('.');

    const numeroLancamento = asString(row.NumeroLancamento ?? row.IdLancamento) ||
        `${naturezaCode}-${dataCompetencia}-${Math.abs(valor)}`;

    const idClienteParsed = parseNumeric(row.IdCliente ?? row.idcliente);

    return {
        NumeroLancamento: numeroLancamento,
        TipoLancamento: tipoLancamento,
        Natureza: natureza,
        Grupo1_Codigo: asString(row.Grupo1_Codigo) || fallbackGroup1,
        Grupo2_Codigo: asString(row.Grupo2_Codigo) || fallbackGroup2,
        Grupo3_Codigo: asString(row.Grupo3_Codigo) || fallbackGroup3,
        Grupo4_Codigo: asString(row.Grupo4_Codigo) || fallbackGroup4,
        Natureza_Descricao: naturezaDescricao,
        DataCompetencia: dataCompetencia,
        DataRealizacao: normalizeDate(row.DataRealizacao ?? row.DataPagamentoRecebimento ?? row.DataCompetencia ?? row.Data) || dataCompetencia,
        Valor: valor,
        NomeEntidade: asString(row.NomeEntidade ?? row.Entidade ?? row.PagarReceberDe),
        IdCliente: idClienteParsed != null ? Number(idClienteParsed) : undefined,
        Cliente: asString(row.Cliente ?? row.NomeCliente) || undefined,
        TipoCliente: asString(row.TipoCliente) || undefined,
        SegmentoCliente: asString(row.SegmentoCliente) || undefined,
    };
}

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
    const { data: rawData, loading, error } = useBIData<unknown[]>('fato_financeiro_dre', {
        staticFallback: true,
    });

    const maxMonth = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    const transactions = useMemo(() => {
        if (!Array.isArray(rawData)) return [];

        return rawData
            .filter((row): row is DRELikeRow => typeof row === 'object' && row !== null)
            .map((row) => mapToTransaction(row))
            .filter((item): item is DRETransaction => item !== null)
            .filter((item) => {
                const monthKey = item.DataCompetencia.substring(0, 7);
                return monthKey >= DRE_MIN_MONTH && monthKey <= maxMonth;
            });
    }, [rawData, maxMonth]);

    const availableMonths = useMemo(() => {
        return getAvailableMonths(transactions)
            .filter((month) => month >= DRE_MIN_MONTH && month <= maxMonth);
    }, [transactions, maxMonth]);

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
