import { useMemo, useState } from 'react';
import useBIDataBatch, { getBatchTable } from '@/hooks/useBIDataBatch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, LabelList, ComposedChart, Line, PieChart, Pie, Legend
} from 'recharts';
import {
  ShoppingCart, ArrowLeft, Filter, FileSpreadsheet,
  Car, TrendingUp, Percent,
  PiggyBank, ShieldAlert, Search, Landmark, DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';

type AnyObject = { [k: string]: any };

// ── Utilitários ──────────────────────────────────────────────────
function parseCurrency(v: any): number {
  return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
}
function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtCompact(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000).toLocaleString('pt-BR')}k`;
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
}
function fmtNum(v: number) {
  return new Intl.NumberFormat('pt-BR').format(v);
}

function parseObs(obs: string | null | undefined, key: string): string {
  if (!obs) return 'Não informado';
  const regex = new RegExp(key + '\\s*[-:]\\s*([^/\\n\\r]+)', 'i');
  const match = obs.match(regex);
  if (!match) return 'Não informado';
  return match[1].trim().replace(/\s+/g, ' ') || 'Não informado';
}

function enrichRecord(r: AnyObject, alienacao?: AnyObject): AnyObject {
  const obs: string = r.InformacoesAdicionais || r.informacoes_adicionais || r.observacoes || r.Observacoes || '';
  const placa = (r.Placa || r.placa || '').trim() || undefined;
  const modelo = (r.Modelo || r.modelo || '').trim() || undefined;
  const montadora = (r.Montadora || r.montadora || r.marca || r.Marca || '').trim() || undefined;

  const valorCompra = parseCurrency(r.ValorCompra ?? r.valorcompra ?? r.valor_compra ?? 0);
  const valorFipe = parseCurrency(r.ValorAtualFIPE ?? r.ValorFipeAtual ?? r.valorfipe ?? r.valor_fipe ?? r.ValorFIPE ?? 0);

  const rawDataCompra = r.DataCompra ?? r.data_compra ?? r.datacompra ?? null;
  let dataCompraIso: string | null = null;
  if (rawDataCompra) {
    const d = new Date(rawDataCompra);
    if (!isNaN(d.getTime())) dataCompraIso = d.toISOString();
  }

  const tryExtractYear = (s: string | undefined | null) => {
    if (!s) return null;
    const m = String(s).match(/\b(19|20)\d{2}\b/);
    return m ? Number(m[0]) : null;
  };
  const inferredAnoModelo = tryExtractYear(modelo) || (r.AnoModelo ? Number(r.AnoModelo) : null);
  const inferredAnoFab = tryExtractYear(r.AnoFabricacao ?? (r.ano_fabricacao || '')) || null;

  const percentualFipe = (() => {
    const pct = parseFloat(r.percentual_fipe ?? r.percentualfipe ?? r.percentualFIPE ?? r.percentual ?? 0) || 0;
    if (pct > 0) return pct;
    if (valorFipe > 0 && valorCompra > 0) return (valorCompra / valorFipe) * 100;
    const vp = parseCurrency(r.ValorProjetadoVenda ?? r.valorProjetadoVenda ?? 0);
    if (vp > 0) return (valorCompra / vp) * 100;
    return 0;
  })();

  const bancoField = (alienacao?.Banco || alienacao?.banco || r.Instituicao || r.instituicao || r.Banco || r.banco) || 'Sem Financiamento';
  const fornecedorField = r.NomeFornecedorNotaFiscal || r.fornecedor || r.Fornecedor || 'Não informado';
  const tipoField = r.Tipo || r.tipo || parseObs(r.InformacoesAdicionais || obs, 'AQUISIÇÃO');

  return {
    ...r,
    Placa: placa, placa,
    Modelo: modelo, modelo: modelo,
    montadora: montadora, marca: montadora || r.marca || r.Marca,
    valor_compra: valorCompra, ValorCompra: valorCompra,
    valor_fipe: valorFipe, ValorFIPE: valorFipe,
    percentual_fipe: percentualFipe,
    data_compra: dataCompraIso || rawDataCompra,
    ano_compra: dataCompraIso ? new Date(dataCompraIso).getFullYear() : (r.ano_compra ?? r.anoCompra ?? null),
    mes_compra: dataCompraIso ? (new Date(dataCompraIso).getMonth() + 1) : (r.mes_compra ?? null),
    AnoModelo: r.AnoModelo ?? inferredAnoModelo ?? null,
    ano_fabricacao: r.AnoFabricacao ?? inferredAnoFab ?? null,
    banco: bancoField,
    fornecedor: fornecedorField,
    filial: r.Filial || r.filial || undefined,
    tipoAquisicao: tipoField,
    IdVeiculo: r.IdVeiculo ?? r.idVeiculo,
    ValorAtualFIPE: valorFipe,
    ValorNotaFiscal: parseCurrency(r.ValorNotaFiscal),
    valor_acessorios: parseCurrency(r.ValorAcessorios),
    situacao_atual: r.SituacaoVeiculo ?? r.situacao_atual ?? r.SituacaoVeiculo ?? 'Não informado',
    // Dados de Financiamento (Funding)
    ValorFinanciado: parseCurrency(alienacao?.ValorFinanciado ?? alienacao?.valor_financiado ?? r.ValorAlienado ?? r.ValorFinanciado ?? 0),
    TotalParcelas: alienacao?.QuantidadeParcelas ?? alienacao?.quantidade_parcelas ?? r.QuantidadeParcelas ?? r.TotalParcelas ?? 0,
    ValorParcela: parseCurrency(alienacao?.ValorParcela ?? alienacao?.valor_parcela ?? r.ValorPrimeiraParcela ?? r.ValorParcela ?? 0),
    NumeroContrato: alienacao?.NumeroContrato ?? alienacao?.numero_contrato ?? '',
  };
}

// ── Cores & Constantes ───────────────────────────────────────────
const _PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
const FUNDING_PALETTE = ['#0ea5e9', '#0284c7', '#0369a1', '#075985', '#082f49'];
const _SITUACAO_COLOR: Record<string, string> = {
  Vendido: '#6366f1', Locado: '#10b981', 'Em Estoque': '#f59e0b', Desativado: '#ef4444',
};

// ── SelectBox ────────────────────────────────────────────────────
function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void; }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[140px] truncate max-w-[200px]"
      >
        {options.map((o, idx) => (
          <option key={idx} value={o}>{o.length > 50 ? o.substring(0, 50) + '...' : o}</option>
        ))}
      </select>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function PurchasesDashboard() {
  const { results, metadata, loading } = useBIDataBatch(['dim_compras', 'dim_alienacoes']);

  const rawCompras = useMemo(() => getBatchTable<AnyObject>(results, 'dim_compras'), [results]);
  const rawAlienacoes = useMemo(() => getBatchTable<AnyObject>(results, 'dim_alienacoes'), [results]);

  const data = useMemo(() => {
    if (!Array.isArray(rawCompras)) return [];

    // Map alienacoes by Placa/IdVeiculo
    const alienacoesMap = new Map<string, AnyObject>();
    if (Array.isArray(rawAlienacoes)) {
      for (const al of rawAlienacoes) {
        if (al.Placa) alienacoesMap.set(String(al.Placa).toUpperCase().trim(), al);
        if (al.IdVeiculo) alienacoesMap.set(String(al.IdVeiculo), al);
      }
    }

    return rawCompras.map(c => {
      const placa = String(c.Placa || c.placa || '').toUpperCase().trim();
      const idStr = String(c.IdVeiculo || c.id_veiculo || '');
      const alienacao = alienacoesMap.get(placa) || alienacoesMap.get(idStr);
      return enrichRecord(c, alienacao);
    });
  }, [rawCompras, rawAlienacoes]);

  // ── Abas ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'aquisicao' | 'funding' | 'auditoria'>('aquisicao');

  // ── Filtros ──────────────────────────────────────────────────────
  const [filterAno, setFilterAno] = useState('Todos');
  const [filterMes, setFilterMes] = useState('Todos');
  const [filterMarca, setFilterMarca] = useState('Todos');
  const [filterSituacao, setFilterSituacao] = useState('Todos');
  const [filterTipoAq, setFilterTipoAq] = useState('Todos');
  const [filterFornecedor, setFilterFornecedor] = useState('Todos');
  const [filterBanco, setFilterBanco] = useState('Todos');
  const [filterFipe, setFilterFipe] = useState('Todos');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('data_compra');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const [drillYear, setDrillYear] = useState<string | null>(null);

  const anos = useMemo(() => ['Todos', ...Array.from(new Set(data.map(d => String(d.ano_compra || '')).filter(Boolean))).sort().reverse()], [data]);
  const defaultAno = useMemo(() => {
    const years = Array.from(new Set(data.map(d => Number(d.ano_compra)).filter(y => Number.isFinite(y) && y > 0))).sort((a, b) => a - b);
    if (!years.length) return null;
    const current = new Date().getFullYear();
    if (years.includes(current)) return String(current);
    const past = years.filter(y => y < current);
    return String(past.length ? Math.max(...past) : Math.max(...years));
  }, [data]);

  // useEffect removido para manter 'Todos' por padrão conforme solicitação de 100% da base
  /*
  useEffect(() => {
    if (defaultAno && filterAno === 'Todos') setFilterAno(defaultAno);
  }, [defaultAno]);
  */

  const meses = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const setM = new Set<number>();
    for (const d of data) {
      if (filterAno !== 'Todos' && String(d.ano_compra || '') !== filterAno) continue;
      const m = Number(d.mes_compra || (d.data_compra ? new Date(d.data_compra).getMonth() + 1 : NaN)) || 0;
      if (m >= 1 && m <= 12) setM.add(m);
    }
    return ['Todos', ...Array.from(setM).sort((a, b) => a - b).map(m => `${m} - ${monthNames[m - 1]}`)];
  }, [data, filterAno]);

  const marcas = useMemo(() => ['Todos', ...Array.from(new Set(data.map(d => (d.marca || '').split(' - ')[0].trim()).filter(Boolean))).sort()], [data]);
  const situacoes = useMemo(() => ['Todos', ...Array.from(new Set(data.map(d => d.situacao_atual).filter(Boolean))).sort()], [data]);
  const _tiposAq = useMemo(() => ['Todos', ...Array.from(new Set(data.map(d => d.tipoAquisicao).filter((v: string) => v && v !== 'Não informado'))).sort()], [data]);
  const fornecedores = useMemo(() => ['Todos', ...Array.from(new Set(data.map(d => d.fornecedor).filter(Boolean))).sort()], [data]);
  const bancos = useMemo(() => ['Todos', ...Array.from(new Set(data.map(d => (d.banco || '').trim()).filter(Boolean))).sort()], [data]);
  const fipeBuckets = ['Todos', '< 80%', '80–90%', '90–100%', '100–110%', '110–120%', '> 120%'];

  const filtered = useMemo(() => data.filter(r => {
    if (filterAno !== 'Todos' && String(r.ano_compra || '') !== filterAno) return false;
    if (filterMes !== 'Todos') {
      const mnum = parseInt(String(filterMes).split(' ')[0], 10) || 0;
      const rMes = Number(r.mes_compra || (r.data_compra ? new Date(r.data_compra).getMonth() + 1 : NaN)) || 0;
      if (rMes !== mnum) return false;
    }
    if (filterMarca !== 'Todos' && (r.marca || '').split(' - ')[0].trim() !== filterMarca) return false;
    if (filterSituacao !== 'Todos' && r.situacao_atual !== filterSituacao) return false;
    if (filterTipoAq !== 'Todos' && r.tipoAquisicao !== filterTipoAq) return false;
    if (filterFornecedor !== 'Todos' && r.fornecedor !== filterFornecedor) return false;
    if (filterBanco !== 'Todos' && r.banco?.toLowerCase() !== filterBanco.toLowerCase()) return false;
    if (filterFipe !== 'Todos') {
      const pct = parseFloat(r.percentual_fipe || 0) || 0;
      if (filterFipe === '< 80%') return pct > 0 && pct < 80;
      if (filterFipe === '80–90%') return pct >= 80 && pct < 90;
      if (filterFipe === '90–100%') return pct >= 90 && pct < 100;
      if (filterFipe === '100–110%') return pct >= 100 && pct < 110;
      if (filterFipe === '110–120%') return pct >= 110 && pct < 120;
      if (filterFipe === '> 120%') return pct >= 120;
    }
    return true;
  }), [data, filterAno, filterMes, filterMarca, filterSituacao, filterTipoAq, filterFornecedor, filterBanco, filterFipe]);

  function clearFilters() {
    setFilterAno(defaultAno || 'Todos'); setFilterMes('Todos'); setFilterMarca('Todos');
    setFilterSituacao('Todos'); setFilterTipoAq('Todos'); setFilterFornecedor('Todos');
    setFilterBanco('Todos'); setFilterFipe('Todos'); setPage(0);
  }
  const hasActiveFilters = [filterAno, filterMes, filterMarca, filterSituacao, filterTipoAq, filterFornecedor, filterBanco, filterFipe].some(f => f !== 'Todos');

  // ── Dados / KPIs Principais ───────────────────────────────────────
  const { totalInvestido, totalFinanciado, qtd, pctFipeMedio } = useMemo(() => {
    let inv = 0; let fin = 0; let sumFipe = 0; let fipeCount = 0;
    for (const r of filtered) {
      inv += r.valor_compra || 0;
      fin += r.ValorFinanciado || 0;
      if (r.percentual_fipe > 0) { sumFipe += parseFloat(r.percentual_fipe); fipeCount++; }
    }
    return {
      totalInvestido: inv,
      totalFinanciado: fin,
      qtd: filtered.length,
      pctFipeMedio: fipeCount > 0 ? sumFipe / fipeCount : 0
    };
  }, [filtered]);

  const ticketMedio = qtd > 0 ? totalInvestido / qtd : 0;
  const targetAlavancagem = totalInvestido > 0 ? (totalFinanciado / totalInvestido) * 100 : 0;

  // ── Gráficos Genéricos (Aquisição) ──────────────────────────────
  const byAno = useMemo(() => {
    const g: Record<string, { ano: string; valor: number; qtd: number }> = {};
    for (const r of filtered) {
      const ano = String(r.ano_compra || '');
      if (!ano) continue;
      if (!g[ano]) g[ano] = { ano, valor: 0, qtd: 0 };
      g[ano].valor += r.valor_compra || 0;
      g[ano].qtd++;
    }
    return Object.values(g).sort((a, b) => a.ano.localeCompare(b.ano));
  }, [filtered]);

  const byMonth = useMemo(() => {
    if (!drillYear) return [];
    const g: Record<number, { mes: string; valor: number; qtd: number }> = {};
    for (let m = 1; m <= 12; m++) g[m] = { mes: String(m), valor: 0, qtd: 0 };
    for (const r of filtered) {
      if (String(r.ano_compra || '') !== drillYear) continue;
      const mes = Number(r.mes_compra || (r.data_compra ? new Date(r.data_compra).getMonth() + 1 : NaN)) || 0;
      if (mes >= 1 && mes <= 12) {
        g[mes].valor += r.valor_compra || 0;
        g[mes].qtd++;
      }
    }
    return Object.values(g);
  }, [filtered, drillYear]);

  // ── Gráficos: Funding ───────────────────────────────────────────
  const fundingPieData = [
    { name: 'Capital Próprio', value: Math.max(0, totalInvestido - totalFinanciado) },
    { name: 'Financiado', value: totalFinanciado }
  ];

  const topBancos = useMemo(() => {
    const g: Record<string, { banco: string; valor: number; qtd: number }> = {};
    for (const r of filtered) {
      if (!r.ValorFinanciado || r.ValorFinanciado <= 0) continue;
      const b = r.banco && r.banco !== 'Sem Financiamento' ? r.banco : 'Outros';
      if (!g[b]) g[b] = { banco: b, valor: 0, qtd: 0 };
      g[b].valor += r.ValorFinanciado;
      g[b].qtd++;
    }
    return Object.values(g).sort((a, b) => b.valor - a.valor);
  }, [filtered]);

  // ── Gráficos: Auditoria ─────────────────────────────────────────
  const divergemntes = useMemo(() => filtered.filter(r => {
    const pct = parseFloat(r.percentual_fipe || 0);
    // Operações suspeitas: Mais de 110% da FIPE, ou valor zerado com fipe alta, etc.
    return pct > 110 || (r.valor_compra > 0 && r.valor_fipe === 0) || (pct < 30 && r.valor_compra > 10000);
  }), [filtered]);

  // ── Tabelas ──────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    let rows = activeTab === 'auditoria' ? divergemntes : filtered;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => (r.Placa || '').toLowerCase().includes(q) || (r.Modelo || '').toLowerCase().includes(q));
    }
    return rows.sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [filtered, divergemntes, activeTab, search, sortField, sortDir]);

  const totalPages = Math.ceil(tableData.length / PAGE_SIZE);
  const paginatedTable = tableData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(field: string) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  function exportXLSX() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(tableData.map(r => ({
      Placa: r.Placa, Chassi: r.Chassi, Marca: r.marca, Modelo: r.Modelo,
      'Data Compra': r.data_compra, 'Valor Compra': r.valor_compra,
      'Valor FIPE': r.ValorAtualFIPE, '% FIPE': r.percentual_fipe,
      'Valor Financiado': r.ValorFinanciado, 'Banco': r.banco,
      'Situação': r.situacao_atual, 'Fornecedor': r.fornecedor
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Compras');
    XLSX.writeFile(wb, `compras_e_funding_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-slate-50 font-sans p-6">
      <Skeleton className="h-10 w-64 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/analytics" className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition text-slate-600">
              <ArrowLeft size={18} />
            </Link>
            <div className="p-2 bg-indigo-100 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Compras & Funding</h1>
              <p className="text-xs text-slate-500">Aquisições, Alavancagem e Auditoria de Valores</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataUpdateBadge metadata={metadata} compact />
            <button
              onClick={exportXLSX}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition shadow-sm"
            >
              <FileSpreadsheet size={16} /> Exportar Excel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* ── FILTROS GLOBAIS (Cruzados) ─────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={15} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Filtros Cruzados</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                Ativos: {[filterAno, filterMes, filterMarca, filterFornecedor, filterBanco, filterFipe].filter(f => f !== 'Todos').join(', ')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <FilterSelect label="Ano Compra" value={filterAno} options={anos} onChange={v => { setFilterAno(v); setPage(0); }} />
            <FilterSelect label="Mês Compra" value={filterMes} options={meses} onChange={v => { setFilterMes(v); setPage(0); }} />
            <FilterSelect label="Montadora" value={filterMarca} options={marcas} onChange={v => { setFilterMarca(v); setPage(0); }} />
            <FilterSelect label="Fornecedor / Loja" value={filterFornecedor} options={fornecedores} onChange={v => { setFilterFornecedor(v); setPage(0); }} />
            <FilterSelect label="Instituição Financeira" value={filterBanco} options={bancos} onChange={v => { setFilterBanco(v); setPage(0); }} />
            <FilterSelect label="Deságio (Faixa % FIPE)" value={filterFipe} options={fipeBuckets} onChange={v => { setFilterFipe(v); setPage(0); }} />
            <FilterSelect label="Situação Atual" value={filterSituacao} options={situacoes} onChange={v => { setFilterSituacao(v); setPage(0); }} />

            {hasActiveFilters && (
              <button onClick={clearFilters} className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition self-end">
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* ── TABS NAVEGAÇÃO ─────────────────────────────────────── */}
        <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-lg overflow-x-auto">
          {[
            { id: 'aquisicao', name: '📦 Aquisição', desc: 'Investimentos, Evolução' },
            { id: 'funding', name: '🏦 Funding', desc: 'Mix de Capital, Bancos' },
            { id: 'auditoria', name: '🛡️ Auditoria', desc: 'Divergências > 110% FIPE' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id as any); setPage(0); }}
              className={`flex-1 px-4 py-3 rounded-md transition-all text-left ${activeTab === t.id ? 'bg-indigo-50 border-indigo-200 border-2 shadow-sm' : 'hover:bg-slate-50 border-2 border-transparent'}`}
            >
              <div className={`font-bold ${activeTab === t.id ? 'text-indigo-700' : 'text-slate-700'}`}>{t.name}</div>
              <div className="text-xs text-slate-400 mt-1">{t.desc}</div>
            </button>
          ))}
        </div>

        {/* ── CONTEÚDO DA ABA ATIVA ──────────────────────────────── */}
        <div className="space-y-6">

          {/* ABA AQUISIÇÃO */}
          {activeTab === 'aquisicao' && (
            <>
              {/* KPIs de Aquisição */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex gap-3">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600"><ShoppingCart /></div>
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase">Investimento Total</div>
                      <div className="text-2xl font-bold text-slate-800">{fmtCompact(totalInvestido)}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex gap-3">
                    <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600"><TrendingUp /></div>
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase">Ticket Médio</div>
                      <div className="text-2xl font-bold text-slate-800">{fmtCompact(ticketMedio)}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex gap-3">
                    <div className="p-3 bg-blue-100 rounded-xl text-blue-600"><Car /></div>
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase">Veículos Comprados</div>
                      <div className="text-2xl font-bold text-slate-800">{fmtNum(qtd)}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex gap-3">
                    <div className={`p-3 rounded-xl ${pctFipeMedio > 100 ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}><Percent /></div>
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase">% FIPE Médio (Deságio)</div>
                      <div className="text-2xl font-bold text-slate-800">{pctFipeMedio.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evolução de Aquisições */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-700">Evolução de Compras</h3>
                  {drillYear && <button onClick={() => setDrillYear(null)} className="text-xs text-indigo-600 font-medium">← Voltar para Anos</button>}
                </div>
                <div className="overflow-x-auto pb-2">
                  <div style={{ minWidth: (drillYear ? byMonth.length : byAno.length) * 80 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={drillYear ? byMonth : byAno} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey={drillYear ? "mes" : "ano"} tickFormatter={v => drillYear ? `Mês ${v}` : v} />
                        <YAxis yAxisId="left" tickFormatter={fmtCompact} />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(val: any, name: string) => [name === 'valor' ? fmtBRL(val) : val, name === 'valor' ? 'Investido' : 'Qtd']} />
                        <Bar yAxisId="left" dataKey="valor" fill="#6366f1" radius={[4, 4, 0, 0]} name="valor">
                          {!drillYear && byAno.map((d, i) => <Cell key={i} cursor="pointer" onClick={() => { setDrillYear(d.ano); setFilterAno(d.ano); }} />)}
                          <LabelList dataKey="valor" formatter={fmtCompact} position="top" style={{ fontSize: 10 }} />
                        </Bar>
                        <Line yAxisId="right" type="step" dataKey="qtd" stroke="#f59e0b" strokeWidth={3} name="qtd" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ABA FUNDING */}
          {activeTab === 'funding' && (
            <>
              {/* KPIs de Funding */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-l-4 border-l-sky-500">
                  <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><Landmark size={14} /> Total Financiado</div>
                  <div className="text-3xl font-bold text-slate-800">{fmtCompact(totalFinanciado)}</div>
                  <div className="text-sm mt-2 text-slate-500">Capital captado em {topBancos.length} bancos</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-l-4 border-l-indigo-500">
                  <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><PiggyBank size={14} /> Mix de Capital</div>
                  <div className="text-3xl font-bold text-slate-800 text-indigo-600">{targetAlavancagem.toFixed(1)}%</div>
                  <div className="text-sm mt-2 text-slate-500">Percentual de alavancagem (<strong className="text-slate-700">{fmtCompact(Math.max(0, totalInvestido - totalFinanciado))}</strong> próprio)</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-l-4 border-l-emerald-500">
                  <div className="text-xs text-slate-500 font-bold uppercase mb-1 flex items-center gap-1"><DollarSign size={14} /> Cobertura Ativo</div>
                  <div className="text-3xl font-bold text-slate-800 text-emerald-600">
                    {totalFinanciado > 0 ? ((totalInvestido / totalFinanciado) * 100).toFixed(1) : '100'}%
                  </div>
                  <div className="text-sm mt-2 text-slate-500">Garantia baseada em <strong className="text-slate-700">{fmtCompact(totalInvestido)}</strong> investidos</div>
                </div>
              </div>

              {/* Gráficos Diversidade de Bancos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="font-bold text-slate-700 mb-4">Mix de Capital</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={fundingPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} label={false}>
                        <Cell fill="#cbd5e1" />
                        <Cell fill="#0ea5e9" />
                      </Pie>
                      <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="font-bold text-slate-700 mb-4">Top Bancos/Instituições</h3>
                  <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
                    <ResponsiveContainer width="100%" height={Math.max(280, topBancos.length * 40)}>
                      <BarChart data={topBancos} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={fmtCompact} />
                        <YAxis dataKey="banco" type="category" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
                        <Bar dataKey="valor" fill="#0ea5e9" radius={[0, 4, 4, 0]}>
                          {topBancos.map((e, i) => <Cell key={i} fill={FUNDING_PALETTE[i % FUNDING_PALETTE.length]} />)}
                          <LabelList dataKey="valor" position="right" formatter={fmtCompact} style={{ fontSize: 10 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ABA AUDITORIA */}
          {activeTab === 'auditoria' && (
            <div className="bg-red-50 border border-red-200 p-6 rounded-xl flex items-start gap-4">
              <ShieldAlert className="w-12 h-12 text-red-500 shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-red-800">Operações Divergentes Detectadas</h3>
                <p className="text-red-700 mt-1 mb-2">
                  Foram identificadas <strong>{divergemntes.length}</strong> operações suspeitas com distorções consideráveis (ex: percentual FIPE &gt; 110%, ou base zerada).
                </p>
                <div className="bg-white/60 p-3 rounded-lg text-sm text-red-900 border border-red-200/50">
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Verifique as colunas de <strong>Valor Compra</strong> e <strong>% FIPE</strong> na tabela abaixo.</li>
                    <li>Operações de alavancagem alta podem ter sido preenchidas com FIPE base desatualizada.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── TABELA COMUM ────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-bold text-slate-700">{activeTab === 'auditoria' ? 'Detalhamento de Divergências' : 'Listagem de Veículos Comprados'}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{fmtNum(tableData.length)} registros retornados na visão atual</p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Buscar placa, modelo..." className="pl-9 w-64 text-sm" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    {[
                      { field: 'placa', label: 'Placa' },
                      { field: 'modelo', label: 'Modelo' },
                      { field: 'data_compra', label: 'Data Compra' },
                      { field: 'fornecedor', label: 'Fornecedor' },
                      { field: 'valor_compra', label: 'Valor Compra' },
                      { field: 'percentual_fipe', label: '% FIPE' },
                      { field: 'ValorFinanciado', label: 'Financiado' },
                      { field: 'banco', label: 'Banco' },
                      { field: 'situacao_atual', label: 'Status' }
                    ].map(col => (
                      <th key={col.field} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition" onClick={() => toggleSort(col.field)}>
                        {col.label} {sortField === col.field && (sortDir === 'asc' ? '↑' : '↓')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTable.map((r, i) => (
                    <tr key={i} className={`hover:bg-slate-50 transition ${activeTab === 'auditoria' ? 'bg-red-50/20' : ''}`}>
                      <td className="px-4 py-3 font-mono font-semibold">{r.Placa || r.placa || '-'}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate" title={r.Modelo}>{r.Modelo || r.modelo}</td>
                      <td className="px-4 py-3 text-slate-600">{r.data_compra ? new Date(r.data_compra).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="px-4 py-3 max-w-[150px] truncate" title={r.fornecedor}>{r.fornecedor}</td>
                      <td className="px-4 py-3 font-semibold">{fmtBRL(r.valor_compra)}</td>
                      <td className={`px-4 py-3 font-bold ${r.percentual_fipe > 110 ? 'text-red-600' : r.percentual_fipe > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {r.percentual_fipe > 0 ? `${r.percentual_fipe.toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sky-600 font-semibold">{r.ValorFinanciado > 0 ? fmtBRL(r.ValorFinanciado) : '-'}</td>
                      <td className="px-4 py-3 max-w-[120px] truncate" title={r.banco}>{r.banco !== 'Sem Financiamento' ? r.banco : '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-md text-[10px] uppercase font-bold bg-slate-100 text-slate-600">{r.situacao_atual}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-500">Página {page + 1} de {totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="px-3 py-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-40">Anterior</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="px-3 py-1 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-40">Próximo</button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
