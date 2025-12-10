import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Bar, BarChart, Cell } from 'recharts';
import { TrendingUp, DollarSign, Clock, Users } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
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

function getMonthKey(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return '';
  return dateString.split('T')[0].substring(0, 7);
}

function monthLabel(ym: string): string {
  if (!ym || ym.length < 7) return ym;
  const [y, m] = ym.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${months[Number(m) - 1]}/${String(y).slice(2)}`;
}

// --- COMPONENTE PRINCIPAL ---
export default function SalesDashboard(): JSX.Element {
  // Hook de Dados
  const { data: rawVendas } = useBIData<AnyObject[]>('dim_vendas.json');

  const vendas: AnyObject[] = useMemo(() => {
    if (Array.isArray(rawVendas)) return rawVendas;
    return (rawVendas as any)?.data || [];
  }, [rawVendas]);

  // Estados
  const [activeTab, setActiveTab] = useState(0);
  const [selectedComprador, setSelectedComprador] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filtros
  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      if (selectedComprador && v.Comprador !== selectedComprador) return false;
      return true;
    });
  }, [vendas, selectedComprador]);

  // --- ABA 1: FINANCEIRO ---
  const financialKPIs = useMemo(() => {
    const totalVendas = filteredVendas.reduce((s, v) => s + parseCurrency(v.ValorVenda), 0);
    const totalCompras = filteredVendas.reduce((s, v) => s + parseCurrency(v.ValorCompra), 0);
    const margem = totalVendas - totalCompras;
    const percentualMargem = totalCompras > 0 ? (margem / totalCompras) * 100 : 0;
    const roi = totalCompras > 0 ? (margem / totalCompras) * 100 : 0;
    const ticketMedio = filteredVendas.length > 0 ? totalVendas / filteredVendas.length : 0;

    return { totalVendas, totalCompras, margem, percentualMargem, roi, ticketMedio, qtdVendas: filteredVendas.length };
  }, [filteredVendas]);

  // Evolução de Vendas (Mensal)
  const evolutionData = useMemo(() => {
    const map: Record<string, { Vendas: number, Margem: number }> = {};
    filteredVendas.forEach(v => {
      const k = getMonthKey(v.DataVenda);
      if (!k) return;
      if (!map[k]) map[k] = { Vendas: 0, Margem: 0 };
      map[k].Vendas += parseCurrency(v.ValorVenda);
      map[k].Margem += (parseCurrency(v.ValorVenda) - parseCurrency(v.ValorCompra));
    });
    return Object.keys(map).sort().map(k => ({
      date: k,
      label: monthLabel(k),
      ...map[k]
    }));
  }, [filteredVendas]);

  // Distribuição de Margem (Positiva vs Negativa)
  const margemDistribution = useMemo(() => {
    let positiva = 0;
    let negativa = 0;
    filteredVendas.forEach(v => {
      const margem = parseCurrency(v.ValorVenda) - parseCurrency(v.ValorCompra);
      if (margem >= 0) positiva += margem;
      else negativa += Math.abs(margem);
    });
    return [
      { name: 'Margem Positiva', value: positiva },
      { name: 'Prejuízo', value: negativa }
    ];
  }, [filteredVendas]);

  // --- ABA 2: GIRO (TEMPO DE CASA) ---
  const giroKPIs = useMemo(() => {
    const tempos = filteredVendas.map(v => {
      const compra = v.DataCompra ? new Date(v.DataCompra) : null;
      const venda = v.DataVenda ? new Date(v.DataVenda) : null;
      if (!compra || !venda) return 0;
      const diff = venda.getTime() - compra.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24)); // dias
    }).filter(d => d > 0);

    const tempoMedio = tempos.length > 0 ? tempos.reduce((s, t) => s + t, 0) / tempos.length : 0;
    const tempoMin = tempos.length > 0 ? Math.min(...tempos) : 0;
    const tempoMax = tempos.length > 0 ? Math.max(...tempos) : 0;

    return { tempoMedio, tempoMin, tempoMax };
  }, [filteredVendas]);

  // Ranking de Compradores (Top 10)
  const compradorRanking = useMemo(() => {
    const map: Record<string, { qtd: number, valor: number }> = {};
    filteredVendas.forEach(v => {
      const c = v.Comprador || 'Desconhecido';
      if (!map[c]) map[c] = { qtd: 0, valor: 0 };
      map[c].qtd += 1;
      map[c].valor += parseCurrency(v.ValorVenda);
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, value: data.valor, qtd: data.qtd }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredVendas]);

  // Histograma de Tempo de Casa
  const tempoHistogram = useMemo(() => {
    const ranges = { '0-90d': 0, '91-180d': 0, '181-365d': 0, '365d+': 0 };
    filteredVendas.forEach(v => {
      const compra = v.DataCompra ? new Date(v.DataCompra) : null;
      const venda = v.DataVenda ? new Date(v.DataVenda) : null;
      if (!compra || !venda) return;
      const diff = venda.getTime() - compra.getTime();
      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (dias <= 90) ranges['0-90d']++;
      else if (dias <= 180) ranges['91-180d']++;
      else if (dias <= 365) ranges['181-365d']++;
      else ranges['365d+']++;
    });
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [filteredVendas]);

  // Tabela Detalhada
  const tableData = useMemo(() => {
    return filteredVendas.map(v => {
      const compra = parseCurrency(v.ValorCompra);
      const venda = parseCurrency(v.ValorVenda);
      const margem = venda - compra;
      const percentualMargem = compra > 0 ? (margem / compra) * 100 : 0;

      const dataCompra = v.DataCompra ? new Date(v.DataCompra) : null;
      const dataVenda = v.DataVenda ? new Date(v.DataVenda) : null;
      const tempoCasa = dataCompra && dataVenda ? Math.floor((dataVenda.getTime() - dataCompra.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        placa: v.Placa,
        modelo: v.Modelo,
        comprador: v.Comprador || 'N/A',
        valorCompra: compra,
        valorVenda: venda,
        margem,
        percentualMargem,
        tempoCasa,
        dataVenda: v.DataVenda
      };
    }).sort((a, b) => b.margem - a.margem); // Ordem decrescente por margem
  }, [filteredVendas]);

  const pageItems = useMemo(() => tableData.slice((page - 1) * pageSize, page * pageSize), [tableData, page]);
  const totalPages = Math.max(1, Math.ceil(tableData.length / pageSize));

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">Dashboard de Desmobilização</Title>
          <Text className="mt-1 text-slate-500">Análise financeira e de giro das vendas de ativos</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Hub de Ativos
          </div>
        </div>
      </div>

      {/* Filtro Interativo */}
      {selectedComprador && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <Text className="text-blue-900 font-medium">Filtro Ativo: {selectedComprador}</Text>
              <Text className="text-blue-700 text-xs">Clique no botão para remover o filtro</Text>
            </div>
          </div>
          <button
            onClick={() => setSelectedComprador(null)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
          >
            Limpar Filtro
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
        {['Financeiro', 'Giro (Tempo de Casa)'].map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${activeTab === idx ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ABA 0: FINANCEIRO */}
      {activeTab === 0 && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card decoration="top" decorationColor="emerald" className="bg-white">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <Text className="text-slate-500">Margem Total</Text>
              </div>
              <Metric className={financialKPIs.margem >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {fmtCompact(financialKPIs.margem)}
              </Metric>
              <Text className="text-xs text-slate-400 mt-1">
                {financialKPIs.percentualMargem >= 0 ? '+' : ''}{financialKPIs.percentualMargem.toFixed(1)}%
              </Text>
            </Card>

            <Card decoration="top" decorationColor="blue" className="bg-white">
              <Text className="text-slate-500">Total Vendas</Text>
              <Metric className="text-slate-900">{fmtCompact(financialKPIs.totalVendas)}</Metric>
              <Text className="text-xs text-slate-400 mt-1">{financialKPIs.qtdVendas} veículos</Text>
            </Card>

            <Card decoration="top" decorationColor="violet" className="bg-white">
              <Text className="text-slate-500">ROI Médio</Text>
              <Metric className={financialKPIs.roi >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {financialKPIs.roi >= 0 ? '+' : ''}{financialKPIs.roi.toFixed(1)}%
              </Metric>
            </Card>

            <Card decoration="top" decorationColor="amber" className="bg-white">
              <Text className="text-slate-500">Ticket Médio</Text>
              <Metric className="text-slate-900">{fmtCompact(financialKPIs.ticketMedio)}</Metric>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border border-slate-200 shadow-sm">
              <Title className="text-slate-900">Evolução de Vendas e Margem</Title>
              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={fmtCompact} />
                    <Tooltip formatter={(v: any) => fmtBRL(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                    <Line type="monotone" dataKey="Vendas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Margem" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-sm">
              <Title className="text-slate-900">Distribuição de Margem</Title>
              <DonutChart
                className="mt-6 h-60"
                data={margemDistribution}
                category="value"
                index="name"
                valueFormatter={fmtCompact}
                colors={['emerald', 'rose']}
              />
              <div className="mt-4 text-center">
                <Text className="text-xs text-slate-500">
                  {margemDistribution[0].value > 0 && margemDistribution[1].value > 0
                    ? `Saldo Líquido: ${fmtBRL(margemDistribution[0].value - margemDistribution[1].value)}`
                    : 'Todas as vendas foram lucrativas'}
                </Text>
              </div>
            </Card>
          </div>

          {/* Ranking de Compradores */}
          <Card className="bg-white border border-slate-200 shadow-sm">
            <Title className="text-slate-900 mb-4">Top 10 Compradores (Clique para filtrar)</Title>
            <div className="space-y-2">
              {compradorRanking.map((item, idx) => {
                const isSelected = selectedComprador === item.name;
                const maxVal = Math.max(...compradorRanking.map(i => i.value));
                const width = `${(item.value / maxVal) * 100}%`;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedComprador(isSelected ? null : item.name)}
                    className={`group cursor-pointer p-3 rounded hover:bg-slate-50 transition-all ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                      }`}
                  >
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                        {item.name}
                      </span>
                      <div className="text-right">
                        <span className="text-slate-900 font-bold">{fmtCompact(item.value)}</span>
                        <span className="text-slate-500 text-xs ml-2">({item.qtd} veículos)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width }}
                        className={`h-full rounded-full transition-all duration-500 ${isSelected ? 'bg-blue-500' : 'bg-blue-400 group-hover:bg-blue-500'
                          }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ABA 1: GIRO */}
      {activeTab === 1 && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card decoration="top" decorationColor="indigo" className="bg-white">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <Text className="text-slate-500">Tempo Médio de Casa</Text>
              </div>
              <Metric className="text-slate-900">{giroKPIs.tempoMedio.toFixed(0)} dias</Metric>
              <Text className="text-xs text-slate-400 mt-1">~{(giroKPIs.tempoMedio / 30).toFixed(1)} meses</Text>
            </Card>

            <Card decoration="top" decorationColor="emerald" className="bg-white">
              <Text className="text-slate-500">Menor Tempo</Text>
              <Metric className="text-emerald-600">{giroKPIs.tempoMin} dias</Metric>
            </Card>

            <Card decoration="top" decorationColor="rose" className="bg-white">
              <Text className="text-slate-500">Maior Tempo</Text>
              <Metric className="text-rose-600">{giroKPIs.tempoMax} dias</Metric>
            </Card>
          </div>

          {/* Histograma */}
          <Card className="bg-white border border-slate-200 shadow-sm">
            <Title className="text-slate-900">Distribuição do Tempo de Casa</Title>
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tempoHistogram}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {tempoHistogram.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : index === 2 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Tabela Detalhada (Comum às duas abas) */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Title className="text-slate-900 mb-4">Detalhamento de Vendas</Title>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Placa</th>
                <th className="px-4 py-3 font-medium">Modelo</th>
                <th className="px-4 py-3 font-medium">Comprador</th>
                <th className="px-4 py-3 font-medium text-right">Valor Compra</th>
                <th className="px-4 py-3 font-medium text-right">Valor Venda</th>
                <th className="px-4 py-3 font-medium text-right">Margem R$</th>
                <th className="px-4 py-3 font-medium text-right">Margem %</th>
                <th className="px-4 py-3 font-medium text-right">Tempo Casa (dias)</th>
                <th className="px-4 py-3 font-medium text-center">Data Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((r, i) => (
                <tr key={`venda-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.placa}</td>
                  <td className="px-4 py-3 text-slate-600">{r.modelo}</td>
                  <td className="px-4 py-3 text-slate-600">{r.comprador}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmtBRL(r.valorCompra)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmtBRL(r.valorVenda)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${r.margem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.margem >= 0 ? '+' : ''}{fmtBRL(r.margem)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${r.percentualMargem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.percentualMargem >= 0 ? '+' : ''}{r.percentualMargem.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.tempoCasa}</td>
                  <td className="px-4 py-3 text-center text-slate-600">
                    {r.dataVenda ? new Date(r.dataVenda).toLocaleDateString('pt-BR') : 'N/A'}
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">
            Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, tableData.length)} de {tableData.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
            >
              Anterior
            </button>
            <Text className="text-slate-600">Página {page} / {totalPages}</Text>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
