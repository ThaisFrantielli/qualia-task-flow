import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, ComposedChart, Line, FunnelChart, Funnel, LabelList } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Users, Calendar, Filter, X, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
const parseCurrency = (v: any): number => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
const parseNum = (v: any): number => typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
const fmtBRL = (v: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtCompact = (v: number): string => v >= 1000000 ? `R$ ${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v.toFixed(0)}`;
const fmtDecimal = (v: number): string => new Intl.NumberFormat('pt-BR').format(v);
const getMonthKey = (d?: string): string => d ? d.split('T')[0].substring(0, 7) : '';
const monthLabel = (ym: string): string => { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; };

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];
const STATUS_COLORS: Record<string, string> = { 'Ganho': '#10b981', 'Perdido': '#ef4444', 'Em Andamento': '#3b82f6', 'Pendente': '#f59e0b' };

const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export default function CommercialDashboard(): JSX.Element {
  const { data: rawPropostas, loading } = useBIData<AnyObject[]>('fat_propostas_*.json');
  const { data: rawContratos } = useBIData<AnyObject[]>('dim_contratos.json');

  const propostas = useMemo(() => {
    const raw = (rawPropostas as any)?.data || rawPropostas || [];
    return Array.isArray(raw) ? raw : [];
  }, [rawPropostas]);

  const contratos = useMemo(() => {
    const raw = (rawContratos as any)?.data || rawContratos || [];
    return Array.isArray(raw) ? raw : [];
  }, [rawContratos]);

  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [filterState, setFilterState] = useState<{ vendedor: string | null; status: string | null; mes: string | null }>({ vendedor: null, status: null, mes: null });
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const hasActiveFilters = !!(filterState.vendedor || filterState.status || filterState.mes);
  const clearFilters = () => setFilterState({ vendedor: null, status: null, mes: null });

  const filteredPropostas = useMemo(() => {
    return propostas.filter(p => {
      const d = p.DataCriacao;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (filterState.vendedor && p.Vendedor !== filterState.vendedor) return false;
      if (filterState.status && p.Status !== filterState.status) return false;
      if (filterState.mes && getMonthKey(d) !== filterState.mes) return false;
      return true;
    });
  }, [propostas, dateFrom, dateTo, filterState]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredPropostas.length;
    const ganhas = filteredPropostas.filter(p => p.Status === 'Ganho' || p.Status === 'Fechado').length;
    const perdidas = filteredPropostas.filter(p => p.Status === 'Perdido').length;
    const emAndamento = filteredPropostas.filter(p => !['Ganho', 'Fechado', 'Perdido', 'Cancelado'].includes(p.Status)).length;
    const conversao = (ganhas + perdidas) > 0 ? (ganhas / (ganhas + perdidas)) * 100 : 0;
    const valorTotal = filteredPropostas.reduce((s, p) => s + parseCurrency(p.ValorProposta), 0);
    const valorGanho = filteredPropostas.filter(p => p.Status === 'Ganho' || p.Status === 'Fechado').reduce((s, p) => s + parseCurrency(p.ValorProposta), 0);
    const ticketMedio = ganhas > 0 ? valorGanho / ganhas : 0;
    const veiculosTotal = filteredPropostas.reduce((s, p) => s + parseNum(p.QuantidadeVeiculos), 0);

    return { total, ganhas, perdidas, emAndamento, conversao, valorTotal, valorGanho, ticketMedio, veiculosTotal };
  }, [filteredPropostas]);

  // Funil de Vendas
  const funnelData = useMemo(() => {
    const statusOrder = ['Prospecto', 'Qualificado', 'Proposta Enviada', 'Negociação', 'Ganho'];
    const map: Record<string, number> = {};
    filteredPropostas.forEach(p => {
      const s = p.Status || 'Outros';
      map[s] = (map[s] || 0) + 1;
    });
    return statusOrder.map((name, i) => ({ name, value: map[name] || 0, fill: COLORS[i % COLORS.length] })).filter(d => d.value > 0);
  }, [filteredPropostas]);

  // Por Vendedor
  const vendedorData = useMemo(() => {
    const map: Record<string, { total: number; ganhas: number; valor: number }> = {};
    filteredPropostas.forEach(p => {
      const v = p.Vendedor || 'N/D';
      if (!map[v]) map[v] = { total: 0, ganhas: 0, valor: 0 };
      map[v].total += 1;
      if (p.Status === 'Ganho' || p.Status === 'Fechado') {
        map[v].ganhas += 1;
        map[v].valor += parseCurrency(p.ValorProposta);
      }
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      total: v.total,
      ganhas: v.ganhas,
      valor: v.valor,
      conversao: v.total > 0 ? (v.ganhas / v.total) * 100 : 0
    })).sort((a, b) => b.valor - a.valor);
  }, [filteredPropostas]);

  // Por Status
  const statusData = useMemo(() => {
    const map: Record<string, { qtd: number; valor: number }> = {};
    filteredPropostas.forEach(p => {
      const s = p.Status || 'Outros';
      if (!map[s]) map[s] = { qtd: 0, valor: 0 };
      map[s].qtd += 1;
      map[s].valor += parseCurrency(p.ValorProposta);
    });
    return Object.entries(map).map(([name, v]) => ({ name, qtd: v.qtd, valor: v.valor, color: STATUS_COLORS[name] || '#64748b' })).sort((a, b) => b.qtd - a.qtd);
  }, [filteredPropostas]);

  // Motivos de Perda
  const motivosPerda = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPropostas.filter(p => p.Status === 'Perdido').forEach(p => {
      const m = p.MotivoPerda || 'Não Informado';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredPropostas]);

  // Evolução Mensal
  const monthlyData = useMemo(() => {
    const map: Record<string, { criadas: number; ganhas: number; valor: number }> = {};
    filteredPropostas.forEach(p => {
      const k = getMonthKey(p.DataCriacao);
      if (!k) return;
      if (!map[k]) map[k] = { criadas: 0, ganhas: 0, valor: 0 };
      map[k].criadas += 1;
      if (p.Status === 'Ganho' || p.Status === 'Fechado') {
        map[k].ganhas += 1;
        map[k].valor += parseCurrency(p.ValorProposta);
      }
    });
    return Object.keys(map).sort().map(k => ({ date: k, label: monthLabel(k), ...map[k] }));
  }, [filteredPropostas]);

  // Mobilização (contratos ativos por mês)
  const mobilizacaoData = useMemo(() => {
    const map: Record<string, number> = {};
    contratos.filter(c => c.Status === 'Ativo').forEach(c => {
      const k = getMonthKey(c.InicioContrato);
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).sort().slice(-12).map(k => ({ label: monthLabel(k), veiculos: map[k] }));
  }, [contratos]);

  const pageItems = useMemo(() => filteredPropostas.slice(page * pageSize, (page + 1) * pageSize), [filteredPropostas, page]);

  if (loading) return <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center"><div className="animate-pulse text-slate-500">Carregando dados comerciais...</div></div>;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Dashboard Comercial</Title><Text className="text-slate-500">Pipeline, conversão e performance de vendas</Text></div>
        <div className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full flex gap-2 font-medium text-sm"><Target className="w-4 h-4" /> Vendas</div>
      </div>

      {hasActiveFilters && (
        <>
          <Card className="bg-blue-50 border-blue-200 py-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <Text className="font-medium text-blue-700">Filtros:</Text>
              {filterState.vendedor && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Vendedor: {filterState.vendedor}</span>}
              {filterState.status && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Status: {filterState.status}</span>}
              {filterState.mes && <span className="bg-blue-100 px-2 py-1 rounded text-xs text-blue-800">Mês: {monthLabel(filterState.mes)}</span>}
            </div>
          </Card>
          <div className="fixed bottom-8 right-8 z-50">
            <button onClick={clearFilters} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2"><X className="w-5 h-5" /> Limpar</button>
          </div>
        </>
      )}

      {/* Filtros Globais */}
      <Card className="bg-white shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><Text className="text-xs text-slate-500 mb-1">Período</Text><div className="flex gap-2"><input type="date" className="border p-2 rounded w-full text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /><input type="date" className="border p-2 rounded w-full text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div></div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card decoration="top" decorationColor="blue"><Text>Propostas</Text><Metric>{fmtDecimal(kpis.total)}</Metric><span className="text-xs text-slate-500">{kpis.emAndamento} em andamento</span></Card>
        <Card decoration="top" decorationColor="emerald"><Text>Conversão</Text><Metric>{kpis.conversao.toFixed(1)}%</Metric><span className="text-xs text-emerald-600">{kpis.ganhas} ganhas</span></Card>
        <Card decoration="top" decorationColor="violet"><Text>Pipeline</Text><Metric>{fmtCompact(kpis.valorTotal)}</Metric></Card>
        <Card decoration="top" decorationColor="amber"><Text>Ticket Médio</Text><Metric>{fmtBRL(kpis.ticketMedio)}</Metric></Card>
        <Card decoration="top" decorationColor="cyan"><Text>Veículos Propostos</Text><Metric>{fmtDecimal(kpis.veiculosTotal)}</Metric></Card>
      </div>

      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="bg-slate-200 p-1">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="evolucao">Evolução</TabsTrigger>
          <TabsTrigger value="mobilizacao">Mobilização</TabsTrigger>
          <TabsTrigger value="detalhes">Detalhamento</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Funil de Vendas</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip formatter={(v: any) => [`${v} propostas`, '']} />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                      <LabelList position="right" fill="#374151" stroke="none" dataKey="name" fontSize={12} />
                      <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Distribuição por Status (clique para filtrar)</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="qtd" onClick={(d) => setFilterState(p => ({ ...p, status: p.status === d.name ? null : d.name }))} cursor="pointer">
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any, _n: any, p: any) => [`${v} (${fmtCompact(p.payload.valor)})`, p.payload.name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {kpis.perdidas > 0 && (
            <Card>
              <Title>Motivos de Perda</Title>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={motivosPerda} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="name" type="category" width={200} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vendedores" className="space-y-6 mt-6">
          <Card>
            <Title>Ranking de Vendedores (clique para filtrar)</Title>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                  <tr><th className="p-3">Vendedor</th><th className="p-3 text-center">Propostas</th><th className="p-3 text-center">Ganhas</th><th className="p-3 text-center">Conversão</th><th className="p-3 text-right">Valor Ganho</th></tr>
                </thead>
                <tbody>
                  {vendedorData.map((v, i) => (
                    <tr key={i} onClick={() => setFilterState(p => ({ ...p, vendedor: p.vendedor === v.name ? null : v.name }))} className={`border-t hover:bg-slate-50 cursor-pointer ${filterState.vendedor === v.name ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}>
                      <td className="p-3 font-medium flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" />{v.name}</td>
                      <td className="p-3 text-center">{v.total}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">{v.ganhas}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${v.conversao >= 30 ? 'bg-emerald-100 text-emerald-700' : v.conversao >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{v.conversao.toFixed(1)}%</span></td>
                      <td className="p-3 text-right font-bold text-violet-600">{fmtCompact(v.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="evolucao" className="space-y-6 mt-6">
          <Card>
            <Title>Evolução Mensal (clique para filtrar)</Title>
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} tickFormatter={fmtCompact} />
                  <Tooltip formatter={(v: any, n: any) => [n === 'valor' ? fmtBRL(v) : v, n === 'criadas' ? 'Criadas' : n === 'ganhas' ? 'Ganhas' : 'Valor Ganho']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="criadas" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Criadas" onClick={(d) => setFilterState(p => ({ ...p, mes: p.mes === d.date ? null : d.date }))} cursor="pointer" />
                  <Bar yAxisId="left" dataKey="ganhas" fill="#10b981" radius={[4, 4, 0, 0]} name="Ganhas" />
                  <Line yAxisId="right" type="monotone" dataKey="valor" stroke="#8b5cf6" strokeWidth={2} name="Valor Ganho" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="mobilizacao" className="space-y-6 mt-6">
          <Card>
            <div className="flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-cyan-600" /><Title>Mobilização de Veículos (Contratos Iniciados)</Title></div>
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mobilizacaoData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: any) => [`${v} veículos`, 'Mobilizados']} />
                  <Bar dataKey="veiculos" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="detalhes" className="space-y-6 mt-6">
          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div className="flex items-center gap-2"><Title>Todas as Propostas</Title><span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-bold">{fmtDecimal(filteredPropostas.length)}</span></div>
              <button onClick={() => exportToExcel(filteredPropostas, 'propostas')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 border px-3 py-1 rounded"><FileSpreadsheet size={16} /> Exportar</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-xs"><tr><th className="p-3">ID</th><th className="p-3">Cliente</th><th className="p-3">Vendedor</th><th className="p-3 text-center">Veículos</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Status</th><th className="p-3">Criação</th></tr></thead>
                <tbody>
                  {pageItems.map((p, i) => (
                    <tr key={i} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs">{p.IdProposta}</td>
                      <td className="p-3 font-medium">{p.Cliente}</td>
                      <td className="p-3">{p.Vendedor}</td>
                      <td className="p-3 text-center">{p.QuantidadeVeiculos}</td>
                      <td className="p-3 text-right font-bold text-violet-600">{fmtBRL(parseCurrency(p.ValorProposta))}</td>
                      <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${p.Status === 'Ganho' || p.Status === 'Fechado' ? 'bg-emerald-100 text-emerald-700' : p.Status === 'Perdido' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{p.Status}</span></td>
                      <td className="p-3 text-slate-500">{p.DataCriacao ? new Date(p.DataCriacao).toLocaleDateString('pt-BR') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between p-4 border-t"><div className="flex gap-2"><button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">←</button><span className="px-3 py-1 text-sm text-slate-600">Página {page + 1} de {Math.ceil(filteredPropostas.length / pageSize)}</span><button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= filteredPropostas.length} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">→</button></div></div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
