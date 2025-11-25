import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, PieChart, Pie, Cell } from 'recharts';

type AnyObject = { [k: string]: any };

function fmtBRL(v: number) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  } catch (e) {
    return String(v);
  }
}

export default function FleetDashboard(): JSX.Element {
  const { data, loading, error } = useBIData<AnyObject[]>('frota.json');

  // normalize payload shapes
  const vehicles: AnyObject[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data as AnyObject[];
    if ((data as any).veiculos && Array.isArray((data as any).veiculos)) return (data as any).veiculos;
    if ((data as any).data && Array.isArray((data as any).data)) return (data as any).data;
    const keys = Object.keys(data as any);
    for (const k of keys) {
      if (Array.isArray((data as any)[k])) return (data as any)[k];
    }
    return [];
  }, [data]);

  // Filters
  const filiais = useMemo(() => Array.from(new Set(vehicles.map((v) => v.Filial).filter(Boolean))), [vehicles]);
  const situacoes = useMemo(() => Array.from(new Set(vehicles.map((v) => v.SituacaoVeiculo).filter(Boolean))), [vehicles]);
  const [selectedFiliais, setSelectedFiliais] = useState<string[]>([]);
  const [selectedSituacoes, setSelectedSituacoes] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let base = vehicles;
    if (selectedFiliais.length > 0) base = base.filter((v) => selectedFiliais.includes(String(v.Filial)));
    if (selectedSituacoes.length > 0) base = base.filter((v) => selectedSituacoes.includes(String(v.SituacaoVeiculo)));
    return base;
  }, [vehicles, selectedFiliais, selectedSituacoes]);

  // KPIs
  const totalVehicles = filtered.length;
  const totalFipe = useMemo(() => filtered.reduce((s, v) => s + (Number(v.ValorFipe) || 0), 0), [filtered]);
  const avgAge = useMemo(() => {
    if (!filtered || filtered.length === 0) return 0;
    const sum = filtered.reduce((s, v) => s + (Number(v.IdadeMeses) || 0), 0);
    return sum / filtered.length;
  }, [filtered]);
  const avgKM = useMemo(() => {
    if (!filtered || filtered.length === 0) return 0;
    const sum = filtered.reduce((s, v) => s + (Number(v.KM) || 0), 0);
    return sum / filtered.length;
  }, [filtered]);

  // Donut: distribution by Situacao
  const situacaoData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((v) => { const s = v.SituacaoVeiculo || 'Unknown'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Top 5 montadoras
  const topMontadoras = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((v) => { const m = v.Montadora || 'N/A'; map[m] = (map[m] || 0) + 1; });
    return Object.entries(map).map(([montadora, count]) => ({ name: montadora, value: count })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filtered]);

  // Histograms
  const ageHistogram = useMemo(() => {
    const ranges = [ { key: '0-12m', min:0, max:12 }, { key: '12-24m', min:12, max:24 }, { key: '24-36m', min:24, max:36 }, { key: '+36m', min:36, max: Infinity } ];
    const map = ranges.map(r => ({ faixa: r.key, count: 0 }));
    filtered.forEach((v) => {
      const m = Number(v.IdadeMeses) || 0;
      for (let i=0;i<ranges.length;i++){
        if (m >= ranges[i].min && m < ranges[i].max) { map[i].count += 1; break; }
      }
    });
    return map;
  }, [filtered]);

  const kmHistogram = useMemo(() => {
    const ranges = [ { key:'0-20k', min:0, max:20000 }, { key:'20k-40k', min:20000, max:40000 }, { key:'40k-60k', min:40000, max:60000 }, { key:'+60k', min:60000, max: Infinity } ];
    const map = ranges.map(r => ({ faixa: r.key, count: 0 }));
    filtered.forEach((v) => {
      const km = Number(v.KM) || 0;
      for (let i=0;i<ranges.length;i++){
        if (km >= ranges[i].min && km < ranges[i].max) { map[i].count += 1; break; }
      }
    });
    return map;
  }, [filtered]);

  // Table pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const tableData = filtered.map((v) => ({
    Placa: v.Placa || '', Modelo: v.Modelo || '', Filial: v.Filial || '', Situacao: v.SituacaoVeiculo || '', KM: Number(v.KM) || 0, IdadeMeses: Number(v.IdadeMeses) || 0, ValorFipe: Number(v.ValorFipe) || 0
  }));
  const totalPages = Math.max(1, Math.ceil(tableData.length / pageSize));
  const pageItems = tableData.slice((page-1)*pageSize, page*pageSize);

  if (loading) return (<div className="bg-slate-50 min-h-screen p-6"><Title>Frota - Dashboard</Title><Card><Text>Carregando...</Text></Card></div>);
  if (error) return (<div className="bg-slate-50 min-h-screen p-6"><Title>Frota - Dashboard</Title><Card><Text style={{ color: 'red' }}>{String(error)}</Text></Card></div>);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div>
        <Title>Frota - Ativa</Title>
        <Text className="mt-1">Visão da frota por filial, status e métricas principais.</Text>
      </div>

      {/* Filters */}
      <Card>
        <Text>Filtros</Text>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Text>Filial</Text>
            <select multiple size={3} className="border rounded p-2 w-full" value={selectedFiliais} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedFiliais(opts); setPage(1); }}>
              {filiais.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div>
            <Text>Situação</Text>
            <select multiple size={3} className="border rounded p-2 w-full" value={selectedSituacoes} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedSituacoes(opts); setPage(1); }}>
              {situacoes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <Text>&nbsp;</Text>
            <div className="flex items-center gap-2">
              <button onClick={() => { setSelectedFiliais([]); setSelectedSituacoes([]); setPage(1); }} className="bg-gray-200 px-3 py-1 rounded">Limpar</button>
              <div>
                <Text>Total</Text>
                <Metric>{totalVehicles}</Metric>
              </div>
            </div>
          </div>

          <div>
            <Text>&nbsp;</Text>
            <div className="text-sm text-gray-500">Use filtros para refinar a frota mostrada.</div>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <Text>Total de Veículos</Text>
          <Metric>{totalVehicles}</Metric>
        </Card>
        <Card>
          <Text>Valor Total FIPE</Text>
          <Metric>{fmtBRL(totalFipe)}</Metric>
        </Card>
        <Card>
          <Text>Idade Média (meses)</Text>
          <Metric>{Math.round(avgAge)}</Metric>
        </Card>
        <Card>
          <Text>KM Médio</Text>
          <Metric>{Math.round(avgKM).toLocaleString('pt-BR')}</Metric>
        </Card>
      </div>

      {/* Charts line 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Text>Distribuição por Situação</Text>
          <div className="mt-4 flex items-center">
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={situacaoData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {situacaoData.map((_, idx) => (
                      <Cell key={idx} fill={["#10b981", "#3b82f6", "#f97316", "#ef4444"][idx % 4]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => String(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="ml-4 text-sm text-gray-600">
              {situacaoData.map((d) => (
                <div key={d.name} className="mb-2">{d.name}: {d.value}</div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <Text>Top 5 Montadoras</Text>
          <div className="mt-4">
            <BarList data={topMontadoras.map((m) => ({ name: m.name, value: m.value }))} />
          </div>
        </Card>

        <Card>
          <Text>Resumo Rápido</Text>
          <div className="mt-4 text-sm text-gray-600">
            <div>Total FIPE: {fmtBRL(totalFipe)}</div>
            <div>KM Médio: {Math.round(avgKM).toLocaleString('pt-BR')}</div>
            <div>Idade Média: {Math.round(avgAge)} meses</div>
          </div>
        </Card>
      </div>

      {/* Charts line 2 - histograms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="h-72">
          <Text>Histograma de Idade (meses)</Text>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageHistogram}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="faixa" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#06b6d4"><LabelList dataKey="count" position="top" /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="h-72">
          <Text>Histograma de KM</Text>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kmHistogram}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="faixa" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6"><LabelList dataKey="count" position="top" /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Table detalhada */}
      <Card>
        <Text>Detalhes da Frota</Text>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="text-left p-2">Placa</th>
                <th className="text-left p-2">Modelo</th>
                <th className="text-left p-2">Filial</th>
                <th className="text-left p-2">Situação</th>
                <th className="text-right p-2">KM</th>
                <th className="text-right p-2">Idade (m)</th>
                <th className="text-right p-2">Valor FIPE</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r, idx) => (
                <tr key={`veh-${idx}`} className="border-t">
                  <td className="p-2">{r.Placa || '-'}</td>
                  <td className="p-2">{r.Modelo || '-'}</td>
                  <td className="p-2">{r.Filial || '-'}</td>
                  <td className="p-2">
                    {String(r.Situacao || '').toLowerCase().includes('disp') ? (
                      <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-1 rounded">{r.Situacao}</span>
                    ) : String(r.Situacao || '').toLowerCase().includes('manut') ? (
                      <span className="inline-block bg-red-100 text-red-700 px-2 py-1 rounded">{r.Situacao}</span>
                    ) : String(r.Situacao || '').toLowerCase().includes('locad') ? (
                      <span className="inline-block bg-amber-100 text-amber-700 px-2 py-1 rounded">{r.Situacao}</span>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded">{r.Situacao}</span>
                    )}
                  </td>
                  <td className="p-2 text-right">{r.KM.toLocaleString('pt-BR')}</td>
                  <td className="p-2 text-right">{r.IdadeMeses}</td>
                  <td className="p-2 text-right">{fmtBRL(r.ValorFipe)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination footer */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">Mostrando {(page-1)*pageSize+1} - {Math.min(page*pageSize, tableData.length)} de {tableData.length}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Anterior</button>
              <Text>Página {page} / {totalPages}</Text>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Próximo</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
import { useMemo } from 'react';
import { Card, Title, Text, Metric, BarChart } from '@tremor/react';
import useBIData from '@/hooks/useBIData';

type AnyObject = { [k: string]: any };

export default function FleetDashboard() {
  const { data, metadata, loading, error } = useBIData<any[]>('frota.json');

  // normalize vehicles array from different payload shapes
  const vehicles: AnyObject[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data as AnyObject[];
    // If payload is object with a 'veiculos' key
    if ((data as any).veiculos && Array.isArray((data as any).veiculos)) return (data as any).veiculos;
    // If payload contains nested 'data'
    if ((data as any).data && Array.isArray((data as any).data)) return (data as any).data;
    // fallback: try to find first array property
    const keys = Object.keys(data as any);
    for (const k of keys) {
      if (Array.isArray((data as any)[k])) return (data as any)[k];
    }
    return [];
  }, [data]);

  const total = vehicles.length;

  // detect category key
  const categoryKey = useMemo(() => {
    const preferred = ['modelo', 'marca', 'status', 'model', 'brand'];
    if (!vehicles || vehicles.length === 0) return null;
    const first = vehicles[0];
    const found = preferred.find((p) => p in first) || Object.keys(first).find((k) => typeof first[k] === 'string') || null;
    return found;
  }, [vehicles]);

  const chartData = useMemo(() => {
    if (!categoryKey) return [] as AnyObject[];
    const map: Record<string, number> = {};
    vehicles.forEach((v) => {
      const k = v[categoryKey] ?? 'Unknown';
      map[String(k)] = (map[String(k)] || 0) + 1;
    });
    return Object.entries(map).map(([category, count]) => ({ category, count }));
  }, [vehicles, categoryKey]);

  return (
    <div style={{ padding: 16 }}>
      <Title>Frota - Dashboard</Title>

      <Card style={{ marginTop: 12 }}>
        <Text>Resumo</Text>
        {loading && <Text>Loading...</Text>}
        {error && <Text style={{ color: 'red' }}>{String(error)}</Text>}
        {!loading && !error && (
          <div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <Card>
                <Text>Total de Veículos</Text>
                <Metric>{total}</Metric>
              </Card>

              <div style={{ flex: 1 }}>
                {categoryKey ? (
                  <>
                    <Text>Distribuição por: {categoryKey}</Text>
                    <BarChart data={chartData} index="category" categories={["count"]} colors={["blue"]} valueFormatter={(v: number) => String(v)} />
                  </>
                ) : (
                  <Text>Coluna de categoria não detectada automaticamente. Verifique os dados.</Text>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
