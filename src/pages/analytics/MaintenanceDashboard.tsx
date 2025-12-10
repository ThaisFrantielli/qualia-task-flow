import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart, BarList } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line } from 'recharts';
import { Wrench, Filter } from 'lucide-react';

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
export default function MaintenanceDashboard(): JSX.Element {
    const { data: osData } = useBIData<AnyObject[]>('fat_manutencao_os_*.json');
    const { data: itensData } = useBIData<AnyObject[]>('fat_manutencao_itens_*.json');

    const osList = useMemo((): AnyObject[] => {
        const raw = (osData as any)?.data || osData;
        return Array.isArray(raw) ? raw : [];
    }, [osData]);

    const itensList = useMemo((): AnyObject[] => {
        const raw = (itensData as any)?.data || itensData;
        return Array.isArray(raw) ? raw : [];
    }, [itensData]);

    const currentYear = new Date().getFullYear();
    const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
    const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
    const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
    const [selectedModelos, setSelectedModelos] = useState<string[]>([]);

    // Lists for Filters
    const tiposManutencao = useMemo(() => Array.from(new Set(osList.map((r: AnyObject) => r.TipoManutencao).filter(Boolean))).sort() as string[], [osList]);
    const modelos = useMemo(() => Array.from(new Set(osList.map((r: AnyObject) => r.Modelo).filter(Boolean))).sort() as string[], [osList]);

    // Filtered OSs
    const filteredOS = useMemo(() => {
        return osList.filter((r: AnyObject) => {
            const d = r.DataEntrada;
            if (d && dateFrom && d < dateFrom) return false;
            if (d && dateTo && d > dateTo) return false;
            if (selectedTipos.length > 0 && !selectedTipos.includes(r.TipoManutencao)) return false;
            if (selectedModelos.length > 0 && !selectedModelos.includes(r.Modelo)) return false;
            return true;
        });
    }, [osList, dateFrom, dateTo, selectedTipos, selectedModelos]);

    // Filtered Items (based on filtered OS IDs)
    const filteredItens = useMemo(() => {
        const osIds = new Set(filteredOS.map((r: AnyObject) => r.NumeroOS));
        return itensList.filter((i: AnyObject) => osIds.has(i.NumeroOS));
    }, [itensList, filteredOS]);

    // KPIs
    const kpis = useMemo(() => {
        const totalCost = filteredOS.reduce((s: number, r: AnyObject) => s + parseCurrency(r.ValorTotal), 0);
        const countOS = filteredOS.length;
        const avgCost = countOS > 0 ? totalCost / countOS : 0;

        // Avg Repair Time (DiasParado)
        const totalDays = filteredOS.reduce((s: number, r: AnyObject) => s + (parseCurrency(r.DiasParado) || 0), 0);
        const avgTime = countOS > 0 ? totalDays / countOS : 0;

        // Vehicles Stopped Today (Open OS)
        const stopped = filteredOS.filter((r: AnyObject) => !r.DataSaida).length;

        // Valor Reembolsável (fallbacks for different field names)
        const valorReembolsavel = filteredOS.reduce((s: number, r: AnyObject) => {
            return s + parseCurrency(r.ValorReembolsavel || r.ValorReembolsadoCliente || r.ValorReembolsado || r.ValorReembolso);
        }, 0);

        // Total km for filtered OS (fallbacks)
        const totalKm = filteredOS.reduce((s: number, r: AnyObject) => s + parseCurrency(r.Km || r.KmRodado || r.Kilometragem || r.KmPercorrido || r.KmRodadoTotal || 0), 0);
        const cpk = totalKm > 0 ? totalCost / totalKm : 0;

        const percReembolsavel = totalCost > 0 ? (valorReembolsavel / totalCost) * 100 : 0;

        return { totalCost, avgCost, avgTime, stopped, valorReembolsavel, percReembolsavel, totalKm, cpk };
    }, [filteredOS]);

    // Chart 1: Preventive vs Corrective (Donut by Value)
    const typeData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredOS.forEach((r: AnyObject) => {
            const t = r.TipoManutencao || 'Outros';
            map[t] = (map[t] || 0) + parseCurrency(r.ValorTotal);
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [filteredOS]);

    // Chart 2: Top 5 Offenders (Plates by Cost)
    const topOffenders = useMemo(() => {
        const map: Record<string, number> = {};
        filteredOS.forEach((r: AnyObject) => {
            const p = r.Placa || 'N/A';
            map[p] = (map[p] || 0) + parseCurrency(r.ValorTotal);
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [filteredOS]);

    // Chart 3: Expense Groups (From Items)
    const groupData = useMemo(() => {
        const map: Record<string, number> = {};
        filteredItens.forEach((i: AnyObject) => {
            const g = i.GrupoDespesa || 'Outros';
            map[g] = (map[g] || 0) + parseCurrency(i.ValorItem);
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [filteredItens]);

    // Chart 4: Monthly Evolution (includes Km and CPK)
    const monthlyData = useMemo(() => {
        const map: Record<string, { valor: number; km: number }> = {};
        filteredOS.forEach((r: AnyObject) => {
            const k = getMonthKey(r.DataEntrada);
            if (!k) return;
            const valor = parseCurrency(r.ValorTotal);
            const km = parseCurrency(r.Km || r.KmRodado || r.Kilometragem || r.KmPercorrido || r.KmRodadoTotal || 0);
            if (!map[k]) map[k] = { valor: 0, km: 0 };
            map[k].valor += valor;
            map[k].km += km;
        });
        return Object.keys(map).sort().map(k => ({
            name: monthLabel(k),
            Valor: map[k].valor,
            Km: map[k].km,
            CPK: map[k].km > 0 ? map[k].valor / map[k].km : 0
        }));
    }, [filteredOS]);



    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Title className="text-slate-900">Gestão de Manutenção</Title>
                    <Text className="mt-1 text-slate-500">Controle de custos, oficinas e eficiência de reparo.</Text>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        <Wrench className="w-4 h-4" /> Hub Manutenção
                    </div>
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-white shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <Text className="font-medium text-slate-700">Filtros</Text>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <Text className="text-xs text-slate-500 mb-1">Período (Entrada)</Text>
                        <div className="flex gap-2">
                            <input type="date" className="border border-slate-300 p-2 rounded-md w-full text-sm outline-none focus:ring-2 focus:ring-amber-500" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                            <input type="date" className="border border-slate-300 p-2 rounded-md w-full text-sm outline-none focus:ring-2 focus:ring-amber-500" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Text className="text-xs text-slate-500 mb-1">Tipo Manutenção</Text>
                        <select multiple className="w-full border border-slate-300 rounded-md p-2 text-sm h-10 outline-none focus:ring-2 focus:ring-amber-500" value={selectedTipos} onChange={e => setSelectedTipos(Array.from(e.target.selectedOptions).map(o => o.value))}>
                            {tiposManutencao.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <Text className="text-xs text-slate-500 mb-1">Modelo</Text>
                        <select multiple className="w-full border border-slate-300 rounded-md p-2 text-sm h-10 outline-none focus:ring-2 focus:ring-amber-500" value={selectedModelos} onChange={e => setSelectedModelos(Array.from(e.target.selectedOptions).map(o => o.value))}>
                            {modelos.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 w-full py-2 rounded-md text-sm transition-colors"
                            onClick={() => {
                                setDateFrom(`${currentYear}-01-01`);
                                setDateTo(`${currentYear}-12-31`);
                                setSelectedTipos([]);
                                setSelectedModelos([]);
                            }}
                        >
                            Limpar Filtros
                        </button>
                    </div>
                </div>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <Card decoration="top" decorationColor="amber" className="bg-white border border-slate-200 shadow-sm">
                    <Text className="text-slate-500">Custo Total</Text>
                    <Metric className="text-slate-900">{fmtBRL(kpis.totalCost)}</Metric>
                </Card>
                <Card decoration="top" decorationColor="blue" className="bg-white border border-slate-200 shadow-sm">
                    <Text className="text-slate-500">Custo Médio / OS</Text>
                    <Metric className="text-slate-900">{fmtBRL(kpis.avgCost)}</Metric>
                </Card>
                <Card decoration="top" decorationColor="emerald" className="bg-white border border-slate-200 shadow-sm">
                    <Text className="text-slate-500">MTTR (Tempo Médio)</Text>
                    <Metric className="text-slate-900">{kpis.avgTime.toFixed(1)} dias</Metric>
                </Card>
                <Card decoration="top" decorationColor="rose" className="bg-white border border-slate-200 shadow-sm">
                    <Text className="text-slate-500">Veículos Parados Hoje</Text>
                    <Metric className="text-slate-900">{kpis.stopped}</Metric>
                </Card>
                <Card decoration="top" decorationColor="teal" className="bg-white border border-slate-200 shadow-sm">
                    <Text className="text-slate-500">% Reembolsável</Text>
                    <Metric className="text-slate-900">{kpis.percReembolsavel.toFixed(1)}%</Metric>
                </Card>
                <Card decoration="top" decorationColor="slate" className="bg-white border border-slate-200 shadow-sm">
                    <Text className="text-slate-500">CPK (R$/km)</Text>
                    <Metric className="text-slate-900">{kpis.cpk ? kpis.cpk.toFixed(2) : '0.00'}</Metric>
                </Card>
            </div>

            {/* Row 1 Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="bg-white border border-slate-200 shadow-sm">
                    <Title className="text-slate-900">Custo por Tipo</Title>
                    <DonutChart
                        data={typeData}
                        category="value"
                        index="name"
                        valueFormatter={(v) => fmtBRL(v)}
                        colors={['amber', 'rose', 'blue', 'slate']}
                        className="h-60 mt-4"
                    />
                </Card>
                <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm">
                    <Title className="text-slate-900">Top 5 Ofensores (Placa)</Title>
                    <div className="mt-4">
                        <BarList data={topOffenders} valueFormatter={(v) => fmtBRL(v)} color="amber" />
                    </div>
                </Card>
            </div>

            {/* Row 2 Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-white border border-slate-200 shadow-sm">
                    <Title className="text-slate-900">Top Grupos de Despesa</Title>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={groupData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} stroke="#64748b" />
                                <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                                <Tooltip formatter={(v: any) => fmtBRL(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card className="bg-white border border-slate-200 shadow-sm">
                    <Title className="text-slate-900">Evolução de Custo Mensal</Title>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                                <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={fmtCompact} stroke="#64748b" />
                                <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v:any) => v ? v.toFixed(2) : '0.00'} stroke="#0ea5e9" />
                                <Tooltip formatter={(v: any, name: any) => {
                                    if (name === 'CPK') return [`${v ? v.toFixed(2) : '0.00'}`, 'CPK (R$/km)'];
                                    return [fmtBRL(v), name];
                                }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="Valor" fill="#f59e0b" radius={[4, 4, 0, 0]} yAxisId="left" />
                                <Line type="monotone" dataKey="CPK" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} yAxisId="right" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Table: Lista de OSs recentes */}
            <Card className="bg-white shadow-sm border border-slate-200">
                <Title className="text-slate-900 mb-4">Lista de OSs Recentes</Title>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 font-medium">OS</th>
                                <th className="px-4 py-3 font-medium">Placa</th>
                                <th className="px-4 py-3 font-medium">Entrada</th>
                                <th className="px-4 py-3 font-medium">Tipo</th>
                                <th className="px-4 py-3 font-medium">Fornecedor</th>
                                <th className="px-4 py-3 font-medium text-right">Valor Total</th>
                                <th className="px-4 py-3 font-medium text-right">Dias Parado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOS.sort((a, b) => (b.DataEntrada || '').localeCompare(a.DataEntrada || '')).slice(0, 10).map((r, i) => (
                                <tr key={`os-${i}`} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900">{r.NumeroOS}</td>
                                    <td className="px-4 py-3 text-slate-600">{r.Placa}</td>
                                    <td className="px-4 py-3 text-slate-600">{r.DataEntrada ? new Date(r.DataEntrada).toLocaleDateString('pt-BR') : '-'}</td>
                                    <td className="px-4 py-3 text-slate-600">{r.TipoManutencao}</td>
                                    <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">{r.Fornecedor}</td>
                                    <td className="px-4 py-3 text-right font-medium text-amber-700">{fmtBRL(parseCurrency(r.ValorTotal))}</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{r.DiasParado}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
