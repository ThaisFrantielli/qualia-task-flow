import { useMemo, useState, useEffect } from 'react';
import useBIDataBatch, { getBatchTable } from '@/hooks/useBIDataBatch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, LabelList, ComposedChart, Line,
} from 'recharts';
import {
  ShoppingCart, ArrowLeft, Filter, FileSpreadsheet,
  Car, Building2, Calendar, TrendingUp, Percent,
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

/** Extrai campo do campo `observacoes` por regex */
function parseObs(obs: string | null | undefined, key: string): string {
  if (!obs) return 'Não informado';
  const regex = new RegExp(key + '\\s*[-:]\\s*([^/\\n\\r]+)', 'i');
  const match = obs.match(regex);
  if (!match) return 'Não informado';
  const result = match[1].trim().replace(/\s+/g, ' ');
  return result || 'Não informado';
}

function enrichRecord(r: AnyObject): AnyObject {
  // InformacoesAdicionais é o nome real da coluna no banco (não observacoes)
  const obs: string = r.InformacoesAdicionais || r.informacoes_adicionais || r.observacoes || r.Observacoes || '';

  // Normalização de campos — nomes verificados com information_schema.columns:
  // IdVeiculo, Placa, Chassi, Renavam, Montadora, Modelo, AnoModelo, AnoFabricacao,
  // CodigoFIPE, ValorAtualFIPE, DataCompra, NumeroNotaFiscal, NomeFornecedorNotaFiscal,
  // ValorNotaFiscal, ValorAcessorios, ValorCompra, ValorProjetadoVenda, DataProjetadaVenda,
  // Instituicao, Tipo, QuantidadeParcelas, ValorAlienado, SituacaoVeiculo,
  // SituacaoFinanceiraVeiculo, InformacoesAdicionais, Patio, Filial
  const placa = (r.Placa || r.placa || '').trim() || undefined;
  const modelo = (r.Modelo || r.modelo || '').trim() || undefined;
  // Montadora (com M maiúsculo — nome real da coluna)
  const montadora = (r.Montadora || r.montadora || r.marca || r.Marca || '').trim() || undefined;

  const valorCompra = parseCurrency(r.ValorCompra ?? r.valorcompra ?? r.valor_compra ?? 0);
  // ValorAtualFIPE é o nome real da coluna no banco
  const valorFipe = parseCurrency(r.ValorAtualFIPE ?? r.ValorFipeAtual ?? r.valorfipe ?? r.valor_fipe ?? r.ValorFIPE ?? 0);

  // Data compra
  const rawDataCompra = r.DataCompra ?? r.data_compra ?? r.datacompra ?? null;
  let dataCompraIso: string | null = null;
  if (rawDataCompra) {
    const d = new Date(rawDataCompra);
    if (!isNaN(d.getTime())) dataCompraIso = d.toISOString();
  }

  // Tentar inferir ano do modelo caso AnoModelo/AnoFabricacao venham vazios
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
    // fallback: if both zero, try derive from ValorProjetadoVenda when available
    const vp = parseCurrency(r.ValorProjetadoVenda ?? r.valorProjetadoVenda ?? 0);
    if (vp > 0) return (valorCompra / vp) * 100;
    return 0;
  })();

  // "Instituicao" é o nome real da coluna (al.Instituicao no ETL)
  const bancoField = (r.Instituicao || r.instituicao || r.Banco || r.banco || r.NomeFornecedorNotaFiscal || r.fornecedor) || undefined;
  // "Filial" existe como coluna real
  const filialField = (r.Filial || r.filial) || undefined;
  // "Tipo" existe como coluna real (tipo de aquisição)
  const tipoField = r.Tipo || r.tipo || parseObs(r.InformacoesAdicionais || obs, 'AQUISIÇÃO');

  return {
    ...r,
    Placa: placa || r.Placa || r.placa,
    placa: placa || r.placa || r.Placa,
    Modelo: modelo || r.Modelo || r.modelo,
    modelo: modelo || r.modelo || r.Modelo,
    montadora: montadora || undefined,
    marca: montadora || r.marca || r.Marca,
    valor_compra: valorCompra,
    ValorCompra: valorCompra,
    valor_fipe: valorFipe,
    ValorFIPE: valorFipe,
    percentual_fipe: percentualFipe,
    percentualfipe: percentualFipe,
    data_compra: dataCompraIso || r.data_compra || r.datacompra || r.DataCompra || null,
    DataCompra: dataCompraIso || r.DataCompra || r.data_compra || null,
    ano_compra: dataCompraIso ? new Date(dataCompraIso).getFullYear() : (r.ano_compra ?? r.anoCompra ?? null),
    mes_compra: dataCompraIso ? (new Date(dataCompraIso).getMonth() + 1) : (r.mes_compra ?? null),
    // preencher ano_modelo / ano_fabricacao quando faltarem com inferência
    AnoModelo: r.AnoModelo ?? r.ano_modelo ?? inferredAnoModelo ?? null,
    ano_modelo: r.AnoModelo ?? r.ano_modelo ?? inferredAnoModelo ?? null,
    AnoFabricacao: r.AnoFabricacao ?? r.ano_fabricacao ?? inferredAnoFab ?? null,
    ano_fabricacao: r.AnoFabricacao ?? r.ano_fabricacao ?? inferredAnoFab ?? null,
    banco: bancoField,
    filial: filialField,
    tipoAquisicao: tipoField,
    // mapeamentos — nomes verificados com information_schema.columns
    IdVeiculo: r.IdVeiculo ?? r.idVeiculo,
    Chassi: r.Chassi ?? r.chassi,
    chassi: r.Chassi ?? r.chassi,
    Renavam: r.Renavam ?? r.renavam,
    renavam: r.Renavam ?? r.renavam,
    IdMontadora: r.IdMontadora ?? r.idMontadora,
    IdModelo: r.IdModelo ?? r.idModelo,
    CodigoFIPE: r.CodigoFIPE ?? r.codigo_fipe,
    codigo_fipe: r.CodigoFIPE ?? r.codigo_fipe,
    // ValorAtualFIPE é o nome exato da coluna no banco
    ValorAtualFIPE: valorFipe,
    valor_atual_fipe: valorFipe,
    ValorFipeAtual: valorFipe,
    NumeroNotaFiscal: r.NumeroNotaFiscal,
    SerieNotaFiscal: r.SerieNotaFiscal,
    NomeFornecedorNotaFiscal: r.NomeFornecedorNotaFiscal,
    DocumentoFornecedorNotaFiscal: r.DocumentoFornecedorNotaFiscal,
    DataEmissaoNotaFiscal: r.DataEmissaoNotaFiscal,
    ValorNotaFiscal: parseCurrency(r.ValorNotaFiscal),
    valor_acessorios: parseCurrency(r.ValorAcessorios),
    ValorProjetadoVenda: parseCurrency(r.ValorProjetadoVenda),
    valor_projetado_venda: parseCurrency(r.ValorProjetadoVenda),
    DataProjetadaVenda: r.DataProjetadaVenda,
    // SituacaoVeiculo é o nome exato da coluna no banco
    situacao_veiculo: r.SituacaoVeiculo ?? r.situacao_veiculo,
    situacao_atual: r.SituacaoVeiculo ?? r.situacao_atual ?? r.SituacaoVeiculo ?? 'Não informado',
    situacao_financeira_veiculo: r.SituacaoFinanceiraVeiculo ?? r.situacao_financeira_veiculo,
    // InformacoesAdicionais é o nome exato da coluna (não observacoes)
    informacoes_adicionais: r.InformacoesAdicionais ?? r.informacoes_adicionais ?? obs,
    Patio: r.Patio ?? r.patio ?? (parseObs(obs, 'PATIO') === 'Não informado' ? undefined : parseObs(obs, 'PATIO')),
    patio: r.Patio ?? r.patio ?? (parseObs(obs, 'PATIO') === 'Não informado' ? undefined : parseObs(obs, 'PATIO')),
    // Financiamento (colunas da aliensão em JOIN)
    ValorFinanciado: parseCurrency(r.ValorAlienado ?? r.ValorFinanciado ?? 0),
    TotalParcelas: r.QuantidadeParcelas ?? r.TotalParcelas,
    ValorParcela: parseCurrency(r.ValorPrimeiraParcela ?? r.ValorParcela ?? 0),
  };
}

// ── Cores ──────────────────────────────────────────────────────────
const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
  '#0ea5e9', '#8b5cf6',
];
const SITUACAO_COLOR: Record<string, string> = {
  Vendido: '#6366f1',
  Locado: '#10b981',
  'Em Estoque': '#f59e0b',
  Desativado: '#ef4444',
};

// ── Komponente selectbox inline ────────────────────────────────────
function FilterSelect({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[140px]"
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function PurchasesDashboard() {
  // Campos verificados diretamente no banco (SELECT column_name FROM information_schema.columns WHERE table_name = 'dim_compras')
  const { results, metadata, loading } = useBIDataBatch(['dim_compras'], {
    dim_compras: [
      'DataAtualizacaoDados',
      'IdVeiculo', 'Placa', 'Chassi', 'Renavam',
      'Montadora', 'IdModelo', 'Modelo', 'AnoModelo', 'AnoFabricacao',
      'CodigoFIPE', 'ValorAtualFIPE', 'DataCompra',
      'NumeroNotaFiscal', 'NomeFornecedorNotaFiscal', 'ValorNotaFiscal',
      'ValorAcessorios', 'ValorCompra',
      'ValorProjetadoVenda', 'DataProjetadaVenda',
      'Instituicao', 'Tipo', 'QuantidadeParcelas', 'ValorAlienado',
      'SituacaoVeiculo', 'SituacaoFinanceiraVeiculo',
      'InformacoesAdicionais', 'Patio', 'Filial',
    ],
  });

  const rawData = useMemo(() => getBatchTable<AnyObject>(results, 'dim_compras'), [results]);

  const data = useMemo(
    () => (Array.isArray(rawData) ? rawData : []).map(enrichRecord),
    [rawData],
  );

  // ── Filtros ──────────────────────────────────────────────────────
  const [filterAno, setFilterAno] = useState('Todos');
  const [filterMes, setFilterMes] = useState('Todos');
  const [filterMarca, setFilterMarca] = useState('Todos');
  const [filterSituacao, setFilterSituacao] = useState('Todos');
  const [filterTipoAq, setFilterTipoAq] = useState('Todos');
  const [filterModelo, setFilterModelo] = useState('Todos');
  const [filterBanco, setFilterBanco] = useState('Todos');
  const [filterFipe, setFilterFipe] = useState('Todos');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('data_compra');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const [drillYear, setDrillYear] = useState<string | null>(null);

  const anos = useMemo(
    () => ['Todos', ...Array.from(new Set(data.map(d => String(d.ano_compra || '')).filter(Boolean))).sort().reverse()],
    [data],
  );
  const meses = useMemo(() => {
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const setM = new Set<number>();
    for (const d of data) {
      if (filterAno !== 'Todos' && String(d.ano_compra || '') !== filterAno) continue;
      const m = Number(d.mes_compra || (d.data_compra ? new Date(d.data_compra).getMonth() + 1 : NaN)) || 0;
      if (m >= 1 && m <= 12) setM.add(m);
    }
    const arr = Array.from(setM).sort((a, b) => a - b);
    return ['Todos', ...arr.map(m => `${m} - ${monthNames[m - 1]}`)];
  }, [data, filterAno]);
  // definir ano padrão: preferir o ano atual se houver dados, senão o último ano com dados
  const defaultAno = useMemo(() => {
    const years = Array.from(new Set(data.map(d => Number(d.ano_compra)).filter(y => Number.isFinite(y) && y > 0)));
    if (years.length === 0) return null;
    years.sort((a, b) => a - b);
    const currentYear = new Date().getFullYear();
    if (years.includes(currentYear)) return String(currentYear);
    const past = years.filter(y => y < currentYear);
    const chosen = past.length ? Math.max(...past) : Math.max(...years);
    return String(chosen);
  }, [data]);

  // aplicar ano padrão após os dados carregarem (não sobrescrever se usuário já alterou)
  useEffect(() => {
    if (defaultAno && filterAno === 'Todos') setFilterAno(defaultAno);
  }, [defaultAno]);
  const marcas = useMemo(
    () => ['Todos', ...Array.from(new Set(data.map(d => (d.marca || '').split(' - ')[0].trim()).filter(Boolean))).sort()],
    [data],
  );
  const situacoes = useMemo(
    () => ['Todos', ...Array.from(new Set(data.map(d => d.situacao_atual).filter(Boolean))).sort()],
    [data],
  );
  const tiposAq = useMemo(
    () => ['Todos', ...Array.from(new Set(data.map(d => d.tipoAquisicao).filter((v: string) => v && v !== 'Não informado'))).sort()],
    [data],
  );
  const modelos = useMemo(
    () => ['Todos', ...Array.from(new Set(
      data.map(d => (d.Modelo || d.modelo || '').split(' ').slice(0, 6).join(' ').trim()).filter(Boolean)
    )).sort().slice(0, 20)],
    [data],
  );
  const bancos = useMemo(
    () => ['Todos', ...Array.from(new Set(data.map(d => (d.banco || '').trim()).filter(Boolean))).sort()],
    [data],
  );
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
    if (filterModelo !== 'Todos' && ((r.Modelo || r.modelo || '').toLowerCase().indexOf(filterModelo.toLowerCase()) === -1)) return false;
    if (filterBanco !== 'Todos' && ((r.banco || '').toLowerCase() !== filterBanco.toLowerCase())) return false;
    if (filterFipe !== 'Todos') {
      const pct = parseFloat(r.percentual_fipe || 0) || 0;
      const bucket = filterFipe;
      const inBucket = (() => {
        if (bucket === '< 80%') return pct < 80 && pct > 0;
        if (bucket === '80–90%') return pct >= 80 && pct < 90;
        if (bucket === '90–100%') return pct >= 90 && pct < 100;
        if (bucket === '100–110%') return pct >= 100 && pct < 110;
        if (bucket === '110–120%') return pct >= 110 && pct < 120;
        if (bucket === '> 120%') return pct >= 120;
        return true;
      })();
      if (!inBucket) return false;
    }
    return true;
  }), [data, filterAno, filterMarca, filterSituacao, filterTipoAq, filterModelo, filterBanco, filterFipe]);

  function clearFilters() {
    setFilterAno(defaultAno || 'Todos'); setFilterMes('Todos'); setFilterMarca('Todos');
    setFilterSituacao('Todos'); setFilterTipoAq('Todos');
    setFilterModelo('Todos'); setFilterBanco('Todos'); setFilterFipe('Todos');
    setPage(0);
  }
  const hasActiveFilters = [filterAno, filterMes, filterMarca, filterSituacao, filterTipoAq, filterModelo, filterBanco, filterFipe].some(f => f !== 'Todos');

  // ── KPIs ──────────────────────────────────────────────────────────
  const totalInvestido = useMemo(
    () => filtered.reduce((s, r) => s + parseCurrency(r.valor_compra || r.ValorCompra), 0),
    [filtered],
  );
  const qtd = filtered.length;
  const ticketMedio = qtd > 0 ? totalInvestido / qtd : 0;

  const pctFipeMedio = useMemo(() => {
    const valid = filtered.filter(r => (r.percentual_fipe || 0) > 0);
    return valid.length > 0
      ? valid.reduce((s, r) => s + parseFloat(r.percentual_fipe || 0), 0) / valid.length
      : 0;
  }, [filtered]);

  const locados = useMemo(() => filtered.filter(r => r.situacao_atual === 'Locado').length, [filtered]);
  const vendidos = useMemo(() => filtered.filter(r => r.situacao_atual === 'Vendido').length, [filtered]);

  // ── Dados dos Gráficos ───────────────────────────────────────────
  const byAno = useMemo(() => {
    const g: Record<string, { ano: string; valor: number; qtd: number }> = {};
    for (const r of filtered) {
      const ano = String(r.ano_compra || '');
      if (!ano) continue;
      if (!g[ano]) g[ano] = { ano, valor: 0, qtd: 0 };
      g[ano].valor += parseCurrency(r.valor_compra || r.ValorCompra);
      g[ano].qtd += 1;
    }
    return Object.values(g).sort((a, b) => a.ano.localeCompare(b.ano));
  }, [filtered]);

  const byMonth = useMemo(() => {
    if (!drillYear) return [] as { mes: string; valor: number; qtd: number }[];
    const g: Record<number, { mes: string; valor: number; qtd: number }> = {};
    for (let m = 1; m <= 12; m++) g[m] = { mes: String(m), valor: 0, qtd: 0 };
    for (const r of filtered) {
      const ano = String(r.ano_compra || '');
      if (String(ano) !== String(drillYear)) continue;
      const mes = Number(r.mes_compra || (r.data_compra ? new Date(r.data_compra).getMonth() + 1 : NaN)) || 0;
      if (!mes || mes < 1 || mes > 12) continue;
      g[mes].valor += parseCurrency(r.valor_compra || r.ValorCompra);
      g[mes].qtd += 1;
    }
    return Object.keys(g).map(k => ({ mes: g[Number(k)].mes, valor: g[Number(k)].valor, qtd: g[Number(k)].qtd }));
  }, [filtered, drillYear]);

  const bySituacao = useMemo(() => {
    const g: Record<string, number> = {};
    for (const r of filtered) {
      const s = r.situacao_atual || 'Não informado';
      g[s] = (g[s] || 0) + 1;
    }
    return Object.entries(g).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const byMarca = useMemo(() => {
    const g: Record<string, { marca: string; qtd: number }> = {};
    for (const r of filtered) {
      const marca = (r.marca || '').split(' - ')[0].trim();
      if (!marca) continue;
      if (!g[marca]) g[marca] = { marca, qtd: 0 };
      g[marca].qtd += 1;
    }
    return Object.values(g).sort((a, b) => b.qtd - a.qtd);
  }, [filtered]);

  const byModelo = useMemo(() => {
    const g: Record<string, { modelo: string; qtd: number }> = {};
    for (const r of filtered) {
      const modelo = (r.Modelo || r.modelo || '').split(' ').slice(0, 6).join(' ').trim();
      if (!modelo) continue;
      if (!g[modelo]) g[modelo] = { modelo, qtd: 0 };
      g[modelo].qtd += 1;
    }
    return Object.values(g).sort((a, b) => b.qtd - a.qtd);
  }, [filtered]);

  const byTipoAq = useMemo(() => {
    const g: Record<string, { tipo: string; qtd: number; valor: number }> = {};
    for (const r of filtered) {
      const tipo = r.tipoAquisicao || '';
      if (!tipo) continue;
      if (!g[tipo]) g[tipo] = { tipo, qtd: 0, valor: 0 };
      g[tipo].qtd += 1;
      g[tipo].valor += parseCurrency(r.valor_compra || r.ValorCompra);
    }
    return Object.values(g).sort((a, b) => b.qtd - a.qtd).slice(0, 10);
  }, [filtered]);

  const byBanco = useMemo(() => {
    const g: Record<string, { banco: string; qtd: number }> = {};
    for (const r of filtered) {
      const banco = (r.banco || '').trim();
      if (!banco) continue;
      if (!g[banco]) g[banco] = { banco, qtd: 0 };
      g[banco].qtd += 1;
    }
    return Object.values(g).sort((a, b) => b.qtd - a.qtd).slice(0, 12);
  }, [filtered]);

  // dynamic heights for vertical charts so long lists can scroll
  const marcaChartHeight = Math.max(240, Math.min(1200, byMarca.length * 28));
  const modeloChartHeight = Math.max(240, Math.min(1600, byModelo.length * 26));

  const byFipeBucket = useMemo(() => {
    const buckets: [string, number][] = [
      ['< 80%', 0], ['80–90%', 0], ['90–100%', 0],
      ['100–110%', 0], ['110–120%', 0], ['> 120%', 0],
    ];
    for (const r of filtered) {
      const pct = parseFloat(r.percentual_fipe || 0);
      if (!pct) continue;
      if (pct < 80) buckets[0][1]++;
      else if (pct < 90) buckets[1][1]++;
      else if (pct < 100) buckets[2][1]++;
      else if (pct < 110) buckets[3][1]++;
      else if (pct < 120) buckets[4][1]++;
      else buckets[5][1]++;
    }
    return buckets.map(([faixa, qtd]) => ({ faixa, qtd }));
  }, [filtered]);

  const byFilial = useMemo(() => {
    const g: Record<string, number> = {};
    for (const r of filtered) {
      const f = (r.filial || '').trim();
      if (!f) continue;
      g[f] = (g[f] || 0) + 1;
    }
    return Object.entries(g).map(([filial, qtd]) => ({ filial, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 10);
  }, [filtered]);

  const hasFilialData = byFilial.some(f => f.filial !== 'Não informado');

  // ── Tabela ────────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    let rows = filtered;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.Placa || r.placa || '').toLowerCase().includes(q) ||
        (r.Modelo || r.modelo || '').toLowerCase().includes(q) ||
        (r.marca || '').toLowerCase().includes(q),
      );
    }
    return [...rows].sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [filtered, search, sortField, sortDir]);

  const paginatedTable = useMemo(
    () => tableData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [tableData, page],
  );
  const totalPages = Math.ceil(tableData.length / PAGE_SIZE);

  function toggleSort(field: string) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  // ── Export ────────────────────────────────────────────────────────
  function exportXLSX() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(tableData.map(r => ({
      'ID Veículo': r.IdVeiculo || r.id_veiculo,
      'Placa': r.Placa || r.placa,
      'Chassi': r.Chassi || r.chassi,
      'RENAVAM': r.Renavam || r.renavam,
      'Modelo': r.Modelo || r.modelo,
      'Marca': r.marca,
      'Ano Modelo': r.AnoModelo || r.ano_modelo,
      'Ano Fabricação': r.ano_fabricacao,
      'Ano Compra': r.ano_compra,
      'Data Compra': r.data_compra || r.DataCompra,
      'Numero Nota Fiscal': r.NumeroNotaFiscal || r.numero_nota_fiscal,
      'Serie Nota Fiscal': r.SerieNotaFiscal || r.serie_nota_fiscal,
      'Nome Fornecedor': r.NomeFornecedorNotaFiscal || r.Fornecedor || r.fornecedor,
      'Documento Fornecedor': r.DocumentoFornecedorNotaFiscal || r.documentoFornecedorNotaFiscal,
      'Valor Nota Fiscal': parseCurrency(r.ValorNotaFiscal || r.valor_nota_fiscal),
      'Valor Compra': parseCurrency(r.valor_compra || r.ValorCompra),
      'Valor Acessórios': parseCurrency(r.valor_acessorios || r.ValorAcessorios),
      'Valor FIPE': parseCurrency(r.valor_fipe || r.ValorFIPE),
      'Valor Atual FIPE': parseCurrency(r.ValorAtualFIPE || r.valor_atual_fipe),
      '% FIPE': r.percentual_fipe,
      'Valor Projetado Venda': r.ValorProjetadoVenda || r.valor_projetado_venda,
      'Data Projetada Venda': r.DataProjetadaVenda || r.data_projetada_venda,
      'Tipo Aquisição': r.tipoAquisicao,
      'Banco / Instituição': r.banco,
      'Patio': r.Patio || r.patio,
      'Filial': r.filial,
      'Situação Atual': r.situacao_veiculo || r.situacao_atual,
      'Situação Financeira': r.situacao_financeira_veiculo,
      'Informações Adicionais': r.informacoes_adicionais,
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Compras');
    XLSX.writeFile(wb, `veiculos_comprados_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ── Loading — skeleton progressivo ──────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        {/* Header skeleton */}
        <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div>
                <Skeleton className="h-5 w-48 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-32 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
          {/* Filtros skeleton */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="flex flex-wrap gap-4">
              {[140, 120, 140, 160, 160, 150, 150, 130].map((w, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-20 mb-1" />
                  <Skeleton className="h-9 rounded-lg" style={{ width: w }} />
                </div>
              ))}
            </div>
          </div>
          {/* KPI cards skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-6 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
          {/* Gráficos linha 1 skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <Skeleton className="h-4 w-52 mb-4" />
              <Skeleton className="w-full rounded-lg" style={{ height: 260 }} />
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <Skeleton className="h-4 w-40 mb-4" />
              <Skeleton className="w-full rounded-lg" style={{ height: 260 }} />
            </div>
          </div>
          {/* Gráficos linha 2 skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[0, 1].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <Skeleton className="h-4 w-44 mb-4" />
                <Skeleton className="w-full rounded-lg" style={{ height: 240 }} />
              </div>
            ))}
          </div>
          {/* Gráficos linha 3 skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <Skeleton className="h-4 w-36 mb-4" />
                <Skeleton className="w-full rounded-lg" style={{ height: 220 }} />
              </div>
            ))}
          </div>
          {/* Tabela skeleton */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Skeleton className="h-4 w-36 mb-1" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-9 w-64 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-full rounded mb-1" />
            <div className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
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
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Veículos Comprados</h1>
              <p className="text-xs text-slate-500">Análise de Aquisições · dim_compras</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataUpdateBadge metadata={metadata} compact />
            <button
              onClick={exportXLSX}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition shadow-sm"
            >
              <FileSpreadsheet size={16} />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">

        {/* ── FILTROS ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={15} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Filtros</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                {[filterAno, filterMes, filterMarca, filterSituacao, filterTipoAq, filterModelo, filterBanco, filterFipe].filter(f => f !== 'Todos').length} ativo(s)
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <FilterSelect label="Ano Compra" value={filterAno} options={anos} onChange={v => { setFilterAno(v); setPage(0); }} />
            <FilterSelect label="Mês Compra" value={filterMes} options={meses} onChange={v => { setFilterMes(v); setPage(0); }} />
            <FilterSelect label="Montadora" value={filterMarca} options={marcas} onChange={v => { setFilterMarca(v); setPage(0); }} />
            <FilterSelect label="Situação Atual" value={filterSituacao} options={situacoes} onChange={v => { setFilterSituacao(v); setPage(0); }} />
            <FilterSelect label="Tipo Aquisição" value={filterTipoAq} options={tiposAq} onChange={v => { setFilterTipoAq(v); setPage(0); }} />
            <FilterSelect label="Modelo" value={filterModelo} options={modelos} onChange={v => { setFilterModelo(v); setPage(0); }} />
            <FilterSelect label="Banco / Inst." value={filterBanco} options={bancos} onChange={v => { setFilterBanco(v); setPage(0); }} />
            <FilterSelect label="Faixa % FIPE" value={filterFipe} options={fipeBuckets} onChange={v => { setFilterFipe(v); setPage(0); }} />
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition self-end"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── ESTADO VAZIO ─────────────────────────────────────────── */}
        {data.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-semibold text-base mb-1">Nenhum dado disponível</p>
            <p className="text-slate-400 text-sm">A tabela dim_compras não retornou registros. Verifique a conexão com o banco de dados ou aguarde a próxima atualização.</p>
          </div>
        )}

        {/* ── KPI CARDS ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              label: 'Total Investido', value: fmtCompact(totalInvestido),
              sub: `${fmtNum(qtd)} veículos`, icon: <ShoppingCart size={20} />, color: 'bg-indigo-600',
            },
            {
              label: 'Qtd. Comprados', value: fmtNum(qtd),
              sub: filterAno !== 'Todos' ? `em ${filterAno}` : 'histórico total', icon: <Car size={20} />, color: 'bg-blue-600',
            },
            {
              label: 'Ticket Médio', value: fmtCompact(ticketMedio),
              sub: 'por veículo', icon: <TrendingUp size={20} />, color: 'bg-violet-600',
            },
            {
              label: '% FIPE Médio', value: `${pctFipeMedio.toFixed(1)}%`,
              sub: pctFipeMedio > 100 ? 'acima da FIPE' : 'abaixo da FIPE',
              icon: <Percent size={20} />,
              color: pctFipeMedio > 100 ? 'bg-amber-500' : 'bg-emerald-600',
            },
            {
              label: 'Ainda Locados', value: fmtNum(locados),
              sub: `${fmtNum(vendidos)} vendidos`, icon: <Calendar size={20} />, color: 'bg-emerald-600',
            },
          ].map((kpi, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className={`${kpi.color} p-3 rounded-xl text-white shrink-0`}>{kpi.icon}</div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide truncate">{kpi.label}</p>
                <p className="text-xl font-bold text-slate-900 leading-snug">{kpi.value}</p>
                <p className="text-xs text-slate-400 truncate">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── GRÁFICO TEMPORAL + SITUAÇÃO ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Valor + Qtd por Ano */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Calendar size={15} className="text-indigo-500" />
              Valor Total de Compra por Ano
              <span className="ml-auto text-xs font-normal text-slate-400">
                Barras = Valor · Linha = Quantidade
              </span>
            </h3>
            <div>
              {drillYear ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => setDrillYear(null)} className="text-xs text-slate-500 hover:text-slate-700">← Voltar</button>
                    <div className="text-sm font-semibold">Detalhe por mês: {drillYear}</div>
                    <div className="ml-auto text-xs text-slate-400">Barras = Valor · Pontos = Qtde</div>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={byMonth} margin={{ top: 8, right: 36, left: 8, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(m) => {
                        const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
                        const idx = Number(m) - 1; return months[idx] ?? m;
                      }} />
                      <YAxis yAxisId="left" tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#10b981' }} />
                      <Tooltip formatter={(v: any, name: string) => [name === 'valor' ? fmtBRL(Number(v)) : fmtNum(Number(v)), name === 'valor' ? 'Valor' : 'Qtd']} labelFormatter={(l) => `Mês ${l}`} />
                      <Bar yAxisId="left" dataKey="valor" fill="#6366f1" opacity={0.85} radius={[4,4,0,0]} name="valor">
                        <LabelList dataKey="valor" position="top" formatter={(v: number) => fmtCompact(v)} style={{ fontSize: 10, fill: '#374151' }} />
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="qtd" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} name="qtd" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={byAno} margin={{ top: 16, right: 36, left: 8, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="ano" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis yAxisId="left" tickFormatter={v => fmtCompact(v)} tick={{ fontSize: 11, fill: '#64748b' }} width={80} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#10b981' }} />
                    <Tooltip formatter={(v: any, name: string) => [name === 'valor' ? fmtBRL(Number(v)) : fmtNum(Number(v)), name === 'valor' ? 'Valor Total' : 'Quantidade']} labelFormatter={l => `Ano ${l}`} />
                    <Bar yAxisId="left" dataKey="valor" fill="#6366f1" opacity={0.85} radius={[4, 4, 0, 0]} name="valor">
                      {byAno.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={PALETTE[i % PALETTE.length]}
                          cursor="pointer"
                          onClick={() => { setDrillYear(String(entry.ano)); setFilterAno(String(entry.ano)); setPage(0); }}
                        />
                      ))}
                      <LabelList dataKey="valor" position="top" formatter={(v: number) => fmtCompact(v)} style={{ fontSize: 10, fill: '#374151' }} />
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="qtd" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} name="qtd" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Situação Atual */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Car size={15} className="text-indigo-500" />
              Situação Atual dos Veículos
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bySituacao} layout="vertical" margin={{ top: 5, right: 36, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
                <Tooltip formatter={(v: any) => fmtNum(Number(v))} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Qtd">
                  {bySituacao.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={SITUACAO_COLOR[entry.name] ?? PALETTE[i % PALETTE.length]}
                      cursor="pointer"
                      onClick={() => { setFilterSituacao(entry.name); setPage(0); }}
                    />
                  ))}
                  <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: '#374151' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── POR MONTADORA + MODELOS ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Building2 size={15} className="text-indigo-500" />
              Veículos por Montadora
            </h3>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              <ResponsiveContainer width="100%" height={marcaChartHeight}>
                <BarChart data={byMarca} layout="vertical" margin={{ top: 4, right: 50, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="marca" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="qtd" fill="#6366f1" opacity={0.85} radius={[0, 4, 4, 0]} name="Qtd">
                  {byMarca.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={PALETTE[i % PALETTE.length]}
                      cursor="pointer"
                      onClick={() => { setFilterMarca(entry.marca); setPage(0); }}
                    />
                  ))}
                  <LabelList dataKey="qtd" position="right" style={{ fontSize: 11, fill: '#374151' }} />
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Car size={15} className="text-emerald-500" />
              Top 15 Modelos Comprados
            </h3>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              <ResponsiveContainer width="100%" height={modeloChartHeight}>
                <BarChart data={byModelo} layout="vertical" margin={{ top: 4, right: 50, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="modelo" tick={{ fontSize: 10 }} width={165} />
                <Tooltip />
                <Bar dataKey="qtd" fill="#10b981" opacity={0.85} radius={[0, 4, 4, 0]} name="Qtd">
                  <LabelList dataKey="qtd" position="right" style={{ fontSize: 11, fill: '#374151' }} />
                  {byModelo.map((entry, i) => (
                    <Cell key={`m-${i}`} cursor="pointer" onClick={() => { setFilterModelo(entry.modelo); setPage(0); }} fill="transparent" />
                  ))}
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── FINANCIAMENTO ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tipo Aquisição */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">💳 Tipo de Aquisição</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byTipoAq} margin={{ top: 10, right: 16, left: 4, bottom: 65 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="tipo" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmtNum(Number(v))} />
                <Bar dataKey="qtd" radius={[4, 4, 0, 0]} name="Qtd">
                  {byTipoAq.map((entry, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} cursor="pointer" onClick={() => { setFilterTipoAq(entry.tipo); setPage(0); }} />
                  ))}
                  <LabelList dataKey="qtd" position="top" style={{ fontSize: 10, fill: '#374151' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Bancos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">🏦 Instituições Financeiras</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byBanco} layout="vertical" margin={{ top: 4, right: 44, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="banco" tick={{ fontSize: 9 }} width={135} />
                <Tooltip />
                <Bar dataKey="qtd" fill="#f59e0b" opacity={0.9} radius={[0, 4, 4, 0]} name="Qtd">
                  <LabelList dataKey="qtd" position="right" style={{ fontSize: 11, fill: '#374151' }} />
                  {byBanco.map((entry, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} cursor="pointer" onClick={() => { setFilterBanco(entry.banco); setPage(0); }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* % FIPE histograma */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">📊 Distribuição % FIPE</h3>
            <p className="text-xs text-slate-400 mb-3">
              Média: <strong className={pctFipeMedio > 100 ? 'text-amber-600' : 'text-emerald-600'}>
                {pctFipeMedio.toFixed(1)}%
              </strong>
              &nbsp;·&nbsp;
              <span className="text-emerald-600">verde = abaixo</span>
              &nbsp;
              <span className="text-amber-500">amarelo = acima</span>
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byFipeBucket} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="faixa" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qtd" name="Qtd" radius={[4, 4, 0, 0]}>
                  {byFipeBucket.map((entry, i) => {
                    const isAbove = ['100–110%', '110–120%', '> 120%'].includes(entry.faixa);
                    return (
                      <Cell
                        key={i}
                        fill={isAbove ? '#f59e0b' : '#10b981'}
                        opacity={0.85}
                        cursor="pointer"
                        onClick={() => { setFilterFipe(entry.faixa); setPage(0); }}
                      />
                    );
                  })}
                  <LabelList dataKey="qtd" position="top" style={{ fontSize: 10 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── POR FILIAL ───────────────────────────────────────────── */}
        {hasFilialData && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">🏢 Compras por Filial</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byFilial} margin={{ top: 10, right: 20, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="filial" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="qtd" fill="#a855f7" opacity={0.85} radius={[4, 4, 0, 0]} name="Qtd">
                  {byFilial.map((_entry, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} cursor="pointer" onClick={() => { /* optional: add filterFilial if needed */ setPage(0); }} />
                  ))}
                  <LabelList dataKey="qtd" position="top" style={{ fontSize: 11 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── TABELA ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Listagem de Veículos</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {fmtNum(tableData.length)} registros{search ? ` · filtrado por "${search}"` : ''}
              </p>
            </div>
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              placeholder="Buscar placa, modelo ou marca..."
              className="w-64 text-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[
                    { label: 'Placa', field: 'placa' },
                    { label: 'Chassi', field: 'chassi' },
                    { label: 'RENAVAM', field: 'renavam' },
                    { label: 'Modelo', field: 'modelo' },
                    { label: 'Marca', field: 'marca' },
                    { label: 'Ano Modelo', field: 'ano_modelo' },
                    { label: 'Ano Fab.', field: 'ano_fabricacao' },
                    { label: 'Data Compra', field: 'data_compra' },
                    { label: 'Valor Compra', field: 'valor_compra' },
                    { label: 'Valor Atual FIPE', field: 'valor_atual_fipe' },
                    { label: '% FIPE', field: 'percentual_fipe' },
                    { label: 'Acessórios', field: 'valor_acessorios' },
                    { label: 'Tipo Aquisição', field: 'tipoAquisicao' },
                    { label: 'Banco', field: 'banco' },
                    { label: 'Patio', field: 'patio' },
                    { label: 'Filial', field: 'filial' },
                    { label: 'Situação', field: 'situacao_atual' },
                  ].map(col => (
                    <th
                      key={col.field}
                      onClick={() => toggleSort(col.field)}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800 whitespace-nowrap select-none"
                    >
                      {col.label}{' '}
                      {sortField === col.field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedTable.map((r, i) => {
                  const vc = parseCurrency(r.valor_compra || r.ValorCompra);
                  const pct = parseFloat(r.percentual_fipe || 0);
                  const sitStyle: Record<string, string> = {
                    Vendido: 'bg-indigo-50 text-indigo-700',
                    Locado: 'bg-emerald-50 text-emerald-700',
                    'Em Estoque': 'bg-amber-50 text-amber-700',
                    Desativado: 'bg-red-50 text-red-700',
                  };
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-800">{r.Placa || r.placa}</td>
                      <td className="px-4 py-2.5 text-slate-700 text-xs">{r.Chassi || r.chassi || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-700 text-xs">{r.Renavam || r.renavam || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-700 max-w-[200px] truncate text-xs" title={r.Modelo || r.modelo}>
                        {(r.Modelo || r.modelo || '').substring(0, 32)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{(r.marca || '').split(' - ')[0]}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600 text-xs">{r.AnoModelo || r.ano_modelo || '—'}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600 text-xs">{r.ano_fabricacao}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">
                        {r.data_compra ? new Date(r.data_compra).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800 text-xs">{fmtBRL(vc)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800 text-xs">{r.ValorAtualFIPE ? fmtBRL(parseCurrency(r.ValorAtualFIPE)) : r.valor_atual_fipe ? fmtBRL(parseCurrency(r.valor_atual_fipe)) : '—'}</td>
                      <td className={`px-4 py-2.5 text-right font-medium text-xs ${pct > 100 ? 'text-amber-600' : pct > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{r.valor_acessorios ? fmtBRL(parseCurrency(r.valor_acessorios)) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{r.tipoAquisicao}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[150px] truncate">{r.banco}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{r.Patio || r.patio || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{r.filial}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sitStyle[r.situacao_atual ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>
                          {r.situacao_atual || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-slate-500">
                Página {page + 1} de {totalPages} · {fmtNum(tableData.length)} registros
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 transition"
                >
                  ← Anterior
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 transition"
                >
                  Próximo →
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
