import { useEffect, useMemo, useState, useRef } from 'react';
import useBIData from '@/hooks/useBIData';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Settings2, Download, Loader2, Plus, Trash2, X,
  Route, Wrench, ShieldAlert, BarChart3, DollarSign,
  Activity, Target, AlertTriangle, Gauge, Printer,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Types ────────────────────────────────────────────────────────
interface ContratoRow { 
  IdContratoLocacao:string; ContratoComercial:string; IdContratoComercial?:string|number;
  PlacaPrincipal:string; IdVeiculoPrincipal:string; NomeCliente:string; 
  SituacaoContratoLocacao:string; SituacaoContratoComercial?:string; SituacaoContrato?:string;
  TipoContrato?:string; TipoContratoLocacao?:string; Publico?:string;
  DataInicial:string; DataFinal:string|null; 
  Modelo?:string; Grupo?:string; GrupoVeiculo?:string; Categoria?:string; CategoriaVeiculo?:string;
  KmConfirmado?:number; KmInformado?:number;
}
interface FrotaRow { 
  IdVeiculo:string; Placa:string; Modelo?:string; 
  Categoria?:string; CategoriaVeiculo?:string; Grupo?:string; GrupoVeiculo?:string;
  KmConfirmado?:number; KM?:number; KmInformado?:number; 
}
interface ManutencaoRow { Placa:string; ValorTotal:number; ValorReembolsavel:number; DataEntrada:string; DataCriacaoOS:string; OrdemServicoCriadaEm?:string; DataCriacao?:string; IdOrdemServico?:string; idordemservico?:string; IdOcorrencia?:string|number; TipoOcorrencia?:string; Tipo?:string; TipoManutencao?:string; Situacao?:string; Status?:string; StatusOrdem?:string; SituacaoOcorrencia?:string; StatusOcorrencia?:string; valortotal?:number; valorreembolsavel?:number; CustoTotalOS?:number; custo_total_os?:number; ValorTotalFatItens?:number|string; ValorReembolsavelFatItens?:number|string; }
interface RegrasContratoRow { Contrato:string; NomeRegra:string; ConteudoRegra:string | number | null; NomePolitica?:string | null; ConteudoPolitica?:string | null; Grupo?:string; GrupoVeiculo?:string; Categoria?:string; CategoriaVeiculo?:string; }
interface SinistroRow { Placa:string; DataSinistro:string; DataCriacao:string; ValorOrcado?:number|string; ValorOrcamento?:number|string; ValorTotal?:number|string; ValorTotalOS?:number|string; ValorNaoReembolsavel?:number|string; ValorNaoReembolsavelOS?:number|string; ValorReembolsavel?:number|string; ValorReembolsavelOS?:number|string; ValorFinaleiroCalculado?:number|string; IndenizacaoSeguradora?:number|string; ReembolsoTerceiro?:number|string; }
interface FaturamentoRow {
  IdNota:string;
  IdVeiculo?:string;
  Competencia?:string;
  VlrLocacao?:number|string;
  IdContratoLocacao?:string|number;
  IdContratoComercial?:string|number;
  ContratoComercial?:string;
  DataCompetencia?:string;
  ValorLocacao?:number|string;
  DataEmissao?:string;
  DataCriacao?:string;
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
interface ManualCostRule { id:string; cto:string; grupo:string; custoKm:number; }

interface VehicleRow {
  idLocacao:string; idComercial:string;
  placa:string; modelo:string; grupo:string; kmAtual:number; indiceKm:string;
  idadeEmMeses:number; rodagemMedia:number; dataInicial:string; vencimentoContrato:string; cliente:string; contrato:string;
  mesesRestantesContrato:number; kmEstimadoFimContrato:number;
  prazoRestDays:number;
  sitLoc:string; sitCTO:string;
  tipoContrato:string;
  franquiaBanco:number; custoKmManual:number | null;
  passagemTotal:number; passagemIdeal:number; diferencaPassagem:number; pctPassagem:number;
  custoManPrevisto:number; custoManRealizado:number; difManPrevReal:number; pctDifManPrevReal:number; custoManLiquido:number; difCustoManLiq:number; pctDifCustoManLiq:number;
  totalManutencao:number; ticketMedio:number; custoKmMan:number;
  totalReembMan:number;
  custoLiqMan:number; pctReembolsadoMan:number; custoKmLiqMan:number;
  totalSinistro:number;
  totalReembSin:number;
  qtdOsManutencao:number;
  qtdSinistros:number;
  custoLiqSin:number; pctReembolsadoSin:number;
  totalManSin:number; pctReembolsadoManSin:number;
  faturamentoTotal:number;
  pctManFat:number; pctCustoLiqManFat:number; pctSinFat:number; pctCustoLiqSinFat:number; pctManSinFat:number;
  years: Record<number, { pass:number; man:number; reembMan:number; sin:number; reembSin:number; fat:number; }>;
}

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
const fmtKM = (v:number) => v===0?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:3}).format(v);
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
const kmLabel = (km:number) => km>=100000?'Acima 100.000':km>=60000?'60.000–100.000':km>=30000?'30.000–60.000':'Abaixo 30.000';
const getYear = (d:string) => { if(!d||d.length<4) return 0; const y=parseInt(d.substring(0,4)); return isNaN(y)?0:y; };
const monthsDiff = (from:string) => { if(!from) return 0; const d=new Date(from); const n=new Date(); return Math.max(0,(n.getFullYear()-d.getFullYear())*12+(n.getMonth()-d.getMonth())); };
const monthsUntil = (to:string) => { if(!to) return 0; const d=new Date(to); if(isNaN(d.getTime())) return 0; const n=new Date(); return Math.max(0,(d.getFullYear()-n.getFullYear())*12+(d.getMonth()-n.getMonth())); };
const normalizeKeyPart = (v: string) => String(v || '').trim().toUpperCase();
const normalizePlate = (v: unknown) => String(v || '').trim().toUpperCase();
const canonicalPlate = (v: unknown) => normalizePlate(v).replace(/[^A-Z0-9]/g, '');
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

interface ColDef { key:string; label:string; fmt:(r:VehicleRow)=>string; cls?:(r:VehicleRow)=>string; align?:'left'|'right'; w?:number; sortGetter?:(r:VehicleRow)=>any; }

// ID cols shown in every tab
const ID_COLS: ColDef[] = [
  { key:'cliente',     label:'Cliente',      fmt:r=>r.cliente,     align:'left',  w:60, sortGetter: r=>r.cliente },
  { key:'contrato',    label:'CTO',          fmt:r=>r.contrato,    align:'left',  w:95, sortGetter: r=>r.contrato },
  { key:'placa',       label:'Placa',        fmt:r=>r.placa,       align:'left',  w:105, sortGetter: r=>r.placa },
  { key:'modelo',      label:'Modelo',       fmt:r=>r.modelo,      align:'left',  w:170, sortGetter: r=>r.modelo },
  { key:'grupo',       label:'Grupo',        fmt:r=>r.grupo,       align:'left',  w:120, sortGetter: r=>r.grupo },
  { key:'kmAtual',     label:'KM',           fmt:r=>r.kmAtual>0?r.kmAtual.toLocaleString('pt-BR'):'—', align:'right', w:80, sortGetter: r=>r.kmAtual },
  { key:'idadeEmMeses',label:'Idade (meses)',fmt:r=>fmtNum(r.idadeEmMeses), align:'right', w:80, sortGetter: r=>r.idadeEmMeses },
  { key:'kmPrecificado',label:'Km Precificado',fmt:r=>r.custoKmManual == null ? '—' : fmtBRL(r.custoKmManual), align:'right', w:110, sortGetter: r=>r.custoKmManual ?? -1 },
];

const TABS = [
  { key:'passagem',   label:'Passagem',                icon:Route,       color:'bg-blue-600',   hdr:'bg-blue-700' },
  { key:'previsto',   label:'Custo Previsto × Real',   icon:Wrench,      color:'bg-amber-600',  hdr:'bg-amber-700' },
  { key:'manutencao', label:'Manutenção + Reembolso',  icon:Wrench,      color:'bg-orange-600', hdr:'bg-orange-700' },
  { key:'sinistro',   label:'Sinistro + Reembolso',    icon:ShieldAlert, color:'bg-red-600',    hdr:'bg-red-700' },
  { key:'mansin',     label:'Man + Sinistro',          icon:BarChart3,   color:'bg-purple-600', hdr:'bg-purple-700' },
  { key:'faturamento',label:'Faturamento',             icon:DollarSign,  color:'bg-teal-600',   hdr:'bg-teal-700' },
] as const;
type TabKey = typeof TABS[number]['key'];

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
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [printLayout, setPrintLayout] = useState<PrintLayout>('full');
  const [exportTabChoice, setExportTabChoice] = useState<TabKey>('passagem');
  const [kmDivisor] = useState(10000);
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

  useEffect(() => { setShowTabHelp(false); }, [activeTab]);

  useEffect(() => {
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

  const saveFatPctAlertThreshold = () => {
    const pct = parseNum(fatPctAlertInput);
    const ratio = Math.max(0, pct / 100);
    setFatPctAlertThreshold(ratio);
    setFatPctAlertInput(String(Math.round(ratio * 1000) / 10).replace('.', ','));
    localStorage.setItem('analise_contrato_fat_pct_alert_threshold', String(ratio));
  };

  const { data: rawC, loading: lC, metadata } = useBIData<ContratoRow[]>('dim_contratos_locacao');
  const { data: rawF, loading: lF } = useBIData<FrotaRow[]>('dim_frota');
  const { data: rawRules, loading: lRules } = useBIData<RegrasContratoRow[]>('dim_regras_contrato');
  const { data: rawM, loading: lM } = useBIData<ManutencaoRow[]>('fat_manutencao_unificado', { limit: 300000 });
  const { data: rawS, loading: lS } = useBIData<SinistroRow[]>('fat_sinistros', { limit: 300000 });
  const { data: rawFat, loading: lFat } = useBIData<FaturamentoRow[]>('fat_faturamentos', { limit: 300000 });
  const { data: rawFatItens, loading: lFatItens } = useBIData<FaturamentoItemRow[]>('fat_faturamento_itens', { limit: 300000 });

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
  const heavyLoading   = lM || lS || lFat || lFatItens;

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
    return (rawC as ContratoRow[]|null??[])
      .filter(c => c.PlacaPrincipal || c.ContratoComercial); // Must have at least plate or commercial id
  }, [rawC]);

  const vehicleRows = useMemo((): VehicleRow[] => {
    const arrM = rawM as ManutencaoRow[]|null ?? [];
    const arrS = rawS as SinistroRow[]|null   ?? [];
    const arrF = rawFat as FaturamentoRow[]|null ?? [];
    const arrFI = rawFatItens as FaturamentoItemRow[]|null ?? [];

    type MA = { plate: string; date: Date | null; year: number; osId: string; cost: number; reemb: number };
    const maintByPlate = new Map<string, MA[]>();
    const seenMaintenance = new Set<string>();
    for (const m of arrM) {
      const rawPlaca = m.Placa; if(!rawPlaca) continue;
      const placa = normalizePlate(rawPlaca);
      const placaKey = canonicalPlate(rawPlaca);
      if (!placa) continue;
      const rawStatus = (m.Situacao || m.Status || m.StatusOrdem || m.SituacaoOcorrencia || m.StatusOcorrencia || '');
      const status = String(rawStatus).toLowerCase();
      if (status.includes('cancel')) continue;
      const rawDate = m.OrdemServicoCriadaEm || m.DataCriacao || m.DataEntrada || m.DataCriacaoOS || (m as any).DataServico || (m as any).DataAtualizacaoDados || '';
      const date = parseDateFlexible(rawDate);
      const yr = date ? date.getFullYear() : getYear(rawDate);
      if(yr<2022 || yr>2030) continue;
      const osId = String(m.IdOrdemServico || m.idordemservico || m.IdOcorrencia || `${placa}-${yr}-${rawDate}`).trim();
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
      const kmAtual = parseNum(
        frAny?.KmConfirmado ?? frAny?.kmconfirmado ?? frAny?.OdometroConfirmado ?? frAny?.odometroconfirmado ??
        cAny.KmConfirmado ?? cAny.kmconfirmado ?? cAny.OdometroConfirmado ?? cAny.odometroconfirmado ??
        frAny?.KM ?? cAny.KM ?? 0
      );
      const dataInicial = c?.DataInicial || '';
      const tipoContratoRaw = String(
        c?.TipoContrato
        || c?.TipoContratoLocacao
        || c?.Publico
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
      const idadeEmMeses = monthsDiff(dataInicial);
      const rodagemMedia = idadeEmMeses > 0 ? Math.round(kmAtual / idadeEmMeses) : 0;
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
      for (const rec of maintRecords) {
        if (rec.year < 2022 || rec.year > 2030) continue;
        if (!mm.has(rec.year)) mm.set(rec.year, { cost:0, reemb:0, osIds:new Set<string>() });
        const bucket = mm.get(rec.year)!;
        bucket.cost += rec.cost;
        bucket.reemb += rec.reemb;
        bucket.osIds.add(rec.osId);
      }

      let passagemTotal = 0;
      for (const bucket of mm.values()) passagemTotal += bucket.osIds.size;
      const passagemIdeal = kmDivisor > 0 ? kmAtual / kmDivisor : 0;

      const contratoBase = String(c?.ContratoComercial || cAny?.ContratoComercial || cAny?.Contrato || '').trim();
      const manualCustoKm = lookupCustoKmManual(contratoBase, grupo);
      const franquiaBanco = lookupFranquiaBanco(contratoBase, grupo);
      const custoManPrevisto = manualCustoKm == null ? 0 : (franquiaBanco * manualCustoKm) * idadeEmMeses;

      let totalManutencao = 0, cntMan = 0, totalReembMan = 0;
      for (const bucket of mm.values()) { totalManutencao += bucket.cost; totalReembMan += bucket.reemb; cntMan += bucket.osIds.size; }
      
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
      const pctPassagem = passagemIdeal > 0 ? passagemTotal / passagemIdeal - 1 : 0;
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
        placa: realPlaca, modelo, grupo, kmAtual, indiceKm: kmLabel(kmAtual), idadeEmMeses, rodagemMedia,
        dataInicial,
        vencimentoContrato: c?.DataFinal ? new Date(c.DataFinal).toLocaleDateString('pt-BR') : '—',
        mesesRestantesContrato,
        prazoRestDays,
        kmEstimadoFimContrato,
        cliente: c?.NomeCliente || (c ? '' : '— Sem CTO / Avulso —'), 
        contrato: c?.ContratoComercial || (c ? '' : '—'),
        sitCTO: normalizeSitCTO(c || ({} as ContratoRow), cAny), 
        sitLoc: c?.SituacaoContratoLocacao || '',
        tipoContrato,
        franquiaBanco,
        custoKmManual: manualCustoKm,
        passagemTotal, passagemIdeal: Math.round(passagemIdeal * 10) / 10,
        diferencaPassagem: Math.round(diferencaPassagem * 10) / 10, pctPassagem,
        custoManPrevisto, custoManRealizado, difManPrevReal, pctDifManPrevReal, custoManLiquido, difCustoManLiq, pctDifCustoManLiq,
        totalManutencao, ticketMedio, custoKmMan,
        totalReembMan, custoLiqMan, pctReembolsadoMan, custoKmLiqMan,
        totalSinistro, totalReembSin, qtdOsManutencao: cntMan, qtdSinistros: totalQtdSinistros, custoLiqSin, pctReembolsadoSin,
        totalManSin, pctReembolsadoManSin,
        faturamentoTotal,
        pctManFat, pctCustoLiqManFat, pctSinFat, pctCustoLiqSinFat, pctManSinFat,
        years
      };
    });

    return result;
  }, [activeContratos, rawF, frotaByPlaca, rawM, rawS, rawFat, rawFatItens, kmDivisor, bancoRegraLookup, manualCostLookup]);

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

  const getDynYearsForTab = (tab: TabKey) => {
    const minYear = 2022;
    const maxYear = 2026;
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

    let totalManSin = 0;
    let totalReembManSin = 0;
    let totalEventosManSin = 0;

    let faturamentoTotal = 0;

    for (const row of displayRows) {
      totalPassagens += Number(row.passagemTotal) || 0;
      totalPassagemPrevista += Number(row.passagemIdeal) || 0;
      somaRodagemMedia += Number(row.rodagemMedia) || 0;
      if ((Number(row.diferencaPassagem) || 0) > 0) veiculosCriticos++;

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
    const mediaPassagens = totalVeiculos > 0 ? totalPassagens / totalVeiculos : 0;
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

    if (activeTab === 'previsto') {
      return [
        { label: 'Total Previsto', value: fmtBRL(totalPrevisto), sub: 'Soma do custo previsto', icon: Target, color: 'text-amber-600' },
        { label: 'Total Realizado', value: fmtBRLZero(totalRealizado), sub: 'Soma do custo realizado', icon: Wrench, color: 'text-rose-600' },
        { label: 'Diferença (DIF)', value: fmtBRL(totalDifPrevReal), sub: 'Previsto - Realizado', icon: BarChart3, color: totalDifPrevReal >= 0 ? 'text-emerald-600' : 'text-rose-600' },
        { label: '% Desvio', value: fmtPct(pctDesvioPrevReal), sub: '(Realizado / Previsto) - 1', icon: AlertTriangle, color: pctDesvioPrevReal > 0 ? 'text-rose-600' : 'text-emerald-600' },
      ];
    }

    if (activeTab === 'manutencao') {
      return [
        { label: 'Custo Bruto', value: fmtBRL(totalManutencao), sub: 'Soma de manutenção', icon: Wrench, color: 'text-rose-600' },
        { label: 'Total Reembolsado', value: fmtBRL(totalReembMan), sub: 'Recuperado em manutenção', icon: ShieldAlert, color: 'text-emerald-600' },
        { label: 'Custo Líquido', value: fmtBRL(totalCustoLiqMan), sub: 'Bruto - Reembolsos', icon: DollarSign, color: 'text-indigo-600' },
        { label: '% Recuperação', value: fmtPct(pctRecuperacaoMan), sub: 'Reembolso / Custo Bruto', icon: Activity, color: 'text-blue-600' },
      ];
    }

    if (activeTab === 'sinistro') {
      return [
        { label: 'Custo Sinistro', value: fmtBRL(totalSinistro), sub: 'Soma de sinistros', icon: ShieldAlert, color: 'text-rose-600' },
        { label: 'Reembolso Sinistro', value: fmtBRLZero(totalReembSin), sub: 'Seguradora + terceiro', icon: DollarSign, color: 'text-emerald-600' },
        { label: 'Custo Líquido Sinistro', value: fmtBRLZero(totalCustoLiqSin), sub: 'Sinistro - Reembolso', icon: BarChart3, color: 'text-indigo-600' },
        { label: '% Recuperação', value: fmtPct(pctRecuperacaoSin), sub: 'Reembolso / Sinistro', icon: Activity, color: 'text-blue-600' },
      ];
    }

    if (activeTab === 'mansin') {
      return [
        { label: 'Custo Total (M+S)', value: fmtBRL(totalManSin), sub: 'Manutenção + sinistro', icon: BarChart3, color: 'text-rose-600' },
        { label: 'Total Reembolsado', value: fmtBRL(totalReembManSin), sub: 'Reembolso man + sinistro', icon: ShieldAlert, color: 'text-emerald-600' },
        { label: 'Custo Líquido Total', value: fmtBRL(custoLiqTotalManSin), sub: 'Custo total - reembolsos', icon: DollarSign, color: 'text-indigo-600' },
        { label: 'Ticket Médio Total', value: fmtBRL(ticketMedioTotal), sub: 'Custo total / (OS + sinistros)', icon: Gauge, color: 'text-blue-600' },
      ];
    }

    if (activeTab === 'faturamento') {
      return [
        { label: 'Faturamento Total', value: fmtBRL(faturamentoTotal), sub: 'Receita consolidada', icon: DollarSign, color: 'text-emerald-600' },
        { label: 'Margem Manutenção', value: fmtPct(margemManutencao), sub: '1 - (Custo líq. man / fat.)', icon: Target, color: margemManutencao < 0 ? 'text-rose-600' : 'text-indigo-600' },
        { label: 'Impacto Manutenção', value: fmtPct(impactoManutencao), sub: '% do faturamento em man. líquida', icon: Wrench, color: impactoManutencao > fatPctAlertThreshold ? 'text-rose-600' : 'text-emerald-600' },
        { label: 'Impacto Sinistro', value: fmtPct(impactoSinistro), sub: '% do faturamento em sinistro líquido', icon: ShieldAlert, color: impactoSinistro > fatPctAlertThreshold ? 'text-rose-600' : 'text-emerald-600' },
      ];
    }

    return [
      { label: 'Passagens Realizadas', value: fmtNum(totalPassagens), sub: `Média ${mediaPassagens.toFixed(1)} por veículo`, icon: Activity, color: 'text-blue-600' },
      { label: 'Passagem Prevista', value: fmtNominal(Math.round(totalPassagemPrevista * 10) / 10), sub: `Ref. ${fmtNum(kmDivisor)} km/p`, icon: Target, color: 'text-indigo-600' },
      { label: 'Veículos Críticos', value: fmtNum(veiculosCriticos), sub: `${fmtPct(pctCriticos)} da frota filtrada`, icon: AlertTriangle, color: 'text-rose-600' },
      { label: 'Rodagem Média', value: fmtNum(Math.round(rodagemMedia)), sub: 'Média mensal por veículo', icon: Gauge, color: 'text-blue-600' },
    ];
  }, [activeTab, displayRows, kmDivisor, fatPctAlertThreshold]);

  const getTabColsForTab = (tab: TabKey, years: number[], includeYearDetail = true) => {
    const cols: ColDef[] = [];
    if (tab === 'passagem') {
      if (includeYearDetail) years.forEach(y => cols.push({ key:`pass_${y}`, label:`Pass ${y}`, fmt:r=>fmtNum(r.years[y].pass), align:'right', w:80, sortGetter: r=>r.years[y].pass }));
      cols.push(
        { key:'passagemTotal',   label:'Total',       fmt:r=>fmtNum(r.passagemTotal), align:'right', w:72, sortGetter: r=>r.passagemTotal },
        { key:'passagemIdeal',   label:'Ideal',       fmt:r=>r.passagemIdeal.toFixed(1), align:'right', w:72, sortGetter: r=>r.passagemIdeal },
        { key:'diferencaPassagem',label:'Diferença',  fmt:r=>r.diferencaPassagem.toFixed(1), cls:r=>clrV(r.diferencaPassagem, false), align:'right', w:80, sortGetter: r=>r.diferencaPassagem },
        { key:'pctPassagem',     label:'% Passagem',  fmt:r=>fmtPct(r.pctPassagem), cls:r=>clrP(r.pctPassagem, false), align:'right', w:90, sortGetter: r=>r.pctPassagem },
        { key:'rodagemMedia',    label:'Rod Média/Mês', fmt:r=>fmtNum(r.rodagemMedia), align:'right', w:95, sortGetter: r=>r.rodagemMedia },
        { key:'kmEstimadoFimContrato',label:'KM Est. Fim',fmt:r=>r.kmEstimadoFimContrato>0?r.kmEstimadoFimContrato.toLocaleString('pt-BR'):'—', align:'right', w:110, sortGetter: r=>r.kmEstimadoFimContrato },
        { key:'vencimentoContrato',label:'Vencimento',fmt:r=>r.vencimentoContrato, align:'left', w:100, sortGetter: r=>r.vencimentoContrato },
        { key:'mesesRestantesContrato',label:'Prazo Rest',fmt:r=>{
            const days = Number.isFinite(r.prazoRestDays) ? r.prazoRestDays : NaN;
            if (!isFinite(days)) return '—';
            if (days < 0) return `${Math.abs(days)} dias`;
            if (days < 90) return `${days} dias`;
            return `${r.mesesRestantesContrato} meses`;
          }, cls: r=> (Number.isFinite(r.prazoRestDays) && r.prazoRestDays<0) ? 'text-red-600 font-medium' : 'text-slate-700', align:'right', w:92, sortGetter: r=>r.mesesRestantesContrato }
      );
    } else if (tab === 'previsto') {
      cols.push(
        { key:'custoManPrevisto', label:'Previsto',      fmt:r=>fmtBRL(r.custoManPrevisto),   align:'right', w:120, sortGetter: r=>r.custoManPrevisto },
        { key:'custoManRealizado',label:'Realizado',     fmt:r=>fmtBRLZero(r.custoManRealizado),  cls:r=>clrV(r.difManPrevReal), align:'right', w:120, sortGetter: r=>r.custoManRealizado },
        { key:'difManPrevReal',   label:'DIF',           fmt:r=>fmtBRL(r.difManPrevReal),     cls:r=>clrV(r.difManPrevReal), align:'right', w:120, sortGetter: r=>r.difManPrevReal },
        { key:'pctDifManPrevReal',label:'%DIF',          fmt:r=>fmtPct(r.pctDifManPrevReal),  cls:r=>clrP(r.pctDifManPrevReal, false), align:'right', w:80, sortGetter: r=>r.pctDifManPrevReal },
        { key:'custoManLiquido',  label:'Custo Man Líq', fmt:r=>fmtBRLZero(r.custoManLiquido),    cls:r=>clrV(r.custoManLiquido, false), align:'right', w:120, sortGetter: r=>r.custoManLiquido },
        { key:'difCustoManLiq',   label:'Dif Liq',       fmt:r=>fmtBRL(r.difCustoManLiq),     cls:r=>clrV(r.difCustoManLiq), align:'right', w:120, sortGetter: r=>r.difCustoManLiq },
        { key:'pctDifCustoManLiq',label:'%Dif Liq',      fmt:r=>fmtPct(r.pctDifCustoManLiq),  cls:r=>clrP(r.pctDifCustoManLiq, false), align:'right', w:80, sortGetter: r=>r.pctDifCustoManLiq }
      );
    } else if (tab === 'manutencao') {
      if (includeYearDetail) years.forEach(y => cols.push({ key:`man_${y}`, label:`Man ${y}`, fmt:r=>fmtBRL(r.years[y].man), cls:r=>clrV(r.years[y].man, false), align:'right', w:110, sortGetter: r=>r.years[y].man }));
      cols.push({ key:'totalManutencao',label:'Total Man', fmt:r=>fmtBRL(r.totalManutencao),cls:r=>clrV(r.totalManutencao, false), align:'right', w:110, sortGetter: r=>r.totalManutencao });
      cols.push({ key:'ticketMedio',    label:'Ticket Médio', fmt:r=>fmtBRL(r.ticketMedio),    align:'right', w:110, sortGetter: r=>r.ticketMedio });
      cols.push({ key:'custoKmMan',     label:'Custo/KM',     fmt:r=>fmtKM(r.custoKmMan),      align:'right', w:90, sortGetter: r=>r.custoKmMan });
      
      if (includeYearDetail) years.forEach(y => cols.push({ key:`reembMan_${y}`, label:`Reemb Man ${y}`, fmt:r=>fmtBRL(r.years[y].reembMan), align:'right', w:110, sortGetter: r=>r.years[y].reembMan }));
      cols.push({ key:'totalReembMan',  label:'Total Reemb',  fmt:r=>fmtBRL(r.totalReembMan),  align:'right', w:110, sortGetter: r=>r.totalReembMan });
      
      if (includeYearDetail) years.forEach(y => cols.push({ key:`difReembMan_${y}`, label:`Dif Reemb ${y}`, fmt:r=>fmtBRL(r.years[y].man - r.years[y].reembMan), cls:r=>clrV(r.years[y].man - r.years[y].reembMan, false), align:'right', w:110, sortGetter: r=>r.years[y].man - r.years[y].reembMan }));
      cols.push({ key:'custoLiqMan',    label:'Custo Líq Man',fmt:r=>fmtBRL(r.custoLiqMan),   cls:r=>clrV(r.custoLiqMan, false), align:'right', w:120, sortGetter: r=>r.custoLiqMan });
      cols.push({ key:'pctReembolsadoMan',label:'% Reemb Man',fmt:r=>fmtPct(r.pctReembolsadoMan), align:'right', w:90, sortGetter: r=>r.pctReembolsadoMan });
      cols.push({ key:'custoKmLiqMan',  label:'Custo KM Líq', fmt:r=>fmtKM(r.custoKmLiqMan),  align:'right', w:100, sortGetter: r=>r.custoKmLiqMan });
    } else if (tab === 'sinistro') {
      if (includeYearDetail) years.forEach(y => cols.push({ key:`sin_${y}`, label:`Sin ${y}`, fmt:r=>fmtBRL(r.years[y].sin), cls:r=>clrV(r.years[y].sin, false), align:'right', w:110, sortGetter: r=>r.years[y].sin }));
      cols.push({ key:'totalSinistro',   label:'Total Sin',     fmt:r=>fmtBRL(r.totalSinistro),   cls:r=>clrV(r.totalSinistro, false), align:'right', w:110, sortGetter: r=>r.totalSinistro });
      
      if (includeYearDetail) years.forEach(y => cols.push({ key:`reembSin_${y}`, label:`Reemb Sin ${y}`, fmt:r=>fmtBRLZero(r.years[y].reembSin), align:'right', w:120, sortGetter: r=>r.years[y].reembSin }));
      cols.push({ key:'totalReembSin',   label:'Total Reemb Sin',fmt:r=>fmtBRLZero(r.totalReembSin),  align:'right', w:120, sortGetter: r=>r.totalReembSin });
      
      if (includeYearDetail) years.forEach(y => cols.push({ key:`difReembSin_${y}`, label:`Dif Reemb ${y}`, fmt:r=>fmtBRL(r.years[y].sin - r.years[y].reembSin), cls:r=>clrV(r.years[y].sin - r.years[y].reembSin, false), align:'right', w:110, sortGetter: r=>r.years[y].sin - r.years[y].reembSin }));
      cols.push({ key:'custoLiqSin',     label:'Custo Líq Sin', fmt:r=>fmtBRLZero(r.custoLiqSin), cls:r=>clrV(r.custoLiqSin, false), align:'right', w:120, sortGetter: r=>r.custoLiqSin });
      cols.push({ key:'pctReembolsadoSin',label:'% Reemb Sin',  fmt:r=>fmtPct(r.pctReembolsadoSin), align:'right', w:95, sortGetter: r=>r.pctReembolsadoSin });
    } else if (tab === 'mansin') {
      if (includeYearDetail) years.forEach(y => cols.push({ key:`manSin_${y}`, label:`Man+Sin ${y}`, fmt:r=>fmtBRL(r.years[y].man + r.years[y].sin), cls:r=>clrV(r.years[y].man + r.years[y].sin, false), align:'right', w:120, sortGetter: r=>r.years[y].man + r.years[y].sin }));
      cols.push({ key:'totalManSin',         label:'Total Man+Sin',fmt:r=>fmtBRL(r.totalManSin),cls:r=>clrV(r.totalManSin, false), align:'right', w:130, sortGetter: r=>r.totalManSin });
      cols.push({ key:'pctReembolsadoManSin',label:'% Reemb',     fmt:r=>fmtPct(r.pctReembolsadoManSin), align:'right', w:90, sortGetter: r=>r.pctReembolsadoManSin });
    } else if (tab === 'faturamento') {
      if (includeYearDetail) years.forEach(y => cols.push({ key:`fat_${y}`, label:`Fat ${y}`, fmt:r=>fmtBRL(r.years[y].fat), align:'right', w:120, sortGetter: r=>r.years[y].fat }));
      cols.push({ key:'faturamentoTotal', label:'Fat Total',      fmt:r=>fmtBRL(r.faturamentoTotal),align:'right', w:130, sortGetter: r=>r.faturamentoTotal });
      cols.push({ key:'pctManFat',        label:'% Man/Fat',      fmt:r=>fmtPct(r.pctManFat),        cls:r=>clrPctThreshold(r.pctManFat, fatPctAlertThreshold), align:'right', w:90, sortGetter: r=>r.pctManFat });
      cols.push({ key:'pctCustoLiqManFat',label:'% Liq Man/Fat',  fmt:r=>fmtPct(r.pctCustoLiqManFat),cls:r=>clrPctThreshold(r.pctCustoLiqManFat, fatPctAlertThreshold), align:'right', w:100, sortGetter: r=>r.pctCustoLiqManFat });
      cols.push({ key:'pctSinFat',        label:'% Sin/Fat',      fmt:r=>fmtPct(r.pctSinFat),        cls:r=>clrPctThreshold(r.pctSinFat, fatPctAlertThreshold), align:'right', w:90, sortGetter: r=>r.pctSinFat });
      cols.push({ key:'pctCustoLiqSinFat',label:'% Liq Sin/Fat',  fmt:r=>fmtPct(r.pctCustoLiqSinFat),cls:r=>clrPctThreshold(r.pctCustoLiqSinFat, fatPctAlertThreshold), align:'right', w:100, sortGetter: r=>r.pctCustoLiqSinFat });
      cols.push({ key:'pctManSinFat',     label:'% Man+Sin/Fat',  fmt:r=>fmtPct(r.pctManSinFat),     cls:r=>clrPctThreshold(r.pctManSinFat, fatPctAlertThreshold), align:'right', w:105, sortGetter: r=>r.pctManSinFat });
    }
    return cols;
  };

  const tabHasYearDetail = (tab: TabKey) => tab !== 'previsto';

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
      if (kk.includes('indice') || kk.includes('vencimento') || kk.includes('contrato') || kk.includes('cliente') || kk.includes('placa') || kk.includes('modelo') || kk.includes('grupo') || kk.includes('idade')) return false;
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

      // idade (months): compute mean
      if (kk.includes('idade')) {
        let sum = 0;
        let count = 0;
        for (const r of displayRows) {
          const v = (r as any)[col.key];
          const n = Number(v);
          if (isFinite(n)) { sum += n; count++; }
        }
        totals[col.key] = count > 0 ? sum / count : null;
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

  const nowStamp = () => {
    const n = new Date();
    const pad = (v:number) => String(v).padStart(2, '0');
    const dateLabel = `${pad(n.getDate())}/${pad(n.getMonth() + 1)}/${n.getFullYear()}`;
    const timeLabel = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
    const fileStamp = `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}_${pad(n.getHours())}${pad(n.getMinutes())}${pad(n.getSeconds())}`;
    return { dateLabel, timeLabel, fileStamp };
  };

  const exportXLSX = (scope: ExportScope = 'all', selectedTab?: TabKey) => {
    const stamp = nowStamp();
    const wb = XLSX.utils.book_new();

    const tabsToExport = scope === 'all'
      ? TABS
      : TABS.filter(t => t.key === (selectedTab || activeTab));

    for (const tab of tabsToExport) {
      const years = getDynYearsForTab(tab.key);
      const cols = [...ID_COLS, ...getTabColsForTab(tab.key, years, true)];
      const rows = displayRows.map(r => Object.fromEntries(cols.map(c => [c.label, c.fmt(r)])));
      const ws = XLSX.utils.json_to_sheet(rows);
      const safeSheetName = tab.label.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
    }

    const metaRows = [{
      'Gerado em': `${stamp.dateLabel} ${stamp.timeLabel}`,
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
    XLSX.writeFile(wb, `analise_contrato_${tabSuffix}_${stamp.fileStamp}.xlsx`);
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
        if ((Number(row.diferencaPassagem) || 0) > 0) veiculosCriticos++;

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
        ];
      }
      if (tab === 'manutencao') {
        return [
          { label: 'Custo Bruto', value: fmtBRL(totalManutencao), cls: 'text-red-600' },
          { label: 'Reembolsado', value: fmtBRL(totalReembMan), cls: 'text-emerald-600' },
          { label: 'Custo Líquido', value: fmtBRL(totalCustoLiqMan), cls: 'text-red-600' },
          { label: '% Recuperação', value: fmtPct(pctRecuperacaoMan), cls: 'text-blue-600' },
        ];
      }
      if (tab === 'sinistro') {
        return [
          { label: 'Custo Sinistro', value: fmtBRL(totalSinistro), cls: 'text-red-600' },
          { label: 'Reemb. Sinistro', value: fmtBRL(totalReembSin), cls: 'text-emerald-600' },
          { label: 'Custo Líq. Sinistro', value: fmtBRLZero(totalCustoLiqSin), cls: 'text-red-600' },
          { label: '% Recuperação', value: fmtPct(pctRecuperacaoSin), cls: 'text-blue-600' },
        ];
      }
      if (tab === 'mansin') {
        return [
          { label: 'Custo Total', value: fmtBRL(totalManSin), cls: 'text-red-600' },
          { label: 'Total Reembolsado', value: fmtBRL(totalReembManSin), cls: 'text-emerald-600' },
          { label: 'Custo Líquido', value: fmtBRL(custoLiqTotalManSin), cls: 'text-red-600' },
          { label: 'Ticket Médio', value: fmtBRL(ticketMedioTotal), cls: 'text-blue-600' },
        ];
      }
      if (tab === 'faturamento') {
        return [
          { label: 'Faturamento', value: fmtBRL(faturamentoTotal), cls: 'text-teal-600' },
          { label: 'Margem Manutenção', value: fmtPct(margemManutencao), cls: margemManutencao < 0 ? 'text-red-600' : 'text-indigo-600' },
          { label: 'Impacto Man.', value: fmtPct(impactoManutencao), cls: impactoManutencao > fatPctAlertThreshold ? 'text-red-600' : 'text-emerald-600' },
          { label: 'Impacto Sinistro', value: fmtPct(impactoSinistro), cls: impactoSinistro > fatPctAlertThreshold ? 'text-red-600' : 'text-emerald-600' },
        ];
      }
      return [
        { label: 'Passagens', value: fmtNum(totalPassagens), cls: 'text-blue-600' },
        { label: 'Passagem Prevista', value: fmtNominal(Math.round(totalPassagemPrevista * 10) / 10), cls: 'text-indigo-600' },
        { label: 'Críticos', value: `${fmtNum(veiculosCriticos)} (${fmtPct(pctCriticos)})`, cls: 'text-red-600' },
        { label: 'Rodagem Média', value: fmtNum(Math.round(rodagemMedia)), cls: 'text-blue-600' },
      ];
    };

    const tabsToPrint = scope === 'all'
      ? TABS
      : TABS.filter(t => t.key === (selectedTab || activeTab));

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
        { label: 'DIF PASSAGEM', fmt: (r: VehicleRow) => fmtNominal(r.diferencaPassagem), align: 'num', cls: (r: VehicleRow) => clrV(r.diferencaPassagem, false) },
        { label: 'CUSTO KM', fmt: (r: VehicleRow) => (r.custoKmManual == null ? '—' : fmtBRL(r.custoKmManual)), align: 'num', cls: '' },
        { label: 'Custo Man previsto', fmt: (r: VehicleRow) => fmtBRL(r.custoManPrevisto), align: 'num', cls: '' },
        { label: 'Custo Man realizado', fmt: (r: VehicleRow) => fmtBRLZero(r.custoManRealizado), align: 'num', cls: '' },
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

    const selectedTabLabel = TABS.find(t => t.key === (selectedTab || activeTab))?.label || 'Aba';
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
      'Custo líquido é o total de sinistro menos reembolsos.'
    ],
    mansin: [
      'Agrupa manutenção + sinistro para visão consolidada de risco/custo.',
      'Percentual de reembolso considera ambos os blocos.'
    ],
    faturamento: [
      'Compara custos vs faturamento por veículo.',
      'Percentuais mostram pressão de custo sobre a receita.'
    ],
  };

  if (initialLoading) return <AnalyticsLoading message="Carregando contratos e frota..." />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
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

                  {exportFormat === 'pdf' && (
                    <div>
                      <div className="text-xs font-semibold text-slate-600 mb-2">Layout de impressão</div>
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
                  )}

                  {exportScope === 'single' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Aba</label>
                      <select
                        value={exportTabChoice}
                        onChange={(e)=>setExportTabChoice(e.target.value as TabKey)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                      >
                        {TABS.map(tab => (
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
                        else exportXLSX(exportScope, tab);
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
                          <th className="text-left px-4 py-2 font-semibold">Contrato</th>
                          <th className="text-left px-4 py-2 font-semibold">Grupo</th>
                          <th className="text-right px-4 py-2 font-semibold">Custo KM</th>
                          <th className="text-right px-4 py-2 font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...matrizCustos].sort((a, b) => `${a.cto}::${a.grupo}`.localeCompare(`${b.cto}::${b.grupo}`)).map((rule) => (
                          <tr key={rule.id} className="border-t border-slate-100 hover:bg-slate-50">
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
                            <td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm">Nenhuma regra manual cadastrada.</td>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {tabKpis.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${card.color}`} />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</span>
                </div>
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                <div className="text-xs text-slate-400 font-medium">{card.sub}</div>
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
                  <tr><td colSpan={allCols.length} className="text-center py-16 text-slate-400">
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
                      // total for idadeEmMeses was computed as average in colTotals
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

      </div>
    </div>
  );
}
