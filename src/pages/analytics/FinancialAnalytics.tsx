import React, { useMemo, useState, useCallback } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

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

function fmtBRL(v: number) {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
  catch (e) { return String(v); }
}

export default function FinancialAnalytics(): JSX.Element {
  // Data sources
  const { data: financeiroData } = useBIData<AnyObject[]>('financeiro_completo.json');
  const { data: contratosData } = useBIData<AnyObject[]>('contratos_ativos.json');

  // Normalize payloads
  const financeiro: AnyObject[] = useMemo(() => {
    if (!financeiroData) return [];
    if (Array.isArray(financeiroData)) return financeiroData as AnyObject[];
    if ((financeiroData as any).data && Array.isArray((financeiroData as any).data)) return (financeiroData as any).data;
    const keys = Object.keys(financeiroData as any);
    for (const k of keys) if (Array.isArray((financeiroData as any)[k])) return (financeiroData as any)[k];
    return [];
  }, [financeiroData]);

  const contratos: AnyObject[] = useMemo(() => {
    if (!contratosData) return [];
    if (Array.isArray(contratosData)) return contratosData as AnyObject[];
    if ((contratosData as any).data && Array.isArray((contratosData as any).data)) return (contratosData as any).data;
    const keys = Object.keys(contratosData as any);
    for (const k of keys) if (Array.isArray((contratosData as any)[k])) return (contratosData as any)[k];
    return [];
  }, [contratosData]);

  // Filters used in Visão Geral (tab 1)
  const clientes = useMemo(() => Array.from(new Set(financeiro.map(r => r.Cliente).filter(Boolean))), [financeiro]);
  const situacoes = useMemo(() => Array.from(new Set(financeiro.map(r => r.SituacaoNota).filter(Boolean))), [financeiro]);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedSituacoes, setSelectedSituacoes] = useState<string[]>([]);

  const filteredFin = useMemo(() => {
    return financeiro.filter((r) => {
      if (dateFrom) {
        const d = r.DataCompetencia ? new Date(r.DataCompetencia) : null;
        if (!d) return false;
        if (d < new Date(dateFrom + 'T00:00:00')) return false;
      }
      if (dateTo) {
        const d = r.DataCompetencia ? new Date(r.DataCompetencia) : null;
        if (!d) return false;
        if (d > new Date(dateTo + 'T23:59:59')) return false;
      }
      if (selectedClientes.length > 0 && !selectedClientes.includes(String(r.Cliente || ''))) return false;
      if (selectedSituacoes.length > 0 && !selectedSituacoes.includes(String(r.SituacaoNota || ''))) return false;
      return true;
    });
  }, [financeiro, dateFrom, dateTo, selectedClientes, selectedSituacoes]);

  // KPIs for Visão Geral
  const faturamentoLocacao = useMemo(() => filteredFin.reduce((s, r) => s + (Number(r.ValorLocacao) || 0), 0), [filteredFin]);
  const totalFaturado = useMemo(() => filteredFin.reduce((s, r) => s + (Number(r.ValorTotal) || 0), 0), [filteredFin]);
  const totalVeiculos = useMemo(() => filteredFin.reduce((s, r) => s + (Number(r.QtdVeiculos) || 0), 0), [filteredFin]);
  const ticketMedio = totalVeiculos > 0 ? (totalFaturado / totalVeiculos) : 0;

  // Monthly aggregations used both in Visão Geral and Gap
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

  // Monthly data: previsto (from contratos) and realizado (from financeiro)
  const { byMonth, contractMonthlyMap } = useMemo(() => {
    const byMonthMap: Record<string, { previsto: number; realizado: number }> = {};
    months.forEach(m => byMonthMap[m.key] = { previsto: 0, realizado: 0 });

    const contractMonthlyMap: Record<string, Record<string, { previsto: number }>> = {};

    // Previsto
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
          if (!contractMonthlyMap[cid]) contractMonthlyMap[cid] = {};
          if (!contractMonthlyMap[cid][m.key]) contractMonthlyMap[cid][m.key] = { previsto: 0 };
          contractMonthlyMap[cid][m.key].previsto += prorata;
        });
      });
    });

    // Realizado
    financeiro.forEach((f) => {
      const d = parseDate(f.DataCompetencia || f.Data || f.DataEmissao);
      if (!d) return;
      const key = monthKey(d);
      if (!byMonthMap[key]) return;
      const val = Number(f.ValorLocacao || f.ValorTotal || 0) || 0;
      byMonthMap[key].realizado += val;

      const cid = String(f.ContratoID || f.Contrato || f.IdContrato || f.ContratoId || 'Unknown');
      if (!contractMonthlyMap[cid]) contractMonthlyMap[cid] = {};
      if (!contractMonthlyMap[cid][key]) contractMonthlyMap[cid][key] = { previsto: 0 };
      // store realized for drill attribution if needed
      (contractMonthlyMap[cid][key] as any).realizado = ((contractMonthlyMap[cid][key] as any).realizado || 0) + val;
    });

    const byMonthArr = months.map(m => ({ key: m.key, label: monthLabel(m.key), previsto: Number((byMonthMap[m.key].previsto || 0).toFixed(2)), realizado: Number((byMonthMap[m.key].realizado || 0).toFixed(2)) }));
    return { byMonth: byMonthArr, contractMonthlyMap };
  }, [contratos, financeiro, months]);

  // State for selected month (drill-down)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Chart click handler (onValueChange semantic)
  const handleChartValueChange = useCallback((payload: any) => {
    // payload expected to contain key like '2024-03' or label; we'll map label back to key
    if (!payload) return;
    const key = payload.key || payload.monthKey || payload.name || null;
    if (!key) return;
    setSelectedMonth(key);
  }, []);

  // Recharts onBarClick will pass data payload; we map to month key
  function onBarClick(data: any, index: number) {
    // data has payload with name label; map back to key by searching byMonth
    const label = data?.payload?.label ?? data?.payload?.name ?? data?.name;
    if (!label) return;
    const found = byMonth.find(b => b.label === label || b.key === label);
    if (found) setSelectedMonth(found.key);
  }

  // Drill-down: contracts active in selectedMonth
  const contractsActiveInSelectedMonth = useMemo(() => {
    if (!selectedMonth) return [];
    const m = months.find(mm => mm.key === selectedMonth);
    if (!m) return [];
    const res: AnyObject[] = [];
    contratos.forEach(c => {
      const inicioContrato = parseDate(c.InicioContrato || c.DataInicio || c.Inicio || null);
      const fimContrato = parseDate(c.FimContrato || c.DataFim || c.Fim || null);
      const contratoActive = (!inicioContrato || inicioContrato.getTime() <= m.end.getTime()) && (!fimContrato || fimContrato.getTime() >= m.start.getTime());
      if (!contratoActive) return;

      // compute pro-rata for this month by scanning price histories
      let prorataTotal = 0;
      const histories: AnyObject[] = [];
      if (Array.isArray(c.priceHistory)) histories.push(...c.priceHistory);
      if (Array.isArray(c.hist)) histories.push(...c.hist);
      if (!histories.length && (c.ValorVigente !== undefined || c.InicioVigenciaPreco)) histories.push(c);

      histories.forEach(h => {
        const valor = Number(h.ValorVigente || 0) || 0;
        const inicioV = parseDate(h.InicioVigenciaPreco || h.InicioVigencia || h.Inicio || c.InicioVigenciaPreco || c.InicioVigencia || c.InicioContrato);
        const fimV = parseDate(h.FimVigenciaPreco || h.FimVigencia || h.Fim || null);
        if (!inicioV) return;
        const priceActive = (inicioV.getTime() <= m.end.getTime()) && (fimV === null || fimV.getTime() >= m.start.getTime());
        if (!priceActive) return;
        const interStart = new Date(Math.max(m.start.getTime(), inicioV.getTime(), (inicioContrato || m.start).getTime()));
        const endCandidates = [m.end.getTime(), (fimV ? fimV.getTime() : m.end.getTime()), (fimContrato ? fimContrato.getTime() : m.end.getTime())];
        const interEnd = new Date(Math.min(...endCandidates));
        const daysActive = daysBetweenInclusive(interStart, interEnd);
        if (daysActive <= 0) return;
        const daysInMonth = daysBetweenInclusive(m.start, m.end);
        const prorata = (valor / daysInMonth) * daysActive;
        prorataTotal += prorata;
      });

      res.push({
        cliente: c.Cliente || c.Nome || 'Sem Cliente',
        contrato: c.Contrato || c.NumeroContrato || c.ContratoID || c.ID || 'N/A',
        veiculo: `${c.Placa || '-'} ${c.Modelo ? ` / ${c.Modelo}` : ''}`,
        vigenciaInicio: inicioContrato ? inicioContrato.toISOString().slice(0,10) : '-',
        vigenciaFim: fimContrato ? fimContrato.toISOString().slice(0,10) : 'Presente',
        valorContratado: Number(c.ValorVigente || 0),
        valorProrataMes: Number(prorataTotal.toFixed(2)),
      });
    });
    return res.sort((a,b) => b.valorProrataMes - a.valorProrataMes);
  }, [selectedMonth, contratos, months]);

  // Chart data for ComposedChart
  const chartData = byMonth.map(b => ({ key: b.key, name: b.label, Realizado: Math.round(b.realizado), Previsto: Math.round(b.previsto), label: b.label }));

  // Handler to clear drill
  const clearSelection = () => setSelectedMonth(null);

  const [activeTab, setActiveTab] = useState<number>(0);

  return (
    <div className="bg-slate-50 p-6 min-h-screen">
      <div className="mb-4">
        <Title>Financeiro — Análises</Title>
        <Text className="mt-1">Módulo financeiro com abas e drill-down interativo.</Text>
      </div>
      <div className="mb-4">
        <div className="inline-flex rounded-md bg-white shadow-sm">
          <button onClick={() => setActiveTab(0)} className={`px-4 py-2 rounded-l ${activeTab === 0 ? 'bg-slate-900 text-white' : 'text-slate-700'}`}>Visão Geral</button>
          <button onClick={() => setActiveTab(1)} className={`px-4 py-2 rounded-r ${activeTab === 1 ? 'bg-slate-900 text-white' : 'text-slate-700'}`}>Auditoria de Receita (Gap)</button>
        </div>
      </div>

      {activeTab === 0 && (
            {/* Reuse Visão Geral content (KPIs, charts, top clients, details) */}
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-2">
                <div className="md:col-span-2">
                  <Text>Data Competência (Início)</Text>
                  <input type="date" value={dateFrom ?? ''} onChange={(e) => { setDateFrom(e.target.value || null); }} className="w-full p-2 border rounded" />
                </div>
                <div className="md:col-span-2">
                  <Text>Data Competência (Fim)</Text>
                  <input type="date" value={dateTo ?? ''} onChange={(e) => { setDateTo(e.target.value || null); }} className="w-full p-2 border rounded" />
                </div>
                <div className="md:col-span-1">
                  <Text>Cliente</Text>
                  <select multiple size={3} value={selectedClientes} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedClientes(opts); }} className="w-full p-2 border rounded">
                    {clientes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <Text>Situação</Text>
                  <select multiple size={3} value={selectedSituacoes} onChange={(e) => { const opts = Array.from(e.target.selectedOptions).map(o => o.value); setSelectedSituacoes(opts); }} className="w-full p-2 border rounded">
                    {situacoes.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <div className="bg-slate-900 text-white rounded-xl p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Text className="text-sm">Faturamento Locação</Text>
                      <Metric className="text-white">{fmtBRL(faturamentoLocacao)}</Metric>
                    </div>
                    <div>
                      <Text className="text-sm">Ticket Médio</Text>
                      <Metric className="text-white">{fmtBRL(ticketMedio)}</Metric>
                    </div>
                    <div>
                      <Text className="text-sm">Qt Veículos Faturados</Text>
                      <Metric className="text-white">{totalVeiculos}</Metric>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <Text>Faturamento Locação por Mês</Text>
                  <div style={{ width: '100%', height: 320, marginTop: 12 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(v:any) => [fmtBRL(Number(v)), 'Valor']} />
                        <Bar dataKey="Realizado" barSize={20} fill="#2563eb" onClick={onBarClick} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card>
                  <Text>Ticket Médio Mensal</Text>
                  <div style={{ width: '100%', height: 320, marginTop: 12 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(v:any) => [fmtBRL(Number(v)), 'Valor']} />
                        <Line type="monotone" dataKey="Previsto" stroke="#10b981" strokeWidth={3} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-1">
                  <Title>Top 10 Clientes</Title>
                  <div className="mt-3">
                    <BarList data={ (function(){
                      const map: Record<string, number> = {};
                      filteredFin.forEach((r) => { const c = r.Cliente || 'Sem Cliente'; map[c] = (map[c] || 0) + (Number(r.ValorTotal) || 0); });
                      return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value-a.value).slice(0,10).map(x=>({name:x.name,value:Math.round(x.value)}));
                    })()} />
                  </div>
                </Card>

                <Card className="lg:col-span-2">
                  <Title>Detalhamento de Notas</Title>
                  <Text className="mb-2">Lista paginada de notas filtradas</Text>
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th className="text-left p-2">Nota</th>
                          <th className="text-left p-2">Data Emissão</th>
                          <th className="text-left p-2">Cliente</th>
                          <th className="text-right p-2">Valor Faturado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredFin.slice(0, 50).map((r, i) => (
                          <tr key={`fin-${i}`} className="border-t">
                            <td className="p-2">{r.Nota || r.NumeroNota || r.Documento || r.Chave || r.ID || r.Id || '-'}</td>
                            <td className="p-2">{r.DataEmissao ? new Date(r.DataEmissao).toLocaleString() : '-'}</td>
                            <td className="p-2">{r.Cliente || '-'}</td>
                            <td className="p-2 text-right">{fmtBRL(Number(r.ValorTotal) || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          </div>
      )}

      {activeTab === 1 && (
            {/* Auditoria de Receita (Gap) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <Text className="mb-2">Evolução Mensal — Realizado vs Previsto (clique em uma barra para ver detalhe)</Text>
                <div style={{ width: '100%', height: 420 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }} onClick={(e) => { if (e && e.activePayload && e.activePayload[0]) {
                          const payload = e.activePayload[0].payload; const found = byMonth.find(b => b.label === payload.label); if (found) { handleChartValueChange({ key: found.key }); setSelectedMonth(found.key); }
                        } }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(v:any) => [fmtBRL(Number(v)), 'Valor']} />
                      <Bar dataKey="Realizado" barSize={20} fill="#2563eb" />
                      <Line type="monotone" dataKey="Previsto" stroke="#6b7280" strokeWidth={3} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-4">
                <Text className="text-sm">Gap Acumulado (ano)</Text>
                <Metric className={ (function(){ const year = new Date().getFullYear(); const val = byMonth.filter(b=>Number(b.key.split('-')[0])===year).reduce((s,b)=>s+(b.previsto-b.realizado),0); return val < 0 ? 'text-red-600' : 'text-emerald-600'; })() }>{fmtBRL((function(){ const year = new Date().getFullYear(); return byMonth.filter(b=>Number(b.key.split('-')[0])===year).reduce((s,b)=>s+(b.previsto-b.realizado),0); })())}</Metric>
                <Text className="mt-2 text-sm text-gray-600">Soma dos gaps mensais do ano atual (Previsto - Realizado).</Text>
              </Card>
            </div>

            {/* Drill-down table */}
            {selectedMonth ? (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <Title>Detalhamento de Contratos Ativos em {monthLabel(selectedMonth)}</Title>
                  <div>
                    <button onClick={clearSelection} className="px-3 py-1 rounded bg-gray-200">Fechar Detalhes</button>
                  </div>
                </div>

                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th className="text-left p-2">Cliente</th>
                          <th className="text-left p-2">Contrato</th>
                          <th className="text-left p-2">Veículo</th>
                          <th className="text-left p-2">Vigência</th>
                          <th className="text-right p-2">Valor Contratado</th>
                          <th className="text-right p-2">Valor Pro-Rata Mês</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contractsActiveInSelectedMonth.map((c,i) => (
                          <tr key={`contrato-${i}`} className="border-t">
                            <td className="p-2">{c.cliente}</td>
                            <td className="p-2">{c.contrato}</td>
                            <td className="p-2">{c.veiculo}</td>
                            <td className="p-2">{c.vigenciaInicio} — {c.vigenciaFim}</td>
                            <td className="p-2 text-right">{fmtBRL(Number(c.valorContratado || 0))}</td>
                            <td className="p-2 text-right">{fmtBRL(Number(c.valorProrataMes || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="mt-6">
                <Text className="text-sm text-gray-600">Clique em uma barra no gráfico para abrir o detalhamento de contratos ativos no mês selecionado.</Text>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
