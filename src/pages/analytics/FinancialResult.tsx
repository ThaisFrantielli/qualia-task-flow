import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Cell, Legend } from 'recharts';
import { TrendingUp, DollarSign, Filter, ArrowUpCircle, ArrowDownCircle, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number) { return `R$ ${(v / 1000).toFixed(0)}k`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string) { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

export default function FinancialResult(): JSX.Element {
  const { data: rawData } = useBIData<AnyObject[]>('fat_lancamentos_*.json');
  const data = useMemo(() => Array.isArray(rawData) ? rawData : (rawData as any)?.data || [], [rawData]);

  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);
  const [selectedNatureza, setSelectedNatureza] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const naturezas = useMemo(() => Array.from(new Set(data.map((l: AnyObject) => l.Natureza).filter(Boolean))).sort() as string[], [data]);

  const filteredData = useMemo(() => {
    return data.filter((l: AnyObject) => {
      const d = l.DataCompetencia || l.DataVencimento;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (selectedNatureza && l.Natureza !== selectedNatureza) return false;
      return true;
    });
  }, [data, dateFrom, dateTo, selectedNatureza]);

  const kpis = useMemo(() => {
    const receitas = filteredData.filter((l: AnyObject) => l.TipoLancamento === 'Receber').reduce((s: number, l: AnyObject) => s + parseCurrency(l.ValorLiquido), 0);
    const despesas = filteredData.filter((l: AnyObject) => l.TipoLancamento === 'Pagar').reduce((s: number, l: AnyObject) => s + parseCurrency(l.ValorLiquido), 0);
    const margem = receitas - despesas;
    const margemPerc = receitas > 0 ? (margem / receitas) * 100 : 0;
    return { receitas, despesas, margem, margemPerc };
  }, [filteredData]);

  const waterfallData = useMemo(() => {
    const despesasMap: Record<string, number> = {};
    filteredData.filter((l: AnyObject) => l.TipoLancamento === 'Pagar').forEach((l: AnyObject) => {
        const n = l.Natureza || 'Outros';
        despesasMap[n] = (despesasMap[n] || 0) + parseCurrency(l.ValorLiquido);
    });
    
    // Top 5 despesas + Outros
    const sorted = Object.entries(despesasMap).sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const outros = sorted.slice(5).reduce((s, i) => s + i[1], 0);

    const chartData = [{ name: 'Receita Total', value: kpis.receitas, start: 0, end: kpis.receitas, fill: '#10b981' }];
    let current = kpis.receitas;

    top5.forEach(([name, val]) => {
        const next = current - val;
        chartData.push({ name: `(-) ${name}`, value: val, start: next, end: current, fill: '#ef4444' });
        current = next;
    });

    if (outros > 0) {
        const next = current - outros;
        chartData.push({ name: '(-) Outras Despesas', value: outros, start: next, end: current, fill: '#ef4444' });
        current = next;
    }

    chartData.push({ name: 'Resultado Líquido', value: current, start: 0, end: current, fill: current >= 0 ? '#3b82f6' : '#ef4444' });

    return chartData;
  }, [filteredData, kpis.receitas]);

  const monthlyTrend = useMemo(() => {
    const map: Record<string, { rec: number, desp: number }> = {};
    filteredData.forEach((l: AnyObject) => {
        const k = getMonthKey(l.DataCompetencia);
        if (!k) return;
        if (!map[k]) map[k] = { rec: 0, desp: 0 };
        const val = parseCurrency(l.ValorLiquido);
        if (l.TipoLancamento === 'Receber') map[k].rec += val;
        else map[k].desp += val;
    });
    return Object.keys(map).sort().map(k => ({
        label: monthLabel(k),
        Receitas: map[k].rec,
        Despesas: map[k].desp,
        Margem: map[k].rec - map[k].desp
    }));
  }, [filteredData]);

  const topDespesas = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.filter((l: AnyObject) => l.TipoLancamento === 'Pagar').forEach((l: AnyObject) => {
        const n = l.Natureza || 'Outros';
        map[n] = (map[n] || 0) + parseCurrency(l.ValorLiquido);
    });
    return Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
  }, [filteredData]);

  const tableData = useMemo(() => {
    return filteredData.map((l: AnyObject) => ({
        data: l.DataCompetencia,
        natureza: l.Natureza,
        entidade: l.Cliente || l.Fornecedor || 'N/D',
        descricao: l.Descricao,
        valor: parseCurrency(l.ValorLiquido),
        tipo: l.TipoLancamento
    })).sort((a: any, b: any) => (b.data || '').localeCompare(a.data || ''));
  }, [filteredData]);

  const pageItems = tableData.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">DRE Gerencial</Title><Text className="text-slate-500">Resultado Econômico (Competência)</Text></div>
        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex gap-2 font-medium"><DollarSign className="w-4 h-4"/> Hub Financeiro</div>
      </div>

      <Card className="bg-white shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4"><Filter className="w-4 h-4 text-slate-500"/><Text className="font-medium text-slate-700">Filtros</Text></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <Text className="text-xs text-slate-500 mb-1">Período (Competência)</Text>
                <div className="flex gap-2">
                    <input type="date" className="border p-2 rounded text-sm w-full" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    <input type="date" className="border p-2 rounded text-sm w-full" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
            </div>
            <div>
                <Text className="text-xs text-slate-500 mb-1">Natureza (Opcional)</Text>
                <select className="border p-2 rounded text-sm w-full" value={selectedNatureza || ''} onChange={e => setSelectedNatureza(e.target.value || null)}>
                    <option value="">Todas</option>
                    {naturezas.map((n: string) => <option key={n} value={n}>{n}</option>)}
                </select>
            </div>
            <div className="flex items-end">
                {selectedNatureza && <button onClick={() => setSelectedNatureza(null)} className="bg-slate-100 px-4 py-2 rounded text-sm hover:bg-slate-200 flex gap-2"><X size={14}/> Limpar Natureza</button>}
            </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card decoration="top" decorationColor="emerald">
            <div className="flex items-center gap-2 mb-2"><ArrowUpCircle className="w-5 h-5 text-emerald-600"/><Text>Receita Operacional</Text></div>
            <Metric>{fmtBRL(kpis.receitas)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="rose">
            <div className="flex items-center gap-2 mb-2"><ArrowDownCircle className="w-5 h-5 text-rose-600"/><Text>Custos e Despesas</Text></div>
            <Metric>{fmtBRL(kpis.despesas)}</Metric>
        </Card>
        <Card decoration="top" decorationColor={kpis.margem >= 0 ? 'blue' : 'rose'}>
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-blue-600"/><Text>Resultado Líquido</Text></div>
            <Metric className={kpis.margem >= 0 ? 'text-blue-600' : 'text-rose-600'}>{fmtBRL(kpis.margem)}</Metric>
            <Text className="text-xs text-slate-400 mt-1">{kpis.margemPerc.toFixed(1)}% de margem</Text>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <Title>Formação do Resultado (Waterfall)</Title>
            <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={waterfallData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" height={60}/>
                        <YAxis fontSize={12} tickFormatter={fmtCompact}/>
                        <Tooltip formatter={fmtBRL}/>
                        <Bar dataKey="start" stackId="a" fill="transparent" />
                        <Bar dataKey="value" stackId="a">
                            {waterfallData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
        <Card>
            <Title>Evolução Mensal</Title>
            <div className="h-72 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="label" fontSize={12}/>
                        <YAxis fontSize={12} tickFormatter={fmtCompact}/>
                        <Tooltip formatter={fmtBRL}/>
                        <Legend/>
                        <Line type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={2} dot={{r:3}}/>
                        <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} dot={{r:3}}/>
                        <Line type="monotone" dataKey="Margem" stroke="#3b82f6" strokeWidth={3} dot={{r:4}}/>
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <Title>Top Naturezas (Despesas)</Title>
            <div className="mt-4 h-64 overflow-y-auto">
                <BarList data={topDespesas} valueFormatter={fmtBRL} color="rose" />
            </div>
        </Card>
        <Card>
            <Title>Resumo por Tipo</Title>
            <div className="mt-4 flex flex-col gap-4">
                <div className="flex justify-between border-b pb-2">
                    <Text>Receitas</Text>
                    <Text className="font-bold text-emerald-600">{fmtBRL(kpis.receitas)}</Text>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <Text>Despesas</Text>
                    <Text className="font-bold text-rose-600">{fmtBRL(kpis.despesas)}</Text>
                </div>
                <div className="flex justify-between pt-2">
                    <Text className="font-bold">Saldo</Text>
                    <Text className={`font-bold ${kpis.margem >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>{fmtBRL(kpis.margem)}</Text>
                </div>
            </div>
        </Card>
      </div>

      <Card>
        <Title className="mb-4">Detalhamento de Lançamentos</Title>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <tr><th className="p-3">Data</th><th className="p-3">Natureza</th><th className="p-3">Entidade</th><th className="p-3">Descrição</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Tipo</th></tr>
                </thead>
                <tbody className="divide-y">
                    {pageItems.map((r: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 whitespace-nowrap">{r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '-'}</td>
                            <td className="p-3 font-medium text-slate-700">{r.natureza}</td>
                            <td className="p-3 truncate max-w-[200px]">{r.entidade}</td>
                            <td className="p-3 truncate max-w-[250px] text-xs text-slate-500">{r.descricao}</td>
                            <td className={`p-3 text-right font-bold ${r.tipo === 'Receber' ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(r.valor)}</td>
                            <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs ${r.tipo === 'Receber' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{r.tipo}</span></td>
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