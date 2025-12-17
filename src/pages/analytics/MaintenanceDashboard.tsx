import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Wrench, Filter, X, Download } from 'lucide-react';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`; if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`; return `R$ ${v.toFixed(0)}`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

export default function MaintenanceDashboard(): JSX.Element {
  const { data: osData, loading } = useBIData<AnyObject[]>('fat_manutencao_os_*.json');
  const { data: rawFornecedores } = useBIData<AnyObject[]>('dim_fornecedores.json');

  const osList = useMemo(() => Array.isArray(osData) ? osData : [], [osData]);
  const fornecedores = useMemo(() => Array.isArray(rawFornecedores) ? rawFornecedores : [], [rawFornecedores]);

  const [activeTab, setActiveTab] = useState(0);
  const [filterState, setFilterState] = useState<{ mes: string | null; oficina: string | null; placa: string | null; tipo: string | null }>({ mes: null, oficina: null, placa: null, tipo: null });
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const hasActiveFilters = !!(filterState.mes || filterState.oficina || filterState.placa || filterState.tipo);
  const clearFilters = () => { setFilterState({ mes: null, oficina: null, placa: null, tipo: null }); setPage(0); };

  const filteredOS = useMemo(() => {
    return osList.filter((r: AnyObject) => {
      if (filterState.mes && getMonthKey(r.DataEntrada) !== filterState.mes) return false;
      if (filterState.oficina && r.Fornecedor !== filterState.oficina) return false;
      if (filterState.placa && r.Placa !== filterState.placa) return false;
      if (filterState.tipo && r.TipoManutencao !== filterState.tipo) return false;
      return true;
    });
  }, [osList, filterState]);

  const kpis = useMemo(() => {
    const totalCost = filteredOS.reduce((s, r) => s + parseCurrency(r.ValorTotal), 0);
    const count = filteredOS.length;
    const avgCost = count > 0 ? totalCost / count : 0;
    const days = filteredOS.reduce((s, r) => s + parseNum(r.DiasParado), 0);
    const avgDays = count > 0 ? days / count : 0;
    const totalKm = filteredOS.reduce((s, r) => s + parseNum(r.Km), 0);
    const cpk = totalKm > 0 ? totalCost / totalKm : 0;
    const stopped = filteredOS.filter(r => parseNum(r.DiasParado) > 0).length;

    return { totalCost, avgCost, avgDays, stopped, cpk, count };
  }, [filteredOS]);

  const monthlyData = useMemo(() => {
    const map: Record<string, { Valor: number; Count: number }> = {};
    filteredOS.forEach(r => {
      const k = getMonthKey(r.DataEntrada);
      if (!k) return;
      if (!map[k]) map[k] = { Valor: 0, Count: 0 };
      map[k].Valor += parseCurrency(r.ValorTotal);
      map[k].Count += 1;
    });
    return Object.keys(map).sort().slice(-24).map(k => ({ date: k, label: monthLabel(k), ...map[k] }));
  }, [filteredOS]);

  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOS.forEach(r => {
      const t = r.TipoManutencao || 'Outros';
      map[t] = (map[t] || 0) + parseCurrency(r.ValorTotal);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredOS]);

  const topOffenders = useMemo(() => {
    const map: Record<string, { valor: number; count: number }> = {};
    filteredOS.forEach(r => {
      const p = r.Placa || 'N/D';
      if (!map[p]) map[p] = { valor: 0, count: 0 };
      map[p].valor += parseCurrency(r.ValorTotal);
      map[p].count += 1;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [filteredOS]);

  const topFornecedores = useMemo(() => {
    const map: Record<string, { valor: number; count: number }> = {};
    filteredOS.forEach(r => {
      const f = r.Fornecedor || 'N/D';
      if (!map[f]) map[f] = { valor: 0, count: 0 };
      map[f].valor += parseCurrency(r.ValorTotal);
      map[f].count += 1;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [filteredOS]);

  const pageItems = useMemo(() => filteredOS.slice(page * pageSize, (page + 1) * pageSize), [filteredOS, page]);
  const totalPages = Math.ceil(filteredOS.length / pageSize);

  const exportCSV = () => {
    const headers = ['DataEntrada', 'Placa', 'Modelo', 'Fornecedor', 'TipoManutencao', 'ValorTotal', 'DiasParado', 'Km'];
    const rows = filteredOS.map(r => headers.map(h => r[h] || '').join(';'));
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'manutencao_os.csv';
    link.click();
  };

  const tabs = ['Visão Geral', 'Por Tipo', 'Fornecedores', 'Detalhamento'];

  if (loading) return <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center"><div className="animate-pulse text-slate-500">Carregando dados de manutenção...</div></div>;

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Gestão de Manutenção</Title><Text className="text-slate-500">Controle de custos, oficinas e eficiência</Text></div>
        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex gap-2 font-medium hover:bg-emerald-200 transition-all">
            <Download className="w-4 h-4"/> Exportar
          </button>
          <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Wrench className="w-4 h-4"/> Hub Operacional</div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="fixed bottom-8 right-8 z-50">
          <button onClick={clearFilters} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2"><X className="w-5 h-5" /> Limpar Filtros</button>
        </div>
      )}

      {hasActiveFilters && (
        <Card className="bg-amber-50 border-amber-200 py-3">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-amber-600" /><Text className="font-medium text-amber-700">Filtros:</Text>
            {filterState.mes && <span className="bg-amber-100 px-2 py-1 rounded text-xs text-amber-800">Mês: {monthLabel(filterState.mes)}</span>}
            {filterState.oficina && <span className="bg-amber-100 px-2 py-1 rounded text-xs text-amber-800">Oficina: {filterState.oficina}</span>}
            {filterState.placa && <span className="bg-amber-100 px-2 py-1 rounded text-xs text-amber-800">Placa: {filterState.placa}</span>}
            {filterState.tipo && <span className="bg-amber-100 px-2 py-1 rounded text-xs text-amber-800">Tipo: {filterState.tipo}</span>}
          </div>
        </Card>
      )}

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        {tabs.map((tab, idx) => (
          <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium transition-all ${activeTab === idx ? 'bg-white shadow text-amber-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card decoration="top" decorationColor="amber"><Text>Custo Total</Text><Metric>{fmtCompact(kpis.totalCost)}</Metric></Card>
            <Card decoration="top" decorationColor="blue"><Text>Ticket Médio</Text><Metric>{fmtBRL(kpis.avgCost)}</Metric></Card>
            <Card decoration="top" decorationColor="emerald"><Text>MTTR (dias)</Text><Metric>{kpis.avgDays.toFixed(1)}</Metric></Card>
            <Card decoration="top" decorationColor="violet"><Text>Custo/KM</Text><Metric>{fmtBRL(kpis.cpk)}</Metric></Card>
            <Card decoration="top" decorationColor="rose"><Text>Em Manutenção</Text><Metric>{kpis.stopped}</Metric></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Evolução de Custos (24 meses)</Title>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="label" fontSize={12}/>
                    <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact}/>
                    <YAxis yAxisId="right" orientation="right" fontSize={12}/>
                    <Tooltip formatter={(v: any, n) => [n === 'Valor' ? fmtBRL(v) : v, n]}/>
                    <Bar yAxisId="left" dataKey="Valor" fill="#f59e0b" radius={[4,4,0,0]} cursor="pointer" onClick={(d) => setFilterState(p => ({...p, mes: p.mes === d.date ? null : d.date}))}/>
                    <Line yAxisId="right" type="monotone" dataKey="Count" stroke="#3b82f6" strokeWidth={2}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Top Ofensores (Placa)</Title>
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {topOffenders.map((item, idx) => (
                  <div key={idx} onClick={() => setFilterState(p => ({...p, placa: p.placa === item.name ? null : item.name}))} className={`p-2 rounded cursor-pointer flex justify-between text-sm ${filterState.placa === item.name ? 'bg-amber-100 ring-1 ring-amber-500' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                      <span className="font-mono">{item.name}</span>
                      <span className="text-slate-400 text-xs">({item.count} OS)</span>
                    </div>
                    <span className="font-bold text-amber-600">{fmtCompact(item.valor)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Custo por Tipo de Manutenção</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" cursor="pointer" onClick={(d) => setFilterState(p => ({...p, tipo: p.tipo === d.name ? null : d.name}))}>
                      {typeData.map((_, i) => <Cell key={i} fill={['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'][i % 6]} />)}
                    </Pie>
                    <Tooltip formatter={fmtBRL}/>
                    <Legend/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Distribuição por Tipo</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                    <XAxis type="number" fontSize={12} tickFormatter={fmtCompact}/>
                    <YAxis dataKey="name" type="category" width={120} fontSize={11}/>
                    <Tooltip formatter={fmtBRL}/>
                    <Bar dataKey="value" fill="#f59e0b" radius={[0,4,4,0]} barSize={18} cursor="pointer" onClick={(_: any, d: any) => setFilterState(p => ({...p, tipo: p.tipo === d.name ? null : d.name}))}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-6">
          <Card>
            <Title>Top 10 Fornecedores por Valor</Title>
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFornecedores} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                  <XAxis type="number" fontSize={12} tickFormatter={fmtCompact}/>
                  <YAxis dataKey="name" type="category" width={180} fontSize={11}/>
                  <Tooltip formatter={(v: any, n) => [n === 'valor' ? fmtBRL(v) : v, n === 'valor' ? 'Valor Total' : 'Qtd OS']}/>
                  <Bar dataKey="valor" fill="#f59e0b" radius={[0,4,4,0]} barSize={18} cursor="pointer" onClick={(_: any, d: any) => setFilterState(p => ({...p, oficina: p.oficina === d.name ? null : d.name}))}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {fornecedores.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fornecedores.slice(0, 6).map((f, idx) => (
                <Card key={idx} className="cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterState(p => ({...p, oficina: p.oficina === f.Nome ? null : f.Nome}))}>
                  <Text className="font-medium truncate">{f.NomeFantasia || f.Nome}</Text>
                  <div className="flex items-center gap-4 mt-2">
                    <Metric className="text-amber-600">{f.TotalOS || 0}</Metric>
                    <Text className="text-slate-500">ordens de serviço</Text>
                  </div>
                  <Text className="text-sm text-slate-400 mt-1">Lead time médio: {f.LeadTimeMedio || 0} dias</Text>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 3 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <Title>Detalhamento de OS</Title>
            <Text className="text-slate-500">{filteredOS.length} registros</Text>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="p-3">Data</th>
                  <th className="p-3">Placa</th>
                  <th className="p-3">Modelo</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3 text-right">Dias</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r, idx) => (
                  <tr key={idx} className="border-t hover:bg-slate-50">
                    <td className="p-3">{r.DataEntrada ? new Date(r.DataEntrada).toLocaleDateString('pt-BR') : '-'}</td>
                    <td className="p-3 font-mono cursor-pointer hover:text-amber-600" onClick={() => setFilterState(p => ({...p, placa: p.placa === r.Placa ? null : r.Placa}))}>{r.Placa}</td>
                    <td className="p-3 truncate max-w-[120px]">{r.Modelo || '-'}</td>
                    <td className="p-3 truncate max-w-[150px] cursor-pointer hover:text-amber-600" onClick={() => setFilterState(p => ({...p, oficina: p.oficina === r.Fornecedor ? null : r.Fornecedor}))}>{r.Fornecedor || '-'}</td>
                    <td className="p-3 truncate max-w-[100px]">{r.TipoManutencao || '-'}</td>
                    <td className="p-3 text-right">{parseNum(r.DiasParado)}</td>
                    <td className="p-3 text-right font-bold text-amber-600">{fmtBRL(parseCurrency(r.ValorTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Text className="text-slate-500">Página {page + 1} de {totalPages}</Text>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50">Anterior</button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50">Próxima</button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}