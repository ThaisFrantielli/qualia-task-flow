import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, BarChart, Bar, ComposedChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Clock, Target } from 'lucide-react';
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

// Colors used in charts

export default function SalesDashboard(): JSX.Element {
  const { data: rawVendas } = useBIData<AnyObject[]>('fat_vendas_*.json');

  const vendas = useMemo(() => {
    const raw = (rawVendas as any)?.data || rawVendas || [];
    return Array.isArray(raw) ? raw : [];
  }, [rawVendas]);

  const { filters, handleChartClick, clearFilter, clearAllFilters, hasActiveFilters, isValueSelected, getFilterValues } = useChartFilter();
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      const compradorValues = getFilterValues('comprador');
      const mesValues = getFilterValues('mes');
      const faixaValues = getFilterValues('faixa');
      
      if (compradorValues.length > 0 && !compradorValues.includes(v.Comprador)) return false;
      if (mesValues.length > 0 && !mesValues.includes(getMonthKey(v.DataVenda))) return false;
      if (faixaValues.length > 0) {
        const idade = parseNum(v.IdadeNaVenda);
        let faixa = '48m+';
        if (idade <= 12) faixa = '0-12m';
        else if (idade <= 24) faixa = '12-24m';
        else if (idade <= 36) faixa = '24-36m';
        else if (idade <= 48) faixa = '36-48m';
        if (!faixaValues.includes(faixa)) return false;
      }
      return true;
    });
  }, [vendas, filters, getFilterValues]);

  const financialKPIs = useMemo(() => {
    const totalVendas = filteredVendas.reduce((s, v) => s + parseCurrency(v.ValorVenda), 0);
    const totalCompras = filteredVendas.reduce((s, v) => s + parseCurrency(v.ValorCompra), 0);
    const margem = totalVendas - totalCompras;
    const roi = totalCompras > 0 ? (margem / totalCompras) * 100 : 0;
    const ticketMedio = filteredVendas.length > 0 ? totalVendas / filteredVendas.length : 0;
    const qtdVendas = filteredVendas.length;
    const comLucro = filteredVendas.filter(v => parseCurrency(v.ResultadoVenda) >= 0).length;
    const comPrejuizo = filteredVendas.filter(v => parseCurrency(v.ResultadoVenda) < 0).length;

    return { totalVendas, totalCompras, margem, roi, ticketMedio, qtdVendas, comLucro, comPrejuizo };
  }, [filteredVendas]);

  const evolutionData = useMemo(() => {
    const map: Record<string, { vendas: number; margem: number; qtd: number }> = {};
    filteredVendas.forEach(v => {
      const k = getMonthKey(v.DataVenda);
      if (!k) return;
      if (!map[k]) map[k] = { vendas: 0, margem: 0, qtd: 0 };
      map[k].vendas += parseCurrency(v.ValorVenda);
      map[k].margem += parseCurrency(v.ResultadoVenda);
      map[k].qtd += 1;
    });
    return Object.keys(map).sort().map(k => ({
      date: k,
      label: monthLabel(k),
      Vendas: map[k].vendas,
      Margem: map[k].margem,
      Qtd: map[k].qtd
    }));
  }, [filteredVendas]);

  const margemDistribution = useMemo(() => {
    let positiva = 0, negativa = 0;
    filteredVendas.forEach(v => {
      const margem = parseCurrency(v.ResultadoVenda);
      if (margem >= 0) positiva += margem;
      else negativa += Math.abs(margem);
    });
    return [
      { name: 'Lucro', value: positiva, fill: '#10b981' },
      { name: 'Prejuízo', value: negativa, fill: '#ef4444' }
    ];
  }, [filteredVendas]);

  const giroKPIs = useMemo(() => {
    const tempos = filteredVendas.map(v => {
      const idade = parseNum(v.IdadeNaVenda);
      return idade > 0 ? idade : 0;
    }).filter(d => d > 0);

    const tempoMedio = tempos.length > 0 ? tempos.reduce((s, t) => s + t, 0) / tempos.length : 0;
    const tempoMin = tempos.length > 0 ? Math.min(...tempos) : 0;
    const tempoMax = tempos.length > 0 ? Math.max(...tempos) : 0;
    const kms = filteredVendas.map(v => parseNum(v.KmNaVenda)).filter(k => k > 0);
    const kmMedio = kms.length > 0 ? kms.reduce((s, k) => s + k, 0) / kms.length : 0;

    return { tempoMedio, tempoMin, tempoMax, kmMedio };
  }, [filteredVendas]);

  const compradorRanking = useMemo(() => {
    const map: Record<string, { qtd: number; valor: number; margem: number }> = {};
    filteredVendas.forEach(v => {
      const c = v.Comprador || 'Desconhecido';
      if (!map[c]) map[c] = { qtd: 0, valor: 0, margem: 0 };
      map[c].qtd += 1;
      map[c].valor += parseCurrency(v.ValorVenda);
      map[c].margem += parseCurrency(v.ResultadoVenda);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [filteredVendas]);

  const tempoHistogram = useMemo(() => {
    const ranges = { '0-12m': 0, '12-24m': 0, '24-36m': 0, '36-48m': 0, '48m+': 0 };
    filteredVendas.forEach(v => {
      const idade = parseNum(v.IdadeNaVenda);
      if (idade <= 12) ranges['0-12m']++;
      else if (idade <= 24) ranges['12-24m']++;
      else if (idade <= 36) ranges['24-36m']++;
      else if (idade <= 48) ranges['36-48m']++;
      else ranges['48m+']++;
    });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [filteredVendas]);

  const margemPorIdade = useMemo(() => {
    const ranges: Record<string, { total: number; count: number }> = {
      '0-12m': { total: 0, count: 0 }, '12-24m': { total: 0, count: 0 }, '24-36m': { total: 0, count: 0 }, '36-48m': { total: 0, count: 0 }, '48m+': { total: 0, count: 0 }
    };
    filteredVendas.forEach(v => {
      const idade = parseNum(v.IdadeNaVenda);
      const margem = parseCurrency(v.ResultadoVenda);
      let key = '48m+';
      if (idade <= 12) key = '0-12m';
      else if (idade <= 24) key = '12-24m';
      else if (idade <= 36) key = '24-36m';
      else if (idade <= 48) key = '36-48m';
      ranges[key].total += margem;
      ranges[key].count += 1;
    });
    return Object.entries(ranges).map(([name, data]) => ({ name, MargemMedia: data.count > 0 ? data.total / data.count : 0 }));
  }, [filteredVendas]);

  const tableData = useMemo(() => {
    return filteredVendas.map(v => ({
      placa: v.Placa, modelo: v.Modelo, comprador: v.Comprador,
      compra: parseCurrency(v.ValorCompra), venda: parseCurrency(v.ValorVenda),
      margem: parseCurrency(v.ResultadoVenda), idade: parseNum(v.IdadeNaVenda),
      km: parseNum(v.KmNaVenda), dataVenda: v.DataVenda
    })).sort((a, b) => b.margem - a.margem);
  }, [filteredVendas]);

  const pageItems = tableData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title className="text-slate-900">Desmobilização de Ativos</Title>
          <Text className="text-slate-500">Resultado Financeiro e Giro de Estoque</Text>
        </div>
        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex gap-2 font-medium">
          <TrendingUp className="w-4 h-4" /> {financialKPIs.qtdVendas} Veículos Vendidos
        </div>
      </div>

      <FloatingClearButton onClick={clearAllFilters} show={hasActiveFilters} />
      <ChartFilterBadges filters={filters} onClearFilter={clearFilter} onClearAll={clearAllFilters} />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card decoration="top" decorationColor="emerald">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-emerald-600" /><Text>Margem Total</Text></div>
          <Metric className={financialKPIs.margem >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{fmtCompact(financialKPIs.margem)}</Metric>
          <Text className="text-xs text-slate-400">ROI: {financialKPIs.roi.toFixed(1)}%</Text>
        </Card>
        <Card decoration="top" decorationColor="blue"><Text>Total Vendas</Text><Metric>{fmtCompact(financialKPIs.totalVendas)}</Metric></Card>
        <Card decoration="top" decorationColor="violet"><Text>Ticket Médio</Text><Metric>{fmtCompact(financialKPIs.ticketMedio)}</Metric></Card>
        <Card decoration="top" decorationColor="cyan">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-cyan-600" /><Text>Idade Média</Text></div>
          <Metric>{giroKPIs.tempoMedio.toFixed(0)} meses</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-amber-600" /><Text>Com Lucro</Text></div>
          <Metric className="text-emerald-600">{financialKPIs.comLucro}</Metric>
        </Card>
        <Card decoration="top" decorationColor="rose">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-rose-600" /><Text>Com Prejuízo</Text></div>
          <Metric className="text-rose-600">{financialKPIs.comPrejuizo}</Metric>
        </Card>
      </div>

      <Tabs defaultValue="financeiro" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="giro">Giro (Tempo)</TabsTrigger>
          <TabsTrigger value="compradores">Compradores</TabsTrigger>
          <TabsTrigger value="detalhamento">Detalhamento</TabsTrigger>
        </TabsList>

        <TabsContent value="financeiro" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Evolução de Vendas e Margem</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} />
                    <Tooltip formatter={(v: any, name: string) => [name === 'Qtd' ? v : fmtBRL(v), name]} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="Vendas" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} name="Vendas" />
                    <Line yAxisId="left" type="monotone" dataKey="Margem" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Margem" />
                    <Bar yAxisId="right" dataKey="Qtd" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Quantidade" cursor="pointer" onClick={(d, _, e) => handleChartClick('mes', d.date, e as unknown as React.MouseEvent)}>
                      {evolutionData.map((entry, i) => <Cell key={i} fill={isValueSelected('mes', entry.date) ? '#d97706' : '#f59e0b'} />)}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <Title>Distribuição de Resultado</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={margemDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {margemDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtBRL(v)} />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-emerald-50 rounded-lg text-center">
                  <Text className="text-emerald-700 font-medium">Total Lucro</Text>
                  <Text className="text-xl font-bold text-emerald-600">{fmtCompact(margemDistribution[0]?.value || 0)}</Text>
                </div>
                <div className="p-3 bg-rose-50 rounded-lg text-center">
                  <Text className="text-rose-700 font-medium">Total Prejuízo</Text>
                  <Text className="text-xl font-bold text-rose-600">{fmtCompact(margemDistribution[1]?.value || 0)}</Text>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="giro" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card decoration="top" decorationColor="indigo"><Text>Idade Média na Venda</Text><Metric>{giroKPIs.tempoMedio.toFixed(0)} meses</Metric></Card>
            <Card decoration="top" decorationColor="emerald"><Text>Giro Rápido (Min)</Text><Metric>{giroKPIs.tempoMin} meses</Metric></Card>
            <Card decoration="top" decorationColor="rose"><Text>Giro Lento (Max)</Text><Metric>{giroKPIs.tempoMax} meses</Metric></Card>
            <Card decoration="top" decorationColor="amber"><Text>KM Médio na Venda</Text><Metric>{(giroKPIs.kmMedio / 1000).toFixed(0)}k</Metric></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Distribuição por Idade na Venda</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tempoHistogram}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Quantidade" cursor="pointer" onClick={(d, _, e) => handleChartClick('faixa', d.name, e as unknown as React.MouseEvent)}>
                      {tempoHistogram.map((entry, i) => <Cell key={i} fill={isValueSelected('faixa', entry.name) ? '#6d28d9' : '#8b5cf6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <Title>Margem Média por Faixa de Idade</Title>
              <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={margemPorIdade}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={fmtCompact} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} />
                    <Bar dataKey="MargemMedia" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d, _, e) => handleChartClick('faixa', d.name, e as unknown as React.MouseEvent)}>
                      {margemPorIdade.map((entry, i) => (
                        <Cell key={i} fill={isValueSelected('faixa', entry.name) ? (entry.MargemMedia >= 0 ? '#059669' : '#dc2626') : (entry.MargemMedia >= 0 ? '#10b981' : '#ef4444')} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compradores" className="space-y-6">
          <Card>
            <Title>Top 10 Compradores (Clique para filtrar)</Title>
            <div className="mt-4 space-y-3">
              {compradorRanking.map((item, idx) => {
                const isSelected = isValueSelected('comprador', item.name);
                const maxVal = compradorRanking[0]?.valor || 1;
                const width = `${(item.valor / maxVal) * 100}%`;
                return (
                  <div key={idx} onClick={(e) => handleChartClick('comprador', item.name, e)} className={`p-3 rounded cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'}`}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{idx + 1}. {item.name}</span>
                      <div className="flex gap-4">
                        <span className="text-slate-500">{item.qtd} veículos</span>
                        <span className="font-bold text-blue-600">{fmtCompact(item.valor)}</span>
                        <span className={`font-bold ${item.margem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{item.margem >= 0 ? '+' : ''}{fmtCompact(item.margem)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-blue-400'}`} style={{ width }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="detalhamento">
          <Card>
            <Title className="mb-4">Histórico de Vendas</Title>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                  <tr>
                    <th className="p-3">Placa</th><th className="p-3">Modelo</th><th className="p-3">Comprador</th>
                    <th className="p-3 text-right">Compra</th><th className="p-3 text-right">Venda</th>
                    <th className="p-3 text-right">Margem</th><th className="p-3 text-center">Idade</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pageItems.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3 font-mono">{row.placa}</td>
                      <td className="p-3 truncate max-w-[150px]">{row.modelo}</td>
                      <td className="p-3 truncate max-w-[150px] cursor-pointer hover:text-blue-600" onClick={(e) => handleChartClick('comprador', row.comprador, e)}>{row.comprador}</td>
                      <td className="p-3 text-right">{fmtBRL(row.compra)}</td>
                      <td className="p-3 text-right">{fmtBRL(row.venda)}</td>
                      <td className={`p-3 text-right font-bold ${row.margem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(row.margem)}</td>
                      <td className="p-3 text-center">{row.idade}m</td>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
