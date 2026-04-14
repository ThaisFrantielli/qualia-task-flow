import { useEffect, useMemo, useState, useRef } from 'react';
import useBIData from '@/hooks/useBIData';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Settings2, Download, Loader2, Plus, Trash2, X,
  Route, Wrench, ShieldAlert, BarChart3, DollarSign,
  Activity, Target, AlertTriangle, Gauge, Printer, Search,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ContratoRow {
  [key: string]: unknown;
  IdContratoLocacao?: string | number;
  ContratoComercial?: string | number;
  PlacaPrincipal?: string;
  NomeCliente?: string;
  DataInicial?: string;
  DataFinal?: string;
  TipoDeContrato?: string;
  TipoContrato?: string;
  TipoContratoLocacao?: string;
  TipoLocacao?: string;
  Publico?: string;
  SituacaoContratoComercial?: string;
  SituacaoContrato?: string;
  SituacaoContratoLocacao?: string;
  IdVeiculoPrincipal?: string | number;
}

interface FrotaRow {
  [key: string]: unknown;
  Placa?: string;
  placa?: string;
  IdVeiculo?: string | number;
  Modelo?: string;
  Grupo?: string;
  GrupoVeiculo?: string;
  Categoria?: string;
  CategoriaVeiculo?: string;
  ContratoComercial?: string | number;
  Contrato?: string | number;
  KmConfirmado?: number | string;
  KmInformado?: number | string;
  KM?: number | string;
  OdometroConfirmado?: number | string;
  OdometroAtual?: number | string;
}

interface ManutencaoRow { Placa:string; ValorTotal:number; ValorReembolsavel:number; DataEntrada:string; DataCriacaoOS:string; OrdemServicoCriadaEm?:string; DataCriacao?:string; IdOrdemServico?:string; idordemservico?:string; IdOcorrencia?:string|number; TipoOcorrencia?:string; Tipo?:string; TipoManutencao?:string; Situacao?:string; Status?:string; StatusOrdem?:string; SituacaoOcorrencia?:string; StatusOcorrencia?:string; SituacaoOrdemServico?:string; valortotal?:number; valorreembolsavel?:number; CustoTotalOS?:number; custo_total_os?:number; ValorTotalFatItens?:number|string; ValorReembolsavelFatItens?:number|string; }
interface RegrasContratoRow { Contrato:string; NomeRegra:string; ConteudoRegra:string | number | null; NomePolitica?:string | null; ConteudoPolitica?:string | null; Grupo?:string; GrupoVeiculo?:string; Categoria?:string; CategoriaVeiculo?:string; }
interface SinistroRow { Placa:string; DataSinistro:string; DataCriacao:string; ValorOrcado?:number|string; ValorOrcamento?:number|string; ValorTotal?:number|string; ValorTotalOS?:number|string; ValorNaoReembolsavel?:number|string; ValorNaoReembolsavelOS?:number|string; ValorReembolsavel?:number|string; ValorReembolsavelOS?:number|string; ValorFinaleiroCalculado?:number|string; IndenizacaoSeguradora?:number|string; ReembolsoTerceiro?:number|string; }
interface FaturamentoRow {
  IdNota:string;
  DataCompetencia?:string;
  Competencia?:string;
  DataEmissao?:string;
  DataCriacao?:string;
  Placa?:string;
  placa?:string;
  VlrLocacao?:number|string;
  ValorLocacao?:number|string;
  custoManPrevisto:number; custoManRealizado:number; difManPrevReal:number; pctDifManPrevReal:number; custoManLiquido:number; difCustoManLiq:number; pctDifCustoManLiq:number;
  totalManutencao:number; ticketMedio:number; custoKmMan:number;
  totalReembMan:number;
  custoLiqMan:number; pctReembolsadoMan:number; custoKmLiqMan:number;
  totalSinistro:number;
  totalReembSin:number;
  valorVeiculoFipe:number;
  qtdOsManutencao:number;
  qtdSinistros:number;
  custoLiqSin:number; pctReembolsadoSin:number;
  totalManSin:number; pctReembolsadoManSin:number;
  faturamentoTotal:number;
  faturamentoPrevisto:number;
  ultimoValorLocacao:number;
  diferencaFaturamento:number;
  projecaoFaturamento:number;
  pctManFat:number; pctCustoLiqManFat:number; pctSinFat:number; pctCustoLiqSinFat:number; pctManSinFat:number;
  years: Record<number, { pass:number; man:number; reembMan:number; sin:number; reembSin:number; fat:number; }>;
}

interface FaturamentoItemRow {
  IdNota?:string|number;
  IdItemNota?:string|number;
  IdVeiculo?:string|number;
  IdContratoLocacao?:string|number;
  IdContratoComercial?:string|number;
  ContratoComercial?:string;
  ValorTotal?:number|string;
  ValorUnitario?:number|string;
  DataAtualizacaoDados?:string;
}

interface PrecosLocacaoRow {
  IdContratoLocacao?:string|number;
  DataInicial?:string;
  PrecoUnitario?:number|string;
  ValorLocacao?:number|string;
  VlrLocacao?:number|string;
}

interface MovimentacaoVeiculoRow {
  IdContratoLocacao?: string|number;
  ContratoComercial?: string;
  Placa?: string;
  DataRetirada?: string;
  DataDevolucao?: string;
  DataEncerramento?: string;
  OdometroRetirada?: number|string;
  OdometroDevolucao?: number|string;
}

interface ManualCostRule { id:string; cto:string; grupo:string; custoKm:number; }

interface VehicleRow {
  idLocacao:string; idComercial:string; idVeiculo:string;
  placa:string; modelo:string; grupo:string; kmAtual:number; odometroRetirada:number; indiceKm:string;
  idadeEmMeses:number; rodagemMedia:number; dataInicial:string; vencimentoContrato:string; cliente:string; contrato:string;
  mesesRestantesContrato:number; kmEstimadoFimContrato:number;
  prazoRestDays:number;
  sitLoc:string; sitCTO:string;
  tipoContrato:string;
  isCortesia:boolean;
  franquiaBanco:number; custoKmManual:number | null;
  passagemTotal:number; passagemIdeal:number; diferencaPassagem:number; pctPassagem:number;
  custoManPrevisto:number; custoManRealizado:number; difManPrevReal:number; pctDifManPrevReal:number; custoManLiquido:number; difCustoManLiq:number; pctDifCustoManLiq:number;
  totalManutencao:number; ticketMedio:number; custoKmMan:number;
  totalReembMan:number;
  custoLiqMan:number; pctReembolsadoMan:number; custoKmLiqMan:number;
  totalSinistro:number;
  totalReembSin:number;
  valorVeiculoFipe:number;
  qtdOsManutencao:number;
  qtdSinistros:number;
  custoLiqSin:number; pctReembolsadoSin:number;
  totalManSin:number; pctReembolsadoManSin:number;
  faturamentoTotal:number;
  faturamentoPrevisto:number;
  ultimoValorLocacao:number;
  diferencaFaturamento:number;
  projecaoFaturamento:number;
  pctManFat:number; pctCustoLiqManFat:number; pctSinFat:number; pctCustoLiqSinFat:number; pctManSinFat:number;
  years: Record<number, { pass:number; man:number; reembMan:number; sin:number; reembSin:number; fat:number; }>;
}

interface MaintDetailRow {
  osId: string;
  date: Date | null;
  tipo: string;
  motivo: string;
  situacao: string;
  valorTotal: number;
  valorReembolsavel: number;
}

interface FaturamentoDetailRow {
  ano: number;
  mes: number;
  valor: number;
  descricao: string;
}

interface ContractExecutiveSummary {
  contrato: string;
  rows: VehicleRow[];
  isCortesia: boolean;
  clientes: string[];
  clientePrincipal: string;
  grupos: string[];
  tiposContrato: string[];
  inicioContrato: Date | null;
  fimContrato: Date | null;
  totalVeiculos: number;
  kmMedio: number;
  faturamentoTotal: number;
  faturamentoPrevisto: number;
  projecaoFaturamento: number;
  manutencaoBruta: number;
  manutencaoReembolso: number;
  manutencaoLiquida: number;
  sinistroBruto: number;
  sinistroReembolso: number;
  sinistroLiquido: number;
  custoTotalBruto: number;
  reembolsoTotal: number;
  custoTotalLiquido: number;
  pctRecuperacao: number;
  impactoLiqSobreFat: number;
  impactoBrutoSobreFat: number;
  passagemCriticos: number;
  riscoFinanceiroCriticos: number;
  totalSinistrosQtd: number;
  baseReembolsoSinistro: number;
  baseAtivoFipeSinistro: number;
  sinistralidadeReembolso: number;
  sinistralidadeOperacional: number;
  indiceFrequenciaSinistro: number;
  gravidadeMediaSinistro: number;
  indiceSeveridadeDano: number;
  proximosVencimentos90d: number;
  vencidos: number;
  sitLocTop: Array<{ label: string; count: number }>;
  sitCTOTop: Array<{ label: string; count: number }>;
  topOfensores: Array<{ placa: string; modelo: string; custo: number; perc: number; man: number; sin: number }>;
  recomendacoes: string[];
  status: 'Saudavel' | 'Atencao' | 'Critico';
}

type HealthStatus = ContractExecutiveSummary['status'];

interface CtoLocacaoSummary {
  idLocacao: string;
  isCortesia: boolean;
  clientePrincipal: string;
  totalVeiculos: number;
  kmMedio: number;
  faturamentoTotal: number;
  custoLiquido: number;
  pctRecuperacao: number;
  impactoLiqFat: number;
  sitLocTop: string;
  status: HealthStatus;
}

interface CtoResumoListRow {
  cto: string;
  isCortesia: boolean;
  clientePrincipal: string;
  totalVeiculos: number;
  kmMedio: number;
  faturamentoTotal: number;
  custoLiquido: number;
  pctRecuperacao: number;
  impactoLiqFat: number;
  status: HealthStatus;
  locacoes: CtoLocacaoSummary[];
}

type CtoListSortKey = 'cto' | 'cliente' | 'veiculos' | 'kmMedio' | 'faturamento' | 'custoLiquido' | 'pctRecuperacao' | 'impactoLiqFat' | 'status';

type DetailMode = 'manutencao' | 'sinistro' | 'mansin' | 'faturamento';

// ── Helpers ──────────────────────────────────────────────────────
const parseNum = (v: unknown): number => {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  let s = String(v).replace(/\s/g, '').replace('R$', '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  return parseFloat(s) || 0;
};
const fmtBRL = (v:number) => v===0?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const fmtBRLZero = (v:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v || 0);
const fmtKM2 = (v:number) => v===0?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const fmtPct = (v:number) => !isFinite(v)||isNaN(v)?'—':`${(v*100).toFixed(1)}%`;
const fmtNominal = (v:number) => {
  if (v === 0) return '—';
  const absDiff = Math.abs(v - Math.round(v));
  return absDiff < 1e-6 ? v.toLocaleString('pt-BR') : v.toFixed(1);
};
const daysUntil = (to:string) => {
  if (!to) return NaN;
  const d = parseDateFlexible(to);
  if (!d) return NaN;
  const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
};
const fmtNum = (v:number) => v===0?'—':v.toLocaleString('pt-BR');
const fmtInt = (v:number) => (v === 0 || v == null || !isFinite(Number(v))) ? '—' : String(Math.round(Number(v)).toLocaleString('pt-BR'));
const kmLabel = (km:number) => km>=100000?'Acima 100.000':km>=60000?'60.000–100.000':km>=30000?'30.000–60.000':'Abaixo 30.000';
const getYear = (d:string) => { if(!d||d.length<4) return 0; const y=parseInt(d.substring(0,4)); return isNaN(y)?0:y; };
const monthsDiff = (from:string) => { if(!from) return 0; const d=new Date(from); const n=new Date(); return Math.max(0,(n.getFullYear()-d.getFullYear())*12+(n.getMonth()-d.getMonth())); };
const monthsUntil = (to:string) => { if(!to) return 0; const d=new Date(to); if(isNaN(d.getTime())) return 0; const n=new Date(); return Math.max(0,(d.getFullYear()-n.getFullYear())*12+(d.getMonth()-n.getMonth())); };
const normalizeKeyPart = (v: string) => String(v || '').trim().toUpperCase();
const normalizePlate = (v: unknown) => String(v || '').trim().toUpperCase();
const canonicalPlate = (v: unknown) => normalizePlate(v).replace(/[^A-Z0-9]/g, '');
const normalizeMaintenanceOsId = (v: unknown) => String(v ?? '').replace(/\s+/g, '').trim();
const normalizeDisplayOsId = (v: unknown, fallback?: unknown) => {
  const raw = normalizeMaintenanceOsId(v || fallback || '').toUpperCase();
  if (!raw) return '';
  let core = raw;
  if (core.startsWith('OS-')) return core;
  if (core.startsWith('OS')) core = core.slice(2);
  core = core.replace(/^[-_:/\s]+/, '');
  return core ? `OS-${core}` : '';
};
const makeRuleKey = (cto: string, grupo: string) => `${normalizeKeyPart(cto)}::${normalizeKeyPart(grupo)}`;
const makeBancoRuleKey = (cto: string, grupo: string, regra: string) => `${normalizeKeyPart(cto)}::${normalizeKeyPart(grupo)}::${normalizeKeyPart(regra)}`;
const makeBancoRuleKeyGeneric = (cto: string, regra: string) => `${normalizeKeyPart(cto)}::${normalizeKeyPart(regra)}`;
const parseDateFlexible = (v: unknown): Date | null => {
  const raw = String(v || '').trim();
  if (!raw) return null;
  const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const parseSinistroCost = (raw: any): number => {
  return parseNum(
    raw?.ValorFinaleiroCalculado
    ?? raw?.ValorTotalOS
    ?? raw?.ValorTotal
    ?? raw?.ValorFinanceiroCalculado
    ?? raw?.valorfinanceirocalculado
    ?? raw?.ValorOrcamento
    ?? raw?.valororcamento
    ?? raw?.ValorOrcado
    ?? raw?.valororcado
    ?? raw?.ValorSinistro
    ?? raw?.ValorTotal
    ?? 0
  );
};

const parseSinistroReembolso = (raw: any): number => {
  const known =
    parseNum(raw?.ValorReembolsavelOS)
    + parseNum(raw?.valorreembolsavelos)
    + parseNum(raw?.IndenizacaoSeguradora)
    + parseNum(raw?.indenizacaoseguradora)
    + parseNum(raw?.indenizacao_seguradora)
    + parseNum(raw?.ValorIndenizacaoSeguradora)
    + parseNum(raw?.valorindenizacaoseguradora)
    + parseNum(raw?.ReembolsoTerceiro)
    + parseNum(raw?.reembolsoterceiro)
    + parseNum(raw?.reembolso_terceiro)
    + parseNum(raw?.ValorReembolsoTerceiro)
    + parseNum(raw?.valorreembolsoterceiro)
    + parseNum(raw?.ValorReembolsavel)
    + parseNum(raw?.valorreembolsavel)
    + parseNum(raw?.ValorReembolso)
    + parseNum(raw?.ValorReembolsado)
    + parseNum(raw?.ValorRecuperado)
    + parseNum(raw?.ValorRecuperacao)
    + parseNum(raw?.ValorRessarcimento)
    + parseNum(raw?.Ressarcimento);

  if (known !== 0) return known;

  const total = parseNum(raw?.ValorTotalOS ?? raw?.ValorTotal ?? raw?.ValorFinaleiroCalculado ?? raw?.ValorOrcamento ?? raw?.ValorOrcado ?? raw?.ValorSinistro);
  const naoReemb = parseNum(raw?.ValorNaoReembolsavelOS ?? raw?.ValorNaoReembolsavel ?? raw?.valornaoreembolsavel);
  if (total > 0 && total >= naoReemb && total - naoReemb > 0) return total - naoReemb;

  // Fallback: capture eventual fields introduced in ETL without changing frontend code.
  let inferred = 0;
  for (const [k, v] of Object.entries(raw || {})) {
    const kk = String(k || '').toLowerCase();
    if (!/(reemb|indeniz|ressarc|recup)/.test(kk)) continue;
    if (/(orc|sinistro|custo|total|valorfinal)/.test(kk)) continue;
    inferred += parseNum(v);
  }
  return inferred;
};

const normalizeSitCTO = (c: ContratoRow, cAny: any) => {
  const candidates = [
    c?.SituacaoContratoComercial,
    c?.SituacaoContrato,
    c?.SituacaoContratoLocacao,
    cAny?.SituacaoContratoComercial,
    cAny?.SituacaoContrato,
    cAny?.SituacaoContratoLocacao,
    cAny?.situacaocontratocomercial,
    cAny?.situacaocontrato,
    cAny?.situacaocontratolocacao,
  ];
  const found = candidates.map(v => String(v || '').trim()).find(v => v);
  return found || 'Sem informacao';
};

const normalizeSitCTOValue = (v: string) => {
  const s = String(v || '').trim();
  return s || 'Sem informacao';
};

// SearchableSelect: dropdown pesquisavel com multiselecao
function SearchableSelect(props: { options: string[]; value: string[]; onChange: (v:string[])=>void; placeholder?:string; allLabel?: string; multiple?: boolean }){
  const { options, value, onChange, placeholder, allLabel = 'Todas', multiple = true } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement|null>(null);

  useEffect(()=>{
    const onDoc = (e: MouseEvent) => { if(!ref.current) return; if(!ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return ()=>document.removeEventListener('mousedown', onDoc);
  },[]);

  const filtered = q ? options.filter(o => String(o||'').toLowerCase().includes(q.toLowerCase())) : options;

  const toggle = (opt: string) => {
    if (!multiple) {
      onChange([opt]);
      setOpen(false);
      return;
    }
    const exists = value.includes(opt);
    const next = exists ? value.filter(v=>v!==opt) : [...value, opt];
    onChange(next);
  };

  const summary = value.length === 0
    ? (placeholder || allLabel)
    : value.length === 1
      ? value[0]
      : `${value.length} selecionados`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={()=>{ setOpen(s=>!s); setQ(''); }}
        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm bg-white cursor-pointer flex items-center justify-between gap-2 hover:border-blue-300 transition-colors"
      >
        <div className="min-w-0 flex items-center gap-2">
          {value.length > 0 && <span className="inline-flex items-center justify-center rounded-md bg-blue-100 text-blue-700 text-[11px] font-semibold px-1.5 py-0.5">{value.length}</span>}
          <span className={`truncate text-sm ${value.length ? 'text-slate-900':'text-slate-500'}`}>{summary}</span>
        </div>
        <span className="text-slate-400 text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar..." className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="max-h-64 overflow-auto">
            <button type="button" className="w-full px-2.5 py-2 hover:bg-slate-50 text-sm text-left flex items-center justify-between" onClick={()=>{ onChange([]); setOpen(false); }}>
              <span>{allLabel}</span>
              {value.length === 0 && <span className="text-blue-600 text-xs">ativo</span>}
            </button>
            {filtered.map((o, idx) => {
              const selected = value.includes(String(o||''));
              return (
                <button type="button" key={idx} className={`w-full px-2.5 py-2 text-sm text-left flex items-center gap-2 hover:bg-slate-50 ${selected ? 'bg-blue-50/60' : ''}`} onClick={()=>toggle(String(o||''))}>
                  <span className={`inline-flex h-4 w-4 items-center justify-center rounded border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>✓</span>
                  <span className="truncate">{o}</span>
                </button>
              );
            })}
            {filtered.length===0 && (<div className="px-2.5 py-3 text-xs text-slate-400">Nenhuma opção</div>)}
          </div>
          <div className="px-2.5 py-2 border-t border-slate-100 flex justify-between items-center bg-slate-50/70">
            <button type="button" onClick={()=>onChange([])} className="text-xs text-slate-500 hover:text-slate-700">Limpar</button>
            <button type="button" onClick={()=>setOpen(false)} className="text-xs font-medium text-blue-600 hover:text-blue-700">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

interface HierNode { key: string; label: string; children?: { key: string; label: string }[]; }

function HierarchicalSelect(props: { nodes: HierNode[]; value: string[]; onChange: (v:string[])=>void; placeholder?: string; allLabel?: string }) {
  const { nodes, value, onChange, placeholder, allLabel = 'Todos' } = props;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLDivElement|null>(null);

  useEffect(()=>{
    const onDoc = (e: MouseEvent) => { if(!ref.current) return; if(!ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return ()=>document.removeEventListener('mousedown', onDoc);
  },[]);

  const summary = value.length === 0 ? (placeholder || allLabel) : value.length === 1 ? value[0] : `${value.length} selecionados`;
  const lower = q.toLowerCase();

  const filteredNodes = nodes
    .map(n => {
      const own = n.label.toLowerCase().includes(lower);
      const children = (n.children || []).filter(c => c.label.toLowerCase().includes(lower));
      if (!q) return n;
      if (own) return { ...n };
      if (children.length) return { ...n, children };
      return null;
    })
    .filter(Boolean) as HierNode[];

  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter(v => v !== key) : [...value, key]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={()=>{ setOpen(s=>!s); setQ(''); }}
        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm bg-white cursor-pointer flex items-center justify-between gap-2 hover:border-blue-300 transition-colors"
      >
        <div className="min-w-0 flex items-center gap-2">
          {value.length > 0 && <span className="inline-flex items-center justify-center rounded-md bg-blue-100 text-blue-700 text-[11px] font-semibold px-1.5 py-0.5">{value.length}</span>}
          <span className={`truncate text-sm ${value.length ? 'text-slate-900':'text-slate-500'}`}>{summary}</span>
        </div>
        <span className="text-slate-400 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar..." className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="max-h-64 overflow-auto">
            <button type="button" className="w-full px-2.5 py-2 hover:bg-slate-50 text-sm text-left flex items-center justify-between" onClick={()=>{ onChange([]); setOpen(false); }}>
              <span>{allLabel}</span>
              {value.length === 0 && <span className="text-blue-600 text-xs">ativo</span>}
            </button>

            {filteredNodes.map(node => {
              const hasChildren = !!(node.children && node.children.length);
              const isExpanded = expanded[node.key] ?? true;
              const selected = value.includes(node.key);
              return (
                <div key={node.key} className="border-t border-slate-100">
                  <div className={`w-full px-2.5 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 ${selected ? 'bg-blue-50/60' : ''}`}>
                    {hasChildren && (
                      <button type="button" className="text-slate-400 w-4" onClick={()=>setExpanded(prev => ({ ...prev, [node.key]: !isExpanded }))}>{isExpanded ? 'v' : '>'}</button>
                    )}
                    {!hasChildren && <span className="w-4" />}
                    <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded border" onClick={()=>toggle(node.key)}>
                      <span className={`${selected ? 'text-blue-600' : 'text-transparent'}`}>x</span>
                    </button>
                    <button type="button" className="truncate text-left flex-1" onClick={()=>toggle(node.key)}>{node.label}</button>
                  </div>
                  {hasChildren && isExpanded && (node.children || []).map(ch => {
                    const childSelected = value.includes(ch.key);
                    return (
                      <div key={ch.key} className={`w-full pl-8 pr-2.5 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 ${childSelected ? 'bg-blue-50/60' : ''}`}>
                        <button type="button" className="inline-flex h-4 w-4 items-center justify-center rounded border" onClick={()=>toggle(ch.key)}>
                          <span className={`${childSelected ? 'text-blue-600' : 'text-transparent'}`}>x</span>
                        </button>
                        <button type="button" className="truncate text-left flex-1" onClick={()=>toggle(ch.key)}>{ch.label}</button>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {filteredNodes.length === 0 && <div className="px-2.5 py-3 text-xs text-slate-400">Nenhuma opção</div>}
          </div>
          <div className="px-2.5 py-2 border-t border-slate-100 flex justify-between items-center bg-slate-50/70">
            <button type="button" onClick={()=>onChange([])} className="text-xs text-slate-500 hover:text-slate-700">Limpar</button>
            <button type="button" onClick={()=>setOpen(false)} className="text-xs font-medium text-blue-600 hover:text-blue-700">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}

const clrV = (v:number, positiveIsGood=true) => {
  if (v === 0) return 'text-slate-400';
  const isGood = positiveIsGood ? v > 0 : v < 0;
  return isGood ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium';
};
const clrP = (v:number, positiveIsGood=true) => {
  if(!isFinite(v)||isNaN(v)||v===0) return 'text-slate-400';
  const isGood = positiveIsGood ? v > 0 : v < 0;
  return isGood ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium';
};
const clrPctThreshold = (v:number, maxGood:number) => {
  if(!isFinite(v)||isNaN(v)||v===0) return 'text-slate-400';
  return v > maxGood ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium';
};
const clrPositiveThreshold = (v:number, maxGood:number) => {
  if(!isFinite(v)||isNaN(v)||v===0) return 'text-slate-400';
  return v > maxGood ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium';
};

interface ColDef { key:string; label:string; fmt:(r:VehicleRow)=>string; cls?:(r:VehicleRow)=>string; align?:'left'|'right'; w?:number; sortGetter?:(r:VehicleRow)=>any; }

function MaintDetailModal(props: {
  open: boolean;
  placa: string;
  rows: MaintDetailRow[] | FaturamentoDetailRow[];
  mode: DetailMode;
  onClose: () => void;
}) {
  const { open, placa, rows, mode, onClose } = props;
  if (!open) return null;

  const isFaturamento = mode === 'faturamento';
  
  // Adapta cálculos para os dois tipos de dados
  let total = 0, totalReemb = 0;
  if (isFaturamento) {
    total = (rows as FaturamentoDetailRow[]).reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
    totalReemb = 0; // Faturamento não tem reembolso
  } else {
    total = (rows as MaintDetailRow[]).reduce((acc, r) => acc + (Number(r.valorTotal) || 0), 0);
    totalReemb = (rows as MaintDetailRow[]).reduce((acc, r) => acc + (Number(r.valorReembolsavel) || 0), 0);
  }

  const modeMeta = isFaturamento
    ? { title: 'Histórico de Faturamento', subtitle: 'Detalhamento de faturamento por ano e mês', countLabel: 'Registros' }
    : mode === 'sinistro'
      ? { title: 'Extrato de Sinistros', subtitle: 'Detalhamento de eventos de sinistro por placa', countLabel: 'Sinistros' }
      : mode === 'mansin'
        ? { title: 'Extrato de Manutenção + Sinistro', subtitle: 'Detalhamento consolidado por placa', countLabel: 'Eventos' }
        : { title: 'Extrato de Manutenções', subtitle: 'Detalhamento de OS por placa', countLabel: 'OS' };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-6xl max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{modeMeta.title}</h3>
            <p className="text-xs text-slate-500">{modeMeta.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-full border border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center gap-4 text-sm">
          <div className="text-slate-600">Placa: <span className="font-semibold text-slate-900">{placa || '—'}</span></div>
          <div className="text-slate-600">{modeMeta.countLabel}: <span className="font-semibold text-slate-900">{rows.length.toLocaleString('pt-BR')}</span></div>
          <div className="text-slate-600">Total Acumulado: <span className="font-semibold text-slate-900">{fmtBRLZero(total)}</span></div>
          {!isFaturamento && <div className="text-slate-600">Total Reembolsável: <span className="font-semibold text-slate-900">{fmtBRLZero(totalReemb)}</span> <span className="text-slate-500">({fmtPct(total > 0 ? totalReemb / total : 0)})</span></div>}
        </div>

        <div className="overflow-auto px-5 py-3" style={{ maxHeight: '64vh' }}>
          <table className="min-w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100">
              <tr>
                {isFaturamento ? (
                  <>
                    <th className="text-left px-2 py-2 border-b border-slate-200">Ano</th>
                    <th className="text-left px-2 py-2 border-b border-slate-200">Mês</th>
                    <th className="text-right px-2 py-2 border-b border-slate-200">Valor</th>
                    <th className="text-left px-2 py-2 border-b border-slate-200">Descrição</th>
                  </>
                ) : (
                  <>
                    <th className="text-left px-2 py-2 border-b border-slate-200">Nº OS</th>
                    <th className="text-left px-2 py-2 border-b border-slate-200">Data</th>
                    <th className="text-left px-2 py-2 border-b border-slate-200">Tipo</th>
                    <th className="text-left px-2 py-2 border-b border-slate-200">Motivo</th>
                    <th className="text-left px-2 py-2 border-b border-slate-200">Situação</th>
                    <th className="text-right px-2 py-2 border-b border-slate-200">Valor Total</th>
                    <th className="text-right px-2 py-2 border-b border-slate-200">Valor Reembolsável</th>
                    <th className="text-right px-2 py-2 border-b border-slate-200">% Recup.</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={isFaturamento ? 4 : 8} className="px-2 py-8 text-center text-slate-400">
                    {isFaturamento ? 'Nenhum faturamento encontrado para esta placa.' : 'Nenhuma OS encontrada para o período/regra aplicada.'}
                  </td>
                </tr>
              )}
              {isFaturamento ? (
                (rows as FaturamentoDetailRow[]).map((r, i) => (
                  <tr key={`fat-${r.ano}-${r.mes}-${i}`} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/40">
                    <td className="px-2 py-1.5">{r.ano}</td>
                    <td className="px-2 py-1.5">{String(r.mes).padStart(2, '0')}</td>
                    <td className="px-2 py-1.5 text-right">{fmtBRLZero(r.valor)}</td>
                    <td className="px-2 py-1.5 text-left text-slate-600">{r.descricao || '—'}</td>
                  </tr>
                ))
              ) : (
                (rows as MaintDetailRow[]).map((r, i) => {
                  const pct = r.valorTotal > 0 ? r.valorReembolsavel / r.valorTotal : 0;
                  return (
                    <tr key={`${r.osId}-${i}`} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/40">
                      <td className="px-2 py-1.5">{r.osId || '—'}</td>
                      <td className="px-2 py-1.5">{r.date ? r.date.toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-2 py-1.5">{r.tipo || '—'}</td>
                      <td className="px-2 py-1.5">{r.motivo || '—'}</td>
                      <td className="px-2 py-1.5">{r.situacao || '—'}</td>
                      <td className="px-2 py-1.5 text-right">{fmtBRLZero(r.valorTotal)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtBRLZero(r.valorReembolsavel)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtPct(pct)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ID cols shown in every tab
const ID_COLS: ColDef[] = [
  { key:'cliente',     label:'Cliente',      fmt:r=>r.cliente,     align:'left',  w:60, sortGetter: r=>r.cliente },
  { key:'contrato',    label:'CTO',          fmt:r=>r.contrato,    align:'left',  w:95, sortGetter: r=>r.contrato },
  { key:'placa',       label:'Placa',        fmt:r=>r.placa,       align:'left',  w:105, sortGetter: r=>r.placa },
  { key:'modelo',      label:'Modelo',       fmt:r=>r.modelo,      align:'left',  w:170, sortGetter: r=>r.modelo },
  { key:'grupo',       label:'Grupo',        fmt:r=>r.grupo,       align:'left',  w:120, sortGetter: r=>r.grupo },
  { key:'odometroRetirada', label:'Odômetro Retirada', fmt:r=>r.odometroRetirada>0?r.odometroRetirada.toLocaleString('pt-BR'):'—', align:'right', w:120, sortGetter: r=>r.odometroRetirada },
  { key:'kmAtual',     label:'KM',           fmt:r=>r.kmAtual>0?r.kmAtual.toLocaleString('pt-BR'):'—', align:'right', w:80, sortGetter: r=>r.kmAtual },
  { key:'idadeEmMeses',label:'Idade (meses)',fmt:r=>fmtInt(r.idadeEmMeses), align:'right', w:80, sortGetter: r=>r.idadeEmMeses },
  { key:'kmPrecificado',label:'Km Precificado',fmt:r=>r.custoKmManual == null ? '—' : fmtBRL(r.custoKmManual), align:'right', w:110, sortGetter: r=>r.custoKmManual ?? -1 },
];

const TABS = [
  { key:'passagem',   label:'Passagem',                icon:Route,       color:'bg-blue-600',   hdr:'bg-blue-700' },
  { key:'previsto',   label:'Custo Previsto × Real',   icon:Wrench,      color:'bg-amber-600',  hdr:'bg-amber-700' },
  { key:'manutencao', label:'Manutenção + Reembolso',  icon:Wrench,      color:'bg-orange-600', hdr:'bg-orange-700' },
  { key:'sinistro',   label:'Sinistro + Reembolso',    icon:ShieldAlert, color:'bg-red-600',    hdr:'bg-red-700' },
  { key:'mansin',     label:'Man + Sinistro',          icon:BarChart3,   color:'bg-purple-600', hdr:'bg-purple-700' },
  { key:'faturamento',label:'Faturamento',             icon:DollarSign,  color:'bg-teal-600',   hdr:'bg-teal-700' },
  { key:'resumo',     label:'Resumo Contrato',         icon:Search,      color:'bg-slate-700',  hdr:'bg-slate-700' },
  { key:'listagemCto',label:'Listagem CTO',            icon:BarChart3,   color:'bg-slate-700',  hdr:'bg-slate-700' },
] as const;
type TabKey = typeof TABS[number]['key'];
const EXPORTABLE_TABS = TABS.filter(tab => tab.key !== 'resumo' && tab.key !== 'listagemCto');

// ── Main Component ───────────────────────────────────────────────
export default function AnaliseContrato() {
  type ExportScope = 'all' | 'single';
  type ExportFormat = 'pdf' | 'xlsx';
  type PrintLayout = 'full' | 'summary';

  const [activeTab, setActiveTab] = useState<TabKey>('passagem');
  const [showTabHelp, setShowTabHelp] = useState(false);
  const [showYearDetailByTab, setShowYearDetailByTab] = useState<Record<TabKey, boolean>>({
    passagem: false,
    previsto: true,
    manutencao: false,
    sinistro: false,
    mansin: false,
    faturamento: false,
    resumo: false,
    listagemCto: false,
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [printLayout, setPrintLayout] = useState<PrintLayout>('full');
  const [exportTabChoice, setExportTabChoice] = useState<TabKey>('passagem');
  const [kmDivisor] = useState(10000);
  const [passagemDiffAlertThreshold, setPassagemDiffAlertThreshold] = useState<number>(3);
  const [passagemDiffAlertInput, setPassagemDiffAlertInput] = useState('3');
  const [passagemPctAlertThreshold, setPassagemPctAlertThreshold] = useState<number>(0.30);
  const [passagemPctAlertInput, setPassagemPctAlertInput] = useState('30');
  const [fatPctAlertThreshold, setFatPctAlertThreshold] = useState<number>(0.10);
  const [fatPctAlertInput, setFatPctAlertInput] = useState('10');
  const [showRulesManager, setShowRulesManager] = useState(false);
  const [matrizCustos, setMatrizCustos] = useState<ManualCostRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleFormCto, setRuleFormCto] = useState('');
  const [ruleFormGrupo, setRuleFormGrupo] = useState('');
  const [ruleFormCustoKm, setRuleFormCustoKm] = useState('');
  const [filterCliente,setFilterCliente]= useState<string[]>([]);
  const [filterCTO,    setFilterCTO]    = useState<string[]>([]);
  const [filterPlaca,  setFilterPlaca]  = useState<string[]>([]);
  const [filterGrupoModelo,  setFilterGrupoModelo]  = useState<string[]>([]);
  const [filterVencimento, setFilterVencimento] = useState<string[]>([]);
  const [filterTipoContrato, setFilterTipoContrato] = useState<string[]>([]);
  const [filterSitCTO, setFilterSitCTO] = useState<string[]>([]);
  const [filterSitLoc, setFilterSitLoc] = useState<string[]>([]);

  const [sortKey,  setSortKey]  = useState<string>('cliente');
  const [sortDir,  setSortDir]  = useState<'asc'|'desc'>('asc');
  const [resumoDetailSortKey, setResumoDetailSortKey] = useState<string>('placa');
  const [resumoDetailSortDir, setResumoDetailSortDir] = useState<'asc'|'desc'>('asc');
  const [resumoFilters, setResumoFilters] = useState<Record<string, string[]>>({});
  const [resumoFilterOpenKey, setResumoFilterOpenKey] = useState<string | null>(null);
  const [resumoSearchTerm, setResumoSearchTerm] = useState('');
  const [ctoListSortKey, setCtoListSortKey] = useState<CtoListSortKey>('cto');
  const [ctoListSortDir, setCtoListSortDir] = useState<'asc'|'desc'>('asc');
  const [expandedCtos, setExpandedCtos] = useState<Record<string, boolean>>({});
  const [maintDetailTarget, setMaintDetailTarget] = useState<(Pick<VehicleRow, 'placa'|'dataInicial'|'idLocacao'|'idComercial'|'idVeiculo'|'tipoContrato'> & { mode: DetailMode }) | null>(null);
  const resumoDetailTableRef = useRef<HTMLTableElement | null>(null);

  useEffect(() => { setShowTabHelp(false); }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'resumo' || activeTab === 'listagemCto') return;
    setExportTabChoice(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const raw = localStorage.getItem('analise_contrato_fat_pct_alert_threshold');
    if (!raw) return;
    const parsed = Number(raw);
    if (!isFinite(parsed) || parsed < 0) return;
    setFatPctAlertThreshold(parsed);
    setFatPctAlertInput(String(Math.round(parsed * 1000) / 10).replace('.', ','));
  }, []);

  useEffect(() => {
    const diffRaw = localStorage.getItem('analise_contrato_passagem_diff_alert_threshold');
    if (diffRaw != null) {
      const parsedDiff = Number(diffRaw);
      if (isFinite(parsedDiff) && parsedDiff >= 0) {
        setPassagemDiffAlertThreshold(parsedDiff);
        setPassagemDiffAlertInput(String(Math.round(parsedDiff * 10) / 10).replace('.', ','));
      }
    }

    const pctRaw = localStorage.getItem('analise_contrato_passagem_pct_alert_threshold');
    if (pctRaw != null) {
      const parsedPct = Number(pctRaw);
      if (isFinite(parsedPct) && parsedPct >= 0) {
        setPassagemPctAlertThreshold(parsedPct);
        setPassagemPctAlertInput(String(Math.round(parsedPct * 1000) / 10).replace('.', ','));
      }
    }
  }, []);

  const saveFatPctAlertThreshold = () => {
    const pct = parseNum(fatPctAlertInput);
    const ratio = Math.max(0, pct / 100);
    setFatPctAlertThreshold(ratio);
    setFatPctAlertInput(String(Math.round(ratio * 1000) / 10).replace('.', ','));
    localStorage.setItem('analise_contrato_fat_pct_alert_threshold', String(ratio));
  };

  const savePassagemAlertThresholds = () => {
    const diff = Math.max(0, parseNum(passagemDiffAlertInput));
    const pct = Math.max(0, parseNum(passagemPctAlertInput) / 100);

    setPassagemDiffAlertThreshold(diff);
    setPassagemDiffAlertInput(String(Math.round(diff * 10) / 10).replace('.', ','));

    setPassagemPctAlertThreshold(pct);
    setPassagemPctAlertInput(String(Math.round(pct * 1000) / 10).replace('.', ','));

    localStorage.setItem('analise_contrato_passagem_diff_alert_threshold', String(diff));
    localStorage.setItem('analise_contrato_passagem_pct_alert_threshold', String(pct));
  };

  const { data: rawC, loading: lC, metadata } = useBIData<ContratoRow[]>('dim_contratos_locacao');
  const { data: rawF, loading: lF } = useBIData<FrotaRow[]>('dim_frota');
  const { data: rawRules, loading: lRules } = useBIData<RegrasContratoRow[]>('dim_regras_contrato');
  const { data: rawM, loading: lM } = useBIData<ManutencaoRow[]>('fat_manutencao_unificado', { limit: 300000 });
  const { data: rawS, loading: lS } = useBIData<SinistroRow[]>('fat_sinistros', { limit: 300000 });
  const { data: rawFat, loading: lFat } = useBIData<FaturamentoRow[]>('fat_faturamentos', { limit: 300000 });
  const { data: rawFatItens, loading: lFatItens } = useBIData<FaturamentoItemRow[]>('fat_faturamento_itens', { limit: 300000 });
  const { data: rawPrecos, loading: _lPrecos } = useBIData<PrecosLocacaoRow[]>('fat_precos_locacao', { limit: 100000 });
  const { data: rawMovVeic, loading: lMovVeic } = useBIData<MovimentacaoVeiculoRow[]>('dim_movimentacao_veiculos', { limit: 300000 });

  const loadManualRules = async () => {
    setRulesLoading(true);
    setRulesError(null);
    const { data, error } = await supabase
      .from('analise_contrato_regras_precificacao')
      .select('id, contrato, grupo, custo_km')
      .order('contrato', { ascending: true })
      .order('grupo', { ascending: true });

    if (error) {
      setRulesError(error.message || 'Falha ao carregar regras de precificacao.');
      setRulesLoading(false);
      return;
    }

    const mapped = (data || []).map((row: any) => ({
      id: String(row.id),
      cto: String(row.contrato || '').trim(),
      grupo: String(row.grupo || '').trim(),
      custoKm: parseNum(row.custo_km),
    }));

    setMatrizCustos(mapped);
    setRulesLoading(false);
  };

  useEffect(() => {
    void loadManualRules();
  }, []);

  const initialLoading = lC || lF || lRules;
  const heavyLoading   = lM || lS || lFat || lFatItens || lMovVeic;

  const allContratoOptions = useMemo(() => {
    const contratos = new Set<string>();
    for (const c of (rawC as ContratoRow[] | null ?? [])) {
      if (c?.ContratoComercial) contratos.add(String(c.ContratoComercial).trim());
    }
    for (const row of (rawF as FrotaRow[] | null ?? [])) {
      const contrato = String((row as any)?.ContratoComercial || (row as any)?.Contrato || '').trim();
      if (contrato) contratos.add(contrato);
    }
    return Array.from(contratos).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [rawC, rawF]);

  const manualCostLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const rule of matrizCustos) {
      map.set(makeRuleKey(rule.cto, rule.grupo), rule.custoKm);
    }
    return map;
  }, [matrizCustos]);

  const bancoRegraLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const regra of (rawRules as RegrasContratoRow[] | null ?? [])) {
      const cto = String(regra?.Contrato || '').trim();
      const nomeRegra = String(regra?.NomeRegra || '').trim();
      if (!cto || !nomeRegra) continue;
      const grupo = String(regra?.Grupo || regra?.GrupoVeiculo || regra?.Categoria || regra?.CategoriaVeiculo || '').trim();
      const valor = parseNum(regra?.ConteudoRegra);
      if (grupo) map.set(makeBancoRuleKey(cto, grupo, nomeRegra), valor);
      map.set(makeBancoRuleKeyGeneric(cto, nomeRegra), valor);
    }
    return map;
  }, [rawRules]);

  const lookupFranquiaBanco = (cto: string, grupo: string) => {
    const regra = 'A - Franquia Km/mês';
    const specific = bancoRegraLookup.get(makeBancoRuleKey(cto, grupo, regra));
    if (specific != null) return specific;
    const generic = bancoRegraLookup.get(makeBancoRuleKeyGeneric(cto, regra));
    return generic != null ? generic : 3000;
  };

  const lookupCustoKmManual = (cto: string, grupo: string) => {
    const value = manualCostLookup.get(makeRuleKey(cto, grupo));
    return value != null ? value : null;
  };

  const upsertManualRule = async () => {
    const cto = String(ruleFormCto || '').trim();
    const grupo = String(ruleFormGrupo || '').trim();
    if (!cto || !grupo) return;
    const custoKm = parseNum(ruleFormCustoKm);

    setRulesError(null);

    if (editingRuleId) {
      const { error: updateError } = await supabase
        .from('analise_contrato_regras_precificacao')
        .update({ contrato: cto, grupo, custo_km: custoKm })
        .eq('id', editingRuleId);
      if (updateError) {
        setRulesError(updateError.message || 'Falha ao atualizar regra.');
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('analise_contrato_regras_precificacao')
        .insert([{ contrato: cto, grupo, custo_km: custoKm }]);
      if (insertError) {
        setRulesError(insertError.message || 'Falha ao salvar regra.');
        return;
      }
    }

    await loadManualRules();
    setEditingRuleId(null);
    setRuleFormCto('');
    setRuleFormGrupo('');
    setRuleFormCustoKm('');
  };

  const deleteManualRule = async (id: string) => {
    setRulesError(null);
    const { error } = await supabase
      .from('analise_contrato_regras_precificacao')
      .delete()
      .eq('id', id);

    if (error) {
      setRulesError(error.message || 'Falha ao excluir regra.');
      return;
    }

    await loadManualRules();
    if (editingRuleId === id) {
      setEditingRuleId(null);
      setRuleFormCto('');
      setRuleFormGrupo('');
      setRuleFormCustoKm('');
    }
  };

  const frotaByPlaca = useMemo(() => {
    const m = new Map<string,FrotaRow>();
    (rawF as FrotaRow[]|null??[]).forEach(r=>{
      if(!r.Placa) return;
      const plate = normalizePlate(r.Placa);
      const key = canonicalPlate(r.Placa);
      if (plate) m.set(plate, r);
      if (key && key !== plate) m.set(key, r);
    });
    return m;
  }, [rawF]);

  const activeContratos = useMemo(() => {
    const all = (rawC as ContratoRow[]|null??[]);
    const map = new Map<string, ContratoRow>();
    for (const c of all) {
      const key = String(c?.IdContratoLocacao || c?.ContratoComercial || c?.PlacaPrincipal || '').trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, c);
    }
    return Array.from(map.values()).filter(c => c.PlacaPrincipal || c.ContratoComercial);
  }, [rawC]);

  const clienteByCto = useMemo(() => {
    const map = new Map<string, string>();
    for (const contrato of activeContratos) {
      const cto = String(contrato?.ContratoComercial || '').trim();
      const cliente = String(contrato?.NomeCliente || '').trim();
      if (!cto || !cliente || map.has(cto)) continue;
      map.set(cto, cliente);
    }
    return map;
  }, [activeContratos]);

  const vehicleRows = useMemo((): VehicleRow[] => {
    const arrM = rawM as ManutencaoRow[]|null ?? [];
    const arrS = rawS as SinistroRow[]|null   ?? [];
    const arrF = rawFat as FaturamentoRow[]|null ?? [];
    const arrFI = rawFatItens as FaturamentoItemRow[]|null ?? [];
    const arrPrecos = rawPrecos as PrecosLocacaoRow[]|null ?? [];
    const arrMov = rawMovVeic as MovimentacaoVeiculoRow[]|null ?? [];

    const pickBetterMov = (current: MovimentacaoVeiculoRow | undefined, candidate: MovimentacaoVeiculoRow) => {
      if (!current) return candidate;
      const curDate = parseDateFlexible(current.DataRetirada || current.DataEncerramento || current.DataDevolucao || '');
      const nextDate = parseDateFlexible(candidate.DataRetirada || candidate.DataEncerramento || candidate.DataDevolucao || '');
      if (!curDate && nextDate) return candidate;
      if (curDate && nextDate && nextDate.getTime() > curDate.getTime()) return candidate;
      const curOdo = parseNum(current.OdometroRetirada);
      const nextOdo = parseNum(candidate.OdometroRetirada);
      if (curOdo <= 0 && nextOdo > 0) return candidate;
      return current;
    };

    const movByLocacao = new Map<string, MovimentacaoVeiculoRow>();
    const movByPlate = new Map<string, MovimentacaoVeiculoRow>();
    for (const mov of arrMov) {
      const locacao = String(mov?.IdContratoLocacao || '').trim().toUpperCase();
      const plate = canonicalPlate(mov?.Placa || '');
      if (locacao) {
        movByLocacao.set(locacao, pickBetterMov(movByLocacao.get(locacao), mov));
      }
      if (plate) {
        movByPlate.set(plate, pickBetterMov(movByPlate.get(plate), mov));
      }
    }

    // Mapa de preços históricos de locação por contrato de locação
    const precosHistoricos = new Map<string, Array<{ dataInicial: Date | null; valor: number }>>();
    for (const p of arrPrecos) {
      const locacaoKey = String(p.IdContratoLocacao || '').trim().toUpperCase();
      if (!locacaoKey) continue;
      const valor = parseNum(p.PrecoUnitario || p.ValorLocacao || p.VlrLocacao || 0);
      if (valor <= 0) continue;
      const dataInicial = parseDateFlexible(p.DataInicial || '');
      if (!precosHistoricos.has(locacaoKey)) precosHistoricos.set(locacaoKey, []);
      precosHistoricos.get(locacaoKey)!.push({ dataInicial, valor });
    }
    // Ordenar por data para garantir ordem histórica
    for (const arr of precosHistoricos.values()) {
      arr.sort((a, b) => (a.dataInicial?.getTime() || 0) - (b.dataInicial?.getTime() || 0));
    }

    const calcularFaturamentoPrevisto = (contrato: ContratoRow | null, _cAny: any, idadeEmMeses: number) => {
      if (!contrato || !idadeEmMeses || idadeEmMeses <= 0) return 0;
      const idLocacaoKey = String(contrato?.IdContratoLocacao || '').trim().toUpperCase();
      if (!idLocacaoKey) return 0;
      const precos = precosHistoricos.get(idLocacaoKey) || [];
      if (precos.length === 0) return 0;

      const contractStart = parseDateFlexible(contrato?.DataInicial || '');
      if (!contractStart) return 0;

      const today = new Date();
      let previsto = 0;
      let mesesAcumulados = 0;

      for (let i = 0; i < precos.length && mesesAcumulados < idadeEmMeses; i++) {
        const precoAtual = precos[i];
        const proximoPreco = precos[i + 1];
       
        const dataIni = precoAtual.dataInicial || contractStart;
        const dataFim = proximoPreco ? proximoPreco.dataInicial : new Date(today.getFullYear(), today.getMonth() + 1, 0);
       
        // Calcular meses entre dataIni e dataFim
        const mesesValidade = dataFim ? Math.max(0, (dataFim.getFullYear() - dataIni.getFullYear()) * 12 + (dataFim.getMonth() - dataIni.getMonth())) : 1;
        const mesesEfetivos = Math.min(mesesValidade || 1, Math.max(0, idadeEmMeses - mesesAcumulados));
       
        if (mesesEfetivos > 0) {
          previsto += precoAtual.valor * mesesEfetivos;
          mesesAcumulados += mesesEfetivos;
        }
      }

      return previsto;
    };

    const ultimoValorLocacao = (idLocacaoKey: string) => {
      const precos = precosHistoricos.get(idLocacaoKey) || [];
      return precos.length > 0 ? precos[precos.length - 1].valor : 0;
    };

    type MA = { plate: string; date: Date | null; year: number; osId: string; cost: number; reemb: number };
    const maintByPlate = new Map<string, MA[]>();
    const seenMaintenance = new Set<string>();
    for (const m of arrM) {
      const rawPlaca = m.Placa; if(!rawPlaca) continue;
      const placa = normalizePlate(rawPlaca);
      const placaKey = canonicalPlate(rawPlaca);
      if (!placa) continue;
      const rawStatus = (m.SituacaoOrdemServico || m.Situacao || m.Status || m.StatusOrdem || m.SituacaoOcorrencia || m.StatusOcorrencia || '');
      const status = String(rawStatus).toLowerCase();
      if (status.includes('cancel')) continue;
      const rawDate = m.OrdemServicoCriadaEm || m.DataCriacao || m.DataEntrada || m.DataCriacaoOS || (m as any).DataServico || (m as any).DataAtualizacaoDados || '';
      const date = parseDateFlexible(rawDate);
      const yr = date ? date.getFullYear() : getYear(rawDate);
      if(yr<2022 || yr>2030) continue;
      const osId = normalizeMaintenanceOsId(m.IdOrdemServico || m.idordemservico || m.IdOcorrencia || `${placa}-${yr}-${rawDate}`);
      const dedupeKey = `${placaKey || placa}::${osId || rawDate || `${yr}`}`;
      if (seenMaintenance.has(dedupeKey)) continue;
      seenMaintenance.add(dedupeKey);
      const cost = parseNum(m.ValorTotalFatItens || m.ValorTotal || m.valortotal || m.CustoTotalOS || 0);
      const reemb = parseNum(m.ValorReembolsavelFatItens || m.ValorReembolsavel || m.valorreembolsavel || 0);
      const rec = { plate: placa, date, year: yr, osId, cost, reemb };
      const keys = Array.from(new Set([placa, placaKey].filter(Boolean)));
      for (const k of keys) {
        const bucket = maintByPlate.get(k) || [];
        bucket.push(rec);
        maintByPlate.set(k, bucket);
      }
    }

    type SA = Record<number,{cost:number;reemb:number;qty:number}>;
    const sinIdx = new Map<string,SA>();
    for (const s of arrS) {
      const rawPlaca = s.Placa; if(!rawPlaca) continue;
      const placa = normalizePlate(rawPlaca);
      const placaKey = canonicalPlate(rawPlaca);
      const yr=getYear(s.DataSinistro||s.DataCriacao||'');
      if(yr<2022 || yr>2030) continue;
      const keys = Array.from(new Set([placa, placaKey].filter(Boolean)));
      for (const key of keys) {
        if(!sinIdx.has(key)) sinIdx.set(key,{});
      }
      const sm=sinIdx.get(placa)!;
      if(!sm[yr]) sm[yr]={cost:0,reemb:0,qty:0};
      const sAny = s as any;
      const sinCost = parseSinistroCost(sAny);
      const sinReemb = parseSinistroReembolso(sAny);
      sm[yr].cost += sinCost;
      sm[yr].reemb += sinReemb;
      sm[yr].qty += 1;
      if (placaKey && placaKey !== placa) {
        const smKey = sinIdx.get(placaKey)!;
        if(!smKey[yr]) smKey[yr]={cost:0,reemb:0,qty:0};
        smKey[yr].cost += sinCost;
        smKey[yr].reemb += sinReemb;
        smKey[yr].qty += 1;
      }
    }

    const notaYear = new Map<string, number>();
    for (const f of arrF) {
      const nota = String(f.IdNota || '').trim();
      if (!nota) continue;
      const yr = getYear(String(f.DataCompetencia || f.Competencia || f.DataEmissao || f.DataCriacao || ''));
      if (yr >= 2022 && yr <= 2030) notaYear.set(nota, yr);
    }

    const fatIdxByVeiculo = new Map<string,Record<number,number>>();
    const fatIdxByLocacao = new Map<string,Record<number,number>>();
    const fatIdxByComercial = new Map<string,Record<number,number>>();
    const itensSeen = new Set<string>();
    for (const fi of arrFI) {
      const itemKey = String(fi.IdItemNota || `${fi.IdNota || ''}-${fi.IdVeiculo || ''}-${fi.ValorTotal || fi.ValorUnitario || ''}`).trim();
      if (!itemKey || itensSeen.has(itemKey)) continue;
      itensSeen.add(itemKey);

      const nota = String(fi.IdNota || '').trim();
      const yr = notaYear.get(nota) || getYear(String(fi.DataAtualizacaoDados || ''));
      if(yr<2022 || yr>2030) continue;

      const valor = parseNum(fi.ValorTotal ?? fi.ValorUnitario ?? 0);
      if (!valor) continue;

      const veiculoKey = String(fi.IdVeiculo || '').trim().toUpperCase();
      const locacaoKey = String(fi.IdContratoLocacao || '').trim().toUpperCase();
      const comercialKey = String(fi.IdContratoComercial || fi.ContratoComercial || '').trim().toUpperCase();

      if (veiculoKey) {
        if(!fatIdxByVeiculo.has(veiculoKey)) fatIdxByVeiculo.set(veiculoKey,{});
        const fmV=fatIdxByVeiculo.get(veiculoKey)!;
        fmV[yr]=(fmV[yr]||0)+valor;
      }
      if (locacaoKey) {
        if(!fatIdxByLocacao.has(locacaoKey)) fatIdxByLocacao.set(locacaoKey,{});
        const fmLoc=fatIdxByLocacao.get(locacaoKey)!;
        fmLoc[yr]=(fmLoc[yr]||0)+valor;
      }
      if (comercialKey) {
        if(!fatIdxByComercial.has(comercialKey)) fatIdxByComercial.set(comercialKey,{});
        const fmCom=fatIdxByComercial.get(comercialKey)!;
        fmCom[yr]=(fmCom[yr]||0)+valor;
      }
    }

    const baseItems = activeContratos.map(c => ({
      c, fr: frotaByPlaca.get(normalizePlate(c.PlacaPrincipal || '')) || frotaByPlaca.get(canonicalPlate(c.PlacaPrincipal || '')), placa: normalizePlate(c.PlacaPrincipal || '')
    }));

    const usedPlates = new Set(baseItems.map(x => x.placa).filter(Boolean));
    (rawF as FrotaRow[]|null ?? []).forEach(fr => {
      const normalizedPlate = normalizePlate(fr.Placa || '');
      if (normalizedPlate && !usedPlates.has(normalizedPlate)) {
        baseItems.push({ c: null as any, fr, placa: normalizedPlate });
      }
    });

    const result = baseItems.map(({ c, fr, placa }) => {
      const cAny = (c || {}) as any;
      const frAny = fr as any;
      const modelo = fr?.Modelo ?? cAny.Modelo ?? ''; 
      const grupo = fr?.Grupo ?? fr?.GrupoVeiculo ?? fr?.Categoria ?? fr?.CategoriaVeiculo ?? cAny.Grupo ?? cAny.GrupoVeiculo ?? cAny.Categoria ?? 'LEVE';
      const contratoLocacaoKey = String(c?.IdContratoLocacao || cAny?.IdContratoLocacao || '').trim().toUpperCase();
      const placaContratoKey = canonicalPlate(c?.PlacaPrincipal || fr?.Placa || placa || '');
      const mov = movByLocacao.get(contratoLocacaoKey) || movByPlate.get(placaContratoKey);
      const kmInicialContrato = parseNum(
        mov?.OdometroRetirada ??
        cAny?.OdometroRetirada ?? cAny?.odometroretirada ??
        cAny?.OdometroInicial ?? cAny?.odometroinicial ??
        cAny?.KmInicialContrato ?? cAny?.kminicialcontrato ??
        cAny?.KmInicial ?? cAny?.kminicial ??
        cAny?.KmInformadoInicial ?? cAny?.kminformadoinicial ??
        cAny?.KmInformadoRetirada ?? cAny?.kminformadoretirada ??
        cAny?.KMInicial ?? cAny?.kminicial ??
        cAny?.KmConfirmadoInicial ?? cAny?.kmconfirmadoinicial ??
        cAny?.KmConfirmado ?? cAny?.kmconfirmado ??
        cAny?.KM ?? 0
      );
      const kmAtual = parseNum(
        frAny?.KmConfirmado ?? frAny?.kmconfirmado ?? frAny?.OdometroConfirmado ?? frAny?.odometroconfirmado ??
        frAny?.KmInformado ?? frAny?.kminformado ?? frAny?.OdometroAtual ?? frAny?.odometroatual ??
        frAny?.KM ??
        cAny?.KmConfirmado ?? cAny?.kmconfirmado ?? cAny?.OdometroConfirmado ?? cAny?.odometroconfirmado ??
        cAny?.KmInformado ?? cAny?.kminformado ?? cAny?.OdometroAtual ?? cAny?.odometroatual ??
        cAny?.KM ?? 0
      );
      const dataInicial = c?.DataInicial || '';
      const tipoContratoRaw = String(
        c?.TipoDeContrato
        || c?.TipoContrato
        || c?.TipoContratoLocacao
        || c?.TipoLocacao
        || c?.Publico
        || cAny?.TipoDeContrato
        || cAny?.TipoContrato
        || cAny?.tipocontrato
        || cAny?.TipoContratoLocacao
        || cAny?.tipocontratolocacao
        || cAny?.TipoLocacao
        || cAny?.tipolocacao
        || cAny?.Publico
        || cAny?.publico
        || cAny?.TipoPublico
        || cAny?.tipopublico
        || ''
      ).trim();
      const tipoContrato = tipoContratoRaw || 'Sem informacao';
      const dataInicioUso = parseDateFlexible(mov?.DataRetirada || dataInicial);
      const dataFinalContrato = parseDateFlexible(c?.DataFinal || cAny?.DataFinal || cAny?.DataEncerramento || '');
      const dataDevolucao = parseDateFlexible(mov?.DataDevolucao || mov?.DataEncerramento || '');
      const agora = new Date();

      let dataFimUso = dataDevolucao;
      if (!dataFimUso || dataFimUso > agora) {
        dataFimUso = dataFinalContrato && dataFinalContrato < agora ? dataFinalContrato : agora;
      }
      const diasUso = dataInicioUso && dataFimUso && dataFimUso >= dataInicioUso
        ? (dataFimUso.getTime() - dataInicioUso.getTime()) / (1000 * 60 * 60 * 24)
        : 0;
      const mesesUtilizacao = Math.max(0, diasUso / 30.4375);
      const idadeEmMeses = monthsDiff(dataInicial);
      const kmPercorridoNoContrato = Math.max(0, kmAtual - kmInicialContrato);
      const rodagemMedia = mesesUtilizacao > 0 ? Math.round(kmPercorridoNoContrato / mesesUtilizacao) : 0;
      const mesesRestantesContrato = monthsUntil(c?.DataFinal || '');
      const prazoRestDays = daysUntil(c?.DataFinal || '');
      const kmEstimadoFimContrato = Math.round(kmAtual + (rodagemMedia * mesesRestantesContrato));
      const contractStart = parseDateFlexible(c?.DataInicial || '');
      const today = new Date();

      const realPlaca = normalizePlate(c?.PlacaPrincipal || fr?.Placa || placa || '');
      const realPlacaKey = canonicalPlate(realPlaca);
      const mergedMaint = [
        ...(maintByPlate.get(realPlaca) || []),
        ...(realPlacaKey && realPlacaKey !== realPlaca ? (maintByPlate.get(realPlacaKey) || []) : []),
      ];
      const seenRec = new Set<string>();
      const maintRecords = mergedMaint.filter(rec => {
        const recUnique = `${rec.osId}::${rec.date?.toISOString() || ''}`;
        if (seenRec.has(recUnique)) return false;
        seenRec.add(recUnique);
        if (!(canonicalPlate(rec.plate) === realPlacaKey)) return false;
        if (!rec.date) return false;
        if (contractStart && rec.date < contractStart) return false;
        if (rec.date > today) return false;
        return true;
      });

      const mm = new Map<number, { cost:number; reemb:number; osIds:Set<string> }>();
      const maintOsIds = new Set<string>();
      for (const rec of maintRecords) {
        if (rec.year < 2022 || rec.year > 2030) continue;
        if (!mm.has(rec.year)) mm.set(rec.year, { cost:0, reemb:0, osIds:new Set<string>() });
        const bucket = mm.get(rec.year)!;
        bucket.cost += rec.cost;
        bucket.reemb += rec.reemb;
        bucket.osIds.add(rec.osId);
        maintOsIds.add(rec.osId);
      }

      const passagemTotal = maintOsIds.size;
      const passagemIdeal = kmDivisor > 0 ? kmAtual / kmDivisor : 0;
      const passagemIdealExibida = Math.round(passagemIdeal);

      const contratoBase = String(c?.ContratoComercial || cAny?.ContratoComercial || cAny?.Contrato || '').trim();
      const manualCustoKm = lookupCustoKmManual(contratoBase, grupo);
      const franquiaBanco = lookupFranquiaBanco(contratoBase, grupo);
      const custoManPrevisto = manualCustoKm == null ? 0 : (franquiaBanco * manualCustoKm) * idadeEmMeses;

      let totalManutencao = 0, totalReembMan = 0;
      for (const bucket of mm.values()) { totalManutencao += bucket.cost; totalReembMan += bucket.reemb; }
      const cntMan = maintOsIds.size;
      
      const ticketMedio = cntMan > 0 ? totalManutencao / cntMan : 0;
      const custoKmMan = kmAtual > 0 ? totalManutencao / kmAtual : 0;
      const custoLiqMan = totalManutencao - totalReembMan;
      const custoKmLiqMan = kmAtual > 0 ? custoLiqMan / kmAtual : 0;

      const sm = sinIdx.get(realPlaca) || sinIdx.get(realPlacaKey) || {};
      let totalSinistro = 0, totalReembSin = 0, totalQtdSinistros = 0;
      for (const y in sm) {
        totalSinistro += sm[y].cost;
        totalReembSin += sm[y].reemb;
        totalQtdSinistros += sm[y].qty || 0;
      }
      const custoLiqSin = totalSinistro - totalReembSin;

      const idVeiculoKey = String(fr?.IdVeiculo || c?.IdVeiculoPrincipal || '').trim().toUpperCase();
      const idLocacaoKey = String(c?.IdContratoLocacao || '').trim().toUpperCase();
      const idComercialKey = String(cAny?.IdContratoComercial || '').trim().toUpperCase();
      const contratoComercialKey = String(c?.ContratoComercial || '').trim().toUpperCase();
      const fm = fatIdxByVeiculo.get(idVeiculoKey) || fatIdxByLocacao.get(idLocacaoKey) || fatIdxByComercial.get(idComercialKey) || fatIdxByComercial.get(contratoComercialKey) || {};
      let faturamentoTotal = 0;
      for (const y in fm) faturamentoTotal += fm[y];

      const diferencaPassagem = passagemTotal - passagemIdeal;
      const pctPassagem = passagemIdealExibida > 0 ? passagemTotal / passagemIdealExibida - 1 : 0;
      const custoManRealizado = totalManutencao;
      const difManPrevReal = custoManPrevisto - custoManRealizado;
      const pctDifManPrevReal = custoManPrevisto > 0 ? custoManRealizado / custoManPrevisto - 1 : 0;
      const custoManLiquido = custoLiqMan;
      const difCustoManLiq = custoManPrevisto - custoLiqMan;
      const pctDifCustoManLiq = custoManPrevisto > 0 ? custoLiqMan / custoManPrevisto - 1 : 0;
      const pctReembolsadoMan = totalManutencao > 0 ? totalReembMan / totalManutencao : 0;
      const pctReembolsadoSin = totalSinistro > 0 ? totalReembSin / totalSinistro : 0;
      const totalManSin = totalManutencao + totalSinistro;
      const pctReembolsadoManSin = totalManSin > 0 ? (totalReembMan + totalReembSin) / totalManSin : 0;
      const pctManFat = faturamentoTotal > 0 ? totalManutencao / faturamentoTotal : 0;
      const pctCustoLiqManFat = faturamentoTotal > 0 ? custoLiqMan / faturamentoTotal : 0;
      const pctSinFat = faturamentoTotal > 0 ? totalSinistro / faturamentoTotal : 0;
      const pctCustoLiqSinFat = faturamentoTotal > 0 ? custoLiqSin / faturamentoTotal : 0;
      const pctManSinFat = faturamentoTotal > 0 ? totalManSin / faturamentoTotal : 0;
      const valorVeiculoFipe = parseNum(
        frAny?.ValorFipeAtual ?? frAny?.valorfipeatual ??
        frAny?.ValorAtualFIPE ?? frAny?.valoratualfipe ??
        frAny?.ValorFipe ?? frAny?.valorfipe ??
        cAny?.ValorFipeAtual ?? cAny?.valorFipeAtual ??
        cAny?.ValorAtualFIPE ?? cAny?.valoratualfipe ??
        cAny?.ValorFipe ?? cAny?.valorfipe ??
        cAny?.currentFipe ?? cAny?.valor_fipe ?? 0
      );

      const faturamentoPrevisto = calcularFaturamentoPrevisto(c, cAny, idadeEmMeses);
      const ultimoPreco = ultimoValorLocacao(idLocacaoKey);
      const isCortesiaContrato = /cortesia/i.test(tipoContratoRaw) || /cortesia/i.test(String(c?.Publico || cAny?.Publico || '')) || /cortesia/i.test(String(c?.TipoContrato || c?.TipoContratoLocacao || cAny?.TipoContrato || cAny?.TipoContratoLocacao || '')) || ultimoPreco <= 0.01;
      const diferencaFaturamento = faturamentoTotal - faturamentoPrevisto;
      const mesesRestantes = Math.max(0, Number(mesesRestantesContrato) || 0);
      const projecaoFaturamento = mesesRestantes > 0 && ultimoPreco > 0 ? ultimoPreco * mesesRestantes : 0;
      const faturamentoTotalExibido = isCortesiaContrato ? 0 : faturamentoTotal;
      const faturamentoPrevistoExibido = isCortesiaContrato ? 0 : faturamentoPrevisto;
      const ultimoPrecoExibido = isCortesiaContrato ? 0 : ultimoPreco;
      const diferencaFaturamentoExibida = isCortesiaContrato ? 0 : diferencaFaturamento;
      const projecaoFaturamentoExibida = isCortesiaContrato ? 0 : projecaoFaturamento;

      const years: Record<number, any> = {};
      for (let y = 2022; y <= 2030; y++) {
        const yr = mm.get(y);
        years[y] = {
          pass: yr?.osIds.size || 0,
          man: yr?.cost || 0,
          reembMan: yr?.reemb || 0,
          sin: sm[y]?.cost || 0,
          reembSin: sm[y]?.reemb || 0,
          fat: fm[y] || 0,
        };
      }

      return {
        idLocacao: String(c?.IdContratoLocacao || ''),
        idComercial: String(cAny?.IdContratoComercial || cAny?.ContratoComercial || ''),
        idVeiculo: String(fr?.IdVeiculo || c?.IdVeiculoPrincipal || ''),
        placa: realPlaca, modelo, grupo, kmAtual, odometroRetirada: kmInicialContrato, indiceKm: kmLabel(kmAtual), idadeEmMeses, rodagemMedia,
        dataInicial,
        vencimentoContrato: c?.DataFinal ? new Date(c.DataFinal).toLocaleDateString('pt-BR') : '—',
        mesesRestantesContrato,
        prazoRestDays,
        kmEstimadoFimContrato,
        cliente: c?.NomeCliente || (c ? '' : '— Sem CTO / Avulso —'), 
        contrato: String(c?.ContratoComercial || (c ? '' : '—')),
        sitCTO: normalizeSitCTO(c || ({} as ContratoRow), cAny), 
        sitLoc: c?.SituacaoContratoLocacao || '',
        tipoContrato,
        isCortesia: isCortesiaContrato,
        franquiaBanco,
        custoKmManual: manualCustoKm,
        passagemTotal, passagemIdeal: passagemIdealExibida,
        diferencaPassagem: Math.round(diferencaPassagem), pctPassagem,
        custoManPrevisto, custoManRealizado, difManPrevReal, pctDifManPrevReal, custoManLiquido, difCustoManLiq, pctDifCustoManLiq,
        totalManutencao, ticketMedio, custoKmMan,
        totalReembMan, custoLiqMan, pctReembolsadoMan, custoKmLiqMan,
        totalSinistro, totalReembSin, valorVeiculoFipe, qtdOsManutencao: cntMan, qtdSinistros: totalQtdSinistros, custoLiqSin, pctReembolsadoSin,
        totalManSin, pctReembolsadoManSin,
        faturamentoTotal: faturamentoTotalExibido,
        faturamentoPrevisto: faturamentoPrevistoExibido, ultimoValorLocacao: ultimoPrecoExibido, diferencaFaturamento: diferencaFaturamentoExibida, projecaoFaturamento: projecaoFaturamentoExibida,
        pctManFat, pctCustoLiqManFat, pctSinFat, pctCustoLiqSinFat, pctManSinFat,
        years
      };
    });

    return result;
  }, [activeContratos, rawF, frotaByPlaca, rawM, rawS, rawFat, rawFatItens, rawPrecos, rawMovVeic, kmDivisor, bancoRegraLookup, manualCostLookup]);

  const getVencInfo = (v: string) => {
    const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const month = m[2];
    const year = m[3];
    return {
      year,
      month,
      yearToken: `Y:${year}`,
      monthToken: `M:${year}-${month}`,
      monthLabel: `${month}/${year}`,
    };
  };

  const matchesGrupoModelo = (r: VehicleRow, selected: string[]) => {
    if (!selected.length) return true;
    return selected.some(token => {
      if (token.startsWith('G:')) return r.grupo === token.slice(2);
      if (token.startsWith('M:')) return r.modelo === token.slice(2);
      return false;
    });
  };

  const matchesVencimento = (r: VehicleRow, selected: string[]) => {
    if (!selected.length) return true;
    const info = getVencInfo(r.vencimentoContrato);
    if (!info) return false;
    return selected.some(token => token === info.yearToken || token === info.monthToken);
  };

  const rowMatchesFilters = (r: VehicleRow, ignore?: string) => {
    if (ignore !== 'clientes' && filterCliente.length && !filterCliente.includes(r.cliente)) return false;
    if (ignore !== 'ctos' && filterCTO.length && !filterCTO.includes(r.contrato)) return false;
    if (ignore !== 'placas' && filterPlaca.length && !filterPlaca.includes(r.placa)) return false;
    if (ignore !== 'grupoModelo' && !matchesGrupoModelo(r, filterGrupoModelo)) return false;
    if (ignore !== 'vencimento' && !matchesVencimento(r, filterVencimento)) return false;
    if (ignore !== 'tipoContrato' && filterTipoContrato.length && !filterTipoContrato.includes(r.tipoContrato)) return false;
    if (ignore !== 'sitCTO' && filterSitCTO.length && !filterSitCTO.includes(normalizeSitCTOValue(r.sitCTO))) return false;
    if (ignore !== 'sitLoc' && filterSitLoc.length && !filterSitLoc.includes(r.sitLoc)) return false;
    return true;
  };

  // Cascata para filtros simples
  const opts = useMemo(() => {
    const compute = (key: string, picker: (r: VehicleRow) => string) => {
      return [...new Set(vehicleRows.filter(r => rowMatchesFilters(r, key)).map(picker).filter(Boolean))].sort();
    };
    return {
      clientes: compute('clientes', r => r.cliente),
      ctos: compute('ctos', r => r.contrato),
      placas: compute('placas', r => r.placa),
      tipoContrato: compute('tipoContrato', r => r.tipoContrato),
      sitCTO: compute('sitCTO', r => normalizeSitCTOValue(r.sitCTO)),
      sitLoc: compute('sitLoc', r => r.sitLoc),
    };
  }, [vehicleRows, filterCliente, filterCTO, filterPlaca, filterGrupoModelo, filterVencimento, filterTipoContrato, filterSitCTO, filterSitLoc]);

  const grupoModeloTree = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of vehicleRows) {
      if (!rowMatchesFilters(r, 'grupoModelo')) continue;
      const g = String(r.grupo || '').trim();
      const m = String(r.modelo || '').trim();
      if (!g) continue;
      if (!map.has(g)) map.set(g, new Set<string>());
      if (m) map.get(g)!.add(m);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([g, models]) => ({
        key: `G:${g}`,
        label: g,
        children: Array.from(models).sort((a, b) => a.localeCompare(b)).map(m => ({ key: `M:${m}`, label: m })),
      }));
  }, [vehicleRows, filterCliente, filterCTO, filterPlaca, filterGrupoModelo, filterVencimento, filterTipoContrato, filterSitCTO, filterSitLoc]);

  const vencimentoTree = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of vehicleRows) {
      if (!rowMatchesFilters(r, 'vencimento')) continue;
      const info = getVencInfo(r.vencimentoContrato);
      if (!info) continue;
      if (!map.has(info.year)) map.set(info.year, new Set<string>());
      map.get(info.year)!.add(info.month);
    }
    return Array.from(map.entries())
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, months]) => ({
        key: `Y:${year}`,
        label: year,
        children: Array.from(months).sort((a, b) => Number(a) - Number(b)).map(month => ({ key: `M:${year}-${month}`, label: `${month}/${year}` })),
      }));
  }, [vehicleRows, filterCliente, filterCTO, filterPlaca, filterGrupoModelo, filterVencimento, filterTipoContrato, filterSitCTO, filterSitLoc]);

  // Default: when no explicit Situação Locação filter, prefer an 'em andamento' like value
  useEffect(() => {
    if (filterSitLoc && filterSitLoc.length) return;
    const candidates = opts.sitLoc || [];
    const regex = /andament|andando|andamento|locado|ativo|vigente/i;
    const found = candidates.find(s => regex.test(String(s || '')));
    if (found) setFilterSitLoc([found]);
  }, [opts.sitLoc, filterSitLoc]);

  // Unique groups for settings
  const allGrupos = useMemo(() => [...new Set(vehicleRows.map(r=>r.grupo))].filter(Boolean).sort(), [vehicleRows]);

  const gruposByCto = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of vehicleRows) {
      const cto = String(row.contrato || '').trim();
      const grupo = String(row.grupo || '').trim();
      if (!cto || !grupo) continue;
      if (!map.has(cto)) map.set(cto, new Set<string>());
      map.get(cto)!.add(grupo);
    }
    return map;
  }, [vehicleRows]);

  const modalGrupoOptions = useMemo(() => {
    if (!ruleFormCto) return allGrupos;
    const set = gruposByCto.get(ruleFormCto);
    if (!set) return [];
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allGrupos, gruposByCto, ruleFormCto]);

  useEffect(() => {
    if (!ruleFormCto || !ruleFormGrupo) return;
    if (modalGrupoOptions.includes(ruleFormGrupo)) return;
    setRuleFormGrupo('');
  }, [ruleFormCto, ruleFormGrupo, modalGrupoOptions]);

  const displayRows = useMemo(() => {
    let rows = vehicleRows.filter(r => rowMatchesFilters(r));

    return [...rows].sort((a,b)=>{
      // need to find coldef for sortKey
      let valA:any='', valB:any='';
      if (sortKey in a) { valA = (a as any)[sortKey]; valB = (b as any)[sortKey]; }
      const cmp=typeof valA==='number'&&typeof valB==='number'?valA-valB:String(valA).localeCompare(String(valB));
      return sortDir==='asc'?cmp:-cmp;
    });
  }, [vehicleRows, filterCliente, filterCTO, filterPlaca, filterGrupoModelo, filterVencimento, filterTipoContrato, filterSitCTO, filterSitLoc, sortKey, sortDir]);

  const resumoContratoSelecionado = useMemo(() => {
    const contratosNoFiltro = (filterCTO || []).map(v => String(v || '').trim()).filter(Boolean);
    if (contratosNoFiltro.length === 1) return contratosNoFiltro[0];

    const contratosVisiveis = Array.from(new Set(displayRows.map(r => String(r.contrato || '').trim()).filter(Boolean)));
    return contratosVisiveis.length === 1 ? contratosVisiveis[0] : '';
  }, [filterCTO, displayRows]);

  const resumoContratoData = useMemo<ContractExecutiveSummary | null>(() => {
    const contrato = String(resumoContratoSelecionado || '').trim();
    if (!contrato) return null;

    const rows = displayRows.filter(r => String(r.contrato || '').trim() === contrato);

    const rankValues = (values: string[]) => {
      const map = new Map<string, number>();
      for (const raw of values) {
        const label = String(raw || '').trim() || 'Sem informacao';
        map.set(label, (map.get(label) || 0) + 1);
      }
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, count]) => ({ label, count }));
    };

    if (rows.length === 0) {
      return {
        contrato,
        rows,
        isCortesia: false,
        clientes: [],
        clientePrincipal: '',
        grupos: [],
        tiposContrato: [],
        inicioContrato: null,
        fimContrato: null,
        totalVeiculos: 0,
        kmMedio: 0,
        faturamentoTotal: 0,
        faturamentoPrevisto: 0,
        projecaoFaturamento: 0,
        manutencaoBruta: 0,
        manutencaoReembolso: 0,
        manutencaoLiquida: 0,
        sinistroBruto: 0,
        sinistroReembolso: 0,
        sinistroLiquido: 0,
        custoTotalBruto: 0,
        reembolsoTotal: 0,
        custoTotalLiquido: 0,
        pctRecuperacao: 0,
        impactoLiqSobreFat: 0,
        impactoBrutoSobreFat: 0,
        passagemCriticos: 0,
        riscoFinanceiroCriticos: 0,
        totalSinistrosQtd: 0,
        baseReembolsoSinistro: 0,
        baseAtivoFipeSinistro: 0,
        sinistralidadeReembolso: 0,
        sinistralidadeOperacional: 0,
        indiceFrequenciaSinistro: 0,
        gravidadeMediaSinistro: 0,
        indiceSeveridadeDano: 0,
        proximosVencimentos90d: 0,
        vencidos: 0,
        sitLocTop: [],
        sitCTOTop: [],
        topOfensores: [],
        recomendacoes: ['Nenhum veiculo encontrado para este CTO com os dados atuais.'],
        status: 'Atencao',
      };
    }

    const sum = (picker: (row: VehicleRow) => number) => rows.reduce((acc, row) => acc + (Number(picker(row)) || 0), 0);
    const isCortesia = rows.length > 0 && rows.every(row => row.isCortesia || /cortesia/i.test(String(row.tipoContrato || '')));

    const clientes = Array.from(new Set(rows.map(r => String(r.cliente || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const grupos = Array.from(new Set(rows.map(r => String(r.grupo || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const tiposContrato = Array.from(new Set(rows.map(r => String(r.tipoContrato || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

    const startDates = rows.map(r => parseDateFlexible(r.dataInicial)).filter((d): d is Date => !!d);
    const endDates = rows.map(r => parseDateFlexible(r.vencimentoContrato)).filter((d): d is Date => !!d);
    const inicioContrato = startDates.length ? new Date(Math.min(...startDates.map(d => d.getTime()))) : null;
    const fimContrato = endDates.length ? new Date(Math.max(...endDates.map(d => d.getTime()))) : null;

    const totalVeiculos = rows.length;
    const kmMedio = totalVeiculos > 0 ? sum(r => r.kmAtual) / totalVeiculos : 0;
    const faturamentoTotal = sum(r => r.faturamentoTotal);
    const faturamentoPrevisto = sum(r => r.faturamentoPrevisto);
    const projecaoFaturamento = sum(r => r.projecaoFaturamento);

    const manutencaoBruta = sum(r => r.totalManutencao);
    const manutencaoReembolso = sum(r => r.totalReembMan);
    const manutencaoLiquida = sum(r => r.custoLiqMan);
    const sinistroBruto = sum(r => r.totalSinistro);
    const sinistroReembolso = sum(r => r.totalReembSin);
    const sinistroLiquido = sum(r => r.custoLiqSin);
    const totalSinistrosQtd = sum(r => r.qtdSinistros);
    const baseReembolsoSinistro = sinistroReembolso;
    const baseAtivoFipeSinistro = sum(r => r.valorVeiculoFipe);

    const custoTotalBruto = manutencaoBruta + sinistroBruto;
    const reembolsoTotal = manutencaoReembolso + sinistroReembolso;
    const custoTotalLiquido = manutencaoLiquida + sinistroLiquido;
    const pctRecuperacao = custoTotalBruto > 0 ? reembolsoTotal / custoTotalBruto : 0;

    const impactoLiqSobreFat = faturamentoTotal > 0 ? custoTotalLiquido / faturamentoTotal : 0;
    const impactoBrutoSobreFat = faturamentoTotal > 0 ? custoTotalBruto / faturamentoTotal : 0;
    const sinistralidadeReembolso = baseReembolsoSinistro > 0 ? sinistroBruto / baseReembolsoSinistro : NaN;
    const sinistralidadeOperacional = faturamentoTotal > 0 ? sinistroBruto / faturamentoTotal : 0;
    const indiceFrequenciaSinistro = totalVeiculos > 0 ? totalSinistrosQtd / totalVeiculos : 0;
    const gravidadeMediaSinistro = totalSinistrosQtd > 0 ? sinistroBruto / totalSinistrosQtd : 0;
    const indiceSeveridadeDano = baseAtivoFipeSinistro > 0 ? sinistroBruto / baseAtivoFipeSinistro : NaN;

    const passagemCriticos = rows.filter(row => (
      (Number(row.diferencaPassagem) || 0) > passagemDiffAlertThreshold ||
      (Number(row.pctPassagem) || 0) > passagemPctAlertThreshold
    )).length;

    const riscoFinanceiroCriticos = isCortesia
      ? 0
      : rows.filter(row => (
        (Number(row.pctManFat) || 0) > fatPctAlertThreshold ||
        (Number(row.pctCustoLiqManFat) || 0) > fatPctAlertThreshold ||
        (Number(row.pctSinFat) || 0) > fatPctAlertThreshold ||
        (Number(row.pctCustoLiqSinFat) || 0) > fatPctAlertThreshold ||
        (Number(row.pctManSinFat) || 0) > fatPctAlertThreshold
      )).length;

    const proximosVencimentos90d = rows.filter(r => Number.isFinite(r.prazoRestDays) && r.prazoRestDays >= 0 && r.prazoRestDays <= 90).length;
    const vencidos = rows.filter(r => Number.isFinite(r.prazoRestDays) && r.prazoRestDays < 0).length;

    const totalManSin = sum(r => r.totalManSin);
    const topOfensores = [...rows]
      .map(row => ({
        placa: row.placa,
        modelo: row.modelo,
        custo: Number(row.totalManSin) || 0,
        man: Number(row.totalManutencao) || 0,
        sin: Number(row.totalSinistro) || 0,
      }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 5)
      .map(item => ({ ...item, perc: totalManSin > 0 ? item.custo / totalManSin : 0 }));

    const recomendacoes: string[] = [];
    if (isCortesia) recomendacoes.push('Contrato classificado como cortesia: critérios financeiros de faturamento não são aplicados na classificação de status.');
    if (vencidos > 0) recomendacoes.push(`${vencidos} veiculo(s) com contrato vencido; priorizar tratativa comercial.`);
    if (proximosVencimentos90d > 0) recomendacoes.push(`${proximosVencimentos90d} veiculo(s) vencem em ate 90 dias; preparar renovacao.`);
    if (passagemCriticos > 0) recomendacoes.push(`${passagemCriticos} veiculo(s) com desvio de passagem acima do limite configurado.`);
    if (!isCortesia && riscoFinanceiroCriticos > 0) recomendacoes.push(`${riscoFinanceiroCriticos} veiculo(s) com pressao de custo acima de ${fmtPct(fatPctAlertThreshold)} do faturamento.`);
    if (!isCortesia && impactoLiqSobreFat > fatPctAlertThreshold) recomendacoes.push(`Impacto liquido consolidado em ${fmtPct(impactoLiqSobreFat)} do faturamento do contrato.`);
    if (recomendacoes.length === 0) recomendacoes.push('Sem alertas criticos para o contrato nos parametros atuais.');

    let status: ContractExecutiveSummary['status'] = 'Saudavel';
    const criticRatio = totalVeiculos > 0 ? riscoFinanceiroCriticos / totalVeiculos : 0;
    if (isCortesia) {
      if (vencidos > 0) status = 'Critico';
      else if (proximosVencimentos90d > 0 || passagemCriticos > 0) status = 'Atencao';
    } else {
      if (vencidos > 0 || impactoLiqSobreFat > fatPctAlertThreshold || criticRatio >= 0.4) status = 'Critico';
      else if (proximosVencimentos90d > 0 || passagemCriticos > 0 || riscoFinanceiroCriticos > 0) status = 'Atencao';
    }

    return {
      contrato,
      rows,
      isCortesia,
      clientes,
      clientePrincipal: clientes[0] || '',
      grupos,
      tiposContrato,
      inicioContrato,
      fimContrato,
      totalVeiculos,
      kmMedio,
      faturamentoTotal,
      faturamentoPrevisto,
      projecaoFaturamento,
      manutencaoBruta,
      manutencaoReembolso,
      manutencaoLiquida,
      sinistroBruto,
      sinistroReembolso,
      sinistroLiquido,
      custoTotalBruto,
      reembolsoTotal,
      custoTotalLiquido,
      pctRecuperacao,
      impactoLiqSobreFat,
      impactoBrutoSobreFat,
      passagemCriticos,
      riscoFinanceiroCriticos,
      totalSinistrosQtd,
      baseReembolsoSinistro,
      baseAtivoFipeSinistro,
      sinistralidadeReembolso,
      sinistralidadeOperacional,
      indiceFrequenciaSinistro,
      gravidadeMediaSinistro,
      indiceSeveridadeDano,
      proximosVencimentos90d,
      vencidos,
      sitLocTop: rankValues(rows.map(r => r.sitLoc)),
      sitCTOTop: rankValues(rows.map(r => r.sitCTO)),
      topOfensores,
      recomendacoes,
      status,
    };
  }, [displayRows, resumoContratoSelecionado, passagemDiffAlertThreshold, passagemPctAlertThreshold, fatPctAlertThreshold]);

  const ctoListagemRows = useMemo<CtoResumoListRow[]>(() => {
    const topLabel = (values: string[]) => {
      const map = new Map<string, number>();
      for (const raw of values) {
        const label = String(raw || '').trim() || 'Sem informacao';
        map.set(label, (map.get(label) || 0) + 1);
      }
      const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
      return sorted[0]?.[0] || 'Sem informacao';
    };

    const summarizeRows = (rows: VehicleRow[]) => {
      const sum = (picker: (row: VehicleRow) => number) => rows.reduce((acc, row) => acc + (Number(picker(row)) || 0), 0);
      const isCortesia = rows.length > 0 && rows.every(row => row.isCortesia || /cortesia/i.test(String(row.tipoContrato || '')));

      const totalVeiculos = rows.length;
      const kmMedio = totalVeiculos > 0 ? sum(r => r.kmAtual) / totalVeiculos : 0;
      const faturamentoTotal = sum(r => r.faturamentoTotal);
      const manutencaoBruta = sum(r => r.totalManutencao);
      const manutencaoReembolso = sum(r => r.totalReembMan);
      const sinistroBruto = sum(r => r.totalSinistro);
      const sinistroReembolso = sum(r => r.totalReembSin);
      const custoLiquido = sum(r => r.custoLiqMan + r.custoLiqSin);

      const custoTotalBruto = manutencaoBruta + sinistroBruto;
      const reembolsoTotal = manutencaoReembolso + sinistroReembolso;
      const pctRecuperacao = custoTotalBruto > 0 ? reembolsoTotal / custoTotalBruto : 0;
      const impactoLiqFat = faturamentoTotal > 0 ? custoLiquido / faturamentoTotal : 0;

      const passagemCriticos = rows.filter(row => (
        (Number(row.diferencaPassagem) || 0) > passagemDiffAlertThreshold ||
        (Number(row.pctPassagem) || 0) > passagemPctAlertThreshold
      )).length;

      const riscoFinanceiroCriticos = isCortesia
        ? 0
        : rows.filter(row => (
          (Number(row.pctManFat) || 0) > fatPctAlertThreshold ||
          (Number(row.pctCustoLiqManFat) || 0) > fatPctAlertThreshold ||
          (Number(row.pctSinFat) || 0) > fatPctAlertThreshold ||
          (Number(row.pctCustoLiqSinFat) || 0) > fatPctAlertThreshold ||
          (Number(row.pctManSinFat) || 0) > fatPctAlertThreshold
        )).length;

      const proximosVencimentos90d = rows.filter(r => Number.isFinite(r.prazoRestDays) && r.prazoRestDays >= 0 && r.prazoRestDays <= 90).length;
      const vencidos = rows.filter(r => Number.isFinite(r.prazoRestDays) && r.prazoRestDays < 0).length;

      const criticRatio = totalVeiculos > 0 ? riscoFinanceiroCriticos / totalVeiculos : 0;
      let status: HealthStatus = 'Saudavel';
      if (isCortesia) {
        if (vencidos > 0) status = 'Critico';
        else if (proximosVencimentos90d > 0 || passagemCriticos > 0) status = 'Atencao';
      } else {
        if (vencidos > 0 || impactoLiqFat > fatPctAlertThreshold || criticRatio >= 0.4) status = 'Critico';
        else if (proximosVencimentos90d > 0 || passagemCriticos > 0 || riscoFinanceiroCriticos > 0) status = 'Atencao';
      }

      return {
        isCortesia,
        clientePrincipal: topLabel(rows.map(r => String(r.cliente || '').trim())),
        totalVeiculos,
        kmMedio,
        faturamentoTotal,
        custoLiquido,
        pctRecuperacao,
        impactoLiqFat,
        status,
      };
    };

    const groupedByCto = new Map<string, VehicleRow[]>();
    for (const row of displayRows) {
      const cto = String(row.contrato || '').trim();
      if (!cto) continue;
      if (!groupedByCto.has(cto)) groupedByCto.set(cto, []);
      groupedByCto.get(cto)!.push(row);
    }

    const rows = Array.from(groupedByCto.entries()).map(([cto, ctoRows]) => {
      const ctoSummary = summarizeRows(ctoRows);

      const groupedLocacao = new Map<string, VehicleRow[]>();
      for (const row of ctoRows) {
        const idLocacao = String(row.idLocacao || '').trim() || 'Sem contrato de locação';
        if (!groupedLocacao.has(idLocacao)) groupedLocacao.set(idLocacao, []);
        groupedLocacao.get(idLocacao)!.push(row);
      }

      const locacoes: CtoLocacaoSummary[] = Array.from(groupedLocacao.entries())
        .map(([idLocacao, locRows]) => {
          const locSummary = summarizeRows(locRows);
          return {
            idLocacao,
            isCortesia: locSummary.isCortesia,
            clientePrincipal: locSummary.clientePrincipal,
            totalVeiculos: locSummary.totalVeiculos,
            kmMedio: locSummary.kmMedio,
            faturamentoTotal: locSummary.faturamentoTotal,
            custoLiquido: locSummary.custoLiquido,
            pctRecuperacao: locSummary.pctRecuperacao,
            impactoLiqFat: locSummary.impactoLiqFat,
            sitLocTop: topLabel(locRows.map(r => String(r.sitLoc || '').trim())),
            status: locSummary.status,
          };
        })
        .sort((a, b) => {
          if (b.impactoLiqFat !== a.impactoLiqFat) return b.impactoLiqFat - a.impactoLiqFat;
          return a.idLocacao.localeCompare(b.idLocacao, 'pt-BR');
        });

      return {
        cto,
        isCortesia: ctoSummary.isCortesia,
        clientePrincipal: ctoSummary.clientePrincipal,
        totalVeiculos: ctoSummary.totalVeiculos,
        kmMedio: ctoSummary.kmMedio,
        faturamentoTotal: ctoSummary.faturamentoTotal,
        custoLiquido: ctoSummary.custoLiquido,
        pctRecuperacao: ctoSummary.pctRecuperacao,
        impactoLiqFat: ctoSummary.impactoLiqFat,
        status: ctoSummary.status,
        locacoes,
      };
    });

    const statusOrder: Record<HealthStatus, number> = { Saudavel: 0, Atencao: 1, Critico: 2 };

    const getSortValue = (row: CtoResumoListRow, key: CtoListSortKey): string | number => {
      if (key === 'cto') return row.cto;
      if (key === 'cliente') return row.clientePrincipal;
      if (key === 'veiculos') return row.totalVeiculos;
      if (key === 'kmMedio') return row.kmMedio;
      if (key === 'faturamento') return row.faturamentoTotal;
      if (key === 'custoLiquido') return row.custoLiquido;
      if (key === 'pctRecuperacao') return row.pctRecuperacao;
      if (key === 'impactoLiqFat') return row.impactoLiqFat;
      return statusOrder[row.status];
    };

    return [...rows].sort((a, b) => {
      const va = getSortValue(a, ctoListSortKey);
      const vb = getSortValue(b, ctoListSortKey);
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb), 'pt-BR');

      if (cmp === 0) cmp = a.cto.localeCompare(b.cto, 'pt-BR');
      return ctoListSortDir === 'asc' ? cmp : -cmp;
    });
  }, [displayRows, ctoListSortKey, ctoListSortDir, fatPctAlertThreshold, passagemDiffAlertThreshold, passagemPctAlertThreshold]);

  useEffect(() => {
    setExpandedCtos(prev => {
      const available = new Set(ctoListagemRows.map(row => row.cto));
      const next: Record<string, boolean> = {};
      for (const key of Object.keys(prev)) {
        if (prev[key] && available.has(key)) next[key] = true;
      }
      return next;
    });
  }, [ctoListagemRows]);

  const handleCtoListSort = (key: CtoListSortKey) => {
    if (ctoListSortKey === key) {
      setCtoListSortDir(dir => dir === 'asc' ? 'desc' : 'asc');
      return;
    }
    setCtoListSortKey(key);
    setCtoListSortDir('asc');
  };

  const ctoListSortIcon = (key: CtoListSortKey) => {
    if (ctoListSortKey !== key) return ' ↕';
    return ctoListSortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const toggleCtoExpanded = (cto: string) => {
    setExpandedCtos(prev => ({ ...prev, [cto]: !prev[cto] }));
  };

  const statusBadgeClass = (status: HealthStatus) => {
    if (status === 'Critico') return 'border-rose-200 bg-rose-50 text-rose-700';
    if (status === 'Atencao') return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  };

  const getResumoLocacaoStatus = (row: VehicleRow): { status: HealthStatus; motivo: string } => {
    const isCortesia = row.isCortesia || /cortesia/i.test(String(row.tipoContrato || ''));
    const vencido = Number.isFinite(row.prazoRestDays) && row.prazoRestDays < 0;
    const vence90d = Number.isFinite(row.prazoRestDays) && row.prazoRestDays >= 0 && row.prazoRestDays <= 90;
    const passagemCritica = (Number(row.diferencaPassagem) || 0) > passagemDiffAlertThreshold || (Number(row.pctPassagem) || 0) > passagemPctAlertThreshold;

    const riscoFinanceiro = !isCortesia && (
      (Number(row.pctManFat) || 0) > fatPctAlertThreshold ||
      (Number(row.pctCustoLiqManFat) || 0) > fatPctAlertThreshold ||
      (Number(row.pctSinFat) || 0) > fatPctAlertThreshold ||
      (Number(row.pctCustoLiqSinFat) || 0) > fatPctAlertThreshold ||
      (Number(row.pctManSinFat) || 0) > fatPctAlertThreshold
    );

    let status: HealthStatus = 'Saudavel';
    if (isCortesia) {
      if (vencido) status = 'Critico';
      else if (vence90d || passagemCritica) status = 'Atencao';
    } else {
      if (vencido || riscoFinanceiro) status = 'Critico';
      else if (vence90d || passagemCritica) status = 'Atencao';
    }

    const motivos: string[] = [];
    if (vencido) motivos.push('Contrato vencido');
    if (vence90d) motivos.push('Vence em até 90 dias');
    if (passagemCritica) motivos.push('Desvio de passagem acima do limite');
    if (riscoFinanceiro) motivos.push(`Indicadores %/Fat acima de ${fmtPct(fatPctAlertThreshold)}`);
    if (motivos.length === 0) motivos.push('Dentro dos limites configurados');

    return { status, motivo: motivos.join(' | ') };
  };

  const maintDetailRows = useMemo<MaintDetailRow[]>(() => {
    if (!maintDetailTarget) return [];
    const arrM = rawM as ManutencaoRow[]|null ?? [];
    const arrS = rawS as SinistroRow[]|null ?? [];
    const targetKey = canonicalPlate(maintDetailTarget.placa || '');
    if (!targetKey) return [];

    const contractStart = parseDateFlexible(maintDetailTarget.dataInicial || '');
    const today = new Date();
    const seen = new Set<string>();
    const rows: MaintDetailRow[] = [];
    const includeManutencao = maintDetailTarget.mode === 'manutencao' || maintDetailTarget.mode === 'mansin';
    const includeSinistro = maintDetailTarget.mode === 'sinistro' || maintDetailTarget.mode === 'mansin';

    if (includeManutencao) {
      for (const m of arrM) {
        const plateKey = canonicalPlate(m?.Placa || '');
        if (!plateKey || plateKey !== targetKey) continue;

        const statusRaw = (m as any)?.SituacaoOrdemServico || (m as any)?.situacaoordemservico || (m as any)?.SituacaoOS || m?.Situacao || m?.Status || m?.StatusOrdem || m?.SituacaoOcorrencia || m?.StatusOcorrencia || '';
        const status = String(statusRaw || '').toLowerCase();
        if (status.includes('cancel')) continue;

        const rawDate = (m as any)?.OrdemServicoCriadaEm || (m as any)?.DataCriacao || (m as any)?.DataEntrada || (m as any)?.DataCriacaoOS || (m as any)?.DataServico || (m as any)?.DataAtualizacaoDados || '';
        const date = parseDateFlexible(rawDate);
        if (!date) continue;
        if (contractStart && date < contractStart) continue;
        if (date > today) continue;

        const rawOs = (m as any)?.IdOrdemServico || (m as any)?.idordemservico || (m as any)?.IdOcorrencia || (m as any)?.numeroos;
        const osId = normalizeDisplayOsId(rawOs, `${targetKey}-${rawDate}`);
        const dedupeKey = `M::${osId}::${date.toISOString()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        rows.push({
          osId,
          date,
          tipo: String((m as any)?.Tipo || (m as any)?.TipoManutencao || (m as any)?.TipoOcorrencia || 'Manutenção').trim(),
          motivo: String((m as any)?.Motivo || (m as any)?.MotivoOcorrencia || '').trim(),
          situacao: String((m as any)?.SituacaoOrdemServico || (m as any)?.situacaoordemservico || (m as any)?.SituacaoOS || (m as any)?.Situacao || (m as any)?.StatusOrdem || (m as any)?.Status || (m as any)?.SituacaoOcorrencia || (m as any)?.StatusOcorrencia || '').trim(),
          valorTotal: parseNum((m as any)?.ValorTotalFatItens || (m as any)?.ValorTotal || (m as any)?.valortotal || (m as any)?.CustoTotalOS || 0),
          valorReembolsavel: parseNum((m as any)?.ValorReembolsavelFatItens || (m as any)?.ValorReembolsavel || (m as any)?.valorreembolsavel || 0),
        });
      }
    }

    if (includeSinistro) {
      for (const s of arrS) {
        const plateKey = canonicalPlate((s as any)?.Placa || '');
        if (!plateKey || plateKey !== targetKey) continue;

        const statusRaw = (s as any)?.SituacaoOrdemServico || (s as any)?.situacaoordemservico || (s as any)?.Situacao || (s as any)?.Status || '';
        const status = String(statusRaw || '').toLowerCase();
        if (status.includes('cancel')) continue;

        const rawDate = (s as any)?.DataSinistro || (s as any)?.DataCriacao || (s as any)?.DataOcorrencia || (s as any)?.DataAtualizacaoDados || '';
        const date = parseDateFlexible(rawDate);
        if (!date) continue;
        if (contractStart && date < contractStart) continue;
        if (date > today) continue;

        const rawOs = (s as any)?.IdOrdemServico || (s as any)?.idordemservico || (s as any)?.IdOcorrencia || (s as any)?.IdSinistro || (s as any)?.IdEvento || (s as any)?.NumeroOS;
        const osId = normalizeDisplayOsId(rawOs, `${targetKey}-SIN-${rawDate}`);
        const dedupeKey = `S::${osId}::${date.toISOString()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const valorTotal = parseSinistroCost(s as any);
        const valorReembolsavel = parseSinistroReembolso(s as any);

        const situacaoCandidates = [
          (s as any)?.SituacaoOrdemServico,
          (s as any)?.situacaoordemservico,
          (s as any)?.SituacaoOS,
          (s as any)?.SituacaoSinistro,
          (s as any)?.StatusSinistro,
          (s as any)?.Situacao,
          (s as any)?.Status,
          (s as any)?.StatusOcorrencia,
          (s as any)?.SituacaoOcorrencia,
          (s as any)?.StatusOrdem,
        ].map((v:any)=>String(v||'').trim()).filter(Boolean);
        const situacaoValue = situacaoCandidates.length ? situacaoCandidates[0] : '—';

        rows.push({
          osId,
          date,
          tipo: 'Sinistro',
          motivo: String((s as any)?.Motivo || (s as any)?.TipoSinistro || (s as any)?.Descricao || '').trim(),
          situacao: situacaoValue,
          valorTotal,
          valorReembolsavel,
        });
      }
    }

    return rows.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }, [maintDetailTarget, rawM, rawS]);

  const fatDetailRows = useMemo<FaturamentoDetailRow[]>(() => {
    if (!maintDetailTarget || maintDetailTarget.mode !== 'faturamento') return [];
    if (/cortesia/i.test(String(maintDetailTarget.tipoContrato || ''))) return [];

    const arrF = rawFat as FaturamentoRow[]|null ?? [];
    const arrFI = rawFatItens as FaturamentoItemRow[]|null ?? [];
    const arrPrecos = rawPrecos as PrecosLocacaoRow[]|null ?? [];

    const targetPlaca = normalizePlate(maintDetailTarget.placa || '');
    const targetVeiculo = String(maintDetailTarget.idVeiculo || '').trim().toUpperCase();
    const targetLocacao = String(maintDetailTarget.idLocacao || '').trim().toUpperCase();
    const targetComercial = String(maintDetailTarget.idComercial || '').trim().toUpperCase();

    const parseYearMonth = (v: unknown): { ano: number; mes: number } | null => {
      const raw = String(v || '').trim();
      if (!raw) return null;

      const mmYyyy = raw.match(/^(\d{2})\/(\d{4})$/);
      if (mmYyyy) return { ano: Number(mmYyyy[2]), mes: Number(mmYyyy[1]) };

      const yyyyMm = raw.match(/^(\d{4})-(\d{2})$/);
      if (yyyyMm) return { ano: Number(yyyyMm[1]), mes: Number(yyyyMm[2]) };

      const yyyymm = raw.match(/^(\d{4})(\d{2})$/);
      if (yyyymm) return { ano: Number(yyyymm[1]), mes: Number(yyyymm[2]) };

      const d = parseDateFlexible(raw);
      if (!d) return null;
      return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
    };

    const matchesTarget = (row: any) => {
      const rowPlaca = normalizePlate((row.Placa || row.placa || '') as string);
      const rowVeiculo = String(row.IdVeiculo || '').trim().toUpperCase();
      const rowLocacao = String(row.IdContratoLocacao || '').trim().toUpperCase();
      const rowComercial = String(row.IdContratoComercial || row.ContratoComercial || '').trim().toUpperCase();

      if (targetPlaca && rowPlaca && rowPlaca === targetPlaca) return true;
      if (targetVeiculo && rowVeiculo && rowVeiculo === targetVeiculo) return true;
      if (targetLocacao && rowLocacao && rowLocacao === targetLocacao) return true;
      if (targetComercial && rowComercial && rowComercial === targetComercial) return true;
      return false;
    };

    const fatMetaByNota = new Map<string, { ano: number; mes: number; descricao: string }>();
    for (const f of arrF) {
      if (!matchesTarget(f)) continue;

      const ym = parseYearMonth(f.DataCompetencia || f.Competencia || f.DataEmissao || f.DataCriacao || '');
      if (!ym || ym.ano < 2022 || ym.ano > 2030 || ym.mes < 1 || ym.mes > 12) continue;

      const nota = String(f.IdNota || '').trim();
      if (!nota) continue;

      fatMetaByNota.set(nota, {
        ano: ym.ano,
        mes: ym.mes,
        descricao: String(f.Placa || f.placa || '').trim(),
      });
    }

    const byMonth = new Map<string, { ano: number; mes: number; valor: number }>();
    const addMonthlyValue = (ano: number, mes: number, valor: number) => {
      const key = `${ano}-${String(mes).padStart(2, '0')}`;
      const prev = byMonth.get(key) || { ano, mes, valor: 0 };
      prev.valor += valor;
      byMonth.set(key, prev);
    };

    for (const f of arrF) {
      if (!matchesTarget(f)) continue;
      const nota = String(f.IdNota || '').trim();
      const meta = fatMetaByNota.get(nota);
      const ym = meta || parseYearMonth(f.DataCompetencia || f.Competencia || f.DataEmissao || f.DataCriacao || '');
      if (!ym || ym.ano < 2022 || ym.ano > 2030 || ym.mes < 1 || ym.mes > 12) continue;

      const valor = parseNum(f.VlrLocacao ?? f.ValorLocacao ?? 0);
      if (!valor) continue;
      addMonthlyValue(ym.ano, ym.mes, valor);
    }

    for (const fi of arrFI) {
      const nota = String(fi.IdNota || '').trim();
      if (!nota) continue;
      const meta = fatMetaByNota.get(nota);
      const rowMatches = matchesTarget(fi);
      if (!rowMatches && !meta) continue;

      const ym = meta || parseYearMonth((fi as any).DataCompetencia || (fi as any).Competencia || (fi as any).DataAtualizacaoDados || '');
      if (!ym || ym.ano < 2022 || ym.ano > 2030 || ym.mes < 1 || ym.mes > 12) continue;

      const valor = parseNum(fi.ValorTotal ?? fi.ValorUnitario ?? 0);
      if (!valor) continue;
      addMonthlyValue(ym.ano, ym.mes, valor);
    }

    const descFromPrecoByMonth = new Map<string, string>();
    if (targetLocacao) {
      const precosLoc = arrPrecos
        .filter(p => String(p.IdContratoLocacao || '').trim().toUpperCase() === targetLocacao)
        .map((p) => ({
          data: parseDateFlexible(p.DataInicial || ''),
          valor: parseNum(p.PrecoUnitario || p.ValorLocacao || p.VlrLocacao || 0),
          descricao: String((p as any).Descricao || (p as any).Observacao || (p as any).MotivoAlteracao || (p as any).Justificativa || '').trim(),
        }))
        .filter(p => p.data && p.valor > 0)
        .sort((a, b) => (a.data!.getTime() - b.data!.getTime()));

      for (let i = 1; i < precosLoc.length; i++) {
        const curr = precosLoc[i];
        const prev = precosLoc[i - 1];
        const ano = curr.data!.getFullYear();
        const mes = curr.data!.getMonth() + 1;
        const key = `${ano}-${String(mes).padStart(2, '0')}`;
        const base = curr.descricao || `Alteração de preço da locação: ${fmtBRLZero(prev.valor)} -> ${fmtBRLZero(curr.valor)}`;
        descFromPrecoByMonth.set(key, base);
      }
    }

    const sorted = Array.from(byMonth.values()).sort((a, b) => {
      if (a.ano !== b.ano) return a.ano - b.ano;
      return a.mes - b.mes;
    });

    const rows: FaturamentoDetailRow[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      const prev = i > 0 ? sorted[i - 1] : null;
      const monthKey = `${cur.ano}-${String(cur.mes).padStart(2, '0')}`;
      let descricao = descFromPrecoByMonth.get(monthKey) || '';

      if (!descricao && prev && Math.abs(cur.valor - prev.valor) > 0.01) {
        descricao = 'Variação de faturamento sem alteração de preço cadastrada';
      }

      if (!descricao) descricao = 'Faturamento de locação';
      rows.push({ ano: cur.ano, mes: cur.mes, valor: cur.valor, descricao });
    }

    return rows.sort((a, b) => (b.ano - a.ano) || (b.mes - a.mes));
  }, [maintDetailTarget, rawFat, rawFatItens, rawPrecos]);

  const getDynYearsForTab = (tab: TabKey) => {
    const minYear = 2022;
    const maxYear = 2026;
    if (tab === 'resumo' || tab === 'listagemCto') return [];
    if (tab === 'passagem') {
      const yearsSet = new Set<number>();
      for (const r of displayRows) {
        if (!r.years) continue;
        for (let y = minYear; y <= maxYear; y++) {
          if (Number(r.years[y]?.pass) > 0) yearsSet.add(y);
        }
      }
      const years = Array.from(yearsSet).sort((a, b) => a - b);
      if (years.length > 0) return years;
    }
    let minGroupYear = maxYear;
    for (const r of displayRows) {
      const yr = getYear(r.dataInicial);
      if (yr > 0 && yr < minGroupYear) minGroupYear = yr;
    }
    const cutoff = Math.max(minGroupYear, minYear);
    const res = [];
    for (let y = cutoff; y <= maxYear; y++) res.push(y);
    return res;

  };

  // Determine dynamic years to display based on filtered rows
  const dynYears = useMemo(() => getDynYearsForTab(activeTab), [activeTab, displayRows]);

  const kpis = useMemo(() => {
    const vSet = new Set<string>(), lSet = new Set<string>(), cSet = new Set<string>();
    let fat=0, man=0, sin=0, ms=0, reemb=0;
    for (const r of displayRows) {
      if(r.placa) vSet.add(r.placa);
      if(r.idLocacao) lSet.add(r.idLocacao);
      if(r.idComercial) cSet.add(r.idComercial);
      fat+=r.faturamentoTotal; man+=r.totalManutencao; sin+=r.totalSinistro; ms+=r.totalManSin; reemb+=r.totalReembMan+r.totalReembSin;
    }
    return {
      nVeiculos: vSet.size,
      nLocacao: lSet.size,
      nComercial: cSet.size,
      fat, man, sin, ms, reemb
    };
  }, [displayRows]);

  const getCriticalCaseCountForTab = (tab: TabKey) => {
    if (tab === 'passagem') {
      return displayRows.filter(row => (Number(row.diferencaPassagem) || 0) > passagemDiffAlertThreshold || (Number(row.pctPassagem) || 0) > passagemPctAlertThreshold).length;
    }

    if (tab === 'previsto') {
      return displayRows.filter(row => (Number(row.difManPrevReal) || 0) < 0 || (Number(row.pctDifManPrevReal) || 0) > 0).length;
    }

    if (tab === 'manutencao') {
      return displayRows.filter(row => (Number(row.custoLiqMan) || 0) > 0).length;
    }

    if (tab === 'sinistro') {
      return displayRows.filter(row => (Number(row.custoLiqSin) || 0) > 0).length;
    }

    if (tab === 'mansin') {
      return displayRows.filter(row => (Number(row.custoLiqMan) || 0) + (Number(row.custoLiqSin) || 0) > 0).length;
    }

    if (tab === 'faturamento') {
      return displayRows.filter(row => (
        (Number(row.pctManFat) || 0) > fatPctAlertThreshold ||
        (Number(row.pctCustoLiqManFat) || 0) > fatPctAlertThreshold ||
        (Number(row.pctSinFat) || 0) > fatPctAlertThreshold ||
        (Number(row.pctCustoLiqSinFat) || 0) > fatPctAlertThreshold ||
        (Number(row.pctManSinFat) || 0) > fatPctAlertThreshold
      )).length;
    }

    return 0;
  };

  const tabKpis = useMemo(() => {
    let totalPassagens = 0;
    let totalPassagemPrevista = 0;
    let veiculosCriticos = 0;
    let somaRodagemMedia = 0;

    let totalPrevisto = 0;
    let totalRealizado = 0;
    let totalDifPrevReal = 0;

    let totalManutencao = 0;
    let totalReembMan = 0;
    let totalCustoLiqMan = 0;

    let totalSinistro = 0;
    let totalReembSin = 0;
    let totalCustoLiqSin = 0;
    let totalSinistrosQtd = 0;
    let totalAtivoFipeSinistro = 0;

    let totalManSin = 0;
    let totalReembManSin = 0;
    let totalEventosManSin = 0;

    let faturamentoTotal = 0;

    for (const row of displayRows) {
      totalPassagens += Number(row.passagemTotal) || 0;
      totalPassagemPrevista += Number(row.passagemIdeal) || 0;
      somaRodagemMedia += Number(row.rodagemMedia) || 0;
      if ((Number(row.diferencaPassagem) || 0) > passagemDiffAlertThreshold || (Number(row.pctPassagem) || 0) > passagemPctAlertThreshold) veiculosCriticos++;

      totalPrevisto += Number(row.custoManPrevisto) || 0;
      totalRealizado += Number(row.custoManRealizado) || 0;
      totalDifPrevReal += Number(row.difManPrevReal) || 0;

      totalManutencao += Number(row.totalManutencao) || 0;
      totalReembMan += Number(row.totalReembMan) || 0;
      totalCustoLiqMan += Number(row.custoLiqMan) || 0;

      totalSinistro += Number(row.totalSinistro) || 0;
      totalReembSin += Number(row.totalReembSin) || 0;
      totalCustoLiqSin += Number(row.custoLiqSin) || 0;
      totalSinistrosQtd += Number(row.qtdSinistros) || 0;
      totalAtivoFipeSinistro += Number(row.valorVeiculoFipe) || 0;

      totalManSin += Number(row.totalManSin) || 0;
      totalReembManSin += (Number(row.totalReembMan) || 0) + (Number(row.totalReembSin) || 0);
      totalEventosManSin += (Number(row.qtdOsManutencao) || 0) + (Number(row.qtdSinistros) || 0);

      faturamentoTotal += Number(row.faturamentoTotal) || 0;
    }

    const totalVeiculos = displayRows.length;
    const mediaPassagens = totalVeiculos > 0 ? totalPassagens / totalVeiculos : 0;
    const rodagemMedia = totalVeiculos > 0 ? somaRodagemMedia / totalVeiculos : 0;

    const pctDesvioPrevReal = totalPrevisto > 0 ? (totalRealizado / totalPrevisto) - 1 : 0;
    const pctRecuperacaoMan = totalManutencao > 0 ? totalReembMan / totalManutencao : 0;
    const pctRecuperacaoSin = totalSinistro > 0 ? totalReembSin / totalSinistro : 0;
    const custoLiqTotalManSin = totalManSin - totalReembManSin;
    const ticketMedioTotal = totalEventosManSin > 0 ? totalManSin / totalEventosManSin : 0;
    const sinistralidadeOperacional = faturamentoTotal > 0 ? totalSinistro / faturamentoTotal : 0;
    const sinistralidadeReembolso = totalReembSin > 0 ? totalSinistro / totalReembSin : NaN;
    const indiceFrequenciaSinistro = totalVeiculos > 0 ? totalSinistrosQtd / totalVeiculos : 0;
    const gravidadeMediaSinistro = totalSinistrosQtd > 0 ? totalSinistro / totalSinistrosQtd : 0;
    const indiceSeveridadeDano = totalAtivoFipeSinistro > 0 ? totalSinistro / totalAtivoFipeSinistro : NaN;

    const margemManutencao = faturamentoTotal > 0 ? 1 - (totalCustoLiqMan / faturamentoTotal) : 0;
    const impactoManutencao = faturamentoTotal > 0 ? totalCustoLiqMan / faturamentoTotal : 0;
    const impactoSinistro = faturamentoTotal > 0 ? totalCustoLiqSin / faturamentoTotal : 0;

    if (activeTab === 'previsto') {
      return [
        { label: 'Total Previsto', value: fmtBRL(totalPrevisto), sub: 'Soma do custo previsto', icon: Target, color: 'text-amber-600' },
        { label: 'Total Realizado', value: fmtBRLZero(totalRealizado), sub: 'Soma do custo realizado', icon: Wrench, color: 'text-rose-600' },
        { label: 'Diferença (DIF)', value: fmtBRL(totalDifPrevReal), sub: 'Previsto - Realizado', icon: BarChart3, color: totalDifPrevReal >= 0 ? 'text-emerald-600' : 'text-rose-600' },
        { label: '% Desvio', value: fmtPct(pctDesvioPrevReal), sub: '(Realizado / Previsto) - 1', icon: AlertTriangle, color: pctDesvioPrevReal > 0 ? 'text-rose-600' : 'text-emerald-600' },
        { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(activeTab)), sub: 'Diferença negativa ou desvio acima do previsto', icon: ShieldAlert, color: 'text-red-600' },
      ];
    }

    if (activeTab === 'manutencao') {
      return [
        { label: 'Custo Bruto', value: fmtBRL(totalManutencao), sub: 'Soma de manutenção', icon: Wrench, color: 'text-rose-600' },
        { label: 'Total Reembolsado', value: fmtBRL(totalReembMan), sub: 'Recuperado em manutenção', icon: ShieldAlert, color: 'text-emerald-600' },
        { label: 'Custo Líquido', value: fmtBRL(totalCustoLiqMan), sub: 'Bruto - Reembolsos', icon: DollarSign, color: 'text-indigo-600' },
        { label: '% Recuperação', value: fmtPct(pctRecuperacaoMan), sub: 'Reembolso / Custo Bruto', icon: Activity, color: 'text-blue-600' },
        { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(activeTab)), sub: 'Custo líquido acima de zero', icon: ShieldAlert, color: 'text-red-600' },
      ];
    }

    if (activeTab === 'sinistro') {
      return [
        { label: 'Custo Sinistro', value: fmtBRL(totalSinistro), sub: 'Soma de sinistros', icon: ShieldAlert, color: 'text-rose-600' },
        { label: 'Reembolso Sinistro', value: fmtBRLZero(totalReembSin), sub: 'Seguradora + terceiro', icon: DollarSign, color: 'text-emerald-600' },
        { label: 'Custo Líquido Sinistro', value: fmtBRLZero(totalCustoLiqSin), sub: 'Sinistro - Reembolso', icon: BarChart3, color: 'text-indigo-600' },
        { label: '% Recuperação', value: fmtPct(pctRecuperacaoSin), sub: 'Reembolso / Sinistro', icon: Activity, color: 'text-blue-600' },
        { label: 'Sinistralidade Op.', value: fmtPct(sinistralidadeOperacional), sub: '(Custos sinistro / faturamento bruto)', icon: AlertTriangle, color: sinistralidadeOperacional > 0.7 ? 'text-rose-600' : sinistralidadeOperacional > 0.65 ? 'text-amber-600' : 'text-emerald-600' },
        { label: 'Índice de Frequência', value: fmtPct(indiceFrequenciaSinistro), sub: 'Nº sinistros / nº veículos', icon: Gauge, color: 'text-sky-600' },
        { label: 'Gravidade Média', value: fmtBRLZero(gravidadeMediaSinistro), sub: 'Custo total de sinistros / nº sinistros', icon: BarChart3, color: 'text-indigo-600' },
        { label: 'Índice Severidade Dano', value: isFinite(indiceSeveridadeDano) ? fmtPct(indiceSeveridadeDano) : 'N/D', sub: totalAtivoFipeSinistro > 0 ? 'Custos de sinistro / valor FIPE da frota' : 'Sem base FIPE no dataset', icon: AlertTriangle, color: isFinite(indiceSeveridadeDano) && indiceSeveridadeDano > 0.15 ? 'text-rose-600' : isFinite(indiceSeveridadeDano) && indiceSeveridadeDano > 0.10 ? 'text-amber-600' : 'text-emerald-600' },
        { label: 'Sinistralidade (Reembolso)', value: isFinite(sinistralidadeReembolso) ? fmtPct(sinistralidadeReembolso) : 'N/D', sub: totalReembSin > 0 ? 'Custos de sinistro / reembolso de sinistro' : 'Sem base de reembolso no dataset', icon: ShieldAlert, color: isFinite(sinistralidadeReembolso) && sinistralidadeReembolso > 0.7 ? 'text-rose-600' : isFinite(sinistralidadeReembolso) && sinistralidadeReembolso > 0.65 ? 'text-amber-600' : 'text-emerald-600' },
        { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(activeTab)), sub: 'Custo líquido acima de zero', icon: ShieldAlert, color: 'text-red-600' },
      ];
    }

    if (activeTab === 'mansin') {
      return [
        { label: 'Custo Total (M+S)', value: fmtBRL(totalManSin), sub: 'Manutenção + sinistro', icon: BarChart3, color: 'text-rose-600' },
        { label: 'Total Reembolsado', value: fmtBRL(totalReembManSin), sub: 'Reembolso man + sinistro', icon: ShieldAlert, color: 'text-emerald-600' },
        { label: 'Custo Líquido Total', value: fmtBRL(custoLiqTotalManSin), sub: 'Custo total - reembolsos', icon: DollarSign, color: 'text-indigo-600' },
        { label: 'Ticket Médio Total', value: fmtBRL(ticketMedioTotal), sub: 'Custo total / (OS + sinistros)', icon: Gauge, color: 'text-blue-600' },
        { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(activeTab)), sub: 'Custo líquido consolidado acima de zero', icon: ShieldAlert, color: 'text-red-600' },
      ];
    }

    if (activeTab === 'faturamento') {
      return [
        { label: 'Faturamento Total', value: fmtBRL(faturamentoTotal), sub: 'Receita consolidada', icon: DollarSign, color: 'text-emerald-600' },
        { label: 'Margem Manutenção', value: fmtPct(margemManutencao), sub: '1 - (Custo líq. man / fat.)', icon: Target, color: margemManutencao < 0 ? 'text-rose-600' : 'text-indigo-600' },
        { label: 'Impacto Manutenção', value: fmtPct(impactoManutencao), sub: '% do faturamento em man. líquida', icon: Wrench, color: impactoManutencao > fatPctAlertThreshold ? 'text-rose-600' : 'text-emerald-600' },
        { label: 'Impacto Sinistro', value: fmtPct(impactoSinistro), sub: '% do faturamento em sinistro líquido', icon: ShieldAlert, color: impactoSinistro > fatPctAlertThreshold ? 'text-rose-600' : 'text-emerald-600' },
        { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(activeTab)), sub: 'Indicadores acima do limite configurado', icon: AlertTriangle, color: 'text-red-600' },
      ];
    }

    return [
      { label: 'Passagens Realizadas', value: fmtNum(totalPassagens), sub: `Média ${mediaPassagens.toFixed(1)} por veículo`, icon: Activity, color: 'text-blue-600' },
      { label: 'Passagem Prevista', value: fmtNominal(Math.round(totalPassagemPrevista * 10) / 10), sub: `Ref. ${fmtNum(kmDivisor)} km/p`, icon: Target, color: 'text-indigo-600' },
      { label: 'Veículos Críticos', value: fmtNum(veiculosCriticos), sub: `Dif. > ${fmtNum(passagemDiffAlertThreshold)} ou % > ${fmtPct(passagemPctAlertThreshold)} da frota filtrada`, icon: AlertTriangle, color: 'text-rose-600' },
      { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(activeTab)), sub: 'Itens destacados em vermelho na aba atual', icon: ShieldAlert, color: 'text-red-600' },
      { label: 'Rodagem Média', value: fmtNum(Math.round(rodagemMedia)), sub: 'Média mensal por veículo', icon: Gauge, color: 'text-blue-600' },
    ];
  }, [activeTab, displayRows, kmDivisor, fatPctAlertThreshold, passagemDiffAlertThreshold, passagemPctAlertThreshold]);

  const getTabColsForTab = (tab: TabKey, years: number[], includeYearDetail = true) => {
    const cols: ColDef[] = [];
    if (tab === 'resumo' || tab === 'listagemCto') return cols;
    if (tab === 'passagem') {
      if (includeYearDetail) years.forEach(y => cols.push({ key:`pass_${y}`, label:`Pass ${y}`, fmt:r=>fmtNum(r.years[y].pass), align:'right', w:80, sortGetter: r=>r.years[y].pass }));
      cols.push(
        { key:'passagemTotal',   label:'Total',       fmt:r=>fmtNum(r.passagemTotal), align:'right', w:72, sortGetter: r=>r.passagemTotal },
        { key:'passagemIdeal',   label:'Ideal',       fmt:r=>r.passagemIdeal.toFixed(0), align:'right', w:72, sortGetter: r=>r.passagemIdeal },
        { key:'diferencaPassagem',label:'Diferença',  fmt:r=>r.diferencaPassagem.toFixed(0), cls:r=>clrPositiveThreshold(r.diferencaPassagem, passagemDiffAlertThreshold), align:'right', w:80, sortGetter: r=>r.diferencaPassagem },
        { key:'pctPassagem',     label:'% Passagem',  fmt:r=>fmtPct(r.pctPassagem), cls:r=>clrPositiveThreshold(r.pctPassagem, passagemPctAlertThreshold), align:'right', w:90, sortGetter: r=>r.pctPassagem },
        { key:'rodagemMedia',    label:'Rod Média/Mês', fmt:r=>fmtNum(r.rodagemMedia), cls: r=> (Number.isFinite(r.rodagemMedia) && Number.isFinite(r.franquiaBanco) && r.franquiaBanco>0 && r.rodagemMedia > r.franquiaBanco) ? 'text-red-600 font-medium' : 'text-slate-700', align:'right', w:95, sortGetter: r=>r.rodagemMedia },
        { key:'franquiaBanco',    label:'Franquia Contratada', fmt:r=>fmtNum(r.franquiaBanco), align:'right', w:120, sortGetter: r=>r.franquiaBanco },
        { key:'dataInicial',     label:'Início Contrato', fmt:r=>r.dataInicial ? new Date(r.dataInicial).toLocaleDateString('pt-BR') : '—', align:'left', w:110, sortGetter: r=>r.dataInicial },
        { key:'vencimentoContrato',label:'Vencimento',fmt:r=>r.vencimentoContrato, align:'left', w:100, sortGetter: r=>r.vencimentoContrato },
        { key:'mesesRestantesContrato',label:'Prazo Rest',fmt:r=>{
            const days = Number.isFinite(r.prazoRestDays) ? r.prazoRestDays : NaN;
            if (!isFinite(days)) return '—';
            if (days < 0) return `${Math.abs(days)} dias`;
            if (days < 90) return `${days} dias`;
            return `${r.mesesRestantesContrato} meses`;
          }, cls: r=> (Number.isFinite(r.prazoRestDays) && r.prazoRestDays<0) ? 'text-red-600 font-medium' : 'text-slate-700', align:'right', w:92, sortGetter: r=>r.mesesRestantesContrato },
        { key:'kmEstimadoFimContrato',label:'KM Est. Fim',fmt:r=>r.kmEstimadoFimContrato>0?r.kmEstimadoFimContrato.toLocaleString('pt-BR'):'—', align:'right', w:110, sortGetter: r=>r.kmEstimadoFimContrato },
      );
    } else if (tab === 'previsto') {
      cols.push(
        { key:'custoManPrevisto', label:'Previsto',      fmt:r=>fmtBRL(r.custoManPrevisto),   align:'right', w:120, sortGetter: r=>r.custoManPrevisto },
        { key:'custoManRealizado',label:'Realizado',     fmt:r=>fmtBRLZero(r.custoManRealizado),  cls:r=>clrV(r.difManPrevReal), align:'right', w:120, sortGetter: r=>r.custoManRealizado },
        { key:'difManPrevReal',   label:'DIF',           fmt:r=>fmtBRL(r.difManPrevReal),     cls:r=>clrV(r.difManPrevReal), align:'right', w:120, sortGetter: r=>r.difManPrevReal },
        { key:'pctDifManPrevReal',label:'%DIF',          fmt:r=>fmtPct(r.pctDifManPrevReal),  cls:r=>clrP(r.pctDifManPrevReal, false), align:'right', w:80, sortGetter: r=>r.pctDifManPrevReal },
        { key:'custoManLiquido',  label:'Custo Man Líq', fmt:r=>fmtBRLZero(r.custoManLiquido), align:'right', w:120, sortGetter: r=>r.custoManLiquido },
        { key:'difCustoManLiq',   label:'Dif Liq',       fmt:r=>fmtBRL(r.difCustoManLiq),    align:'right', w:120, sortGetter: r=>r.difCustoManLiq },
        { key:'pctDifCustoManLiq',label:'%Dif Liq',      fmt:r=>fmtPct(r.pctDifCustoManLiq),  cls:r=>clrP(r.pctDifCustoManLiq, false), align:'right', w:80, sortGetter: r=>r.pctDifCustoManLiq }
      );
    } else if (tab === 'manutencao') {
      cols.push({ key:'passagemTotal',  label:'Pass. Realizada', fmt:r=>fmtNum(r.passagemTotal), align:'right', w:92, sortGetter: r=>r.passagemTotal });
      if (includeYearDetail) years.forEach(y => cols.push({ key:`man_${y}`, label:`Man ${y}`, fmt:r=>fmtBRL(r.years[y].man), cls:r=>clrV(r.years[y].man, false), align:'right', w:110, sortGetter: r=>r.years[y].man }));
      cols.push({ key:'totalManutencao',label:'Total Man', fmt:r=>fmtBRL(r.totalManutencao),cls:r=>clrV(r.totalManutencao, false), align:'right', w:110, sortGetter: r=>r.totalManutencao });
      cols.push({ key:'ticketMedio',    label:'Ticket Médio', fmt:r=>fmtBRL(r.ticketMedio),    align:'right', w:110, sortGetter: r=>r.ticketMedio });
      cols.push({ key:'custoKmMan',     label:'Custo/KM',     fmt:r=>fmtKM2(r.custoKmMan),      align:'right', w:90, sortGetter: r=>r.custoKmMan });
      
      if (includeYearDetail) years.forEach(y => cols.push({ key:`reembMan_${y}`, label:`Reemb Man ${y}`, fmt:r=>fmtBRL(r.years[y].reembMan), align:'right', w:110, sortGetter: r=>r.years[y].reembMan }));
      cols.push({ key:'totalReembMan',  label:'Total Reemb',  fmt:r=>fmtBRL(r.totalReembMan),  align:'right', w:110, sortGetter: r=>r.totalReembMan });
      
      if (includeYearDetail) years.forEach(y => cols.push({ key:`difReembMan_${y}`, label:`Dif Reemb ${y}`, fmt:r=>fmtBRL(r.years[y].man - r.years[y].reembMan), cls:r=>clrV(r.years[y].man - r.years[y].reembMan, false), align:'right', w:110, sortGetter: r=>r.years[y].man - r.years[y].reembMan }));
      cols.push({ key:'custoLiqMan',    label:'Custo Líq Man',fmt:r=>fmtBRL(r.custoLiqMan),   align:'right', w:120, sortGetter: r=>r.custoLiqMan });
      cols.push({ key:'pctReembolsadoMan',label:'% Reemb Man',fmt:r=>fmtPct(r.pctReembolsadoMan), align:'right', w:90, sortGetter: r=>r.pctReembolsadoMan });
      cols.push({ key:'custoKmLiqMan',  label:'Custo KM Líq', fmt:r=>fmtKM2(r.custoKmLiqMan),  align:'right', w:100, sortGetter: r=>r.custoKmLiqMan });
    } else if (tab === 'sinistro') {
      if (includeYearDetail) years.forEach(y => cols.push({ key:`sin_${y}`, label:`Sin ${y}`, fmt:r=>fmtBRL(r.years[y].sin), cls:r=>clrV(r.years[y].sin, false), align:'right', w:110, sortGetter: r=>r.years[y].sin }));
      cols.push({ key:'totalSinistro',   label:'Total Sin',     fmt:r=>fmtBRL(r.totalSinistro),   cls:r=>clrV(r.totalSinistro, false), align:'right', w:110, sortGetter: r=>r.totalSinistro });
      
      if (includeYearDetail) years.forEach(y => cols.push({ key:`reembSin_${y}`, label:`Reemb Sin ${y}`, fmt:r=>fmtBRLZero(r.years[y].reembSin), align:'right', w:120, sortGetter: r=>r.years[y].reembSin }));
      cols.push({ key:'totalReembSin',   label:'Total Reemb Sin',fmt:r=>fmtBRLZero(r.totalReembSin),  align:'right', w:120, sortGetter: r=>r.totalReembSin });
      
      if (includeYearDetail) years.forEach(y => cols.push({ key:`difReembSin_${y}`, label:`Dif Reemb ${y}`, fmt:r=>fmtBRL(r.years[y].sin - r.years[y].reembSin), cls:r=>clrV(r.years[y].sin - r.years[y].reembSin, false), align:'right', w:110, sortGetter: r=>r.years[y].sin - r.years[y].reembSin }));
      cols.push({ key:'custoLiqSin',     label:'Custo Líq Sin', fmt:r=>fmtBRLZero(r.custoLiqSin), cls:r=>clrV(r.custoLiqSin, false), align:'right', w:120, sortGetter: r=>r.custoLiqSin });
      cols.push({ key:'pctReembolsadoSin',label:'% Reemb Sin',  fmt:r=>fmtPct(r.pctReembolsadoSin), align:'right', w:95, sortGetter: r=>r.pctReembolsadoSin });
      cols.push({ key:'qtdSinistros',     label:'Qt. Sinistros', fmt:r=>fmtNum(r.qtdSinistros), align:'right', w:95, sortGetter: r=>r.qtdSinistros });
      cols.push({ key:'gravidadeMediaSin',label:'Gravidade Média', fmt:r=>{
        const qtd = Number(r.qtdSinistros) || 0;
        return qtd > 0 ? fmtBRLZero((Number(r.totalSinistro) || 0) / qtd) : '—';
      }, align:'right', w:125, sortGetter: r=>{
        const qtd = Number(r.qtdSinistros) || 0;
        return qtd > 0 ? (Number(r.totalSinistro) || 0) / qtd : 0;
      } });
      cols.push({ key:'sinistralidadeOperacional', label:'Sinistralidade Op.', fmt:r=>{
        const base = Number(r.faturamentoTotal) || 0;
        const val = base > 0 ? (Number(r.totalSinistro) || 0) / base : 0;
        return fmtPct(val);
      }, cls:r=>{
        const base = Number(r.faturamentoTotal) || 0;
        const val = base > 0 ? (Number(r.totalSinistro) || 0) / base : 0;
        return clrPctThreshold(val, 0.70);
      }, align:'right', w:130, sortGetter: r=>{
        const base = Number(r.faturamentoTotal) || 0;
        return base > 0 ? (Number(r.totalSinistro) || 0) / base : 0;
      } });
      cols.push({ key:'sinistralidadeReembolso', label:'Sinistralidade (Reembolso)', fmt:r=>{
        const reembolso = Number(r.totalReembSin) || 0;
        if (!(reembolso > 0)) return 'N/D';
        return fmtPct((Number(r.totalSinistro) || 0) / reembolso);
      }, align:'right', w:150, sortGetter: r=>{
        const reembolso = Number(r.totalReembSin) || 0;
        return reembolso > 0 ? (Number(r.totalSinistro) || 0) / reembolso : -1;
      } });
      cols.push({ key:'indiceSeveridadeDano', label:'Severidade Dano', fmt:r=>{
        const base = Number(r.valorVeiculoFipe) || 0;
        if (!(base > 0)) return 'N/D';
        return fmtPct((Number(r.totalSinistro) || 0) / base);
      }, cls:r=>{
        const base = Number(r.valorVeiculoFipe) || 0;
        const val = base > 0 ? (Number(r.totalSinistro) || 0) / base : NaN;
        if (!isFinite(val) || isNaN(val) || val === 0) return 'text-slate-400';
        return val > 0.15 ? 'text-red-600 font-medium' : val > 0.10 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium';
      }, align:'right', w:130, sortGetter: r=>{
        const base = Number(r.valorVeiculoFipe) || 0;
        return base > 0 ? (Number(r.totalSinistro) || 0) / base : -1;
      } });
    } else if (tab === 'mansin') {
      if (includeYearDetail) years.forEach(y => cols.push({ key:`manSin_${y}`, label:`Man+Sin ${y}`, fmt:r=>fmtBRL(r.years[y].man + r.years[y].sin), cls:r=>clrV(r.years[y].man + r.years[y].sin, false), align:'right', w:120, sortGetter: r=>r.years[y].man + r.years[y].sin }));
      cols.push({ key:'totalManSin',         label:'Total Man+Sin',fmt:r=>fmtBRL(r.totalManSin),cls:r=>clrV(r.totalManSin, false), align:'right', w:130, sortGetter: r=>r.totalManSin });
      cols.push({ key:'pctReembolsadoManSin',label:'% Reemb',     fmt:r=>fmtPct(r.pctReembolsadoManSin), align:'right', w:90, sortGetter: r=>r.pctReembolsadoManSin });
    } else if (tab === 'faturamento') {
      if (includeYearDetail) years.forEach(y => cols.push({ key:`fat_${y}`, label:`Fat ${y}`, fmt:r=>fmtBRL(r.years[y].fat), align:'right', w:120, sortGetter: r=>r.years[y].fat }));
      cols.push({ key:'faturamentoTotal', label:'Fat Total (Realizado)',fmt:r=>fmtBRL(r.faturamentoTotal),align:'right', w:150, sortGetter: r=>r.faturamentoTotal });
      cols.push({ key:'faturamentoPrevisto',label:'Fat Previsto',fmt:r=>fmtBRL(r.faturamentoPrevisto),align:'right', w:130, sortGetter: r=>r.faturamentoPrevisto });
      cols.push({ key:'diferencaFaturamento',label:'Diferença',fmt:r=>fmtBRL(r.diferencaFaturamento),cls:r=>clrV(r.diferencaFaturamento, true),align:'right', w:120, sortGetter: r=>r.diferencaFaturamento });
      cols.push({ key:'projecaoFaturamento',label:'Projeção (Ult. Preço)',fmt:r=>fmtBRL(r.projecaoFaturamento),align:'right', w:140, sortGetter: r=>r.projecaoFaturamento });
      cols.push({ key:'pctManFat',        label:'% Man/Fat',      fmt:r=>fmtPct(r.pctManFat),        cls:r=>clrPctThreshold(r.pctManFat, fatPctAlertThreshold), align:'right', w:90, sortGetter: r=>r.pctManFat });
      cols.push({ key:'pctCustoLiqManFat',label:'% Liq Man/Fat',  fmt:r=>fmtPct(r.pctCustoLiqManFat),cls:r=>clrPctThreshold(r.pctCustoLiqManFat, fatPctAlertThreshold), align:'right', w:100, sortGetter: r=>r.pctCustoLiqManFat });
      cols.push({ key:'pctSinFat',        label:'% Sin/Fat',      fmt:r=>fmtPct(r.pctSinFat),        cls:r=>clrPctThreshold(r.pctSinFat, fatPctAlertThreshold), align:'right', w:90, sortGetter: r=>r.pctSinFat });
      cols.push({ key:'pctCustoLiqSinFat',label:'% Liq Sin/Fat',  fmt:r=>fmtPct(r.pctCustoLiqSinFat),cls:r=>clrPctThreshold(r.pctCustoLiqSinFat, fatPctAlertThreshold), align:'right', w:100, sortGetter: r=>r.pctCustoLiqSinFat });
      cols.push({ key:'pctManSinFat',     label:'% Man+Sin/Fat',  fmt:r=>fmtPct(r.pctManSinFat),     cls:r=>clrPctThreshold(r.pctManSinFat, fatPctAlertThreshold), align:'right', w:105, sortGetter: r=>r.pctManSinFat });
    }
    return cols;
  };

  const tabHasYearDetail = (tab: TabKey) => tab !== 'previsto' && tab !== 'resumo' && tab !== 'listagemCto';

  // Build dynamic columns
  const tabCols = useMemo(
    () => getTabColsForTab(activeTab, dynYears, tabHasYearDetail(activeTab) ? !!showYearDetailByTab[activeTab] : true),
    [activeTab, dynYears, fatPctAlertThreshold, showYearDetailByTab]
  );

  const groupColWidth = 120;
  const clienteColWidth = groupColWidth;

  const allCols = useMemo(() => {
    const idColsAdjusted = ID_COLS.map(col => {
      if (col.key === 'cliente') return { ...col, w: clienteColWidth };
      if (col.key === 'modelo') return { ...col, w: 240 };
      if (col.key === 'grupo') return { ...col, w: groupColWidth };
      return col;
    });
    return [...idColsAdjusted, ...tabCols];
  }, [tabCols, clienteColWidth, groupColWidth]);

  // leftOffsets removed — sticky columns disabled (user requested)

  const textEllipsisCols = useMemo(
    () => new Set(['cliente', 'contrato', 'placa', 'modelo', 'grupo', 'vencimentoContrato']),
    []
  );

  const tableMinWidth = useMemo(() => {
    return allCols.reduce((sum, col) => {
      const base = col.w || 90;
      const adjusted = col.align === 'right' ? Math.max(base, 108) : base;
      return sum + adjusted;
    }, 0);
  }, [allCols]);

  // Totais das colunas (quando compatível)
  const colTotals = useMemo(() => {
    const totals: Record<string, number | null> = {};
    const isSummableKey = (k: string) => {
      if (!k) return false;
      const kk = k.toLowerCase();
      // don't sum percentages, labels, ids, text columns
      if (kk.includes('indice') || kk.includes('vencimento') || kk.includes('contrato') || kk.includes('cliente') || kk.includes('placa') || kk.includes('modelo') || kk.includes('grupo') || kk.includes('idade') || kk.includes('odometro')) return false;
      // rodagem/media and ideal/difference are not summable
      if (kk.includes('rodagem') || kk.includes('ideal') || kk.includes('diferenca')) return false;
      return true;
    };

    for (const col of allCols) {
      const kk = String(col.key).toLowerCase();
      // percentages: compute mean (display as percentage via fmtPct)
      if (kk.includes('pct')) {
        let sum = 0;
        let count = 0;
        for (const r of displayRows) {
          let v: any = undefined;
          if (col.sortGetter) {
            try { v = col.sortGetter(r as any); } catch (e) { v = undefined; }
          } else {
            v = (r as any)[col.key];
          }
          const n = Number(v);
          if (isFinite(n)) { sum += n; count++; }
        }
        totals[col.key] = count > 0 ? sum / count : null;
        continue;
      }

      // idade (months): compute mean and round to integer (no decimal casas)
      if (kk.includes('idade')) {
        let sum = 0;
        let count = 0;
        for (const r of displayRows) {
          const v = (r as any)[col.key];
          const n = Number(v);
          if (isFinite(n)) { sum += n; count++; }
        }
        totals[col.key] = count > 0 ? Math.round(sum / count) : null;
        continue;
      }

      if (!isSummableKey(col.key)) {
        totals[col.key] = null;
        continue;
      }

      let sum = 0;
      let found = false;
      for (const r of displayRows) {
        let v: any = undefined;
        if (col.sortGetter) {
          try { v = col.sortGetter(r as any); } catch (e) { v = undefined; }
        } else {
          v = (r as any)[col.key];
        }
        const n = Number(v);
        if (isFinite(n)) { sum += n; found = true; }
      }
      totals[col.key] = found ? sum : null;
    }
    return totals;
  }, [displayRows, allCols]);

  const handleSort = (k:string) => { if(k===sortKey) setSortDir(d=>d==='asc'?'desc':'asc'); else{ setSortKey(k); setSortDir('asc'); } };
  const sortIcon   = (k:string) => sortKey===k?(sortDir==='asc'?' ↑':' ↓'):'';
  const handleResumoDetailSort = (k:string) => {
    if (k === resumoDetailSortKey) {
      setResumoDetailSortDir(d => d === 'asc' ? 'desc' : 'asc');
      return;
    }
    setResumoDetailSortKey(k);
    setResumoDetailSortDir('asc');
  };
  const resumoDetailSortIcon = (k:string) => resumoDetailSortKey===k?(resumoDetailSortDir==='asc'?' ↑':' ↓'):' ↕';

  const getResumoValueForKey = (key: string, item: any) => {
    const r = item.row as VehicleRow;
    switch (key) {
      case 'placa': return String(r.placa || '');
      case 'modelo': return String(r.modelo || '');
      case 'sitLoc': return String(item.statusLocacao || '');
      case 'statusResumo': return String(item.statusLabel || '');
      case 'vencimentoContrato': {
        const d = parseDateFlexible(r.vencimentoContrato);
        return d ? d.toLocaleDateString('pt-BR') : '—';
      }
      default: return String((r as any)[key] ?? '');
    }
  };

  const toggleResumoFilterValue = (key:string, value:string) => {
    setResumoFilters(prev => {
      const cur = new Set(prev[key] || []);
      if (cur.has(value)) cur.delete(value); else cur.add(value);
      return { ...prev, [key]: Array.from(cur) };
    });
  };

  const resumoFilterLabel: Record<string, string> = {
    placa: 'Placa',
    modelo: 'Modelo',
    kmAtual: 'KM',
    passagemTotal: 'Pass. Real',
    diferencaPassagem: 'Dif Pass.',
    custoKmManual: 'Custo KM Prec.',
    custoKmMan: 'Custo KM Man.',
    custoKmLiqMan: 'Custo KM Líq.',
    totalReembMan: 'Reembolso Man.',
    custoManRealizado: 'Custo Man Real.',
    difManPrevReal: 'DIF',
    pctDifManPrevReal: '%dif',
    sitLoc: 'Sit. Locação',
    vencimentoContrato: 'Vencimento',
    statusResumo: 'Status',
    motivoStatus: 'Motivo do Status',
  };

  const resumoFilterKeys = ['placa', 'modelo', 'sitLoc', 'vencimentoContrato', 'statusResumo'];

  const toggleResumoFilterPanel = (key: string) => {
    setResumoFilterOpenKey(prev => (prev === key ? null : key));
  };

  const isResumoFilterActive = (key: string) => (resumoFilters[key]?.length || 0) > 0;

  const nowStamp = () => {
    const n = new Date();
    const pad = (v:number) => String(v).padStart(2, '0');
    const dateLabel = `${pad(n.getDate())}/${pad(n.getMonth() + 1)}/${n.getFullYear()}`;
    const timeLabel = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    const fileStamp = `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}_${pad(n.getHours())}${pad(n.getMinutes())}${pad(n.getSeconds())}`;
    return { dateLabel, timeLabel, fileStamp };
  };

  const exportXLSX = (scope: ExportScope = 'all', selectedTab?: TabKey, layout: PrintLayout = 'full') => {
    const stamp = nowStamp();
    const wb = XLSX.utils.book_new();

    const summaryCols = [
      { label: 'CLIENTE', fmt: (r: VehicleRow) => r.cliente },
      { label: 'CTO', fmt: (r: VehicleRow) => r.contrato },
      { label: 'PLACA PRINCIPAL', fmt: (r: VehicleRow) => r.placa },
      { label: 'GRUPO', fmt: (r: VehicleRow) => r.grupo },
      { label: 'MODELO', fmt: (r: VehicleRow) => r.modelo },
      { label: 'KM', fmt: (r: VehicleRow) => (r.kmAtual > 0 ? r.kmAtual.toLocaleString('pt-BR') : '—') },
      { label: 'INDICE KM', fmt: (r: VehicleRow) => r.indiceKm },
      { label: 'IDADE', fmt: (r: VehicleRow) => fmtInt(r.idadeEmMeses) },
      { label: 'PASS. PREVISTA', fmt: (r: VehicleRow) => fmtNominal(r.passagemIdeal) },
      { label: 'PASS. REALIZADA', fmt: (r: VehicleRow) => fmtNominal(r.passagemTotal) },
      { label: 'DIF PASSAGEM', fmt: (r: VehicleRow) => fmtNominal(r.diferencaPassagem) },
      { label: 'CUSTO KM PRECIFICADO', fmt: (r: VehicleRow) => (r.custoKmManual == null ? '—' : fmtBRL(r.custoKmManual)) },
      { label: 'CUSTO KM MANUT.', fmt: (r: VehicleRow) => fmtKM2(r.custoKmMan) },
      { label: 'CUSTO KM LIQ. MANUT.', fmt: (r: VehicleRow) => fmtKM2(r.custoKmLiqMan) },
      { label: 'Custo Man previsto', fmt: (r: VehicleRow) => fmtBRL(r.custoManPrevisto) },
      { label: 'Custo Man realizado', fmt: (r: VehicleRow) => fmtBRLZero(r.custoManRealizado) },
      { label: 'Reembolso Manut.', fmt: (r: VehicleRow) => fmtBRLZero(r.totalReembMan) },
      { label: 'DIF', fmt: (r: VehicleRow) => fmtBRL(r.difManPrevReal) },
      { label: '%dif', fmt: (r: VehicleRow) => fmtPct(r.pctDifManPrevReal) },
      { label: 'VENC. DE CONTRATO', fmt: (r: VehicleRow) => r.vencimentoContrato },
    ];

    const tabsToExport = scope === 'all'
      ? EXPORTABLE_TABS
      : EXPORTABLE_TABS.filter(t => t.key === (selectedTab || activeTab));

    if (layout === 'summary') {
      const rows = displayRows.map(r => Object.fromEntries(summaryCols.map(c => [c.label, c.fmt(r)])));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Resumo');
    } else {
      for (const tab of tabsToExport) {
        const years = getDynYearsForTab(tab.key);
        const cols = [...ID_COLS, ...getTabColsForTab(tab.key, years, true)];
        const rows = displayRows.map(r => Object.fromEntries(cols.map(c => [c.label, c.fmt(r)])));
        const ws = XLSX.utils.json_to_sheet(rows);
        const safeSheetName = tab.label.substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
      }
    }

    const metaRows = [{
      'Gerado em': `${stamp.dateLabel} ${stamp.timeLabel}`,
      'Layout': layout === 'summary' ? 'Versão resumida' : 'Versão completa',
      'Escopo': scope === 'all' ? 'Todas as abas' : `Aba ${selectedTab || activeTab}`,
      'Filtros': [
        filterCliente.length ? `Cliente: ${filterCliente.join(', ')}` : '',
        filterCTO.length ? `CTO: ${filterCTO.join(', ')}` : '',
        filterPlaca.length ? `Placa: ${filterPlaca.join(', ')}` : '',
        filterGrupoModelo.length ? `Grupo/Modelo: ${filterGrupoModelo.join(', ')}` : '',
        filterVencimento.length ? `Vencimento: ${filterVencimento.join(', ')}` : '',
        filterTipoContrato.length ? `Tipo Contrato: ${filterTipoContrato.join(', ')}` : '',
        filterSitCTO.length ? `Sit. Comercial: ${filterSitCTO.join(', ')}` : '',
        filterSitLoc.length ? `Sit. Locação: ${filterSitLoc.join(', ')}` : '',
      ].filter(Boolean).join(' | ') || 'Nenhum',
      'Linhas': displayRows.length,
    }];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metaRows), 'Meta');

    const tabSuffix = scope === 'all' ? 'todas_abas' : (selectedTab || activeTab);
    const layoutSuffix = layout === 'summary' ? 'resumida' : 'completa';
    XLSX.writeFile(wb, `analise_contrato_${tabSuffix}_${layoutSuffix}_${stamp.fileStamp}.xlsx`);
  };

  const exportResumoDetalhadoExcelComCores = () => {
    const table = resumoDetailTableRef.current;
    if (!table) return;

    const clone = table.cloneNode(true) as HTMLTableElement;

    clone.querySelectorAll('button').forEach(btn => {
      const txt = (btn.textContent || '').replace(/[↑↓↕]/g, '').replace(/\s+/g, ' ').trim();
      const span = document.createElement('span');
      span.textContent = txt || ' ';
      btn.replaceWith(span);
    });

    const cssProps = [
      'background-color',
      'color',
      'font-weight',
      'font-size',
      'font-family',
      'text-align',
      'vertical-align',
      'border-top',
      'border-right',
      'border-bottom',
      'border-left',
      'padding',
      'white-space',
    ];

    const sourceCells = table.querySelectorAll('th,td');
    const targetCells = clone.querySelectorAll('th,td');
    const max = Math.min(sourceCells.length, targetCells.length);

    for (let i = 0; i < max; i++) {
      const source = sourceCells[i] as HTMLElement;
      const target = targetCells[i] as HTMLElement;
      const computed = window.getComputedStyle(source);
      const inlineCss = cssProps.map(prop => `${prop}:${computed.getPropertyValue(prop)};`).join('');
      target.setAttribute('style', inlineCss);
    }

    clone.style.borderCollapse = 'collapse';
    clone.style.width = '100%';

    const stamp = nowStamp();
    const safeContrato = String(resumoContratoSelecionado || 'resumo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const html = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">',
      '<head><meta charset="UTF-8" /></head>',
      '<body>',
      `<div style="font-family:Segoe UI, Arial, sans-serif; font-size:12px; margin-bottom:8px; color:#334155;"><strong>Detalhamento - Versao Resumida</strong> | Contrato: ${String(resumoContratoSelecionado || 'Todos')} | Gerado em: ${stamp.dateLabel} ${stamp.timeLabel}</div>`,
      clone.outerHTML,
      '</body></html>',
    ].join('');

    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `detalhamento_resumido_${safeContrato}_${stamp.fileStamp}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printAllTabsPDF = (scope: ExportScope = 'all', selectedTab?: TabKey, layout: PrintLayout = 'full') => {
    const escapeHtml = (value: unknown) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const stamp = nowStamp();

    const filtersApplied = [
      filterCliente.length ? `Cliente: ${filterCliente.join(', ')}` : '',
      filterCTO.length ? `CTO: ${filterCTO.join(', ')}` : '',
      filterPlaca.length ? `Placa: ${filterPlaca.join(', ')}` : '',
      filterGrupoModelo.length ? `Grupo/Modelo: ${filterGrupoModelo.join(', ')}` : '',
      filterVencimento.length ? `Vencimento: ${filterVencimento.join(', ')}` : '',
      filterTipoContrato.length ? `Tipo Contrato: ${filterTipoContrato.join(', ')}` : '',
      filterSitCTO.length ? `Sit. Comercial: ${filterSitCTO.join(', ')}` : '',
      filterSitLoc.length ? `Sit. Locação: ${filterSitLoc.join(', ')}` : '',
    ].filter(Boolean);

    const colorByBgClass: Record<string, string> = {
      'bg-blue-700': '#1d4ed8',
      'bg-amber-700': '#b45309',
      'bg-orange-700': '#c2410c',
      'bg-red-700': '#b91c1c',
      'bg-purple-700': '#7e22ce',
      'bg-teal-700': '#0f766e',
    };

    const getPrintKpisForTab = (tab: TabKey) => {
      let totalPassagens = 0;
      let totalPassagemPrevista = 0;
      let veiculosCriticos = 0;
      let somaRodagemMedia = 0;
      let totalPrevisto = 0;
      let totalRealizado = 0;
      let totalDifPrevReal = 0;
      let totalManutencao = 0;
      let totalReembMan = 0;
      let totalCustoLiqMan = 0;
      let totalSinistro = 0;
      let totalReembSin = 0;
      let totalCustoLiqSin = 0;
      let totalManSin = 0;
      let totalReembManSin = 0;
      let totalEventosManSin = 0;
      let faturamentoTotal = 0;

      for (const row of displayRows) {
        totalPassagens += Number(row.passagemTotal) || 0;
        totalPassagemPrevista += Number(row.passagemIdeal) || 0;
        somaRodagemMedia += Number(row.rodagemMedia) || 0;
        if ((Number(row.diferencaPassagem) || 0) > passagemDiffAlertThreshold || (Number(row.pctPassagem) || 0) > passagemPctAlertThreshold) veiculosCriticos++;

        totalPrevisto += Number(row.custoManPrevisto) || 0;
        totalRealizado += Number(row.custoManRealizado) || 0;
        totalDifPrevReal += Number(row.difManPrevReal) || 0;

        totalManutencao += Number(row.totalManutencao) || 0;
        totalReembMan += Number(row.totalReembMan) || 0;
        totalCustoLiqMan += Number(row.custoLiqMan) || 0;

        totalSinistro += Number(row.totalSinistro) || 0;
        totalReembSin += Number(row.totalReembSin) || 0;
        totalCustoLiqSin += Number(row.custoLiqSin) || 0;

        totalManSin += Number(row.totalManSin) || 0;
        totalReembManSin += (Number(row.totalReembMan) || 0) + (Number(row.totalReembSin) || 0);
        totalEventosManSin += (Number(row.qtdOsManutencao) || 0) + (Number(row.qtdSinistros) || 0);

        faturamentoTotal += Number(row.faturamentoTotal) || 0;
      }

      const totalVeiculos = displayRows.length;
      const pctCriticos = totalVeiculos > 0 ? veiculosCriticos / totalVeiculos : 0;
      const rodagemMedia = totalVeiculos > 0 ? somaRodagemMedia / totalVeiculos : 0;
      const pctDesvioPrevReal = totalPrevisto > 0 ? (totalRealizado / totalPrevisto) - 1 : 0;
      const pctRecuperacaoMan = totalManutencao > 0 ? totalReembMan / totalManutencao : 0;
      const pctRecuperacaoSin = totalSinistro > 0 ? totalReembSin / totalSinistro : 0;
      const custoLiqTotalManSin = totalManSin - totalReembManSin;
      const ticketMedioTotal = totalEventosManSin > 0 ? totalManSin / totalEventosManSin : 0;
      const margemManutencao = faturamentoTotal > 0 ? 1 - (totalCustoLiqMan / faturamentoTotal) : 0;
      const impactoManutencao = faturamentoTotal > 0 ? totalCustoLiqMan / faturamentoTotal : 0;
      const impactoSinistro = faturamentoTotal > 0 ? totalCustoLiqSin / faturamentoTotal : 0;

      if (tab === 'previsto') {
        return [
          { label: 'Previsto', value: fmtBRL(totalPrevisto), cls: 'text-amber-600' },
          { label: 'Realizado', value: fmtBRLZero(totalRealizado), cls: 'text-red-600' },
          { label: 'DIF', value: fmtBRL(totalDifPrevReal), cls: totalDifPrevReal >= 0 ? 'text-emerald-600' : 'text-red-600' },
          { label: '% Desvio', value: fmtPct(pctDesvioPrevReal), cls: pctDesvioPrevReal > 0 ? 'text-red-600' : 'text-emerald-600' },
          { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(tab)), cls: 'text-red-600' },
        ];
      }
      if (tab === 'manutencao') {
        return [
          { label: 'Custo Bruto', value: fmtBRL(totalManutencao), cls: 'text-red-600' },
          { label: 'Reembolsado', value: fmtBRL(totalReembMan), cls: 'text-emerald-600' },
          { label: 'Custo Líquido', value: fmtBRL(totalCustoLiqMan), cls: 'text-red-600' },
          { label: '% Recuperação', value: fmtPct(pctRecuperacaoMan), cls: 'text-blue-600' },
          { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(tab)), cls: 'text-red-600' },
        ];
      }
      if (tab === 'sinistro') {
        return [
          { label: 'Custo Sinistro', value: fmtBRL(totalSinistro), cls: 'text-red-600' },
          { label: 'Reemb. Sinistro', value: fmtBRL(totalReembSin), cls: 'text-emerald-600' },
          { label: 'Custo Líq. Sinistro', value: fmtBRLZero(totalCustoLiqSin), cls: 'text-red-600' },
          { label: '% Recuperação', value: fmtPct(pctRecuperacaoSin), cls: 'text-blue-600' },
          { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(tab)), cls: 'text-red-600' },
        ];
      }
      if (tab === 'mansin') {
        return [
          { label: 'Custo Total', value: fmtBRL(totalManSin), cls: 'text-red-600' },
          { label: 'Total Reembolsado', value: fmtBRL(totalReembManSin), cls: 'text-emerald-600' },
          { label: 'Custo Líquido', value: fmtBRL(custoLiqTotalManSin), cls: 'text-red-600' },
          { label: 'Ticket Médio', value: fmtBRL(ticketMedioTotal), cls: 'text-blue-600' },
          { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(tab)), cls: 'text-red-600' },
        ];
      }
      if (tab === 'faturamento') {
        return [
          { label: 'Faturamento', value: fmtBRL(faturamentoTotal), cls: 'text-teal-600' },
          { label: 'Margem Manutenção', value: fmtPct(margemManutencao), cls: margemManutencao < 0 ? 'text-red-600' : 'text-indigo-600' },
          { label: 'Impacto Man.', value: fmtPct(impactoManutencao), cls: impactoManutencao > fatPctAlertThreshold ? 'text-red-600' : 'text-emerald-600' },
          { label: 'Impacto Sinistro', value: fmtPct(impactoSinistro), cls: impactoSinistro > fatPctAlertThreshold ? 'text-red-600' : 'text-emerald-600' },
          { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(tab)), cls: 'text-red-600' },
        ];
      }
      return [
        { label: 'Passagens', value: fmtNum(totalPassagens), cls: 'text-blue-600' },
        { label: 'Passagem Prevista', value: fmtNominal(Math.round(totalPassagemPrevista * 10) / 10), cls: 'text-indigo-600' },
        { label: 'Críticos', value: `${fmtNum(veiculosCriticos)} (${fmtPct(pctCriticos)})`, cls: 'text-red-600' },
        { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(tab)), cls: 'text-red-600' },
        { label: 'Rodagem Média', value: fmtNum(Math.round(rodagemMedia)), cls: 'text-blue-600' },
      ];
    };

    const getPrintParametersForTab = (tab: TabKey) => {
      if (tab === 'passagem') {
        return `Alerta de diferença: ${fmtNum(passagemDiffAlertThreshold)} passagens | Alerta percentual: ${fmtPct(passagemPctAlertThreshold)}`;
      }
      if (tab === 'faturamento') {
        return `Alerta de faturamento: ${fmtPct(fatPctAlertThreshold)}`;
      }
      return 'Sem parâmetros editáveis específicos';
    };

    const tabsToPrint = scope === 'all'
      ? EXPORTABLE_TABS
      : EXPORTABLE_TABS.filter(t => t.key === (selectedTab || activeTab));

    let sectionsHtml = '';
    if (layout === 'summary') {
      const summaryCols = [
        { label: 'CLIENTE', fmt: (r: VehicleRow) => r.cliente, align: 'txt', cls: '' },
        { label: 'CTO', fmt: (r: VehicleRow) => r.contrato, align: 'txt', cls: '' },
        { label: 'PLACA PRINCIPAL', fmt: (r: VehicleRow) => r.placa, align: 'txt', cls: '' },
        { label: 'GRUPO', fmt: (r: VehicleRow) => r.grupo, align: 'txt', cls: '' },
        { label: 'MODELO', fmt: (r: VehicleRow) => r.modelo, align: 'txt', cls: '' },
        { label: 'KM', fmt: (r: VehicleRow) => (r.kmAtual > 0 ? r.kmAtual.toLocaleString('pt-BR') : '—'), align: 'num', cls: '' },
        { label: 'INDICE KM', fmt: (r: VehicleRow) => r.indiceKm, align: 'txt', cls: '' },
        { label: 'IDADE', fmt: (r: VehicleRow) => fmtNum(r.idadeEmMeses), align: 'num', cls: '' },
        { label: 'PASS. PREVISTA', fmt: (r: VehicleRow) => fmtNominal(r.passagemIdeal), align: 'num', cls: '' },
        { label: 'PASS. REALIZADA', fmt: (r: VehicleRow) => fmtNominal(r.passagemTotal), align: 'num', cls: '' },
        { label: 'DIF PASSAGEM', fmt: (r: VehicleRow) => fmtNominal(r.diferencaPassagem), align: 'num', cls: (r: VehicleRow) => clrPositiveThreshold(r.diferencaPassagem, passagemDiffAlertThreshold) },
        { label: 'CUSTO KM PRECIFICADO', fmt: (r: VehicleRow) => (r.custoKmManual == null ? '—' : fmtBRL(r.custoKmManual)), align: 'num', cls: '' },
        { label: 'CUSTO KM MANUT.', fmt: (r: VehicleRow) => fmtKM2(r.custoKmMan), align: 'num', cls: '' },
        { label: 'CUSTO KM LIQ. MANUT.', fmt: (r: VehicleRow) => fmtKM2(r.custoKmLiqMan), align: 'num', cls: '' },
        { label: 'Custo Man previsto', fmt: (r: VehicleRow) => fmtBRL(r.custoManPrevisto), align: 'num', cls: '' },
        { label: 'Custo Man realizado', fmt: (r: VehicleRow) => fmtBRLZero(r.custoManRealizado), align: 'num', cls: '' },
        { label: 'Reembolso Manut.', fmt: (r: VehicleRow) => fmtBRLZero(r.totalReembMan), align: 'num', cls: '' },
        { label: 'DIF', fmt: (r: VehicleRow) => fmtBRL(r.difManPrevReal), align: 'num', cls: (r: VehicleRow) => clrV(r.difManPrevReal) },
        { label: '%dif', fmt: (r: VehicleRow) => fmtPct(r.pctDifManPrevReal), align: 'num', cls: (r: VehicleRow) => clrP(r.pctDifManPrevReal, false) },
        { label: 'VENC. DE CONTRATO', fmt: (r: VehicleRow) => r.vencimentoContrato, align: 'txt', cls: '' },
      ];

      const header = summaryCols.map(col => `<th class="tab-col">${escapeHtml(col.label)}</th>`).join('');
      const body = displayRows.map((row) => {
        const tds = summaryCols.map((col) => {
          const alignClass = col.align;
          const cls = typeof col.cls === 'function' ? col.cls(row) : col.cls;
          return `<td class="${escapeHtml(`${alignClass} tab-col ${cls || ''}`)}">${escapeHtml(col.fmt(row))}</td>`;
        }).join('');
        return `<tr>${tds}</tr>`;
      }).join('');

      sectionsHtml = `
        <section class="tab-section">
          <h2 style="background:#1f2937">Versão resumida</h2>
          <div class="meta">${escapeHtml(displayRows.length)} linhas filtradas</div>
          <div class="meta">Parâmetros: ${escapeHtml(getPrintParametersForTab(activeTab))}</div>
          <table>
            <thead><tr>${header}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </section>
      `;
    } else {
      sectionsHtml = tabsToPrint.map((tab) => {
        const years = getDynYearsForTab(tab.key);
        const cols = [...ID_COLS, ...getTabColsForTab(tab.key, years, true)];
        const bannerColor = colorByBgClass[tab.hdr] || '#334155';
        const header = cols.map((col, idx) => `<th class="${idx < ID_COLS.length ? 'id-col' : 'tab-col'}">${escapeHtml(col.label)}</th>`).join('');
        const kpis = getPrintKpisForTab(tab.key)
          .map(k => `<div class="kpi-chip"><span class="kpi-label">${escapeHtml(k.label)}</span><span class="kpi-value ${escapeHtml(k.cls)}">${escapeHtml(k.value)}</span></div>`)
          .join('');
        const body = displayRows.map((row) => {
          const tds = cols.map((col, idx) => {
            const colClass = col.cls ? col.cls(row) : '';
            const alignClass = col.align === 'right' ? 'num' : 'txt';
            const zoneClass = idx < ID_COLS.length ? 'id-col' : 'tab-col';
            return `<td class="${escapeHtml(`${alignClass} ${zoneClass} ${colClass}`)}">${escapeHtml(col.fmt(row))}</td>`;
          }).join('');
          return `<tr>${tds}</tr>`;
        }).join('');
        return `
          <section class="tab-section">
            <h2 style="background:${bannerColor}">${escapeHtml(tab.label)}</h2>
            <div class="meta">${escapeHtml(displayRows.length)} linhas filtradas</div>
            <div class="meta">Parâmetros: ${escapeHtml(getPrintParametersForTab(tab.key))}</div>
            <div class="kpis-grid">${kpis}</div>
            <table>
              <thead><tr>${header}</tr></thead>
              <tbody>${body}</tbody>
            </table>
          </section>
        `;
      }).join('');
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const selectedTabLabel = EXPORTABLE_TABS.find(t => t.key === (selectedTab || activeTab))?.label || 'Aba';
    const scopeLabel = scope === 'all' ? 'todas as abas' : `aba ${selectedTabLabel}`;
    const layoutLabel = layout === 'summary' ? 'versão resumida' : 'versão completa';

    const html = `
      <!doctype html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Análise Contrato - ${escapeHtml(scopeLabel)} - ${escapeHtml(layoutLabel)} - ${stamp.fileStamp}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 10px; color: #0f172a; margin: 0; background: #f8fafc; }
          .report-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
          .report-sub { font-size: 11px; color: #475569; margin-bottom: 8px; }
          .filters { font-size: 9px; color: #334155; margin-bottom: 10px; }
          .tab-section { page-break-after: always; padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff; }
          .tab-section:last-child { page-break-after: auto; }
          h2 { margin: 0 0 6px 0; font-size: 12px; color: #ffffff; padding: 6px 8px; border-radius: 6px; }
          .meta { margin-bottom: 6px; color: #64748b; }
          .kpis-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; margin-bottom: 8px; }
          .kpi-chip { border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px 6px; background: #f8fafc; }
          .kpi-label { display:block; color:#64748b; font-size:8px; text-transform: uppercase; }
          .kpi-value { display:block; margin-top:2px; font-size:11px; font-weight:700; }
          table { width: 100%; border-collapse: collapse; table-layout: auto; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          th, td { border: 1px solid #cbd5e1; padding: 3px 4px; white-space: nowrap; }
          th { background: #e2e8f0; font-weight: 700; }
          th.id-col { background: #1e293b; color: #ffffff; }
          th.tab-col { background: #334155; color: #ffffff; }
          .id-col { background: #f8fafc; }
          .tab-col { background: #ffffff; }
          .num { text-align: right; }
          .txt { text-align: left; }
          .font-medium { font-weight: 700; }
          .text-emerald-600 { color: #059669; }
          .text-red-600 { color: #dc2626; }
          .text-amber-600 { color: #d97706; }
          .text-orange-600 { color: #ea580c; }
          .text-indigo-600 { color: #4f46e5; }
          .text-blue-600 { color: #2563eb; }
          .text-teal-600 { color: #0d9488; }
          .text-purple-600 { color: #9333ea; }
          .text-slate-400 { color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="report-title">Análise de Rentabilidade por Contrato</div>
        <div class="report-sub">Relatório ${escapeHtml(scopeLabel)} (${escapeHtml(layoutLabel)}) | Gerado em ${escapeHtml(stamp.dateLabel)} ${escapeHtml(stamp.timeLabel)}</div>
        <div class="filters">${escapeHtml(filtersApplied.length ? `Filtros: ${filtersApplied.join(' | ')}` : 'Filtros: nenhum')}</div>
        ${sectionsHtml}
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const curTab = TABS.find(t=>t.key===activeTab)!;

  const tabHelp: Record<TabKey, string[]> = {
    passagem: [
      'Passagem Total: soma das ocorrências de manutenção por veículo.',
      'Passagem Prevista: KM atual dividido pelo divisor configurado.',
      'Críticos: veículos com diferença positiva entre real e previsto.',
      'Rodagem Média: média mensal baseada em KM atual e idade do veículo.'
    ],
    previsto: [
      'Previsto: custo mensal por grupo x idade do veículo.',
      'Realizado: soma dos custos de manutenção no período.',
      'Diferenças e percentuais mostram desvio entre previsto e realizado.'
    ],
    manutencao: [
      'Mostra custos de manutenção, reembolsos e custo líquido.',
      'Custo/KM considera a quilometragem atual do veículo.'
    ],
    sinistro: [
      'Consolida custos de sinistro e reembolsos (seguradora/terceiro).',
      'Custo Líquido Sinistro = Custo de Sinistro - Reembolso de Sinistro.',
      'Sinistralidade (Reembolso) = (Custo de Sinistro / Reembolso de Sinistro) x 100.',
      'Sinistralidade Operacional = (Custo de Sinistro / Faturamento Bruto) x 100.',
      'Índice de Frequência = (Qtd. de Sinistros / Qtd. de Veículos) x 100.',
      'Gravidade Média = Custo de Sinistro / Qtd. de Sinistros.',
      'Índice de Severidade do Dano = (Custo de Sinistro / Valor FIPE do Veículo) x 100.'
    ],
    mansin: [
      'Agrupa manutenção + sinistro para visão consolidada de risco/custo.',
      'Percentual de reembolso considera ambos os blocos.'
    ],
    faturamento: [
      'Compara custos vs faturamento por veículo.',
      'Percentuais mostram pressão de custo sobre a receita.'
    ],
    resumo: [
      'Exibe um resumo executivo consolidado contrato a contrato (CTO).',
      'Critérios analisados: vencimento de contrato, desvio de passagens, risco financeiro por veículo e impacto líquido sobre faturamento.',
      'Passagem crítica: Diferença de Passagens acima do limite OU %Passagem acima do limite (parâmetros em Configurar Regras por Contrato).',
      'Risco financeiro crítico (não cortesia): veículo com qualquer indicador %/Fat acima do limite (% Man/Fat, % Liq Man/Fat, % Sin/Fat, % Liq Sin/Fat, % Man+Sin/Fat).',
      'Impacto líquido/faturamento: (Custo Líq. Manutenção + Custo Líq. Sinistro) / Faturamento do contrato.',
      'Status Crítico (não cortesia): possui vencidos OU Impacto Liq/Fat acima do limite OU 40%+ dos veículos em risco financeiro crítico.',
      'Status Atenção (não cortesia): sem condição crítica, mas com vencimento em até 90 dias, passagens críticas ou risco financeiro crítico > 0.',
      'Status Saudável: quando nenhuma condição de Atenção/Crítico é acionada.',
      'Regra de Cortesia: desconsidera critérios financeiros de faturamento; usa apenas vencidos, vencimento em 90 dias e passagens críticas.'
    ],
    listagemCto: [
      'Lista todos os CTOs visíveis pelos filtros superiores com ordenação por coluna.',
      'Clique no código CTO para expandir os contratos de locação vinculados e seus indicadores.',
      'A classificação de status usa os mesmos critérios do resumo executivo, aplicados por CTO e também por contrato de locação na expansão.'
    ],
  };

  if (initialLoading) return <AnalyticsLoading message="Carregando contratos e frota..." />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans" style={{ overflowAnchor: 'none' }}>
      <div className="max-w-full px-4 py-5 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/analytics" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Análise de Rentabilidade por Contrato</h1>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                Dados consolidados por contrato de locação
                {heavyLoading && (
                  <span className="inline-flex items-center gap-1 text-amber-600 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" />carregando dados detalhados…
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metadata && <DataUpdateBadge metadata={metadata} />}
            <button onClick={()=>setShowRulesManager(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 shadow-sm transition-colors">
              <Settings2 className="w-3.5 h-3.5" />Configurar Regras por Contrato
            </button>
              <button onClick={()=>setShowExportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors">
                <Download className="w-3.5 h-3.5" />Exportar / Imprimir
            </button>
          </div>
        </div>

          {showExportModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowExportModal(false)}>
              <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200" onClick={e=>e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Exportar e Imprimir</h3>
                    <p className="text-xs text-slate-500">Escolha formato e abas para gerar o arquivo.</p>
                  </div>
                  <button type="button" onClick={()=>setShowExportModal(false)} className="h-8 w-8 rounded-full border border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-2">Formato</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={()=>setExportFormat('pdf')}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${exportFormat === 'pdf' ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span className="inline-flex items-center gap-1.5"><Printer className="w-4 h-4" />PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={()=>setExportFormat('xlsx')}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${exportFormat === 'xlsx' ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span className="inline-flex items-center gap-1.5"><Download className="w-4 h-4" />Excel</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-2">Escopo</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={()=>setExportScope('single')}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${exportScope === 'single' ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                      >
                        Aba específica
                      </button>
                      <button
                        type="button"
                        onClick={()=>setExportScope('all')}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${exportScope === 'all' ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                      >
                        Todas as abas
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-2">{exportFormat === 'pdf' ? 'Layout de impressão' : 'Layout da planilha'}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={()=>setPrintLayout('full')}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${printLayout === 'full' ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                      >
                        Completa
                      </button>
                      <button
                        type="button"
                        onClick={()=>setPrintLayout('summary')}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium ${printLayout === 'summary' ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                      >
                        Versão resumida
                      </button>
                    </div>
                  </div>

                  {exportScope === 'single' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Aba</label>
                      <select
                        value={exportTabChoice}
                        onChange={(e)=>setExportTabChoice(e.target.value as TabKey)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        {EXPORTABLE_TABS.map(tab => (
                          <option key={tab.key} value={tab.key}>{tab.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    A exportação inclui data e hora no arquivo/relatório e respeita os filtros aplicados.
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={()=>setShowExportModal(false)}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tab = exportScope === 'single' ? exportTabChoice : undefined;
                        if (exportFormat === 'pdf') printAllTabsPDF(exportScope, tab, printLayout);
                        else exportXLSX(exportScope, tab, printLayout);
                        setShowExportModal(false);
                      }}
                      className="px-3 py-2 text-xs rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                    >
                      Gerar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {showRulesManager && (
          <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowRulesManager(false)}>
            <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col" onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Gerenciador de Regras Comerciais</h3>
                  <p className="text-xs text-slate-500">Configuração manual de custo por contrato e grupo.</p>
                </div>
                <button type="button" onClick={()=>setShowRulesManager(false)} className="h-9 w-9 rounded-full border border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 overflow-auto">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <div className="text-sm font-semibold text-slate-900">Parâmetros de Passagem</div>
                  <p className="text-xs text-slate-500 mt-0.5">Limites para destacar a diferença da aba passagem. Se a diferença de passagens ou o percentual ultrapassarem o limite, a célula fica vermelha.</p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Diferença acima de passagens</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={passagemDiffAlertInput}
                        onChange={(e)=>setPassagemDiffAlertInput(e.target.value)}
                        placeholder="3"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Percentual acima de %</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={passagemPctAlertInput}
                        onChange={(e)=>setPassagemPctAlertInput(e.target.value)}
                        placeholder="30"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                      />
                    </div>
                    <div className="text-xs text-slate-500">
                      Atual: <span className="font-semibold text-slate-700">{fmtNum(passagemDiffAlertThreshold)} passagens</span> e <span className="font-semibold text-slate-700">{fmtPct(passagemPctAlertThreshold)}</span>
                    </div>
                    <div className="md:col-span-3">
                      <button
                        type="button"
                        onClick={savePassagemAlertThresholds}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-2 text-sm font-medium hover:bg-rose-100"
                      >
                        Salvar parâmetros de passagem
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <div className="text-sm font-semibold text-slate-900">Parâmetros de Faturamento</div>
                  <p className="text-xs text-slate-500 mt-0.5">Limite de alerta para os percentuais da aba faturamento. Acima do limite fica vermelho, abaixo ou igual fica verde.</p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Limite %</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={fatPctAlertInput}
                        onChange={(e)=>setFatPctAlertInput(e.target.value)}
                        placeholder="10"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                      />
                    </div>
                    <div className="text-xs text-slate-500">Atual: <span className="font-semibold text-slate-700">{fmtPct(fatPctAlertThreshold)}</span></div>
                    <div>
                      <button
                        type="button"
                        onClick={saveFatPctAlertThreshold}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 px-4 py-2 text-sm font-medium hover:bg-indigo-100"
                      >
                        Salvar parâmetro
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                  <div className="lg:col-span-4">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">CTO</label>
                    <SearchableSelect
                      options={allContratoOptions}
                      value={ruleFormCto ? [ruleFormCto] : []}
                      onChange={v=>{ setRuleFormCto(v[0] || ''); setRuleFormGrupo(''); }}
                      placeholder="Selecione o CTO"
                      allLabel="Selecione o CTO"
                      multiple={false}
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Grupo</label>
                    <SearchableSelect
                      options={modalGrupoOptions}
                      value={ruleFormGrupo ? [ruleFormGrupo] : []}
                      onChange={v=>setRuleFormGrupo(v[0] || '')}
                      placeholder="Selecione o grupo"
                      allLabel="Selecione o grupo"
                      multiple={false}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Custo/KM</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,08"
                      value={ruleFormCustoKm}
                      onChange={e=>setRuleFormCustoKm(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <button
                      type="button"
                      onClick={()=>void upsertManualRule()}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="w-4 h-4" />{editingRuleId ? 'Atualizar regra' : 'Adicionar regra'}
                    </button>
                    {editingRuleId && (
                      <button
                        type="button"
                        onClick={()=>{ setEditingRuleId(null); setRuleFormCto(''); setRuleFormGrupo(''); setRuleFormCustoKm(''); }}
                        className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-slate-700 px-4 py-2 text-xs font-medium hover:bg-slate-50"
                      >
                        Cancelar edição
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Regras ativas</h4>
                      <p className="text-xs text-slate-500">{matrizCustos.length} regra(s) configurada(s) manualmente.</p>
                      {rulesLoading && <p className="text-xs text-indigo-600 mt-1">Carregando regras do banco...</p>}
                      {rulesError && <p className="text-xs text-rose-600 mt-1">{rulesError}</p>}
                    </div>
                  </div>
                  <div className="overflow-auto max-h-[44vh]">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-slate-100 text-slate-600">
                        <tr>
                          <th className="text-left px-4 py-2 font-semibold">Cliente</th>
                          <th className="text-left px-4 py-2 font-semibold">Contrato</th>
                          <th className="text-left px-4 py-2 font-semibold">Grupo</th>
                          <th className="text-right px-4 py-2 font-semibold">Custo KM</th>
                          <th className="text-right px-4 py-2 font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...matrizCustos].sort((a, b) => `${a.cto}::${a.grupo}`.localeCompare(`${b.cto}::${b.grupo}`)).map((rule) => (
                          <tr key={rule.id} className="border-t border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-700">{clienteByCto.get(rule.cto) || '—'}</td>
                            <td className="px-4 py-2 text-slate-700">{rule.cto}</td>
                            <td className="px-4 py-2 text-slate-700">{rule.grupo}</td>
                            <td className="px-4 py-2 text-right text-slate-900 font-medium">{fmtBRL(rule.custoKm)}</td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={()=>{ setEditingRuleId(rule.id); setRuleFormCto(rule.cto); setRuleFormGrupo(rule.grupo); setRuleFormCustoKm(String(rule.custoKm).replace('.', ',')); }}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 mr-2"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={()=>void deleteManualRule(rule.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />Excluir
                              </button>
                            </td>
                          </tr>
                        ))}
                        {matrizCustos.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">Nenhuma regra manual cadastrada.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Cliente</label>
              <SearchableSelect options={opts.clientes} value={filterCliente} onChange={v=>{ setFilterCliente(v); setFilterCTO([]); setFilterGrupoModelo([]); }} placeholder="Todos" allLabel="Todos" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">CTO (Contrato)</label>
              <SearchableSelect options={opts.ctos} value={filterCTO} onChange={v=>setFilterCTO(v)} placeholder="Todos" allLabel="Todos" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Grupo / Modelo</label>
              <HierarchicalSelect nodes={grupoModeloTree} value={filterGrupoModelo} onChange={v=>setFilterGrupoModelo(v)} placeholder="Todos" allLabel="Todos" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Placa</label>
              <SearchableSelect options={opts.placas} value={filterPlaca} onChange={v=>setFilterPlaca(v)} placeholder="Todas" allLabel="Todas" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Vencimento</label>
              <HierarchicalSelect nodes={vencimentoTree} value={filterVencimento} onChange={v=>setFilterVencimento(v)} placeholder="Todos" allLabel="Todos" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Tipo Contrato</label>
              <SearchableSelect options={opts.tipoContrato} value={filterTipoContrato} onChange={v=>setFilterTipoContrato(v)} placeholder="Todos" allLabel="Todos" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Situação Comercial</label>
              <SearchableSelect options={opts.sitCTO} value={filterSitCTO} onChange={v=>setFilterSitCTO(v)} placeholder="Todas" allLabel="Todas" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Situação Locação</label>
              <SearchableSelect options={opts.sitLoc} value={filterSitLoc} onChange={v=>setFilterSitLoc(v)} placeholder="Todas" allLabel="Todas" />
            </div>
          </div>
          {((filterCTO&&filterCTO.length)||(filterCliente&&filterCliente.length)||(filterPlaca&&filterPlaca.length)||(filterGrupoModelo&&filterGrupoModelo.length)||(filterVencimento&&filterVencimento.length)||(filterTipoContrato&&filterTipoContrato.length)||(filterSitCTO&&filterSitCTO.length)||(filterSitLoc&&filterSitLoc.length)) && (
            <button onClick={()=>{setFilterCTO([]);setFilterCliente([]);setFilterPlaca([]);setFilterGrupoModelo([]);setFilterVencimento([]);setFilterTipoContrato([]);setFilterSitCTO([]);setFilterSitLoc([]);}}
              className="mt-3 inline-block text-xs text-indigo-600 hover:underline">✕ Limpar filtros</button>
          )}
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {[
            {label:'Veículos',        val:kpis.nVeiculos.toLocaleString('pt-BR'), col:'text-indigo-600'},
            {label:'CTOs Locação',    val:kpis.nLocacao.toLocaleString('pt-BR'),  col:'text-blue-600'},
            {label:'CTOs Comerciais', val:kpis.nComercial.toLocaleString('pt-BR'), col:'text-sky-600'},
            {label:'Faturamento',     val:fmtBRL(kpis.fat),  col:'text-teal-600'},
            {label:'Manutenção',      val:fmtBRL(kpis.man),  col:'text-orange-600'},
            {label:'Sinistro',        val:fmtBRL(kpis.sin),  col:'text-red-600'},
            {label:'Man + Sin',       val:fmtBRL(kpis.ms),   col:'text-purple-600'},
            {label:'Total Reemb',     val:fmtBRL(kpis.reemb),col:'text-emerald-600'},
          ].map(k=>(
            <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-medium text-slate-500 mb-1">{k.label}</div>
              <div className={`text-base font-bold ${k.col} truncate`} title={k.val}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 flex-wrap items-center">
          {TABS.map(t=>{
            const Icon=t.icon;
            const isActive=activeTab===t.key;
            return (
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive?`${t.color} text-white shadow-md`:'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={()=>setShowTabHelp(v=>!v)}
            className="ml-auto h-7 w-7 rounded-full border border-slate-300 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 text-xs font-semibold"
            title="Como os números desta aba são calculados"
          >
            ?
          </button>
        </div>

        {showTabHelp && (
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm -mt-2">
            <div className="text-xs font-semibold text-slate-700 mb-1">Como esta aba calcula os números</div>
            <ul className="text-xs text-slate-600 space-y-1">
              {tabHelp[activeTab].map((item, idx) => <li key={idx}>- {item}</li>)}
            </ul>
          </div>
        )}

        {activeTab === 'resumo' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Resumo Executivo por Contrato Comercial</h2>
                <p className="text-xs text-slate-500 mt-0.5">Este resumo usa os filtros superiores da página. Para visão contrato a contrato, selecione um único CTO no filtro CTO (Contrato).</p>
              </div>
              {resumoContratoData && (
                <div className="flex items-center gap-2">
                  {resumoContratoData.isCortesia && (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border border-sky-200 bg-sky-50 text-sky-700">
                      Cortesia
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${statusBadgeClass(resumoContratoData.status)}`}
                  >
                    Status: {resumoContratoData.status === 'Critico' ? 'Critico' : resumoContratoData.status === 'Atencao' ? 'Atencao' : 'Saudavel'}
                  </span>
                </div>
              )}
            </div>

            {filterCTO.length > 1 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Selecione apenas um CTO no filtro superior para gerar o resumo executivo por contrato.
              </div>
            )}

            {!resumoContratoSelecionado && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Use o filtro superior CTO (Contrato) para selecionar um único contrato comercial.
              </div>
            )}

            {resumoContratoData && resumoContratoData.rows.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
                  {[
                    { label: 'CTO', value: resumoContratoData.contrato, cls: 'text-slate-900' },
                    { label: 'Cliente', value: resumoContratoData.clientePrincipal || '—', cls: 'text-slate-900' },
                    { label: 'Veiculos', value: resumoContratoData.totalVeiculos.toLocaleString('pt-BR'), cls: 'text-indigo-600' },
                    { label: 'Placas', value: new Set(resumoContratoData.rows.map(r => canonicalPlate(r.placa || '')).filter(Boolean)).size.toLocaleString('pt-BR'), cls: 'text-indigo-700' },
                    { label: 'KM Medio', value: Math.round(resumoContratoData.kmMedio).toLocaleString('pt-BR'), cls: 'text-sky-600' },
                    { label: 'Faturamento', value: fmtBRL(resumoContratoData.faturamentoTotal), cls: 'text-teal-600' },
                    { label: 'Custo Liquido', value: fmtBRLZero(resumoContratoData.custoTotalLiquido), cls: 'text-rose-600' },
                    { label: '% Recuperacao', value: fmtPct(resumoContratoData.pctRecuperacao), cls: 'text-emerald-600' },
                    { label: 'Impacto Liq/Fat', value: resumoContratoData.isCortesia ? 'N/A' : fmtPct(resumoContratoData.impactoLiqSobreFat), cls: resumoContratoData.isCortesia ? 'text-slate-500' : (resumoContratoData.impactoLiqSobreFat > fatPctAlertThreshold ? 'text-rose-600' : 'text-emerald-600') },
                  ].map(card => (
                    <div key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 min-w-0">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wide">{card.label}</div>
                      <div className={`text-sm font-semibold truncate ${card.cls}`} title={card.value}>{card.value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-200 p-3 bg-white">
                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Visao Geral</div>
                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                      <div>Vigencia: {resumoContratoData.inicioContrato ? resumoContratoData.inicioContrato.toLocaleDateString('pt-BR') : '—'} ate {resumoContratoData.fimContrato ? resumoContratoData.fimContrato.toLocaleDateString('pt-BR') : '—'}</div>
                      <div>Tipos de contrato: {resumoContratoData.tiposContrato.slice(0, 3).join(', ') || 'Sem informacao'}</div>
                      <div>Grupos: {resumoContratoData.grupos.slice(0, 4).join(', ') || 'Sem informacao'}</div>
                      <div>Situacao comercial: {resumoContratoData.sitCTOTop.map(item => `${item.label} (${item.count})`).join(' | ') || 'Sem informacao'}</div>
                      <div>Situacao locacao: {resumoContratoData.sitLocTop.map(item => `${item.label} (${item.count})`).join(' | ') || 'Sem informacao'}</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3 bg-white">
                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Financeiro</div>
                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                      <div>Fat. Realizado: <span className="font-semibold text-slate-900">{fmtBRL(resumoContratoData.faturamentoTotal)}</span></div>
                      <div>Fat. Previsto: <span className="font-semibold text-slate-900">{fmtBRL(resumoContratoData.faturamentoPrevisto)}</span></div>
                      <div>Diferenca Fat.: <span className={`font-semibold ${resumoContratoData.faturamentoTotal - resumoContratoData.faturamentoPrevisto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(resumoContratoData.faturamentoTotal - resumoContratoData.faturamentoPrevisto)}</span></div>
                      <div>Projecao (ult. preco): <span className="font-semibold text-slate-900">{fmtBRL(resumoContratoData.projecaoFaturamento)}</span></div>
                      <div>Impacto bruto/fat.: <span className={`font-semibold ${resumoContratoData.isCortesia ? 'text-slate-500' : (resumoContratoData.impactoBrutoSobreFat > fatPctAlertThreshold ? 'text-rose-600' : 'text-emerald-600')}`}>{resumoContratoData.isCortesia ? 'N/A' : fmtPct(resumoContratoData.impactoBrutoSobreFat)}</span></div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3 bg-white">
                    <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Riscos e Operacao</div>
                    <div className="mt-2 text-xs text-slate-600 space-y-1">
                      <div>Passagens criticas: <span className={`font-semibold ${resumoContratoData.passagemCriticos > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{resumoContratoData.passagemCriticos.toLocaleString('pt-BR')}</span></div>
                      <div>Risco financeiro critico: <span className={`font-semibold ${resumoContratoData.riscoFinanceiroCriticos > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{resumoContratoData.riscoFinanceiroCriticos.toLocaleString('pt-BR')}</span></div>
                      <div>Vencem em 90 dias: <span className={`font-semibold ${resumoContratoData.proximosVencimentos90d > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{resumoContratoData.proximosVencimentos90d.toLocaleString('pt-BR')}</span></div>
                      <div>Vencidos: <span className={`font-semibold ${resumoContratoData.vencidos > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{resumoContratoData.vencidos.toLocaleString('pt-BR')}</span></div>
                      <div>Reembolso total: <span className="font-semibold text-slate-900">{fmtBRL(resumoContratoData.reembolsoTotal)}</span></div>
                      <div>Sinistralidade operacional: <span className={`font-semibold ${resumoContratoData.sinistralidadeOperacional > 0.7 ? 'text-rose-600' : resumoContratoData.sinistralidadeOperacional > 0.65 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmtPct(resumoContratoData.sinistralidadeOperacional)}</span></div>
                      <div>Indice de frequencia: <span className="font-semibold text-slate-900">{fmtPct(resumoContratoData.indiceFrequenciaSinistro)}</span></div>
                      <div>Gravidade media sinistro: <span className="font-semibold text-slate-900">{fmtBRLZero(resumoContratoData.gravidadeMediaSinistro)}</span></div>
                      <div>Indice severidade dano: <span className={`font-semibold ${isFinite(resumoContratoData.indiceSeveridadeDano) && resumoContratoData.indiceSeveridadeDano > 0.15 ? 'text-rose-600' : isFinite(resumoContratoData.indiceSeveridadeDano) && resumoContratoData.indiceSeveridadeDano > 0.10 ? 'text-amber-600' : 'text-emerald-600'}`}>{isFinite(resumoContratoData.indiceSeveridadeDano) ? fmtPct(resumoContratoData.indiceSeveridadeDano) : 'N/D'}</span></div>
                      <div>Sinistralidade (Reembolso): <span className={`font-semibold ${isFinite(resumoContratoData.sinistralidadeReembolso) && resumoContratoData.sinistralidadeReembolso > 0.7 ? 'text-rose-600' : isFinite(resumoContratoData.sinistralidadeReembolso) && resumoContratoData.sinistralidadeReembolso > 0.65 ? 'text-amber-600' : 'text-emerald-600'}`}>{isFinite(resumoContratoData.sinistralidadeReembolso) ? fmtPct(resumoContratoData.sinistralidadeReembolso) : 'N/D'}</span></div>
                    </div>
                  </div>
                </div>

                {/* Top 5 ofensores removido conforme solicitado */}

                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center justify-between gap-2">
                    <span>Detalhamento — Versão Resumida</span>
                    <button
                      type="button"
                      onClick={exportResumoDetalhadoExcelComCores}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium normal-case tracking-normal text-slate-600 hover:bg-slate-100"
                      title="Exportar a tabela atual em formato Excel com as cores da visualização"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Excel com cores
                    </button>
                  </div>
                  <div className="px-3 py-2 border-b border-slate-200 bg-white">
                    {(() => {
                      const rows = resumoContratoData && resumoContratoData.rows ? [...resumoContratoData.rows] : [];
                      const enrichedRows = rows.map(row => {
                        const statusInfo = getResumoLocacaoStatus(row);
                        const statusLabel = statusInfo.status === 'Critico'
                          ? 'Crítico'
                          : statusInfo.status === 'Atencao'
                            ? 'Atenção'
                            : 'Saudável';
                        const vencDate = parseDateFlexible(row.vencimentoContrato);
                        return {
                          row,
                          statusLocacao: String(row.sitLoc || 'Sem informacao'),
                          statusInfo,
                          statusLabel,
                          vencimentoLabel: vencDate ? vencDate.toLocaleDateString('pt-BR') : '—',
                        };
                      });

                      const openKey = resumoFilterOpenKey;
                      const options = openKey
                        ? Array.from(new Set(enrichedRows.map(it => getResumoValueForKey(openKey, it)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
                        : [];
                      const selected = openKey ? (resumoFilters[openKey] || []) : [];
                      const activeFiltersCount = Object.values(resumoFilters).filter(arr => (arr?.length || 0) > 0).length;

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Filtros da tabela</span>
                            {resumoFilterKeys.map(key => {
                              const active = isResumoFilterActive(key);
                              const selectedCount = resumoFilters[key]?.length || 0;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleResumoFilterPanel(key)}
                                  className={`inline-flex items-center rounded-md border px-2 py-1 text-xs ${active ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'} ${resumoFilterOpenKey === key ? 'ring-1 ring-indigo-300' : ''}`}
                                >
                                  {resumoFilterLabel[key] || key}{active ? ` (${selectedCount})` : ''}
                                </button>
                              );
                            })}
                            <input
                              type="text"
                              value={resumoSearchTerm}
                              onChange={(e) => setResumoSearchTerm(e.target.value)}
                              placeholder="Pesquisar placa, modelo, status, motivo..."
                              className="min-w-[250px] flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 placeholder:text-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setResumoFilters({});
                                setResumoFilterOpenKey(null);
                                setResumoSearchTerm('');
                              }}
                              className="ml-auto inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              Limpar filtros{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
                            </button>
                          </div>

                          {openKey && (
                            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="text-xs text-slate-700 font-medium">Filtrar por <span className="font-semibold">{resumoFilterLabel[openKey] || openKey}</span></div>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => setResumoFilters(prev => ({ ...prev, [openKey]: options }))} className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">Selecionar todos</button>
                                  <button type="button" onClick={() => setResumoFilters(prev => ({ ...prev, [openKey]: [] }))} className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">Limpar</button>
                                  <button type="button" onClick={() => setResumoFilterOpenKey(null)} className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50">Fechar</button>
                                </div>
                              </div>
                              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs max-h-32 overflow-auto pr-1">
                                {options.map(val => (
                                  <label key={val} className="inline-flex items-center gap-2">
                                    <input type="checkbox" checked={selected.includes(val)} onChange={() => toggleResumoFilterValue(openKey, val)} />
                                    <span className="truncate max-w-[180px]">{val || '—'}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="overflow-auto max-h-[72vh]">
                    <table ref={resumoDetailTableRef} className="min-w-full text-xs">
                      <thead className="bg-slate-100 text-slate-600">
                        <tr className="sticky top-0 z-20 bg-slate-200 text-slate-700 text-[10px] uppercase tracking-wide">
                          <th colSpan={4} className="px-3 py-1.5 text-center border-b border-slate-300 border-r border-slate-300">Identificação</th>
                          <th colSpan={1} className="px-3 py-1.5 text-center border-b border-slate-300 border-r border-slate-300">Operação</th>
                          <th colSpan={3} className="px-3 py-1.5 text-center border-b border-slate-300 border-r border-slate-300">Passagem</th>
                          <th colSpan={4} className="px-3 py-1.5 text-center border-b border-slate-300 border-r border-slate-300">Custo KM</th>
                          <th colSpan={3} className="px-3 py-1.5 text-center border-b border-slate-300 border-r border-slate-300">Manutenção</th>
                          <th colSpan={8} className="px-3 py-1.5 text-center border-b border-slate-300 border-r border-slate-300">Sinistro</th>
                          <th colSpan={2} className="px-3 py-1.5 text-center border-b border-slate-300 border-r border-slate-300">Desvio Prev. x Real</th>
                          <th colSpan={4} className="px-3 py-1.5 text-center border-b border-slate-300">Status e Prazo</th>
                        </tr>
                        <tr className="sticky top-[27px] z-20 bg-slate-100">
                          <th className="text-left px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('placa')} className="flex items-center gap-1 hover:text-slate-900">Placa {resumoDetailSortIcon('placa')}</button></th>
                          <th className="text-left px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('grupo')} className="flex items-center gap-1 hover:text-slate-900">Grupo {resumoDetailSortIcon('grupo')}</button></th>
                          <th className="text-left px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('modelo')} className="flex items-center gap-1 hover:text-slate-900">Modelo {resumoDetailSortIcon('modelo')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('idadeEmMeses')} className="flex items-center gap-1 justify-end hover:text-slate-900">Idade {resumoDetailSortIcon('idadeEmMeses')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('kmAtual')} className="flex items-center gap-1 justify-end hover:text-slate-900">KM {resumoDetailSortIcon('kmAtual')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('passagemTotal')} className="flex items-center gap-1 justify-end hover:text-slate-900">Pass. Real {resumoDetailSortIcon('passagemTotal')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('passagemIdeal')} className="flex items-center gap-1 justify-end hover:text-slate-900">Pass. Prev. {resumoDetailSortIcon('passagemIdeal')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('diferencaPassagem')} className="flex items-center gap-1 justify-end hover:text-slate-900">Dif Pass. {resumoDetailSortIcon('diferencaPassagem')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('custoKmMan')} className="flex items-center gap-1 justify-end hover:text-slate-900">Custo KM Man. {resumoDetailSortIcon('custoKmMan')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('custoKmManual')} className="flex items-center gap-1 justify-end hover:text-slate-900">Custo KM Prev. {resumoDetailSortIcon('custoKmManual')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('difCustoKm')} className="flex items-center gap-1 justify-end hover:text-slate-900">Dif Custo KM {resumoDetailSortIcon('difCustoKm')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('custoKmLiqMan')} className="flex items-center gap-1 justify-end hover:text-slate-900">Custo KM Líq. {resumoDetailSortIcon('custoKmLiqMan')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('custoManRealizado')} className="flex items-center gap-1 justify-end hover:text-slate-900">Custo Man Real. {resumoDetailSortIcon('custoManRealizado')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('totalReembMan')} className="flex items-center gap-1 justify-end hover:text-slate-900">Reemb. Man. {resumoDetailSortIcon('totalReembMan')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('pctReembolsadoMan')} className="flex items-center gap-1 justify-end hover:text-slate-900">% Reemb Man {resumoDetailSortIcon('pctReembolsadoMan')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('totalSinistro')} className="flex items-center gap-1 justify-end hover:text-slate-900">Sinistro {resumoDetailSortIcon('totalSinistro')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('totalReembSin')} className="flex items-center gap-1 justify-end hover:text-slate-900">Reemb. Sin. {resumoDetailSortIcon('totalReembSin')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('pctReembolsadoSin')} className="flex items-center gap-1 justify-end hover:text-slate-900">% Reembolsável {resumoDetailSortIcon('pctReembolsadoSin')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('pctCustoLiqSinFat')} className="flex items-center gap-1 justify-end hover:text-slate-900">Sin Líq %Fat {resumoDetailSortIcon('pctCustoLiqSinFat')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('sinistralidadeOperacional')} className="flex items-center gap-1 justify-end hover:text-slate-900">Sin Op. {resumoDetailSortIcon('sinistralidadeOperacional')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('indiceFrequenciaSinistro')} className="flex items-center gap-1 justify-end hover:text-slate-900">Índ. Freq. {resumoDetailSortIcon('indiceFrequenciaSinistro')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('gravidadeMediaSinistro')} className="flex items-center gap-1 justify-end hover:text-slate-900">Gravidade {resumoDetailSortIcon('gravidadeMediaSinistro')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('indiceSeveridadeDano')} className="flex items-center gap-1 justify-end hover:text-slate-900">Severidade {resumoDetailSortIcon('indiceSeveridadeDano')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('difManPrevReal')} className="flex items-center gap-1 justify-end hover:text-slate-900">Dif Prev x Real {resumoDetailSortIcon('difManPrevReal')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('pctDifManPrevReal')} className="flex items-center gap-1 justify-end hover:text-slate-900">% Desvio {resumoDetailSortIcon('pctDifManPrevReal')}</button></th>
                          <th className="text-left px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('sitLoc')} className="flex items-center gap-1 hover:text-slate-900">Sit. Locação {resumoDetailSortIcon('sitLoc')}</button></th>
                          <th className="text-left px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('vencimentoContrato')} className="flex items-center gap-1 hover:text-slate-900">Vencimento {resumoDetailSortIcon('vencimentoContrato')}</button></th>
                          <th className="text-left px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('statusResumo')} className="flex items-center gap-1 hover:text-slate-900">Status {resumoDetailSortIcon('statusResumo')}</button></th>
                          <th className="text-left px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('motivoStatus')} className="flex items-center gap-1 hover:text-slate-900">Motivo do Status {resumoDetailSortIcon('motivoStatus')}</button></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const rows = resumoContratoData && resumoContratoData.rows ? [...resumoContratoData.rows] : [];
                          const statusOrder: Record<HealthStatus, number> = { Saudavel: 0, Atencao: 1, Critico: 2 };
                          const enrichedRows = rows.map(row => {
                            const statusInfo = getResumoLocacaoStatus(row);
                            const statusLabel = statusInfo.status === 'Critico'
                              ? 'Crítico'
                              : statusInfo.status === 'Atencao'
                                ? 'Atenção'
                                : 'Saudável';
                            const vencDate = parseDateFlexible(row.vencimentoContrato);
                            return {
                              row,
                              statusLocacao: String(row.sitLoc || 'Sem informacao'),
                              statusInfo,
                              statusLabel,
                              vencimentoLabel: vencDate ? vencDate.toLocaleDateString('pt-BR') : '—',
                            };
                          });

                          const key = resumoDetailSortKey;
                          const dir = resumoDetailSortDir === 'asc' ? 1 : -1;
                          const getter = (item: any) => {
                            const row = item.row as VehicleRow;
                            switch (key) {
                              case 'placa': return row.placa || '';
                              case 'modelo': return row.modelo || '';
                              case 'grupo': return row.grupo || '';
                              case 'kmAtual': return Number(row.kmAtual) || 0;
                              case 'idadeEmMeses': return Number(row.idadeEmMeses) || 0;
                              case 'passagemTotal': return Number(row.passagemTotal) || 0;
                              case 'passagemIdeal': return Number(row.passagemIdeal) || 0;
                              case 'diferencaPassagem': return Number(row.diferencaPassagem) || 0;
                              case 'custoKmManual': return row.custoKmManual == null ? '' : Number(row.custoKmManual) || 0;
                              case 'custoKmMan': return Number(row.custoKmMan) || 0;
                              case 'difCustoKm': return row.custoKmManual == null ? -1 : (Number(row.custoKmMan) || 0) - (Number(row.custoKmManual) || 0);
                              case 'custoKmLiqMan': return Number(row.custoKmLiqMan) || 0;
                              case 'totalReembMan': return Number(row.totalReembMan) || 0;
                              case 'pctReembolsadoMan': return Number(row.pctReembolsadoMan) || 0;
                              case 'custoManRealizado': return Number(row.custoManRealizado) || 0;
                              case 'totalSinistro': return Number(row.totalSinistro) || 0;
                              case 'totalReembSin': return Number(row.totalReembSin) || 0;
                              case 'pctReembolsadoSin': return Number(row.pctReembolsadoSin) || 0;
                              case 'pctCustoLiqSinFat': return Number(row.pctCustoLiqSinFat) || 0;
                              case 'sinistralidadeOperacional': {
                                const base = Number(row.faturamentoTotal) || 0;
                                return base > 0 ? (Number(row.totalSinistro) || 0) / base : -1;
                              }
                              case 'sinistralidadeReembolso': {
                                const base = Number(row.totalReembSin) || 0;
                                return base > 0 ? (Number(row.totalSinistro) || 0) / base : -1;
                              }
                              case 'indiceFrequenciaSinistro': return Number(row.qtdSinistros) || 0;
                              case 'gravidadeMediaSinistro': {
                                const qtd = Number(row.qtdSinistros) || 0;
                                return qtd > 0 ? (Number(row.totalSinistro) || 0) / qtd : -1;
                              }
                              case 'indiceSeveridadeDano': {
                                const base = Number(row.valorVeiculoFipe) || 0;
                                return base > 0 ? (Number(row.totalSinistro) || 0) / base : -1;
                              }
                              case 'difManPrevReal': return Number(row.difManPrevReal) || 0;
                              case 'pctDifManPrevReal': return Number(row.pctDifManPrevReal) || 0;
                              case 'sitLoc': return item.statusLocacao;
                              case 'vencimentoContrato': return parseDateFlexible(row.vencimentoContrato)?.getTime() || 0;
                              case 'statusResumo': return statusOrder[item.statusInfo.status as HealthStatus] ?? 0;
                              case 'motivoStatus': return item.statusInfo.motivo;
                              default: return '';
                            }
                          };
                          enrichedRows.sort((a, b) => {
                            const va = getter(a);
                            const vb = getter(b);
                            if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
                            return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * dir;
                          });

                          const filteredRows = enrichedRows.filter(item => {
                            const search = resumoSearchTerm.trim().toLowerCase();
                            if (search) {
                              const r = item.row as VehicleRow;
                              const joined = [
                                r.placa,
                                r.modelo,
                                r.contrato,
                                item.statusLocacao,
                                item.vencimentoLabel,
                                item.statusLabel,
                                item.statusInfo.motivo,
                              ].map(v => String(v || '').toLowerCase()).join(' ');
                              if (!joined.includes(search)) return false;
                            }
                            for (const k of Object.keys(resumoFilters || {})) {
                              const sel = resumoFilters[k];
                              if (!sel || sel.length === 0) continue;
                              const val = getResumoValueForKey(k, item);
                              if (!sel.includes(val)) return false;
                            }
                            return true;
                          });

                          const rowsElems: JSX.Element[] = [];
                          // calcular totais
                          const totals = filteredRows.reduce((acc, it) => {
                            const r = it.row as VehicleRow;
                            acc.passagemTotal += Number(r.passagemTotal) || 0;
                            acc.passagemIdeal += Number(r.passagemIdeal) || 0;
                            acc.diferencaPassagem += Number(r.diferencaPassagem) || 0;
                            acc.custoKmMan += Number(r.custoKmMan) || 0;
                            acc.custoKmManual += Number(r.custoKmManual) || 0;
                            acc.difCustoKm += (r.custoKmManual == null ? 0 : ((Number(r.custoKmMan) || 0) - (Number(r.custoKmManual) || 0)));
                            acc.custoKmLiqMan += Number(r.custoKmLiqMan) || 0;
                            acc.totalReembMan += Number(r.totalReembMan) || 0;
                            acc.custoManRealizado += Number(r.custoManRealizado) || 0;
                            acc.pctReembolsadoMan += Number(r.pctReembolsadoMan) || 0;
                            acc.totalSinistro += Number(r.totalSinistro) || 0;
                            acc.totalReembSin += Number(r.totalReembSin) || 0;
                            acc.custoLiqSin += Number(r.custoLiqSin) || 0;
                            acc.faturamentoTotal += Number(r.faturamentoTotal) || 0;
                            acc.qtdSinistros += Number(r.qtdSinistros) || 0;
                            acc.valorVeiculoFipe += Number(r.valorVeiculoFipe) || 0;
                            acc.pctReembolsadoSin += Number(r.pctReembolsadoSin) || 0;
                            acc.difManPrevReal += Number(r.difManPrevReal) || 0;
                            acc.pctDifManPrevReal += Number(r.pctDifManPrevReal) || 0;
                            acc.idadeEmMeses += Number(r.idadeEmMeses) || 0;
                            return acc;
                          }, {
                            passagemTotal: 0,
                            passagemIdeal: 0,
                            diferencaPassagem: 0,
                            custoKmMan: 0,
                            custoKmManual: 0,
                            difCustoKm: 0,
                            custoKmLiqMan: 0,
                            totalReembMan: 0,
                            custoManRealizado: 0,
                            pctReembolsadoMan: 0,
                            totalSinistro: 0,
                            totalReembSin: 0,
                            custoLiqSin: 0,
                            faturamentoTotal: 0,
                            qtdSinistros: 0,
                            valorVeiculoFipe: 0,
                            pctReembolsadoSin: 0,
                            difManPrevReal: 0,
                            pctDifManPrevReal: 0,
                            idadeEmMeses: 0,
                          });

                          filteredRows.forEach(item => {
                            const r = item.row as VehicleRow;
                            const status = item.statusInfo.status;
                            const passagemDesvio = (Number(r.diferencaPassagem) || 0) > passagemDiffAlertThreshold || (Number(r.pctPassagem) || 0) > passagemPctAlertThreshold;
                            const manutencaoDesvio = (Number(r.difManPrevReal) || 0) < 0 || (Number(r.pctDifManPrevReal) || 0) > 0;
                            const difCustoKm = r.custoKmManual == null ? NaN : (Number(r.custoKmMan) || 0) - (Number(r.custoKmManual) || 0);
                            const sinistralidadeOperacional = (Number(r.faturamentoTotal) || 0) > 0 ? (Number(r.totalSinistro) || 0) / (Number(r.faturamentoTotal) || 0) : NaN;
                            const indiceFrequenciaSinistro = Number(r.qtdSinistros) || 0;
                            const gravidadeMediaSinistro = indiceFrequenciaSinistro > 0 ? (Number(r.totalSinistro) || 0) / indiceFrequenciaSinistro : NaN;
                            const indiceSeveridadeDano = (Number(r.valorVeiculoFipe) || 0) > 0 ? (Number(r.totalSinistro) || 0) / (Number(r.valorVeiculoFipe) || 0) : NaN;
                            const vencido = Number.isFinite(r.prazoRestDays) && r.prazoRestDays < 0;
                            const vence90d = Number.isFinite(r.prazoRestDays) && r.prazoRestDays >= 0 && r.prazoRestDays <= 90;
                            const placaClass = 'px-3 py-2 font-medium text-slate-800';
                            const modeloClass = 'px-3 py-2 text-slate-600 border-r border-slate-200';
                            const grupoClass = 'px-3 py-2 text-slate-600';
                            const statusClass = status === 'Critico' ? 'text-rose-700 font-semibold' : status === 'Atencao' ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold';
                            const numClass = 'text-slate-700';
                            const desvioClass = 'text-rose-600 font-semibold';
                            const sinLiqFatClass = (Number(r.pctCustoLiqSinFat) || 0) > fatPctAlertThreshold ? desvioClass : numClass;
                            const sinOpClass = !isFinite(sinistralidadeOperacional) || isNaN(sinistralidadeOperacional)
                              ? 'text-slate-400'
                              : sinistralidadeOperacional > 0.7
                                ? desvioClass
                                : sinistralidadeOperacional > 0.65
                                  ? 'text-amber-600 font-semibold'
                                  : numClass;
                            const severidadeClass = !isFinite(indiceSeveridadeDano) || isNaN(indiceSeveridadeDano)
                              ? 'text-slate-400'
                              : indiceSeveridadeDano > 0.15
                                ? desvioClass
                                : indiceSeveridadeDano > 0.10
                                  ? 'text-amber-600 font-semibold'
                                  : numClass;
                            const difCustoKmClass = !isFinite(difCustoKm) || isNaN(difCustoKm)
                              ? 'text-slate-400'
                              : difCustoKm > 0
                                ? desvioClass
                                : 'text-emerald-600 font-semibold';
                            const vencimentoClass = vencido ? 'text-rose-600 font-semibold' : (vence90d ? 'text-amber-600 font-semibold' : 'text-slate-700');
                            rowsElems.push(
                              <tr key={`${r.placa}-${r.contrato}`} className={`border-t border-slate-100 hover:bg-slate-50`}>
                                <td className={placaClass}>{r.placa || '—'}</td>
                                <td className={grupoClass}>{r.grupo || '—'}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtInt(r.idadeEmMeses)}</td>
                                <td className={modeloClass}>{r.modelo || '—'}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{r.kmAtual > 0 ? r.kmAtual.toLocaleString('pt-BR') : '—'}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtNominal(r.passagemTotal)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtNominal(r.passagemIdeal)}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${passagemDesvio ? desvioClass : numClass}`}>{fmtNominal(r.diferencaPassagem)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtKM2(r.custoKmMan)}</td>
                                <td className={`px-3 py-2 text-right ${r.custoKmManual == null ? 'text-slate-400' : numClass}`}>{r.custoKmManual == null ? '—' : fmtKM2(r.custoKmManual)}</td>
                                <td className={`px-3 py-2 text-right ${difCustoKmClass}`}>{isFinite(difCustoKm) ? fmtKM2(difCustoKm) : '—'}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${numClass}`}>{fmtKM2(r.custoKmLiqMan)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtBRLZero(r.custoManRealizado)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtBRLZero(r.totalReembMan)}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${numClass}`}>{fmtPct(r.pctReembolsadoMan)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtBRLZero(r.totalSinistro)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtBRLZero(r.totalReembSin)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtPct(r.pctReembolsadoSin)}</td>
                                <td className={`px-3 py-2 text-right ${sinLiqFatClass}`}>{fmtPct(r.pctCustoLiqSinFat)}</td>
                                <td className={`px-3 py-2 text-right ${sinOpClass}`}>{isFinite(sinistralidadeOperacional) ? fmtPct(sinistralidadeOperacional) : 'N/D'}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtNum(indiceFrequenciaSinistro)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{isFinite(gravidadeMediaSinistro) ? fmtBRLZero(gravidadeMediaSinistro) : 'N/D'}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${severidadeClass}`}>{isFinite(indiceSeveridadeDano) ? fmtPct(indiceSeveridadeDano) : 'N/D'}</td>
                                <td className={`px-3 py-2 text-right ${manutencaoDesvio ? desvioClass : numClass}`}>{fmtBRL(r.difManPrevReal)}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${manutencaoDesvio ? desvioClass : numClass}`}>{fmtPct(r.pctDifManPrevReal)}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-slate-700">{item.statusLocacao}</td>
                                <td className={`px-3 py-2 whitespace-nowrap ${vencimentoClass}`}>{item.vencimentoLabel}</td>
                                <td className={`px-3 py-2 whitespace-nowrap ${statusClass}`}>{item.statusLabel}</td>
                                <td className="px-3 py-2 min-w-[280px] text-slate-700">{item.statusInfo.motivo}</td>
                              </tr>
                            );
                          });

                          const totalPlacasFiltradas = new Set(
                            filteredRows
                              .map(it => canonicalPlate((it.row as VehicleRow).placa || ''))
                              .filter(Boolean)
                          ).size;

                          const manualCount = filteredRows.filter(it => (it.row as VehicleRow).custoKmManual != null).length;
                          const totalCustoKmManMedio = filteredRows.length > 0 ? totals.custoKmMan / filteredRows.length : NaN;
                          const totalCustoKmPrevMedio = manualCount > 0 ? totals.custoKmManual / manualCount : NaN;
                          const totalDifCustoKmMedio = manualCount > 0 ? totals.difCustoKm / manualCount : NaN;
                          const totalCustoKmLiqMedio = filteredRows.length > 0 ? totals.custoKmLiqMan / filteredRows.length : NaN;
                          const totalIdadeMedia = filteredRows.length > 0 ? totals.idadeEmMeses / filteredRows.length : NaN;

                          const totalPctReembMan = totals.custoManRealizado > 0 ? totals.totalReembMan / totals.custoManRealizado : 0;
                          const totalPctReembSin = totals.totalSinistro > 0 ? totals.totalReembSin / totals.totalSinistro : 0;
                          const totalSinLiqPctFat = totals.faturamentoTotal > 0 ? totals.custoLiqSin / totals.faturamentoTotal : NaN;
                          const totalSinistralidadeOperacional = totals.faturamentoTotal > 0 ? totals.totalSinistro / totals.faturamentoTotal : NaN;
                          const totalIndiceFrequenciaSinistro = filteredRows.length > 0 ? totals.qtdSinistros / filteredRows.length : 0;
                          const totalGravidadeMediaSinistro = totals.qtdSinistros > 0 ? totals.totalSinistro / totals.qtdSinistros : NaN;
                          const totalIndiceSeveridadeDano = totals.valorVeiculoFipe > 0 ? totals.totalSinistro / totals.valorVeiculoFipe : NaN;

                          // linha de totais
                          rowsElems.push(
                            <tr key="_totals" className="border-t border-slate-200 bg-slate-50 font-semibold">
                              <td className="px-3 py-2">Totais (Placas: {totalPlacasFiltradas.toLocaleString('pt-BR')})</td>
                              <td className="px-3 py-2">—</td>
                              <td className="px-3 py-2 border-r border-slate-200">—</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalIdadeMedia) ? fmtInt(totalIdadeMedia) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">—</td>
                              <td className="px-3 py-2 text-right text-slate-800">{totals.passagemTotal.toLocaleString('pt-BR')}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{totals.passagemIdeal.toLocaleString('pt-BR')}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{totals.diferencaPassagem.toLocaleString('pt-BR')}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalCustoKmManMedio) ? fmtKM2(totalCustoKmManMedio) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalCustoKmPrevMedio) ? fmtKM2(totalCustoKmPrevMedio) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalDifCustoKmMedio) ? fmtKM2(totalDifCustoKmMedio) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{isFinite(totalCustoKmLiqMedio) ? fmtKM2(totalCustoKmLiqMedio) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtBRLZero(totals.custoManRealizado)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtBRLZero(totals.totalReembMan)}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{fmtPct(totalPctReembMan)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtBRLZero(totals.totalSinistro)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtBRLZero(totals.totalReembSin)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtPct(totalPctReembSin)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalSinLiqPctFat) ? fmtPct(totalSinLiqPctFat) : 'N/D'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalSinistralidadeOperacional) ? fmtPct(totalSinistralidadeOperacional) : 'N/D'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtPct(totalIndiceFrequenciaSinistro)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalGravidadeMediaSinistro) ? fmtBRLZero(totalGravidadeMediaSinistro) : 'N/D'}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{isFinite(totalIndiceSeveridadeDano) ? fmtPct(totalIndiceSeveridadeDano) : 'N/D'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtBRL(totals.difManPrevReal)}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{(filteredRows.length > 0) ? fmtPct(totals.pctDifManPrevReal / filteredRows.length) : fmtPct(0)}</td>
                              <td className="px-3 py-2" />
                              <td className="px-3 py-2" />
                              <td className="px-3 py-2" />
                              <td className="px-3 py-2" />
                            </tr>
                          );

                          return rowsElems;
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Recomendacoes automaticas</div>
                  <ul className="space-y-1">
                    {resumoContratoData.recomendacoes.map((item, idx) => (
                      <li key={`${idx}-${item}`} className="text-xs text-slate-600">- {item}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {resumoContratoData && resumoContratoSelecionado && resumoContratoData.rows.length === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                O CTO selecionado existe na base, mas nao retornou veiculos consolidados na analise atual.
              </div>
            )}
          </div>
        )}

        {activeTab === 'listagemCto' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Listagem de CTOs</h2>
                <p className="text-xs text-slate-500 mt-0.5">Clique no código do CTO para expandir os contratos de locação vinculados.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    for (const row of ctoListagemRows) next[row.cto] = true;
                    setExpandedCtos(next);
                  }}
                  disabled={ctoListagemRows.length === 0}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Expandir todos
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedCtos({})}
                  disabled={Object.keys(expandedCtos).length === 0}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Recolher todos
                </button>
              </div>
            </div>

            <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">
                      <button type="button" onClick={() => handleCtoListSort('cto')} className="hover:text-slate-900">CTO{ctoListSortIcon('cto')}</button>
                    </th>
                    <th className="text-left px-3 py-2 font-semibold">
                      <button type="button" onClick={() => handleCtoListSort('cliente')} className="hover:text-slate-900">Cliente{ctoListSortIcon('cliente')}</button>
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      <button type="button" onClick={() => handleCtoListSort('veiculos')} className="hover:text-slate-900">Veículos{ctoListSortIcon('veiculos')}</button>
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      <button type="button" onClick={() => handleCtoListSort('kmMedio')} className="hover:text-slate-900">KM Médio{ctoListSortIcon('kmMedio')}</button>
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      <button type="button" onClick={() => handleCtoListSort('faturamento')} className="hover:text-slate-900">Faturamento{ctoListSortIcon('faturamento')}</button>
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      <button type="button" onClick={() => handleCtoListSort('custoLiquido')} className="hover:text-slate-900">Custo Líquido{ctoListSortIcon('custoLiquido')}</button>
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      <button type="button" onClick={() => handleCtoListSort('pctRecuperacao')} className="hover:text-slate-900">% Recuperação{ctoListSortIcon('pctRecuperacao')}</button>
                    </th>
                    <th className="text-right px-3 py-2 font-semibold">
                      <button type="button" onClick={() => handleCtoListSort('impactoLiqFat')} className="hover:text-slate-900">Impacto Liq/Fat{ctoListSortIcon('impactoLiqFat')}</button>
                    </th>
                    <th className="text-center px-3 py-2 font-semibold">
                      <button type="button" onClick={() => handleCtoListSort('status')} className="hover:text-slate-900">Status{ctoListSortIcon('status')}</button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ctoListagemRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-3 py-12 text-center text-slate-400">
                        Nenhum CTO encontrado com os filtros superiores aplicados.
                      </td>
                    </tr>
                  )}

                  {ctoListagemRows.flatMap((row, index) => {
                    const expanded = !!expandedCtos[row.cto];
                    const mainRow = (
                      <tr key={`${row.cto}-main`} className={`border-t border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50`}>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleCtoExpanded(row.cto)}
                            className="inline-flex items-center gap-2 text-indigo-700 hover:underline font-semibold"
                          >
                            <span className="text-slate-500">{expanded ? '▾' : '▸'}</span>
                            <span>{row.cto}</span>
                          </button>
                          {row.isCortesia && (
                            <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border border-sky-200 bg-sky-50 text-sky-700">
                              Cortesia
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.clientePrincipal || '—'}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{row.totalVeiculos.toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{Math.round(row.kmMedio).toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-2 text-right text-teal-700 font-semibold">{fmtBRL(row.faturamentoTotal)}</td>
                        <td className="px-3 py-2 text-right text-rose-700 font-semibold">{fmtBRLZero(row.custoLiquido)}</td>
                        <td className="px-3 py-2 text-right text-emerald-700">{fmtPct(row.pctRecuperacao)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${row.isCortesia ? 'text-slate-500' : (row.impactoLiqFat > fatPctAlertThreshold ? 'text-rose-700' : 'text-emerald-700')}`}>{row.isCortesia ? 'N/A' : fmtPct(row.impactoLiqFat)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border ${statusBadgeClass(row.status)}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );

                    const detailRow = expanded ? (
                      <tr key={`${row.cto}-detail`} className="bg-slate-50">
                        <td colSpan={9} className="px-3 py-3 border-t border-slate-200">
                          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                            Contratos de Locação Vinculados ({row.locacoes.length})
                          </div>
                          <div className="mt-2 rounded-lg border border-slate-200 overflow-auto bg-white">
                            <table className="min-w-full text-[11px]">
                              <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                  <th className="text-left px-2 py-1.5">Contrato Locação</th>
                                  <th className="text-left px-2 py-1.5">Cliente</th>
                                  <th className="text-right px-2 py-1.5">Veículos</th>
                                  <th className="text-right px-2 py-1.5">KM Médio</th>
                                  <th className="text-right px-2 py-1.5">Faturamento</th>
                                  <th className="text-right px-2 py-1.5">Custo Líquido</th>
                                  <th className="text-right px-2 py-1.5">% Recuperação</th>
                                  <th className="text-right px-2 py-1.5">Impacto Liq/Fat</th>
                                  <th className="text-left px-2 py-1.5">Situação Locação</th>
                                  <th className="text-center px-2 py-1.5">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.locacoes.map(loc => (
                                  <tr key={`${row.cto}-${loc.idLocacao}`} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="px-2 py-1.5 font-medium text-slate-800">
                                      {loc.idLocacao}
                                      {loc.isCortesia && (
                                        <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border border-sky-200 bg-sky-50 text-sky-700">
                                          Cortesia
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-1.5 text-slate-700">{loc.clientePrincipal || '—'}</td>
                                    <td className="px-2 py-1.5 text-right text-slate-700">{loc.totalVeiculos.toLocaleString('pt-BR')}</td>
                                    <td className="px-2 py-1.5 text-right text-slate-700">{Math.round(loc.kmMedio).toLocaleString('pt-BR')}</td>
                                    <td className="px-2 py-1.5 text-right text-teal-700 font-medium">{fmtBRL(loc.faturamentoTotal)}</td>
                                    <td className="px-2 py-1.5 text-right text-rose-700 font-medium">{fmtBRLZero(loc.custoLiquido)}</td>
                                    <td className="px-2 py-1.5 text-right text-emerald-700">{fmtPct(loc.pctRecuperacao)}</td>
                                    <td className={`px-2 py-1.5 text-right font-medium ${loc.isCortesia ? 'text-slate-500' : (loc.impactoLiqFat > fatPctAlertThreshold ? 'text-rose-700' : 'text-emerald-700')}`}>{loc.isCortesia ? 'N/A' : fmtPct(loc.impactoLiqFat)}</td>
                                    <td className="px-2 py-1.5 text-slate-700">{loc.sitLocTop || 'Sem informacao'}</td>
                                    <td className="px-2 py-1.5 text-center">
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusBadgeClass(loc.status)}`}>
                                        {loc.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ) : null;

                    return detailRow ? [mainRow, detailRow] : [mainRow];
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab !== 'resumo' && activeTab !== 'listagemCto' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
              {tabKpis.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2 relative overflow-hidden min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={`w-4 h-4 ${card.color}`} />
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">{card.label}</span>
                    </div>
                    <div className={`text-xl lg:text-2xl font-bold ${card.color} whitespace-nowrap leading-none`}>{card.value}</div>
                    <div className="text-[11px] text-slate-400 font-medium whitespace-nowrap truncate">{card.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* ── Table ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className={`${curTab.hdr} text-white px-4 py-2 text-sm font-semibold flex items-center gap-2`}>
                <curTab.icon className="w-4 h-4" />{curTab.label}
                {tabHasYearDetail(activeTab) && (
                  <button
                    type="button"
                    onClick={() => setShowYearDetailByTab(prev => ({ ...prev, [activeTab]: !prev[activeTab] }))}
                    className="ml-2 inline-flex items-center gap-1 rounded-md border border-white/35 bg-white/10 px-2 py-0.5 text-[11px] font-medium hover:bg-white/20"
                    title={showYearDetailByTab[activeTab] ? 'Recolher colunas anuais' : 'Expandir colunas anuais'}
                  >
                    <span className="text-sm leading-none">{showYearDetailByTab[activeTab] ? '-' : '+'}</span>
                    {showYearDetailByTab[activeTab] ? 'Anos' : 'Anos'}
                  </button>
                )}
                <span className="ml-auto text-xs opacity-75">{displayRows.length} linhas</span>
              </div>
              <div className="overflow-auto" style={{maxHeight:'60vh'}}>
                <table className="border-collapse table-auto text-xs whitespace-nowrap" style={{ minWidth: tableMinWidth }}>
                  <thead className="sticky top-0 z-10 shadow-sm">
                    <tr>
                      {/* ID header group */}
                      <th colSpan={ID_COLS.length} className="bg-slate-700 text-white text-center py-1.5 text-[12px] font-semibold uppercase tracking-wide border-r border-white/20">
                        Identificação
                      </th>
                      {/* Tab header group */}
                      <th colSpan={tabCols.length} className={`${curTab.hdr} text-white text-center py-1.5 text-[12px] font-semibold uppercase tracking-wide`}>
                        {curTab.label} ({dynYears[0]} - {dynYears[dynYears.length-1]})
                      </th>
                      <th rowSpan={2} className="bg-slate-700 text-white text-center py-1.5 text-[12px] font-semibold uppercase tracking-wide border-l border-white/20" style={{ minWidth: 44, width: 44, maxWidth: 44 }}>
                        Det.
                      </th>
                    </tr>
                    <tr className="bg-slate-800">
                      {allCols.map((col) => {
                        const colWidth = col.align === 'right' ? Math.max(col.w || 90, 108) : (col.w || 90);
                        const thStyle: any = { minWidth: colWidth, width: colWidth, maxWidth: colWidth };
                        return (
                          <th key={col.key} onClick={()=>handleSort(col.key)}
                            style={thStyle}
                            className={`px-2 py-1.5 text-[12px] font-semibold text-white/90 cursor-pointer hover:bg-slate-700 border-r border-white/10 select-none ${col.align==='right'?'text-right':'text-left'} ${textEllipsisCols.has(col.key) ? 'truncate' : ''}`}>
                            {col.label}{sortIcon(col.key)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.length===0 && (
                      <tr><td colSpan={allCols.length + 1} className="text-center py-16 text-slate-400">
                        {heavyLoading
                          ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Carregando dados detalhados…</span>
                          : 'Nenhum veículo encontrado com os filtros selecionados.'}
                      </td></tr>
                    )}
                    {displayRows.map((row,i)=>(
                      <tr key={`${row.placa}-${i}`}
                        className={`border-b border-slate-100 hover:bg-indigo-50/60 transition-colors ${i%2===0?'bg-white':'bg-slate-50/40'}`}>
                        {allCols.map((col) => {
                          const colWidth = col.align === 'right' ? Math.max(col.w || 90, 108) : (col.w || 90);
                          const tdStyle: any = { minWidth: colWidth, width: colWidth, maxWidth: colWidth };
                          return (
                            <td key={col.key}
                              style={tdStyle}
                              className={`px-2 py-1.5 border-r border-slate-100 ${col.align==='right'?'text-right':'text-left'} ${col.cls?col.cls(row):'text-slate-700'} ${textEllipsisCols.has(col.key) ? 'truncate' : ''}`}>
                              {col.fmt(row)}
                            </td>
                          );
                        })}
                        <td className="px-1 py-1.5 border-r border-slate-100 text-center" style={{ minWidth: 44, width: 44, maxWidth: 44 }}>
                          <button
                            type="button"
                            title={activeTab === 'faturamento' ? 'Ver histórico de faturamento' : 'Ver extrato de manutenções'}
                            onClick={() => setMaintDetailTarget({ 
                              placa: row.placa, 
                              dataInicial: row.dataInicial, 
                              idLocacao: row.idLocacao,
                              idComercial: row.idComercial,
                              idVeiculo: row.idVeiculo,
                              tipoContrato: row.tipoContrato,
                              mode: activeTab === 'sinistro' ? 'sinistro' : activeTab === 'mansin' ? 'mansin' : activeTab === 'faturamento' ? 'faturamento' : 'manutencao' 
                            })}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Search size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-white z-10 border-t">
                    <tr className="bg-slate-50 font-semibold text-slate-700">
                      {allCols.map((col, ci) => {
                        const total = colTotals[col.key];
                        const colWidth = col.align === 'right' ? Math.max(col.w || 90, 108) : (col.w || 90);
                        const style = { minWidth: colWidth, width: colWidth, maxWidth: colWidth } as any;
                        if (ci === 0) return <td key={col.key} style={style} className="px-2 py-1.5 border-r border-slate-100">Totais</td>;
                        if (total == null) return <td key={col.key} style={style} className="px-2 py-1.5 border-r border-slate-100">—</td>;

                        const k = col.key.toLowerCase();
                        const isCurrency = /valor|fat_|faturamento|custo|man_|sin_|reemb|total|vlr|valorlocacao|valorcompra/.test(k);
                        const isPct = k.includes('pct');
                        const isIdade = k.includes('idade');
                        let formatted = '—';
                        if (isPct) {
                          formatted = fmtPct(total as number);
                        } else if (isIdade) {
                          formatted = fmtNum(Math.round((total as number) * 10) / 10);
                        } else if (isCurrency) {
                          formatted = (k.includes('reemb') || k.includes('liq')) ? fmtBRLZero(total as number) : fmtBRL(total as number);
                        } else if (Number.isInteger(total)) {
                          formatted = fmtNum(total as number);
                        } else if (typeof total === 'number') {
                          formatted = fmtNum(Math.round((total as number) * 100) / 100);
                        }
                        return <td key={col.key} style={style} className="px-2 py-1.5 border-r border-slate-100 text-right">{formatted}</td>;
                      })}
                      <td className="px-1 py-1.5 border-r border-slate-100 text-center" style={{ minWidth: 44, width: 44, maxWidth: 44 }}>—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {heavyLoading && (
                <div className="px-4 py-2 border-t border-slate-200 text-xs text-amber-600 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin"/>
                  Manutenção & faturamento ainda carregando — valores parciais podem ser exibidos
                </div>
              )}
            </div>
          </>
        )}

        <MaintDetailModal
          open={!!maintDetailTarget}
          placa={maintDetailTarget?.placa || ''}
          rows={maintDetailTarget?.mode === 'faturamento' ? fatDetailRows : maintDetailRows}
          mode={maintDetailTarget?.mode || 'manutencao'}
          onClose={() => setMaintDetailTarget(null)}
        />

      </div>
    </div>
  );
}
