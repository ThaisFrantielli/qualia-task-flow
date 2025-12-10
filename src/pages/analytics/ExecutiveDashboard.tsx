import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { LayoutDashboard, Car, DollarSign, Wrench, Users, AlertTriangle, CheckCircle, XCircle, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
  const { data: rawLancamentos } = useBIData<AnyObject[]>('fat_lancamentos_*.json');

  const frota = useMemo(() => Array.isArray(rawFrota) ? rawFrota : (rawFrota as any)?.data || [], [rawFrota]);
  const rentabilidade = useMemo(() => Array.isArray(rawRentabilidade) ? rawRentabilidade : (rawRentabilidade as any)?.data || [], [rawRentabilidade]);
  const churn = useMemo(() => Array.isArray(rawChurn) ? rawChurn : (rawChurn as any)?.data || [], [rawChurn]);
  const alienacoes = useMemo(() => Array.isArray(rawAlienacoes) ? rawAlienacoes : (rawAlienacoes as any)?.data || [], [rawAlienacoes]);
  const auditoria = useMemo(() => Array.isArray(rawAuditoria) ? rawAuditoria : (rawAuditoria as any)?.data || [], [rawAuditoria]);
  const faturamento = useMemo(() => Array.isArray(rawFaturamento) ? rawFaturamento : (rawFaturamento as any)?.data || [], [rawFaturamento]);
  const manutencao = useMemo(() => Array.isArray(rawManutencao) ? rawManutencao : (rawManutencao as any)?.data || [], [rawManutencao]);
  const lancamentos = useMemo(() => Array.isArray(rawLancamentos) ? rawLancamentos : (rawLancamentos as any)?.data || [], [rawLancamentos]);

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
    return { frota: { total: totalFrota, locados, emManutencao, utilizacao }, financeiro: { receita, custoManutencao, custoManutencaoPorVeiculo }, clientes: { total: totalClientes, churnRate }, divida: { saldoDevedor }, auditoria: { alta: alertasAlta } };
  }, [frota, faturamento, manutencao, rentabilidade, churn, alienacoes, auditoria]);

  // Período Anterior (30 dias atrás)
  const scoreCompare = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Receita: últimos 30 dias vs 30-60 dias atrás
    const receitaAtual = faturamento.filter((f: AnyObject) => {
      const d = f.DataEmissao ? new Date(f.DataEmissao) : null;
      return d && d >= thirtyDaysAgo && d <= now;
    }).reduce((s: number, f: AnyObject) => s + parseCurrency(f.ValorTotal), 0);

    const receitaAnterior = faturamento.filter((f: AnyObject) => {
      const d = f.DataEmissao ? new Date(f.DataEmissao) : null;
      return d && d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).reduce((s: number, f: AnyObject) => s + parseCurrency(f.ValorTotal), 0);

    const trendReceita = receitaAnterior > 0 ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100 : 0;

    // Custo Manutenção
    const custoAtual = manutencao.filter((m: AnyObject) => {
      const d = m.DataEntrada ? new Date(m.DataEntrada) : null;
      return d && d >= thirtyDaysAgo && d <= now;
    }).reduce((s: number, m: AnyObject) => s + parseCurrency(m.ValorTotal), 0);

    const custoAnterior = manutencao.filter((m: AnyObject) => {
      const d = m.DataEntrada ? new Date(m.DataEntrada) : null;
      return d && d >= sixtyDaysAgo && d < thirtyDaysAgo;
    }).reduce((s: number, m: AnyObject) => s + parseCurrency(m.ValorTotal), 0);

    const trendManutencao = custoAnterior > 0 ? ((custoAtual - custoAnterior) / custoAnterior) * 100 : 0;

    // Churn Rate: últimos 30 dias
    const churnAtual = churn.filter((c: AnyObject) => {
      const d = c.DataEvento ? new Date(c.DataEvento) : null;
      return d && d >= thirtyDaysAgo && d <= now;
    });
    const iniciadosAtual = churnAtual.filter((c: AnyObject) => c.TipoEvento === 'Iniciado').length;
    const encerradosAtual = churnAtual.filter((c: AnyObject) => c.TipoEvento === 'Encerrado').length;
    const churnRateAtual = iniciadosAtual > 0 ? (encerradosAtual / iniciadosAtual) * 100 : 0;

    const churnAnterior = churn.filter((c: AnyObject) => {
      const d = c.DataEvento ? new Date(c.DataEvento) : null;
      return d && d >= sixtyDaysAgo && d < thirtyDaysAgo;
    });
    const iniciadosAnterior = churnAnterior.filter((c: AnyObject) => c.TipoEvento === 'Iniciado').length;
    const encerradosAnterior = churnAnterior.filter((c: AnyObject) => c.TipoEvento === 'Encerrado').length;
    const churnRateAnterior = iniciadosAnterior > 0 ? (encerradosAnterior / iniciadosAnterior) * 100 : 0;

    const trendChurn = churnRateAtual - churnRateAnterior;

    return { trendReceita, trendManutencao, trendChurn, churnRateAtual };
  }, [faturamento, manutencao, churn]);

  // Top 3 Alertas Críticos
  const top3Alertas = useMemo(() => {
    const alertas: Array<{ titulo: string; valor: string; gravidade: 'alta' | 'media' }> = [];

    // Alerta 1: Inadimplência > 10%
    const totalReceita = faturamento.reduce((s: number, f: AnyObject) => s + parseCurrency(f.ValorTotal), 0);
    const vencidos = lancamentos.filter((l: AnyObject) => {
      const venc = l.DataVencimento ? new Date(l.DataVencimento) : null;
      const pago = l.DataPagamento ? new Date(l.DataPagamento) : null;
      return venc && venc < new Date() && !pago;
    });
    const valorVencido = vencidos.reduce((s: number, l: AnyObject) => s + parseCurrency(l.Valor), 0);
    const percInadimplencia = totalReceita > 0 ? (valorVencido / totalReceita) * 100 : 0;

    if (percInadimplencia > 10) {
      alertas.push({ titulo: `Inadimplência em ${percInadimplencia.toFixed(1)}%`, valor: `R$ ${(valorVencido / 1000000).toFixed(1)}M em atraso`, gravidade: 'alta' });
    }

    // Alerta 2: Churn > 5%
    if (scoreCompare.churnRateAtual > 5) {
      alertas.push({ titulo: `Churn Rate em ${scoreCompare.churnRateAtual.toFixed(1)}%`, valor: 'Clientes abandonando contratos', gravidade: scoreCompare.churnRateAtual > 10 ? 'alta' : 'media' });
    }

    // Alerta 3: Custo Manutenção cresceu > 15%
    if (scoreCompare.trendManutencao > 15) {
      alertas.push({ titulo: `Custo Manutenção +${scoreCompare.trendManutencao.toFixed(1)}%`, valor: 'Crescimento acima do normal', gravidade: 'alta' });
    }

    return alertas.slice(0, 3);
  }, [faturamento, lancamentos, scoreCompare]);

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
        <Card decoration="top" decorationColor="emerald" className="bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Car className="w-4 h-4 text-emerald-600" /><Text className="text-slate-500">Frota</Text></div>
          <Metric>{scorecard.frota.total}</Metric>
          <span className="text-sm text-emerald-600">{scorecard.frota.utilizacao.toFixed(1)}% utilização</span>
        </Card>

        <Card decoration="top" decorationColor="blue" className="bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-blue-600" /><Text className="text-slate-500">Receita</Text></div>
            {scoreCompare.trendReceita > 0 ? <TrendingUp className="w-5 h-5 text-emerald-600" /> : scoreCompare.trendReceita < 0 ? <TrendingDown className="w-5 h-5 text-red-600" /> : <Minus className="w-5 h-5 text-slate-400" />}
          </div>
          <Metric>{fmtCompact(scorecard.financeiro.receita)}</Metric>
          <span className={`text-sm ${scoreCompare.trendReceita > 0 ? 'text-emerald-600' : scoreCompare.trendReceita < 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {scoreCompare.trendReceita > 0 ? '+' : ''}{scoreCompare.trendReceita.toFixed(1)}% vs mês anterior
          </span>
        </Card>

        <Card decoration="top" decorationColor="violet" className="bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-violet-600" /><Text className="text-slate-500">Manutenção</Text></div>
            {scoreCompare.trendManutencao > 0 ? <TrendingUp className="w-5 h-5 text-red-600" /> : scoreCompare.trendManutencao < 0 ? <TrendingDown className="w-5 h-5 text-emerald-600" /> : <Minus className="w-5 h-5 text-slate-400" />}
          </div>
          <Metric>{fmtCompact(scorecard.financeiro.custoManutencaoPorVeiculo)}</Metric>
          <span className={`text-sm ${scoreCompare.trendManutencao > 0 ? 'text-red-600' : scoreCompare.trendManutencao < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
            {scoreCompare.trendManutencao > 0 ? '+' : ''}{scoreCompare.trendManutencao.toFixed(1)}% vs mês anterior
          </span>
        </Card>

        <Card decoration="top" decorationColor="amber" className="bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-amber-600" /><Text className="text-slate-500">Clientes</Text></div>
            {scoreCompare.trendChurn > 0 ? <TrendingUp className="w-5 h-5 text-red-600" /> : scoreCompare.trendChurn < 0 ? <TrendingDown className="w-5 h-5 text-emerald-600" /> : <Minus className="w-5 h-5 text-slate-400" />}
          </div>
          <Metric>{scorecard.clientes.total}</Metric>
          <span className={`text-sm ${scorecard.clientes.churnRate <= 10 ? 'text-emerald-600' : 'text-red-600'}`}>
            {scorecard.clientes.churnRate.toFixed(1)}% churn ({scoreCompare.trendChurn > 0 ? '+' : ''}{scoreCompare.trendChurn.toFixed(1)}pp)
          </span>
        </Card>

        <Card decoration="top" decorationColor="rose" className="bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-rose-600" /><Text className="text-slate-500">Dívida</Text></div>
          <Metric>{fmtCompact(scorecard.divida.saldoDevedor)}</Metric>
        </Card>
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

      {/* Top 3 Alertas Críticos */}
      {top3Alertas.length > 0 ? (
        <Card className="bg-white shadow-sm border-l-4 border-l-red-500">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <Title>Top 3 Alertas Críticos</Title>
              <Text>Indicadores que requerem atenção imediata</Text>
            </div>
          </div>
          <div className="space-y-3">
            {top3Alertas.map((alerta, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${alerta.gravidade === 'alta' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <Text className={`font-semibold ${alerta.gravidade === 'alta' ? 'text-red-700' : 'text-amber-700'}`}>{alerta.titulo}</Text>
                    <Text className="text-slate-600 text-sm mt-1">{alerta.valor}</Text>
                  </div>
                  {alerta.gravidade === 'alta' ? <XCircle className="w-5 h-5 text-red-500" /> : <AlertTriangle className="w-5 h-5 text-amber-500" />}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="bg-white shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
            <div>
              <Title>Tudo em Ordem</Title>
              <Text>Nenhum alerta crítico identificado.</Text>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
