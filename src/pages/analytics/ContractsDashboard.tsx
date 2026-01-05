import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart, Line
} from 'recharts';
import { FileText } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function fmtBRL(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string) { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

export default function ContractsDashboard(): JSX.Element {
    // --- HOOKS DE DADOS (ETL V6) ---
    const { data: contratosData } = useBIData<AnyObject[]>('dim_contratos_locacao.json');
    const { data: churnData } = useBIData<AnyObject[]>('fat_churn.json');
    const { data: rentabilidadeData } = useBIData<AnyObject[]>('rentabilidade_360_geral.json');
    const { data: faturamentoData } = useBIData<AnyObject[]>('fat_faturamentos_*.json');
    const { data: manutencaoData } = useBIData<AnyObject[]>('fat_manutencao_unificado.json');

    // Normalização
    const contratos = useMemo(() => Array.isArray(contratosData) ? contratosData : [], [contratosData]);
    const churn = useMemo(() => Array.isArray(churnData) ? churnData : [], [churnData]);
    const rentabilidade = useMemo(() => Array.isArray(rentabilidadeData) ? rentabilidadeData : [], [rentabilidadeData]);
    const faturamento = useMemo(() => (faturamentoData as any)?.data || faturamentoData || [], [faturamentoData]);
    const manutencao = useMemo(() => (manutencaoData as any)?.data || manutencaoData || [], [manutencaoData]);

    // Estados
    const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'carteira' | 'rentabilidade'>('overview');
    const currentYear = new Date().getFullYear();
    const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
    const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);

    // === CÁLCULOS GERAIS ===
    
    // 1. Overview
    const kpisOverview = useMemo(() => {
        const totalAtivos = contratos.length;
        const totalValorMensal = contratos.reduce((s, c) => s + parseCurrency(c.ValorMensal), 0);
        const iniciados = churn.filter(r => r.TipoEvento === 'Iniciado').length;
        const encerrados = churn.filter(r => r.TipoEvento === 'Encerrado').length;
        const churnRate = (iniciados + encerrados) ? (encerrados / (iniciados + encerrados)) * 100 : 0;
        return { totalAtivos, totalValorMensal, iniciados, encerrados, churnRate };
    }, [contratos, churn]);

    const topClientes = useMemo(() => {
        const map: any = {};
        contratos.forEach(c => { map[c.Cliente] = (map[c.Cliente] || 0) + 1; });
        return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);
    }, [contratos]);

    // 2. Performance (Unificado do antigo dashboard)
    const performanceData = useMemo(() => {
        // Filtra faturamento e manutenção pelo período e linka com contratos (via Placa ou Cliente)
        const map: Record<string, { receita: number, custo: number, previsto: number }> = {};
        
        // Inicializa meses
        let curr = new Date(dateFrom);
        const end = new Date(dateTo);
        while (curr <= end) {
            map[getMonthKey(curr.toISOString())] = { receita: 0, custo: 0, previsto: 0 };
            curr.setMonth(curr.getMonth() + 1);
        }

        // Soma Receita (Realizado) - Tipagem explícita adicionada
        faturamento.forEach((f: AnyObject) => {
            const k = getMonthKey(f.DataCompetencia);
            if (map[k]) map[k].receita += parseCurrency(f.VlrTotal);
        });

        // Soma Custo (Manutenção) - Link indireto - Tipagem explícita adicionada
        manutencao.forEach((m: AnyObject) => {
            const k = getMonthKey(m.DataEntrada);
            if (map[k]) map[k].custo += parseCurrency(m.CustoTotalOS || m.ValorTotal);
        });

        // Soma Previsto (Baseado nos contratos ativos no mês)
        // Simplificação: Soma ValorMensal de todos contratos ativos * número de meses
        const totalMensalContratos = contratos.reduce((s, c) => s + parseCurrency(c.ValorMensal), 0);
        Object.keys(map).forEach(k => {
            map[k].previsto = totalMensalContratos; // Valor aproximado mensal da carteira
        });

        return Object.keys(map).sort().map(k => ({
            month: monthLabel(k),
            Receita: map[k].receita,
            Custo: map[k].custo,
            Previsto: map[k].previsto,
            Margem: map[k].receita - map[k].custo
        }));
    }, [faturamento, manutencao, contratos, dateFrom, dateTo]);

    const kpisPerformance = useMemo(() => {
        const receita = performanceData.reduce((s, p) => s + p.Receita, 0);
        const custo = performanceData.reduce((s, p) => s + p.Custo, 0);
        const previsto = performanceData.reduce((s, p) => s + p.Previsto, 0);
        const execucao = previsto > 0 ? (receita / previsto) * 100 : 0;
        return { receita, custo, previsto, execucao, margem: receita - custo };
    }, [performanceData]);

    // 3. Rentabilidade (ABC)
    const curvaABC = useMemo(() => {
        const sorted = rentabilidade.sort((a, b) => parseCurrency(b.Margem) - parseCurrency(a.Margem));
        const totalMargem = sorted.reduce((s, r) => s + parseCurrency(r.Margem), 0);
        let acumulado = 0;
        return sorted.map((r, i) => {
            acumulado += parseCurrency(r.Margem);
            const pct = totalMargem > 0 ? (acumulado / totalMargem) * 100 : 0;
            return {
                rank: i + 1,
                cliente: r.Cliente,
                margem: parseCurrency(r.Margem),
                receita: parseCurrency(r.Receita),
                classe: pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C'
            };
        });
    }, [rentabilidade]);

    return (
        <div className="bg-slate-50 min-h-screen p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <Title className="text-slate-900">Gestão de Contratos</Title>
                    <Text className="text-slate-500">Visão 360º: Carteira, Performance Financeira e Operacional.</Text>
                </div>
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex gap-2">
                    <FileText className="w-4 h-4" /> Hub Comercial
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
                {['overview', 'performance', 'carteira', 'rentabilidade'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all ${
                            activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {tab === 'overview' ? 'Visão Geral' : tab === 'performance' ? 'Desempenho' : tab}
                    </button>
                ))}
            </div>

            {/* ABA 1: VISÃO GERAL */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card decoration="top" decorationColor="blue"><Text>Contratos Ativos</Text><Metric>{kpisOverview.totalAtivos}</Metric></Card>
                        <Card decoration="top" decorationColor="emerald"><Text>Receita Mensal (Carteira)</Text><Metric>{fmtBRL(kpisOverview.totalValorMensal)}</Metric></Card>
                        <Card decoration="top" decorationColor="violet"><Text>Movimentação (Ent/Sai)</Text><Metric>{kpisOverview.iniciados} / {kpisOverview.encerrados}</Metric></Card>
                        <Card decoration="top" decorationColor="rose"><Text>Churn Rate</Text><Metric>{kpisOverview.churnRate.toFixed(1)}%</Metric></Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <Title>Top 10 Clientes (Volume)</Title>
                            <div className="mt-4"><BarList data={topClientes} valueFormatter={(v) => `${v} ctr`} color="blue" /></div>
                        </Card>
                        <Card>
                            <Title>Movimentação de Churn (12 meses)</Title>
                            <div className="h-72 mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={churn.reduce((acc: any, r) => {
                                        const m = getMonthKey(r.DataEvento);
                                        const idx = acc.findIndex((i:any) => i.date === m);
                                        if (idx === -1) acc.push({ date: m, label: monthLabel(m), Novos: r.TipoEvento==='Iniciado'?1:0, Cancelados: r.TipoEvento==='Encerrado'?1:0 });
                                        else { if(r.TipoEvento==='Iniciado') acc[idx].Novos++; else acc[idx].Cancelados++; }
                                        return acc;
                                    }, []).sort((a:any,b:any) => a.date.localeCompare(b.date))}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="label" fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="Novos" fill="#10b981" />
                                        <Bar dataKey="Cancelados" fill="#ef4444" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ABA 2: DESEMPENHO (Antigo Performance Dashboard) */}
            {activeTab === 'performance' && (
                <div className="space-y-6">
                    <Card className="bg-slate-50 border-blue-100">
                        <div className="flex gap-4 items-center">
                            <Text className="text-slate-500">Período:</Text>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border p-1 rounded text-sm"/>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border p-1 rounded text-sm"/>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card decoration="top" decorationColor="blue"><Text>Previsto (Carteira)</Text><Metric>{fmtBRL(kpisPerformance.previsto)}</Metric></Card>
                        <Card decoration="top" decorationColor="emerald"><Text>Realizado (Faturado)</Text><Metric>{fmtBRL(kpisPerformance.receita)}</Metric></Card>
                        <Card decoration="top" decorationColor="amber"><Text>Custos Manutenção</Text><Metric>{fmtBRL(kpisPerformance.custo)}</Metric></Card>
                        <Card decoration="top" decorationColor={kpisPerformance.execucao >= 90 ? 'emerald' : 'rose'}><Text>% Execução da Receita</Text><Metric>{kpisPerformance.execucao.toFixed(1)}%</Metric></Card>
                    </div>

                    <Card>
                        <Title>Resultado Financeiro Operacional (Receita vs Custo)</Title>
                        <div className="h-80 mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="month" fontSize={12} />
                                    <YAxis fontSize={12} tickFormatter={fmtBRL} />
                                    <Tooltip formatter={fmtBRL} />
                                    <Legend />
                                    <Bar dataKey="Receita" fill="#3b82f6" name="Receita Faturada" />
                                    <Bar dataKey="Custo" fill="#f59e0b" name="Custo Manutenção" />
                                    <Line type="monotone" dataKey="Margem" stroke="#10b981" strokeWidth={3} name="Margem Operacional" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}

            {/* ABA 3: CARTEIRA */}
            {activeTab === 'carteira' && (
                <Card>
                    <Title className="mb-4">Carteira de Contratos Ativos</Title>
                    <div className="overflow-x-auto max-h-[600px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 sticky top-0">
                                <tr>
                                    <th className="p-3">Contrato</th>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3">Placa</th>
                                    <th className="p-3">Início</th>
                                    <th className="p-3 text-right">Valor Mensal</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {contratos.slice(0, 50).map((c, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono text-xs">{c.NumeroContrato || c.IdContratoLocacao}</td>
                                        <td className="p-3 font-medium">{c.Cliente}</td>
                                        <td className="p-3">{c.Placa}</td>
                                        <td className="p-3">{c.InicioContrato ? new Date(c.InicioContrato).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="p-3 text-right">{fmtBRL(parseCurrency(c.ValorMensal))}</td>
                                        <td className="p-3 text-center"><span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs">{c.Status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Text className="mt-2 text-xs text-slate-500">Mostrando os primeiros 50 contratos.</Text>
                </Card>
            )}

            {/* ABA 4: RENTABILIDADE */}
            {activeTab === 'rentabilidade' && (
                <div className="space-y-6">
                    <Card>
                        <Title>Curva ABC de Clientes (Margem)</Title>
                        <div className="overflow-x-auto max-h-[600px] mt-4">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-600 sticky top-0">
                                    <tr>
                                        <th className="p-3">Rank</th>
                                        <th className="p-3">Cliente</th>
                                        <th className="p-3 text-right">Receita Total</th>
                                        <th className="p-3 text-right">Margem</th>
                                        <th className="p-3 text-center">Classe</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {curvaABC.map((c, i) => (
                                        <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-3 text-slate-500">{c.rank}</td>
                                            <td className="p-3 font-medium">{c.cliente}</td>
                                            <td className="p-3 text-right">{fmtBRL(c.receita)}</td>
                                            <td className="p-3 text-right font-bold text-emerald-600">{fmtBRL(c.margem)}</td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    c.classe === 'A' ? 'bg-emerald-100 text-emerald-700' : 
                                                    c.classe === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                }`}>{c.classe}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}