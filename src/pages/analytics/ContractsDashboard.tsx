import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    PieChart,
    Pie,
    Cell,
    LabelList,
    Legend
} from 'recharts';
import { FileText, TrendingUp, Users, AlertCircle } from 'lucide-react';
import ChurnDashboard from './ChurnDashboard';

type AnyObject = { [k: string]: any };

// Formata moeda
function fmtBRL(v: number) {
    try {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    } catch (e) {
        return String(v);
    }
}

// Gera chave de mês YYYY-MM
function monthKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Formata label MMM/YY
function monthLabel(ym: string) {
    const [y, m] = ym.split('-');
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mi = Number(m) - 1;
    return `${months[mi]}/${String(y).slice(2)}`;
}

export default function ContractsDashboard(): JSX.Element {
    // Hooks de dados
    const { data: contratosData } = useBIData<AnyObject[]>('dim_contratos.json');
    const { data: churnData } = useBIData<AnyObject[]>('dim_churn.json');

    // Normalização de dados (Contratos)
    const contratos: AnyObject[] = useMemo(() => {
        if (!contratosData) return [];
        if (Array.isArray(contratosData)) return contratosData as AnyObject[];
        // Tratamento para estruturas { data: [...] }
        if ((contratosData as any).data && Array.isArray((contratosData as any).data)) return (contratosData as any).data;
        const keys = Object.keys(contratosData as any);
        for (const k of keys) if (Array.isArray((contratosData as any)[k])) return (contratosData as any)[k];
        return [];
    }, [contratosData]);

    // Normalização de dados (Churn)
    const churnRecords: AnyObject[] = useMemo(() => {
        if (!churnData) return [];
        if (Array.isArray(churnData)) return churnData as AnyObject[];
        if ((churnData as any).data && Array.isArray((churnData as any).data)) return (churnData as any).data;
        const keys = Object.keys(churnData as any);
        for (const k of keys) if (Array.isArray((churnData as any)[k])) return (churnData as any)[k];
        return [];
    }, [churnData]);

    // Controle de Abas
    const [activeTab, setActiveTab] = useState<'overview' | 'ativos' | 'movimentacao' | 'churn'>('overview');

    // === CÁLCULOS: OVERVIEW ===
    const overviewKpis = useMemo(() => {
        const totalAtivos = contratos.length;
        // Tenta pegar ValorMensal ou ValorVigente
        const totalValorMensal = contratos.reduce((s, c) => s + (Number(c.ValorMensal || c.ValorVigente) || 0), 0);

        // Métricas de Churn (Histórico total carregado)
        const iniciados = churnRecords.filter(r => String(r.TipoEvento || '').toLowerCase() === 'iniciado').length;
        const encerrados = churnRecords.filter(r => String(r.TipoEvento || '').toLowerCase() === 'encerrado').length;

        // Taxa de Churn simples (Encerrados / Total Movimentado)
        const churnRate = (iniciados + encerrados) ? (encerrados / (iniciados + encerrados)) * 100 : 0;

        return { totalAtivos, totalValorMensal, iniciados, encerrados, churnRate };
    }, [contratos, churnRecords]);

    // Contratos por cliente (Top 10)
    const contratosPorCliente = useMemo(() => {
        const map: Record<string, number> = {};
        contratos.forEach(c => {
            const cliente = c.Cliente || c.Nome || 'Sem Cliente';
            map[cliente] = (map[cliente] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [contratos]);

    // Distribuição por tipo (Pie Chart)
    const tiposContrato = useMemo(() => {
        const map: Record<string, number> = {};
        contratos.forEach(c => {
            // Tenta identificar o tipo, senão assume Locação
            const tipo = c.TipoContrato || c.Tipo || 'Locação';
            map[tipo] = (map[tipo] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [contratos]);

    // === CÁLCULOS: ATIVOS ===
    const [ativosDateFrom, setAtivosDateFrom] = useState<string | null>(null);
    const [ativosDateTo, setAtivosDateTo] = useState<string | null>(null);

    const contratosFiltered = useMemo(() => {
        return contratos.filter(c => {
            const inicio = c.InicioContrato || c.DataInicio || c.Inicio;
            if (!inicio) return false;

            if (ativosDateFrom && new Date(inicio) < new Date(ativosDateFrom + 'T00:00:00')) return false;
            if (ativosDateTo && new Date(inicio) > new Date(ativosDateTo + 'T23:59:59')) return false;

            return true;
        });
    }, [contratos, ativosDateFrom, ativosDateTo]);

    // Histograma de Valores
    const valoresDistribution = useMemo(() => {
        const ranges = [
            { key: 'R$ 0-1k', min: 0, max: 1000 },
            { key: 'R$ 1k-2k', min: 1000, max: 2000 },
            { key: 'R$ 2k-3k', min: 2000, max: 3000 },
            { key: 'R$ 3k-5k', min: 3000, max: 5000 },
            { key: 'R$ +5k', min: 5000, max: Infinity },
        ];
        const map = ranges.map(r => ({ faixa: r.key, count: 0 }));
        contratosFiltered.forEach(c => {
            const valor = Number(c.ValorMensal || c.ValorVigente) || 0;
            for (let i = 0; i < ranges.length; i++) {
                const r = ranges[i];
                if (valor >= r.min && valor < r.max) {
                    map[i].count += 1;
                    break;
                }
            }
        });
        return map;
    }, [contratosFiltered]);

    // Top Clientes Financeiro
    const topClientesPorValor = useMemo(() => {
        const map: Record<string, number> = {};
        contratosFiltered.forEach(c => {
            const cliente = c.Cliente || c.Nome || 'Sem Cliente';
            const valor = Number(c.ValorMensal || c.ValorVigente) || 0;
            map[cliente] = (map[cliente] || 0) + valor;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [contratosFiltered]);

    // === CÁLCULOS: MOVIMENTAÇÃO ===
    const [movDateFrom, setMovDateFrom] = useState<string | null>(null);
    const [movDateTo, setMovDateTo] = useState<string | null>(null);

    const churnFiltered = useMemo(() => {
        return churnRecords.filter(r => {
            if (!r.DataEvento) return false;
            if (movDateFrom && new Date(r.DataEvento) < new Date(movDateFrom + 'T00:00:00')) return false;
            if (movDateTo && new Date(r.DataEvento) > new Date(movDateTo + 'T23:59:59')) return false;
            return true;
        });
    }, [churnRecords, movDateFrom, movDateTo]);

    const movimentacaoMonthly = useMemo(() => {
        const map: Record<string, { Novos: number; Cancelados: number }> = {};
        churnFiltered.forEach(r => {
            const d = r.DataEvento ? new Date(r.DataEvento) : null;
            const month = d ? monthKey(d) : 'unknown';
            if (!map[month]) map[month] = { Novos: 0, Cancelados: 0 };

            const tipo = String(r.TipoEvento || '').toLowerCase();
            if (tipo === 'iniciado') map[month].Novos += 1;
            else if (tipo === 'encerrado') map[month].Cancelados += 1;
        });

        return Object.keys(map).sort().map(k => ({
            month: monthLabel(k),
            Novos: map[k].Novos,
            Cancelados: map[k].Cancelados,
            Saldo: map[k].Novos - map[k].Cancelados,
        }));
    }, [churnFiltered]);

    const motivosEncerramento = useMemo(() => {
        const map: Record<string, number> = {};
        churnFiltered.forEach(r => {
            if (String(r.TipoEvento || '').toLowerCase() !== 'encerrado') return;
            const motivo = r.Motivo || 'Não informado';
            map[motivo] = (map[motivo] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [churnFiltered]);

    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Title className="text-slate-900">Análise de Contratos</Title>
                    <Text className="mt-1 text-slate-500">Visão completa de contratos ativos, movimentação e performance.</Text>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Hub Financeiro
                    </div>
                </div>
            </div>

            {/* Tabs de Navegação */}
            <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
                {['overview', 'ativos', 'movimentacao', 'churn'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        {tab === 'overview' ? 'Visão Geral' : tab === 'ativos' ? 'Contratos Ativos' : tab === 'movimentacao' ? 'Movimentação' : 'Abertura e Encerramento Contrato'}
                    </button>
                ))}
            </div>

            {/* === CONTEÚDO DA ABA OVERVIEW === */}
            {activeTab === 'overview' && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-white shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-50">
                                    <FileText className="text-blue-600" size={20} />
                                </div>
                                <div>
                                    <Text className="text-slate-500 text-sm">Contratos Ativos</Text>
                                    <Metric className="text-slate-900">{overviewKpis.totalAtivos}</Metric>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-white shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-50">
                                    <TrendingUp className="text-emerald-600" size={20} />
                                </div>
                                <div>
                                    <Text className="text-slate-500 text-sm">Receita Mensal Total</Text>
                                    <Metric className="text-slate-900">{fmtBRL(overviewKpis.totalValorMensal)}</Metric>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-white shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-violet-50">
                                    <Users className="text-violet-600" size={20} />
                                </div>
                                <div>
                                    <Text className="text-slate-500 text-sm">Novos / Cancelados</Text>
                                    <Metric className="text-slate-900">{overviewKpis.iniciados} / {overviewKpis.encerrados}</Metric>
                                </div>
                            </div>
                        </Card>

                        <Card className="bg-white shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-50">
                                    <AlertCircle className="text-amber-600" size={20} />
                                </div>
                                <div>
                                    <Text className="text-slate-500 text-sm">Taxa de Churn</Text>
                                    <Metric className="text-slate-900">{overviewKpis.churnRate.toFixed(2)}%</Metric>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Top Clientes */}
                        <Card className="bg-white shadow-sm border border-slate-200">
                            <Title className="text-slate-900">Top 10 Clientes (por quantidade)</Title>
                            <div className="mt-4 h-80 overflow-y-auto pr-2">
                                <BarList data={contratosPorCliente} valueFormatter={(v) => `${v} contratos`} color="blue" className="mt-2" />
                            </div>
                        </Card>

                        {/* Pizza Tipo Contrato */}
                        <Card className="bg-white shadow-sm border border-slate-200">
                            <Title className="text-slate-900">Distribuição por Tipo</Title>
                            <div className="h-80 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={tiposContrato}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            outerRadius={100}
                                            label={({ percent }: any) => `${Math.round(percent * 100)}%`}
                                            labelLine={false}
                                        >
                                            {tiposContrato.map((_, idx) => (
                                                <Cell key={`cell-${idx}`} fill={["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"][idx % 4]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* === CONTEÚDO DA ABA ATIVOS === */}
            {activeTab === 'ativos' && (
                <>
                    <Card className="bg-white shadow-sm border border-slate-200">
                        <Text className="text-slate-700 font-medium mb-2">Filtros</Text>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Text className="text-slate-500 text-xs mb-1">Data Início (De - Até)</Text>
                                <div className="flex gap-2">
                                    <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none" value={ativosDateFrom || ''} onChange={(e) => setAtivosDateFrom(e.target.value || null)} />
                                    <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none" value={ativosDateTo || ''} onChange={(e) => setAtivosDateTo(e.target.value || null)} />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => { setAtivosDateFrom(null); setAtivosDateTo(null); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-sm w-full">
                                    Limpar Filtros
                                </button>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="bg-white shadow-sm border border-slate-200">
                            <Title className="text-slate-900">Distribuição de Valores Mensais</Title>
                            <div className="h-80 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={valoresDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="faixa" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="count" position="top" fill="#64748b" fontSize={12} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="bg-white shadow-sm border border-slate-200">
                            <Title className="text-slate-900">Top 10 Clientes (por valor)</Title>
                            <div className="mt-4 h-80 overflow-y-auto pr-2">
                                <BarList data={topClientesPorValor} valueFormatter={(v) => fmtBRL(v)} color="blue" className="mt-2" />
                            </div>
                        </Card>
                    </div>
                </>
            )}

            {/* === CONTEÚDO DA ABA MOVIMENTAÇÃO === */}
            {activeTab === 'movimentacao' && (
                <>
                    <Card className="bg-white shadow-sm border border-slate-200">
                        <Text className="text-slate-700 font-medium mb-2">Filtros</Text>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <Text className="text-slate-500 text-xs mb-1">Período (De - Até)</Text>
                                <div className="flex gap-2">
                                    <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none" value={movDateFrom || ''} onChange={(e) => setMovDateFrom(e.target.value || null)} />
                                    <input type="date" className="w-full border border-slate-300 rounded-md p-2 text-sm outline-none" value={movDateTo || ''} onChange={(e) => setMovDateTo(e.target.value || null)} />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => { setMovDateFrom(null); setMovDateTo(null); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-sm w-full">
                                    Limpar Filtros
                                </button>
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
                            <Title className="text-slate-900">Fluxo Mensal de Contratos</Title>
                            <div className="h-80 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={movimentacaoMonthly} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '8px' }} />
                                        <Legend verticalAlign="top" height={36} />
                                        <Bar dataKey="Novos" name="Novos" fill="#10b981" />
                                        <Bar dataKey="Cancelados" name="Cancelados" fill="#ef4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card className="bg-white shadow-sm border border-slate-200">
                            <Title className="text-slate-900">Motivos de Encerramento</Title>
                            <div className="mt-4 h-80 overflow-y-auto pr-2">
                                <BarList data={motivosEncerramento} valueFormatter={(v) => `${v} casos`} color="red" className="mt-2" />
                            </div>
                        </Card>
                    </div>
                </>
            )}
            {/* === CONTEÚDO DA ABA CHURN (embed da página existente) === */}
            {activeTab === 'churn' && (
                <div>
                    <ChurnDashboard />
                </div>
            )}
        </div>
    );
}