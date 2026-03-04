import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { SinistrosFiltersProvider, useSinistrosFilters } from '@/contexts/SinistrosFiltersContext';
import { SinistrosFiltersBar } from '@/components/analytics/claims/SinistrosFiltersBar';
import SinistrosCulpaChart from '@/components/analytics/claims/SinistrosCulpaChart';
import SinistrosMapView from '@/components/analytics/claims/SinistrosMapView';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { AlertTriangle, DollarSign, ShieldCheck, Car, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

// ── Types ────────────────────────────────────────────────────────
interface SinistroRaw {
    IdOcorrencia: number;
    Ocorrencia: string;
    Placa: string;
    Modelo?: string;
    DataSinistro?: string;
    DataCriacao?: string;
    Descricao?: string;
    TipoSinistro?: string;
    Status?: string;
    ValorTotal?: number;
    ValorSinistro?: number;
    ValorOrcado?: number;
    IndenizacaoSeguradora?: number;
    BoletimOcorrencia?: string;
    Condutor?: string;
    Cliente?: string;
    MotoristaCulpado?: string;
    ResponsavelCulpado?: string;
    Culpabilidade?: string;
    TipoDano?: string;
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

const getDataSinistro = (s: SinistroRaw): string => s.DataSinistro || s.DataCriacao || '';

const getValor = (s: SinistroRaw): number =>
    parseNum(s.ValorTotal) || parseNum(s.ValorSinistro) || parseNum(s.ValorOrcado) || 0;

const getCulpa = (s: SinistroRaw): string => {
    if (s.Culpabilidade) return s.Culpabilidade;
    if (s.MotoristaCulpado === 'Sim' || s.MotoristaCulpado === '1') return 'Motorista';
    if (s.ResponsavelCulpado === 'Sim' || s.ResponsavelCulpado === '1') return 'Empresa';
    return 'Terceiros';
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

const PALETTE = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];

// ── Inner component ──────────────────────────────────────────────
function ClaimsDashboardInner() {
    const { data: rawSinistros, loading, metadata } = useBIData<SinistroRaw[]>('fat_sinistros');
    const { filters } = useSinistrosFilters();
    const [activeTab, setActiveTab] = useState<'visao-geral' | 'culpa' | 'mapa'>('visao-geral');

    // Normalize & filter
    const sinistros = useMemo(() => {
        if (!Array.isArray(rawSinistros)) return [];
        let result = rawSinistros.map(s => ({
            ...s,
            ValorTotal: parseNum(s.ValorTotal),
            ValorSinistro: parseNum(s.ValorSinistro),
            ValorOrcado: parseNum(s.ValorOrcado),
            IndenizacaoSeguradora: parseNum(s.IndenizacaoSeguradora),
            Latitude: parseNum(s.Latitude),
            Longitude: parseNum(s.Longitude),
        }));

        if (filters.dateRange?.from) {
            const from = filters.dateRange.from;
            result = result.filter(s => new Date(getDataSinistro(s)) >= from);
        }
        if (filters.dateRange?.to) {
            const to = filters.dateRange.to;
            result = result.filter(s => new Date(getDataSinistro(s)) <= to);
        }
        if (filters.culpabilidade.length > 0) {
            result = result.filter(s => filters.culpabilidade.includes(getCulpa(s)));
        }
        if (filters.tiposDano.length > 0) {
            result = result.filter(s => filters.tiposDano.includes(s.TipoDano || s.TipoSinistro || ''));
        }
        if (filters.placas.length > 0) {
            result = result.filter(s => filters.placas.includes(s.Placa || ''));
        }
        if (filters.status.length > 0) {
            result = result.filter(s => filters.status.includes(s.Status || ''));
        }

        return result;
    }, [rawSinistros, filters]);

    // Filter options
    const filterLists = useMemo(() => {
        const all = Array.isArray(rawSinistros) ? rawSinistros : [];
        return {
            culpabilidade: [...new Set(all.map(s => getCulpa(s)))].sort(),
            tiposDano: [...new Set(all.map(s => s.TipoDano || s.TipoSinistro).filter(Boolean) as string[])].sort(),
            placas: [...new Set(all.map(s => s.Placa).filter(Boolean) as string[])].sort(),
            status: [...new Set(all.map(s => s.Status).filter(Boolean) as string[])].sort(),
        };
    }, [rawSinistros]);

    // ── KPIs ────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const valorTotal = sinistros.reduce((s, r) => s + getValor(r), 0);
        const valorRecuperado = sinistros.reduce((s, r) => s + (r.IndenizacaoSeguradora || 0), 0);
        const veiculosEnvolvidos = new Set(sinistros.map(s => s.Placa)).size;
        const ticketMedio = sinistros.length > 0 ? valorTotal / sinistros.length : 0;
        return { valorTotal, valorRecuperado, veiculosEnvolvidos, ticketMedio, qtd: sinistros.length };
    }, [sinistros]);

    // ── Evolução mensal ──────────────────────────────────────────────
    const evolucaoMensal = useMemo(() => {
        const byMonth = new Map<string, { qtd: number; valor: number; recuperado: number }>();
        sinistros.forEach(s => {
            const ym = isoYM(getDataSinistro(s));
            if (!ym) return;
            const cur = byMonth.get(ym) || { qtd: 0, valor: 0, recuperado: 0 };
            cur.qtd++;
            cur.valor += getValor(s);
            cur.recuperado += s.IndenizacaoSeguradora || 0;
            byMonth.set(ym, cur);
        });
        return [...byMonth.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([mes, v]) => ({ mes, label: fmtMonth(mes), ...v }));
    }, [sinistros]);

    // ── Top veículos sinistrados ────────────────────────────────────
    const topVeiculos = useMemo(() => {
        const map = new Map<string, { qtd: number; valor: number; modelo: string }>();
        sinistros.forEach(s => {
            const placa = s.Placa || 'N/A';
            const cur = map.get(placa) || { qtd: 0, valor: 0, modelo: s.Modelo || '' };
            cur.qtd++;
            cur.valor += getValor(s);
            map.set(placa, cur);
        });
        return [...map.entries()]
            .map(([placa, v]) => ({ placa, ...v }))
            .sort((a, b) => b.qtd - a.qtd);
    }, [sinistros]);

    // ── Export ──────────────────────────────────────────────────────
    const exportXLSX = () => {
        const rows = sinistros.map(s => ({
            Placa: s.Placa,
            Modelo: s.Modelo || '',
            Data: getDataSinistro(s)?.substring(0, 10) || '',
            Tipo: s.TipoSinistro || '',
            Descrição: s.Descricao || '',
            Culpabilidade: getCulpa(s),
            Condutor: s.Condutor || '',
            'Valor Total': getValor(s),
            'Indenização': s.IndenizacaoSeguradora || 0,
            Status: s.Status || '',
            'B.O.': s.BoletimOcorrencia || '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sinistros');
        XLSX.writeFile(wb, `sinistros_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    if (loading) return <AnalyticsLoading message="Carregando dados de sinistros..." />;

    const tabs = [
        { key: 'visao-geral', label: '📊 Visão Geral' },
        { key: 'culpa', label: '⚖️ Culpabilidade' },
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
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard de Sinistros</h1>
                            <p className="text-sm text-slate-500">Análise de sinistros, culpabilidade e recuperação de valores</p>
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
                <SinistrosFiltersBar
                    culpabilidadeList={filterLists.culpabilidade}
                    tiposDanoList={filterLists.tiposDano}
                    placasList={filterLists.placas}
                    statusList={filterLists.status}
                />

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Qtd Sinistros
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
                            <ShieldCheck className="w-3.5 h-3.5" /> Recuperado (Seguradora)
                        </div>
                        <div className="text-2xl font-bold text-emerald-600">{fmtCompact(kpis.valorRecuperado)}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                            <Car className="w-3.5 h-3.5" /> Veículos Envolvidos
                        </div>
                        <div className="text-2xl font-bold text-indigo-600">{kpis.veiculosEnvolvidos}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
                            Ticket Médio
                        </div>
                        <div className="text-2xl font-bold text-amber-600">{fmtCompact(kpis.ticketMedio)}</div>
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
                            <h3 className="font-semibold text-slate-800 mb-4">Evolução Mensal de Sinistros</h3>
                            <div className="overflow-x-auto pb-4">
                                <div style={{ minWidth: evolucaoMensal.length * 60 }}>
                                    <ResponsiveContainer width="100%" height={320}>
                                        <BarChart data={evolucaoMensal}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="label" fontSize={11} tick={{ fill: '#64748b' }} />
                                            <YAxis yAxisId="left" fontSize={11} tick={{ fill: '#64748b' }} />
                                            <YAxis yAxisId="right" orientation="right" fontSize={11} tick={{ fill: '#64748b' }}
                                                tickFormatter={(v: number) => fmtCompact(v)} />
                                            <Tooltip formatter={(v: number, name: string) =>
                                                name === 'valor' ? [fmtBRL(v), 'Custo'] : name === 'recuperado' ? [fmtBRL(v), 'Recuperado'] : [v, 'Qtd']}
                                            />
                                            <Bar yAxisId="left" dataKey="qtd" fill="#6366f1" radius={[4, 4, 0, 0]} name="Qtd" />
                                            <Bar yAxisId="right" dataKey="valor" fill="#ef4444" radius={[4, 4, 0, 0]} name="Custo" opacity={0.7} />
                                            <Bar yAxisId="right" dataKey="recuperado" fill="#10b981" radius={[4, 4, 0, 0]} name="Recuperado" opacity={0.7} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Top Veículos */}
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-semibold text-slate-800 mb-4">Top Veículos Sinistrados</h3>
                            <div className="overflow-y-auto" style={{ maxHeight: 350 }}>
                                <ResponsiveContainer width="100%" height={Math.max(350, topVeiculos.length * 35)}>
                                    <BarChart data={topVeiculos} layout="vertical" margin={{ left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis type="number" fontSize={11} tick={{ fill: '#64748b' }} />
                                        <YAxis type="category" dataKey="placa" width={90} fontSize={11} tick={{ fill: '#334155', fontFamily: 'monospace' }} />
                                        <Tooltip formatter={(v: number, name: string) =>
                                            name === 'valor' ? [fmtBRL(v), 'Custo Total'] : [v, 'Sinistros']}
                                        />
                                        <Bar dataKey="qtd" fill="#ef4444" radius={[0, 4, 4, 0]} name="Sinistros">
                                            {topVeiculos.map((_, i) => (
                                                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'culpa' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <SinistrosCulpaChart sinistros={sinistros} />
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-semibold text-slate-800 mb-4">Detalhamento por Culpabilidade</h3>
                            <div className="space-y-3">
                                {['Motorista', 'Empresa', 'Terceiros'].map(tipo => {
                                    const filtered = sinistros.filter(s => getCulpa(s) === tipo);
                                    const valor = filtered.reduce((s, r) => s + getValor(r), 0);
                                    const recuperado = filtered.reduce((s, r) => s + (r.IndenizacaoSeguradora || 0), 0);
                                    const pct = sinistros.length > 0 ? ((filtered.length / sinistros.length) * 100).toFixed(1) : '0';
                                    const color = tipo === 'Motorista' ? 'border-l-red-500' : tipo === 'Empresa' ? 'border-l-amber-500' : 'border-l-emerald-500';
                                    return (
                                        <div key={tipo} className={`border border-l-4 ${color} rounded-lg p-4`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-semibold text-slate-800">{tipo}</h4>
                                                    <p className="text-sm text-slate-500">{filtered.length} ocorrências ({pct}%)</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-red-600 text-sm">{fmtBRL(valor)}</p>
                                                    {recuperado > 0 && (
                                                        <p className="text-xs text-emerald-600">Recuperado: {fmtBRL(recuperado)}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'mapa' && (
                    <SinistrosMapView sinistros={sinistros as any} />
                )}
            </div>
        </div>
    );
}

// ── Wrapper with Provider ─────────────────────────────────────────
export default function ClaimsDashboard() {
    return (
        <SinistrosFiltersProvider>
            <ClaimsDashboardInner />
        </SinistrosFiltersProvider>
    );
}
