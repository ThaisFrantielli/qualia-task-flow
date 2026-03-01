import React, { useMemo, useState, type ReactNode } from 'react';
import useBIDataBatch, { getBatchTable } from '@/hooks/useBIDataBatch';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import {
  ResponsiveContainer, BarChart, Bar,
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

// ── fat_faturamentos
const FID_KEYS   = ['IdNota', 'idnota', 'IdFaturamento', 'idfaturamento', 'id_faturamento', 'Id', 'id'];
const FNOTA_KEYS  = ['Nota', 'nota', 'NumeroNota', 'numeronota', 'NF', 'nf'];
const FDATA_KEYS  = ['DataEmissao', 'dataemissao', 'DataFaturamento', 'datafaturamento', 'DataCompetencia', 'datacompetencia', 'Data', 'data'];
const FCOMP_KEYS  = ['DataCompetencia', 'datacompetencia', 'DataEmissao', 'dataemissao'];
const FCLIENTE_KEYS = ['Cliente', 'NomeCliente', 'nomecliente', 'ClienteNome', 'clientenome', 'RazaoSocial', 'razaosocial'];
const FCONTRATO_KEYS = ['ContratoLocacao', 'contratolocacao', 'Contrato', 'NumeroContrato', 'numerocontrato'];
const FVALOR_KEYS = ['ValorTotal', 'valortotal', 'Valor', 'ValorFaturado', 'valorfaturado', 'ValorBruto', 'valorbruto'];
const FVALLOC_KEYS = ['ValorLocacao', 'valorlocacao'];
const FVALREEMB_KEYS = ['ValorReembolsaveis', 'valorreembolsaveis', 'ValorReembolso', 'valorreembolso'];
const FSTATUS_KEYS = ['SituacaoNota', 'situacaonota', 'Status', 'SituacaoFaturamento', 'situacaofaturamento', 'Situacao', 'situacao'];
const FVENC_KEYS  = ['Vencimento', 'vencimento', 'DataVencimento', 'datavencimento'];
const FPAGTO_KEYS = ['DataPagamento', 'datapagamento', 'DataPago', 'datapago'];
const FTIPO_KEYS = ['TipoFaturamento', 'tipofaturamento', 'Tipo', 'tipo', 'Natureza', 'natureza'];

// ── fat_faturamento_itens
const IITEM_ID_KEYS = ['IdItem', 'iditem', 'Id', 'id'];
const IFAT_ID_KEYS  = ['IdNota', 'idnota', 'IdFaturamento', 'idfaturamento', 'id_faturamento'];
const IDESC_KEYS    = ['Descricao', 'descricao', 'Produto', 'produto', 'Servico', 'servico', 'Item', 'item'];
const IQTD_KEYS     = ['Quantidade', 'quantidade', 'Qtd', 'qtd'];
const IVUNIT_KEYS   = ['ValorUnitario', 'valorunitario', 'PrecoUnitario', 'precounitario'];
const IVALOR_KEYS   = ['ValorTotal', 'valortotal', 'Valor', 'ValorItem', 'valoritem'];
const ITIPO_KEYS    = ['TipoItem', 'tipoitem', 'Tipo', 'tipo', 'TipoReceita', 'tiporeceita'];
const IPLACA_KEYS   = ['Placa', 'placa', 'PlacaVeiculo', 'placaveiculo'];
const ICONT_LOC_KEYS = ['ContratoLocacao', 'contratolocacao', 'contrato_locacao', 'IdContratoLocacao', 'idcontratolocacao', 'IdContrato', 'idcontrato'];

// ── dim_contratos_locacao
const DCONT_LOC_KEYS = ['ContratoLocacao', 'contratolocacao', 'NumeroContratoLocacao', 'numerocontratolocacao', 'NumeroContrato', 'numerocontrato'];
const DCONT_COM_KEYS = ['ContratoComercial', 'contratocomercial', 'NumeroContratoComercial', 'numerocontratocomercial'];
const DCLIENTE_KEYS  = ['NomeCliente', 'nomecliente', 'Cliente', 'cliente'];
const DTIPO_CONT_KEYS = ['TipoDeContrato', 'tipodecontrato', 'TipoLocacao', 'tipolocacao', 'Tipo', 'tipo'];
const DSITUACAO_KEYS = ['SituacaoContratoLocacao', 'situacaocontratolocacao', 'SituacaoContrato', 'situacaocontrato'];
const DPLACA_KEYS    = ['PlacaPrincipal', 'placaprincipal', 'Placa', 'placa'];

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

class ErrorBoundary extends React.Component<{ children: ReactNode }, { error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { error };
  }

  componentDidCatch(error: any, info: any) {
    // log to console so developer sees stack in terminal
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-start justify-center p-6 bg-red-50">
          <div className="max-w-3xl w-full bg-white border border-red-200 rounded-2xl p-6">
            <h3 className="text-red-700 font-semibold">Erro ao renderizar dashboard</h3>
            <pre className="mt-3 text-xs text-slate-700 whitespace-pre-wrap break-words">{String(this.state.error)}</pre>
            <p className="mt-3 text-xs text-slate-500">Verifique o console do navegador e o terminal para detalhes.</p>
          </div>
        </div>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FaturamentoDashboardInner(): JSX.Element {
  // ── Filtros ativos (ano padrão 2026)
  const [filtroAno, setFiltroAno] = useState<number>(2026);
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroTipoFaturamento, setFiltroTipoFaturamento] = useState('Locação');
  const [tabTipoSelecionada, setTabTipoSelecionada] = useState<string>('Locação');
  const [filtroCliente, setFiltroCliente] = useState('Todos');
  const [filtroContratoLoc, setFiltroContratoLoc] = useState('Todos');
  const [filtroContratoComercial, setFiltroContratoComercial] = useState('Todos');
  const [filtroTipoContrato, setFiltroTipoContrato] = useState('Todos');
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtroMes, setFiltroMes] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const { results, loading, metadata, refetch } = useBIDataBatch(
    ['fat_faturamentos', 'fat_faturamento_itens', 'dim_contratos_locacao'],
    undefined,
    { params: { year: filtroAno } }
  );

  const faturas = useMemo<AnyObject[]>(() => {
    return getBatchTable<AnyObject>(results, 'fat_faturamentos');
  }, [results]);

  const itensBrutos = useMemo<AnyObject[]>(() => {
    return getBatchTable<AnyObject>(results, 'fat_faturamento_itens');
  }, [results]);

  const contratosLocacao = useMemo<AnyObject[]>(() => {
    return getBatchTable<AnyObject>(results, 'dim_contratos_locacao');
  }, [results]);

  // Mapa: ContratoLocacao (número, uppercase) → objeto do contrato
  const contratoLocByNum = useMemo(() => {
    const m = new Map<string, AnyObject>();
    for (const c of contratosLocacao) {
      const num = getStr(c, ...DCONT_LOC_KEYS);
      if (num) m.set(num.toUpperCase(), c);
    }
    return m;
  }, [contratosLocacao]);

  // Mapa: Contrato por ID (quando a tabela de itens referencia IdContratoLocacao)
  const contratoLocById = useMemo(() => {
    const m = new Map<string, AnyObject>();
    for (const c of contratosLocacao) {
      // procurar possíveis chaves de id
      const idCandidates = ['IdContratoLocacao','IdContrato','Id','idcontratolocacao','idcontrato','id'];
      for (const k of idCandidates) {
        const v = getField(c, k);
        if (v != null && String(v).trim() !== '') {
          m.set(String(v), c);
          break;
        }
      }
    }
    return m;
  }, [contratosLocacao]);

  // Mapa: placa (uppercase) -> contrato (quando dim_contratos_locacao tem placa principal)
  const plateToContrato = useMemo(() => {
    const m = new Map<string, AnyObject>();
    for (const c of contratosLocacao) {
      const placa = getStr(c, ...DPLACA_KEYS);
      if (placa) m.set(placa.toUpperCase(), c);
    }
    return m;
  }, [contratosLocacao]);

  // Mapa: idFatura (idNota) → primeiro contrato encontrado via seus itens
  const faturaToContrato = useMemo(() => {
    const m = new Map<string, AnyObject>();
    for (const item of itensBrutos) {
      const idFat  = getStr(item, ...IFAT_ID_KEYS);
      if (!idFat || m.has(idFat)) continue;
      const cLoc   = getStr(item, ...ICONT_LOC_KEYS);
      let contrato: AnyObject | undefined;
      if (cLoc) {
        // tentar por número normalizado
        contrato = contratoLocByNum.get(String(cLoc).toUpperCase()) || contratoLocById.get(String(cLoc));
      }
      // tentar também por id numérico presente em campos como IdContratoLocacao
      if (!contrato) {
        const idCandidate = getField(item, 'IdContratoLocacao', 'IdContrato', 'idcontratolocacao', 'idcontrato');
        if (idCandidate) contrato = contratoLocById.get(String(idCandidate));
      }
      // se ainda não achou, tentar por placa presente no item (descrição)
      if (!contrato) {
        const placaRaw = getStr(item, ...IPLACA_KEYS) || getStr(item, ...IDESC_KEYS);
        const plateMatch = String(placaRaw).toUpperCase().match(/[A-Z]{3}-?\d{4}/);
        if (plateMatch) {
          const p = plateMatch[0].replace('-', '').toUpperCase();
          // procurar com e sem hífen
          contrato = plateToContrato.get(p) || plateToContrato.get(plateMatch[0].toUpperCase());
        }
      }
      if (contrato) m.set(idFat, contrato);
    }
    return m;
  }, [itensBrutos, contratoLocByNum, contratoLocById, plateToContrato]);

  // Mapa auxiliar: idFatura → todas as placas dos itens (para drill-down)
  const faturaToPlacas = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const item of itensBrutos) {
      const idFat = getStr(item, ...IFAT_ID_KEYS);
      let placa = getStr(item, ...IPLACA_KEYS);
      if (!placa) {
        // tentar extrair placa da descrição (formato ABC-1234 ou ABC1234)
        const desc = getStr(item, ...IDESC_KEYS);
        const pm = desc.toUpperCase().match(/[A-Z]{3}-?\d{4}/);
        placa = pm ? pm[0].replace('-', '') : '';
      }
      if (!idFat) continue;
      if (!m.has(idFat)) m.set(idFat, new Set());
      if (placa) m.get(idFat)!.add(String(placa).toUpperCase());
    }
    return m;
  }, [itensBrutos]);

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
    // Preferir nome vindo de dim_contratos_locacao quando disponível
    for (const f of faturas) {
      const id = getStr(f, ...FID_KEYS);
      const contrato = id ? faturaToContrato.get(id) : undefined;
      const v = contrato ? getStr(contrato, ...DCLIENTE_KEYS) : getStr(f, ...FCLIENTE_KEYS);
      if (v) s.add(v);
    }
    return ['Todos', ...Array.from(s).sort()];
  }, [faturas, faturaToContrato]);

  const tipoFaturamentoOptions = useMemo(() => {
    const s = new Set<string>();
    for (const f of faturas) {
      const v = getStr(f, ...FTIPO_KEYS);
      if (v) s.add(v);
    }
    return ['Todos', ...Array.from(s).sort()];
  }, [faturas]);

  // Abas do dashboard por tipo de faturamento (garantir 'Locação' como primeira)
  const tabsTipoFaturamento = useMemo(() => {
    const opts = tipoFaturamentoOptions.filter(x => x !== 'Todos');
    // garantir order com 'Locação' primeiro
    const ordered = [];
    if (opts.includes('Locaçã o') || opts.includes('LocaÃ§Ã£o') || opts.includes('Locação')) {
      const found = opts.find(x => /loca/i.test(x));
      if (found) ordered.push(found);
    }
    for (const o of opts) if (!ordered.includes(o)) ordered.push(o);
    // adicionar opção Todos no final
    return [...ordered, 'Todos'];
  }, [tipoFaturamentoOptions]);

  const anoOptions = useMemo(() => {
    const s = new Set<number>();
    for (const f of faturas) {
      const d = getStr(f, ...FDATA_KEYS) || getStr(f, ...FCOMP_KEYS);
      if (d) { const y = new Date(d).getFullYear(); if (isFinite(y) && y > 2000) s.add(y); }
    }
    return [0, ...Array.from(s).sort((a, b) => b - a)];
  }, [faturas]);

  // Opções de mês (para filtro de meses) extraídas das datas das faturas
  const monthOptions = useMemo(() => {
    const s = new Set<string>();
    for (const f of faturas) {
      const d = getStr(f, ...FDATA_KEYS) || getStr(f, ...FCOMP_KEYS);
      if (!d) continue;
      const dt = new Date(d);
      if (!isFinite(dt.getTime())) continue;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      const label = `${dt.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}/${dt.getFullYear()}`;
      s.add(`${key}|${label}`);
    }
    const arr = Array.from(s).map(x => {
      const [k, l] = x.split('|');
      return { key: k, label: l };
    }).sort((a, b) => b.key.localeCompare(a.key));
    return [{ key: 'Todos', label: 'Todos os meses' }, ...arr];
  }, [faturas]);

  // Opções de Contrato Locação (extraídas de dim_contratos_locacao)
  const contratoLocOptions = useMemo(() => {
    const s = new Set<string>();
    for (const c of contratosLocacao) {
      const v = getStr(c, ...DCONT_LOC_KEYS);
      if (v) s.add(v);
    }
    return ['Todos', ...Array.from(s).sort()];
  }, [contratosLocacao]);

  // Opções de Contrato Comercial (extraídas de dim_contratos_locacao)
  const contratoComOptions = useMemo(() => {
    const s = new Set<string>();
    for (const c of contratosLocacao) {
      const v = getStr(c, ...DCONT_COM_KEYS);
      if (v) s.add(v);
    }
    return ['Todos', ...Array.from(s).sort()];
  }, [contratosLocacao]);

  // Opções de tipo de contrato
  const tipoContratoOptions = useMemo(() => {
    const s = new Set<string>();
    for (const c of contratosLocacao) {
      const v = getStr(c, ...DTIPO_CONT_KEYS);
      if (v) s.add(v);
    }
    return ['Todos', ...Array.from(s).sort()];
  }, [contratosLocacao]);

  

  // Resolve nome do cliente da fatura priorizando dim_contratos_locacao
  const resolveCliente = (f: AnyObject): string => {
    const id = getStr(f, ...FID_KEYS);
    const contrato = id ? faturaToContrato.get(id) : undefined;
    return (contrato ? getStr(contrato, ...DCLIENTE_KEYS) : '') || getStr(f, ...FCLIENTE_KEYS);
  };

  // ── Faturas filtradas
  const faturasFiltradas = useMemo(() => {
    return faturas.filter((f) => {
      const id = getStr(f, ...FID_KEYS);
      const contrato = id ? faturaToContrato.get(id) : undefined;
      const clienteNome = resolveCliente(f);

      if (filtroAno !== 0) {
        const d = getStr(f, ...FDATA_KEYS) || getStr(f, ...FCOMP_KEYS);
        if (!d || new Date(d).getFullYear() !== filtroAno) return false;
      }
      if (filtroStatus !== 'Todos') {
        const s = getStr(f, ...FSTATUS_KEYS);
        if (s !== filtroStatus) return false;
      }
      if (filtroTipoFaturamento !== 'Todos') {
        const tf = getStr(f, ...FTIPO_KEYS);
        if (tf !== filtroTipoFaturamento) return false;
      }
      if (filtroCliente !== 'Todos') {
        if (clienteNome !== filtroCliente) return false;
      }
      if (filtroContratoLoc !== 'Todos') {
        const cLoc = contrato
          ? getStr(contrato, ...DCONT_LOC_KEYS)
          : getStr(f, ...FCONTRATO_KEYS);
        if (cLoc !== filtroContratoLoc) return false;
      }
      if (filtroContratoComercial !== 'Todos') {
        const cCom = contrato ? getStr(contrato, ...DCONT_COM_KEYS) : '';
        if (cCom !== filtroContratoComercial) return false;
      }
      if (filtroTipoContrato !== 'Todos') {
        const tipo = contrato ? getStr(contrato, ...DTIPO_CONT_KEYS) : '';
        if (tipo !== filtroTipoContrato) return false;
      }
      if (filtroMes) {
        const d = getStr(f, ...FDATA_KEYS) || getStr(f, ...FCOMP_KEYS);
        if (!d) return false;
        const dt = new Date(d);
        if (!isFinite(dt.getTime())) return false;
        const mk = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
        if (mk !== filtroMes) return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        return (
          clienteNome.toLowerCase().includes(q) ||
          (contrato ? getStr(contrato, ...DCONT_LOC_KEYS) : getStr(f, ...FCONTRATO_KEYS)).toLowerCase().includes(q) ||
          (contrato ? getStr(contrato, ...DCONT_COM_KEYS) : '').toLowerCase().includes(q) ||
          getStr(f, ...FID_KEYS).toLowerCase().includes(q) ||
          getStr(f, ...FNOTA_KEYS).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [faturas, filtroAno, filtroStatus, filtroCliente, filtroContratoLoc, filtroContratoComercial, filtroTipoContrato, searchText, filtroMes, faturaToContrato]);

  // Faturas sem filtro de mês — base para o gráfico (mantém todos os meses visíveis)
  const faturasSemFiltroMes = useMemo(() => {
    if (!filtroMes) return faturasFiltradas;
    return faturas.filter((f) => {
      const id = getStr(f, ...FID_KEYS);
      const contrato = id ? faturaToContrato.get(id) : undefined;
      const clienteNome = resolveCliente(f);

      if (filtroAno !== 0) {
        const d = getStr(f, ...FDATA_KEYS) || getStr(f, ...FCOMP_KEYS);
        if (!d || new Date(d).getFullYear() !== filtroAno) return false;
      }
      if (filtroStatus !== 'Todos') {
        const s = getStr(f, ...FSTATUS_KEYS);
        if (s !== filtroStatus) return false;
      }
      if (filtroTipoFaturamento !== 'Todos') {
        const tf = getStr(f, ...FTIPO_KEYS);
        if (tf !== filtroTipoFaturamento) return false;
      }
      if (filtroCliente !== 'Todos') {
        if (clienteNome !== filtroCliente) return false;
      }
      if (filtroContratoLoc !== 'Todos') {
        const cLoc = contrato
          ? getStr(contrato, ...DCONT_LOC_KEYS)
          : getStr(f, ...FCONTRATO_KEYS);
        if (cLoc !== filtroContratoLoc) return false;
      }
      if (filtroContratoComercial !== 'Todos') {
        const cCom = contrato ? getStr(contrato, ...DCONT_COM_KEYS) : '';
        if (cCom !== filtroContratoComercial) return false;
      }
      if (filtroTipoContrato !== 'Todos') {
        const tipo = contrato ? getStr(contrato, ...DTIPO_CONT_KEYS) : '';
        if (tipo !== filtroTipoContrato) return false;
      }
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        return (
          clienteNome.toLowerCase().includes(q) ||
          (contrato ? getStr(contrato, ...DCONT_LOC_KEYS) : getStr(f, ...FCONTRATO_KEYS)).toLowerCase().includes(q) ||
          (contrato ? getStr(contrato, ...DCONT_COM_KEYS) : '').toLowerCase().includes(q) ||
          getStr(f, ...FID_KEYS).toLowerCase().includes(q) ||
          getStr(f, ...FNOTA_KEYS).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [faturas, filtroAno, filtroStatus, filtroCliente, filtroContratoLoc, filtroContratoComercial, filtroTipoContrato, searchText, filtroMes, faturaToContrato, faturasFiltradas]);

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
  const MESES_PT_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const evolucaoMensal = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of faturasSemFiltroMes) {
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
        const month = parseInt(key.split('-')[1], 10) - 1;
        return { mesKey: key, mes: MESES_PT_SHORT[month] ?? key, valor };
      });
  }, [faturasSemFiltroMes]);

  // ── Top clientes
  const topClientes = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of faturasFiltradas) {
      const c = resolveCliente(f) || 'Não informado';
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
              <p className="text-sm text-slate-500">fat_faturamentos · fat_faturamento_itens · dim_contratos_locacao</p>
            </div>
          </div>
          <DataUpdateBadge metadata={metadata} />
        </div>

        {/* ── Filtros ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
          {/* Linha 1: Ano, Status, Cliente, busca */}
          <div className="flex flex-wrap gap-3 items-center">
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

            {/* Mês */}
            <select
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={filtroMes ?? 'Todos'}
              onChange={(e) => { setFiltroMes(e.target.value === 'Todos' ? null : e.target.value); setPage(1); }}
            >
              {monthOptions.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
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

            {/* Tipo de Faturamento */}
            <select
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={filtroTipoFaturamento}
              onChange={(e) => { setFiltroTipoFaturamento(e.target.value); setPage(1); }}
            >
              {tipoFaturamentoOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Cliente */}
            <select
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-[220px]"
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
              placeholder="Buscar cliente, contrato, NF, ID…"
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-56"
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            />
          </div>

          {/* Abas por Tipo de Faturamento */}
          <div className="pt-2">
            <div className="flex items-center gap-2">
              {tabsTipoFaturamento.map(t => {
                const isActive = t === tabTipoSelecionada || (t === 'Todos' && tabTipoSelecionada === 'Todos');
                return (
                  <button
                    key={t}
                    onClick={() => { setTabTipoSelecionada(t); setFiltroTipoFaturamento(t === 'Todos' ? 'Todos' : t); setPage(1); }}
                    className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Linha 2: Contrato Locação, Contrato Comercial, Tipo de Contrato */}
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contratos</span>

            {/* Tipo de Contrato */}
            <select
              className="text-sm border border-violet-200 rounded-lg px-3 py-1.5 bg-violet-50 text-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
              value={filtroTipoContrato}
              onChange={(e) => { setFiltroTipoContrato(e.target.value); setPage(1); }}
            >
              <option value="Todos">Todos os tipos</option>
              {tipoContratoOptions.filter(t => t !== 'Todos').map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Contrato Locação */}
            <select
              className="text-sm border border-sky-200 rounded-lg px-3 py-1.5 bg-sky-50 text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-300 max-w-[200px]"
              value={filtroContratoLoc}
              onChange={(e) => { setFiltroContratoLoc(e.target.value); setPage(1); }}
            >
              <option value="Todos">Todos — Locação</option>
              {contratoLocOptions.filter(c => c !== 'Todos').map(c => (
                <option key={c} value={c}>{c.length > 35 ? c.slice(0, 33) + '…' : c}</option>
              ))}
            </select>

            {/* Contrato Comercial */}
            <select
              className="text-sm border border-emerald-200 rounded-lg px-3 py-1.5 bg-emerald-50 text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 max-w-[200px]"
              value={filtroContratoComercial}
              onChange={(e) => { setFiltroContratoComercial(e.target.value); setPage(1); }}
            >
              <option value="Todos">Todos — Comercial</option>
              {contratoComOptions.filter(c => c !== 'Todos').map(c => (
                <option key={c} value={c}>{c.length > 35 ? c.slice(0, 33) + '…' : c}</option>
              ))}
            </select>

            {/* Limpar */}
            {(filtroAno !== 2026 || filtroStatus !== 'Todos' || filtroCliente !== 'Todos' ||
              filtroContratoLoc !== 'Todos' || filtroContratoComercial !== 'Todos' ||
              filtroTipoContrato !== 'Todos' || searchText || filtroMes) && (
              <button
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1.5 bg-red-50 hover:bg-red-100 transition-colors"
                onClick={() => {
                  setFiltroAno(2026); setFiltroStatus('Todos'); setFiltroCliente('Todos');
                  setFiltroContratoLoc('Todos'); setFiltroContratoComercial('Todos');
                  setFiltroTipoContrato('Todos'); setSearchText(''); setFiltroMes(null); setPage(1);
                }}
              >
                <X className="w-3 h-3" /> Limpar todos
              </button>
            )}

            <span className="ml-auto text-xs text-slate-400">{faturasFiltradas.length.toLocaleString('pt-BR')} faturas</span>
          </div>
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

        {/* ── Gráfico Faturamento Locação — estilo Power BI ───────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">FATURAMENTO LOCAÇÃO</h2>
            {filtroMes && (
              <button
                onClick={() => { setFiltroMes(null); setPage(1); }}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <X className="w-3 h-3" /> Limpar seleção
              </button>
            )}
          </div>
          {/* Legenda estilo Power BI */}
          <div className="flex flex-wrap gap-5 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className="w-3 h-3 rounded-sm" style={{ background: '#4472c4' }} />
              FaturamentoLocacaoEmitido
            </div>
          </div>
          {/* Instrução interativa */}
          <p className="text-[10px] text-slate-400 mb-3 italic">
            Clique em uma barra para filtrar os dados pelo mês selecionado
          </p>

          {evolucaoMensal.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Sem dados para exibir</div>
          ) : (
            // Wrapper that forces a horizontal scroll and shows 12 barras por vez
            (() => {
              const VISIBLE_BARS = 12;
              const BAR_SIZE = 60; // largura aproximada de cada barra em px
              const GAP = 12; // espaçamento estimado
              const chartWidth = Math.max(evolucaoMensal.length * (BAR_SIZE + GAP), VISIBLE_BARS * (BAR_SIZE + GAP));
              const viewportWidth = VISIBLE_BARS * (BAR_SIZE + GAP);
              return (
                <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div style={{ width: viewportWidth, minWidth: viewportWidth }}>
                    <div style={{ width: chartWidth }}>
                      <BarChart
                        width={chartWidth}
                        height={300}
                        data={evolucaoMensal}
                        margin={{ top: 28, right: 16, left: 0, bottom: 5 }}
                        onClick={(data) => {
                          if (data?.activePayload?.[0]) {
                            const mesKey = (data.activePayload[0].payload as { mesKey: string }).mesKey;
                            setFiltroMes(prev => prev === mesKey ? null : mesKey);
                            setPage(1);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <CartesianGrid stroke="#e8ecf0" vertical={false} />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 11, fill: '#475569' }}
                          tickLine={false}
                          axisLine={{ stroke: '#cbd5e1' }}
                        />
                        <YAxis
                          tickFormatter={(v) => fmtCompact(v)}
                          tick={{ fontSize: 10, fill: '#94a3b8' }}
                          tickLine={false}
                          axisLine={false}
                          width={72}
                        />
                        <Tooltip
                          formatter={(v: number) => [fmtBRL(v), 'FaturamentoLocacaoEmitido']}
                          contentStyle={{
                            borderRadius: '0.5rem',
                            border: '1px solid #e2e8f0',
                            fontSize: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                          }}
                          cursor={{ fill: 'rgba(68,114,196,0.07)' }}
                        />
                        <Bar
                          dataKey="valor"
                          name="FaturamentoLocacaoEmitido"
                          radius={[2, 2, 0, 0]}
                          barSize={BAR_SIZE}
                        >
                          {evolucaoMensal.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={!filtroMes || filtroMes === entry.mesKey ? '#4472c4' : '#b0c4e8'}
                            />
                          ))}
                          <LabelList
                            dataKey="valor"
                            position="top"
                            formatter={(v: number) => fmtCompact(v)}
                            style={{ fontSize: 9, fill: '#334155', fontWeight: 600 }}
                          />
                        </Bar>
                      </BarChart>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
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
                  <th className="px-4 py-3 text-left">Nº NF</th>
                  <th className="px-4 py-3 text-left">Emissão</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Cont. Locação</th>
                  <th className="px-4 py-3 text-left">Cont. Comercial</th>
                  <th className="px-4 py-3 text-left">Tipo Contrato</th>
                  <th className="px-4 py-3 text-left">Placa(s)</th>
                  <th className="px-4 py-3 text-right">Valor Total</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Vencimento</th>
                  <th className="px-4 py-3 text-left">Pgto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faturasPagina.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-slate-400 text-sm">
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
                    const contrato = faturaToContrato.get(id);
                    const clienteNome = resolveCliente(f);
                    const contratoLocNum = contrato
                      ? getStr(contrato, ...DCONT_LOC_KEYS)
                      : getStr(f, ...FCONTRATO_KEYS);
                    const contratoComNum = contrato ? getStr(contrato, ...DCONT_COM_KEYS) : '';
                    const tipoContrato   = contrato ? getStr(contrato, ...DTIPO_CONT_KEYS) : '';
                    const situacaoCont   = contrato ? getStr(contrato, ...DSITUACAO_KEYS) : '';
                    const placasSet      = faturaToPlacas.get(id);
                    const placasStr      = placasSet && placasSet.size > 0
                      ? Array.from(placasSet).join(', ')
                      : (contrato ? getStr(contrato, ...DPLACA_KEYS) : '') || '—';
                    const nfNum = getStr(f, ...FNOTA_KEYS) || id;

                    return (
                      <React.Fragment key={`group-${id}`}>
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
                          {/* Nº NF */}
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{nfNum || '—'}</td>
                          {/* Emissão */}
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            {fmtDate(getStr(f, ...FDATA_KEYS) || getStr(f, ...FCOMP_KEYS))}
                          </td>
                          {/* Cliente */}
                          <td className="px-4 py-3 text-slate-800 font-medium max-w-[180px] truncate" title={clienteNome}>
                            {clienteNome || '—'}
                          </td>
                          {/* Contrato Locação */}
                          <td className="px-4 py-3 text-sky-700 text-xs font-mono max-w-[120px] truncate" title={contratoLocNum}>
                            {contratoLocNum || '—'}
                          </td>
                          {/* Contrato Comercial */}
                          <td className="px-4 py-3 text-emerald-700 text-xs font-mono max-w-[120px] truncate" title={contratoComNum}>
                            {contratoComNum || '—'}
                          </td>
                          {/* Tipo de Contrato */}
                          <td className="px-4 py-3">
                            {tipoContrato
                              ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">{tipoContrato}</span>
                              : '—'
                            }
                          </td>
                          {/* Placa(s) */}
                          <td className="px-4 py-3 font-mono text-xs text-slate-500 max-w-[110px] truncate" title={placasStr}>
                            {placasStr}
                          </td>
                          {/* Valor Total */}
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {fmtBRL(getNum(f, ...FVALOR_KEYS))}
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3">
                            {status ? (
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{status}</span>
                            ) : '—'}
                          </td>
                          {/* Vencimento */}
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(getStr(f, ...FVENC_KEYS))}</td>
                          {/* Pagamento */}
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(getStr(f, ...FPAGTO_KEYS))}</td>
                        </tr>

                        {/* ── Drill-down ─────────────────────────────────────────────── */}
                        {isExpanded && (
                          <tr key={`items-${id}`} className="bg-indigo-50/60">
                            <td colSpan={12} className="px-6 py-4">
                              <div className="rounded-xl border border-indigo-100 bg-white overflow-hidden">

                                {/* Cabeçalho do drill-down com info do contrato */}
                                <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50 flex flex-wrap items-start gap-6">
                                  <div>
                                    <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">NF / Fatura</p>
                                    <p className="text-sm font-bold text-indigo-700">#{nfNum}</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Cliente</p>
                                    <p className="text-sm font-medium text-slate-700">{clienteNome || '—'}</p>
                                  </div>
                                  {contratoLocNum && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider mb-0.5">Contrato Locação</p>
                                      <p className="text-sm font-mono text-sky-700">{contratoLocNum}</p>
                                    </div>
                                  )}
                                  {contratoComNum && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-0.5">Contrato Comercial</p>
                                      <p className="text-sm font-mono text-emerald-700">{contratoComNum}</p>
                                    </div>
                                  )}
                                  {tipoContrato && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-0.5">Tipo</p>
                                      <p className="text-sm text-violet-700">{tipoContrato}</p>
                                    </div>
                                  )}
                                  {situacaoCont && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Situação Contrato</p>
                                      <p className="text-sm text-slate-600">{situacaoCont}</p>
                                    </div>
                                  )}
                                  {contrato && getStr(contrato, ...DPLACA_KEYS) && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Placa Principal</p>
                                      <p className="text-sm font-mono text-slate-700">{getStr(contrato, ...DPLACA_KEYS)}</p>
                                    </div>
                                  )}
                                  <div className="ml-auto text-right">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Total da Fatura</p>
                                    <p className="text-base font-bold text-slate-800">{fmtBRL(getNum(f, ...FVALOR_KEYS))}</p>
                                    {getNum(f, ...FVALLOC_KEYS) > 0 && (
                                      <p className="text-xs text-slate-400">Locação: {fmtBRL(getNum(f, ...FVALLOC_KEYS))}</p>
                                    )}
                                    {getNum(f, ...FVALREEMB_KEYS) > 0 && (
                                      <p className="text-xs text-slate-400">Reembolso: {fmtBRL(getNum(f, ...FVALREEMB_KEYS))}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Itens da fatura */}
                                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                                  <span className="text-xs font-semibold text-slate-500">Itens ({itens.length})</span>
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
                                        <th className="px-4 py-2 text-left">Placa</th>
                                        <th className="px-4 py-2 text-left">Cont. Locação</th>
                                        <th className="px-4 py-2 text-right">Qtd</th>
                                        <th className="px-4 py-2 text-right">Vl. Unitário</th>
                                        <th className="px-4 py-2 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {itens.map((item, iIdx) => {
                                        const itemPlaca = getStr(item, ...IPLACA_KEYS);
                                        const itemContLoc = getStr(item, ...ICONT_LOC_KEYS);
                                        const itemContrato = itemContLoc
                                          ? contratoLocByNum.get(itemContLoc.toUpperCase())
                                          : undefined;
                                        return (
                                          <tr key={iIdx} className="hover:bg-slate-50">
                                            <td className="px-4 py-2 font-mono text-slate-500">
                                              {getStr(item, ...IITEM_ID_KEYS) || iIdx + 1}
                                            </td>
                                            <td className="px-4 py-2 text-slate-700">
                                              {getStr(item, ...IDESC_KEYS) || '—'}
                                            </td>
                                            <td className="px-4 py-2 text-slate-500">
                                              {getStr(item, ...ITIPO_KEYS) || '—'}
                                            </td>
                                            <td className="px-4 py-2 font-mono text-slate-600">
                                              {itemPlaca || '—'}
                                            </td>
                                            <td className="px-4 py-2 font-mono text-sky-600" title={itemContLoc}>
                                              {itemContLoc
                                                ? <span title={itemContrato ? `${getStr(itemContrato, ...DCLIENTE_KEYS)} · ${getStr(itemContrato, ...DTIPO_CONT_KEYS)}` : itemContLoc}>
                                                    {itemContLoc.length > 20 ? itemContLoc.slice(0, 18) + '…' : itemContLoc}
                                                  </span>
                                                : '—'}
                                            </td>
                                            <td className="px-4 py-2 text-right text-slate-600">
                                              {getStr(item, ...IQTD_KEYS) || '—'}
                                            </td>
                                            <td className="px-4 py-2 text-right text-slate-600">
                                              {fmtBRL(getNum(item, ...IVUNIT_KEYS))}
                                            </td>
                                            <td className="px-4 py-2 text-right font-semibold text-slate-800">
                                              {fmtBRL(getNum(item, ...IVALOR_KEYS))}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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

export default function FaturamentoDashboard(): JSX.Element {
  return (
    <ErrorBoundary>
      <FaturamentoDashboardInner />
    </ErrorBoundary>
  );
}
