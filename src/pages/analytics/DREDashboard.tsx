import { useMemo, useState } from 'react';
import { Title, Text, Card } from '@tremor/react';
import { DollarSign, BarChart3 } from 'lucide-react';
import useDREData from '@/hooks/useDREData';
import DREKPICard from '@/components/analytics/DREKPICard';
import MonthFilter from '@/components/analytics/MonthFilter';
import DREPivotTable from '@/components/analytics/DREPivotTable';
import {
    buildAccountHierarchyByType,
    calculateKPIs,
    getAccountCode
} from '@/utils/dreUtils';

export default function DREDashboard() {
    const { transactions, availableMonths, loading, error } = useDREData();

    // Default to last 6 months
    const [selectedMonths, setSelectedMonths] = useState<string[]>(() => {
        return availableMonths.slice(-6);
    });

    const [showHorizontalAnalysis, setShowHorizontalAnalysis] = useState(false);
    const [showVerticalAnalysis, setShowVerticalAnalysis] = useState(false);

    // Update selected months when available months change
    useMemo(() => {
        if (availableMonths.length > 0 && selectedMonths.length === 0) {
            setSelectedMonths(availableMonths.slice(-6));
        }
    }, [availableMonths, selectedMonths.length]);

    // Filter transactions by selected months
    const filteredTransactions = useMemo(() => {
        if (selectedMonths.length === 0) return transactions;
        return transactions.filter(t => {
            const month = t.DataCompetencia?.substring(0, 7);
            return month && selectedMonths.includes(month);
        });
    }, [transactions, selectedMonths]);

    // Build account hierarchy
    const accountHierarchy = useMemo(() => {
        return buildAccountHierarchyByType(filteredTransactions, selectedMonths);
    }, [filteredTransactions, selectedMonths]);

    // Calculate KPIs
    const kpis = useMemo(() => {
        return calculateKPIs(filteredTransactions, selectedMonths);
    }, [filteredTransactions, selectedMonths]);

    // Calculate revenue by month for vertical analysis
    const revenueByMonth = useMemo(() => {
        const revenue: Record<string, number> = {};
        selectedMonths.forEach(month => {
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
    }, [filteredTransactions, selectedMonths]);

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

            {/* Filters and Analysis Toggles */}
            <Card>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[250px]">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Período de Análise
                        </label>
                        <MonthFilter
                            availableMonths={availableMonths}
                            selectedMonths={selectedMonths}
                            onChange={setSelectedMonths}
                        />
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

                {selectedMonths.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        Selecione pelo menos um mês para visualizar o DRE
                    </div>
                ) : accountHierarchy.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        Nenhum dado disponível para o período selecionado
                    </div>
                ) : (
                    <DREPivotTable
                        nodes={accountHierarchy}
                        selectedMonths={selectedMonths}
                        showHorizontalAnalysis={showHorizontalAnalysis}
                        showVerticalAnalysis={showVerticalAnalysis}
                        revenueByMonth={revenueByMonth}
                    />
                )}
            </Card>

            {/* Footer Info */}
            <div className="text-center text-sm text-slate-500">
                {filteredTransactions.length} lançamentos • {selectedMonths.length} {selectedMonths.length === 1 ? 'mês' : 'meses'} selecionados
            </div>
        </div>
    );
}
