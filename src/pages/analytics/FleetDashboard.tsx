import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart, BarList } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Car, AlertTriangle, Activity, Filter } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseNum(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const s = String(v).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// --- COMPONENTE PRINCIPAL ---
export default function FleetDashboard(): JSX.Element {
  const { data: frotaData } = useBIData<AnyObject[]>('frota.json');

  const frota = useMemo(() => {
    const raw = (frotaData as any)?.data || frotaData || [];
    return Array.isArray(raw) ? raw : [];
  }, [frotaData]);

  // State
  const [selectedFilial, setSelectedFilial] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null); // Cross-filter from Donut
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Lists
  const filiais = useMemo(() => Array.from(new Set(frota.map(r => r.Filial).filter(Boolean))).sort(), [frota]);

  // Base Filter
  const baseFiltered = useMemo(() => {
    return frota.filter(r => {
      if (selectedFilial.length > 0 && !selectedFilial.includes(r.Filial)) return false;
      return true;
    });
  }, [frota, selectedFilial]);

  // Final Filter (Cross-filter)
  const finalFiltered = useMemo(() => {
    if (!selectedStatus) return baseFiltered;
    return baseFiltered.filter(r => r.Situacao === selectedStatus);
  }, [baseFiltered, selectedStatus]);

  // KPIs
  const kpis = useMemo(() => {
    const total = finalFiltered.length;
    const active = finalFiltered.filter(r => r.Situacao === 'Produtivo' || r.Situacao === 'Locado').length;
    const inactive = total - active;
    const avgAge = total > 0 ? finalFiltered.reduce((s, r) => s + parseNum(r.IdadeVeiculo), 0) / total : 0;
    const avgKm = total > 0 ? finalFiltered.reduce((s, r) => s + parseNum(r.KmVeiculo), 0) / total : 0;
    return { total, active, inactive, avgAge, avgKm };
  }, [finalFiltered]);

  // Charts Data
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    baseFiltered.forEach(r => {
      const s = r.Situacao || 'Indefinido';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [baseFiltered]);

  const ageData = useMemo(() => {
    const ranges = { '0-12': 0, '13-24': 0, '25-36': 0, '37-48': 0, '48+': 0 };
    finalFiltered.forEach(r => {
      const age = parseNum(r.IdadeVeiculo);
      if (age <= 12) ranges['0-12']++;
      else if (age <= 24) ranges['13-24']++;
      else if (age <= 36) ranges['25-36']++;
      else if (age <= 48) ranges['37-48']++;
      else ranges['48+']++;
    });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [finalFiltered]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    finalFiltered.forEach(r => {
      const c = r.Categoria || 'Outros';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [finalFiltered]);

  // Insights
  const insights = useMemo(() => {
    const alerts = [];

    // 1. Aging Fleet
    const oldVehicles = finalFiltered.filter(r => parseNum(r.IdadeVeiculo) > 48 || parseNum(r.KmVeiculo) > 80000).length;
    if (oldVehicles > 0) {
      alerts.push({
        type: 'warning',
        title: 'Frota Envelhecida',
        msg: `${oldVehicles} veículos têm mais de 48 meses ou 80k KM. Considere renovação.`
      });
    }

    // 2. High Idleness
    if (kpis.total > 0) {
      const idleRate = kpis.inactive / kpis.total;
      if (idleRate > 0.10) {
        alerts.push({
          type: 'danger',
          title: 'Alta Ociosidade',
          msg: `A taxa de ociosidade está em ${(idleRate * 100).toFixed(1)}%, acima do limite de 10%.`
        });
      }
    }

    return alerts;
  }, [finalFiltered, kpis]);

  // Table Pagination
  const pageItems = useMemo(() => {
    return finalFiltered.slice((page - 1) * pageSize, page * pageSize);
  }, [finalFiltered, page]);

  const totalPages = Math.max(1, Math.ceil(finalFiltered.length / pageSize));

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Fleet Management</Title>
          <Text className="mt-1 text-slate-500">Monitoramento da frota, disponibilidade e perfil dos veículos.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <Car className="w-4 h-4" /> Hub Operacional
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <Text className="font-medium text-slate-700">Filtros</Text>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Text className="text-xs text-slate-500 mb-1">Filial</Text>
            <select multiple className="w-full border border-slate-300 rounded-md p-2 text-sm h-10 outline-none focus:ring-2 focus:ring-emerald-500" value={selectedFilial} onChange={e => { setSelectedFilial(Array.from(e.target.selectedOptions).map(o => o.value)); setPage(1); }}>
              {filiais.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 w-full py-2 rounded-md text-sm transition-colors"
              onClick={() => { setSelectedFilial([]); setSelectedStatus(null); setPage(1); }}
            >
              Limpar Filtros
            </button>
          </div>
          {selectedStatus && (
            <div className="flex items-end">
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-2 rounded-md text-sm w-full flex justify-between items-center">
                <span>Situação: <strong>{selectedStatus}</strong></span>
                <button onClick={() => setSelectedStatus(null)} className="text-emerald-500 hover:text-emerald-800 ml-2">✕</button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((alert, idx) => (
            <div key={idx} className={`p-4 rounded-lg border flex items-start gap-3 ${alert.type === 'danger' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
              {alert.type === 'danger' ? <Activity className="w-5 h-5 mt-0.5" /> : <AlertTriangle className="w-5 h-5 mt-0.5" />}
              <div>
                <h4 className="font-semibold text-sm">{alert.title}</h4>
                <p className="text-xs opacity-90">{alert.msg}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="emerald" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Total Frota</Text>
          <Metric className="text-slate-900">{kpis.total}</Metric>
        </Card>
        <Card decoration="top" decorationColor="blue" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Ativos</Text>
          <Metric className="text-slate-900">{kpis.active}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">Idade Média (Meses)</Text>
          <Metric className="text-slate-900">{kpis.avgAge.toFixed(1)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="rose" className="bg-white border border-slate-200 shadow-sm">
          <Text className="text-slate-500">KM Médio</Text>
          <Metric className="text-slate-900">{(kpis.avgKm / 1000).toFixed(1)}k</Metric>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-white border border-slate-200 shadow-sm">
          <Title className="text-slate-900">Disponibilidade</Title>
          <Text className="text-slate-500 text-sm mb-4">Clique para filtrar detalhes.</Text>
          <DonutChart
            data={statusData}
            category="value"
            index="name"
            colors={['emerald', 'amber', 'rose', 'slate', 'blue']}
            className="h-60"
          />
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <Title className="text-slate-900">Distribuição por Idade</Title>
          <div className="h-60 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <Title className="text-slate-900">Top Categorias</Title>
          <div className="mt-4">
            <BarList data={categoryData} color="emerald" />
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Title className="text-slate-900 mb-4">Detalhamento da Frota</Title>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Placa</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Filial</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium text-right">KM</th>
                <th className="px-4 py-3 font-medium text-right">Idade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((r, i) => (
                <tr key={`frota-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.Placa}</td>
                  <td className="px-4 py-3 text-slate-600">{r.Modelo}</td>
                  <td className="px-4 py-3 text-slate-600">{r.Filial}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.Situacao === 'Produtivo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {r.Situacao}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{parseNum(r.KmVeiculo).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{parseNum(r.IdadeVeiculo)} m</td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhum veículo encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, finalFiltered.length)} de {finalFiltered.length}</div>
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
