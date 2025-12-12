import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Car, Activity, Filter, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number) { return `R$ ${(v / 1000).toFixed(0)}k`; }

export default function FleetDashboard(): JSX.Element {
  const { data: frotaData } = useBIData<AnyObject[]>('dim_frota.json');
  const { data: manutencaoData } = useBIData<AnyObject[]>('fat_manutencao_os_*.json');

  const frota = useMemo(() => Array.isArray(frotaData) ? frotaData : [], [frotaData]);
  const manutencao = useMemo(() => (manutencaoData as any)?.data || manutencaoData || [], [manutencaoData]);

  const [filterState, setFilterState] = useState<{ status: string | null; modelo: string | null; }>({ status: null, modelo: null });
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const hasActiveFilters = !!(filterState.status || filterState.modelo);
  const modelos = useMemo(() => Array.from(new Set(frota.map(r => r.Modelo).filter(Boolean))).sort(), [frota]);

  const filteredData = useMemo(() => {
    return frota.filter(r => {
      if (filterState.status && r.Status !== filterState.status) return false;
      if (filterState.modelo && r.Modelo !== filterState.modelo) return false;
      return true;
    });
  }, [frota, filterState]);

  const kpis = useMemo(() => {
    const total = filteredData.length;
    const patrimonio = filteredData.reduce((s, r) => s + parseCurrency(r.ValorFipeAtual), 0);
    const aquisicao = filteredData.reduce((s, r) => s + parseCurrency(r.ValorCompra), 0);
    const idadeMedia = total > 0 ? filteredData.reduce((s, r) => s + parseNum(r.IdadeVeiculo), 0) / total : 0;
    
    const placasFiltradas = new Set(filteredData.map(r => r.Placa));
    const custoManutencao = manutencao.filter((m: any) => placasFiltradas.has(m.Placa)).reduce((s: number, m: any) => s + parseCurrency(m.ValorTotal), 0);
    
    return { total, patrimonio, aquisicao, idadeMedia, tcoTotal: aquisicao + custoManutencao, tcoMedio: total > 0 ? (aquisicao + custoManutencao) / total : 0, percOciosidade: (filteredData.filter(r => r.Status !== 'Locado').length / total) * 100 };
  }, [filteredData, manutencao]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => { map[r.Status] = (map[r.Status] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const depreciationData = useMemo(() => {
    return filteredData.map(r => ({
      placa: r.Placa,
      idade: parseNum(r.IdadeVeiculo),
      depreciacao: parseCurrency(r.ValorCompra) - parseCurrency(r.ValorFipeAtual)
    })).filter(d => d.idade > 0 && d.depreciacao > -50000 && d.depreciacao < 150000); 
  }, [filteredData]);

  const pageItems = useMemo(() => filteredData.slice(page * pageSize, (page + 1) * pageSize), [filteredData, page]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Gestão de Frota & TCO</Title><Text className="text-slate-500">Análise de ativos e custos.</Text></div>
        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Car className="w-4 h-4"/> Hub Ativos</div>
      </div>

      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-2"><Filter className="w-4 h-4 text-slate-500"/><Text className="font-medium text-slate-700">Filtros</Text></div>
        <div className="flex gap-4">
            <select className="border p-2 rounded text-sm w-64" value={filterState.modelo || ''} onChange={e => setFilterState(p => ({...p, modelo: e.target.value || null}))}>
                <option value="">Todos os Modelos</option>
                {modelos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {hasActiveFilters && (
                <button onClick={() => setFilterState({ status: null, modelo: null })} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm flex items-center gap-2">
                    <X size={14}/> Limpar
                </button>
            )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card decoration="top" decorationColor="emerald"><Text>Patrimônio (FIPE)</Text><Metric>{fmtCompact(kpis.patrimonio)}</Metric></Card>
        <Card decoration="top" decorationColor="blue"><Text>Custo Aquisição</Text><Metric>{fmtCompact(kpis.aquisicao)}</Metric></Card>
        <Card decoration="top" decorationColor="violet"><Text>TCO Total</Text><Metric>{fmtCompact(kpis.tcoTotal)}</Metric></Card>
        <Card decoration="top" decorationColor="amber"><Text>Idade Média</Text><Metric>{kpis.idadeMedia.toFixed(1)} m</Metric></Card>
        <Card decoration="top" decorationColor="rose"><Text>Ociosidade</Text><Metric>{kpis.percOciosidade.toFixed(1)}%</Metric></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Title>Status da Frota (Clique para filtrar)</Title>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => setFilterState(prev => ({ ...prev, status: prev.status === data.name ? null : data.name }))}
                  cursor="pointer"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444', '#64748b'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [value, 'Veículos']} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-4"><Activity className="w-5 h-5 text-slate-500" /><Title>Curva de Depreciação</Title></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="idade" name="Idade" unit="m" stroke="#64748b" fontSize={12} />
                <YAxis type="number" dataKey="depreciacao" name="Depreciação" tickFormatter={fmtCompact} stroke="#64748b" fontSize={12} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: any) => fmtBRL(Number(v))} />
                <Scatter name="Veículos" data={depreciationData} fill="#ef4444" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <Title>Detalhamento da Frota</Title>
              <div className="flex gap-2">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded text-sm disabled:opacity-50">←</button>
                  <span className="text-sm py-1">Pág {page + 1}</span>
                  <button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= filteredData.length} className="px-3 py-1 bg-slate-100 rounded text-sm disabled:opacity-50">→</button>
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                      <tr><th className="px-6 py-3">Placa</th><th className="px-6 py-3">Modelo</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Compra</th><th className="px-6 py-3 text-right">FIPE</th><th className="px-6 py-3 text-right">Deprec.</th><th className="px-6 py-3 text-center">Idade</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {pageItems.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-mono">{r.Placa}</td><td className="px-6 py-3">{r.Modelo}</td>
                              <td className="px-6 py-3"><span className="bg-slate-100 px-2 py-1 rounded-full text-xs">{r.Status}</span></td>
                              <td className="px-6 py-3 text-right">{fmtBRL(parseCurrency(r.ValorCompra))}</td>
                              <td className="px-6 py-3 text-right">{fmtBRL(parseCurrency(r.ValorFipeAtual))}</td>
                              <td className="px-6 py-3 text-right text-red-600">{fmtBRL(parseCurrency(r.ValorCompra) - parseCurrency(r.ValorFipeAtual))}</td>
                              <td className="px-6 py-3 text-center">{parseNum(r.IdadeVeiculo)} m</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </Card>
    </div>
  );
}