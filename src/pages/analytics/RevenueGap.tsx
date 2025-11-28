import React, { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

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
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const mi = Number(m) - 1;
  return `${months[mi]}/${String(y).slice(2)}`;
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
      // price history items may be embedded or the row itself may contain ValorVigente+InicioVigenciaPreco
      // Support two shapes: array c.priceHistory or c.hist or single record
      const histories: AnyObject[] = [];
      if (Array.isArray(c.priceHistory)) histories.push(...c.priceHistory);
      if (Array.isArray(c.hist)) histories.push(...c.hist);
      // if record itself has ValorVigente treat it as one
      if (!histories.length && (c.ValorVigente !== undefined || c.InicioVigenciaPreco)) histories.push(c);

      histories.forEach((h) => {
        const valor = Number(h.ValorVigente || 0) || 0;
        const inicioV = parseDate(h.InicioVigenciaPreco || h.InicioVigencia || h.Inicio || c.InicioVigenciaPreco || c.InicioVigencia || c.InicioContrato);
        const fimV = parseDate(h.FimVigenciaPreco || h.FimVigencia || h.Fim || null);

        const inicioContrato = parseDate(c.InicioContrato || c.DataInicio || c.Inicio || null);
        const fimContrato = parseDate(c.FimContrato || c.DataFim || c.Fim || null);

        months.forEach(m => {
          // price must be active in month
          if (!inicioV) return; // unknown start -> skip
          const priceActive = (inicioV.getTime() <= m.end.getTime()) && (fimV === null || fimV.getTime() >= m.start.getTime());
          if (!priceActive) return;
          // contrato active
          const contratoActive = (!inicioContrato || inicioContrato.getTime() <= m.end.getTime()) && (!fimContrato || fimContrato.getTime() >= m.start.getTime());
          if (!contratoActive) return;

          // intersection start = max(inicioV, inicioContrato, m.start)
          const interStart = new Date(Math.max(m.start.getTime(), inicioV.getTime(), (inicioContrato || m.start).getTime()));
          // intersection end = min(fimV||m.end, fimContrato||m.end, m.end)
          const endCandidates = [m.end.getTime(), (fimV ? fimV.getTime() : m.end.getTime()), (fimContrato ? fimContrato.getTime() : m.end.getTime())];
          const interEnd = new Date(Math.min(...endCandidates));
          const daysActive = daysBetweenInclusive(interStart, interEnd);
          if (daysActive <= 0) return;
          const daysInMonth = daysBetweenInclusive(m.start, m.end);
          const prorata = (valor / daysInMonth) * daysActive;
          byMonthMap[m.key].previsto += prorata;

          // attribute gap per contract id
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
      if (!byMonthMap[key]) return; // outside 12 months
      byMonthMap[key].realizado += Number(f.ValorLocacao || f.ValorTotal || 0) || 0;
      // also attribute to contract if possible
      const cid = String(f.ContratoID || f.Contrato || f.IdContrato || f.ContratoId || 'Unknown');
      if (!contractGaps[cid]) contractGaps[cid] = { id: cid, cliente: f.Cliente || 'Sem Cliente', previsto: 0, realizado: 0 };
      contractGaps[cid].realizado += Number(f.ValorLocacao || f.ValorTotal || 0) || 0;
    });

    const byMonthArr = months.map(m => ({ key: m.key, label: monthLabel(m.key), previsto: Number((byMonthMap[m.key].previsto || 0).toFixed(2)), realizado: Number((byMonthMap[m.key].realizado || 0).toFixed(2)) }));

    // compute contract gaps array
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

  // Data for chart: realizado (bar) e previsto (line)
  const chartData = byMonth.map(b => ({ name: b.label, Realizado: Math.round(b.realizado), Previsto: Math.round(b.previsto) }));

  return (
    <div className="bg-slate-50 p-6 min-h-screen">
      <div>
        <Title>Gap de Faturamento (Revenue Gap)</Title>
        <Text className="mt-1">Comparação entre faturamento previsto (pro-rata) e realizado — últimos 12 meses.</Text>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <Text className="mb-2">Evolução Mensal — Realizado vs Previsto</Text>
          <div style={{ width: '100%', height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v:any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)), 'Valor']} />
                <Legend />
                <Bar dataKey="Realizado" barSize={20} fill="#2563eb" />
                <Line type="monotone" dataKey="Previsto" stroke="#6b7280" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <Text className="text-sm">Gap Acumulado (ano)</Text>
          <Metric className={gapAcumuladoAno < 0 ? 'text-red-600' : 'text-emerald-600'}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(gapAcumuladoAno)}</Metric>
          <Text className="mt-2 text-sm text-gray-600">Soma dos gaps mensais do ano atual (Previsto - Realizado).</Text>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <Title>Top Gaps (maiores diferenças)</Title>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="text-left p-2">Contrato</th>
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-right p-2">Previsto</th>
                  <th className="text-right p-2">Realizado</th>
                  <th className="text-right p-2">Gap</th>
                </tr>
              </thead>
              <tbody>
                {topGaps.map((g: any, i: number) => (
                  <tr key={`gap-${i}`} className="border-t">
                    <td className="p-2">{g.id}</td>
                    <td className="p-2">{g.cliente}</td>
                    <td className="p-2 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.previsto)}</td>
                    <td className="p-2 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.realizado)}</td>
                    <td className={`p-2 text-right ${g.gap < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.gap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <Title>Observações</Title>
          <Text className="text-sm mt-2">Algoritmo pro-rata considera vigência de preço e vigência do contrato para cada mês. Ajustes retroativos respeitados pelo histórico de preços.</Text>
        </Card>
      </div>
    </div>
  );
}
