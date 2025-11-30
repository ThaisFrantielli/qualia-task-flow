import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import { AreaChart as ReAreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart as ReBarChart, Bar, CartesianGrid, LabelList, Cell, PieChart, Pie } from 'recharts';
import { ShoppingCart, TrendingUp, DollarSign } from 'lucide-react';

type AnyObject = { [k: string]: any };

function formatCurrency(v: number | null | undefined) {
    if (v == null || Number.isNaN(v)) return '-';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PurchasesAndSalesDashboard(): JSX.Element {
    const { data: comprasData } = useBIData<any[]>('compras_full.json');
    const { data: vendasData } = useBIData<AnyObject[]>('vendas_indicados.json');

    const [activeTab, setActiveTab] = useState<'compras' | 'vendas'>('compras');

    // === COMPRAS DATA ===
    const comprasRecords: AnyObject[] = useMemo(() => {
        if (!comprasData) return [];
        if (Array.isArray(comprasData)) return comprasData as AnyObject[];
        if ((comprasData as any).data && Array.isArray((comprasData as any).data)) return (comprasData as any).data;
        const keys = Object.keys(comprasData as any);
        for (const k of keys) {
            if (Array.isArray((comprasData as any)[k])) return (comprasData as any)[k];
        }
        return [];
    }, [comprasData]);

    const currentYear = new Date().getFullYear();
    const defaultDateFrom = `${currentYear}-01-01`;
    const defaultDateTo = `${currentYear}-12-31`;
    const [comprasDateFrom, setComprasDateFrom] = useState<string | null>(defaultDateFrom);
    const [comprasDateTo, setComprasDateTo] = useState<string | null>(defaultDateTo);

    const comprasFiltered = useMemo(() => {
        if (!comprasRecords || comprasRecords.length === 0) return [] as AnyObject[];
        return comprasRecords.filter((r) => {
            if (comprasDateFrom) {
                if (!r.DataCompra) return false;
                if (new Date(r.DataCompra) < new Date(comprasDateFrom + 'T00:00:00')) return false;
            }
            if (comprasDateTo) {
                if (!r.DataCompra) return false;
                if (new Date(r.DataCompra) > new Date(comprasDateTo + 'T23:59:59')) return false;
            }
            return true;
        });
    }, [comprasRecords, comprasDateFrom, comprasDateTo]);

    const comprasKpis = useMemo(() => {
        const totalInvestido = comprasFiltered.reduce((acc, r) => acc + (Number(r.ValorCompra) || 0), 0);
        const totalFipe = comprasFiltered.reduce((acc, r) => acc + (Number(r.ValorFipe) || 0), 0);
        const desagioTotal = totalFipe > 0 ? (1 - totalInvestido / totalFipe) * 100 : 0;
        const qtdVeiculos = comprasFiltered.length;
        return { totalInvestido, totalFipe, desagioTotal, qtdVeiculos };
    }, [comprasFiltered]);

    const comprasMonthly = useMemo(() => {
        const map: Record<string, { total: number; count: number }> = {};
        comprasFiltered.forEach((r) => {
            if (!r.DataCompra) return;
            const d = new Date(r.DataCompra);
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!map[k]) map[k] = { total: 0, count: 0 };
            map[k].total += Number(r.ValorCompra) || 0;
            map[k].count += 1;
        });
        return Object.entries(map)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([k, v]) => {
                const [y, m] = k.split('-');
                return { month: `${m}/${y.slice(2)}`, Valor: v.total, Qtd: v.count };
            });
    }, [comprasFiltered]);

    const comprasTopModels = useMemo(() => {
        const map: Record<string, number> = {};
        comprasFiltered.forEach((r) => {
            const m = r.Modelo || 'Unknown';
            map[m] = (map[m] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [comprasFiltered]);

    // === VENDAS DATA ===
    const vendasRecords: AnyObject[] = useMemo(() => {
        if (!vendasData) return [];
        if (Array.isArray(vendasData)) return vendasData as AnyObject[];
        if ((vendasData as any).data && Array.isArray((vendasData as any).data)) return (vendasData as any).data;
        const keys = Object.keys(vendasData as any);
        for (const k of keys) {
            if (Array.isArray((vendasData as any)[k])) return (vendasData as any)[k];
        }
        return [];
    }, [vendasData]);

    const [vendasDateFrom, setVendasDateFrom] = useState<string | null>(defaultDateFrom);
    const [vendasDateTo, setVendasDateTo] = useState<string | null>(defaultDateTo);

    const vendasFiltered = useMemo(() => {
        if (!vendasRecords || vendasRecords.length === 0) return [] as AnyObject[];
        return vendasRecords.filter((r) => {
            if (vendasDateFrom) {
                if (!r.DataVenda) return false;
                if (new Date(r.DataVenda) < new Date(vendasDateFrom + 'T00:00:00')) return false;
            }
            if (vendasDateTo) {
                if (!r.DataVenda) return false;
                if (new Date(r.DataVenda) > new Date(vendasDateTo + 'T23:59:59')) return false;
            }
            return true;
        });
    }, [vendasRecords, vendasDateFrom, vendasDateTo]);

    const vendasKpis = useMemo(() => {
        const totalCompra = vendasFiltered.reduce((s, r) => s + (Number(r.ValorCompra) || 0), 0);
        const totalVenda = vendasFiltered.reduce((s, r) => s + (Number(r.ValorVenda) || 0), 0);
        const qtd = vendasFiltered.length;
        const roi = totalCompra ? ((totalVenda - totalCompra) / totalCompra) * 100 : 0;
        return { totalCompra, totalVenda, qtd, roi };
    }, [vendasFiltered]);

    const vendasMonthly = useMemo(() => {
        const map: Record<string, { totalVenda: number; count: number }> = {};
        vendasFiltered.forEach((r) => {
            if (!r.DataVenda) return;
            const d = new Date(r.DataVenda);
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!map[k]) map[k] = { totalVenda: 0, count: 0 };
            map[k].totalVenda += Number(r.ValorVenda) || 0;
            map[k].count += 1;
        });
        return Object.entries(map)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([k, v]) => {
                const [y, m] = k.split('-');
                return { month: `${m}/${y.slice(2)}`, totalVenda: v.totalVenda, count: v.count };
            });
    }, [vendasFiltered]);

    const vendasTopModels = useMemo(() => {
        const map: Record<string, number> = {};
        vendasFiltered.forEach((r) => {
            const m = r.Modelo || 'Unknown';
            map[m] = (map[m] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [vendasFiltered]);

    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Title className="text-slate-900">Compras & Vendas</Title>
                    <Text className="mt-1 text-slate-500">Análise integrada de aquisição e desmobilização de ativos.</Text>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Hub Operacional
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('compras')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'compras' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    Compras
                </button>
                <button
                    onClick={() => setActiveTab('vendas')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'vendas' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    Vendas
                </button>
            </div>

            {/* COMPRAS TAB */}
            {activeTab === 'compras' && (
                <>
                    <Card className="bg-white shadow-sm border border-slate-200">
                        <Text className="text-slate-700 font-medium mb-2">Filtros</Text>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Text className="text-slate-500 text-xs mb-1">Período (De - Até)</Text>
                                <div className="flex gap-2">
                                    <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={comprasDateFrom || ''} onChange={(e) => setComprasDateFrom(e.target.value || null)} />
                                    <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={comprasDateTo || ''} onChange={(e) => setComprasDateTo(e.target.value || null)} />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={() => { setComprasDateFrom(defaultDateFrom); setComprasDateTo(defaultDateTo); }}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-sm transition-colors w-full"
                                >
                                    Limpar Filtros
                                </button>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
                            <Text className="text-slate-500">Total Investido</Text>
                            <Metric className="text-slate-900">{formatCurrency(comprasKpis.totalInvestido)}</Metric>
                        </Card>
                        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
                            <Text className="text-slate-500">Total FIPE</Text>
                            <Metric className="text-slate-900">{formatCurrency(comprasKpis.totalFipe)}</Metric>
                        </Card>
                        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
                            <Text className="text-slate-500">Deságio Médio</Text>
                            <Metric className="text-slate-900">{comprasKpis.desagioTotal.toFixed(2)}%</Metric>
                        </Card>
                        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
                            <Text className="text-slate-500">Veículos Comprados</Text>
                            <Metric className="text-slate-900">{comprasKpis.qtdVeiculos}</Metric>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
                            <Title className="text-slate-900">Evolução de Compras</Title>
                            <div className="h-80 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ReAreaChart data={comprasMonthly}>
                                        <defs>
                                            <linearGradient id="colorCompras" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="Valor" stroke="#10b981" fillOpacity={1} fill="url(#colorCompras)" strokeWidth={2} />
                                    </ReAreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="bg-white shadow-sm border border-slate-200">
                            <Title className="text-slate-900">Top 10 Modelos</Title>
                            <div className="mt-4 h-80 overflow-y-auto pr-2">
                                <BarList data={comprasTopModels} valueFormatter={(v) => `${v} compras`} color="emerald" className="mt-2" />
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* VENDAS TAB */}
            {activeTab === 'vendas' && (
                <>
                    <Card className="bg-white shadow-sm border border-slate-200">
                        <Text className="text-slate-700 font-medium mb-2">Filtros</Text>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Text className="text-slate-500 text-xs mb-1">Período (De - Até)</Text>
                                <div className="flex gap-2">
                                    <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={vendasDateFrom || ''} onChange={(e) => setVendasDateFrom(e.target.value || null)} />
                                    <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" value={vendasDateTo || ''} onChange={(e) => setVendasDateTo(e.target.value || null)} />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={() => { setVendasDateFrom(defaultDateFrom); setVendasDateTo(defaultDateTo); }}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-sm transition-colors w-full"
                                >
                                    Limpar Filtros
                                </button>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
                            <Text className="text-slate-500">Total Vendido</Text>
                            <Metric className="text-slate-900">{formatCurrency(vendasKpis.totalVenda)}</Metric>
                        </Card>
                        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
                            <Text className="text-slate-500">Custo de Aquisição</Text>
                            <Metric className="text-slate-900">{formatCurrency(vendasKpis.totalCompra)}</Metric>
                        </Card>
                        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
                            <Text className="text-slate-500">ROI Médio</Text>
                            <Metric className={`${vendasKpis.roi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{vendasKpis.roi.toFixed(2)}%</Metric>
                        </Card>
                        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
                            <Text className="text-slate-500">Veículos Vendidos</Text>
                            <Metric className="text-slate-900">{vendasKpis.qtd}</Metric>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
                            <Title className="text-slate-900">Evolução de Vendas</Title>
                            <div className="h-80 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ReAreaChart data={vendasMonthly}>
                                        <defs>
                                            <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '3 3' }}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="totalVenda" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVendas)" strokeWidth={2} />
                                    </ReAreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="bg-white shadow-sm border border-slate-200">
                            <Title className="text-slate-900">Top 10 Modelos</Title>
                            <div className="mt-4 h-80 overflow-y-auto pr-2">
                                <BarList data={vendasTopModels} valueFormatter={(v) => `${v} vendas`} color="violet" className="mt-2" />
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
