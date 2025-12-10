import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { LayoutDashboard, Car, DollarSign, Wrench, Users, AlertTriangle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  if (typeof v === 'string') {
    const s = v.replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(s) || 0;
  }
  return 0;
}

function fmtCompact(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ExecutiveDashboard(): JSX.Element {
  const { data: rawFrota, loading: l1 } = useBIData<AnyObject[]>('dim_frota.json');
  const { data: rawRentabilidade } = useBIData<AnyObject[]>('dim_rentabilidade.json');
  const { data: rawChurn } = useBIData<AnyObject[]>('dim_churn.json');
  const { data: rawAlienacoes } = useBIData<AnyObject[]>('dim_alienacoes.json');
  const { data: rawAuditoria } = useBIData<AnyObject[]>('auditoria_consolidada.json');
  const { data: rawFaturamento } = useBIData<AnyObject[]>('fat_faturamento_*.json');
  const { data: rawManutencao } = useBIData<AnyObject[]>('fat_manutencao_os_*.json');

  const frota = useMemo(() => Array.isArray(rawFrota) ? rawFrota : (rawFrota as any)?.data || [], [rawFrota]);
  const rentabilidade = useMemo(() => Array.isArray(rawRentabilidade) ? rawRentabilidade : (rawRentabilidade as any)?.data || [], [rawRentabilidade]);
  const churn = useMemo(() => Array.isArray(rawChurn) ? rawChurn : (rawChurn as any)?.data || [], [rawChurn]);
  const alienacoes = useMemo(() => Array.isArray(rawAlienacoes) ? rawAlienacoes : (rawAlienacoes as any)?.data || [], [rawAlienacoes]);
  const auditoria = useMemo(() => Array.isArray(rawAuditoria) ? rawAuditoria : (rawAuditoria as any)?.data || [], [rawAuditoria]);
  const faturamento = useMemo(() => Array.isArray(rawFaturamento) ? rawFaturamento : (rawFaturamento as any)?.data || [], [rawFaturamento]);
  const manutencao = useMemo(() => Array.isArray(rawManutencao) ? rawManutencao : (rawManutencao as any)?.data || [], [rawManutencao]);

  const scorecard = useMemo(() => {
    const totalFrota = frota.length;
    const locados = frota.filter((v: AnyObject) => v.SituacaoVeiculo === 'Locado').length;
    const emManutencao = frota.filter((v: AnyObject) => ['Em Manutenção', 'Sinistro'].includes(v.SituacaoVeiculo)).length;
    const utilizacao = totalFrota > 0 ? (locados / totalFrota) * 100 : 0;
    const receita = faturamento.reduce((s: number, f: AnyObject) => s + parseCurrency(f.ValorTotal), 0);
    const custoManutencao = manutencao.reduce((s: number, m: AnyObject) => s + parseCurrency(m.ValorTotal), 0);
    const custoManutencaoPorVeiculo = totalFrota > 0 ? custoManutencao / totalFrota : 0;
    const totalClientes = rentabilidade.length;
    const iniciados = churn.filter((c: AnyObject) => c.TipoEvento === 'Iniciado').length;
    const encerrados = churn.filter((c: AnyObject) => c.TipoEvento === 'Encerrado').length;
    const churnRate = iniciados > 0 ? (encerrados / iniciados) * 100 : 0;
    const saldoDevedor = alienacoes.reduce((s: number, a: AnyObject) => s + parseCurrency(a.SaldoDevedor || a.SaldoRemanescente), 0);
    const alertasAlta = auditoria.filter((a: AnyObject) => a.Gravidade === 'Alta').length;
    return { frota: { total: totalFrota, locados, emManutencao, utilizacao }, financeiro: { receita, custoManutencaoPorVeiculo }, clientes: { total: totalClientes, churnRate }, divida: { saldoDevedor }, auditoria: { alta: alertasAlta } };
  }, [frota, faturamento, manutencao, rentabilidade, churn, alienacoes, auditoria]);

  const receitaEvolution = useMemo(() => {
    const map: Record<string, number> = {};
    faturamento.forEach((f: AnyObject) => { const k = getMonthKey(f.DataEmissao); if (k) map[k] = (map[k] || 0) + parseCurrency(f.ValorTotal); });
    return Object.keys(map).sort().slice(-12).map(k => ({ mes: monthLabel(k), Receita: map[k] }));
  }, [faturamento]);

  const frotaDistribuicao = useMemo(() => {
    const map: Record<string, number> = {};
    frota.forEach((v: AnyObject) => { const s = v.SituacaoVeiculo || 'Outros'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [frota]);

  const quickLinks = [
    { label: 'Frota', path: '/analytics/frota', icon: Car },
    { label: 'Financeiro', path: '/analytics/financeiro', icon: DollarSign },
    { label: 'Manutenção', path: '/analytics/manutencao', icon: Wrench },
    { label: 'Clientes', path: '/analytics/clientes', icon: Users },
    { label: 'Auditoria', path: '/analytics/auditoria', icon: AlertTriangle }
  ];

  if (l1) return <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center"><div className="animate-pulse text-slate-500">Carregando...</div></div>;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><Title className="text-slate-900">Executive Summary</Title><Text className="mt-1 text-slate-500">Visão consolidada</Text></div>
        <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Painel Executivo</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {quickLinks.map((link, idx) => (
          <Link key={idx} to={link.path} className="p-4 rounded-xl bg-white border hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><link.icon className="w-5 h-5 text-slate-500" /><span className="font-medium text-slate-700">{link.label}</span></div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card decoration="top" decorationColor="emerald" className="bg-white shadow-sm"><div className="flex items-center gap-2 mb-2"><Car className="w-4 h-4 text-emerald-600" /><Text className="text-slate-500">Frota</Text></div><Metric>{scorecard.frota.total}</Metric><span className="text-sm text-emerald-600">{scorecard.frota.utilizacao.toFixed(1)}% utilização</span></Card>
        <Card decoration="top" decorationColor="blue" className="bg-white shadow-sm"><div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-blue-600" /><Text className="text-slate-500">Receita</Text></div><Metric>{fmtCompact(scorecard.financeiro.receita)}</Metric></Card>
        <Card decoration="top" decorationColor="violet" className="bg-white shadow-sm"><div className="flex items-center gap-2 mb-2"><Wrench className="w-4 h-4 text-violet-600" /><Text className="text-slate-500">Manutenção</Text></div><Metric>{fmtCompact(scorecard.financeiro.custoManutencaoPorVeiculo)}</Metric><span className="text-sm text-slate-500">Por veículo</span></Card>
        <Card decoration="top" decorationColor="amber" className="bg-white shadow-sm"><div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-amber-600" /><Text className="text-slate-500">Clientes</Text></div><Metric>{scorecard.clientes.total}</Metric><span className={`text-sm ${scorecard.clientes.churnRate <= 10 ? 'text-emerald-600' : 'text-red-600'}`}>{scorecard.clientes.churnRate.toFixed(1)}% churn</span></Card>
        <Card decoration="top" decorationColor="rose" className="bg-white shadow-sm"><div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-rose-600" /><Text className="text-slate-500">Dívida</Text></div><Metric>{fmtCompact(scorecard.divida.saldoDevedor)}</Metric></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white shadow-sm">
          <Title className="text-slate-900">Evolução da Receita</Title>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={receitaEvolution}><defs><linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="mes" fontSize={12} /><YAxis fontSize={12} tickFormatter={fmtCompact} /><Tooltip formatter={(v: any) => [fmtCompact(Number(v)), 'Receita']} /><Area type="monotone" dataKey="Receita" stroke="#3b82f6" fill="url(#colorReceita)" /></AreaChart></ResponsiveContainer></div>
        </Card>
        <Card className="bg-white shadow-sm">
          <Title className="text-slate-900">Distribuição da Frota</Title>
          <div className="h-52"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={frotaDistribuicao} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">{frotaDistribuicao.map((_, idx) => (<Cell key={idx} fill={COLORS[idx % COLORS.length]} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
        </Card>
      </div>

      {scorecard.auditoria.alta > 0 ? (
        <Card className="bg-white shadow-sm border-l-4 border-l-red-500"><div className="flex items-center gap-3"><XCircle className="w-6 h-6 text-red-500" /><div><Title>Alertas Críticos</Title><Text>{scorecard.auditoria.alta} alertas de alta gravidade</Text></div></div></Card>
      ) : (
        <Card className="bg-white shadow-sm border-l-4 border-l-emerald-500"><div className="flex items-center gap-3"><CheckCircle className="w-6 h-6 text-emerald-500" /><div><Title>Tudo em Ordem</Title><Text>Nenhum alerta crítico identificado.</Text></div></div></Card>
      )}
    </div>
  );
}
