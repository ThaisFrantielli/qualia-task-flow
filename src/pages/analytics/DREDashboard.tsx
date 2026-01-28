import { useMemo, useState, useEffect } from 'react';
import { Title, Text, Card } from '@tremor/react';
import { DollarSign, BarChart3 } from 'lucide-react';
import useDREData from '@/hooks/useDREData';
import DREKPICard from '@/components/analytics/DREKPICard';
import DREFiltersBar from '@/components/analytics/dre/DREFiltersBar';
import DREPivotTable from '@/components/analytics/DREPivotTable';
import { DREFiltersProvider, useDREFilters } from '@/contexts/DREFiltersContext';
import {
    buildAccountHierarchyByType,
    calculateKPIs,
    getAccountCode,
} from '@/utils/dreUtils';

function DREDashboardContent() {
    const {
        transactions,
        loading,
        error,
        uniqueClientes,
        uniqueNaturezas,
        uniqueContratosComerciais,
        uniqueSituacoesContrato,
        availableMonths,
    } = useDREData();

    const { filters, setDateRange } = useDREFilters();

    const [showHorizontalAnalysis, setShowHorizontalAnalysis] = useState(false);
    const [showVerticalAnalysis, setShowVerticalAnalysis] = useState(false);

    // Filter transactions based on all filters
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Date range filter
            if (filters.dateRange?.from || filters.dateRange?.to) {
                const transactionDate = new Date(t.DataCompetencia);
                if (filters.dateRange.from) {
                    const fromDate = new Date(filters.dateRange.from);
                    fromDate.setHours(0, 0, 0, 0);
                    if (transactionDate < fromDate) return false;
                }
                if (filters.dateRange.to) {
                    const toDate = new Date(filters.dateRange.to);
                    toDate.setHours(23, 59, 59, 999);
                    if (transactionDate > toDate) return false;
                }
            }

            // Cliente filter
            if (filters.clientes.length > 0) {
                const clienteValue = t.Cliente || t.NomeEntidade;
                if (!clienteValue || !filters.clientes.includes(clienteValue)) {
                    return false;
                }
            }

            // Contrato Comercial filter
            if (filters.contratosComerciais.length > 0) {
                const contrato = (t as any).ContratoComercial || 
                                (t as any).NumeroContrato ||
                                (t as any).Contrato;
                if (!contrato || !filters.contratosComerciais.includes(String(contrato))) {
                    return false;
                }
            }

            // Natureza filter
            if (filters.naturezas.length > 0) {
                if (!t.Natureza || !filters.naturezas.includes(t.Natureza)) {
                    return false;
                }
            }

            // Situação Contrato filter
            if (filters.situacoesContrato.length > 0) {
                const situacao = (t as any).SituacaoContrato || 
                                (t as any).StatusContrato ||
                                (t as any).Situacao;
                if (!situacao || !filters.situacoesContrato.includes(String(situacao))) {
                    return false;
                }
            }

            return true;
        });
    }, [transactions, filters]);

    // Get selected months from filtered transactions
    const selectedMonths = useMemo(() => {
        const monthSet = new Set<string>();
        filteredTransactions.forEach(t => {
            if (t.DataCompetencia) {
                monthSet.add(t.DataCompetencia.substring(0, 7));
            }
        });
        return Array.from(monthSet).sort();
    }, [filteredTransactions]);

    // Trim trailing months that have zero total across all transactions (remove months at the end with only zeros)
    const trimmedMonths = useMemo(() => {
        if (!selectedMonths || selectedMonths.length === 0) return selectedMonths;
        // compute totals per month
        const totals = selectedMonths.map(month => {
            return filteredTransactions
                .filter(t => t.DataCompetencia?.substring(0, 7) === month)
                .reduce((s, t) => s + (t.Valor || 0), 0);
        });
        // trim trailing zeros
        let lastNonZeroIdx = totals.length - 1;
        while (lastNonZeroIdx >= 0 && totals[lastNonZeroIdx] === 0) lastNonZeroIdx--;
        if (lastNonZeroIdx < 0) {
            // all zero: keep original months (avoid empty)
            return selectedMonths;
        }
        return selectedMonths.slice(0, lastNonZeroIdx + 1);
    }, [selectedMonths, filteredTransactions]);

    const monthsToUse = trimmedMonths;

    // Build account hierarchy
    const accountHierarchy = useMemo(() => {
        return buildAccountHierarchyByType(filteredTransactions, monthsToUse);
    }, [filteredTransactions, monthsToUse]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        return calculateKPIs(filteredTransactions, monthsToUse);
    }, [filteredTransactions, monthsToUse]);

    // Calculate revenue by month for vertical analysis
    const revenueByMonth = useMemo(() => {
        const revenue: Record<string, number> = {};
        monthsToUse.forEach(month => {
            const monthRevenue = filteredTransactions
                .filter(t => {
                    const tMonth = t.DataCompetencia?.substring(0, 7);
                    const code = getAccountCode(t.Natureza || '');
                    // Consider accounts starting with "01" as revenue
                    return tMonth === month && t.TipoLancamento === 'Entrada' && code.startsWith('01');
                })
                .reduce((sum, t) => sum + (t.Valor || 0), 0);
            revenue[month] = monthRevenue;
        });
        return revenue;
    }, [filteredTransactions, monthsToUse]);

    // Set default date range when none selected: prefer Jan/2022 if available, else use first->last available month
    useEffect(() => {
        if (filters.dateRange?.from || !availableMonths || availableMonths.length === 0) return;
        const preferred = '2022-01';
        const startMonth = availableMonths.includes(preferred) ? preferred : availableMonths[0];
        const endMonth = availableMonths[availableMonths.length - 1];
        const from = new Date(startMonth + '-01T00:00:00');
        const to = new Date(endMonth + '-01T00:00:00');
        // set to end of month
        const eom = new Date(to.getFullYear(), to.getMonth() + 1, 0, 23, 59, 59, 999);
        setDateRange({ from, to: eom });
    }, [availableMonths, filters.dateRange, setDateRange]);

    if (loading) {
        return (
            <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center">
                <div className="animate-pulse text-slate-500">Carregando dados do DRE...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center">
                <div className="text-red-600">Erro ao carregar dados: {error}</div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Title className="text-slate-900">DRE - DEMONSTRATIVO DE RESULTADOS</Title>
                    <Text className="text-slate-500">Análise Gerencial de Receitas e Despesas</Text>
                </div>
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex gap-2 font-medium">
                    <DollarSign className="w-4 h-4" />
                    DRE Gerencial
                </div>
            </div>

            {/* New Filters Bar */}
            <DREFiltersBar
                clientesList={uniqueClientes}
                contratosComerciais={uniqueContratosComerciais}
                naturezasList={uniqueNaturezas}
                situacoesContratoList={uniqueSituacoesContrato}
            />

            {/* Analysis Toggles */}
            <Card>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1">
                        <Text className="text-slate-600 text-sm">
                            {filteredTransactions.length.toLocaleString('pt-BR')} lançamentos • {monthsToUse.length} {monthsToUse.length === 1 ? 'mês' : 'meses'}
                        </Text>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setShowHorizontalAnalysis(!showHorizontalAnalysis);
                                if (!showHorizontalAnalysis) setShowVerticalAnalysis(false);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${showHorizontalAnalysis
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Análise Horizontal
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setShowVerticalAnalysis(!showVerticalAnalysis);
                                if (!showVerticalAnalysis) setShowHorizontalAnalysis(false);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${showVerticalAnalysis
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Análise Vertical
                            </div>
                        </button>
                    </div>
                </div>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <DREKPICard
                    title="Receita Total"
                    value={kpis.receitaTotal}
                    sparklineData={kpis.sparklineData.map(d => ({ value: d.receita }))}
                    colorScheme="green"
                />
                <DREKPICard
                    title="Custos e Despesas"
                    value={kpis.custosTotal}
                    sparklineData={kpis.sparklineData.map(d => ({ value: d.custos }))}
                    colorScheme="red"
                />
                <DREKPICard
                    title="EBITDA"
                    value={kpis.ebitda}
                    sparklineData={kpis.sparklineData.map(d => ({ value: d.ebitda }))}
                    colorScheme="blue"
                />
                <DREKPICard
                    title="Lucro Líquido"
                    value={kpis.lucroLiquido}
                    sparklineData={kpis.sparklineData.map(d => ({ value: d.lucro }))}
                    colorScheme={kpis.lucroLiquido >= 0 ? 'green' : 'red'}
                />
                <DREKPICard
                    title="Margem de Lucro"
                    value={kpis.margemLucro}
                    sparklineData={kpis.sparklineData.map(d => ({ value: d.margem }))}
                    format="percentage"
                    colorScheme={kpis.margemLucro >= 0 ? 'green' : 'red'}
                />
            </div>

            {/* Analysis Info Banner */}
            {(showHorizontalAnalysis || showVerticalAnalysis) && (
                <div className={`p-4 rounded-lg border ${showHorizontalAnalysis
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-emerald-50 border-emerald-200'
                    }`}>
                    <div className="flex items-start gap-3">
                        <BarChart3 className={`w-5 h-5 mt-0.5 ${showHorizontalAnalysis ? 'text-blue-600' : 'text-emerald-600'
                            }`} />
                        <div>
                            <h3 className={`font-semibold ${showHorizontalAnalysis ? 'text-blue-900' : 'text-emerald-900'
                                }`}>
                                {showHorizontalAnalysis ? 'Análise Horizontal Ativa' : 'Análise Vertical Ativa'}
                            </h3>
                            <p className={`text-sm ${showHorizontalAnalysis ? 'text-blue-700' : 'text-emerald-700'
                                }`}>
                                {showHorizontalAnalysis
                                    ? 'Mostrando variação percentual em relação ao mês anterior. Setas verdes indicam crescimento, vermelhas indicam redução.'
                                    : 'Mostrando cada conta como percentual da Receita Bruta do mesmo período. Útil para análise de composição e estrutura de custos.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pivot Table */}
            <Card>
                <div className="mb-4">
                    <Title>Demonstrativo Detalhado</Title>
                    <Text className="text-slate-500">
                        Clique nos ícones para expandir/recolher as contas hierárquicas
                    </Text>
                </div>

                {monthsToUse.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        Selecione um período ou ajuste os filtros para visualizar o DRE
                    </div>
                ) : accountHierarchy.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        Nenhum dado disponível para os filtros selecionados
                    </div>
                ) : (
                    <DREPivotTable
                        nodes={accountHierarchy}
                        selectedMonths={monthsToUse}
                        showHorizontalAnalysis={showHorizontalAnalysis}
                        showVerticalAnalysis={showVerticalAnalysis}
                        revenueByMonth={revenueByMonth}
                    />
                )}
            </Card>
        </div>
    );
}

export default function DREDashboard() {
    return (
        <DREFiltersProvider>
            <DREDashboardContent />
        </DREFiltersProvider>
    );
}
