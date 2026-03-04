import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { MultasFiltersProvider, useMultasFilters } from '@/contexts/MultasFiltersContext';
import { MultasFiltersBar } from '@/components/analytics/infractions/MultasFiltersBar';
import MultasDescontoAlert from '@/components/analytics/infractions/MultasDescontoAlert';
import MultasHeatmap from '@/components/analytics/infractions/MultasHeatmap';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
    PieChart, Pie, Legend,
} from 'recharts';
import { AlertTriangle, DollarSign, TrendingDown, Hash, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

// ── Types ────────────────────────────────────────────────────────

interface MultaRaw {
    IdOcorrencia: number;
    Ocorrencia: string;
    Placa: string;
    Modelo?: string;
    DataInfracao: string;
    DataLimitePagamento?: string;
    DescricaoInfracao?: string;
    CodigoInfracao?: string;
    OrgaoAutuador?: string;
    AutoInfracao?: string;
    ValorMulta?: number;
    ValorReembolsado?: number;
    ValorDesconto?: number;
    Pontuacao?: number;
    Status?: string;
    Condutor?: string;
    TipoInfracao?: string;
    Latitude?: number;
    Longitude?: number;
    Cidade?: string;
    Estado?: string;
}

// ── Helpers ──────────────────────────────────────────────────────
const parseNum = (v: any): number => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
};

const fmtBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtCompact = (v: number) => {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}R$ ${(abs / 1_000).toFixed(0)}k`;
    return fmtBRL(v);
};

const isoYM = (d: string): string | null => {
    if (!d || d.length < 7) return null;
    return d.substring(0, 7);
};

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmtMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    return `${MONTHS_PT[Number(m) - 1]}/${y.slice(2)}`;
};

const PALETTE = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

// ── Inner component (consumes context) ───────────────────────────
function InfractionsDashboardInner() {
    const { data: rawMultas, loading, metadata } = useBIData<MultaRaw[]>('fat_multas');
    const { filters } = useMultasFilters();
    const [activeTab, setActiveTab] = useState<'visao-geral' | 'descontos' | 'mapa'>('visao-geral');

    // Normalize & filter
    const multas = useMemo(() => {
        if (!Array.isArray(rawMultas)) return [];
        let result = rawMultas.map(m => ({
            ...m,
            ValorMulta: parseNum(m.ValorMulta),
            ValorReembolsado: parseNum(m.ValorReembolsado),
            ValorDesconto: parseNum(m.ValorDesconto),
            Pontuacao: parseNum(m.Pontuacao),
            Latitude: parseNum(m.Latitude),
            Longitude: parseNum(m.Longitude),
        }));

        // Apply context filters
        if (filters.dateRange?.from) {
            const from = filters.dateRange.from;
            result = result.filter(m => new Date(m.DataInfracao) >= from);
        }
        if (filters.dateRange?.to) {
            const to = filters.dateRange.to;
            result = result.filter(m => new Date(m.DataInfracao) <= to);
        }
        if (filters.status.length > 0) {
            result = result.filter(m => filters.status.includes(m.Status || ''));
        }
        if (filters.condutores.length > 0) {
            result = result.filter(m => filters.condutores.includes(m.Condutor || ''));
        }
        if (filters.placas.length > 0) {
            result = result.filter(m => filters.placas.includes(m.Placa || ''));
        }
        if (filters.tiposInfracao.length > 0) {
            result = result.filter(m => filters.tiposInfracao.includes(m.TipoInfracao || m.DescricaoInfracao || ''));
        }

        return result;
    }, [rawMultas, filters]);

    // Filter options
    const filterLists = useMemo(() => {
        const all = Array.isArray(rawMultas) ? rawMultas : [];
        return {
            condutores: [...new Set(all.map(m => m.Condutor).filter(Boolean) as string[])].sort(),
            placas: [...new Set(all.map(m => m.Placa).filter(Boolean) as string[])].sort(),
            tipos: [...new Set(all.map(m => m.TipoInfracao || m.DescricaoInfracao).filter(Boolean) as string[])].sort(),
            status: [...new Set(all.map(m => m.Status).filter(Boolean) as string[])].sort(),
        };
    }, [rawMultas]);

    // ── KPIs ────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const valorTotal = multas.reduce((s, m) => s + m.ValorMulta, 0);
        const valorReembolsado = multas.reduce((s, m) => s + m.ValorReembolsado, 0);
        const pctReembolso = valorTotal > 0 ? (valorReembolsado / valorTotal) * 100 : 0;
        const totalPontos = multas.reduce((s, m) => s + m.Pontuacao, 0);
        return { valorTotal, valorReembolsado, pctReembolso, qtd: multas.length, totalPontos };
    }, [multas]);

    // ── Evolução mensal ──────────────────────────────────────────────
    const evolucaoMensal = useMemo(() => {
        const byMonth = new Map<string, { qtd: number; valor: number }>();
        multas.forEach(m => {
            const ym = isoYM(m.DataInfracao);
            if (!ym) return;
            const cur = byMonth.get(ym) || { qtd: 0, valor: 0 };
            cur.qtd++;
            cur.valor += m.ValorMulta;
            byMonth.set(ym, cur);
        });
        return [...byMonth.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([mes, v]) => ({ mes, label: fmtMonth(mes), ...v }));
    }, [multas]);

    // ── Top condutores ──────────────────────────────────────────────
    const topCondutores = useMemo(() => {
        const map = new Map<string, { qtd: number; valor: number; pontos: number }>();
        multas.forEach(m => {
            const cond = m.Condutor || 'Não informado';
            const cur = map.get(cond) || { qtd: 0, valor: 0, pontos: 0 };
            cur.qtd++;
            cur.valor += m.ValorMulta;
            cur.pontos += m.Pontuacao;
            map.set(cond, cur);
        });
        return [...map.entries()]
            .map(([name, v]) => ({ name: name.length > 25 ? name.slice(0, 22) + '…' : name, fullName: name, ...v }))
            .sort((a, b) => b.qtd - a.qtd);
    }, [multas]);

    // ── Distribuição por tipo ─────────────────────────────────────
    const tiposDistribuicao = useMemo(() => {
        const map = new Map<string, number>();
        multas.forEach(m => {
            const tipo = m.TipoInfracao || m.DescricaoInfracao || 'Outros';
            const short = tipo.length > 30 ? tipo.slice(0, 27) + '…' : tipo;
            map.set(short, (map.get(short) || 0) + 1);
        });
        return [...map.entries()]
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [multas]);

    // ── Export ──────────────────────────────────────────────────────
    const exportXLSX = () => {
        const rows = multas.map(m => ({
            Placa: m.Placa,
            Modelo: m.Modelo || '',
            DataInfracao: m.DataInfracao?.substring(0, 10) || '',
            Condutor: m.Condutor || '',
            Descrição: m.DescricaoInfracao || '',
            ValorMulta: m.ValorMulta,
            ValorReembolsado: m.ValorReembolsado,
            Pontos: m.Pontuacao,
            Status: m.Status || '',
            Órgão: m.OrgaoAutuador || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Multas');
        XLSX.writeFile(wb, `multas_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (loading) return <AnalyticsLoading message="Carregando dados de multas..." />;

    const tabs = [
        { key: 'visao-geral', label: '📊 Visão Geral' },
        { key: 'descontos', label: '💰 Descontos' },
        { key: 'mapa', label: '🗺️ Mapa' },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/analytics" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-slate-500" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard de Multas</h1>
                            <p className="text-sm text-slate-500">Análise de infrações, condutores e reembolso</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {metadata && <DataUpdateBadge metadata={metadata} />}
                        <button onClick={exportXLSX}
                            className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                            📥 Exportar XLSX
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <MultasFiltersBar
                    condutoresList={filterLists.condutores}
                    placasList={filterLists.placas}
                    tiposInfracaoList={filterLists.tipos}
                    statusList={filterLists.status}
                />

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                            <Hash className="w-3.5 h-3.5" /> Qtd Infrações
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{kpis.qtd.toLocaleString('pt-BR')}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                            <DollarSign className="w-3.5 h-3.5" /> Valor Total
                        </div>
                        <div className="text-2xl font-bold text-red-600">{fmtCompact(kpis.valorTotal)}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                            <TrendingDown className="w-3.5 h-3.5" /> Valor Reembolsado
                        </div>
                        <div className="text-2xl font-bold text-emerald-600">{fmtCompact(kpis.valorReembolsado)}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                            % Reembolso
                        </div>
                        <div className="text-2xl font-bold text-indigo-600">{kpis.pctReembolso.toFixed(1)}%</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Total Pontos CNH
                        </div>
                        <div className="text-2xl font-bold text-amber-600">{kpis.totalPontos.toLocaleString('pt-BR')}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white border rounded-lg p-1">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                                }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'visao-geral' && (
                    <div className="space-y-6">
                        {/* Evolução Mensal */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-semibold text-slate-800 mb-4">Evolução Mensal de Multas</h3>
                            <div className="overflow-x-auto pb-4">
                                <div style={{ minWidth: evolucaoMensal.length * 50 }}>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <BarChart data={evolucaoMensal}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="label" fontSize={11} tick={{ fill: '#64748b' }} />
                                            <YAxis yAxisId="left" fontSize={11} tick={{ fill: '#64748b' }} />
                                            <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: '#64748b' }}
                                                tickFormatter={(v: number) => fmtCompact(v)} />
                                            <Tooltip formatter={(v: number, name: string) =>
                                                name === 'valor' ? [fmtBRL(v), 'Valor'] : [v, 'Qtd']}
                                            />
                                            <Bar yAxisId="left" dataKey="qtd" fill="#6366f1" radius={[4, 4, 0, 0]} name="Qtd" />
                                            <Bar yAxisId="right" dataKey="valor" fill="#ef4444" radius={[4, 4, 0, 0]} name="Valor" opacity={0.7} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Condutores */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="font-semibold text-slate-800 mb-4">Top Infratores (Condutores)</h3>
                                <div className="overflow-y-auto" style={{ maxHeight: 350 }}>
                                    <ResponsiveContainer width="100%" height={Math.max(350, topCondutores.length * 35)}>
                                        <BarChart data={topCondutores} layout="vertical" margin={{ left: 10 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis type="number" fontSize={11} tick={{ fill: '#64748b' }} />
                                            <YAxis type="category" dataKey="name" width={140} fontSize={11} tick={{ fill: '#334155' }} />
                                            <Tooltip formatter={(v: number, name: string) =>
                                                name === 'valor' ? [fmtBRL(v), 'Valor'] : [v, 'Quantidade']}
                                            />
                                            <Bar dataKey="qtd" fill="#6366f1" radius={[0, 4, 4, 0]} name="Quantidade">
                                                {topCondutores.map((_, i) => (
                                                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Tipos de Infração */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="font-semibold text-slate-800 mb-4">Distribuição por Tipo de Infração</h3>
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie data={tiposDistribuicao} cx="50%" cy="50%" innerRadius={60} outerRadius={110}
                                            paddingAngle={3} dataKey="value">
                                            {tiposDistribuicao.map((_, i) => (
                                                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v: number) => [v, 'Infrações']} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'descontos' && (
                    <MultasDescontoAlert multas={multas} diasAlerta={10} />
                )}

                {activeTab === 'mapa' && (
                    <MultasHeatmap multas={multas} />
                )}
            </div>
        </div>
    );
}

// ── Wrapper with Provider ─────────────────────────────────────────
export default function InfractionsDashboard() {
    return (
        <MultasFiltersProvider>
            <InfractionsDashboardInner />
        </MultasFiltersProvider>
    );
}
