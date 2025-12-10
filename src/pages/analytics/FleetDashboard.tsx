import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Car, AlertTriangle, Activity, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseNum(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  if (typeof v === 'string') {
    const s = v.replace(/[R$\s.]/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  return 0;
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

// --- COMPONENTE PRINCIPAL ---
export default function FleetDashboard(): JSX.Element {
  // *** MIGRAÇÃO: Usa dim_frota.json ***
  const { data: frotaData } = useBIData<AnyObject[]>('dim_frota.json');

  const frota = useMemo(() => {
    const raw = (frotaData as any)?.data || frotaData || [];
    return Array.isArray(raw) ? raw : [];
  }, [frotaData]);

  // *** ESTADO DE FILTROS INTERATIVOS (PowerBI Style) ***
  const [filterState, setFilterState] = useState<{ status: string | null; modelo: string | null; ageRange: string | null; }>({ status: null, modelo: null, ageRange: null });

  const [page, setPage] = useState(1);
  const pageSize = 10;

  // *** DADOS FILTRADOS (Derivados do filterState) ***
  const filteredData = useMemo(() => {
    return frota.filter(r => {
      if (filterState.status && r.Status !== filterState.status) return false;
      if (filterState.modelo && r.Modelo !== filterState.modelo) return false;
      if (filterState.ageRange) {
        const age = parseNum(r.IdadeVeiculo || r.IdadeMeses);
        if (filterState.ageRange === '0-12' && age > 12) return false;
        if (filterState.ageRange === '13-24' && (age <= 12 || age > 24)) return false;
        if (filterState.ageRange === '25-36' && (age <= 24 || age > 36)) return false;
        if (filterState.ageRange === '37-48' && (age <= 36 || age > 48)) return false;
        if (filterState.ageRange === '48+' && age <= 48) return false;
      }
      return true;
    });
  }, [frota, filterState]);

  const hasActiveFilters = useMemo(() => !!(filterState.status || filterState.modelo || filterState.ageRange), [filterState]);

  const clearFilters = () => { setFilterState({ status: null, modelo: null, ageRange: null }); setPage(1); };

  // *** KPIs (Baseados em filteredData) ***
  const kpis = useMemo(() => {
    const total = filteredData.length;
    const patrimonioFipe = filteredData.reduce((s, r) => s + parseCurrency(r.ValorFipeAtual || r.FipeAtual), 0);
    const custoAquisicao = filteredData.reduce((s, r) => s + parseCurrency(r.ValorCompra || r.CustoAquisicao), 0);
    const idadeMedia = total > 0 ? filteredData.reduce((s, r) => s + parseNum(r.IdadeVeiculo || r.IdadeMeses), 0) / total : 0;
    const ociosos = filteredData.filter(r => r.Status !== 'Locado' && r.Status !== 'Em OperaÃ§Ã£o').length;
    const percOciosidade = total > 0 ? (ociosos / total) * 100 : 0;
    const custoTotal = custoAquisicao;
    const mercadoTotal = patrimonioFipe;
    const diff = mercadoTotal - custoTotal;
    return { total, patrimonioFipe, custoAquisicao, idadeMedia, percOciosidade, custoTotal, mercadoTotal, mercadoDiff: diff };
  }, [filteredData]);

  // Donut: Status
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => { const s = r.Status || r.Situacao || 'Indefinido'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Top modelos
  const modelosData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => { const m = r.Modelo || 'Outros'; map[m] = (map[m] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredData]);

  // Age histogram
  const ageData = useMemo(() => {
    const ranges = { '0-12': 0, '13-24': 0, '25-36': 0, '37-48': 0, '48+': 0 };
    filteredData.forEach(r => { const age = parseNum(r.IdadeVeiculo || r.IdadeMeses); if (age <= 12) ranges['0-12']++; else if (age <= 24) ranges['13-24']++; else if (age <= 36) ranges['25-36']++; else if (age <= 48) ranges['37-48']++; else ranges['48+']++; });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Table
  const tableData = useMemo(() => {
    return filteredData.map(r => {
      const compra = parseCurrency(r.ValorCompra || r.CustoAquisicao);
      const fipeAtual = parseCurrency(r.ValorFipeAtual || r.FipeAtual);
      const variacao = compra > 0 && fipeAtual > 0 ? ((fipeAtual - compra) / compra) * 100 : 0;
      const valorizacao = fipeAtual - compra;
      return { placa: r.Placa, modelo: r.Modelo, status: r.Status || r.Situacao, valorCompra: compra, fipeAtual, variacao, valorizacao, idade: parseNum(r.IdadeVeiculo || r.IdadeMeses) };
    });
  }, [filteredData]);

  const pageItems = useMemo(() => tableData.slice((page - 1) * pageSize, page * pageSize), [tableData, page]);
  const totalPages = Math.max(1, Math.ceil(tableData.length / pageSize));

  // Insights
  const insights = useMemo(() => {
    const alerts: any[] = [];
    const oldVehicles = filteredData.filter(r => parseNum(r.IdadeVeiculo || r.IdadeMeses) > 48).length;
    if (oldVehicles > 0) alerts.push({ type: 'warning', title: 'Frota Envelhecida', msg: `${oldVehicles} veículos têm mais de 48 meses. Considere renovação.` });
    if (kpis.percOciosidade > 10) alerts.push({ type: 'danger', title: 'Alta Ociosidade', msg: `A taxa de ociosidade está em ${kpis.percOciosidade.toFixed(1)}%, acima do limite de 10%.` });
    const depreciatedCount = tableData.filter(t => t.variacao < -20).length; if (depreciatedCount > 0) alerts.push({ type: 'warning', title: 'Depreciação Acentuada', msg: `${depreciatedCount} veículos depreciaram mais de 20% em relação ao custo de aquisição.` });
    return alerts;
  }, [filteredData, kpis, tableData]);

  const handleStatusClick = (data: any) => { setFilterState(prev => ({ ...prev, status: prev.status === data.name ? null : data.name })); setPage(1); };
  const handleModeloClick = (data: any) => { setFilterState(prev => ({ ...prev, modelo: prev.modelo === data.name ? null : data.name })); setPage(1); };
  const handleAgeClick = (data: any) => { setFilterState(prev => ({ ...prev, ageRange: prev.ageRange === data.name ? null : data.name })); setPage(1); };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Fleet Management Dashboard</Title>
          <Text className="mt-1 text-slate-500">Análise completa da frota com interatividade total. Clique nos gráficos para filtrar.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"><Car className="w-4 h-4" /> Hub de Ativos</div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="fixed bottom-8 right-8 z-50">
          <button onClick={clearFilters} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all hover:scale-105"><X className="w-5 h-5" /> Limpar Filtros</button>
        </div>
      )}

      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-lg border flex items-start gap-3 ${alert.type === 'danger' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              {alert.type === 'danger' ? <Activity className="w-5 h-5 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
              <div><h4 className="font-semibold text-sm">{alert.title}</h4><p className="text-xs opacity-90 mt-1">{alert.msg}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card decoration="top" decorationColor="emerald" className="bg-white border border-slate-200 shadow-sm"><Text className="text-slate-500">Patrimônio Total (FIPE)</Text><Metric className="text-slate-900">{fmtCompact(kpis.patrimonioFipe)}</Metric><Text className="text-xs text-slate-400 mt-1">{kpis.total} veículos</Text></Card>
        <Card decoration="top" decorationColor="blue" className="bg-white border border-slate-200 shadow-sm"><Text className="text-slate-500">Custo Aquisição</Text><Metric className="text-slate-900">{fmtCompact(kpis.custoAquisicao)}</Metric><Text className="text-xs text-slate-400 mt-1">Total investido</Text></Card>
        <Card decoration="top" decorationColor="amber" className="bg-white border border-slate-200 shadow-sm"><Text className="text-slate-500">Idade Média</Text><Metric className="text-slate-900">{kpis.idadeMedia.toFixed(1)} meses</Metric><Text className="text-xs text-slate-400 mt-1">Idade da frota</Text></Card>
        <Card decoration="top" decorationColor="rose" className="bg-white border border-slate-200 shadow-sm"><Text className="text-slate-500">% Ociosidade</Text><Metric className="text-slate-900">{kpis.percOciosidade.toFixed(1)}%</Metric><Text className="text-xs text-slate-400 mt-1">Não locados</Text></Card>
        <Card decoration="top" decorationColor="slate" className="bg-white border border-slate-200 shadow-sm"><Text className="text-slate-500">Custo vs Mercado</Text><Metric className="text-slate-900">{fmtCompact(kpis.custoTotal)} / {fmtCompact(kpis.mercadoTotal)}</Metric><Text className="text-xs text-slate-400 mt-1">Diferença: {fmtBRL(kpis.mercadoDiff)}</Text></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"><Title className="text-slate-900">Status da Frota</Title><Text className="text-slate-500 text-sm mb-4">{filterState.status ? `Filtrado: ${filterState.status}` : 'Clique para filtrar'}</Text><DonutChart data={statusData} category="value" index="name" colors={['emerald','amber','rose','slate','blue']} className="h-60" onVolumeChange={(v: any) => v && handleStatusClick(v)} /></Card>

        <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow"><Title className="text-slate-900">Distribuição por Idade</Title><Text className="text-slate-500 text-sm mb-4">{filterState.ageRange ? `Filtrado: ${filterState.ageRange} meses` : 'Clique nas barras para filtrar'}</Text><div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={ageData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" /><YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" /><Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} /><Bar dataKey="value" radius={[4,4,0,0]} onClick={(data) => handleAgeClick(data)}>{ageData.map((entry, index) => (<Cell key={`cell-${index}`} fill={filterState.ageRange === entry.name ? '#ef4444' : '#10b981'} cursor="pointer" />))}</Bar></BarChart></ResponsiveContainer></div></Card>

        <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow"><Title className="text-slate-900">Top 10 Modelos</Title><Text className="text-slate-500 text-sm mb-4">{filterState.modelo ? `Filtrado: ${filterState.modelo}` : 'Clique para filtrar'}</Text><div className="mt-4 space-y-2">{modelosData.map((item, idx) => (<div key={idx} className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${filterState.modelo === item.name ? 'bg-emerald-100 border-l-4 border-emerald-500' : 'hover:bg-slate-50'}`} onClick={() => handleModeloClick(item)}><Text className="text-slate-700 text-sm font-medium truncate">{item.name}</Text><Text className="text-slate-900 font-bold ml-2">{item.value}</Text></div>))}</div></Card>
      </div>

      <Card className="bg-white shadow-sm border border-slate-200">
        <Title className="text-slate-900 mb-4">Detalhamento da Frota (Compra vs FIPE Atual)</Title>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Placa</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Valor Compra</th>
                <th className="px-4 py-3 font-medium text-right">FIPE Atual</th>
                <th className="px-4 py-3 font-medium text-right">Valorização</th>
                <th className="px-4 py-3 font-medium text-right">Variação %</th>
                <th className="px-4 py-3 font-medium text-right">Idade (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((r, i) => (
                <tr key={`frota-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.placa}</td>
                  <td className="px-4 py-3 text-slate-600">{r.modelo}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'Locado' || r.status === 'Em Operação' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmtBRL(r.valorCompra)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmtBRL(r.fipeAtual)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${r.valorizacao >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{r.valorizacao >= 0 ? '+' : ''}{fmtBRL(r.valorizacao)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${r.variacao >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{r.variacao >= 0 ? '+' : ''}{r.variacao.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.idade}</td>
                </tr>
              ))}
              {pageItems.length === 0 && (<tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Nenhum veículo encontrado com os filtros selecionados.</td></tr>)}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, tableData.length)} de {tableData.length}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors">Anterior</button>
            <Text className="text-slate-600">Página {page} / {totalPages}</Text>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors">Próximo</button>
          </div>
        </div>
      </Card>
    </div>
  );

}
