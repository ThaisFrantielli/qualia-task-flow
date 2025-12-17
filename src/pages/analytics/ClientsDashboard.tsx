import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, TrendingDown, DollarSign, Car, AlertTriangle, X, Building2, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChartFilter } from '@/hooks/useChartFilter';
import { ChartFilterBadges, FloatingClearButton } from '@/components/analytics/ChartFilterBadges';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`; return `R$ ${(v / 1000).toFixed(0)}k`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export default function ClientsDashboard(): JSX.Element {
  const { data: rawClientes } = useBIData<AnyObject[]>('dim_clientes.json');
  const { data: rawFaturamento } = useBIData<AnyObject[]>('fat_faturamento_*.json');
  const { data: rawChurn } = useBIData<AnyObject[]>('fat_churn.json');
  const { data: rawInadimplencia } = useBIData<AnyObject[]>('fat_inadimplencia.json');

  const clientes = useMemo(() => {
    const raw = (rawClientes as any)?.data || rawClientes || [];
    return Array.isArray(raw) ? raw : [];
  }, [rawClientes]);

  const faturamento = useMemo(() => {
    const raw = (rawFaturamento as any)?.data || rawFaturamento || [];
    return Array.isArray(raw) ? raw : [];
  }, [rawFaturamento]);

  const churn = useMemo(() => {
    const raw = (rawChurn as any)?.data || rawChurn || [];
    return Array.isArray(raw) ? raw : [];
  }, [rawChurn]);

  const inadimplencia = useMemo(() => {
    const raw = (rawInadimplencia as any)?.data || rawInadimplencia || [];
    return Array.isArray(raw) ? raw : [];
  }, [rawInadimplencia]);

  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  
  // Hook de filtros estilo Power BI
  const { filters, handleChartClick, clearFilter, clearAllFilters, hasActiveFilters, isValueSelected, getFilterValues } = useChartFilter();

  const clearAll = () => { clearAllFilters(); setSelectedClient(null); };
  const hasFilters = hasActiveFilters || !!selectedClient;

  // Filtrar clientes
  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const segmentoFilters = getFilterValues('segmento');
      const estadoFilters = getFilterValues('estado');
      
      if (segmentoFilters.length > 0 && !segmentoFilters.includes(c.Segmento)) return false;
      if (estadoFilters.length > 0 && !estadoFilters.includes(c.Estado)) return false;
      if (selectedClient && c.Nome !== selectedClient && c.NomeFantasia !== selectedClient) return false;
      return true;
    });
  }, [clientes, filters, selectedClient, getFilterValues]);

  // KPIs principais
  const kpis = useMemo(() => {
    const totalClientes = filteredClientes.length;
    const totalAtivos = filteredClientes.filter(c => c.Status === 'Ativo').length;
    const totalVeiculos = filteredClientes.reduce((s, c) => s + parseNum(c.VeiculosLocados), 0);
    const avgVeiculos = totalClientes > 0 ? totalVeiculos / totalClientes : 0;

    const clientesNomes = new Set(filteredClientes.map(c => c.NomeFantasia || c.Nome));
    const receitaClientes = faturamento.filter(f => clientesNomes.has(f.Cliente));
    const totalReceita = receitaClientes.reduce((s, f) => s + parseCurrency(f.ValorTotal), 0);
    const avgReceita = totalClientes > 0 ? totalReceita / totalClientes : 0;

    const encerrados = churn.length;
    const churnRate = totalClientes > 0 ? (encerrados / totalClientes) * 100 : 0;

    const totalInadimplente = inadimplencia.reduce((s, i) => s + parseCurrency(i.SaldoDevedor), 0);

    return { totalClientes, totalAtivos, totalVeiculos, avgVeiculos, totalReceita, avgReceita, churnRate, encerrados, totalInadimplente };
  }, [filteredClientes, faturamento, churn, inadimplencia]);

  // Top clientes por receita
  const topReceita = useMemo(() => {
    const map: Record<string, number> = {};
    faturamento.forEach(f => {
      const c = f.Cliente || 'N/A';
      map[c] = (map[c] || 0) + parseCurrency(f.ValorTotal);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [faturamento]);

  // Curva ABC
  const curvaABC = useMemo(() => {
    const sorted = [...topReceita].sort((a, b) => b.value - a.value);
    const total = sorted.reduce((s, r) => s + r.value, 0);
    let acc = 0;
    let a = 0, b = 0, c = 0;
    sorted.forEach(r => {
      acc += r.value;
      const pct = (acc / total) * 100;
      if (pct <= 80) a++; else if (pct <= 95) b++; else c++;
    });
    return [
      { name: 'Classe A (80%)', value: a, fill: '#10b981' },
      { name: 'Classe B (15%)', value: b, fill: '#f59e0b' },
      { name: 'Classe C (5%)', value: c, fill: '#ef4444' }
    ];
  }, [topReceita]);

  // Distribuição por segmento
  const segmentoData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredClientes.forEach(c => {
      const s = c.Segmento || 'Não Informado';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredClientes]);

  // Distribuição por estado
  const estadoData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredClientes.forEach(c => {
      const e = c.Estado || 'N/I';
      map[e] = (map[e] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredClientes]);

  // Evolução de churn
  const churnTrend = useMemo(() => {
    const map: Record<string, number> = {};
    churn.forEach(c => {
      const k = getMonthKey(c.DataEncerramento);
      if (k) map[k] = (map[k] || 0) + 1;
    });
    return Object.keys(map).sort().slice(-12).map(k => ({ label: monthLabel(k), date: k, Cancelados: map[k] }));
  }, [churn]);

  // Inadimplência por aging
  const agingData = useMemo(() => {
    const map: Record<string, number> = {};
    inadimplencia.forEach(i => {
      const f = i.FaixaAging || 'Outros';
      map[f] = (map[f] || 0) + parseCurrency(i.SaldoDevedor);
    });
    const order = ['A Vencer', '1-30 dias', '31-60 dias', '61-90 dias', '+90 dias'];
    return order.map(name => ({ name, value: map[name] || 0 }));
  }, [inadimplencia]);

  // Detalhe do cliente selecionado
  const clientDetail = useMemo(() => {
    if (!selectedClient) return null;
    const cliente = clientes.find(c => c.Nome === selectedClient || c.NomeFantasia === selectedClient);
    if (!cliente) return null;

    const receitaCliente = faturamento
      .filter(f => f.Cliente === selectedClient)
      .reduce((s, f) => s + parseCurrency(f.ValorTotal), 0);

    const inadimpCliente = inadimplencia
      .filter(i => i.Cliente === selectedClient)
      .reduce((s, i) => s + parseCurrency(i.SaldoDevedor), 0);

    return { ...cliente, receitaTotal: receitaCliente, inadimplencia: inadimpCliente };
  }, [selectedClient, clientes, faturamento, inadimplencia]);

  // Merge filters for display
  const displayFilters = useMemo(() => {
    const merged = { ...filters };
    if (selectedClient) merged['cliente'] = [selectedClient];
    return merged;
  }, [filters, selectedClient]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-slate-900">Hub de Clientes</Title>
          <Text className="text-slate-500">Carteira, Rentabilidade e Retenção</Text>
        </div>
        <div className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full flex gap-2 font-medium">
          <Users className="w-4 h-4" /> {kpis.totalClientes} Clientes
        </div>
      </div>

      <FloatingClearButton onClick={clearAll} show={hasFilters} />
      <ChartFilterBadges 
        filters={displayFilters} 
        onClearFilter={(key, value) => {
          if (key === 'cliente') setSelectedClient(null);
          else clearFilter(key, value);
        }} 
        onClearAll={clearAll} 
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card decoration="top" decorationColor="blue">
          <Text>Clientes Ativos</Text>
          <Metric>{kpis.totalAtivos}</Metric>
          <Text className="text-xs text-slate-400">de {kpis.totalClientes} total</Text>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <Text>Veículos Locados</Text>
          <Metric>{kpis.totalVeiculos}</Metric>
          <Text className="text-xs text-slate-400">{kpis.avgVeiculos.toFixed(1)} por cliente</Text>
        </Card>
        <Card decoration="top" decorationColor="violet">
          <Text>Receita Total</Text>
          <Metric>{fmtCompact(kpis.totalReceita)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <Text>Ticket Médio</Text>
          <Metric>{fmtCompact(kpis.avgReceita)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="rose">
          <Text>Churn Rate</Text>
          <Metric>{kpis.churnRate.toFixed(1)}%</Metric>
          <Text className="text-xs text-slate-400">{kpis.encerrados} cancelados</Text>
        </Card>
        <Card decoration="top" decorationColor="orange">
          <Text>Inadimplência</Text>
          <Metric>{fmtCompact(kpis.totalInadimplente)}</Metric>
        </Card>
      </div>

      <Tabs defaultValue="ranking" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
          <TabsTrigger value="curva">Curva ABC</TabsTrigger>
          <TabsTrigger value="segmentacao">Segmentação</TabsTrigger>
          <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
          <TabsTrigger value="churn">Churn</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Top 15 Clientes por Receita (Clique para filtrar)</Title>
              <div className="mt-4 space-y-2 h-[400px] overflow-y-auto">
                {topReceita.map((item, idx) => {
                  const isSelected = selectedClient === item.name;
                  const maxVal = topReceita[0]?.value || 1;
                  const width = `${(item.value / maxVal) * 100}%`;
                  return (
                    <div
                      key={idx}
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          // Ctrl+click não faz sentido para seleção única de cliente
                          setSelectedClient(isSelected ? null : item.name);
                        } else {
                          setSelectedClient(isSelected ? null : item.name);
                        }
                      }}
                      className={`group cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
                    >
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`truncate max-w-[70%] font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                          {idx + 1}. {item.name}
                        </span>
                        <span className="font-bold text-blue-600">{fmtCompact(item.value)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-500 ${isSelected ? 'bg-blue-600' : 'bg-blue-400'}`} style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {clientDetail ? (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Title>{clientDetail.NomeFantasia || clientDetail.Nome}</Title>
                    <Text className="text-slate-500">{clientDetail.Documento}</Text>
                  </div>
                  <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600"><X /></button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex gap-2 text-slate-500 text-xs mb-1"><Car size={14} /> Veículos</div>
                    <div className="text-xl font-bold">{clientDetail.VeiculosLocados || 0}</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex gap-2 text-slate-500 text-xs mb-1"><DollarSign size={14} /> Receita</div>
                    <div className="text-xl font-bold text-blue-600">{fmtCompact(clientDetail.receitaTotal)}</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex gap-2 text-slate-500 text-xs mb-1"><Building2 size={14} /> Segmento</div>
                    <div className="text-lg font-medium">{clientDetail.Segmento || 'N/I'}</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex gap-2 text-slate-500 text-xs mb-1"><MapPin size={14} /> Local</div>
                    <div className="text-lg font-medium">{clientDetail.Cidade || 'N/I'} - {clientDetail.Estado || 'N/I'}</div>
                  </div>
                  <div className="p-3 bg-white rounded-lg shadow-sm col-span-2">
                    <div className="flex gap-2 text-slate-500 text-xs mb-1"><AlertTriangle size={14} /> Inadimplência</div>
                    <div className={`text-xl font-bold ${clientDetail.inadimplencia > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {fmtBRL(clientDetail.inadimplencia)}
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <Title>Distribuição por Segmento (Clique para filtrar)</Title>
                <div className="h-80 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={segmentoData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        onClick={(d, _, e) => handleChartClick('segmento', d.name, e as unknown as React.MouseEvent)}
                        cursor="pointer"
                      >
                        {segmentoData.map((entry, i) => (
                          <Cell 
                            key={i} 
                            fill={isValueSelected('segmento', entry.name) ? '#1d4ed8' : COLORS[i % COLORS.length]} 
                            stroke={isValueSelected('segmento', entry.name) ? '#1e3a8a' : 'none'}
                            strokeWidth={isValueSelected('segmento', entry.name) ? 2 : 0}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="curva" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Curva ABC de Clientes</Title>
              <Text className="text-slate-500 mb-4">Concentração de receita por cliente</Text>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={curvaABC} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                      {curvaABC.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <Title>Análise de Concentração</Title>
              <div className="mt-6 space-y-6">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <Text className="font-semibold text-emerald-800">Classe A</Text>
                      <Text className="text-sm text-emerald-600">{curvaABC[0]?.value || 0} clientes</Text>
                    </div>
                    <div className="text-right">
                      <Text className="text-2xl font-bold text-emerald-700">80%</Text>
                      <Text className="text-xs text-emerald-500">da receita</Text>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <Text className="font-semibold text-amber-800">Classe B</Text>
                      <Text className="text-sm text-amber-600">{curvaABC[1]?.value || 0} clientes</Text>
                    </div>
                    <div className="text-right">
                      <Text className="text-2xl font-bold text-amber-700">15%</Text>
                      <Text className="text-xs text-amber-500">da receita</Text>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <Text className="font-semibold text-rose-800">Classe C</Text>
                      <Text className="text-sm text-rose-600">{curvaABC[2]?.value || 0} clientes</Text>
                    </div>
                    <div className="text-right">
                      <Text className="text-2xl font-bold text-rose-700">5%</Text>
                      <Text className="text-xs text-rose-500">da receita</Text>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="segmentacao" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Clientes por Estado (Top 10)</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={estadoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="name" type="category" width={40} fontSize={12} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      onClick={(d, _, e) => handleChartClick('estado', d.name, e as unknown as React.MouseEvent)}
                      cursor="pointer"
                    >
                      {estadoData.map((entry) => (
                        <Cell key={entry.name} fill={isValueSelected('estado', entry.name) ? '#1d4ed8' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <Title>Clientes por Segmento</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={segmentoData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={80} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      radius={[4, 4, 0, 0]}
                      onClick={(d, _, e) => handleChartClick('segmento', d.name, e as unknown as React.MouseEvent)}
                      cursor="pointer"
                    >
                      {segmentoData.map((entry) => (
                        <Cell key={entry.name} fill={isValueSelected('segmento', entry.name) ? '#059669' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inadimplencia" className="space-y-6">
          <Card>
            <Title>Aging de Inadimplência</Title>
            <Text className="text-slate-500 mb-4">Distribuição por faixa de atraso</Text>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={fmtCompact} />
                  <Tooltip formatter={(v: any) => fmtBRL(v)} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer">
                    {agingData.map((_, i) => (
                      <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="churn" className="space-y-6">
          <Card>
            <div className="flex justify-between mb-4">
              <Title>Evolução de Churn (12 meses)</Title>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-rose-600">
                  <TrendingDown size={16} /> {kpis.encerrados} Cancelados
                </div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={churnTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="Cancelados" fill="#ef4444" radius={[4, 4, 0, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
