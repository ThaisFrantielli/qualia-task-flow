import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ShoppingCart, TrendingUp, AlertTriangle, ArrowRightLeft } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const s = String(v).replace(/[^0-9.\-]/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
}

function fmtBRL(v: number): string {
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
    catch (e) { return String(v); }
}

function fmtCompact(v: number): string {
    if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
    return `R$ ${v}`;
}

function getMonthKey(dateString?: string): string {
    if (!dateString || typeof dateString !== 'string') return '';
    return dateString.split('T')[0].substring(0, 7);
}

function monthLabel(ym: string): string {
    if (!ym || ym.length < 7) return ym;
    const [y, m] = ym.split('-');
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${months[Number(m) - 1]}/${String(y).slice(2)}`;
}

// --- COMPONENTE PRINCIPAL ---
export default function PurchasesAndSalesDashboard(): JSX.Element {
    const { data: comprasData } = useBIData<AnyObject[]>('compras_*.json');
    const { data: vendasData } = useBIData<AnyObject[]>('vendas.json');

    const compras = useMemo(() => (Array.isArray((comprasData as any)?.data || comprasData) ? (comprasData as any)?.data || comprasData : []), [comprasData]);
    const vendas = useMemo(() => (Array.isArray((vendasData as any)?.data || vendasData) ? (vendasData as any)?.data || vendasData : []), [vendasData]);

    const [activeTab, setActiveTab] = useState<'compras' | 'indicacoes'>('compras');

    // Cross-filtering
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

    // Data Processing based on Active Tab
    const currentData = useMemo(() => activeTab === 'compras' ? compras : vendas, [activeTab, compras, vendas]);
    const dateField = activeTab === 'compras' ? 'DataCompra' : 'DataVenda';
    const valField = activeTab === 'compras' ? 'ValorCompra' : 'ValorTotalVenda';

    // Filtered Data
    const filteredData = useMemo(() => {
        if (!selectedMonth) return currentData;
        return currentData.filter((r: AnyObject) => getMonthKey(r[dateField]) === selectedMonth);
    }, [currentData, selectedMonth, dateField]);

    // KPIs
    const kpis = useMemo(() => {
        const totalVal = filteredData.reduce((s: number, r: AnyObject) => s + parseCurrency(r[valField]), 0);
        const count = filteredData.length;
        const avgTicket = count > 0 ? totalVal / count : 0;
        return { totalVal, count, avgTicket };
    }, [filteredData, valField]);

    // Chart Data (Monthly Evolution) - Always shows full history to allow selection
    const chartData = useMemo(() => {
        const map: Record<string, number> = {};
        currentData.forEach((r: AnyObject) => {
            const k = getMonthKey(r[dateField]);
            if (!k) return;
            map[k] = (map[k] || 0) + parseCurrency(r[valField]);
        });
        return Object.keys(map).sort().map(k => ({
            key: k,
            month: monthLabel(k),
            Valor: map[k]
        }));
    }, [currentData, dateField, valField]);

    // Top Models (Based on Filtered Data)
    const topModels = useMemo(() => {
        const map: Record<string, number> = {};
        filteredData.forEach((r: AnyObject) => {
            const m = r.Modelo || 'Outros';
            map[m] = (map[m] || 0) + parseCurrency(r[valField]);
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [filteredData, valField]);

    // Insights
    const insights = useMemo(() => {
        const alerts = [];
        if (activeTab === 'compras') {
            // Example Insight for Purchases: High Concentration
            if (topModels.length > 0) {
                const topShare = topModels[0].value / kpis.totalVal;
                if (topShare > 0.30) {
                    alerts.push({
                        type: 'warning',
                        title: 'Concentração de Modelo',
                        msg: `O modelo ${topModels[0].name} representa ${(topShare * 100).toFixed(1)}% do volume de compras.`
                    });
                }
            }
        } else {
            // Example Insight for Indications: Volume Spike
            if (chartData.length >= 2) {
                const last = chartData[chartData.length - 1].Valor;
                const prev = chartData[chartData.length - 2].Valor;
                if (last > prev * 1.5) {
                    alerts.push({
                        type: 'info',
                        title: 'Pico de Desmobilização',
                        msg: `O volume de indicações deste mês é 50% maior que o anterior.`
                    });
                }
            }
        }
        return alerts;
    }, [activeTab, topModels, kpis.totalVal, chartData]);

    // Handlers
    const handleChartClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const payload = data.activePayload[0].payload;
            if (payload && payload.key) {
                setSelectedMonth(prev => prev === payload.key ? null : payload.key);
            }
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Title className="text-slate-900">Movimentação de Ativos</Title>
                    <Text className="mt-1 text-slate-500">Gestão de aquisições e desmobilização da frota.</Text>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${activeTab === 'compras' ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>
                        {activeTab === 'compras' ? <ShoppingCart className="w-4 h-4" /> : <ArrowRightLeft className="w-4 h-4" />}
                        {activeTab === 'compras' ? 'Hub Compras' : 'Hub Desmobilização'}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
                <button
                    onClick={() => { setActiveTab('compras'); setSelectedMonth(null); }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'compras' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    Compras
                </button>
                <button
                    onClick={() => { setActiveTab('indicacoes'); setSelectedMonth(null); }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'indicacoes' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                    Indicações / Desmobilização
                </button>
            </div>

            {/* Filter Status */}
            {selectedMonth && (
                <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-md text-sm flex justify-between items-center">
                    <span>Filtrando por Mês: <strong>{monthLabel(selectedMonth)}</strong></span>
                    <button onClick={() => setSelectedMonth(null)} className="text-blue-500 hover:text-blue-800 ml-2">Limpar Filtro</button>
                </div>
            )}

            {/* Insights */}
            {insights.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.map((alert, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border flex items-start gap-3 ${alert.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
                            {alert.type === 'warning' ? <AlertTriangle className="w-5 h-5 mt-0.5" /> : <TrendingUp className="w-5 h-5 mt-0.5" />}
                            <div>
                                <h4 className="font-semibold text-sm">{alert.title}</h4>
                                <p className="text-xs opacity-90">{alert.msg}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card decoration="top" decorationColor={activeTab === 'compras' ? 'emerald' : 'violet'} className="bg-white border border-slate-200 shadow-sm">
                    <Text className="text-slate-500">Volume Financeiro</Text>
                    <Metric className="text-slate-900">{fmtBRL(kpis.totalVal)}</Metric>
                </Card>
                <Card decoration="top" decorationColor={activeTab === 'compras' ? 'emerald' : 'violet'} className="bg-white border border-slate-200 shadow-sm">
                    <Text className="text-slate-500">Quantidade de Veículos</Text>
                    <Metric className="text-slate-900">{kpis.count}</Metric>
                </Card>
                <Card decoration="top" decorationColor={activeTab === 'compras' ? 'emerald' : 'violet'} className="bg-white border border-slate-200 shadow-sm">
                    <Text className="text-slate-500">Ticket Médio</Text>
                    <Metric className="text-slate-900">{fmtBRL(kpis.avgTicket)}</Metric>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm">
                    <Title className="text-slate-900">Evolução Mensal</Title>
                    <Text className="text-slate-500 text-sm mb-4">Clique na área para filtrar detalhes.</Text>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={activeTab === 'compras' ? '#10b981' : '#8b5cf6'} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={activeTab === 'compras' ? '#10b981' : '#8b5cf6'} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} stroke="#64748b" />
                                <Tooltip formatter={(v: any) => fmtBRL(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <Area
                                    type="monotone"
                                    dataKey="Valor"
                                    stroke={activeTab === 'compras' ? '#10b981' : '#8b5cf6'}
                                    fillOpacity={1}
                                    fill="url(#colorVal)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="bg-white border border-slate-200 shadow-sm">
                    <Title className="text-slate-900">Top Modelos</Title>
                    <div className="mt-4 h-80 overflow-y-auto pr-2">
                        <BarList
                            data={topModels}
                            valueFormatter={(v) => fmtBRL(v)}
                            color={activeTab === 'compras' ? 'emerald' : 'violet'}
                        />
                    </div>
                </Card>
            </div>
        </div>
    );
}
