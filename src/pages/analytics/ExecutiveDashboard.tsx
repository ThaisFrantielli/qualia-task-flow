import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import useBIData from '@/hooks/useBIData';

import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { LayoutDashboard, Car, DollarSign, Wrench, Users, AlertTriangle, ArrowRight, TrendingUp, TrendingDown, ShoppingCart, Tag } from 'lucide-react';
import { useChartFilter } from '@/hooks/useChartFilter';
import { ChartFilterBadges, FloatingClearButton } from '@/components/analytics/ChartFilterBadges';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtCompact(v: number): string { if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`; if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`; return `R$ ${v.toFixed(0)}`; }
function monthLabel(ym: string): string { if (!ym || ym.length < 7) return ym; const [y, m] = ym.split('-'); const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ExecutiveDashboard(): JSX.Element {
  const { data: rawFrota, loading: l1 } = useBIData<AnyObject[]>('dim_frota.json');
  const { data: rawContratos } = useBIData<AnyObject[]>('dim_contratos.json');
  const { data: rawClientes } = useBIData<AnyObject[]>('dim_clientes.json');
  const { data: rawFaturamento } = useBIData<AnyObject[]>('fat_faturamento_*.json');
  const { data: rawManutencao } = useBIData<AnyObject[]>('fat_manutencao_os_*.json');
  const { data: rawInadimplencia } = useBIData<AnyObject[]>('fat_inadimplencia.json');
  const { data: rawChurn } = useBIData<AnyObject[]>('fat_churn.json');
  const { data: rawPropostas } = useBIData<AnyObject[]>('fat_propostas_*.json');
  const { data: rawAuditoria } = useBIData<AnyObject[]>('auditoria_consolidada.json');

  const frota = useMemo(() => Array.isArray(rawFrota) ? rawFrota : [], [rawFrota]);
  const contratos = useMemo(() => Array.isArray(rawContratos) ? rawContratos : [], [rawContratos]);
  const clientes = useMemo(() => Array.isArray(rawClientes) ? rawClientes : [], [rawClientes]);
  const faturamento = useMemo(() => Array.isArray(rawFaturamento) ? rawFaturamento : [], [rawFaturamento]);
  const manutencao = useMemo(() => Array.isArray(rawManutencao) ? rawManutencao : [], [rawManutencao]);
  const inadimplencia = useMemo(() => Array.isArray(rawInadimplencia) ? rawInadimplencia : [], [rawInadimplencia]);
  const churn = useMemo(() => Array.isArray(rawChurn) ? rawChurn : [], [rawChurn]);
  const propostas = useMemo(() => Array.isArray(rawPropostas) ? rawPropostas : [], [rawPropostas]);
  const auditoria = useMemo(() => Array.isArray(rawAuditoria) ? rawAuditoria : [], [rawAuditoria]);

  const { filters, clearFilter, clearAllFilters, hasActiveFilters } = useChartFilter();

  // Scorecard Principal
  const scorecard = useMemo(() => {
    const totalFrota = frota.length;
    const locados = frota.filter(v => v.Status === 'Locado').length;
    const utilizacao = totalFrota > 0 ? (locados / totalFrota) * 100 : 0;
    
    const receitaTotal = faturamento.reduce((s, f) => s + parseCurrency(f.ValorTotal), 0);
    const custoManutencao = manutencao.reduce((s, m) => s + parseCurrency(m.ValorTotal), 0);
    
    const contratosAtivos = contratos.filter(c => c.Status === 'Ativo').length;
    const clientesAtivos = clientes.filter(c => c.ContratosAtivos > 0).length;
    
    const saldoDevedor = inadimplencia.reduce((s, i) => s + parseCurrency(i.SaldoDevedor), 0);
    const totalVencido = inadimplencia.filter(i => i.DiasAtraso > 0).reduce((s, i) => s + parseCurrency(i.SaldoDevedor), 0);
    
    const churnCount = churn.length;
    const alertasAlta = auditoria.filter(a => a.Gravidade === 'Alta').length;
    
    const propostasAbertas = propostas.filter(p => p.Status === 'Aberta' || p.Status === 'Em Negociação').length;
    const valorPipeline = propostas.filter(p => p.Status !== 'Perdida').reduce((s, p) => s + parseCurrency(p.ValorProposta), 0);

    return { 
      frota: { total: totalFrota, locados, utilizacao }, 
      financeiro: { receitaTotal, custoManutencao, saldoDevedor, totalVencido }, 
      clientes: { ativos: clientesAtivos, contratosAtivos, churnCount }, 
      comercial: { propostasAbertas, valorPipeline },
      auditoria: { alta: alertasAlta } 
    };
  }, [frota, faturamento, manutencao, contratos, clientes, inadimplencia, churn, propostas, auditoria]);

  // Trends (últimos 30 dias vs 30 anteriores)
  const trends = useMemo(() => {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const receitaAtual = faturamento.filter(f => { const d = f.DataEmissao ? new Date(f.DataEmissao) : null; return d && d >= d30; }).reduce((s, f) => s + parseCurrency(f.ValorTotal), 0);
    const receitaAnterior = faturamento.filter(f => { const d = f.DataEmissao ? new Date(f.DataEmissao) : null; return d && d >= d60 && d < d30; }).reduce((s, f) => s + parseCurrency(f.ValorTotal), 0);
    const trendReceita = receitaAnterior > 0 ? ((receitaAtual - receitaAnterior) / receitaAnterior) * 100 : 0;

    const custoAtual = manutencao.filter(m => { const d = m.DataEntrada ? new Date(m.DataEntrada) : null; return d && d >= d30; }).reduce((s, m) => s + parseCurrency(m.ValorTotal), 0);
    const custoAnterior = manutencao.filter(m => { const d = m.DataEntrada ? new Date(m.DataEntrada) : null; return d && d >= d60 && d < d30; }).reduce((s, m) => s + parseCurrency(m.ValorTotal), 0);
    const trendManutencao = custoAnterior > 0 ? ((custoAtual - custoAnterior) / custoAnterior) * 100 : 0;

    return { trendReceita, trendManutencao };
  }, [faturamento, manutencao]);

  // Alertas Críticos
  const alertas = useMemo(() => {
    const list: Array<{ titulo: string; valor: string; gravidade: 'alta' | 'media' }> = [];

    // Inadimplência crítica
    const percInadimplencia = scorecard.financeiro.receitaTotal > 0 ? (scorecard.financeiro.totalVencido / scorecard.financeiro.receitaTotal) * 100 : 0;
    if (percInadimplencia > 10) {
      list.push({ titulo: `Inadimplência ${percInadimplencia.toFixed(1)}%`, valor: fmtCompact(scorecard.financeiro.totalVencido), gravidade: 'alta' });
    }

    // Utilização baixa
    if (scorecard.frota.utilizacao < 70) {
      list.push({ titulo: `Utilização ${scorecard.frota.utilizacao.toFixed(1)}%`, valor: `${scorecard.frota.total - scorecard.frota.locados} parados`, gravidade: scorecard.frota.utilizacao < 50 ? 'alta' : 'media' });
    }

    // Auditoria
    if (scorecard.auditoria.alta > 5) {
      list.push({ titulo: `${scorecard.auditoria.alta} Erros de Dados`, valor: 'Verificar auditoria', gravidade: 'alta' });
    }

    return list.slice(0, 3);
  }, [scorecard]);

  // Gráficos
  const receitaEvolution = useMemo(() => {
    const map: Record<string, number> = {};
    faturamento.forEach(f => { const k = f.DataEmissao?.substring(0, 7); if (k) map[k] = (map[k] || 0) + parseCurrency(f.ValorTotal); });
    return Object.keys(map).sort().slice(-12).map(k => ({ mes: monthLabel(k), Receita: map[k] }));
  }, [faturamento]);

  const frotaDistribuicao = useMemo(() => {
    const map: Record<string, number> = {};
    frota.forEach(v => { const s = v.Status || 'Outros'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [frota]);

  const topClientes = useMemo(() => {
    const map: Record<string, number> = {};
    faturamento.forEach(f => { const c = f.Cliente || 'Outros'; map[c] = (map[c] || 0) + parseCurrency(f.ValorTotal); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [faturamento]);

  const quickLinks = [
    { label: 'Frota', path: '/analytics/frota', icon: Car, color: 'emerald' },
    { label: 'Financeiro', path: '/analytics/financeiro', icon: DollarSign, color: 'blue' },
    { label: 'Manutenção', path: '/analytics/manutencao', icon: Wrench, color: 'amber' },
    { label: 'Clientes', path: '/analytics/clientes', icon: Users, color: 'violet' },
    { label: 'Comercial', path: '/analytics/comercial', icon: Tag, color: 'pink' },
    { label: 'Compras', path: '/analytics/compras', icon: ShoppingCart, color: 'cyan' },
  ];

  if (l1) return <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center"><div className="animate-pulse text-slate-500">Carregando painel executivo...</div></div>;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><Title className="text-slate-900">Visão Geral Executiva</Title><Text className="mt-1 text-slate-500">Scorecard consolidado da operação</Text></div>
        <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Board</div>
      </div>
      {/* Chart filters (Power BI style) */}
      <FloatingClearButton onClick={clearAllFilters} show={hasActiveFilters} />
      <ChartFilterBadges filters={filters} onClearFilter={clearFilter} onClearAll={clearAllFilters} />

      {/* Links Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {quickLinks.map((link, idx) => (
          <Link key={idx} to={link.path} className="p-4 rounded-xl bg-white border hover:shadow-md transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><link.icon className="w-5 h-5 text-slate-500 group-hover:text-slate-700" /><span className="font-medium text-slate-700">{link.label}</span></div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Scorecard */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card decoration="top" decorationColor="emerald" className="bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Car className="w-4 h-4 text-emerald-600" /><Text className="text-slate-500">Frota</Text></div>
          <Metric>{scorecard.frota.total}</Metric>
          <span className="text-sm text-emerald-600">{scorecard.frota.utilizacao.toFixed(1)}% locado</span>
        </Card>

        <Card decoration="top" decorationColor="blue" className="bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-blue-600" /><Text className="text-slate-500">Receita</Text></div>
            {trends.trendReceita >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
          </div>
          <Metric>{fmtCompact(scorecard.financeiro.receitaTotal)}</Metric>
          <span className={`text-sm ${trends.trendReceita >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{trends.trendReceita >= 0 ? '+' : ''}{trends.trendReceita.toFixed(1)}%</span>
        </Card>

        <Card decoration="top" decorationColor="amber" className="bg-white shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-amber-600" /><Text className="text-slate-500">Manutenção</Text></div>
            {trends.trendManutencao <= 0 ? <TrendingDown className="w-4 h-4 text-emerald-600" /> : <TrendingUp className="w-4 h-4 text-red-600" />}
          </div>
          <Metric>{fmtCompact(scorecard.financeiro.custoManutencao)}</Metric>
          <span className={`text-sm ${trends.trendManutencao <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{trends.trendManutencao >= 0 ? '+' : ''}{trends.trendManutencao.toFixed(1)}%</span>
        </Card>

        <Card decoration="top" decorationColor="violet" className="bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-violet-600" /><Text className="text-slate-500">Clientes</Text></div>
          <Metric>{scorecard.clientes.ativos}</Metric>
          <span className="text-sm text-violet-600">{scorecard.clientes.contratosAtivos} contratos</span>
        </Card>

        <Card decoration="top" decorationColor="pink" className="bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-2"><Tag className="w-4 h-4 text-pink-600" /><Text className="text-slate-500">Pipeline</Text></div>
          <Metric>{fmtCompact(scorecard.comercial.valorPipeline)}</Metric>
          <span className="text-sm text-pink-600">{scorecard.comercial.propostasAbertas} propostas</span>
        </Card>

        <Card decoration="top" decorationColor="rose" className="bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-rose-600" /><Text className="text-slate-500">Inadimplência</Text></div>
          <Metric className="text-red-600">{fmtCompact(scorecard.financeiro.totalVencido)}</Metric>
          <span className="text-sm text-slate-500">de {fmtCompact(scorecard.financeiro.saldoDevedor)} total</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white shadow-sm">
          <Title className="text-slate-900">Evolução da Receita (12 meses)</Title>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={receitaEvolution}>
                <defs><linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={fmtCompact} />
                <Tooltip formatter={(v: any) => [fmtCompact(Number(v)), 'Receita']} />
                <Area type="monotone" dataKey="Receita" stroke="#3b82f6" fill="url(#colorReceita)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        {alertas.length > 0 ? (
          <Card className="bg-white shadow-sm border-l-4 border-l-red-500">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div><Title>Alertas Críticos</Title><Text>Atenção imediata</Text></div>
            </div>
            <div className="space-y-3">
              {alertas.map((alerta, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${alerta.gravidade === 'alta' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <Text className={`font-semibold ${alerta.gravidade === 'alta' ? 'text-red-700' : 'text-amber-700'}`}>{alerta.titulo}</Text>
                  <Text className="text-slate-600 text-sm">{alerta.valor}</Text>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="bg-white shadow-sm">
            <Title className="text-slate-900">Distribuição da Frota</Title>
            <div className="h-52 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={frotaDistribuicao} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {frotaDistribuicao.map((_, idx) => (<Cell key={idx} fill={COLORS[idx % COLORS.length]} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm">
          <Title>Distribuição da Frota por Status</Title>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={frotaDistribuicao} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                  {frotaDistribuicao.map((_, idx) => (<Cell key={idx} fill={COLORS[idx % COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white shadow-sm">
          <Title>Top 5 Clientes por Receita</Title>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClientes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" fontSize={12} tickFormatter={fmtCompact}/>
                <YAxis dataKey="name" type="category" width={120} fontSize={11} tick={{fill: '#475569'}}/>
                <Tooltip formatter={(v: any) => fmtCompact(v)}/>
                <Bar dataKey="value" fill="#3b82f6" radius={[0,4,4,0]} barSize={18}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
