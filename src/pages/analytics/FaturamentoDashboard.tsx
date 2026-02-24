import { useMemo, useState, type ReactNode } from 'react';
import useBIDataBatch, { getBatchTable } from '@/hooks/useBIDataBatch';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList,
} from 'recharts';
import { DollarSign, FileText, TrendingUp, AlertCircle, ChevronDown, ChevronRight, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCurrency(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const s = String(v).replace(/\s/g, '');
  if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return isFinite(n) ? n : 0;
  }
  if (s.indexOf(',') !== -1) {
    const n = parseFloat(s.replace(',', '.'));
    return isFinite(n) ? n : 0;
  }
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtCompact(v: number) {
  try {
    if (!isFinite(v)) return 'R$ 0';
    if (v >= 1_000_000) return `R$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v / 1_000_000)}M`;
    if (v >= 1_000) return `R$ ${new Intl.NumberFormat('pt-BR').format(Math.round(v / 1_000))}k`;
    return `R$ ${new Intl.NumberFormat('pt-BR').format(Math.round(v))}`;
  } catch {
    return `R$ ${v}`;
  }
}

function fmtDate(v: any): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (!isFinite(d.getTime())) return String(v);
    return d.toLocaleDateString('pt-BR');
  } catch { return String(v); }
}

/** Resolve campo de um objeto ignorando case e variações de nome */
function getField(obj: AnyObject, ...keys: string[]): any {
  const lowerMap: AnyObject = {};
  for (const k of Object.keys(obj)) lowerMap[k.toLowerCase()] = obj[k];
  for (const key of keys) {
    if (obj[key] !== undefined) return obj[key];
    const lower = lowerMap[key.toLowerCase()];
    if (lower !== undefined) return lower;
  }
  return undefined;
}

function getStr(obj: AnyObject, ...keys: string[]): string {
  const v = getField(obj, ...keys);
  return v != null ? String(v).trim() : '';
}

function getNum(obj: AnyObject, ...keys: string[]): number {
  return parseCurrency(getField(obj, ...keys));
}

// faturas: coluna de ID
const FID_KEYS = ['IdFaturamento', 'idfaturamento', 'id_faturamento', 'Id', 'id'];
const FDATA_KEYS = ['DataFaturamento', 'datafaturamento', 'Data', 'DataEmissao', 'dataemissao'];
const FCLIENTE_KEYS = ['Cliente', 'NomeCliente', 'nomecliente', 'ClienteNome', 'clientenome', 'RazaoSocial', 'razaosocial'];
const FCONTRATO_KEYS = ['Contrato', 'ContratoLocacao', 'contratolocacao', 'NumeroContrato', 'numerocontrato'];
const FVALOR_KEYS = ['Valor', 'ValorTotal', 'valortotal', 'ValorFaturado', 'valorfaturado', 'ValorBruto', 'valorbruto'];
const FSTATUS_KEYS = ['Status', 'SituacaoFaturamento', 'situacaofaturamento', 'Situacao', 'situacao'];
const FVENC_KEYS = ['DataVencimento', 'datavencimento', 'Vencimento', 'vencimento'];
const FPAGTO_KEYS = ['DataPagamento', 'datapagamento', 'DataPago', 'datapago'];
const FTIPO_KEYS = ['TipoReceita', 'tiporeceita', 'TipoFaturamento', 'tipofaturamento', 'Tipo', 'tipo'];

// itens: colunas
const IITEM_ID_KEYS = ['IdItem', 'iditem', 'Id', 'id'];
const IFAT_ID_KEYS = ['IdFaturamento', 'idfaturamento', 'id_faturamento'];
const IDESC_KEYS = ['Descricao', 'descricao', 'Produto', 'produto', 'Servico', 'servico', 'Item', 'item'];
const IQTD_KEYS = ['Quantidade', 'quantidade', 'Qtd', 'qtd'];
const IVUNIT_KEYS = ['ValorUnitario', 'valorunitario', 'PrecoUnitario', 'precounitario'];
const IVALOR_KEYS = ['Valor', 'ValorTotal', 'valortotal', 'ValorItem', 'valoritem'];
const ITIPO_KEYS = ['TipoItem', 'tipoitem', 'Tipo', 'tipo', 'TipoReceita', 'tiporeceita'];

// status considerados pagos/quitados
const STATUS_PAGO = new Set(['pago', 'quitado', 'liquidado', 'recebido', 'paid', 'ok']);
// status em aberto
const STATUS_ABERTO = new Set(['aberto', 'pendente', 'a vencer', 'em aberto', 'open', 'pending']);

function isStatusPago(s: string) { return STATUS_PAGO.has(s.toLowerCase().trim()); }
function isStatusAberto(s: string) { return STATUS_ABERTO.has(s.toLowerCase().trim()) || s === ''; }

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }:
  { icon: ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4`}>
      <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-tight truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#14b8a6'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FaturamentoDashboard(): JSX.Element {
  const { results, loading, metadata } = useBIDataBatch(
    ['fat_faturamentos', 'fat_faturamento_itens']
  );

  const faturas = useMemo<AnyObject[]>(() => {
    return getBatchTable<AnyObject>(results, 'fat_faturamentos');
  }, [results]);

  const itensBrutos = useMemo<AnyObject[]>(() => {
    return getBatchTable<AnyObject>(results, 'fat_faturamento_itens');
  }, [results]);

  // ── Opções de filtro
  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    for (const f of faturas) {
      const v = getStr(f, ...FSTATUS_KEYS);
      if (v) s.add(v);
    }
    return ['Todos', ...Array.from(s).sort()];
  }, [faturas]);

  const clienteOptions = useMemo(() => {
    const s = new Set<string>();
    for (const f of faturas) {
      const v = getStr(f, ...FCLIENTE_KEYS);
      if (v) s.add(v);
    }
    return ['Todos', ...Array.from(s).sort()];
  }, [faturas]);

  const anoOptions = useMemo(() => {
    const s = new Set<number>();
    for (const f of faturas) {
      const d = getStr(f, ...FDATA_KEYS);
      if (d) { const y = new Date(d).getFullYear(); if (isFinite(y) && y > 2000) s.add(y); }
    }
    return [0, ...Array.from(s).sort((a, b) => b - a)];
  }, [faturas]);

  // ── Filtros ativos
  const [filtroAno, setFiltroAno] = useState<number>(0);
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroCliente, setFiltroCliente] = useState('Todos');
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // ── Faturas filtradas
  const faturasFiltradas = useMemo(() => {
    return faturas.filter((f) => {
      if (filtroAno !== 0) {
        const d = getStr(f, ...FDATA_KEYS);
        if (!d || new Date(d).getFullYear() !== filtroAno) return false;
      }
      if (filtroStatus !== 'Todos') {
        const s = getStr(f, ...FSTATUS_KEYS);
        if (s !== filtroStatus) return false;
      }
      if (filtroCliente !== 'Todos') {
        const c = getStr(f, ...FCLIENTE_KEYS);
        if (c !== filtroCliente) return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        return (
          getStr(f, ...FCLIENTE_KEYS).toLowerCase().includes(q) ||
          getStr(f, ...FCONTRATO_KEYS).toLowerCase().includes(q) ||
          getStr(f, ...FID_KEYS).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [faturas, filtroAno, filtroStatus, filtroCliente, searchText]);

  // ── KPIs
  const kpis = useMemo(() => {
    const total = faturasFiltradas.reduce((s, f) => s + getNum(f, ...FVALOR_KEYS), 0);
    const qtd = faturasFiltradas.length;
    const ticket = qtd > 0 ? total / qtd : 0;

    const abertas = faturasFiltradas.filter(f => {
      const st = getStr(f, ...FSTATUS_KEYS);
      return isStatusAberto(st);
    });
    const valorAberto = abertas.reduce((s, f) => s + getNum(f, ...FVALOR_KEYS), 0);
    const inadimplencia = total > 0 ? (valorAberto / total) * 100 : 0;

    return { total, qtd, ticket, valorAberto, inadimplencia, qtdAbertas: abertas.length };
  }, [faturasFiltradas]);

  // ── Evolução mensal
  const evolucaoMensal = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of faturasFiltradas) {
      const d = getStr(f, ...FDATA_KEYS);
      if (!d) continue;
      const dt = new Date(d);
      if (!isFinite(dt.getTime())) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + getNum(f, ...FVALOR_KEYS));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, valor]) => {
        const [y, m] = key.split('-');
        return { mes: `${m}/${y}`, valor };
      });
  }, [faturasFiltradas]);

  // ── Por tipo de receita
  const porTipoReceita = useMemo(() => {
    // Usar fat_faturamento_itens se disponível
    let base: AnyObject[] = itensBrutos;
    let valorKey = IVALOR_KEYS;
    let tipoKey = ITIPO_KEYS;

    // fallback: usar fat_faturamentos
    if (base.length === 0) {
      base = faturasFiltradas;
      valorKey = FVALOR_KEYS;
      tipoKey = FTIPO_KEYS;
    } else {
      // Filtrar itens pelas faturas filtradas
      const idsValidos = new Set(faturasFiltradas.map(f => getStr(f, ...FID_KEYS)));
      base = base.filter(i => idsValidos.has(getStr(i, ...IFAT_ID_KEYS)));
    }

    const map = new Map<string, number>();
    for (const row of base) {
      const tipo = getStr(row, ...tipoKey) || 'Não informado';
      map.set(tipo, (map.get(tipo) ?? 0) + getNum(row, ...valorKey));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tipo, valor]) => ({ tipo, valor }));
  }, [faturasFiltradas, itensBrutos]);

  // ── Top clientes
  const topClientes = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of faturasFiltradas) {
      const c = getStr(f, ...FCLIENTE_KEYS) || 'Não informado';
      map.set(c, (map.get(c) ?? 0) + getNum(f, ...FVALOR_KEYS));
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([cliente, valor]) => ({ cliente: cliente.length > 30 ? cliente.slice(0, 28) + '…' : cliente, valor }));
  }, [faturasFiltradas]);

  // ── Paginação
  const totalPages = Math.max(1, Math.ceil(faturasFiltradas.length / PAGE_SIZE));
  const faturasPagina = faturasFiltradas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Itens de uma fatura
  const itensDaFatura = (idFatura: string) =>
    itensBrutos.filter(i => getStr(i, ...IFAT_ID_KEYS) === idFatura);

  // ── Metadados já vêm do hook diretamente via `metadata`

  if (loading) return <AnalyticsLoading message="Carregando dados de faturamento…" />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <DollarSign className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard de Faturamento</h1>
              <p className="text-sm text-slate-500">fat_faturamentos · fat_faturamento_itens</p>
            </div>
          </div>
          <DataUpdateBadge metadata={metadata} />
        </div>

        {/* ── Filtros ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtros</span>

          {/* Ano */}
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={filtroAno}
            onChange={(e) => { setFiltroAno(Number(e.target.value)); setPage(1); }}
          >
            <option value={0}>Todos os anos</option>
            {anoOptions.filter(a => a !== 0).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Status */}
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={filtroStatus}
            onChange={(e) => { setFiltroStatus(e.target.value); setPage(1); }}
          >
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Cliente */}
          <select
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={filtroCliente}
            onChange={(e) => { setFiltroCliente(e.target.value); setPage(1); }}
          >
            {clienteOptions.map(c => (
              <option key={c} value={c}>{c.length > 40 ? c.slice(0, 38) + '…' : c}</option>
            ))}
          </select>

          {/* Busca textual */}
          <input
            type="text"
            placeholder="Buscar cliente, contrato, ID…"
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-60"
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
          />

          {/* Limpar */}
          {(filtroAno !== 0 || filtroStatus !== 'Todos' || filtroCliente !== 'Todos' || searchText) && (
            <button
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 bg-red-50 hover:bg-red-100 transition-colors"
              onClick={() => { setFiltroAno(0); setFiltroStatus('Todos'); setFiltroCliente('Todos'); setSearchText(''); setPage(1); }}
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}

          <span className="ml-auto text-xs text-slate-400">{faturasFiltradas.length.toLocaleString('pt-BR')} faturas</span>
        </div>

        {/* ── KPIs ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            icon={<DollarSign className="w-5 h-5 text-indigo-600" />}
            label="Total Faturado"
            value={fmtCompact(kpis.total)}
            sub={fmtBRL(kpis.total)}
            color="bg-indigo-50"
          />
          <KpiCard
            icon={<FileText className="w-5 h-5 text-sky-600" />}
            label="Qtd. Faturas"
            value={kpis.qtd.toLocaleString('pt-BR')}
            sub="no período filtrado"
            color="bg-sky-50"
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            label="Ticket Médio"
            value={fmtCompact(kpis.ticket)}
            sub={fmtBRL(kpis.ticket)}
            color="bg-emerald-50"
          />
          <KpiCard
            icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
            label="Valor em Aberto"
            value={fmtCompact(kpis.valorAberto)}
            sub={`${kpis.qtdAbertas} faturas em aberto`}
            color="bg-amber-50"
          />
          <KpiCard
            icon={<AlertCircle className="w-5 h-5 text-red-600" />}
            label="Inadimplência"
            value={`${kpis.inadimplencia.toFixed(1)}%`}
            sub="sobre total faturado"
            color="bg-red-50"
          />
        </div>

        {/* ── Gráficos ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Evolução mensal */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Evolução Mensal do Faturamento</h2>
            <p className="text-xs text-slate-400 mb-5">Valor total faturado por mês</p>
            {evolucaoMensal.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Sem dados para exibir</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={evolucaoMensal} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => fmtCompact(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={70} />
                  <Tooltip
                    formatter={(v: number) => [fmtBRL(v), 'Faturado']}
                    contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#6366f1" strokeWidth={2} fill="url(#gradFat)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Por tipo de receita */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Por Tipo de Receita / Produto</h2>
            <p className="text-xs text-slate-400 mb-5">Valor total por categoria (top 10)</p>
            {porTipoReceita.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Sem dados para exibir</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={porTipoReceita} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => fmtCompact(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="tipo" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={110} />
                  <Tooltip
                    formatter={(v: number) => [fmtBRL(v), 'Total']}
                    contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                    {porTipoReceita.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                    <LabelList dataKey="valor" position="right" formatter={(v: number) => fmtCompact(v)} style={{ fontSize: 10, fill: '#64748b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Clientes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Ranking de Clientes</h2>
          <p className="text-xs text-slate-400 mb-5">Top 10 clientes por valor total faturado</p>
          {topClientes.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-slate-400 text-sm">Sem dados para exibir</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topClientes} layout="vertical" margin={{ top: 0, right: 80, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => fmtCompact(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="cliente" type="category" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={160} />
                <Tooltip
                  formatter={(v: number) => [fmtBRL(v), 'Faturado']}
                  contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="valor" fill="#6366f1" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="valor" position="right" formatter={(v: number) => fmtCompact(v)} style={{ fontSize: 10, fill: '#64748b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Tabela de faturas com drill-down ───────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Faturas</h2>
              <p className="text-xs text-slate-400">Clique em uma linha para ver os itens da fatura</p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              {faturasFiltradas.length.toLocaleString('pt-BR')} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left w-8"></th>
                  <th className="px-4 py-3 text-left">ID Fatura</th>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Contrato</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Vencimento</th>
                  <th className="px-4 py-3 text-left">Pagamento</th>
                  <th className="px-4 py-3 text-left">Tipo Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faturasPagina.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">
                      Nenhuma fatura encontrada com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  faturasPagina.map((f, idx) => {
                    const id = getStr(f, ...FID_KEYS) || String(idx);
                    const isExpanded = expandedId === id;
                    const status = getStr(f, ...FSTATUS_KEYS);
                    const statusColor = isStatusPago(status)
                      ? 'bg-emerald-100 text-emerald-700'
                      : isStatusAberto(status)
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600';
                    const itens = itensDaFatura(id);

                    return (
                      <>
                        <tr
                          key={`fat-${id}`}
                          className={`hover:bg-slate-50 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : ''}`}
                          onClick={() => setExpandedId(isExpanded ? null : id)}
                        >
                          <td className="px-4 py-3 text-slate-400">
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-indigo-500" />
                              : <ChevronRight className="w-4 h-4" />
                            }
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{id || '—'}</td>
                          <td className="px-4 py-3 text-slate-700">{fmtDate(getStr(f, ...FDATA_KEYS))}</td>
                          <td className="px-4 py-3 text-slate-800 font-medium max-w-[200px] truncate" title={getStr(f, ...FCLIENTE_KEYS)}>
                            {getStr(f, ...FCLIENTE_KEYS) || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate">{getStr(f, ...FCONTRATO_KEYS) || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {fmtBRL(getNum(f, ...FVALOR_KEYS))}
                          </td>
                          <td className="px-4 py-3">
                            {status ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{status}</span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{fmtDate(getStr(f, ...FVENC_KEYS))}</td>
                          <td className="px-4 py-3 text-slate-500">{fmtDate(getStr(f, ...FPAGTO_KEYS))}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs">{getStr(f, ...FTIPO_KEYS) || '—'}</td>
                        </tr>

                        {/* Drill-down: itens da fatura */}
                        {isExpanded && (
                          <tr key={`items-${id}`} className="bg-indigo-50/60">
                            <td colSpan={10} className="px-6 py-4">
                              <div className="rounded-xl border border-indigo-100 bg-white overflow-hidden">
                                <div className="px-4 py-2 border-b border-indigo-100 bg-indigo-50 flex items-center justify-between">
                                  <span className="text-xs font-semibold text-indigo-700">
                                    Itens da Fatura #{id} — {itens.length} item(s)
                                  </span>
                                </div>
                                {itens.length === 0 ? (
                                  <p className="px-4 py-6 text-center text-sm text-slate-400">
                                    Nenhum item encontrado para esta fatura em fat_faturamento_itens.
                                  </p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-2 text-left">ID Item</th>
                                        <th className="px-4 py-2 text-left">Descrição</th>
                                        <th className="px-4 py-2 text-left">Tipo</th>
                                        <th className="px-4 py-2 text-right">Qtd</th>
                                        <th className="px-4 py-2 text-right">Vl. Unitário</th>
                                        <th className="px-4 py-2 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {itens.map((item, iIdx) => (
                                        <tr key={iIdx} className="hover:bg-slate-50">
                                          <td className="px-4 py-2 font-mono text-slate-500">{getStr(item, ...IITEM_ID_KEYS) || iIdx + 1}</td>
                                          <td className="px-4 py-2 text-slate-700">{getStr(item, ...IDESC_KEYS) || '—'}</td>
                                          <td className="px-4 py-2 text-slate-500">{getStr(item, ...ITIPO_KEYS) || '—'}</td>
                                          <td className="px-4 py-2 text-right text-slate-600">{getStr(item, ...IQTD_KEYS) || '—'}</td>
                                          <td className="px-4 py-2 text-right text-slate-600">{fmtBRL(getNum(item, ...IVUNIT_KEYS))}</td>
                                          <td className="px-4 py-2 text-right font-semibold text-slate-800">{fmtBRL(getNum(item, ...IVALOR_KEYS))}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Página {page} de {totalPages} · {faturasFiltradas.length.toLocaleString('pt-BR')} faturas
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Anterior
                </button>
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        page === pageNum
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
