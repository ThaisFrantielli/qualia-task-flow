import { useMemo } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { AlertCircle, DollarSign } from 'lucide-react';

type AnyObject = { [k: string]: any };

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseDate(v?: string | null) {
  if (!v) return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) return null;
  return d;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function daysBetweenInclusive(a: Date, b: Date) {
  if (b < a) return 0;
  return Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY) + 1;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const mi = Number(m) - 1;
  return `${months[mi]}/${String(y).slice(2)}`;
}

function fmtBRL(v: number) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  } catch (e) {
    return String(v);
  }
}

export default function RevenueGap(): JSX.Element {
  const { data: contratosData } = useBIData<AnyObject[]>('contratos_ativos.json');
  const { data: financeiroData } = useBIData<AnyObject[]>('financeiro_completo.json');

  // normalize payloads
  const contratos: AnyObject[] = useMemo(() => {
    if (!contratosData) return [];
    if (Array.isArray(contratosData)) return contratosData as AnyObject[];
    if ((contratosData as any).data && Array.isArray((contratosData as any).data)) return (contratosData as any).data;
    const keys = Object.keys(contratosData as any);
    for (const k of keys) if (Array.isArray((contratosData as any)[k])) return (contratosData as any)[k];
    return [];
  }, [contratosData]);

  const financeiro: AnyObject[] = useMemo(() => {
    if (!financeiroData) return [];
    if (Array.isArray(financeiroData)) return financeiroData as AnyObject[];
    if ((financeiroData as any).data && Array.isArray((financeiroData as any).data)) return (financeiroData as any).data;
    const keys = Object.keys(financeiroData as any);
    for (const k of keys) if (Array.isArray((financeiroData as any)[k])) return (financeiroData as any)[k];
    return [];
  }, [financeiroData]);

  // Create last 12 months array (ending in current month)
  const months = useMemo(() => {
    const res: { key: string; start: Date; end: Date }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const s = startOfMonth(d);
      const e = endOfMonth(d);
      res.push({ key: monthKey(d), start: s, end: e });
    }
    return res;
  }, []);

  // For each month calculate previsto (pro-rata) and realizado
  const { byMonth, contractGaps } = useMemo(() => {
    const byMonthMap: Record<string, { previsto: number; realizado: number }> = {};
    months.forEach(m => byMonthMap[m.key] = { previsto: 0, realizado: 0 });

    // PREVISTO: iterate contratos price histories
    const contractGaps: Record<string, any> = {};
    contratos.forEach((c) => {
      const histories: AnyObject[] = [];
      if (Array.isArray(c.priceHistory)) histories.push(...c.priceHistory);
      if (Array.isArray(c.hist)) histories.push(...c.hist);
      if (!histories.length && (c.ValorVigente !== undefined || c.InicioVigenciaPreco)) histories.push(c);

      histories.forEach((h) => {
        const valor = Number(h.ValorVigente || 0) || 0;
        const inicioV = parseDate(h.InicioVigenciaPreco || h.InicioVigencia || h.Inicio || c.InicioVigenciaPreco || c.InicioVigencia || c.InicioContrato);
        const fimV = parseDate(h.FimVigenciaPreco || h.FimVigencia || h.Fim || null);

        const inicioContrato = parseDate(c.InicioContrato || c.DataInicio || c.Inicio || null);
        const fimContrato = parseDate(c.FimContrato || c.DataFim || c.Fim || null);

        months.forEach(m => {
          if (!inicioV) return;
          const priceActive = (inicioV.getTime() <= m.end.getTime()) && (fimV === null || fimV.getTime() >= m.start.getTime());
          if (!priceActive) return;
          const contratoActive = (!inicioContrato || inicioContrato.getTime() <= m.end.getTime()) && (!fimContrato || fimContrato.getTime() >= m.start.getTime());
          if (!contratoActive) return;

          const interStart = new Date(Math.max(m.start.getTime(), inicioV.getTime(), (inicioContrato || m.start).getTime()));
          const endCandidates = [m.end.getTime(), (fimV ? fimV.getTime() : m.end.getTime()), (fimContrato ? fimContrato.getTime() : m.end.getTime())];
          const interEnd = new Date(Math.min(...endCandidates));
          const daysActive = daysBetweenInclusive(interStart, interEnd);
          if (daysActive <= 0) return;
          const daysInMonth = daysBetweenInclusive(m.start, m.end);
          const prorata = (valor / daysInMonth) * daysActive;
          byMonthMap[m.key].previsto += prorata;

          const cid = String(c.ContratoID || c.ID || c.Id || c.Contrato || c.NumeroContrato || 'Unknown');
          if (!contractGaps[cid]) contractGaps[cid] = { id: cid, cliente: c.Cliente || c.Nome || 'Sem Cliente', previsto: 0, realizado: 0 };
          contractGaps[cid].previsto += prorata;
        });
      });
    });

    // REALIZADO: sum ValorLocacao per month
    financeiro.forEach((f) => {
      const d = parseDate(f.DataCompetencia || f.Data || f.DataEmissao);
      if (!d) return;
      const key = monthKey(d);
      if (!byMonthMap[key]) return;
      byMonthMap[key].realizado += Number(f.ValorLocacao || f.ValorTotal || 0) || 0;
      const cid = String(f.ContratoID || f.Contrato || f.IdContrato || f.ContratoId || 'Unknown');
      if (!contractGaps[cid]) contractGaps[cid] = { id: cid, cliente: f.Cliente || 'Sem Cliente', previsto: 0, realizado: 0 };
      contractGaps[cid].realizado += Number(f.ValorLocacao || f.ValorTotal || 0) || 0;
    });

    const byMonthArr = months.map(m => ({ key: m.key, label: monthLabel(m.key), previsto: Number((byMonthMap[m.key].previsto || 0).toFixed(2)), realizado: Number((byMonthMap[m.key].realizado || 0).toFixed(2)) }));
    const contractGapsArr = Object.values(contractGaps).map((c: any) => ({ ...c, gap: Number((c.previsto - c.realizado).toFixed(2)) }));

    return { byMonth: byMonthArr, contractGaps: contractGapsArr };
  }, [contratos, financeiro, months]);

  // Gap acumulado do ano (current year)
  const gapAcumuladoAno = useMemo(() => {
    const year = new Date().getFullYear();
    return byMonth.filter(b => Number(b.key.split('-')[0]) === year).reduce((s, b) => s + (b.previsto - b.realizado), 0);
  }, [byMonth]);

  // Top gaps
  const topGaps = useMemo(() => (contractGaps as any[]).sort((a: any, b: any) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 10), [contractGaps]);

  // Data for chart
  const chartData = byMonth.map(b => ({ name: b.label, Realizado: Math.round(b.realizado), Previsto: Math.round(b.previsto) }));

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title className="text-slate-900">Gap de Faturamento (Revenue Gap)</Title>
          <Text className="mt-1 text-slate-500">Comparação entre faturamento previsto (pro-rata) e realizado — últimos 12 meses.</Text>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Hub Financeiro
          </div>
        </div>
      </div>

      {/* Main Chart and KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-white shadow-sm border border-slate-200">
          <Title className="text-slate-900">Evolução Mensal — Realizado vs Previsto</Title>
          <div className="h-96 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: any) => [fmtBRL(Number(v)), 'Valor']}
                />
                <Legend />
                <Bar dataKey="Realizado" barSize={20} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Previsto" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-white shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-50">
              <AlertCircle className="text-blue-600" size={20} />
            </div>
            <div>
              <Text className="text-slate-500 text-sm">Gap Acumulado (Ano)</Text>
              <Metric className={gapAcumuladoAno < 0 ? 'text-red-600' : 'text-emerald-600'}>
                {fmtBRL(gapAcumuladoAno)}
              </Metric>
            </div>
          </div>
          <Text className="text-sm text-slate-500">
            Soma dos gaps mensais do ano atual (Previsto - Realizado).
          </Text>

          <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-100">
            <Text className="text-xs font-medium text-slate-600 mb-2">Observações</Text>
            <Text className="text-xs text-slate-500">
              Algoritmo pro-rata considera vigência de preço e vigência do contrato para cada mês. Ajustes retroativos respeitados pelo histórico de preços.
            </Text>
          </div>
        </Card>
      </div>

      {/* Top Gaps Table */}
      <Card className="bg-white shadow-sm border border-slate-200">
        <Title className="text-slate-900 mb-4">Top Gaps (maiores diferenças)</Title>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Contrato</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium text-right">Previsto</th>
                <th className="px-4 py-3 font-medium text-right">Realizado</th>
                <th className="px-4 py-3 font-medium text-right">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topGaps.map((g: any, i: number) => (
                <tr key={`gap-${i}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{g.id}</td>
                  <td className="px-4 py-3 text-slate-600">{g.cliente}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium">{fmtBRL(g.previsto)}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium">{fmtBRL(g.realizado)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${g.gap < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {fmtBRL(g.gap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
