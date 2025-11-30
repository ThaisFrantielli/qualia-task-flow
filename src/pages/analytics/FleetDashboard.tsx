import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, PieChart, Pie, Cell } from 'recharts';
import { Car, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

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

  // Classify fleet by vehicle status into: produtiva, improdutiva, inativa
  type FleetCategory = 'produtiva' | 'improdutiva' | 'inativa';

  function classifySituacao(s?: string | null): FleetCategory {
    const st = String(s || '').toLowerCase();
    // inativa: vendido, baixa, inativo, retirado
    if (/vend|baixa|inativ|retir|cancel|baixado/.test(st)) return 'inativa';
    // improdutiva: manutenção, mobilização, avaria, parado
    if (/manut|mobil|avaria|reparo|parad|aguard|improd/.test(st)) return 'improdutiva';
    // produtiva: disponível, locado, alugado, ativo, operando
    if (/dispon|locad|alug|ativo|operac|venda|locaça|locaç|locado/.test(st)) return 'produtiva';
    // fallback: treat as improdutiva to be conservative
    return 'improdutiva';
  }

  const fleetByCategory = useMemo(() => {
    const base = { produtiva: { count: 0, totalFipe: 0 }, improdutiva: { count: 0, totalFipe: 0 }, inativa: { count: 0, totalFipe: 0 } } as Record<FleetCategory, { count: number; totalFipe: number }>;
    filtered.forEach((v) => {
      const cat = classifySituacao(v.SituacaoVeiculo);
      base[cat].count += 1;
      base[cat].totalFipe += Number(v.ValorFipe) || 0;
    });
    return base;
  }, [filtered]);

  const fleetCategoryData = useMemo(() => {
    return (
      Object.entries(fleetByCategory).map(([k, v]) => ({ name: k, value: v.count, totalFipe: v.totalFipe }))
    );
  }, [fleetByCategory]);

  const fleetPieData = useMemo(() => {
    const labelMap: Record<string, string> = { produtiva: 'Produtiva', improdutiva: 'Improdutiva', inativa: 'Inativa' };
    const total = fleetCategoryData.reduce((s, x) => s + (x.value || 0), 0) || 1;
    return fleetCategoryData.map((d) => ({
      key: d.name,
      name: labelMap[d.name] ?? d.name,
      value: d.value,
      pct: Math.round(((d.value || 0) / total) * 100),
      avgFipe: d.value ? (d.totalFipe / d.value) : 0,
    }));
  }, [fleetCategoryData]);

  // Age histogram
  const ageHistogram = useMemo(() => {
    const ranges = [
      { key: '0-12m', min: 0, max: 12 },
      { key: '12-24m', min: 12, max: 24 },
      { key: '24-36m', min: 24, max: 36 },
      { key: '36-48m', min: 36, max: 48 },
      { key: '+48m', min: 48, max: Infinity },
    ];
    const map = ranges.map((r) => ({ faixa: r.key, count: 0 }));
    filtered.forEach((v) => {
      const age = Number(v.IdadeMeses) || 0;
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (age >= r.min && age < r.max) {
          map[i].count += 1;
          break;
        }
      }
    });
    return map;
  }, [filtered]);

  // KM histogram
  const kmHistogram = useMemo(() => {
    const ranges = [
      { key: '0-20k', min: 0, max: 20000 },
      { key: '20k-40k', min: 20000, max: 40000 },
      { key: '40k-60k', min: 40000, max: 60000 },
      { key: '60k-80k', min: 60000, max: 80000 },
      { key: '+80k', min: 80000, max: Infinity },
    ];
    const map = ranges.map((r) => ({ faixa: r.key, count: 0 }));
    filtered.forEach((v) => {
      const km = Number(v.KM) || 0;
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (km >= r.min && km < r.max) {
          map[i].count += 1;
          break;
        }
      }
    });
    return map;
  }, [filtered]);

  // Table pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (loading) return (<div className="bg-slate-50 min-h-screen p-6"><Title>Frota - Dashboard</Title><Card><Text>Carregando...</Text></Card></div>);
  if (error) return (<div className="bg-slate-50 min-h-screen p-6"><Title>Frota - Dashboard</Title><Card><Text style={{ color: 'red' }}>{String(error)}</Text></Card></div>);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title className="text-slate-900">Gestão de Frota</Title>
          <Text className="mt-1 text-slate-500">Visão geral da frota, disponibilidade e perfil.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <Car className="w-4 h-4" />
            Hub Operacional
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Text className="text-slate-700 font-medium mb-2">Filtros</Text>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Text className="text-slate-500 text-xs mb-1">Filial</Text>
            <select
              multiple
              size={3}
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              value={selectedFiliais}
              onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                setSelectedFiliais(opts);
                setPage(1);
              }}
            >
              {filiais.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <Text className="text-slate-500 text-xs mb-1">Situação</Text>
            <select
              multiple
              size={3}
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              value={selectedSituacoes}
              onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                setSelectedSituacoes(opts);
                setPage(1);
              }}
            >
              {situacoes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setSelectedFiliais([]); setSelectedSituacoes([]); setPage(1); }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-sm transition-colors"
            >
              Limpar Filtros
            </button>
          </div>
          <div className="flex items-end justify-end">
            <Text className="text-slate-500">Total Filtrado: <span className="font-semibold text-slate-900">{filtered.length}</span></Text>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
          <Text className="text-slate-500">Total Veículos</Text>
          <Metric className="text-slate-900">{totalVehicles}</Metric>
        </Card>
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
          <Text className="text-slate-500">Valor FIPE Total</Text>
          <Metric className="text-slate-900">{fmtBRL(totalFipe)}</Metric>
        </Card>
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
          <Text className="text-slate-500">Idade Média (Meses)</Text>
          <Metric className="text-slate-900">{avgAge.toFixed(1)}</Metric>
        </Card>
        <Card className="bg-white shadow-sm border border-slate-200 decoration-t-4 decoration-emerald-500">
          <Text className="text-slate-500">KM Médio</Text>
          <Metric className="text-slate-900">{Math.round(avgKM).toLocaleString()}</Metric>
        </Card>
      </div>

      {/* Charts Row 1: Availability Pie & Age Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 bg-white shadow-sm border border-slate-200">
          <Title className="text-slate-900">Disponibilidade da Frota</Title>
          <div className="h-64 mt-4 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                >
                  {fleetPieData.map((entry, index) => {
                    let color = '#94a3b8'; // default slate-400
                    if (entry.key === 'produtiva') color = '#10b981'; // emerald-500
                    if (entry.key === 'improdutiva') color = '#f59e0b'; // amber-500
                    if (entry.key === 'inativa') color = '#ef4444'; // red-500
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {fleetPieData.map((d) => (
              <div key={d.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${d.key === 'produtiva' ? 'bg-emerald-500' : d.key === 'improdutiva' ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <span className="text-slate-600 capitalize">{d.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-slate-900">{d.value}</span>
                  <span className="text-slate-400 w-12 text-right">{d.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
          <Title className="text-slate-900">Distribuição por Idade (Meses)</Title>
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageHistogram} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="faixa" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="count" position="top" fill="#64748b" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts Row 2: KM Histogram */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Title className="text-slate-900">Distribuição por Quilometragem</Title>
        <div className="h-72 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={kmHistogram} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="faixa" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="count" position="top" fill="#64748b" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detailed Table */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <Title className="text-slate-900">Detalhamento da Frota</Title>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-600">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Placa</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Filial</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium text-right">KM</th>
                <th className="px-4 py-3 font-medium text-right">Idade (Meses)</th>
                <th className="px-4 py-3 font-medium text-right">FIPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((v, i) => {
                const cat = classifySituacao(v.SituacaoVeiculo);
                let statusColor = 'bg-slate-100 text-slate-700';
                let Icon = null;

                if (cat === 'produtiva') {
                  statusColor = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                  Icon = CheckCircle;
                } else if (cat === 'improdutiva') {
                  statusColor = 'bg-amber-50 text-amber-700 border border-amber-100';
                  Icon = AlertTriangle;
                } else {
                  statusColor = 'bg-red-50 text-red-700 border border-red-100';
                  Icon = XCircle;
                }

                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{v.Placa}</td>
                    <td className="px-4 py-3 text-slate-600">{v.Modelo}</td>
                    <td className="px-4 py-3 text-slate-600">{v.Filial}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                        {Icon && <Icon className="w-3 h-3" />}
                        {v.SituacaoVeiculo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{Number(v.KM).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{v.IdadeMeses}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmtBRL(Number(v.ValorFipe))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
