import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Filter, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  if (typeof v === 'string') {
    const s = v.replace(/[R$\s.]/g, '').replace(',', '.');
    return parseFloat(s) || 0;
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
  return fmtBRL(v);
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
export default function FinancialResult(): JSX.Element {
  // Hook de dados
  const { data: rawLancamentos } = useBIData<AnyObject[]>('fat_lancamentos_*.json');

  const lancamentos = useMemo(() => {
    if (!rawLancamentos) return [];
    if (Array.isArray(rawLancamentos)) return rawLancamentos as AnyObject[];
    if ((rawLancamentos as any).data && Array.isArray((rawLancamentos as any).data)) return (rawLancamentos as any).data;
    const keys = Object.keys(rawLancamentos as any);
    for (const k of keys) if (Array.isArray((rawLancamentos as any)[k])) return (rawLancamentos as any)[k];
    return [];
  }, [rawLancamentos]);

  // Estados de filtro
  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [selectedNaturezas, setSelectedNaturezas] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Listas para filtros
  const naturezas = useMemo(() => 
    Array.from(new Set(lancamentos.map((l: AnyObject) => l.Natureza).filter(Boolean))).sort() as string[],
    [lancamentos]
  );

  // Lançamentos filtrados
  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter((l: AnyObject) => {
      const comp = l.DataCompetencia || l.DataVencimento || l.Data;
      if (comp && dateFrom && comp < dateFrom) return false;
      if (comp && dateTo && comp > dateTo) return false;
      if (selectedNaturezas.length > 0 && !selectedNaturezas.includes(l.Natureza)) return false;
      return true;
    });
  }, [lancamentos, dateFrom, dateTo, selectedNaturezas]);

  // === KPIs ===
  const kpis = useMemo(() => {
    const receitas = filteredLancamentos
      .filter((l: AnyObject) => String(l.TipoLancamento || '').toLowerCase() === 'receber')
      .reduce((s: number, l: AnyObject) => s + parseCurrency(l.ValorLiquido || l.Valor), 0);

    const despesas = filteredLancamentos
      .filter((l: AnyObject) => String(l.TipoLancamento || '').toLowerCase() === 'pagar')
      .reduce((s: number, l: AnyObject) => s + parseCurrency(l.ValorLiquido || l.Valor), 0);

    const margem = receitas - despesas;
    const margemPerc = receitas > 0 ? (margem / receitas) * 100 : 0;

    return { receitas, despesas, margem, margemPerc };
  }, [filteredLancamentos]);

  // === GRÁFICO WATERFALL (Cascata) ===
  const waterfallData = useMemo(() => {
    const despesasPorNatureza: Record<string, number> = {};
    
    filteredLancamentos
      .filter((l: AnyObject) => String(l.TipoLancamento || '').toLowerCase() === 'pagar')
      .forEach((l: AnyObject) => {
        const nat = l.Natureza || 'Outros';
        despesasPorNatureza[nat] = (despesasPorNatureza[nat] || 0) + parseCurrency(l.ValorLiquido || l.Valor);
      });

    // Ordenar despesas por valor decrescente
    const despesasOrdenadas = Object.entries(despesasPorNatureza)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // Top 8 naturezas

    const data: Array<{ name: string; value: number; start: number; end: number; color: string }> = [];
    
    // Barra 1: Receita Total
    data.push({
      name: 'Receita Total',
      value: kpis.receitas,
      start: 0,
      end: kpis.receitas,
      color: '#10b981'
    });

    let acumulado = kpis.receitas;

    // Barras intermediárias: Despesas
    despesasOrdenadas.forEach(([natureza, valor]) => {
      const start = acumulado;
      acumulado -= valor;
      data.push({
        name: `(-) ${natureza}`,
        value: valor,
        start: acumulado,
        end: start,
        color: '#ef4444'
      });
    });

    // Barra final: Resultado Líquido
    data.push({
      name: 'Resultado Líquido',
      value: kpis.margem,
      start: 0,
      end: kpis.margem,
      color: kpis.margem >= 0 ? '#10b981' : '#ef4444'
    });

    return data;
  }, [filteredLancamentos, kpis]);

  // === TOP 5 DESPESAS (DonutChart) ===
  const top5Despesas = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLancamentos
      .filter((l: AnyObject) => String(l.TipoLancamento || '').toLowerCase() === 'pagar')
      .forEach((l: AnyObject) => {
        const nat = l.Natureza || 'Outros';
        map[nat] = (map[nat] || 0) + parseCurrency(l.ValorLiquido || l.Valor);
      });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredLancamentos]);

  // === EVOLUÇÃO MENSAL DA MARGEM ===
  const margemMensal = useMemo(() => {
    const map: Record<string, { receitas: number; despesas: number }> = {};

    filteredLancamentos.forEach((l: AnyObject) => {
      const k = getMonthKey(l.DataCompetencia || l.DataVencimento || l.Data);
      if (!k) return;
      if (!map[k]) map[k] = { receitas: 0, despesas: 0 };

      const valor = parseCurrency(l.ValorLiquido || l.Valor);
      const tipo = String(l.TipoLancamento || '').toLowerCase();

      if (tipo === 'receber') map[k].receitas += valor;
      else if (tipo === 'pagar') map[k].despesas += valor;
    });

    return Object.keys(map).sort().map(k => ({
      mes: monthLabel(k),
      receitas: map[k].receitas,
      despesas: map[k].despesas,
      margem: map[k].receitas - map[k].despesas
    }));
  }, [filteredLancamentos]);

  // === TABELA DETALHAMENTO ===
  const tableData = useMemo(() => {
    return filteredLancamentos.map((l: AnyObject) => ({
      data: l.DataCompetencia || l.DataVencimento || l.Data,
      natureza: l.Natureza || 'N/A',
      entidade: l.Cliente || l.Fornecedor || l.Entidade || 'N/A',
      valor: parseCurrency(l.ValorLiquido || l.Valor),
      tipo: String(l.TipoLancamento || '').toLowerCase(),
      descricao: l.Descricao || l.HistoricoPadrao || ''
    })).sort((a: any, b: any) => (b.data || '').localeCompare(a.data || ''));
  }, [filteredLancamentos]);

  const totalPages = Math.ceil(tableData.length / pageSize);
  const pageItems = tableData.slice((page - 1) * pageSize, page * pageSize);

  const clearFilters = () => {
    setDateFrom(`${currentYear}-01-01`);
    setDateTo(`${currentYear}-12-31`);
    setSelectedNaturezas([]);
    setPage(1);
  };

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title className="text-slate-900">DRE Gerencial</Title>
          <Text className="mt-1 text-slate-500">Demonstração do Resultado do Exercício - Análise de Receitas vs Despesas</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Resultado Econômico
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <Text className="font-medium text-slate-700">Filtros</Text>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Text className="text-xs text-slate-500 mb-1">Período de Competência</Text>
            <div className="flex gap-2 items-center">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                className="border border-slate-300 p-2 rounded-md w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                value={dateFrom} 
                onChange={e => setDateFrom(e.target.value)} 
              />
              <span className="text-slate-400">até</span>
              <input 
                type="date" 
                className="border border-slate-300 p-2 rounded-md w-full text-sm outline-none focus:ring-2 focus:ring-emerald-500" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
              />
            </div>
          </div>
          
          <div>
            <Text className="text-xs text-slate-500 mb-1">Natureza de Lançamento</Text>
            <select 
              multiple 
              className="w-full border border-slate-300 rounded-md p-2 text-sm h-10 outline-none focus:ring-2 focus:ring-emerald-500" 
              value={selectedNaturezas} 
              onChange={e => setSelectedNaturezas(Array.from(e.target.selectedOptions).map(o => o.value))}
            >
              {naturezas.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <button
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 w-full py-2 rounded-md text-sm transition-colors"
              onClick={clearFilters}
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card decoration="top" decorationColor="emerald" className="bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
            <Text className="text-slate-500">Receita Operacional</Text>
          </div>
          <Metric className="text-slate-900">{fmtBRL(kpis.receitas)}</Metric>
          <Text className="text-slate-500 text-sm mt-1">Total de entradas</Text>
        </Card>

        <Card decoration="top" decorationColor="red" className="bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <ArrowDownCircle className="w-5 h-5 text-red-600" />
            <Text className="text-slate-500">Custos Variáveis</Text>
          </div>
          <Metric className="text-slate-900">{fmtBRL(kpis.despesas)}</Metric>
          <Text className="text-slate-500 text-sm mt-1">Total de saídas</Text>
        </Card>

        <Card decoration="top" decorationColor={kpis.margem >= 0 ? 'emerald' : 'rose'} className="bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            {kpis.margem >= 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <Text className="text-slate-500">Margem de Contribuição</Text>
          </div>
          <Metric className={kpis.margem >= 0 ? 'text-emerald-700' : 'text-red-700'}>
            {fmtBRL(kpis.margem)}
          </Metric>
          <Text className={`text-sm mt-1 ${kpis.margem >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {kpis.margemPerc >= 0 ? '+' : ''}{kpis.margemPerc.toFixed(1)}% da receita
          </Text>
        </Card>
      </div>

      {/* Gráfico Waterfall */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Title className="text-slate-900 mb-2">Análise de Cascata - Formação do Resultado</Title>
        <Text className="text-slate-500 text-sm mb-4">
          Visualização da receita sendo consumida pelas despesas até chegar no resultado líquido
        </Text>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                stroke="#64748b" 
              />
              <YAxis 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={fmtCompact} 
                stroke="#64748b" 
              />
              <Tooltip 
                formatter={(v: any) => [fmtBRL(v), 'Valor']} 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} 
              />
              <Bar dataKey="start" stackId="a" fill="transparent" />
              <Bar dataKey="value" stackId="a">
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Gráficos Secundários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 5 Despesas */}
        <Card className="bg-white shadow-sm border border-slate-200">
          <Title className="text-slate-900">Top 5 Naturezas de Despesa</Title>
          <Text className="text-slate-500 text-sm mb-4">Maiores categorias de saída do período</Text>
          <DonutChart
            data={top5Despesas}
            category="value"
            index="name"
            valueFormatter={(v) => fmtBRL(v)}
            colors={['red', 'rose', 'orange', 'amber', 'yellow']}
            className="h-64"
          />
        </Card>

        {/* Evolução Mensal */}
        <Card className="bg-white shadow-sm border border-slate-200">
          <Title className="text-slate-900">Evolução da Margem Mensal</Title>
          <Text className="text-slate-500 text-sm mb-4">Tendência do resultado ao longo do tempo</Text>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={margemMensal} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="mes" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  stroke="#64748b" 
                />
                <YAxis 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={fmtCompact} 
                  stroke="#64748b" 
                />
                <Tooltip 
                  formatter={(v: any, name: any) => {
                    const labels: Record<string, string> = {
                      'receitas': 'Receitas',
                      'despesas': 'Despesas',
                      'margem': 'Margem'
                    };
                    return [fmtBRL(Number(v)), labels[name] || name];
                  }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="receitas" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={{ r: 3 }} 
                  name="receitas"
                />
                <Line 
                  type="monotone" 
                  dataKey="despesas" 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  dot={{ r: 3 }} 
                  name="despesas"
                />
                <Line 
                  type="monotone" 
                  dataKey="margem" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4 }} 
                  name="margem"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tabela de Detalhamento */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Title className="text-slate-900 mb-4">Detalhamento de Lançamentos</Title>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Natureza</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium text-right">Valor</th>
                <th className="px-4 py-3 font-medium text-center">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageItems.map((r: any, i: number) => (
                <tr key={`lanc-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-600">
                    {r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-medium">{r.natureza}</td>
                  <td className="px-4 py-3 text-slate-600 truncate max-w-xs">{r.entidade}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-sm">{r.descricao}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${r.tipo === 'receber' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fmtBRL(r.valor)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.tipo === 'receber' ? (
                      <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium">
                        <ArrowUpCircle className="w-3 h-3" />
                        Entrada
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                        <ArrowDownCircle className="w-3 h-3" />
                        Saída
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Nenhum lançamento encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-500">
            Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, tableData.length)} de {tableData.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors text-sm"
            >
              Anterior
            </button>
            <Text className="text-slate-600">Página {page} / {totalPages || 1}</Text>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-md bg-slate-100 text-slate-600 disabled:opacity-50 hover:bg-slate-200 transition-colors text-sm"
            >
              Próximo
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
