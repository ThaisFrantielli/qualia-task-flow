import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { DollarSign, RefreshCw, Search, Loader2, ArrowUp, ArrowDown } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface CashFlowRow {
  mes: string;
  faturamentoInicial: number;
  perdaPrevista: number;
  receitaEstimada: number;
  faturamentoFinal: number;
  qtdeParaVenda: number;
  valorFipeVenda: number;
  qtdeParaAquisicao: number;
  valorEstimadoAquisicao: number;
  qtdeRenovacoes?: number;
  activeCount?: number;
}

interface ApiResponse {
  metadata: {
    generated_at: string;
    source: string;
    months: number;
    initial_faturamento: number;
    contracts_count?: number;
    filtros: { cliente?: string; categoria?: string; filial?: string };
  };
  data: CashFlowRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: number | undefined | null) =>
  typeof v === 'number' && Number.isFinite(v)
    ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'R$ —';

const fmtCompact = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 })}`;

const pct = (val: number, total: number) =>
  total > 0 ? Math.round((val / total) * 100) + '%' : '0%';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs space-y-1 min-w-[180px]">
      <div className="font-bold text-slate-700 mb-2 border-b pb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-semibold">{fmtCompact(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
type Props = {
  cliente?: string;
  categoria?: string;
  filial?: string;
  periodStart?: string;
  periodEnd?: string;
};

export default function CashFlowProjectionPage(props: Props) {
  const [data, setData] = useState<CashFlowRow[]>([]);
  const [metadata, setMetadata] = useState<ApiResponse['metadata'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc'|'desc' } | null>(null);

  // Universal search (debounced) - can be initialized from parent props
  const [q, setQ] = useState(props.cliente ?? '');
  const [dq, setDQ] = useState('');

  // Support period filters (optional)
  const [periodStart, setPeriodStart] = useState(props.periodStart ?? '');
  const [periodEnd, setPeriodEnd] = useState(props.periodEnd ?? '');

  const ctlRef = useRef<AbortController | null>(null);

  // Debounce universal query
  useEffect(() => { const t = setTimeout(() => setDQ(q), 600); return () => clearTimeout(t); }, [q]);
  useEffect(() => { const t = setTimeout(() => {/* no-op for period for now */}, 600); return () => clearTimeout(t); }, [periodStart, periodEnd]);

  // If parent props change, sync them into local state so the UI reflects the same filters
  useEffect(() => {
    if (typeof props.cliente !== 'undefined' && props.cliente !== q) setQ(props.cliente);
    else if (typeof props.categoria !== 'undefined' && props.categoria !== q) setQ(props.categoria as any);
    else if (typeof props.filial !== 'undefined' && props.filial !== q) setQ(props.filial as any);
    if (typeof props.periodStart !== 'undefined' && props.periodStart !== periodStart) setPeriodStart(props.periodStart);
    if (typeof props.periodEnd !== 'undefined' && props.periodEnd !== periodEnd) setPeriodEnd(props.periodEnd);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.cliente, props.categoria, props.filial, props.periodStart, props.periodEnd]);

  const fetchData = useCallback(async (bust = false) => {
    if (ctlRef.current) ctlRef.current.abort();
    ctlRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ table: 'fluxo_caixa_projetado' });
      if (dq) params.set('q', dq);
      // forward optional period filters if provided
      if (props.periodStart || periodStart) params.set('periodStart', props.periodStart ?? periodStart);
      if (props.periodEnd || periodEnd) params.set('periodEnd', props.periodEnd ?? periodEnd);
      if (bust) params.set('refresh', String(Date.now()));

      const resp = await fetch(`/api/bi-data?${params.toString()}`, { signal: ctlRef.current.signal });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json: ApiResponse = await resp.json();
      setData(Array.isArray(json.data) ? json.data : []);
      setMetadata(json.metadata ?? null);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [dq, props.periodStart, props.periodEnd, periodStart, periodEnd]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const monthsCount = metadata?.months ?? data.length;
  const lastMonthLabel = data.length > 0 ? data[data.length - 1].mes : '';

  const sortedData = (function() {
    if (!sortConfig) return data;
    const key = sortConfig.key;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    return [...data].sort((a: any, b: any) => {
      const va = a[key];
      const vb = b[key];
      if (va == null && vb == null) return 0;
      if (va == null) return -1 * dir;
      if (vb == null) return 1 * dir;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  })();

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const faturamentoAtual = metadata?.initial_faturamento ?? (data[0]?.faturamentoInicial ?? 0);
  const perdaTotal = data.reduce((s, r) => s + (r.perdaPrevista || 0), 0);
  const fipeTotal = data.reduce((s, r) => s + (r.valorFipeVenda || 0), 0);
  const aquisicaoTotal = data.reduce((s, r) => s + (r.valorEstimadoAquisicao || 0), 0);
  const qtdeVendaTotal = data.reduce((s, r) => s + (r.qtdeParaVenda || 0), 0);
  const qtdeAquisicaoTotal = data.reduce((s, r) => s + (r.qtdeParaAquisicao || 0), 0);
  const qtdeRenovacoesTotal = data.reduce((s, r) => s + (r.qtdeRenovacoes || 0), 0);

  const contractsCount = metadata?.contracts_count ?? 0;
  const contractsDisplay = contractsCount >= 1000 ? `${Math.round(contractsCount / 1000)}` : `${contractsCount}`;
  const contractsLabel = contractsCount >= 1000 ? 'mil contratos de locação incluídos' : 'contratos de locação incluídos';

  // Lowest faturamento final across projection
  const minFat = data.reduce((min, r) => Math.min(min, r.faturamentoFinal ?? Infinity), Infinity);
  const lastFat = data.length > 0 ? data[data.length - 1].faturamentoFinal : 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-[1920px] mx-auto min-h-screen bg-slate-50 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* mensagem de contexto removida para alinhar com o design onde a busca fica acima dos filtros */}
        </div>
        {!(typeof props.cliente !== 'undefined' || typeof props.categoria !== 'undefined' || typeof props.filial !== 'undefined' || typeof props.periodStart !== 'undefined' || typeof props.periodEnd !== 'undefined') && (
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 border rounded bg-white text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        )}
      </div>

      {/* Universal Search + Period Filters */}
      {!(typeof props.cliente !== 'undefined' || typeof props.categoria !== 'undefined' || typeof props.filial !== 'undefined' || typeof props.periodStart !== 'undefined' || typeof props.periodEnd !== 'undefined') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
        <div className="relative w-96">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar contratos, cliente, placa..."
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Período</label>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          />
          <span className="text-xs text-slate-400">a</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {q && (
            <button type="button" onClick={() => setQ('')} className="px-3 py-2 text-xs border rounded bg-white">Limpar</button>
          )}
          {(periodStart || periodEnd) && (
            <button type="button" onClick={() => { setPeriodStart(''); setPeriodEnd(''); }} className="px-3 py-2 text-xs border rounded bg-white">Limpar Período</button>
          )}
        </div>
        </div>
      )}

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      )}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-violet-600 text-white text-center py-1 text-[10px] font-bold uppercase tracking-widest">Contratos de Locação</div>
              <div className="p-4 text-center">
                <div className="text-xl font-bold text-slate-800">{metadata?.contracts_count?.toLocaleString('pt-BR') ?? '—'}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-blue-700 text-white text-center py-1 text-[10px] font-bold uppercase tracking-widest">Faturamento Atual</div>
              <div className="p-4 text-center">
                <div className="text-xl font-bold text-slate-800">{fmtCompact(faturamentoAtual)}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-red-600 text-white text-center py-1 text-[10px] font-bold uppercase tracking-widest">Perda Projetada ({monthsCount}m)</div>
              <div className="p-4 text-center">
                <div className="text-xl font-bold text-slate-800">{fmtCompact(perdaTotal)}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-600 text-white text-center py-1 text-[10px] font-bold uppercase tracking-widest">Faturamento Final</div>
              <div className="p-4 text-center">
                <div className="text-xl font-bold text-slate-800">{fmtCompact(lastFat)}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-amber-500 text-white text-center py-1 text-[10px] font-bold uppercase tracking-widest">Valor FIPE p/ Venda</div>
              <div className="p-4 text-center">
                <div className="text-xl font-bold text-slate-800">{fmtCompact(fipeTotal)}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-indigo-600 text-white text-center py-1 text-[10px] font-bold uppercase tracking-widest">Valor Est. Aquisição</div>
              <div className="p-4 text-center">
                <div className="text-xl font-bold text-slate-800">{fmtCompact(aquisicaoTotal)}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-600 text-white text-center py-1 text-[10px] font-bold uppercase tracking-widest">Mínimo Projetado</div>
              <div className="p-4 text-center">
                <div className="text-xl font-bold text-slate-800">{fmtCompact(Number.isFinite(minFat) ? minFat : 0)}</div>
              </div>
            </div>
          </div>

          {/* Area Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Curva de Faturamento Projetado (até {lastMonthLabel || `${monthsCount} meses`})</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradFatFinal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPerda" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `R$ ${(v / 1_000_000).toFixed(1)}M`}
                    width={80}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="faturamentoFinal"
                    name="Faturamento Final"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#gradFatFinal)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="perdaPrevista"
                    name="Perda Prevista"
                    stroke="#EF4444"
                    strokeWidth={1.5}
                    fill="url(#gradPerda)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="receitaEstimada"
                    name="Receita Estimada"
                    stroke="#10B981"
                    strokeWidth={1.5}
                    fill="url(#gradReceita)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
              <DollarSign size={16} className="text-slate-500" />
              <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Projeção Mensal Detalhada</h4>
              {metadata && (
                <span className="ml-auto text-xs text-slate-400">
                  Gerado em {new Date(metadata.generated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left whitespace-nowrap">
                <thead className="bg-white border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                        <th className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-slate-100">Mês</th>
                        <th className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>Faturamento Inicial</span>
                            <span className="flex items-center gap-1">
                              <button type="button" onClick={() => setSortConfig({ key: 'faturamentoInicial', direction: 'asc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowUp size={12} /></button>
                              <button type="button" onClick={() => setSortConfig({ key: 'faturamentoInicial', direction: 'desc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowDown size={12} /></button>
                            </span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>Perda Prevista</span>
                            <span className="flex items-center gap-1">
                              <button type="button" onClick={() => setSortConfig({ key: 'perdaPrevista', direction: 'asc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowUp size={12} /></button>
                              <button type="button" onClick={() => setSortConfig({ key: 'perdaPrevista', direction: 'desc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowDown size={12} /></button>
                            </span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>Receita Estimada</span>
                            <span className="flex items-center gap-1">
                              <button type="button" onClick={() => setSortConfig({ key: 'receitaEstimada', direction: 'asc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowUp size={12} /></button>
                              <button type="button" onClick={() => setSortConfig({ key: 'receitaEstimada', direction: 'desc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowDown size={12} /></button>
                            </span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>Faturamento Final</span>
                            <span className="flex items-center gap-1">
                              <button type="button" onClick={() => setSortConfig({ key: 'faturamentoFinal', direction: 'asc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowUp size={12} /></button>
                              <button type="button" onClick={() => setSortConfig({ key: 'faturamentoFinal', direction: 'desc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowDown size={12} /></button>
                            </span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right">Taxa Perda</th>
                        <th className="px-4 py-3 text-center">Qtde p/ Venda</th>
                        <th className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>Valor FIPE Venda</span>
                            <span className="flex items-center gap-1">
                              <button type="button" onClick={() => setSortConfig({ key: 'valorFipeVenda', direction: 'asc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowUp size={12} /></button>
                              <button type="button" onClick={() => setSortConfig({ key: 'valorFipeVenda', direction: 'desc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowDown size={12} /></button>
                            </span>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center">Qtde p/ Aquisição</th>
                        <th className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>Valor Est. Aquisição</span>
                            <span className="flex items-center gap-1">
                              <button type="button" onClick={() => setSortConfig({ key: 'valorEstimadoAquisicao', direction: 'asc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowUp size={12} /></button>
                              <button type="button" onClick={() => setSortConfig({ key: 'valorEstimadoAquisicao', direction: 'desc' })} className="text-slate-400 hover:text-slate-700 p-0"><ArrowDown size={12} /></button>
                            </span>
                          </div>
                        </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedData.map((row, i) => {
                    const taxa = row.faturamentoInicial > 0
                      ? Math.round((row.perdaPrevista / row.faturamentoInicial) * 100)
                      : 0;
                    return (
                      <tr
                        key={i}
                        className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                      >
                        <td className="px-4 py-2.5 font-bold text-slate-700 sticky left-0 bg-inherit z-10 border-r border-slate-100">
                          {row.mes}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">
                          {fmt(row.faturamentoInicial)}
                          <div className="text-[10px] text-slate-400 mt-1">{(row.activeCount ?? 0) > 0 ? `${(row.activeCount ?? 0).toLocaleString('pt-BR')} contratos de locação` : '—'}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-red-600">
                          {row.perdaPrevista > 0 ? fmt(row.perdaPrevista) : <span className="text-slate-400">—</span>}
                          <div className="text-[10px] text-slate-400 mt-1">{(row.qtdeParaVenda ?? 0) > 0 ? `${(row.qtdeParaVenda ?? 0)} veículos` : '—'}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-emerald-600">
                          {row.receitaEstimada > 0 ? fmt(row.receitaEstimada) : <span className="text-slate-400">—</span>}
                          <div className="text-[10px] text-slate-400 mt-1">{(row.qtdeRenovacoes ?? 0) > 0 ? `${(row.qtdeRenovacoes ?? 0)} renovações` : '—'}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-700">
                          {fmt(row.faturamentoFinal)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {taxa > 0 ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${taxa >= 50 ? 'bg-red-100 text-red-700' : taxa >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                              {taxa}%
                            </span>
                          ) : <span className="text-slate-400 text-[10px]">0%</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.qtdeParaVenda > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px]">{row.qtdeParaVenda}</span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-amber-700">
                          {row.valorFipeVenda > 0 ? fmt(row.valorFipeVenda) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.qtdeParaAquisicao > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">{row.qtdeParaAquisicao}</span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-indigo-700">
                          {row.valorEstimadoAquisicao > 0 ? fmt(row.valorEstimadoAquisicao) : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        Nenhum dado disponível.
                      </td>
                    </tr>
                  )}
                </tbody>
                {data.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-700">
                      <td className="px-4 py-3 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">TOTAL</td>
                      <td className="px-4 py-3 text-right font-mono">—</td>
                      <td className="px-4 py-3 text-right font-mono text-red-700">{fmt(perdaTotal)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        {fmt(data.reduce((s, r) => s + (r.receitaEstimada || 0), 0))}
                        <div className="text-[10px] text-slate-700 mt-1">{qtdeRenovacoesTotal > 0 ? `${qtdeRenovacoesTotal} renovações` : '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-700">{fmt(lastFat)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {pct(perdaTotal, faturamentoAtual)}
                      </td>
                      <td className="px-4 py-3 text-center">{qtdeVendaTotal}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-700">{fmt(fipeTotal)}</td>
                      <td className="px-4 py-3 text-center">{qtdeAquisicaoTotal}</td>
                      <td className="px-4 py-3 text-right font-mono text-indigo-700">{fmt(aquisicaoTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
