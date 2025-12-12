import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, Clock, Users, Filter, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { return `R$ ${(v / 1000).toFixed(0)}k`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

export default function SalesDashboard(): JSX.Element {
  const { data: rawVendas } = useBIData<AnyObject[]>('dim_vendas.json');
  const vendas = useMemo(() => Array.isArray(rawVendas) ? rawVendas : [], [rawVendas]);

  const [activeTab, setActiveTab] = useState(0);
  const [selectedComprador, setSelectedComprador] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      if (selectedComprador && v.Comprador !== selectedComprador) return false;
      return true;
    });
  }, [vendas, selectedComprador]);

  const financialKPIs = useMemo(() => {
    const totalVendas = filteredVendas.reduce((s, v) => s + parseCurrency(v.ValorVenda), 0);
    const totalCompras = filteredVendas.reduce((s, v) => s + parseCurrency(v.ValorCompra), 0);
    const margem = totalVendas - totalCompras;
    const percentualMargem = totalCompras > 0 ? (margem / totalCompras) * 100 : 0;
    const roi = totalCompras > 0 ? (margem / totalCompras) * 100 : 0;
    const ticketMedio = filteredVendas.length > 0 ? totalVendas / filteredVendas.length : 0;
    return { totalVendas, totalCompras, margem, percentualMargem, roi, ticketMedio, qtdVendas: filteredVendas.length };
  }, [filteredVendas]);

  const evolutionData = useMemo(() => {
    const map: any = {};
    filteredVendas.forEach(v => {
      const k = getMonthKey(v.DataVenda);
      if (!k) return;
      if (!map[k]) map[k] = { Vendas: 0, Margem: 0 };
      map[k].Vendas += parseCurrency(v.ValorVenda);
      map[k].Margem += (parseCurrency(v.ValorVenda) - parseCurrency(v.ValorCompra));
    });
    return Object.keys(map).sort().map(k => ({ date: k, label: monthLabel(k), ...map[k] }));
  }, [filteredVendas]);

  const margemDistribution = useMemo(() => {
    let positiva = 0, negativa = 0;
    filteredVendas.forEach(v => {
      const margem = parseCurrency(v.ValorVenda) - parseCurrency(v.ValorCompra);
      if (margem >= 0) positiva += margem; else negativa += Math.abs(margem);
    });
    return [{ name: 'Lucro', value: positiva }, { name: 'Prejuízo', value: negativa }];
  }, [filteredVendas]);

  const giroKPIs = useMemo(() => {
    const tempos = filteredVendas.map(v => {
      const compra = v.DataCompra ? new Date(v.DataCompra) : null;
      const venda = v.DataVenda ? new Date(v.DataVenda) : null;
      if (!compra || !venda) return 0;
      return Math.floor((venda.getTime() - compra.getTime()) / (1000 * 60 * 60 * 24));
    }).filter(d => d > 0);
    const tempoMedio = tempos.length > 0 ? tempos.reduce((s, t) => s + t, 0) / tempos.length : 0;
    const tempoMin = tempos.length > 0 ? Math.min(...tempos) : 0;
    const tempoMax = tempos.length > 0 ? Math.max(...tempos) : 0;
    return { tempoMedio, tempoMin, tempoMax };
  }, [filteredVendas]);

  const compradorRanking = useMemo(() => {
    const map: any = {};
    filteredVendas.forEach(v => {
      const c = v.Comprador || 'Desconhecido';
      if (!map[c]) map[c] = { qtd: 0, valor: 0 };
      map[c].qtd += 1;
      map[c].valor += parseCurrency(v.ValorVenda);
    });
    return Object.entries(map).map(([name, data]: any) => ({ name, value: data.valor, qtd: data.qtd })).sort((a,b) => b.value - a.value).slice(0, 10);
  }, [filteredVendas]);

  const tempoHistogram = useMemo(() => {
    const ranges = { '0-90d': 0, '91-180d': 0, '181-365d': 0, '365d+': 0 };
    filteredVendas.forEach(v => {
      const compra = v.DataCompra ? new Date(v.DataCompra) : null;
      const venda = v.DataVenda ? new Date(v.DataVenda) : null;
      if (!compra || !venda) return;
      const dias = Math.floor((venda.getTime() - compra.getTime()) / (1000 * 60 * 60 * 24));
      if (dias <= 90) ranges['0-90d']++; else if (dias <= 180) ranges['91-180d']++; else if (dias <= 365) ranges['181-365d']++; else ranges['365d+']++;
    });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [filteredVendas]);

  const tableData = useMemo(() => {
    return filteredVendas.map(v => {
      const compra = parseCurrency(v.ValorCompra);
      const venda = parseCurrency(v.ValorVenda);
      const margem = venda - compra;
      const pct = compra > 0 ? (margem/compra)*100 : 0;
      const tempo = v.DataCompra && v.DataVenda ? Math.floor((new Date(v.DataVenda).getTime() - new Date(v.DataCompra).getTime()) / (86400000)) : 0;
      return {
        placa: v.Placa, modelo: v.Modelo, comprador: v.Comprador,
        compra, venda, margem, pct, tempo, dataVenda: v.DataVenda
      };
    }).sort((a,b) => b.margem - a.margem);
  }, [filteredVendas]);

  const pageItems = tableData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Desmobilização de Ativos</Title><Text className="text-slate-500">Resultado Financeiro e Giro de Estoque.</Text></div>
        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex gap-2 font-medium"><TrendingUp className="w-4 h-4"/> Hub Ativos</div>
      </div>

      {selectedComprador && (
        <Card className="bg-blue-50 border-blue-200 flex justify-between items-center">
            <div className="flex items-center gap-2 text-blue-800"><Filter size={16}/> Filtro Ativo: <strong>{selectedComprador}</strong></div>
            <button onClick={() => setSelectedComprador(null)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"><X size={14}/> Limpar</button>
        </Card>
      )}

      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit">
        {['Financeiro', 'Giro (Tempo de Casa)'].map((tab, idx) => (
            <button key={idx} onClick={() => setActiveTab(idx)} className={`px-4 py-2 rounded text-sm font-medium ${activeTab === idx ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card decoration="top" decorationColor="emerald"><Text>Margem Total</Text><Metric>{fmtCompact(financialKPIs.margem)}</Metric><Text className="text-xs text-slate-400">ROI: {financialKPIs.roi.toFixed(1)}%</Text></Card>
                <Card decoration="top" decorationColor="blue"><Text>Total Vendas</Text><Metric>{fmtCompact(financialKPIs.totalVendas)}</Metric></Card>
                <Card decoration="top" decorationColor="violet"><Text>Veículos Vendidos</Text><Metric>{financialKPIs.qtdVendas}</Metric></Card>
                <Card decoration="top" decorationColor="amber"><Text>Ticket Médio</Text><Metric>{fmtCompact(financialKPIs.ticketMedio)}</Metric></Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <Title>Evolução de Vendas e Margem</Title>
                    <div className="h-72 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                                <XAxis dataKey="label" fontSize={12}/>
                                <YAxis fontSize={12} tickFormatter={fmtCompact}/>
                                <Tooltip formatter={fmtBRL}/>
                                <Legend/>
                                <Line type="monotone" dataKey="Vendas" stroke="#3b82f6" strokeWidth={3} dot={{r:3}}/>
                                <Line type="monotone" dataKey="Margem" stroke="#10b981" strokeWidth={3} dot={{r:3}}/>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                <Card>
                    <Title>Distribuição de Margem</Title>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={margemDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    <Cell fill="#10b981" />
                                    <Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip formatter={fmtBRL} />
                                <Legend verticalAlign="bottom"/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <Card>
                <Title>Top Compradores</Title>
                <div className="mt-4 space-y-2 h-64 overflow-y-auto">
                    {compradorRanking.map((item: any, idx: number) => {
                        const isSelected = selectedComprador === item.name;
                        return (
                            <div key={idx} onClick={() => setSelectedComprador(isSelected ? null : item.name)} className={`p-2 rounded cursor-pointer flex justify-between text-sm ${isSelected ? 'bg-blue-100 ring-1 ring-blue-500' : 'hover:bg-slate-50'}`}>
                                <span className="truncate max-w-[70%]">{item.name}</span>
                                <span className="font-bold">{fmtCompact(item.value)}</span>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
      )}

      {activeTab === 1 && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card decoration="top" decorationColor="indigo"><Text>Tempo Médio Casa</Text><Metric>{giroKPIs.tempoMedio.toFixed(0)} dias</Metric></Card>
                <Card decoration="top" decorationColor="emerald"><Text>Giro Rápido (Min)</Text><Metric>{giroKPIs.tempoMin} dias</Metric></Card>
                <Card decoration="top" decorationColor="rose"><Text>Giro Lento (Max)</Text><Metric>{giroKPIs.tempoMax} dias</Metric></Card>
            </div>
            <Card>
                <Title>Distribuição Tempo de Casa</Title>
                <div className="h-72 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={tempoHistogram} cx="50%" cy="50%" outerRadius={80} label dataKey="value">
                                {tempoHistogram.map((_, index) => <Cell key={index} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][index % 4]} />)}
                            </Pie>
                            <Tooltip/>
                            <Legend/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
      )}

      <Card>
        <Title className="mb-4">Detalhamento de Vendas</Title>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <tr><th className="p-3">Placa</th><th className="p-3">Modelo</th><th className="p-3">Comprador</th><th className="p-3 text-right">Compra</th><th className="p-3 text-right">Venda</th><th className="p-3 text-right">Margem</th><th className="p-3 text-center">Tempo (dias)</th></tr>
                </thead>
                <tbody>
                    {pageItems.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 border-t">
                            <td className="p-3 font-mono">{r.placa}</td><td className="p-3">{r.modelo}</td><td className="p-3 truncate max-w-[150px]">{r.comprador}</td>
                            <td className="p-3 text-right text-slate-500">{fmtBRL(r.compra)}</td>
                            <td className="p-3 text-right font-bold">{fmtBRL(r.venda)}</td>
                            <td className={`p-3 text-right font-bold ${r.margem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(r.margem)}</td>
                            <td className="p-3 text-center">{r.tempo}</td>
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