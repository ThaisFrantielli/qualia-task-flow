import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingDown, UserMinus, UserPlus, Filter, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

export default function ChurnDashboard(): JSX.Element {
  const { data: churnData } = useBIData<AnyObject[]>('dim_churn.json');
  const churn = useMemo(() => Array.isArray(churnData) ? churnData : [], [churnData]);

  const [activeTab, setActiveTab] = useState(0);
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const filteredChurn = useMemo(() => {
    return churn.filter(r => {
      if (selectedMotivo && r.Motivo !== selectedMotivo) return false;
      return true;
    });
  }, [churn, selectedMotivo]);

  const kpis = useMemo(() => {
    const inAt = filteredChurn.filter(c => c.TipoEvento === 'Iniciado').length;
    const outAt = filteredChurn.filter(c => c.TipoEvento === 'Encerrado').length;
    const valorPerdido = filteredChurn.filter(c => c.TipoEvento === 'Encerrado').reduce((s, c) => s + parseCurrency(c.Valor), 0);
    const churnRate = inAt > 0 ? (outAt / inAt) * 100 : 0;
    return { inAt, outAt, valorPerdido, churnRate };
  }, [filteredChurn]);

  const evolutionData = useMemo(() => {
    const map: any = {};
    filteredChurn.forEach(r => {
      const k = getMonthKey(r.DataEvento);
      if (!k) return;
      if (!map[k]) map[k] = { Novos: 0, Cancelados: 0 };
      if (r.TipoEvento === 'Iniciado') map[k].Novos++;
      else map[k].Cancelados++;
    });
    return Object.keys(map).sort().map(k => ({ date: k, label: monthLabel(k), ...map[k] }));
  }, [filteredChurn]);

  const motivosData = useMemo(() => {
    const map: any = {};
    filteredChurn.filter(c => c.TipoEvento === 'Encerrado').forEach(r => {
      const m = r.Motivo || 'Outros';
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]: any) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [filteredChurn]);

  const tableData = useMemo(() => {
    return filteredChurn.slice().sort((a, b) => (b.DataEvento || '').localeCompare(a.DataEvento || ''));
  }, [filteredChurn]);

  const pageItems = tableData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Análise de Churn</Title><Text className="text-slate-500">Entradas, saídas e motivos de cancelamento.</Text></div>
        <div className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full flex gap-2 font-medium"><TrendingDown className="w-4 h-4"/> Hub Clientes</div>
      </div>

      {selectedMotivo && (
        <Card className="bg-rose-50 border-rose-200 flex justify-between items-center">
            <div className="flex items-center gap-2 text-rose-800"><Filter size={16}/> Motivo: <strong>{selectedMotivo}</strong></div>
            <button onClick={() => setSelectedMotivo(null)} className="text-rose-600 hover:text-rose-800 flex items-center gap-1 text-sm"><X size={14}/> Limpar</button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="emerald"><div className="flex items-center gap-2 mb-2"><UserPlus className="w-4 h-4 text-emerald-600"/><Text>Novos Contratos</Text></div><Metric>{kpis.inAt}</Metric></Card>
        <Card decoration="top" decorationColor="rose"><div className="flex items-center gap-2 mb-2"><UserMinus className="w-4 h-4 text-rose-600"/><Text>Cancelamentos</Text></div><Metric>{kpis.outAt}</Metric></Card>
        <Card decoration="top" decorationColor="amber"><Text>Churn Rate</Text><Metric>{kpis.churnRate.toFixed(1)}%</Metric></Card>
        <Card decoration="top" decorationColor="indigo"><Text>Receita Perdida</Text><Metric>{fmtBRL(kpis.valorPerdido)}</Metric></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <Title>Fluxo de Contratos (Entradas vs Saídas)</Title>
            <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={evolutionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="label" fontSize={12}/>
                        <YAxis fontSize={12}/>
                        <Tooltip/>
                        <Legend/>
                        <Bar dataKey="Novos" fill="#10b981" />
                        <Bar dataKey="Cancelados" fill="#ef4444" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
        <Card>
            <Title>Principais Motivos de Saída</Title>
            <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={motivosData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" onClick={(d) => setSelectedMotivo(selectedMotivo === d.name ? null : d.name)} cursor="pointer">
                            {motivosData.map((_, i) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#64748b', '#ec4899'][i % 4]} />)}
                        </Pie>
                        <Tooltip/>
                        <Legend verticalAlign="bottom"/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
      </div>

      <Card>
        <Title className="mb-4">Histórico de Eventos</Title>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <tr><th className="p-3">Data</th><th className="p-3">Evento</th><th className="p-3">Cliente</th><th className="p-3">Placa</th><th className="p-3 text-right">Valor</th><th className="p-3">Motivo</th></tr>
                </thead>
                <tbody className="divide-y">
                    {pageItems.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 border-t">
                            <td className="p-3">{r.DataEvento ? new Date(r.DataEvento).toLocaleDateString('pt-BR') : '-'}</td>
                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs text-white ${r.TipoEvento==='Iniciado'?'bg-emerald-500':'bg-rose-500'}`}>{r.TipoEvento}</span></td>
                            <td className="p-3 font-medium">{r.Cliente}</td>
                            <td className="p-3 font-mono">{r.Placa}</td>
                            <td className="p-3 text-right font-bold">{fmtBRL(parseCurrency(r.Valor))}</td>
                            <td className="p-3 text-slate-500">{r.Motivo}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="flex justify-between mt-4 border-t pt-4">
            <Text className="text-sm">Página {page + 1} de {Math.ceil(tableData.length / pageSize)}</Text>
            <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">←</button>
                <button onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= tableData.length} className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50">→</button>
            </div>
        </div>
      </Card>
    </div>
  );
}