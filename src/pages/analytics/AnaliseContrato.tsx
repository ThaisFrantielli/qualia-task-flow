import { useEffect, useMemo, useState, useRef, useTransition } from 'react';
import useBIData from '@/hooks/useBIData';
import useBIDataBatch, { getBatchTable } from '@/hooks/useBIDataBatch';
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
import { useAuth } from '@/contexts/AuthContext';
import { useAnalyticsPageAccess } from '@/hooks/useAnalyticsAccess';

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

interface ItensOrdemServicoRow {
  [key: string]: unknown;
  IdItemOrdemServico?: string|number;
  iditemordemservico?: string|number;
  IdVeiculo?: string|number;
  idveiculo?: string|number;
  IdContratoLocacao?: string|number;
  idcontratolocacao?: string|number;
  IdContratoComercial?: string|number;
  idcontratocomercial?: string|number;
  ContratoComercial?: string|number;
  contratocomercial?: string|number;
  IdOrdemServico?: string|number;
  idordemservico?: string|number;
  OrdemServico?: string|number;
  ordemservico?: string|number;
  OS?: string|number;
  NumeroOS?: string|number;
  numeroos?: string|number;
  IdOcorrencia?: string|number;
  idocorrencia?: string|number;
  Ocorrencia?: string;
  ocorrencia?: string;
  NumeroOcorrencia?: string|number;
  numeroocorrencia?: string|number;
  Placa?: string;
  placa?: string;
  DataCriacaoOcorrencia?: string;
  DataCriacao?: string;
  CriadoEm?: string;
  DataServico?: string;
  DataAtualizacaoDados?: string;
  DescricaoItem?: string;
  descricaoitem?: string;
  Item?: string;
  item?: string;
  Descricao?: string;
  descricao?: string;
  GrupoDespesa?: string;
  grupodespesa?: string;
  TipoDespesa?: string;
  tipodespesa?: string;
  CategoriaDespesa?: string;
  NomeFornecedor?: string;
  nomefornecedor?: string;
  Fornecedor?: string;
  fornecedor?: string;
  Quantidade?: number|string;
  quantidade?: number|string;
  Qtd?: number|string;
  qtd?: number|string;
  ValorUnitario?: number|string;
  valorunitario?: number|string;
  ValorTotal?: number|string;
  valortotal?: number|string;
  ValorItem?: number|string;
  valoritem?: number|string;
  ValorReembolsavel?: number|string;
  valorreembolsavel?: number|string;
  ValorReembolsavelFatItens?: number|string;
  valorreembolsavelfatitens?: number|string;
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
  placa:string; modelo:string; grupo:string; kmAtual:number; odometroRetirada:number; indiceKm:string; classificacaoOdometro:string;
  idadeEmMeses:number; rodagemMedia:number; dataInicial:string; vencimentoContrato:string; cliente:string; contrato:string;
  mesesRestantesContrato:number; kmEstimadoFimContrato:number;
  prazoRestDays:number;
  sitLoc:string; sitCTO:string;
  tipoContrato:string;
  isCortesia:boolean;
  franquiaBanco:number; custoKmManual:number | null;
  passagemTotal:number; passagemIdeal:number; diferencaPassagem:number; pctPassagem:number;
  qtdOcorrenciasTotal:number; qtdOcorrenciasEfetivas:number; qtdOcorrenciasCanceladas:number; pctOcorrenciasCanceladas:number;
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
  qtdOsComItens:number;
  qtdItensOs:number;
  qtdTiposItensOs:number;
  totalItensOsValor:number;
  totalItensOsReemb:number;
  custoLiqItensOs:number;
  ticketMedioOsComItens:number;
  custoMedioItemOs:number;
  pctRecuperacaoItensOs:number;
  pctItensOsFat:number;
  years: Record<number, { pass:number; man:number; reembMan:number; sin:number; reembSin:number; fat:number; }>;
}

interface MaintDetailRow {
  osId: string;
  ocorrencia: string;
  date: Date | null;
  tipo: string;
  motivo: string;
  situacao: string;
  valorTotal: number;
  valorReembolsavel: number;
}

interface MaintDetailResumoRow {
  tipo: string;
  totalOs: number;
  canceladas: number;
  valorTotal: number;
  valorReembolsavel: number;
  pctRecuperacao: number;
}

interface FaturamentoDetailRow {
  ano: number;
  mes: number;
  valor: number;
  descricao: string;
}

interface ItemOsDetailRow {
  osId: string;
  ocorrencia: string;
  date: Date | null;
  itemDescricao: string;
  grupoDespesa: string;
  fornecedor: string;
  quantidade: number;
  valorTotal: number;
  valorReembolsavel: number;
}

type EstimativaManutencaoTipo = 'PREVENTIVA' | 'CORRETIVA';
type ItemTrocaRegraKey = 'AMORTECEDOR' | 'DISCO_FREIO' | 'EMBREAGEM' | 'PASTILHA' | 'PNEU';

interface ItemTrocaAlertRuleConfig {
  id: string;
  label: string;
  intervaloKm: number;
  termos: string[];
  enabled: boolean;
  source: 'default' | 'custom';
}

interface ItemOsEstimativaRow {
  placa: string;
  modelo: string;
  grupo: string;
  kmAtual: number;
  ultimoEventoTipo: EstimativaManutencaoTipo | '—';
  ultimoEventoData: Date | null;
  diasSemEvento: number;
  proximoTipo: EstimativaManutencaoTipo;
  probabilidade: number;
  proximaData: Date | null;
  diasAteProximo: number;
  intervaloDias: number;
  custoEstimado: number;
  custoP25: number;
  custoP75: number;
  eventosTipo: number;
  eventosTotais: number;
  metodoCusto: 'PLACA' | 'COORTE' | 'GLOBAL';
  confianca: number;
  alerta: string;
}

interface ItemOsStatusPlacaRow {
  placa: string;
  modelo: string;
  kmAtual: number;
  ultimaRevisao: string;
  proximoEvento: string;
  proximoItem: string;
  proximoEventoData: Date | null;
  diasAteProximo: number;
  kmParaProxima: number;
  itensMonitorados: number;
  itensComTroca: number;
  itensVencidos: number;
  trocasPrecoces: number;
  itensSemHistorico: number;
  riscoNivel: 'ALTO' | 'MEDIO' | 'BAIXO';
  riscoScore: number;
  alertaPrincipal: string;
  alertas: string[];
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

const ANALISE_CONTRATO_DATA_STALE_TIME = 30 * 60 * 1000;
const MANUAL_RULES_CACHE_TTL = 30 * 60 * 1000;
const ALERT_RULES_STORAGE_KEY = 'analise_contrato_itens_alerta_por_grupo_modelo_v1';
const ALERT_RULE_SCOPE_ALL = '__ALL__';
let manualRulesCache: { data: ManualCostRule[]; timestamp: number } | null = null;

type CtoListSortKey = 'cto' | 'cliente' | 'veiculos' | 'kmMedio' | 'faturamento' | 'custoLiquido' | 'pctRecuperacao' | 'impactoLiqFat' | 'status';

type DetailMode = 'manutencao' | 'sinistro' | 'mansin' | 'faturamento' | 'itensos';

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
const ODOMETRO_BUCKET_SIZE = 10000;
const ODOMETRO_BUCKET_MAX = 120000;
const classifyOdometro = (km:number) => {
  if (!isFinite(km) || km <= 0) return 'Sem odômetro';
  if (km < ODOMETRO_BUCKET_SIZE) return '< 10.000';
  if (km >= ODOMETRO_BUCKET_MAX) return `${ODOMETRO_BUCKET_MAX.toLocaleString('pt-BR')}+`;
  const start = Math.floor(km / ODOMETRO_BUCKET_SIZE) * ODOMETRO_BUCKET_SIZE;
  const end = start + ODOMETRO_BUCKET_SIZE - 1;
  return `${start.toLocaleString('pt-BR')} - ${end.toLocaleString('pt-BR')}`;
};
const getOdometroBucketOrder = (label:string) => {
  if (!label) return Number.MAX_SAFE_INTEGER;
  if (label === 'Sem odômetro') return -1;
  if (label === '< 10.000') return 0;
  if (label.endsWith('+')) {
    const raw = Number(label.replace(/[^\d]/g, ''));
    return isFinite(raw) ? raw : Number.MAX_SAFE_INTEGER;
  }
  const [startRaw] = label.split('-');
  const start = Number(String(startRaw || '').replace(/[^\d]/g, ''));
  return isFinite(start) ? start : Number.MAX_SAFE_INTEGER;
};
const getYear = (d:string) => { if(!d||d.length<4) return 0; const y=parseInt(d.substring(0,4)); return isNaN(y)?0:y; };
const monthsDiff = (from:string) => { if(!from) return 0; const d=new Date(from); const n=new Date(); return Math.max(0,(n.getFullYear()-d.getFullYear())*12+(n.getMonth()-d.getMonth())); };
const monthsUntil = (to:string) => { if(!to) return 0; const d=new Date(to); if(isNaN(d.getTime())) return 0; const n=new Date(); return Math.max(0,(d.getFullYear()-n.getFullYear())*12+(d.getMonth()-n.getMonth())); };
const normalizeKeyPart = (v: string) => String(v || '').trim().toUpperCase();
const normalizePlate = (v: unknown) => String(v || '').trim().toUpperCase();
const canonicalPlate = (v: unknown) => normalizePlate(v).replace(/[^A-Z0-9]/g, '');
const normalizeMaintenanceOsId = (v: unknown) => String(v ?? '').replace(/\s+/g, '').trim();
const normalizeDisplayOsId = (v: unknown) => {
  const raw = normalizeMaintenanceOsId(v || '').toUpperCase();
  if (!raw) return '';
  let core = raw;
  if (core.startsWith('OS-')) return core;
  if (core.startsWith('OS')) core = core.slice(2);
  core = core.replace(/^[-_:/\s]+/, '');
  return core ? `OS-${core}` : '';
};
const normalizeDisplayOccurrence = (v: unknown) => {
  const raw = String(v ?? '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/\s+/g, '').toUpperCase();
  const match = normalized.match(/QUAL-?([A-Z0-9]+)/i);
  if (match && match[1]) return `QUAL-${match[1].toUpperCase()}`;
  return normalized;
};
const getMaintenanceStatusText = (row: Record<string, unknown>) => String(
  row.SituacaoOcorrencia
  || row.StatusOcorrencia
  || row.Situacao
  || row.Status
  || row.StatusOrdem
  || row.SituacaoOrdemServico
  || row.situacaoordemservico
  || row.SituacaoOS
  || ''
).trim();
const isCancelledStatus = (statusRaw: unknown) => String(statusRaw || '').toLowerCase().includes('cancel');
const getMaintenanceOccurrenceKey = (row: Record<string, unknown>, fallback?: unknown) => {
  const occurrenceId = normalizeMaintenanceOsId(row.IdOcorrencia || row.idocorrencia || '').toUpperCase();
  if (occurrenceId) return `ID:${occurrenceId}`;

  const occurrenceCode = normalizeDisplayOccurrence(
    row.Ocorrencia || row.ocorrencia || row.NumeroOcorrencia || row.numeroocorrencia || ''
  );
  if (occurrenceCode) return `OCC:${occurrenceCode}`;

  const fallbackKey = normalizeMaintenanceOsId(fallback || '').toUpperCase();
  return fallbackKey ? `FB:${fallbackKey}` : '';
};
const getMaintenanceOccurrenceLookupKeys = (row: Record<string, unknown>, fallback?: unknown) => {
  const keys = new Set<string>();

  const idRaw = normalizeMaintenanceOsId(row.IdOcorrencia || row.idocorrencia || '').toUpperCase();
  if (idRaw) {
    keys.add(`ID:${idRaw}`);
    const digitsOnly = idRaw.replace(/\D+/g, '');
    if (digitsOnly) keys.add(`ID:${digitsOnly}`);
  }

  const occurrenceCode = normalizeDisplayOccurrence(
    row.Ocorrencia || row.ocorrencia || row.NumeroOcorrencia || row.numeroocorrencia || ''
  );
  if (occurrenceCode) keys.add(`OCC:${occurrenceCode}`);

  const fallbackKey = getMaintenanceOccurrenceKey(row, fallback);
  if (fallbackKey) keys.add(fallbackKey);

  return Array.from(keys);
};
const getPlateOccurrenceScopedKey = (plate: unknown, occurrenceKey: string) => {
  const plateKey = canonicalPlate(plate || '');
  if (!plateKey || !occurrenceKey) return '';
  return `PLATE:${plateKey}::${occurrenceKey}`;
};
const getMaintenanceOccurrenceDisplay = (row: Record<string, unknown>) => normalizeDisplayOccurrence(
  row.Ocorrencia || row.ocorrencia || row.NumeroOcorrencia || row.numeroocorrencia || row.IdOcorrencia || row.idocorrencia || ''
);
const getMaintenanceOrderDisplay = (row: Record<string, unknown>) => normalizeDisplayOsId(
  row.IdOrdemServico || row.idordemservico || row.OrdemServico || row.ordemservico || row.OS || row.NumeroOS || row.numeroos || ''
);
const formatOrderDisplayList = (orders: Iterable<string>) => {
  const unique = Array.from(new Set(Array.from(orders).map(v => String(v || '').trim()).filter(Boolean)));
  return unique.join(', ');
};
const makeRuleKey = (cto: string, grupo: string) => `${normalizeKeyPart(cto)}::${normalizeKeyPart(grupo)}`;
const makeBancoRuleKey = (cto: string, grupo: string, regra: string) => `${normalizeKeyPart(cto)}::${normalizeKeyPart(grupo)}::${normalizeKeyPart(regra)}`;
const makeBancoRuleKeyGeneric = (cto: string, regra: string) => `${normalizeKeyPart(cto)}::${normalizeKeyPart(regra)}`;
const buildAlertRuleScopeKey = (grupoRaw: string, modeloRaw: string, applyAll = false) => {
  if (applyAll) return ALERT_RULE_SCOPE_ALL;
  const grupo = normalizeKeyPart(grupoRaw);
  const modelo = normalizeKeyPart(modeloRaw);
  if (!grupo || !modelo) return '';
  return `${grupo}::${modelo}`;
};
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

const getItemOsDate = (row: Record<string, unknown>): Date | null => {
  return parseDateFlexible(
    row.DataCriacaoOcorrencia
    || row.DataCriacao
    || row.CriadoEm
    || row.DataServico
    || row.DataAtualizacaoDados
    || ''
  );
};

const getItemOsQuantity = (row: Record<string, unknown>): number => {
  const qty = parseNum(row.Quantidade || row.quantidade || row.Qtd || row.qtd || 0);
  if (!isFinite(qty) || qty <= 0) return 1;
  return qty;
};

const getItemOsCost = (row: Record<string, unknown>): number => {
  const direct = parseNum(
    row.ValorTotal
    || row.valortotal
    || row.ValorItem
    || row.valoritem
    || row.CustoTotalItem
    || row.custototalitem
    || row.ValorServico
    || row.valorservico
    || 0
  );
  if (direct !== 0) return direct;

  const qty = getItemOsQuantity(row);
  const unit = parseNum(row.ValorUnitario || row.valorunitario || row.PrecoUnitario || row.precounitario || 0);
  return qty * unit;
};

const getItemOsReembolso = (row: Record<string, unknown>): number => {
  return parseNum(
    row.ValorReembolsavelFatItens
    || row.valorreembolsavelfatitens
    || row.ValorReembolsavel
    || row.valorreembolsavel
    || row.ValorReembolsado
    || row.valorreembolsado
    || row.ValorRecuperado
    || row.valorrecuperado
    || 0
  );
};

const getItemOsEventKm = (row: Record<string, unknown>): number => {
  const km = parseNum(
    row.KmConfirmado
    || row.kmconfirmado
    || row.KmAtual
    || row.kmatual
    || row.KmInformado
    || row.kminformado
    || row.KM
    || row.km
    || row.OdometroConfirmado
    || row.odometroconfirmado
    || row.OdometroAtual
    || row.odometroatual
    || row.Odometro
    || row.odometro
    || row.Hodometro
    || row.hodometro
    || row.Quilometragem
    || row.quilometragem
    || row.KMEvento
    || row.kmevento
    || row.KM_OS
    || row.km_os
    || 0
  );

  return Number.isFinite(km) && km > 0 ? km : Number.NaN;
};

const getItemOsDescription = (row: Record<string, unknown>) => String(
  row.DescricaoItem
  || row.descricaoitem
  || row.Item
  || row.item
  || row.Descricao
  || row.descricao
  || row.NomePeca
  || row.nomepeca
  || 'Item sem descrição'
).trim();

const getItemOsFornecedor = (row: Record<string, unknown>) => String(
  row.NomeFornecedor
  || row.nomefornecedor
  || row.Fornecedor
  || row.fornecedor
  || row.NomeOficina
  || row.nomeoficina
  || row.Parceiro
  || row.parceiro
  || 'Não informado'
).trim();

const getItemOsGrupoDespesa = (row: Record<string, unknown>) => String(
  row.GrupoDespesa
  || row.grupodespesa
  || row.TipoDespesa
  || row.tipodespesa
  || row.CategoriaDespesa
  || row.categoriadespesa
  || row.NaturezaDespesa
  || row.naturezadespesa
  || row.TipoItem
  || row.tipoitem
  || 'Sem grupo'
).trim();

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const diffDays = (later: Date, earlier: Date) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((later.getTime() - earlier.getTime()) / msPerDay);
};

const addDays = (base: Date, days: number) => {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const average = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
};

const stdDev = (values: number[]) => {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = values.reduce((acc, value) => acc + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
};

const quantile = (values: number[], q: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * clamp(q, 0, 1);
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  if (next == null) return sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
};

const getMaintenanceEventDate = (row: Record<string, unknown>): Date | null => parseDateFlexible(
  row.OrdemServicoCriadaEm
  || row.DataCriacao
  || row.DataEntrada
  || row.DataCriacaoOS
  || row.DataServico
  || row.DataAtualizacaoDados
  || ''
);

const classifyMaintenanceEstimateType = (row: Record<string, unknown>): EstimativaManutencaoTipo | null => {
  const fullText = [
    row.TipoManutencao,
    row.Tipo,
    row.TipoOcorrencia,
    row.Motivo,
    row.MotivoOcorrencia,
    row.Observacao,
    row.Descricao,
  ].map((value) => String(value || '').toLowerCase()).join(' ');

  if (/(prevent|revis|programad|inspec|troca\s+de\s+oleo)/.test(fullText)) return 'PREVENTIVA';
  if (/(corret|pane|quebra|avaria|emerg|defeit|reparo)/.test(fullText)) return 'CORRETIVA';
  return null;
};

const normalizeAlertRuleText = (value: string) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const sanitizeAlertRuleTerms = (terms: string[]) => {
  const normalized = terms
    .map(term => normalizeAlertRuleText(term))
    .filter(Boolean)
    .filter(term => term.length >= 2);
  return Array.from(new Set(normalized));
};

const buildTermsFromLabel = (label: string) => {
  const normalized = normalizeAlertRuleText(label);
  if (!normalized) return [];
  const tokenTerms = normalized
    .split(' ')
    .map(term => term.trim())
    .filter(term => term.length >= 3);
  return sanitizeAlertRuleTerms([normalized, ...tokenTerms]);
};

const buildCustomAlertRuleId = (label: string) => {
  const base = normalizeAlertRuleText(label).replace(/\s+/g, '_').slice(0, 32) || 'item_alerta';
  return `${base}_${Date.now().toString(36)}`;
};

const ITEM_TROCA_REGRAS_PADRAO: Array<{ key: ItemTrocaRegraKey; label: string; intervaloKm: number; termos: string[] }> = [
  { key: 'AMORTECEDOR', label: 'Amortecedor', intervaloKm: 60000, termos: ['amortecedor', 'amortecedores', 'coxim amortecedor', 'kit amortecedor'] },
  { key: 'DISCO_FREIO', label: 'Disco de freio', intervaloKm: 40000, termos: ['disco de freio', 'disco freio'] },
  { key: 'EMBREAGEM', label: 'Embreagem', intervaloKm: 60000, termos: ['embreagem', 'kit embreagem', 'plato embreagem', 'atuador embreagem'] },
  { key: 'PASTILHA', label: 'Pastilha de freio', intervaloKm: 20000, termos: ['pastilha freio', 'pastilha de freio', 'jogo pastilha'] },
  { key: 'PNEU', label: 'Pneu', intervaloKm: 40000, termos: ['pneu', 'pneus'] },
];

const buildDefaultItemAlertRules = (): ItemTrocaAlertRuleConfig[] => {
  return ITEM_TROCA_REGRAS_PADRAO.map((rule) => ({
    id: rule.key,
    label: rule.label,
    intervaloKm: rule.intervaloKm,
    termos: sanitizeAlertRuleTerms(rule.termos.length ? rule.termos : [rule.label]),
    enabled: true,
    source: 'default' as const,
  }));
};

const getSanitizedAlertRule = (raw: unknown): ItemTrocaAlertRuleConfig | null => {
  const row = raw as Record<string, unknown>;
  const label = String(row?.label || '').trim();
  const intervaloKm = Math.max(0, Math.round(parseNum(row?.intervaloKm)));
  if (!label || !intervaloKm) return null;

  const termosRaw = Array.isArray(row?.termos)
    ? row.termos.map(term => String(term || ''))
    : [];
  const termos = sanitizeAlertRuleTerms(termosRaw.length ? termosRaw : buildTermsFromLabel(label));

  return {
    id: String(row?.id || '').trim() || buildCustomAlertRuleId(label),
    label,
    intervaloKm,
    termos,
    enabled: row?.enabled !== false,
    source: row?.source === 'default' ? 'default' : 'custom',
  };
};

const parseAlertRulesByScopeStorage = (raw: string | null): Record<string, ItemTrocaAlertRuleConfig[]> => {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};

    const output: Record<string, ItemTrocaAlertRuleConfig[]> = {};
    for (const [scopeKeyRaw, value] of Object.entries(parsed)) {
      const scopeKey = String(scopeKeyRaw || '').trim();
      if (!scopeKey) continue;
      if (!Array.isArray(value)) continue;

      const rules = value
        .map(getSanitizedAlertRule)
        .filter((rule): rule is ItemTrocaAlertRuleConfig => !!rule);

      output[scopeKey] = rules;
    }

    return output;
  } catch {
    return {};
  }
};

const doesDescricaoMatchAlertRule = (descricaoNormalizada: string, rule: ItemTrocaAlertRuleConfig) => {
  const terms = sanitizeAlertRuleTerms(rule.termos.length ? rule.termos : buildTermsFromLabel(rule.label));
  if (!terms.length) return false;
  return terms.some(term => descricaoNormalizada.includes(term));
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

const getIdCols = (kmRedThreshold: number): ColDef[] => [
  { key:'cliente',     label:'Cliente',      fmt:r=>r.cliente,     align:'left',  w:60, sortGetter: r=>r.cliente },
  { key:'contrato',    label:'CTO',          fmt:r=>r.contrato,    align:'left',  w:95, sortGetter: r=>r.contrato },
  { key:'placa',       label:'Placa',        fmt:r=>r.placa,       align:'left',  w:105, sortGetter: r=>r.placa },
  { key:'modelo',      label:'Modelo',       fmt:r=>r.modelo,      align:'left',  w:170, sortGetter: r=>r.modelo },
  { key:'grupo',       label:'Grupo',        fmt:r=>r.grupo,       align:'left',  w:120, sortGetter: r=>r.grupo },
  { key:'odometroRetirada', label:'Odômetro Retirada', fmt:r=>r.odometroRetirada>0?r.odometroRetirada.toLocaleString('pt-BR'):'—', align:'right', w:120, sortGetter: r=>r.odometroRetirada },
  { key:'kmAtual',     label:'KM',           fmt:r=>r.kmAtual>0?r.kmAtual.toLocaleString('pt-BR'):'—', cls:r=>r.kmAtual > kmRedThreshold ? 'text-red-600 font-medium' : 'text-slate-700', align:'right', w:80, sortGetter: r=>r.kmAtual },
  { key:'idadeEmMeses',label:'Idade (meses)',fmt:r=>fmtInt(r.idadeEmMeses), align:'right', w:80, sortGetter: r=>r.idadeEmMeses },
  { key:'kmPrecificado',label:'Km Precificado',fmt:r=>r.custoKmManual == null ? '—' : fmtBRL(r.custoKmManual), align:'right', w:110, sortGetter: r=>r.custoKmManual ?? -1 },
];

function MaintDetailModal(props: {
  open: boolean;
  placa: string;
  rows: MaintDetailRow[] | FaturamentoDetailRow[] | ItemOsDetailRow[];
  resumoPorTipo?: MaintDetailResumoRow[];
  mode: DetailMode;
  onClose: () => void;
}) {
  const { open, placa, rows, resumoPorTipo = [], mode, onClose } = props;
  if (!open) return null;

  const isFaturamento = mode === 'faturamento';
  const isItensOs = mode === 'itensos';
  const isManutencao = mode === 'manutencao';
  
  // Adapta cálculos para os dois tipos de dados
  let total = 0, totalReemb = 0;
  if (isFaturamento) {
    total = (rows as FaturamentoDetailRow[]).reduce((acc, r) => acc + (Number(r.valor) || 0), 0);
    totalReemb = 0; // Faturamento não tem reembolso
  } else if (isItensOs) {
    total = (rows as ItemOsDetailRow[]).reduce((acc, r) => acc + (Number(r.valorTotal) || 0), 0);
    totalReemb = (rows as ItemOsDetailRow[]).reduce((acc, r) => acc + (Number(r.valorReembolsavel) || 0), 0);
  } else {
    total = (rows as MaintDetailRow[]).reduce((acc, r) => acc + (Number(r.valorTotal) || 0), 0);
    totalReemb = (rows as MaintDetailRow[]).reduce((acc, r) => acc + (Number(r.valorReembolsavel) || 0), 0);
  }

  const resumoItens = isItensOs
    ? (() => {
        const itemRows = rows as ItemOsDetailRow[];
        const totalItens = itemRows.reduce((acc, r) => acc + (Number(r.quantidade) || 0), 0);
        const totalOs = new Set(itemRows.map(r => String(r.osId || '').trim()).filter(Boolean)).size;
        return { totalItens, totalOs };
      })()
    : { totalItens: 0, totalOs: 0 };

  const resumoItensPorGrupo = isItensOs
    ? (() => {
        const groups = new Map<string, { grupo: string; valor: number; reemb: number; qtd: number; os: Set<string> }>();
        for (const row of rows as ItemOsDetailRow[]) {
          const grupo = String(row.grupoDespesa || '').trim() || 'Sem grupo';
          const key = grupo.toUpperCase();
          let rec = groups.get(key);
          if (!rec) {
            rec = { grupo, valor: 0, reemb: 0, qtd: 0, os: new Set<string>() };
            groups.set(key, rec);
          }
          rec.valor += Number(row.valorTotal) || 0;
          rec.reemb += Number(row.valorReembolsavel) || 0;
          rec.qtd += Number(row.quantidade) || 0;
          if (row.osId) rec.os.add(row.osId);
        }

        return Array.from(groups.values())
          .map(item => ({
            ...item,
            osQtd: item.os.size,
            pctReembolso: item.valor > 0 ? item.reemb / item.valor : 0,
          }))
          .sort((a, b) => b.valor - a.valor || b.qtd - a.qtd || a.grupo.localeCompare(b.grupo));
      })()
    : [];

  const modeMeta = isFaturamento
    ? { title: 'Histórico de Faturamento', subtitle: 'Detalhamento de faturamento por ano e mês', countLabel: 'Registros' }
    : isItensOs
      ? { title: 'Extrato de Itens de OS', subtitle: 'Detalhamento de itens por ordem de serviço e ocorrência', countLabel: 'Itens' }
    : mode === 'sinistro'
      ? { title: 'Extrato de Sinistros', subtitle: 'Detalhamento de eventos de sinistro por placa', countLabel: 'Sinistros' }
      : mode === 'mansin'
        ? { title: 'Extrato de Manutenção + Sinistro', subtitle: 'Detalhamento consolidado por placa', countLabel: 'Eventos' }
        : { title: 'Extrato de Manutenções', subtitle: 'Detalhamento de ocorrências e ordens de serviço por placa', countLabel: 'Ocorrências' };

  const totalCanceladas = isManutencao
    ? resumoPorTipo.reduce((acc, item) => acc + (Number(item.canceladas) || 0), 0)
    : 0;
  const ocorrenciasEfetivas = isManutencao ? Math.max(0, rows.length - totalCanceladas) : 0;
  const pctCancelamento = isManutencao && rows.length > 0 ? totalCanceladas / rows.length : 0;

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
          {isItensOs && <div className="text-slate-600">OS com itens: <span className="font-semibold text-indigo-700">{resumoItens.totalOs.toLocaleString('pt-BR')}</span></div>}
          {isItensOs && <div className="text-slate-600">Quantidade total: <span className="font-semibold text-slate-900">{fmtNum(resumoItens.totalItens)}</span></div>}
          {isManutencao && <div className="text-slate-600">Ocorrências Efetivas: <span className="font-semibold text-emerald-700">{ocorrenciasEfetivas.toLocaleString('pt-BR')}</span></div>}
          {isManutencao && <div className="text-slate-600">% Cancelamento: <span className={`font-semibold ${pctCancelamento > 0.35 ? 'text-rose-700' : 'text-amber-700'}`}>{fmtPct(pctCancelamento)}</span> <span className="text-slate-500">({totalCanceladas.toLocaleString('pt-BR')} canceladas)</span></div>}
          <div className="text-slate-600">Total Acumulado: <span className="font-semibold text-slate-900">{fmtBRLZero(total)}</span></div>
          {!isFaturamento && <div className="text-slate-600">Total Reembolsável: <span className="font-semibold text-slate-900">{fmtBRLZero(totalReemb)}</span> <span className="text-slate-500">({fmtPct(total > 0 ? totalReemb / total : 0)})</span></div>}
        </div>

        {isManutencao && resumoPorTipo.length > 0 && (
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Resumo por tipo</h4>
                <p className="text-[11px] text-slate-500">Inclui ocorrências canceladas, valor total, reembolsável e recuperação por tipo.</p>
              </div>
              <div className="text-xs text-slate-500">{resumoPorTipo.length.toLocaleString('pt-BR')} tipo(s)</div>
            </div>
            <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-slate-200">Tipo</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">Ocorrências</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">Canceladas</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">Valor Total</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">Valor Reembolsável</th>
                    <th className="text-right px-3 py-2 border-b border-slate-200">% Recuperação</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoPorTipo.map((item, index) => (
                    <tr key={`${item.tipo}-${index}`} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/60">
                      <td className="px-3 py-2 text-slate-700 font-medium">{item.tipo}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{item.totalOs.toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{item.canceladas.toLocaleString('pt-BR')}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{fmtBRLZero(item.valorTotal)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{fmtBRLZero(item.valorReembolsavel)}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{fmtPct(item.pctRecuperacao)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 text-slate-700">
                  {(() => {
                    const totalOs = resumoPorTipo.reduce((acc, item) => acc + item.totalOs, 0);
                    const totalCanceladas = resumoPorTipo.reduce((acc, item) => acc + item.canceladas, 0);
                    const totalValor = resumoPorTipo.reduce((acc, item) => acc + item.valorTotal, 0);
                    const totalReembolsavel = resumoPorTipo.reduce((acc, item) => acc + item.valorReembolsavel, 0);
                    const pctRecuperacao = totalValor > 0 ? totalReembolsavel / totalValor : 0;
                    return (
                      <tr className="font-semibold">
                        <td className="px-3 py-2 text-slate-800">Total</td>
                        <td className="px-3 py-2 text-right">{totalOs.toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-2 text-right">{totalCanceladas.toLocaleString('pt-BR')}</td>
                        <td className="px-3 py-2 text-right">{fmtBRLZero(totalValor)}</td>
                        <td className="px-3 py-2 text-right">{fmtBRLZero(totalReembolsavel)}</td>
                        <td className="px-3 py-2 text-right">{fmtPct(pctRecuperacao)}</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {isItensOs && resumoItensPorGrupo.length > 0 && (
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-700">Visão em coluna por grupo de despesa</h4>
                <p className="text-[11px] text-slate-500">Cada coluna representa um grupo de despesa com totais e percentual de reembolso.</p>
              </div>
              <div className="text-xs text-slate-500">{resumoItensPorGrupo.length.toLocaleString('pt-BR')} grupo(s)</div>
            </div>
            <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-slate-200">Métrica</th>
                    {resumoItensPorGrupo.map(item => (
                      <th key={`grp-col-${item.grupo}`} className="text-right px-3 py-2 border-b border-slate-200">{item.grupo}</th>
                    ))}
                    <th className="text-right px-3 py-2 border-b border-slate-200">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const totalValor = resumoItensPorGrupo.reduce((acc, item) => acc + item.valor, 0);
                    const totalReemb = resumoItensPorGrupo.reduce((acc, item) => acc + item.reemb, 0);
                    const totalQtd = resumoItensPorGrupo.reduce((acc, item) => acc + item.qtd, 0);
                    const totalOs = resumoItensPorGrupo.reduce((acc, item) => acc + item.osQtd, 0);
                    const totalPct = totalValor > 0 ? totalReemb / totalValor : 0;

                    return (
                      <>
                        <tr className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium text-slate-700">Custo</td>
                          {resumoItensPorGrupo.map(item => <td key={`grp-cost-${item.grupo}`} className="px-3 py-2 text-right text-slate-700">{fmtBRLZero(item.valor)}</td>)}
                          <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmtBRLZero(totalValor)}</td>
                        </tr>
                        <tr className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium text-slate-700">Reembolso</td>
                          {resumoItensPorGrupo.map(item => <td key={`grp-reemb-${item.grupo}`} className="px-3 py-2 text-right text-emerald-700">{fmtBRLZero(item.reemb)}</td>)}
                          <td className="px-3 py-2 text-right font-semibold text-emerald-700">{fmtBRLZero(totalReemb)}</td>
                        </tr>
                        <tr className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium text-slate-700">% Reembolso</td>
                          {resumoItensPorGrupo.map(item => <td key={`grp-pct-${item.grupo}`} className="px-3 py-2 text-right text-slate-700">{fmtPct(item.pctReembolso)}</td>)}
                          <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmtPct(totalPct)}</td>
                        </tr>
                        <tr className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium text-slate-700">Qtd Itens</td>
                          {resumoItensPorGrupo.map(item => <td key={`grp-qtd-${item.grupo}`} className="px-3 py-2 text-right text-slate-700">{fmtNum(item.qtd)}</td>)}
                          <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmtNum(totalQtd)}</td>
                        </tr>
                        <tr className="odd:bg-white even:bg-slate-50/50">
                          <td className="px-3 py-2 font-medium text-slate-700">OS com Itens</td>
                          {resumoItensPorGrupo.map(item => <td key={`grp-os-${item.grupo}`} className="px-3 py-2 text-right text-slate-700">{fmtNum(item.osQtd)}</td>)}
                          <td className="px-3 py-2 text-right font-semibold text-slate-800">{fmtNum(totalOs)}</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="overflow-auto px-5 pt-0 pb-3" style={{ maxHeight: '64vh' }}>
          <table className="min-w-full text-xs border-collapse">
            <thead className="bg-slate-100">
              <tr>
                {isFaturamento ? (
                  <>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Ano</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Mês</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-right px-2 py-2 border-b border-slate-200">Valor</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Descrição</th>
                  </>
                ) : isItensOs ? (
                  <>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Ordem de Serviço</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Ocorrência</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Data</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Item</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Grupo de Despesa</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Fornecedor</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-right px-2 py-2 border-b border-slate-200">Qtd</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-right px-2 py-2 border-b border-slate-200">Valor Total</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-right px-2 py-2 border-b border-slate-200">Valor Reembolsável</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-right px-2 py-2 border-b border-slate-200">% Recup.</th>
                  </>
                ) : (
                  <>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Ordem de Serviço</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Ocorrência</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Data</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Tipo</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Motivo</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-left px-2 py-2 border-b border-slate-200">Situação</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-right px-2 py-2 border-b border-slate-200">Valor Total</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-right px-2 py-2 border-b border-slate-200">Valor Reembolsável</th>
                    <th className="sticky top-0 z-20 bg-slate-100 text-right px-2 py-2 border-b border-slate-200">% Recup.</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={isFaturamento ? 4 : isItensOs ? 10 : 9} className="px-2 py-8 text-center text-slate-400">
                    {isFaturamento
                      ? 'Nenhum faturamento encontrado para esta placa.'
                      : isItensOs
                        ? 'Nenhum item de OS encontrado para o período/regra aplicado.'
                        : 'Nenhuma ocorrência encontrada para o período/regra aplicado.'}
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
              ) : isItensOs ? (
                (rows as ItemOsDetailRow[]).map((r, i) => {
                  const pct = r.valorTotal > 0 ? r.valorReembolsavel / r.valorTotal : 0;
                  return (
                    <tr key={`it-${r.osId}-${r.itemDescricao}-${i}`} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/40">
                      <td className="px-2 py-1.5">{r.osId || '—'}</td>
                      <td className="px-2 py-1.5">{r.ocorrencia || '—'}</td>
                      <td className="px-2 py-1.5">{r.date ? r.date.toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-2 py-1.5 text-slate-700">{r.itemDescricao || '—'}</td>
                      <td className="px-2 py-1.5">{r.grupoDespesa || '—'}</td>
                      <td className="px-2 py-1.5">{r.fornecedor || '—'}</td>
                      <td className="px-2 py-1.5 text-right">{fmtNum(r.quantidade)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtBRLZero(r.valorTotal)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtBRLZero(r.valorReembolsavel)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtPct(pct)}</td>
                    </tr>
                  );
                })
              ) : (
                (rows as MaintDetailRow[]).map((r, i) => {
                  const pct = r.valorTotal > 0 ? r.valorReembolsavel / r.valorTotal : 0;
                  const isCanceled = String(r.situacao || '').toLowerCase().includes('cancel');
                  return (
                    <tr key={`${r.osId}-${i}`} className={`border-b border-slate-100 ${isCanceled ? 'bg-rose-50/70' : 'odd:bg-white even:bg-slate-50/40'}`}>
                      <td className="px-2 py-1.5">{r.osId || '—'}</td>
                      <td className="px-2 py-1.5">{r.ocorrencia || '—'}</td>
                      <td className="px-2 py-1.5">{r.date ? r.date.toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-2 py-1.5">{r.tipo || '—'}</td>
                      <td className="px-2 py-1.5">{r.motivo || '—'}</td>
                      <td className={`px-2 py-1.5 ${isCanceled ? 'text-rose-700 font-medium' : ''}`}>{r.situacao || '—'}</td>
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

const TABS = [
  { key:'passagem',   label:'Passagem',                icon:Route,       color:'bg-blue-600',   hdr:'bg-blue-700' },
  { key:'previsto',   label:'Custo Previsto × Real',   icon:Wrench,      color:'bg-amber-600',  hdr:'bg-amber-700' },
  { key:'manutencao', label:'Manutenção + Reembolso',  icon:Wrench,      color:'bg-orange-600', hdr:'bg-orange-700' },
  { key:'itensos',    label:'Itens de OS',             icon:BarChart3,   color:'bg-emerald-600',hdr:'bg-emerald-700' },
  { key:'sinistro',   label:'Sinistro + Reembolso',    icon:ShieldAlert, color:'bg-red-600',    hdr:'bg-red-700' },
  { key:'mansin',     label:'Man + Sinistro',          icon:BarChart3,   color:'bg-purple-600', hdr:'bg-purple-700' },
  { key:'faturamento',label:'Faturamento',             icon:DollarSign,  color:'bg-teal-600',   hdr:'bg-teal-700' },
  { key:'resumo',     label:'Resumo Contrato',         icon:Search,      color:'bg-slate-700',  hdr:'bg-slate-700' },
  { key:'listagemCto',label:'Listagem CTO',            icon:BarChart3,   color:'bg-slate-700',  hdr:'bg-slate-700' },
] as const;
type TabKey = typeof TABS[number]['key'];
const EXPORTABLE_TABS = TABS.filter(tab => tab.key !== 'resumo' && tab.key !== 'listagemCto');

const ANALISE_CONTRATO_UI_STATE_KEY = 'analise_contrato_ui_state_v1';

type PersistedAnaliseContratoUiState = {
  filterCliente: string[];
  filterCTO: string[];
  filterPlaca: string[];
  filterClassificacaoOdometro: string[];
  filterGrupoModelo: string[];
  filterVencimento: string[];
  filterTipoContrato: string[];
  filterSitCTO: string[];
  filterSitLoc: string[];
  sortKey: string;
  sortDir: 'asc' | 'desc';
  resumoFilters: Record<string, string[]>;
  resumoDetailSortKey: string;
  resumoDetailSortDir: 'asc' | 'desc';
  ctoListSortKey: string;
  ctoListSortDir: 'asc' | 'desc';
  resumoSearchTerm: string;
};

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item || '').trim()).filter(Boolean);
};

const sanitizeStringArrayMap = (value: unknown): Record<string, string[]> => {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, raw]) => [key, sanitizeStringArray(raw)])
  );
};

const loadPersistedAnaliseContratoUiState = (): PersistedAnaliseContratoUiState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ANALISE_CONTRATO_UI_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedAnaliseContratoUiState>;
    return {
      filterCliente: sanitizeStringArray(parsed.filterCliente),
      filterCTO: sanitizeStringArray(parsed.filterCTO),
      filterPlaca: sanitizeStringArray(parsed.filterPlaca),
      filterClassificacaoOdometro: sanitizeStringArray(parsed.filterClassificacaoOdometro),
      filterGrupoModelo: sanitizeStringArray(parsed.filterGrupoModelo),
      filterVencimento: sanitizeStringArray(parsed.filterVencimento),
      filterTipoContrato: sanitizeStringArray(parsed.filterTipoContrato),
      filterSitCTO: sanitizeStringArray(parsed.filterSitCTO),
      filterSitLoc: sanitizeStringArray(parsed.filterSitLoc),
      sortKey: typeof parsed.sortKey === 'string' && parsed.sortKey ? parsed.sortKey : 'cliente',
      sortDir: parsed.sortDir === 'desc' ? 'desc' : 'asc',
      resumoFilters: sanitizeStringArrayMap(parsed.resumoFilters),
      resumoDetailSortKey: typeof parsed.resumoDetailSortKey === 'string' && parsed.resumoDetailSortKey ? parsed.resumoDetailSortKey : 'placa',
      resumoDetailSortDir: parsed.resumoDetailSortDir === 'desc' ? 'desc' : 'asc',
      ctoListSortKey: typeof parsed.ctoListSortKey === 'string' && parsed.ctoListSortKey ? parsed.ctoListSortKey : 'cto',
      ctoListSortDir: parsed.ctoListSortDir === 'desc' ? 'desc' : 'asc',
      resumoSearchTerm: typeof parsed.resumoSearchTerm === 'string' ? parsed.resumoSearchTerm : '',
    };
  } catch {
    return null;
  }
};

// ── Main Component ───────────────────────────────────────────────
export default function AnaliseContrato() {
  type ExportScope = 'all' | 'single';
  type ExportFormat = 'pdf' | 'xlsx';
  type PrintLayout = 'full' | 'summary';

  const persistedUiStateRef = useRef(loadPersistedAnaliseContratoUiState());
  const uiStatePersistedRef = useRef(Boolean(persistedUiStateRef.current));

  const [activeTab, setActiveTab] = useState<TabKey>('passagem');
  const [isTabSwitchPending, startTabSwitchTransition] = useTransition();
  const [showTabHelp, setShowTabHelp] = useState(false);
  const [showYearDetailByTab, setShowYearDetailByTab] = useState<Record<TabKey, boolean>>({
    passagem: false,
    previsto: true,
    manutencao: false,
    itensos: false,
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
  const [kmRedThreshold, setKmRedThreshold] = useState<number>(70000);
  const [kmRedThresholdInput, setKmRedThresholdInput] = useState('70.000');
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
  const [alertRulesByScope, setAlertRulesByScope] = useState<Record<string, ItemTrocaAlertRuleConfig[]>>(() => {
    if (typeof window === 'undefined') return {};
    return parseAlertRulesByScopeStorage(window.localStorage.getItem(ALERT_RULES_STORAGE_KEY));
  });
  const [alertRuleGrupo, setAlertRuleGrupo] = useState('');
  const [alertRuleModelo, setAlertRuleModelo] = useState('');
  const [alertRuleApplyAll, setAlertRuleApplyAll] = useState(false);
  const [alertRuleLabel, setAlertRuleLabel] = useState('');
  const [alertRuleKm, setAlertRuleKm] = useState('');
  const [alertRuleTerms, setAlertRuleTerms] = useState('');
  const [editingAlertRuleId, setEditingAlertRuleId] = useState<string | null>(null);
  const [alertRulesError, setAlertRulesError] = useState<string | null>(null);
  const { user } = useAuth();
  const { hasAccess: hasAnalyticsAccess } = useAnalyticsPageAccess('analise-contrato');
  const canEditRules = !!hasAnalyticsAccess || !!user?.permissoes?.is_admin;
  const [filterCliente, setFilterCliente] = useState<string[]>(() => persistedUiStateRef.current?.filterCliente ?? []);
  const [filterCTO, setFilterCTO] = useState<string[]>(() => persistedUiStateRef.current?.filterCTO ?? []);
  const [filterPlaca, setFilterPlaca] = useState<string[]>(() => persistedUiStateRef.current?.filterPlaca ?? []);
  const [filterClassificacaoOdometro, setFilterClassificacaoOdometro] = useState<string[]>(() => persistedUiStateRef.current?.filterClassificacaoOdometro ?? []);
  const [filterGrupoModelo, setFilterGrupoModelo] = useState<string[]>(() => persistedUiStateRef.current?.filterGrupoModelo ?? []);
  const [filterVencimento, setFilterVencimento] = useState<string[]>(() => persistedUiStateRef.current?.filterVencimento ?? []);
  const [filterTipoContrato, setFilterTipoContrato] = useState<string[]>(() => persistedUiStateRef.current?.filterTipoContrato ?? []);
  const [filterSitCTO, setFilterSitCTO] = useState<string[]>(() => persistedUiStateRef.current?.filterSitCTO ?? []);
  const [filterSitLoc, setFilterSitLoc] = useState<string[]>(() => persistedUiStateRef.current?.filterSitLoc ?? []);

  const [sortKey, setSortKey] = useState<string>(() => persistedUiStateRef.current?.sortKey || 'cliente');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>(() => persistedUiStateRef.current?.sortDir === 'desc' ? 'desc' : 'asc');
  const [resumoDetailSortKey, setResumoDetailSortKey] = useState<string>(() => persistedUiStateRef.current?.resumoDetailSortKey || 'placa');
  const [resumoDetailSortDir, setResumoDetailSortDir] = useState<'asc'|'desc'>(() => persistedUiStateRef.current?.resumoDetailSortDir === 'desc' ? 'desc' : 'asc');
  const [resumoFilters, setResumoFilters] = useState<Record<string, string[]>>(() => persistedUiStateRef.current?.resumoFilters ?? {});
  const [resumoFilterOpenKey, setResumoFilterOpenKey] = useState<string | null>(null);
  const [resumoSearchTerm, setResumoSearchTerm] = useState(() => persistedUiStateRef.current?.resumoSearchTerm ?? '');
  const [ctoListSortKey, setCtoListSortKey] = useState<CtoListSortKey>(() => (persistedUiStateRef.current?.ctoListSortKey as CtoListSortKey) || 'cto');
  const [ctoListSortDir, setCtoListSortDir] = useState<'asc'|'desc'>(() => persistedUiStateRef.current?.ctoListSortDir === 'desc' ? 'desc' : 'asc');
  const [expandedCtos, setExpandedCtos] = useState<Record<string, boolean>>({});
  const [maintDetailTarget, setMaintDetailTarget] = useState<(Pick<VehicleRow, 'placa'|'dataInicial'|'idLocacao'|'idComercial'|'idVeiculo'|'tipoContrato'> & { mode: DetailMode }) | null>(null);
  const resumoDetailTableRef = useRef<HTMLTableElement | null>(null);
  const [activeItemsSubTab, setActiveItemsSubTab] = useState<'resumo' | 'status' | 'estimativa'>('resumo');

  // Ordenação específica para mini-tabelas (itensos): mapa por título/bloco
  const [miniTableSortMap, setMiniTableSortMap] = useState<Record<string, { key: string; dir: 'asc'|'desc' }>>({});
  const toggleMiniTableSort = (blockId: string, key: string) => {
    setMiniTableSortMap(prev => {
      const cur = prev[blockId];
      if (cur && cur.key === key) return { ...prev, [blockId]: { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } };
      return { ...prev, [blockId]: { key, dir: 'desc' } };
    });
  };
  const miniTableSortIcon = (blockId: string, key: string) => {
    const cur = miniTableSortMap[blockId];
    if (!cur || cur.key !== key) return ' ↕';
    return cur.dir === 'asc' ? ' ↑' : ' ↓';
  };

  const ESTIMATIVA_PAGE_SIZE = 25;
  const [estimativaSort, setEstimativaSort] = useState<{ key: string; dir: 'asc'|'desc' }>({ key: 'probabilidade', dir: 'desc' });
  const [estimativaPage, setEstimativaPage] = useState(1);
  const toggleEstimativaSort = (key: string) => {
    setEstimativaSort(prev => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: 'desc' };
    });
    setEstimativaPage(1);
  };
  const estimativaSortIcon = (key: string) => {
    if (estimativaSort.key !== key) return ' ↕';
    return estimativaSort.dir === 'asc' ? ' ↑' : ' ↓';
  };

  useEffect(() => { setShowTabHelp(false); }, [activeTab]);

  const handleTabChange = (tab: TabKey) => {
    startTabSwitchTransition(() => {
      setActiveTab(tab);
    });
  };

  useEffect(() => {
    if (activeTab !== 'itensos') {
      setActiveItemsSubTab('resumo');
      setEstimativaPage(1);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'itensos' && activeItemsSubTab === 'estimativa') {
      setEstimativaPage(1);
    }
  }, [activeTab, activeItemsSubTab]);

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
    const raw = localStorage.getItem('analise_contrato_km_red_threshold');
    if (raw == null) return;
    const parsed = parseNum(raw);
    if (!isFinite(parsed) || parsed < 0) return;
    setKmRedThreshold(parsed);
    setKmRedThresholdInput(Math.round(parsed).toLocaleString('pt-BR'));
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

  const saveKmRedThreshold = () => {
    const threshold = Math.max(0, parseNum(kmRedThresholdInput));
    setKmRedThreshold(threshold);
    setKmRedThresholdInput(Math.round(threshold).toLocaleString('pt-BR'));
    localStorage.setItem('analise_contrato_km_red_threshold', String(threshold));
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

  const { data: rawC, loading: lC, metadata } = useBIData<ContratoRow[]>('dim_contratos_locacao', { staleTime: ANALISE_CONTRATO_DATA_STALE_TIME });
  const { data: rawF, loading: lF } = useBIData<FrotaRow[]>('dim_frota', { staleTime: ANALISE_CONTRATO_DATA_STALE_TIME });
  const { data: rawRules } = useBIData<RegrasContratoRow[]>('dim_regras_contrato', { staleTime: ANALISE_CONTRATO_DATA_STALE_TIME });
  const { data: rawM, loading: lM } = useBIData<ManutencaoRow[]>('fat_manutencao_unificado', { limit: 300000, staleTime: ANALISE_CONTRATO_DATA_STALE_TIME });
  const { data: rawS, loading: lS } = useBIData<SinistroRow[]>('fat_sinistros', { limit: 300000, staleTime: ANALISE_CONTRATO_DATA_STALE_TIME });
  const { data: rawFat, loading: lFat } = useBIData<FaturamentoRow[]>('fat_faturamentos', { limit: 300000, staleTime: ANALISE_CONTRATO_DATA_STALE_TIME });
  const { data: rawFatItens, loading: lFatItens } = useBIData<FaturamentoItemRow[]>('fat_faturamento_itens', { limit: 300000, staleTime: ANALISE_CONTRATO_DATA_STALE_TIME });
  const itensOsYear0 = new Date().getFullYear();
  const itensOsYear1 = itensOsYear0 - 1;
  const itensOsYear2 = itensOsYear0 - 2;

  const { results: itensOsBatchY0, loading: lItensOsY0 } = useBIDataBatch(
    ['fat_itens_ordem_servico'],
    undefined,
    {
      params: { year: itensOsYear0, limit: 100000 },
      staleTime: ANALISE_CONTRATO_DATA_STALE_TIME,
    }
  );
  const { results: itensOsBatchY1, loading: lItensOsY1 } = useBIDataBatch(
    ['fat_itens_ordem_servico'],
    undefined,
    {
      enabled: itensOsYear1 >= 2022,
      params: { year: itensOsYear1, limit: 100000 },
      staleTime: ANALISE_CONTRATO_DATA_STALE_TIME,
    }
  );
  const { results: itensOsBatchY2, loading: lItensOsY2 } = useBIDataBatch(
    ['fat_itens_ordem_servico'],
    undefined,
    {
      enabled: itensOsYear2 >= 2022,
      params: { year: itensOsYear2, limit: 100000 },
      staleTime: ANALISE_CONTRATO_DATA_STALE_TIME,
    }
  );

  const rawItensOS = useMemo<ItensOrdemServicoRow[]>(() => {
    const merged = [
      ...getBatchTable<ItensOrdemServicoRow>(itensOsBatchY0, 'fat_itens_ordem_servico'),
      ...getBatchTable<ItensOrdemServicoRow>(itensOsBatchY1, 'fat_itens_ordem_servico'),
      ...getBatchTable<ItensOrdemServicoRow>(itensOsBatchY2, 'fat_itens_ordem_servico'),
    ];

    const dedup = new Map<string, ItensOrdemServicoRow>();
    for (const row of merged) {
      const rowAny = row as any;
      const idItem = String(rowAny?.IdItemOrdemServico || rowAny?.iditemordemservico || '').trim();
      const fallbackKey = [
        rowAny?.IdOrdemServico || rowAny?.idordemservico || rowAny?.OrdemServico || rowAny?.ordemservico || '',
        rowAny?.IdOcorrencia || rowAny?.idocorrencia || rowAny?.Ocorrencia || rowAny?.ocorrencia || '',
        rowAny?.DescricaoItem || rowAny?.descricaoitem || '',
        rowAny?.CriadoEm || rowAny?.criadoem || rowAny?.DataAtualizacaoDados || rowAny?.dataatualizacaodados || '',
      ].map((v: unknown) => String(v || '').trim()).join('|');

      const key = idItem || fallbackKey;
      if (!key || dedup.has(key)) continue;
      dedup.set(key, row);
    }

    return Array.from(dedup.values());
  }, [itensOsBatchY0, itensOsBatchY1, itensOsBatchY2]);

  const lItensOS = lItensOsY0
    || (itensOsYear1 >= 2022 && lItensOsY1)
    || (itensOsYear2 >= 2022 && lItensOsY2);
  const { data: rawPrecos, loading: _lPrecos } = useBIData<PrecosLocacaoRow[]>('fat_precos_locacao', { limit: 100000, staleTime: ANALISE_CONTRATO_DATA_STALE_TIME });
  const { data: rawMovVeic, loading: lMovVeic } = useBIData<MovimentacaoVeiculoRow[]>('dim_movimentacao_veiculos', { limit: 300000, staleTime: ANALISE_CONTRATO_DATA_STALE_TIME });

  const loadManualRules = async (forceRefresh = false) => {
    if (!forceRefresh && manualRulesCache && (Date.now() - manualRulesCache.timestamp) < MANUAL_RULES_CACHE_TTL) {
      setMatrizCustos(manualRulesCache.data);
      setRulesLoading(false);
      setRulesError(null);
      return;
    }

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

    manualRulesCache = { data: mapped, timestamp: Date.now() };
    setMatrizCustos(mapped);
    setRulesLoading(false);
  };

  useEffect(() => {
    void loadManualRules();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ALERT_RULES_STORAGE_KEY, JSON.stringify(alertRulesByScope));
  }, [alertRulesByScope]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!uiStatePersistedRef.current) {
      const hasCustomState =
        filterCliente.length > 0 ||
        filterCTO.length > 0 ||
        filterPlaca.length > 0 ||
        filterClassificacaoOdometro.length > 0 ||
        filterGrupoModelo.length > 0 ||
        filterVencimento.length > 0 ||
        filterTipoContrato.length > 0 ||
        filterSitCTO.length > 0 ||
        filterSitLoc.length > 0 ||
        sortKey !== 'cliente' ||
        sortDir !== 'asc' ||
        resumoDetailSortKey !== 'placa' ||
        resumoDetailSortDir !== 'asc' ||
        Object.keys(resumoFilters).length > 0 ||
        resumoSearchTerm.length > 0 ||
        ctoListSortKey !== 'cto' ||
        ctoListSortDir !== 'asc';

      if (!hasCustomState) return;
    }

    const nextState: PersistedAnaliseContratoUiState = {
      filterCliente,
      filterCTO,
      filterPlaca,
      filterClassificacaoOdometro,
      filterGrupoModelo,
      filterVencimento,
      filterTipoContrato,
      filterSitCTO,
      filterSitLoc,
      sortKey,
      sortDir,
      resumoFilters,
      resumoDetailSortKey,
      resumoDetailSortDir,
      ctoListSortKey,
      ctoListSortDir,
      resumoSearchTerm,
    };

    window.localStorage.setItem(ANALISE_CONTRATO_UI_STATE_KEY, JSON.stringify(nextState));
    uiStatePersistedRef.current = true;
  }, [
    filterCliente,
    filterCTO,
    filterPlaca,
    filterClassificacaoOdometro,
    filterGrupoModelo,
    filterVencimento,
    filterTipoContrato,
    filterSitCTO,
    filterSitLoc,
    sortKey,
    sortDir,
    resumoFilters,
    resumoDetailSortKey,
    resumoDetailSortDir,
    ctoListSortKey,
    ctoListSortDir,
    resumoSearchTerm,
  ]);

  const initialLoading = lC || lF;
  const heavyLoading   = lM || lS || lFat || lFatItens || lItensOS || lMovVeic;

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

  const getEffectiveAlertRulesForScope = (scopeKeyRaw: string) => {
    const scopeKey = String(scopeKeyRaw || '').trim();
    if (!scopeKey) return buildDefaultItemAlertRules();
    if (Object.prototype.hasOwnProperty.call(alertRulesByScope, scopeKey)) {
      return (alertRulesByScope[scopeKey] || []).map((rule) => ({
        ...rule,
        termos: sanitizeAlertRuleTerms(rule.termos || []),
      }));
    }
    return buildDefaultItemAlertRules();
  };

  const getEffectiveAlertRulesForVehicle = (vehicle: VehicleRow) => {
    const scopeKey = buildAlertRuleScopeKey(vehicle.grupo || '', vehicle.modelo || '');
    if (scopeKey && Object.prototype.hasOwnProperty.call(alertRulesByScope, scopeKey)) {
      return getEffectiveAlertRulesForScope(scopeKey);
    }
    if (Object.prototype.hasOwnProperty.call(alertRulesByScope, ALERT_RULE_SCOPE_ALL)) {
      return getEffectiveAlertRulesForScope(ALERT_RULE_SCOPE_ALL);
    }
    return buildDefaultItemAlertRules();
  };

  const resetAlertRuleEditor = () => {
    setEditingAlertRuleId(null);
    setAlertRuleLabel('');
    setAlertRuleKm('');
    setAlertRuleTerms('');
  };

  const upsertAlertRule = () => {
    const grupo = String(alertRuleGrupo || '').trim();
    const modelo = String(alertRuleModelo || '').trim();
    const scopeKey = buildAlertRuleScopeKey(grupo, modelo, alertRuleApplyAll);
    const label = String(alertRuleLabel || '').trim();
    const intervaloKm = Math.max(0, Math.round(parseNum(alertRuleKm)));

    if (!scopeKey) {
      setAlertRulesError('Selecione Grupo e Modelo, ou marque "Aplicar a todos".');
      return;
    }
    if (!label) {
      setAlertRulesError('Informe o item de alerta.');
      return;
    }
    if (!intervaloKm) {
      setAlertRulesError('Informe a KM estimada de troca (maior que zero).');
      return;
    }

    const rawTerms = String(alertRuleTerms || '')
      .split(',')
      .map(term => term.trim())
      .filter(Boolean);
    const terms = sanitizeAlertRuleTerms(rawTerms.length ? rawTerms : buildTermsFromLabel(label));
    const normalizedLabel = normalizeAlertRuleText(label);

    setAlertRulesByScope((prev) => {
      const current = Object.prototype.hasOwnProperty.call(prev, scopeKey)
        ? [...(prev[scopeKey] || [])]
        : buildDefaultItemAlertRules();

      let next = current;
      if (editingAlertRuleId) {
        next = current.map((rule) => (
          rule.id === editingAlertRuleId
            ? {
              ...rule,
              label,
              intervaloKm,
              termos: terms,
              enabled: true,
              source: 'custom' as const,
            }
            : rule
        ));
      } else {
        const existingByLabel = current.find((rule) => normalizeAlertRuleText(rule.label) === normalizedLabel);
        if (existingByLabel) {
          next = current.map((rule) => (
            rule.id === existingByLabel.id
              ? {
                ...rule,
                label,
                intervaloKm,
                termos: terms,
                enabled: true,
                source: 'custom' as const,
              }
              : rule
          ));
        } else {
          next = [
            ...current,
            {
              id: buildCustomAlertRuleId(label),
              label,
              intervaloKm,
              termos: terms,
              enabled: true,
              source: 'custom' as const,
            },
          ];
        }
      }

      const sorted = [...next].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true }));
      return { ...prev, [scopeKey]: sorted };
    });

    setAlertRulesError(null);
    resetAlertRuleEditor();
  };

  const startEditAlertRule = (scopeKeyRaw: string, rule: ItemTrocaAlertRuleConfig) => {
    const scopeKey = String(scopeKeyRaw || '').trim();
    if (!scopeKey) return;
    if (scopeKey === ALERT_RULE_SCOPE_ALL) {
      setAlertRuleApplyAll(true);
      setAlertRuleGrupo('');
      setAlertRuleModelo('');
    } else {
      const [grupo = '', modelo = ''] = scopeKey.split('::');
      setAlertRuleApplyAll(false);
      setAlertRuleGrupo(grupo);
      setAlertRuleModelo(modelo);
    }
    setEditingAlertRuleId(rule.id);
    setAlertRuleLabel(rule.label);
    setAlertRuleKm(String(rule.intervaloKm).replace('.', ','));
    setAlertRuleTerms((rule.termos || []).join(', '));
    setAlertRulesError(null);
  };

  const deleteAlertRule = (scopeKeyRaw: string, ruleId: string) => {
    const scopeKey = String(scopeKeyRaw || '').trim();
    if (!scopeKey || !ruleId) return;

    setAlertRulesByScope((prev) => {
      const current = Object.prototype.hasOwnProperty.call(prev, scopeKey)
        ? [...(prev[scopeKey] || [])]
        : buildDefaultItemAlertRules();

      const filtered = current.filter(rule => rule.id !== ruleId);
      return { ...prev, [scopeKey]: filtered };
    });

    if (editingAlertRuleId === ruleId) resetAlertRuleEditor();
    setAlertRulesError(null);
  };

  const restoreDefaultAlertRulesForScope = (scopeKeyRaw: string) => {
    const scopeKey = String(scopeKeyRaw || '').trim();
    if (!scopeKey) return;

    setAlertRulesByScope((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, scopeKey)) return prev;
      const next = { ...prev };
      delete next[scopeKey];
      return next;
    });

    const selectedScopeKey = buildAlertRuleScopeKey(alertRuleGrupo, alertRuleModelo, alertRuleApplyAll);
    if (selectedScopeKey === scopeKey) resetAlertRuleEditor();
    setAlertRulesError(null);
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

    await loadManualRules(true);
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

    await loadManualRules(true);
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
    const arrItensOS = rawItensOS as ItensOrdemServicoRow[]|null ?? [];
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

    type MA = { plate: string; date: Date | null; year: number; occurrenceKey: string; cost: number; reemb: number; isCancelled: boolean };
    const maintByPlate = new Map<string, MA[]>();
    const seenMaintenance = new Set<string>();
    for (const m of arrM) {
      const rawPlaca = m.Placa; if(!rawPlaca) continue;
      const placa = normalizePlate(rawPlaca);
      const placaKey = canonicalPlate(rawPlaca);
      if (!placa) continue;
      const mAny = m as any;
      const status = getMaintenanceStatusText(mAny);
      const isCancelled = isCancelledStatus(status);
      const rawDate = m.OrdemServicoCriadaEm || m.DataCriacao || m.DataEntrada || m.DataCriacaoOS || (m as any).DataServico || (m as any).DataAtualizacaoDados || '';
      const date = parseDateFlexible(rawDate);
      const yr = date ? date.getFullYear() : getYear(rawDate);
      if(yr<2022 || yr>2030) continue;
      const occurrenceKey = getMaintenanceOccurrenceKey(mAny, `${placa}-${yr}-${rawDate}`);
      const dedupeKey = `${placaKey || placa}::${occurrenceKey || rawDate || `${yr}`}`;
      if (seenMaintenance.has(dedupeKey)) continue;
      seenMaintenance.add(dedupeKey);
      const cost = parseNum(m.ValorTotalFatItens || m.ValorTotal || m.valortotal || m.CustoTotalOS || 0);
      const reemb = parseNum(m.ValorReembolsavelFatItens || m.ValorReembolsavel || m.valorreembolsavel || 0);
      const rec = { plate: placa, date, year: yr, occurrenceKey, cost, reemb, isCancelled };
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

    type IA = {
      key: string;
      plate: string;
      plateKey: string;
      idVeiculo: string;
      idLocacao: string;
      idComercial: string;
      date: Date | null;
      osId: string;
      occurrence: string;
      itemDescricao: string;
      grupoDespesa: string;
      fornecedor: string;
      quantidade: number;
      valorTotal: number;
      valorReembolsavel: number;
    };
    const itensByPlate = new Map<string, IA[]>();
    const itensByVeiculo = new Map<string, IA[]>();
    const itensByLocacao = new Map<string, IA[]>();
    const itensByComercial = new Map<string, IA[]>();
    const seenItens = new Set<string>();

    const pushItem = (map: Map<string, IA[]>, key: string, rec: IA) => {
      if (!key) return;
      const bucket = map.get(key) || [];
      bucket.push(rec);
      map.set(key, bucket);
    };

    for (const item of arrItensOS) {
      const itemAny = item as any;
      const idItem = String(itemAny?.IdItemOrdemServico || itemAny?.iditemordemservico || '').trim();
      const fallback = [
        itemAny?.IdOrdemServico || itemAny?.idordemservico || itemAny?.OrdemServico || itemAny?.ordemservico || '',
        itemAny?.IdOcorrencia || itemAny?.idocorrencia || itemAny?.Ocorrencia || itemAny?.ocorrencia || '',
        itemAny?.DescricaoItem || itemAny?.descricaoitem || itemAny?.Item || itemAny?.item || '',
        itemAny?.DataCriacaoOcorrencia || itemAny?.DataCriacao || itemAny?.DataAtualizacaoDados || '',
      ].map((v: unknown) => String(v || '').trim()).join('|');
      const key = idItem || fallback;
      if (!key || seenItens.has(key)) continue;
      seenItens.add(key);

      const date = getItemOsDate(itemAny);
      const plate = normalizePlate(itemAny?.Placa || itemAny?.placa || '');
      const plateKey = canonicalPlate(itemAny?.Placa || itemAny?.placa || '');
      const idVeiculo = String(itemAny?.IdVeiculo || itemAny?.idveiculo || '').trim().toUpperCase();
      const idLocacao = String(itemAny?.IdContratoLocacao || itemAny?.idcontratolocacao || '').trim().toUpperCase();
      const idComercial = String(itemAny?.IdContratoComercial || itemAny?.idcontratocomercial || itemAny?.ContratoComercial || itemAny?.contratocomercial || '').trim().toUpperCase();
      const valorTotal = getItemOsCost(itemAny);
      const valorReembolsavel = getItemOsReembolso(itemAny);
      const quantidade = getItemOsQuantity(itemAny);

      const rec: IA = {
        key,
        plate,
        plateKey,
        idVeiculo,
        idLocacao,
        idComercial,
        date,
        osId: getMaintenanceOrderDisplay(itemAny),
        occurrence: getMaintenanceOccurrenceDisplay(itemAny),
        itemDescricao: getItemOsDescription(itemAny),
        grupoDespesa: getItemOsGrupoDespesa(itemAny),
        fornecedor: getItemOsFornecedor(itemAny),
        quantidade,
        valorTotal,
        valorReembolsavel,
      };

      const plateTargets = Array.from(new Set([plate, plateKey].filter(Boolean)));
      for (const plateTarget of plateTargets) pushItem(itensByPlate, plateTarget, rec);
      pushItem(itensByVeiculo, idVeiculo, rec);
      pushItem(itensByLocacao, idLocacao, rec);
      pushItem(itensByComercial, idComercial, rec);
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
      const maintRecordsAll = mergedMaint.filter(rec => {
        const recUnique = `${rec.occurrenceKey}::${rec.date?.toISOString() || ''}`;
        if (seenRec.has(recUnique)) return false;
        seenRec.add(recUnique);
        if (!(canonicalPlate(rec.plate) === realPlacaKey)) return false;
        if (!rec.date) return false;
        if (contractStart && rec.date < contractStart) return false;
        if (rec.date > today) return false;
        return true;
      });

      const mm = new Map<number, { cost:number; reemb:number; occurrenceKeys:Set<string> }>();
      const maintOccurrenceKeys = new Set<string>();
      const maintOccurrenceAllKeys = new Set<string>();
      const maintOccurrenceCancelledKeys = new Set<string>();
      for (const rec of maintRecordsAll) {
        maintOccurrenceAllKeys.add(rec.occurrenceKey);
        if (rec.isCancelled) {
          maintOccurrenceCancelledKeys.add(rec.occurrenceKey);
          continue;
        }
        if (rec.year < 2022 || rec.year > 2030) continue;
        if (!mm.has(rec.year)) mm.set(rec.year, { cost:0, reemb:0, occurrenceKeys:new Set<string>() });
        const bucket = mm.get(rec.year)!;
        bucket.cost += rec.cost;
        bucket.reemb += rec.reemb;
        bucket.occurrenceKeys.add(rec.occurrenceKey);
        maintOccurrenceKeys.add(rec.occurrenceKey);
      }

      const passagemTotal = maintOccurrenceKeys.size;
      const qtdOcorrenciasTotal = maintOccurrenceAllKeys.size;
      const qtdOcorrenciasCanceladas = maintOccurrenceCancelledKeys.size;
      const qtdOcorrenciasEfetivas = maintOccurrenceKeys.size;
      const pctOcorrenciasCanceladas = qtdOcorrenciasTotal > 0 ? qtdOcorrenciasCanceladas / qtdOcorrenciasTotal : 0;
      const passagemIdeal = kmDivisor > 0 ? kmAtual / kmDivisor : 0;
      const passagemIdealExibida = Math.round(passagemIdeal);

      const contratoBase = String(c?.ContratoComercial || cAny?.ContratoComercial || cAny?.Contrato || '').trim();
      const manualCustoKm = lookupCustoKmManual(contratoBase, grupo);
      const franquiaBanco = lookupFranquiaBanco(contratoBase, grupo);
      const custoManPrevisto = manualCustoKm == null ? 0 : (franquiaBanco * manualCustoKm) * idadeEmMeses;

      let totalManutencao = 0, totalReembMan = 0;
      for (const bucket of mm.values()) { totalManutencao += bucket.cost; totalReembMan += bucket.reemb; }
      const cntMan = maintOccurrenceKeys.size;
      
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

      const itemCandidates: IA[] = [
        ...(itensByPlate.get(realPlaca) || []),
        ...(realPlacaKey && realPlacaKey !== realPlaca ? (itensByPlate.get(realPlacaKey) || []) : []),
        ...(itensByVeiculo.get(idVeiculoKey) || []),
        ...(itensByLocacao.get(idLocacaoKey) || []),
        ...(itensByComercial.get(idComercialKey) || []),
        ...(itensByComercial.get(contratoComercialKey) || []),
      ];
      const itensUnicos = new Map<string, IA>();
      for (const rec of itemCandidates) {
        if (!rec) continue;
        if (rec.date) {
          if (contractStart && rec.date < contractStart) continue;
          if (rec.date > today) continue;
        }
        if (!itensUnicos.has(rec.key)) itensUnicos.set(rec.key, rec);
      }

      let totalItensOsValor = 0;
      let totalItensOsReemb = 0;
      let qtdItensOs = 0;
      const osComItens = new Set<string>();
      const tiposItens = new Set<string>();
      for (const rec of itensUnicos.values()) {
        totalItensOsValor += Number(rec.valorTotal) || 0;
        totalItensOsReemb += Number(rec.valorReembolsavel) || 0;
        qtdItensOs += Number(rec.quantidade) || 0;
        if (rec.osId) osComItens.add(rec.osId);
        if (rec.itemDescricao) tiposItens.add(rec.itemDescricao.toUpperCase());
      }
      const qtdOsComItens = osComItens.size;
      const qtdTiposItensOs = tiposItens.size;
      const custoLiqItensOs = totalItensOsValor - totalItensOsReemb;
      const ticketMedioOsComItens = qtdOsComItens > 0 ? totalItensOsValor / qtdOsComItens : 0;
      const custoMedioItemOs = qtdItensOs > 0 ? totalItensOsValor / qtdItensOs : 0;
      const pctRecuperacaoItensOs = totalItensOsValor > 0 ? totalItensOsReemb / totalItensOsValor : 0;

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
      const pctItensOsFat = faturamentoTotalExibido > 0 ? totalItensOsValor / faturamentoTotalExibido : 0;

      const years: Record<number, any> = {};
      for (let y = 2022; y <= 2030; y++) {
        const yr = mm.get(y);
        years[y] = {
          pass: yr?.occurrenceKeys.size || 0,
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
        placa: realPlaca, modelo, grupo, kmAtual, odometroRetirada: kmInicialContrato, indiceKm: kmLabel(kmAtual), classificacaoOdometro: classifyOdometro(kmAtual), idadeEmMeses, rodagemMedia,
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
        qtdOcorrenciasTotal, qtdOcorrenciasEfetivas, qtdOcorrenciasCanceladas, pctOcorrenciasCanceladas,
        diferencaPassagem: Math.round(diferencaPassagem), pctPassagem,
        custoManPrevisto, custoManRealizado, difManPrevReal, pctDifManPrevReal, custoManLiquido, difCustoManLiq, pctDifCustoManLiq,
        totalManutencao, ticketMedio, custoKmMan,
        totalReembMan, custoLiqMan, pctReembolsadoMan, custoKmLiqMan,
        totalSinistro, totalReembSin, valorVeiculoFipe, qtdOsManutencao: cntMan, qtdSinistros: totalQtdSinistros, custoLiqSin, pctReembolsadoSin,
        totalManSin, pctReembolsadoManSin,
        faturamentoTotal: faturamentoTotalExibido,
        faturamentoPrevisto: faturamentoPrevistoExibido, ultimoValorLocacao: ultimoPrecoExibido, diferencaFaturamento: diferencaFaturamentoExibida, projecaoFaturamento: projecaoFaturamentoExibida,
        pctManFat, pctCustoLiqManFat, pctSinFat, pctCustoLiqSinFat, pctManSinFat,
        qtdOsComItens, qtdItensOs, qtdTiposItensOs,
        totalItensOsValor, totalItensOsReemb, custoLiqItensOs,
        ticketMedioOsComItens, custoMedioItemOs, pctRecuperacaoItensOs, pctItensOsFat,
        years
      };
    });

    return result;
  }, [activeContratos, rawF, frotaByPlaca, rawM, rawS, rawFat, rawFatItens, rawItensOS, rawPrecos, rawMovVeic, kmDivisor, bancoRegraLookup, manualCostLookup]);

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
    if (ignore !== 'classificacaoOdometro' && filterClassificacaoOdometro.length && !filterClassificacaoOdometro.includes(r.classificacaoOdometro)) return false;
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
    const classificacaoOdometro = [...new Set(vehicleRows
      .filter(r => rowMatchesFilters(r, 'classificacaoOdometro'))
      .map(r => r.classificacaoOdometro)
      .filter(Boolean))]
      .sort((a, b) => {
        const delta = getOdometroBucketOrder(a) - getOdometroBucketOrder(b);
        if (delta !== 0) return delta;
        return a.localeCompare(b, 'pt-BR');
      });
    return {
      clientes: compute('clientes', r => r.cliente),
      ctos: compute('ctos', r => r.contrato),
      placas: compute('placas', r => r.placa),
      classificacaoOdometro,
      tipoContrato: compute('tipoContrato', r => r.tipoContrato),
      sitCTO: compute('sitCTO', r => normalizeSitCTOValue(r.sitCTO)),
      sitLoc: compute('sitLoc', r => r.sitLoc),
    };
  }, [vehicleRows, filterCliente, filterCTO, filterPlaca, filterClassificacaoOdometro, filterGrupoModelo, filterVencimento, filterTipoContrato, filterSitCTO, filterSitLoc]);

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
  }, [vehicleRows, filterCliente, filterCTO, filterPlaca, filterClassificacaoOdometro, filterGrupoModelo, filterVencimento, filterTipoContrato, filterSitCTO, filterSitLoc]);

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
  }, [vehicleRows, filterCliente, filterCTO, filterPlaca, filterClassificacaoOdometro, filterGrupoModelo, filterVencimento, filterTipoContrato, filterSitCTO, filterSitLoc]);

  // Default: when no explicit Situação Locação filter, prefer an 'em andamento' like value
  useEffect(() => {
    if (uiStatePersistedRef.current) return;
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

  const alertRuleScopeKey = useMemo(
    () => buildAlertRuleScopeKey(alertRuleGrupo, alertRuleModelo, alertRuleApplyAll),
    [alertRuleGrupo, alertRuleModelo, alertRuleApplyAll],
  );

  const modelOptionsForAlertRule = useMemo(() => {
    if (!alertRuleGrupo) return [] as string[];
    return Array.from(new Set(
      vehicleRows
        .filter(row => String(row.grupo || '').trim() === alertRuleGrupo)
        .map(row => String(row.modelo || '').trim())
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  }, [vehicleRows, alertRuleGrupo]);

  useEffect(() => {
    if (alertRuleApplyAll) return;
    if (!alertRuleGrupo || !alertRuleModelo) return;
    if (modelOptionsForAlertRule.includes(alertRuleModelo)) return;
    setAlertRuleModelo('');
  }, [alertRuleApplyAll, alertRuleGrupo, alertRuleModelo, modelOptionsForAlertRule]);

  const alertRulesForSelectedScope = (() => {
    if (!alertRuleScopeKey) return [] as ItemTrocaAlertRuleConfig[];
    return getEffectiveAlertRulesForScope(alertRuleScopeKey);
  })();

  const alertRulesSelectedScopeUsesCustomConfig = useMemo(() => {
    if (!alertRuleScopeKey) return false;
    return Object.prototype.hasOwnProperty.call(alertRulesByScope, alertRuleScopeKey);
  }, [alertRuleScopeKey, alertRulesByScope]);

  const displayRows = useMemo(() => {
    let rows = vehicleRows.filter(r => rowMatchesFilters(r));

    return [...rows].sort((a,b)=>{
      // need to find coldef for sortKey
      let valA:any='', valB:any='';
      if (sortKey in a) { valA = (a as any)[sortKey]; valB = (b as any)[sortKey]; }
      const cmp=typeof valA==='number'&&typeof valB==='number'?valA-valB:String(valA).localeCompare(String(valB));
      return sortDir==='asc'?cmp:-cmp;
    });
  }, [vehicleRows, filterCliente, filterCTO, filterPlaca, filterClassificacaoOdometro, filterGrupoModelo, filterVencimento, filterTipoContrato, filterSitCTO, filterSitLoc, sortKey, sortDir]);

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

  const osPorOcorrencia = useMemo(() => {
    const itens = rawItensOS as ItensOrdemServicoRow[]|null ?? [];
    const map = new Map<string, Set<string>>();

    const add = (key: string, os: string, plate?: unknown) => {
      if (!key || !os) return;
      let bucket = map.get(key);
      if (!bucket) {
        bucket = new Set<string>();
        map.set(key, bucket);
      }
      bucket.add(os);

      const scopedKey = getPlateOccurrenceScopedKey(plate, key);
      if (scopedKey) {
        let scopedBucket = map.get(scopedKey);
        if (!scopedBucket) {
          scopedBucket = new Set<string>();
          map.set(scopedKey, scopedBucket);
        }
        scopedBucket.add(os);
      }
    };

    for (const item of itens) {
      const itemAny = item as any;
      const os = getMaintenanceOrderDisplay(itemAny);
      if (!os) continue;

      const lookupKeys = getMaintenanceOccurrenceLookupKeys(itemAny);
      const plate = itemAny?.Placa || itemAny?.placa || '';
      for (const key of lookupKeys) add(key, os, plate);
    }

    return map;
  }, [rawItensOS]);

  const maintDetailData = useMemo<{ rows: MaintDetailRow[]; resumoPorTipo: MaintDetailResumoRow[] }>(() => {
    if (!maintDetailTarget) return { rows: [], resumoPorTipo: [] };
    const arrM = rawM as ManutencaoRow[]|null ?? [];
    const arrS = rawS as SinistroRow[]|null ?? [];
    const targetKey = canonicalPlate(maintDetailTarget.placa || '');
    if (!targetKey) return { rows: [], resumoPorTipo: [] as MaintDetailResumoRow[] };

    const contractStart = parseDateFlexible(maintDetailTarget.dataInicial || '');
    const today = new Date();
    const seen = new Set<string>();
    const rows: MaintDetailRow[] = [];
    const resumoMap = new Map<string, MaintDetailResumoRow>();
    const includeManutencao = maintDetailTarget.mode === 'manutencao' || maintDetailTarget.mode === 'mansin';
    const includeSinistro = maintDetailTarget.mode === 'sinistro' || maintDetailTarget.mode === 'mansin';

    const collectLinkedOrders = (rowAny: Record<string, unknown>, fallback: string) => {
      const linked = new Set<string>();
      const lookupKeys = getMaintenanceOccurrenceLookupKeys(rowAny, fallback);
      const possiblePlates = [
        rowAny?.Placa,
        rowAny?.placa,
        maintDetailTarget.placa,
      ];

      for (const key of lookupKeys) {
        const globalOrders = osPorOcorrencia.get(key);
        if (globalOrders) {
          for (const order of globalOrders) linked.add(order);
        }

        for (const plate of possiblePlates) {
          const scopedKey = getPlateOccurrenceScopedKey(plate, key);
          if (!scopedKey) continue;
          const scopedOrders = osPorOcorrencia.get(scopedKey);
          if (!scopedOrders) continue;
          for (const order of scopedOrders) linked.add(order);
        }
      }

      return Array.from(linked);
    };

    const getResumo = (tipoRaw: unknown) => {
      const tipo = String(tipoRaw || '').trim() || 'Sem tipo';
      let resumo = resumoMap.get(tipo);
      if (!resumo) {
        resumo = { tipo, totalOs: 0, canceladas: 0, valorTotal: 0, valorReembolsavel: 0, pctRecuperacao: 0 };
        resumoMap.set(tipo, resumo);
      }
      return resumo;
    };

    if (includeManutencao) {
      for (const m of arrM) {
        const plateKey = canonicalPlate(m?.Placa || '');
        if (!plateKey || plateKey !== targetKey) continue;

        const mAny = m as any;
        const tipo = String(mAny?.Tipo || mAny?.TipoManutencao || mAny?.TipoOcorrencia || 'Manutenção').trim() || 'Sem tipo';
        const statusText = getMaintenanceStatusText(mAny);
        const valorTotal = parseNum(mAny?.ValorTotalFatItens || mAny?.ValorTotal || mAny?.valortotal || mAny?.CustoTotalOS || 0);
        const valorReembolsavel = parseNum(mAny?.ValorReembolsavelFatItens || mAny?.ValorReembolsavel || mAny?.valorreembolsavel || 0);
        const resumo = getResumo(tipo);
        resumo.totalOs += 1;
        resumo.valorTotal += valorTotal;
        resumo.valorReembolsavel += valorReembolsavel;

        const isCancelled = isCancelledStatus(statusText);
        if (isCancelled) {
          resumo.canceladas += 1;
        }

        const rawDate = mAny?.OrdemServicoCriadaEm || mAny?.DataCriacao || mAny?.DataEntrada || mAny?.DataCriacaoOS || mAny?.DataServico || mAny?.DataAtualizacaoDados || '';
        const date = parseDateFlexible(rawDate);
        if (date) {
          if (contractStart && date < contractStart) continue;
          if (date > today) continue;
        } else if (!isCancelled) {
          continue;
        }

        const occurrenceKey = getMaintenanceOccurrenceKey(mAny, `${targetKey}-${rawDate}-${tipo}`);
        const dedupeKey = `M::${occurrenceKey}::${date?.toISOString() || rawDate || 'sem-data'}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const linkedOrders = collectLinkedOrders(mAny, `${targetKey}-${rawDate}-${tipo}`);
        const osId = formatOrderDisplayList([
          getMaintenanceOrderDisplay(mAny),
          ...linkedOrders,
        ]);

        rows.push({
          osId,
          ocorrencia: getMaintenanceOccurrenceDisplay(mAny),
          date: date || null,
          tipo,
          motivo: String(mAny?.Motivo || mAny?.MotivoOcorrencia || '').trim(),
          situacao: statusText || '—',
          valorTotal,
          valorReembolsavel,
        });
      }
    }

    if (includeSinistro) {
      for (const s of arrS) {
        const plateKey = canonicalPlate((s as any)?.Placa || '');
        if (!plateKey || plateKey !== targetKey) continue;

        const sAny = s as any;
        const statusRaw = sAny?.SituacaoOrdemServico || sAny?.situacaoordemservico || sAny?.Situacao || sAny?.Status || '';
        const isCancelled = isCancelledStatus(statusRaw);

        const rawDate = sAny?.DataSinistro || sAny?.DataCriacao || sAny?.DataOcorrencia || sAny?.DataAtualizacaoDados || '';
        const date = parseDateFlexible(rawDate);
        if (date) {
          if (contractStart && date < contractStart) continue;
          if (date > today) continue;
        } else if (!isCancelled) {
          continue;
        }

        const occurrenceKey = getMaintenanceOccurrenceKey(sAny, sAny?.IdSinistro || sAny?.IdEvento || `${targetKey}-SIN-${rawDate}`);
        const dedupeKey = `S::${occurrenceKey}::${date?.toISOString() || rawDate || 'sem-data'}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const linkedOrders = collectLinkedOrders(sAny, sAny?.IdSinistro || sAny?.IdEvento || `${targetKey}-SIN-${rawDate}`);
        const osId = formatOrderDisplayList([
          normalizeDisplayOsId(sAny?.IdOrdemServico || sAny?.idordemservico || sAny?.NumeroOS || sAny?.numeroos || ''),
          ...linkedOrders,
        ]);

        const valorTotal = parseSinistroCost(sAny);
        const valorReembolsavel = parseSinistroReembolso(sAny);

        const situacaoCandidates = [
          sAny?.SituacaoOrdemServico,
          sAny?.situacaoordemservico,
          sAny?.SituacaoOS,
          sAny?.SituacaoSinistro,
          sAny?.StatusSinistro,
          sAny?.Situacao,
          sAny?.Status,
          sAny?.StatusOcorrencia,
          sAny?.SituacaoOcorrencia,
          sAny?.StatusOrdem,
        ].map((v:any)=>String(v||'').trim()).filter(Boolean);
        const situacaoValue = situacaoCandidates.length ? situacaoCandidates[0] : '—';

        rows.push({
          osId,
          ocorrencia: getMaintenanceOccurrenceDisplay(sAny),
          date: date || null,
          tipo: 'Sinistro',
          motivo: String(sAny?.Motivo || sAny?.TipoSinistro || sAny?.Descricao || '').trim(),
          situacao: situacaoValue,
          valorTotal,
          valorReembolsavel,
        });
      }
    }

    const resumoPorTipo = Array.from(resumoMap.values())
      .map(item => ({
        ...item,
        pctRecuperacao: item.valorTotal > 0 ? item.valorReembolsavel / item.valorTotal : 0,
      }))
      .sort((a, b) => b.totalOs - a.totalOs || b.valorTotal - a.valorTotal || a.tipo.localeCompare(b.tipo));

    return {
      rows: rows.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)),
      resumoPorTipo,
    };
  }, [maintDetailTarget, rawM, rawS, osPorOcorrencia]);

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

  const itensOsDetailRows = useMemo<ItemOsDetailRow[]>(() => {
    if (!maintDetailTarget || maintDetailTarget.mode !== 'itensos') return [];

    const arrItens = rawItensOS as ItensOrdemServicoRow[]|null ?? [];
    const targetPlaca = normalizePlate(maintDetailTarget.placa || '');
    const targetPlacaKey = canonicalPlate(maintDetailTarget.placa || '');
    const targetVeiculo = String(maintDetailTarget.idVeiculo || '').trim().toUpperCase();
    const targetLocacao = String(maintDetailTarget.idLocacao || '').trim().toUpperCase();
    const targetComercial = String(maintDetailTarget.idComercial || '').trim().toUpperCase();

    const contractStart = parseDateFlexible(maintDetailTarget.dataInicial || '');
    const today = new Date();

    const matchesTarget = (row: any) => {
      const rowPlaca = normalizePlate(row.Placa || row.placa || '');
      const rowPlacaKey = canonicalPlate(row.Placa || row.placa || '');
      const rowVeiculo = String(row.IdVeiculo || row.idveiculo || '').trim().toUpperCase();
      const rowLocacao = String(row.IdContratoLocacao || row.idcontratolocacao || '').trim().toUpperCase();
      const rowComercial = String(row.IdContratoComercial || row.idcontratocomercial || row.ContratoComercial || row.contratocomercial || '').trim().toUpperCase();

      if (targetPlaca && rowPlaca && rowPlaca === targetPlaca) return true;
      if (targetPlacaKey && rowPlacaKey && rowPlacaKey === targetPlacaKey) return true;
      if (targetVeiculo && rowVeiculo && rowVeiculo === targetVeiculo) return true;
      if (targetLocacao && rowLocacao && rowLocacao === targetLocacao) return true;
      if (targetComercial && rowComercial && rowComercial === targetComercial) return true;
      return false;
    };

    const dedup = new Set<string>();
    const rows: ItemOsDetailRow[] = [];

    for (const item of arrItens) {
      const itemAny = item as any;
      if (!matchesTarget(itemAny)) continue;

      const date = getItemOsDate(itemAny);
      if (date) {
        if (contractStart && date < contractStart) continue;
        if (date > today) continue;
      }

      const itemId = String(itemAny?.IdItemOrdemServico || itemAny?.iditemordemservico || '').trim();
      const osId = getMaintenanceOrderDisplay(itemAny);
      const occurrence = getMaintenanceOccurrenceDisplay(itemAny);
      const itemDescricao = getItemOsDescription(itemAny);
      const quantidade = getItemOsQuantity(itemAny);
      const valorTotal = getItemOsCost(itemAny);
      const valorReembolsavel = getItemOsReembolso(itemAny);

      const dedupeKey = itemId || `${osId}|${occurrence}|${itemDescricao}|${String(date?.toISOString() || '')}|${valorTotal}|${valorReembolsavel}`;
      if (dedup.has(dedupeKey)) continue;
      dedup.add(dedupeKey);

      rows.push({
        osId,
        ocorrencia: occurrence,
        date,
        itemDescricao,
        grupoDespesa: getItemOsGrupoDespesa(itemAny),
        fornecedor: getItemOsFornecedor(itemAny),
        quantidade,
        valorTotal,
        valorReembolsavel,
      });
    }

    return rows.sort((a, b) => {
      const byDate = (b.date?.getTime() || 0) - (a.date?.getTime() || 0);
      if (byDate !== 0) return byDate;
      return (b.valorTotal || 0) - (a.valorTotal || 0);
    });
  }, [maintDetailTarget, rawItensOS]);

  const getDynYearsForTab = (tab: TabKey) => {
    const minYear = 2022;
    const maxYear = 2026;
    if (tab === 'resumo' || tab === 'listagemCto' || tab === 'itensos') return [];
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

    if (tab === 'itensos') {
      return displayRows.filter(row => {
        const fat = Number(row.faturamentoTotal) || 0;
        const pct = Number(row.pctItensOsFat) || 0;
        const custoLiq = Number(row.custoLiqItensOs) || 0;
        return (fat > 0 && pct > fatPctAlertThreshold) || (fat <= 0 && custoLiq > 0);
      }).length;
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
    let veiculosCriticosDiff = 0;
    let veiculosCriticosPct = 0;
    let somaRodagemMedia = 0;
    let totalOcorrenciasManutencao = 0;
    let totalOcorrenciasEfetivas = 0;
    let totalOcorrenciasCanceladas = 0;

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
    let totalItensOsValor = 0;
    let totalItensOsReemb = 0;
    let totalItensOsQtd = 0;
    let totalOsComItens = 0;
    let totalItensTipos = 0;

    for (const row of displayRows) {
      totalPassagens += Number(row.passagemTotal) || 0;
      totalPassagemPrevista += Number(row.passagemIdeal) || 0;
      somaRodagemMedia += Number(row.rodagemMedia) || 0;
      totalOcorrenciasManutencao += Number(row.qtdOcorrenciasTotal) || 0;
      totalOcorrenciasEfetivas += Number(row.qtdOcorrenciasEfetivas) || 0;
      totalOcorrenciasCanceladas += Number(row.qtdOcorrenciasCanceladas) || 0;
      if ((Number(row.diferencaPassagem) || 0) > passagemDiffAlertThreshold) veiculosCriticosDiff++;
      if ((Number(row.pctPassagem) || 0) > passagemPctAlertThreshold) veiculosCriticosPct++;

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
      totalItensOsValor += Number(row.totalItensOsValor) || 0;
      totalItensOsReemb += Number(row.totalItensOsReemb) || 0;
      totalItensOsQtd += Number(row.qtdItensOs) || 0;
      totalOsComItens += Number(row.qtdOsComItens) || 0;
      totalItensTipos += Number(row.qtdTiposItensOs) || 0;
    }

    const totalVeiculos = displayRows.length;
    const mediaPassagens = totalVeiculos > 0 ? totalPassagens / totalVeiculos : 0;
    const rodagemMedia = totalVeiculos > 0 ? somaRodagemMedia / totalVeiculos : 0;
    const pctCancelamentoOcorrencias = totalOcorrenciasManutencao > 0 ? totalOcorrenciasCanceladas / totalOcorrenciasManutencao : 0;

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
    const custoLiqItensOs = totalItensOsValor - totalItensOsReemb;
    const pctRecuperacaoItensOs = totalItensOsValor > 0 ? totalItensOsReemb / totalItensOsValor : 0;
    const ticketMedioOsItens = totalOsComItens > 0 ? totalItensOsValor / totalOsComItens : 0;
    const custoMedioItemOs = totalItensOsQtd > 0 ? totalItensOsValor / totalItensOsQtd : 0;
    const impactoItensOs = faturamentoTotal > 0 ? totalItensOsValor / faturamentoTotal : 0;

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

    if (activeTab === 'itensos') {
      return [
        { label: 'Custo Bruto Itens', value: fmtBRL(totalItensOsValor), sub: 'Soma de itens de OS', icon: Wrench, color: 'text-rose-600' },
        { label: 'Reembolso Itens', value: fmtBRL(totalItensOsReemb), sub: 'Recuperado sobre itens', icon: ShieldAlert, color: 'text-emerald-600' },
        { label: 'Custo Líquido Itens', value: fmtBRL(custoLiqItensOs), sub: 'Bruto - reembolsos', icon: DollarSign, color: 'text-indigo-600' },
        { label: '% Recuperação', value: fmtPct(pctRecuperacaoItensOs), sub: 'Reembolso / custo bruto', icon: Activity, color: 'text-blue-600' },
        { label: 'Ticket Médio por OS', value: fmtBRL(ticketMedioOsItens), sub: `${fmtNum(totalOsComItens)} OS com itens`, icon: Gauge, color: 'text-sky-600' },
        { label: 'Custo Médio por Item', value: fmtBRL(custoMedioItemOs), sub: `${fmtNum(totalItensOsQtd)} itens somados`, icon: BarChart3, color: 'text-fuchsia-600' },
        { label: 'Tipos de Itens', value: fmtNum(totalItensTipos), sub: 'Soma de variedades por placa', icon: Search, color: 'text-slate-700' },
        { label: 'Impacto no Faturamento', value: fmtPct(impactoItensOs), sub: 'Custo bruto de itens / faturamento', icon: AlertTriangle, color: impactoItensOs > fatPctAlertThreshold ? 'text-rose-600' : 'text-emerald-600' },
        { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(activeTab)), sub: 'Impacto acima do limite configurado', icon: ShieldAlert, color: 'text-red-600' },
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
      { label: 'Ocorrências Efetivas', value: fmtNum(totalOcorrenciasEfetivas), sub: `${fmtNum(totalOcorrenciasManutencao)} ocorrências totais`, icon: Route, color: 'text-emerald-600' },
      { label: '% Cancelamento', value: fmtPct(pctCancelamentoOcorrencias), sub: `${fmtNum(totalOcorrenciasCanceladas)} canceladas`, icon: AlertTriangle, color: pctCancelamentoOcorrencias > 0.35 ? 'text-rose-600' : 'text-amber-600' },
      { label: 'Passagem Prevista', value: fmtNominal(Math.round(totalPassagemPrevista * 10) / 10), sub: `Ref. ${fmtNum(kmDivisor)} km/p`, icon: Target, color: 'text-indigo-600' },
      { label: 'Casos para Atenção (Dif.)', value: fmtNum(veiculosCriticosDiff), sub: `Dif. > ${fmtNum(passagemDiffAlertThreshold)} na frota filtrada`, icon: AlertTriangle, color: 'text-rose-600' },
      { label: 'Casos para Atenção (% Pass.)', value: fmtNum(veiculosCriticosPct), sub: `% Passagem > ${fmtPct(passagemPctAlertThreshold)}`, icon: AlertTriangle, color: 'text-amber-600' },
      { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(activeTab)), sub: 'Itens destacados em vermelho na aba atual', icon: ShieldAlert, color: 'text-red-600' },
      { label: 'Rodagem Média', value: fmtNum(Math.round(rodagemMedia)), sub: 'Média mensal por veículo', icon: Gauge, color: 'text-blue-600' },
    ];
  }, [activeTab, displayRows, kmDivisor, fatPctAlertThreshold, passagemDiffAlertThreshold, passagemPctAlertThreshold]);

  const itensOsRankings = useMemo(() => {
    const empty = {
      totalRegistros: 0,
      topItensCusto: [] as Array<{ label: string; valor: number; reemb: number; qtd: number; osQtd: number; placasQtd: number }>,
      topItensReembolso: [] as Array<{ label: string; valor: number; reemb: number; qtd: number; osQtd: number; placasQtd: number }>,
      topFornecedores: [] as Array<{ label: string; valor: number; reemb: number; qtd: number; osQtd: number; placasQtd: number }>,
      topGruposDespesa: [] as Array<{ label: string; valor: number; reemb: number; qtd: number; osQtd: number; placasQtd: number }>,
    };

    if (activeTab !== 'itensos') return empty;

    const arrItens = rawItensOS as ItensOrdemServicoRow[]|null ?? [];
    if (!arrItens.length || !displayRows.length) return empty;

    const targetPlates = new Set(displayRows.map(r => normalizePlate(r.placa || '')).filter(Boolean));
    const targetPlateKeys = new Set(displayRows.map(r => canonicalPlate(r.placa || '')).filter(Boolean));
    const targetVeiculos = new Set(displayRows.map(r => String(r.idVeiculo || '').trim().toUpperCase()).filter(Boolean));
    const targetLocacoes = new Set(displayRows.map(r => String(r.idLocacao || '').trim().toUpperCase()).filter(Boolean));
    const targetComerciais = new Set(displayRows.map(r => String(r.idComercial || '').trim().toUpperCase()).filter(Boolean));

    const contractStartByPlate = new Map<string, Date>();
    const today = new Date();
    for (const row of displayRows) {
      const start = parseDateFlexible(row.dataInicial || '');
      if (!start) continue;
      const plateA = normalizePlate(row.placa || '');
      const plateB = canonicalPlate(row.placa || '');
      const pushStart = (key: string) => {
        if (!key) return;
        const prev = contractStartByPlate.get(key);
        if (!prev || start.getTime() > prev.getTime()) contractStartByPlate.set(key, start);
      };
      pushStart(plateA);
      pushStart(plateB);
    }

    type RankAgg = { label: string; valor: number; reemb: number; qtd: number; os: Set<string>; placas: Set<string> };
    const byItem = new Map<string, RankAgg>();
    const byFornecedor = new Map<string, RankAgg>();
    const byGrupo = new Map<string, RankAgg>();
    const seen = new Set<string>();

    const upsert = (map: Map<string, RankAgg>, labelRaw: string, valor: number, reemb: number, qtd: number, osId: string, plate: string) => {
      const label = (labelRaw || '').trim() || 'Não informado';
      const key = label.toUpperCase();
      let rec = map.get(key);
      if (!rec) {
        rec = { label, valor: 0, reemb: 0, qtd: 0, os: new Set<string>(), placas: new Set<string>() };
        map.set(key, rec);
      }
      rec.valor += valor;
      rec.reemb += reemb;
      rec.qtd += qtd;
      if (osId) rec.os.add(osId);
      if (plate) rec.placas.add(plate);
    };

    let totalRegistros = 0;
    for (const item of arrItens) {
      const itemAny = item as any;

      const rowPlate = normalizePlate(itemAny?.Placa || itemAny?.placa || '');
      const rowPlateKey = canonicalPlate(itemAny?.Placa || itemAny?.placa || '');
      const rowVeiculo = String(itemAny?.IdVeiculo || itemAny?.idveiculo || '').trim().toUpperCase();
      const rowLocacao = String(itemAny?.IdContratoLocacao || itemAny?.idcontratolocacao || '').trim().toUpperCase();
      const rowComercial = String(itemAny?.IdContratoComercial || itemAny?.idcontratocomercial || itemAny?.ContratoComercial || itemAny?.contratocomercial || '').trim().toUpperCase();

      const matched =
        (rowPlate && targetPlates.has(rowPlate))
        || (rowPlateKey && targetPlateKeys.has(rowPlateKey))
        || (rowVeiculo && targetVeiculos.has(rowVeiculo))
        || (rowLocacao && targetLocacoes.has(rowLocacao))
        || (rowComercial && targetComerciais.has(rowComercial));
      if (!matched) continue;

      const date = getItemOsDate(itemAny);
      if (date && date > today) continue;
      const contractStart = contractStartByPlate.get(rowPlate) || contractStartByPlate.get(rowPlateKey);
      if (date && contractStart && date < contractStart) continue;

      const idItem = String(itemAny?.IdItemOrdemServico || itemAny?.iditemordemservico || '').trim();
      const osId = getMaintenanceOrderDisplay(itemAny);
      const occurrence = getMaintenanceOccurrenceDisplay(itemAny);
      const itemDescricao = getItemOsDescription(itemAny);
      const valor = getItemOsCost(itemAny);
      const reemb = getItemOsReembolso(itemAny);
      const qtd = getItemOsQuantity(itemAny);
      const uniqueKey = idItem || `${osId}|${occurrence}|${itemDescricao}|${String(date?.toISOString() || '')}|${valor}|${reemb}`;
      if (!uniqueKey || seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);

      totalRegistros += 1;
      upsert(byItem, itemDescricao, valor, reemb, qtd, osId, rowPlateKey || rowPlate);
      upsert(byFornecedor, getItemOsFornecedor(itemAny), valor, reemb, qtd, osId, rowPlateKey || rowPlate);
      upsert(byGrupo, getItemOsGrupoDespesa(itemAny), valor, reemb, qtd, osId, rowPlateKey || rowPlate);
    }

    const toRanking = (map: Map<string, RankAgg>, sortBy: 'valor' | 'reemb') => {
      return Array.from(map.values())
        .sort((a, b) => {
          const pri = sortBy === 'valor' ? b.valor - a.valor : b.reemb - a.reemb;
          if (pri !== 0) return pri;
          return b.qtd - a.qtd;
        })
        .map(item => ({
          label: item.label,
          valor: item.valor,
          reemb: item.reemb,
          qtd: item.qtd,
          osQtd: item.os.size,
          placasQtd: item.placas.size,
        }));
    };

    return {
      totalRegistros,
      topItensCusto: toRanking(byItem, 'valor'),
      topItensReembolso: toRanking(byItem, 'reemb'),
      topFornecedores: toRanking(byFornecedor, 'valor'),
      topGruposDespesa: toRanking(byGrupo, 'valor'),
    };
  }, [activeTab, displayRows, rawItensOS]);

  const exportItensOsMiniTabelaExcel = (
    title: string,
    rows: Array<{ label: string; valor: number; reemb: number; qtd: number; osQtd: number; placasQtd: number }>
  ) => {
    const stamp = nowStamp();
    const wb = XLSX.utils.book_new();
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'itens_os';

    const totalValor = rows.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
    const totalReemb = rows.reduce((acc, item) => acc + (Number(item.reemb) || 0), 0);
    const totalQtd = rows.reduce((acc, item) => acc + (Number(item.qtd) || 0), 0);
    const totalOs = rows.reduce((acc, item) => acc + (Number(item.osQtd) || 0), 0);
    const totalPlacas = rows.reduce((acc, item) => acc + (Number(item.placasQtd) || 0), 0);

    const payload = rows.map((item, idx) => ({
      Posicao: idx + 1,
      Categoria: item.label,
      Custo: fmtBRLZero(item.valor),
      Reembolso: fmtBRLZero(item.reemb),
      '% Reembolso': fmtPct(item.valor > 0 ? item.reemb / item.valor : 0),
      Quantidade: fmtNum(item.qtd),
      'OS com Itens': fmtNum(item.osQtd),
      Placas: fmtNum(item.placasQtd),
    }));

    payload.push({
      Posicao: 'TOTAL',
      Categoria: rows.length ? 'Total geral' : 'Sem dados',
      Custo: fmtBRLZero(totalValor),
      Reembolso: fmtBRLZero(totalReemb),
      '% Reembolso': fmtPct(totalValor > 0 ? totalReemb / totalValor : 0),
      Quantidade: fmtNum(totalQtd),
      'OS com Itens': fmtNum(totalOs),
      Placas: fmtNum(totalPlacas),
    } as any);

    const ws = XLSX.utils.json_to_sheet(payload);
    ws['!cols'] = [
      { wch: 10 },
      { wch: 42 },
      { wch: 16 },
      { wch: 16 },
      { wch: 13 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, slug.slice(0, 31) || 'itens_os');
    XLSX.writeFile(wb, `analise_itens_os_${slug}_${stamp.fileStamp}.xlsx`);
  };

  const itensOsEstimativaRows = useMemo<ItemOsEstimativaRow[]>(() => {
    if (activeTab !== 'itensos') return [];

    const maintRows = rawM as ManutencaoRow[]|null ?? [];
    if (!displayRows.length || !maintRows.length) return [];

    const defaultIntervalByType: Record<EstimativaManutencaoTipo, number> = {
      PREVENTIVA: 180,
      CORRETIVA: 120,
    };

    const today = new Date();
    const vehicleByPlate = new Map<string, VehicleRow>();
    for (const vehicle of displayRows) {
      const plateKey = canonicalPlate(vehicle.placa || '');
      if (!plateKey) continue;
      const current = vehicleByPlate.get(plateKey);
      if (!current) {
        vehicleByPlate.set(plateKey, vehicle);
        continue;
      }

      const currentStart = parseDateFlexible(current.dataInicial || '')?.getTime() || 0;
      const nextStart = parseDateFlexible(vehicle.dataInicial || '')?.getTime() || 0;
      if (nextStart >= currentStart) vehicleByPlate.set(plateKey, vehicle);
    }
    if (!vehicleByPlate.size) return [];

    type MaintEvent = { tipo: EstimativaManutencaoTipo; data: Date; custo: number };
    const eventsByPlate = new Map<string, MaintEvent[]>();
    const seenEvents = new Set<string>();

    const pushEvent = (plateKey: string, event: MaintEvent) => {
      const bucket = eventsByPlate.get(plateKey) || [];
      bucket.push(event);
      eventsByPlate.set(plateKey, bucket);
    };

    for (const row of maintRows) {
      const rowAny = row as unknown as Record<string, unknown>;
      const plateKey = canonicalPlate(rowAny?.Placa || rowAny?.placa || '');
      if (!plateKey || !vehicleByPlate.has(plateKey)) continue;

      const status = getMaintenanceStatusText(rowAny);
      if (isCancelledStatus(status)) continue;

      const date = getMaintenanceEventDate(rowAny);
      if (!date || date > today) continue;

      const vehicle = vehicleByPlate.get(plateKey);
      const contractStart = parseDateFlexible(vehicle?.dataInicial || '');
      if (contractStart && date < contractStart) continue;

      const tipo = classifyMaintenanceEstimateType(rowAny);
      if (!tipo) continue;

      const occurrenceKey = getMaintenanceOccurrenceKey(rowAny, `${plateKey}-${date.toISOString().slice(0, 10)}`);
      const dedupeKey = `${plateKey}|${tipo}|${occurrenceKey}|${date.toISOString().slice(0, 10)}`;
      if (seenEvents.has(dedupeKey)) continue;
      seenEvents.add(dedupeKey);

      const custo = Math.max(0, parseNum(
        rowAny.ValorTotalFatItens
        || rowAny.ValorTotal
        || rowAny.valortotal
        || rowAny.CustoTotalOS
        || rowAny.custo_total_os
        || 0
      ));

      pushEvent(plateKey, { tipo, data: date, custo });
    }

    const globalCountByType: Record<EstimativaManutencaoTipo, number> = { PREVENTIVA: 0, CORRETIVA: 0 };
    const globalCostsByType: Record<EstimativaManutencaoTipo, number[]> = { PREVENTIVA: [], CORRETIVA: [] };
    const globalIntervalsByType: Record<EstimativaManutencaoTipo, number[]> = { PREVENTIVA: [], CORRETIVA: [] };
    const cohortCostsByType = new Map<string, number[]>();
    const cohortIntervalsByType = new Map<string, number[]>();

    const getCohortKey = (modelo: string, tipo: EstimativaManutencaoTipo) => `${String(modelo || 'SEM_MODELO').trim().toUpperCase()}::${tipo}`;
    const pushMapNumber = (map: Map<string, number[]>, key: string, values: number[]) => {
      if (!values.length) return;
      const bucket = map.get(key) || [];
      bucket.push(...values);
      map.set(key, bucket);
    };

    const getTypeIntervals = (events: MaintEvent[]) => {
      const intervals: number[] = [];
      for (let idx = 1; idx < events.length; idx += 1) {
        const days = diffDays(events[idx].data, events[idx - 1].data);
        if (days > 0) intervals.push(days);
      }
      return intervals;
    };

    for (const [plateKey, plateEventsRaw] of eventsByPlate.entries()) {
      const vehicle = vehicleByPlate.get(plateKey);
      if (!vehicle) continue;

      const plateEvents = [...plateEventsRaw].sort((a, b) => a.data.getTime() - b.data.getTime());
      const byType: Record<EstimativaManutencaoTipo, MaintEvent[]> = {
        PREVENTIVA: plateEvents.filter(event => event.tipo === 'PREVENTIVA'),
        CORRETIVA: plateEvents.filter(event => event.tipo === 'CORRETIVA'),
      };

      for (const tipo of ['PREVENTIVA', 'CORRETIVA'] as EstimativaManutencaoTipo[]) {
        const typeEvents = byType[tipo];
        globalCountByType[tipo] += typeEvents.length;

        const costs = typeEvents.map(event => event.custo).filter(cost => cost > 0);
        if (costs.length) globalCostsByType[tipo].push(...costs);

        const intervals = getTypeIntervals(typeEvents);
        if (intervals.length) globalIntervalsByType[tipo].push(...intervals);

        const cohortKey = getCohortKey(vehicle.modelo, tipo);
        pushMapNumber(cohortCostsByType, cohortKey, costs);
        pushMapNumber(cohortIntervalsByType, cohortKey, intervals);
      }
    }

    const globalTypedCount = globalCountByType.PREVENTIVA + globalCountByType.CORRETIVA;
    const globalFreqByType: Record<EstimativaManutencaoTipo, number> = {
      PREVENTIVA: globalTypedCount > 0 ? globalCountByType.PREVENTIVA / globalTypedCount : 0.5,
      CORRETIVA: globalTypedCount > 0 ? globalCountByType.CORRETIVA / globalTypedCount : 0.5,
    };

    const resolveIntervalForType = (
      tipo: EstimativaManutencaoTipo,
      plateIntervals: number[],
      modelo: string,
    ) => {
      if (plateIntervals.length) return Math.max(7, Math.round(quantile(plateIntervals, 0.5)));
      const cohortIntervals = cohortIntervalsByType.get(getCohortKey(modelo, tipo)) || [];
      if (cohortIntervals.length) return Math.max(7, Math.round(quantile(cohortIntervals, 0.5)));
      if (globalIntervalsByType[tipo].length) return Math.max(7, Math.round(quantile(globalIntervalsByType[tipo], 0.5)));
      return defaultIntervalByType[tipo];
    };

    const resolveCostsForType = (
      tipo: EstimativaManutencaoTipo,
      plateCosts: number[],
      modelo: string,
    ) => {
      if (plateCosts.length >= 2) return { metodoCusto: 'PLACA' as const, values: plateCosts };

      const cohortCosts = (cohortCostsByType.get(getCohortKey(modelo, tipo)) || []).filter(value => value > 0);
      if (cohortCosts.length >= 3) return { metodoCusto: 'COORTE' as const, values: cohortCosts };

      const globalCosts = globalCostsByType[tipo].filter(value => value > 0);
      if (globalCosts.length) return { metodoCusto: 'GLOBAL' as const, values: globalCosts };

      return { metodoCusto: 'GLOBAL' as const, values: [0] };
    };

    const rows: ItemOsEstimativaRow[] = [];
    for (const vehicle of Array.from(vehicleByPlate.values()).sort((a, b) => String(a.placa || '').localeCompare(String(b.placa || ''), 'pt-BR'))) {
      const plateKey = canonicalPlate(vehicle.placa || '');
      const plateEvents = [...(eventsByPlate.get(plateKey) || [])].sort((a, b) => a.data.getTime() - b.data.getTime());
      const totalEvents = plateEvents.length;
      const lastEvent = totalEvents > 0 ? plateEvents[totalEvents - 1] : null;

      const byType: Record<EstimativaManutencaoTipo, MaintEvent[]> = {
        PREVENTIVA: plateEvents.filter(event => event.tipo === 'PREVENTIVA'),
        CORRETIVA: plateEvents.filter(event => event.tipo === 'CORRETIVA'),
      };
      const intervalsByType: Record<EstimativaManutencaoTipo, number[]> = {
        PREVENTIVA: getTypeIntervals(byType.PREVENTIVA),
        CORRETIVA: getTypeIntervals(byType.CORRETIVA),
      };

      const scoreByType = { PREVENTIVA: 0, CORRETIVA: 0 };
      for (const tipo of ['PREVENTIVA', 'CORRETIVA'] as EstimativaManutencaoTipo[]) {
        const typeEvents = byType[tipo];
        const count = typeEvents.length;
        const interval = resolveIntervalForType(tipo, intervalsByType[tipo], vehicle.modelo);
        const lastTypeEvent = count > 0 ? typeEvents[typeEvents.length - 1] : null;
        const daysSinceType = lastTypeEvent ? Math.max(0, diffDays(today, lastTypeEvent.data)) : interval;
        const freqPart = totalEvents > 0 ? count / totalEvents : globalFreqByType[tipo];
        const urgencyPart = clamp(daysSinceType / Math.max(interval, 1), 0, 1.5);
        const sparsePenalty = count === 0 ? 0.8 : 1;
        scoreByType[tipo] = sparsePenalty * ((freqPart * 0.65) + (Math.min(urgencyPart, 1) * 0.35));
      }

      const proximoTipo: EstimativaManutencaoTipo = scoreByType.PREVENTIVA >= scoreByType.CORRETIVA ? 'PREVENTIVA' : 'CORRETIVA';
      const scoreTotal = scoreByType.PREVENTIVA + scoreByType.CORRETIVA;
      const probabilidade = scoreTotal > 0 ? scoreByType[proximoTipo] / scoreTotal : 0.5;

      const selectedEvents = byType[proximoTipo];
      const selectedIntervals = intervalsByType[proximoTipo];
      const selectedInterval = resolveIntervalForType(proximoTipo, selectedIntervals, vehicle.modelo);
      const lastSelectedEvent = selectedEvents.length > 0 ? selectedEvents[selectedEvents.length - 1] : lastEvent;
      const proximaData = lastSelectedEvent ? addDays(lastSelectedEvent.data, selectedInterval) : addDays(today, selectedInterval);
      const diasAteProximo = proximaData ? diffDays(proximaData, today) : Number.NaN;

      const plateCosts = selectedEvents.map(event => event.custo).filter(cost => cost > 0);
      const resolvedCosts = resolveCostsForType(proximoTipo, plateCosts, vehicle.modelo);
      const custoEstimado = average(resolvedCosts.values);
      const custoP25 = quantile(resolvedCosts.values, 0.25);
      const custoP75 = quantile(resolvedCosts.values, 0.75);

      const intervalAverage = average(selectedIntervals);
      const cv = selectedIntervals.length > 1 && intervalAverage > 0 ? stdDev(selectedIntervals) / intervalAverage : 1;
      const historyFactor = clamp(selectedEvents.length / 6, 0, 1);
      const consistencyFactor = selectedIntervals.length > 1 ? clamp(1 - cv, 0, 1) : 0.35;
      const sourceBoost = resolvedCosts.metodoCusto === 'PLACA' ? 0.2 : resolvedCosts.metodoCusto === 'COORTE' ? 0.1 : 0;
      const confianca = clamp(0.25 + (historyFactor * 0.4) + (consistencyFactor * 0.25) + sourceBoost, 0.15, 0.97);

      const alerta = totalEvents === 0
        ? 'Sem histórico da placa'
        : selectedEvents.length < 2
          ? 'Histórico reduzido para o tipo previsto'
          : diasAteProximo < 0
            ? 'Possível atraso do próximo evento'
            : probabilidade < 0.55
              ? 'Probabilidade equilibrada entre tipos'
              : 'Base histórica consistente';

      rows.push({
        placa: vehicle.placa,
        modelo: vehicle.modelo,
        grupo: vehicle.grupo,
        kmAtual: Number(vehicle.kmAtual) || 0,
        ultimoEventoTipo: lastEvent ? lastEvent.tipo : '—',
        ultimoEventoData: lastEvent ? lastEvent.data : null,
        diasSemEvento: lastEvent ? Math.max(0, diffDays(today, lastEvent.data)) : Number.NaN,
        proximoTipo,
        probabilidade,
        proximaData,
        diasAteProximo,
        intervaloDias: selectedInterval,
        custoEstimado,
        custoP25,
        custoP75,
        eventosTipo: selectedEvents.length,
        eventosTotais: totalEvents,
        metodoCusto: resolvedCosts.metodoCusto,
        confianca,
        alerta,
      });
    }

    return rows;
  }, [activeTab, displayRows, rawM]);

  const sortedItensOsEstimativaRows = useMemo(() => {
    const rows = [...itensOsEstimativaRows];
    const dir = estimativaSort.dir === 'asc' ? 1 : -1;

    const getter = (row: ItemOsEstimativaRow, key: string) => {
      if (key === 'placa') return String(row.placa || '').toUpperCase();
      if (key === 'modelo') return String(row.modelo || '').toUpperCase();
      if (key === 'grupo') return String(row.grupo || '').toUpperCase();
      if (key === 'kmAtual') return Number(row.kmAtual) || 0;
      if (key === 'ultimoEventoTipo') return String(row.ultimoEventoTipo || '');
      if (key === 'ultimoEventoData') return row.ultimoEventoData?.getTime() || 0;
      if (key === 'diasSemEvento') return Number(row.diasSemEvento) || 0;
      if (key === 'proximoTipo') return String(row.proximoTipo || '');
      if (key === 'probabilidade') return Number(row.probabilidade) || 0;
      if (key === 'proximaData') return row.proximaData?.getTime() || 0;
      if (key === 'diasAteProximo') return Number(row.diasAteProximo) || 0;
      if (key === 'intervaloDias') return Number(row.intervaloDias) || 0;
      if (key === 'custoEstimado') return Number(row.custoEstimado) || 0;
      if (key === 'custoP25') return Number(row.custoP25) || 0;
      if (key === 'custoP75') return Number(row.custoP75) || 0;
      if (key === 'eventosTipo') return Number(row.eventosTipo) || 0;
      if (key === 'eventosTotais') return Number(row.eventosTotais) || 0;
      if (key === 'metodoCusto') return String(row.metodoCusto || '');
      if (key === 'confianca') return Number(row.confianca) || 0;
      if (key === 'alerta') return String(row.alerta || '');
      return 0;
    };

    rows.sort((a, b) => {
      const va = getter(a, estimativaSort.key);
      const vb = getter(b, estimativaSort.key);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * dir;
    });

    return rows;
  }, [itensOsEstimativaRows, estimativaSort]);

  const estimativaTotalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedItensOsEstimativaRows.length / ESTIMATIVA_PAGE_SIZE)),
    [sortedItensOsEstimativaRows.length, ESTIMATIVA_PAGE_SIZE]
  );

  useEffect(() => {
    setEstimativaPage(prev => Math.min(prev, estimativaTotalPages));
  }, [estimativaTotalPages]);

  const pagedItensOsEstimativaRows = useMemo(() => {
    const start = (estimativaPage - 1) * ESTIMATIVA_PAGE_SIZE;
    return sortedItensOsEstimativaRows.slice(start, start + ESTIMATIVA_PAGE_SIZE);
  }, [sortedItensOsEstimativaRows, estimativaPage, ESTIMATIVA_PAGE_SIZE]);

  const itensOsEstimativaKpis = useMemo(() => {
    const totalVeiculos = itensOsEstimativaRows.length;
    const totalEstimado = itensOsEstimativaRows.reduce((acc, row) => acc + (Number(row.custoEstimado) || 0), 0);
    const custoMedio = totalVeiculos > 0 ? totalEstimado / totalVeiculos : 0;
    const mediaProbabilidade = totalVeiculos > 0
      ? itensOsEstimativaRows.reduce((acc, row) => acc + (Number(row.probabilidade) || 0), 0) / totalVeiculos
      : 0;
    const baixaConfianca = itensOsEstimativaRows.filter(row => row.confianca < 0.45).length;
    const eventosAtrasados = itensOsEstimativaRows.filter(row => Number.isFinite(row.diasAteProximo) && row.diasAteProximo < 0).length;

    return [
      { label: 'Veículos com Estimativa', value: fmtNum(totalVeiculos), sub: 'Placas analisadas no recorte atual', icon: BarChart3, color: 'text-indigo-600' },
      { label: 'Custo Estimado Total', value: fmtBRL(totalEstimado), sub: 'Soma do próximo evento previsto por placa', icon: DollarSign, color: 'text-rose-600' },
      { label: 'Custo Médio Previsto', value: fmtBRL(custoMedio), sub: 'Média de custo estimado por placa', icon: Gauge, color: 'text-blue-600' },
      { label: 'Probabilidade Média', value: fmtPct(mediaProbabilidade), sub: 'Chance média do tipo previsto', icon: Target, color: 'text-emerald-600' },
      { label: 'Baixa Confiança', value: fmtNum(baixaConfianca), sub: 'Placas com confiança < 45%', icon: AlertTriangle, color: baixaConfianca > 0 ? 'text-rose-600' : 'text-emerald-600' },
      { label: 'Eventos em Atraso', value: fmtNum(eventosAtrasados), sub: 'Próxima data prevista já ultrapassada', icon: ShieldAlert, color: eventosAtrasados > 0 ? 'text-rose-600' : 'text-emerald-600' },
    ];
  }, [itensOsEstimativaRows]);

  const itensOsStatusRows = useMemo<ItemOsStatusPlacaRow[]>(() => {
    if (activeTab !== 'itensos') return [];

    const defaultAlertRules = buildDefaultItemAlertRules()
      .filter(rule => rule.enabled && Number(rule.intervaloKm) > 0)
      .map(rule => ({
        ...rule,
        termos: sanitizeAlertRuleTerms(rule.termos || []),
      }));

    const sanitizeAlertRules = (rules: ItemTrocaAlertRuleConfig[]) => {
      return rules
        .filter(rule => rule.enabled && Number(rule.intervaloKm) > 0 && String(rule.label || '').trim())
        .map(rule => ({
          ...rule,
          intervaloKm: Math.max(0, Math.round(Number(rule.intervaloKm) || 0)),
          termos: sanitizeAlertRuleTerms(rule.termos.length ? rule.termos : buildTermsFromLabel(rule.label)),
        }));
    };

    const vehicleByPlate = new Map<string, VehicleRow>();
    const alertRulesByPlate = new Map<string, ItemTrocaAlertRuleConfig[]>();
    for (const vehicle of displayRows) {
      const plateKey = canonicalPlate(vehicle.placa || '');
      if (!plateKey) continue;

      const current = vehicleByPlate.get(plateKey);
      const currentStart = parseDateFlexible(current?.dataInicial || '')?.getTime() || 0;
      const nextStart = parseDateFlexible(vehicle.dataInicial || '')?.getTime() || 0;
      const shouldReplace = !current || nextStart >= currentStart;
      if (!shouldReplace) continue;

      vehicleByPlate.set(plateKey, vehicle);

      const rawRules = getEffectiveAlertRulesForVehicle(vehicle);
      const activeRules = sanitizeAlertRules(rawRules);
      alertRulesByPlate.set(plateKey, activeRules);
    }
    if (!vehicleByPlate.size) return [];

    type RuleEvent = {
      date: Date | null;
      kmEvento: number;
    };
    type RuleEventsMap = Record<string, RuleEvent[]>;

    const emptyRuleEvents = (rules: ItemTrocaAlertRuleConfig[]): RuleEventsMap => {
      const map: RuleEventsMap = {};
      for (const rule of rules) map[rule.id] = [];
      return map;
    };

    const today = new Date();
    const eventsByPlate = new Map<string, RuleEventsMap>();
    const seenEvents = new Set<string>();

    const kmPerDayForVehicle = (vehicle: VehicleRow) => {
      const kmMes = Number(vehicle.rodagemMedia) || 0;
      if (!Number.isFinite(kmMes) || kmMes <= 0) return Number.NaN;
      return kmMes / 30.4375;
    };

    const estimateKmAtDate = (vehicle: VehicleRow, date: Date | null): number => {
      if (!date) return Number.NaN;
      const kmDia = kmPerDayForVehicle(vehicle);
      if (!Number.isFinite(kmDia) || kmDia <= 0) return Number.NaN;

      const kmAtual = Number(vehicle.kmAtual) || 0;
      if (!Number.isFinite(kmAtual) || kmAtual <= 0) return Number.NaN;

      const diasAtras = Math.max(0, diffDays(today, date));
      const estimado = kmAtual - (diasAtras * kmDia);
      if (!Number.isFinite(estimado) || estimado <= 0) return Number.NaN;
      return Math.min(kmAtual, estimado);
    };

    for (const item of (rawItensOS as ItensOrdemServicoRow[] | null ?? [])) {
      const itemAny = item as Record<string, unknown>;
      const plateKey = canonicalPlate(itemAny?.Placa || itemAny?.placa || '');
      if (!plateKey || !vehicleByPlate.has(plateKey)) continue;

      const regrasPlaca = alertRulesByPlate.get(plateKey) || defaultAlertRules;
      if (!regrasPlaca.length) continue;

      const vehicle = vehicleByPlate.get(plateKey);
      if (!vehicle) continue;

      const date = getItemOsDate(itemAny);
      const contractStart = parseDateFlexible(vehicle.dataInicial || '');
      if (date) {
        if (contractStart && date < contractStart) continue;
        if (date > today) continue;
      }

      const descricao = getItemOsDescription(itemAny);
      const normalizedDesc = normalizeAlertRuleText(descricao);
      if (!normalizedDesc) continue;

      const rawKm = getItemOsEventKm(itemAny);
      const estimatedKm = estimateKmAtDate(vehicle, date);
      const kmEvento = Number.isFinite(rawKm) ? rawKm : estimatedKm;

      const itemId = String(itemAny?.IdItemOrdemServico || itemAny?.iditemordemservico || '').trim();
      const osId = getMaintenanceOrderDisplay(itemAny);
      const occ = getMaintenanceOccurrenceDisplay(itemAny);
      const dateKey = date ? date.toISOString().slice(0, 10) : '';

      for (const regra of regrasPlaca) {
        if (!doesDescricaoMatchAlertRule(normalizedDesc, regra)) continue;

        const dedupeKey = [
          plateKey,
          regra.id,
          itemId || osId,
          occ,
          dateKey,
          normalizedDesc,
        ].join('|');
        if (seenEvents.has(dedupeKey)) continue;
        seenEvents.add(dedupeKey);

        const ruleMap = eventsByPlate.get(plateKey) || emptyRuleEvents(regrasPlaca);
        const bucket = ruleMap[regra.id] || [];
        bucket.push({
          date,
          kmEvento,
        });
        ruleMap[regra.id] = bucket;
        eventsByPlate.set(plateKey, ruleMap);
      }
    }

    const fmtKm = (value: number) => Math.max(0, Math.round(value)).toLocaleString('pt-BR');
    const rows: ItemOsStatusPlacaRow[] = [];

    const sortedVehicles = [...vehicleByPlate.values()].sort((a, b) => String(a.placa || '').localeCompare(String(b.placa || ''), 'pt-BR', { numeric: true }));

    for (const vehicle of sortedVehicles) {
      const plateKey = canonicalPlate(vehicle.placa || '');
      const regrasPlaca = alertRulesByPlate.get(plateKey) || defaultAlertRules;
      const ruleMap = eventsByPlate.get(plateKey) || emptyRuleEvents(regrasPlaca);
      const kmAtual = Number(vehicle.kmAtual) || 0;
      const kmInicioContrato = Number(vehicle.odometroRetirada) || 0;
      const kmDia = kmPerDayForVehicle(vehicle);

      let riscoScore = 0;
      const itensMonitorados = regrasPlaca.length;
      let itensComTroca = 0;
      let itensVencidos = 0;
      let trocasPrecoces = 0;
      let itensSemHistorico = 0;

      let ultimaTroca: { label: string; date: Date | null } | null = null;
      let proximoEvento: { label: string; kmPara: number; data: Date | null } | null = null;
      const alertas: string[] = [];

      for (const regra of regrasPlaca) {
        const events = [...(ruleMap[regra.id] || [])]
          .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));

        const lastEvent = events.length ? events[events.length - 1] : null;
        const prevEvent = events.length > 1 ? events[events.length - 2] : null;

        if (lastEvent) {
          itensComTroca += 1;
          if (!ultimaTroca || (lastEvent.date?.getTime() || 0) >= (ultimaTroca.date?.getTime() || 0)) {
            ultimaTroca = { label: regra.label, date: lastEvent.date };
          }
        } else {
          itensSemHistorico += 1;
        }

        let kmIntervaloTroca = Number.NaN;
        if (lastEvent && prevEvent && Number.isFinite(lastEvent.kmEvento) && Number.isFinite(prevEvent.kmEvento)) {
          const delta = lastEvent.kmEvento - prevEvent.kmEvento;
          if (delta > 0) kmIntervaloTroca = delta;
        } else if (lastEvent && Number.isFinite(lastEvent.kmEvento) && kmInicioContrato > 0 && lastEvent.kmEvento > kmInicioContrato) {
          kmIntervaloTroca = lastEvent.kmEvento - kmInicioContrato;
        }

        if (Number.isFinite(kmIntervaloTroca)) {
          if (kmIntervaloTroca < (regra.intervaloKm * 0.8)) {
            trocasPrecoces += 1;
            riscoScore += 1;
            alertas.push(`${regra.label} com troca precoce (${fmtKm(kmIntervaloTroca)} km; referência ${fmtKm(regra.intervaloKm)} km)`);
          }

          if (kmIntervaloTroca > (regra.intervaloKm * 1.25)) {
            riscoScore += 1;
            alertas.push(`${regra.label} com histórico de troca tardia (${fmtKm(kmIntervaloTroca)} km)`);
          }
        }

        let kmParaRegra = Number.NaN;
        if (lastEvent && Number.isFinite(lastEvent.kmEvento)) {
          kmParaRegra = regra.intervaloKm - Math.max(0, kmAtual - lastEvent.kmEvento);
        } else if (kmInicioContrato > 0 && kmAtual > kmInicioContrato) {
          kmParaRegra = regra.intervaloKm - Math.max(0, kmAtual - kmInicioContrato);
        }

        let dataProximaRegra: Date | null = null;
        if (Number.isFinite(kmParaRegra) && Number.isFinite(kmDia) && kmDia > 0) {
          dataProximaRegra = addDays(today, Math.round(kmParaRegra / kmDia));
        }

        if (Number.isFinite(kmParaRegra)) {
          if (kmParaRegra <= 0) {
            itensVencidos += 1;
            riscoScore += 2;
            alertas.push(`${regra.label} acima da vida útil em ${fmtKm(Math.abs(kmParaRegra))} km`);
          } else if (kmParaRegra <= Math.max(2500, regra.intervaloKm * 0.1)) {
            riscoScore += 1;
            alertas.push(`${regra.label} próximo da troca (${fmtKm(kmParaRegra)} km)`);
          }

          if (!proximoEvento || kmParaRegra < proximoEvento.kmPara) {
            proximoEvento = {
              label: regra.label,
              kmPara: kmParaRegra,
              data: dataProximaRegra,
            };
          }
        }
      }

      if (itensMonitorados === 0) {
        alertas.push('Sem itens de alerta configurados para este contrato');
      }

      if (kmAtual >= 100000) {
        riscoScore += 1;
        alertas.push(`KM elevado (${kmAtual.toLocaleString('pt-BR')} km)`);
      }

      const riscoNivel: ItemOsStatusPlacaRow['riscoNivel'] = riscoScore >= 7
        ? 'ALTO'
        : riscoScore >= 3
          ? 'MEDIO'
          : 'BAIXO';

      const uniqueAlerts = Array.from(new Set(alertas));
      if (!uniqueAlerts.length) {
        uniqueAlerts.push('Itens monitorados dentro da expectativa de vida útil em KM');
      }

      const ultimaRevisao = ultimaTroca
        ? `${ultimaTroca.label}${ultimaTroca.date ? ` (${ultimaTroca.date.toLocaleDateString('pt-BR')})` : ''}`
        : 'Sem troca mapeada para os itens monitorados';

      const proximoEventoTexto = (() => {
        if (!proximoEvento || !Number.isFinite(proximoEvento.kmPara)) return 'Sem base de KM para projeção';
        if (proximoEvento.kmPara <= 0) {
          return `${proximoEvento.label} acima da vida útil (${fmtKm(Math.abs(proximoEvento.kmPara))} km)`;
        }
        const dataTxt = proximoEvento.data ? ` (~${proximoEvento.data.toLocaleDateString('pt-BR')})` : '';
        return `${proximoEvento.label} em ${fmtKm(proximoEvento.kmPara)} km${dataTxt}`;
      })();

      const diasAteProximo = proximoEvento?.data ? diffDays(proximoEvento.data, today) : Number.NaN;

      rows.push({
        placa: vehicle.placa,
        modelo: vehicle.modelo,
        kmAtual,
        ultimaRevisao,
        proximoEvento: proximoEventoTexto,
        proximoItem: proximoEvento?.label || 'Sem projeção',
        proximoEventoData: proximoEvento?.data || null,
        diasAteProximo,
        kmParaProxima: proximoEvento?.kmPara ?? Number.NaN,
        itensMonitorados,
        itensComTroca,
        itensVencidos,
        trocasPrecoces,
        itensSemHistorico,
        riscoNivel,
        riscoScore,
        alertaPrincipal: uniqueAlerts[0],
        alertas: uniqueAlerts,
      });
    }

    rows.sort((a, b) => {
      if (b.riscoScore !== a.riscoScore) return b.riscoScore - a.riscoScore;
      if (b.itensVencidos !== a.itensVencidos) return b.itensVencidos - a.itensVencidos;

      const aKm = Number.isFinite(a.kmParaProxima) ? a.kmParaProxima : Number.MAX_SAFE_INTEGER;
      const bKm = Number.isFinite(b.kmParaProxima) ? b.kmParaProxima : Number.MAX_SAFE_INTEGER;
      if (aKm !== bKm) return aKm - bKm;

      if (b.kmAtual !== a.kmAtual) return b.kmAtual - a.kmAtual;
      return String(a.placa || '').localeCompare(String(b.placa || ''), 'pt-BR', { numeric: true });
    });

    return rows;
  }, [activeTab, displayRows, rawItensOS, alertRulesByScope]);

  const itensOsStatusKpis = useMemo(() => {
    const total = itensOsStatusRows.length;
    const mediaItensMonitorados = total > 0
      ? itensOsStatusRows.reduce((acc, row) => acc + (Number(row.itensMonitorados) || 0), 0) / total
      : 0;
    const placasComItensVencidos = itensOsStatusRows.filter(row => row.itensVencidos > 0).length;
    const trocasPrecoces = itensOsStatusRows.reduce((acc, row) => acc + row.trocasPrecoces, 0);
    const proximasAte5k = itensOsStatusRows.filter(row => Number.isFinite(row.kmParaProxima) && row.kmParaProxima <= 5000).length;
    const semHistorico = itensOsStatusRows.filter(row => row.itensSemHistorico > 0).length;
    const altoRisco = itensOsStatusRows.filter(row => row.riscoNivel === 'ALTO').length;

    return [
      { label: 'Placas Monitoradas', value: fmtNum(total), sub: `Média ${mediaItensMonitorados.toFixed(1).replace('.', ',')} item(ns) por veículo`, icon: BarChart3, color: 'text-indigo-600' },
      { label: 'Placas com Itens Vencidos', value: fmtNum(placasComItensVencidos), sub: 'Acima da vida útil em KM', icon: Gauge, color: placasComItensVencidos > 0 ? 'text-rose-600' : 'text-emerald-600' },
      { label: 'Trocas Precoces', value: fmtNum(trocasPrecoces), sub: 'Troca antes de 80% da referência', icon: AlertTriangle, color: trocasPrecoces > 0 ? 'text-amber-600' : 'text-emerald-600' },
      { label: 'Próxima Troca <= 5.000 KM', value: fmtNum(proximasAte5k), sub: 'Prioridade operacional imediata', icon: Target, color: proximasAte5k > 0 ? 'text-amber-600' : 'text-emerald-600' },
      { label: 'Risco Alto', value: fmtNum(altoRisco), sub: 'Concentração de alertas críticos', icon: ShieldAlert, color: altoRisco > 0 ? 'text-rose-600' : 'text-emerald-600' },
      { label: 'Sem Histórico de Troca', value: fmtNum(semHistorico), sub: 'Sem base completa para todos os itens', icon: ShieldAlert, color: semHistorico > 0 ? 'text-slate-600' : 'text-emerald-600' },
    ];
  }, [itensOsStatusRows]);

  const exportItensOsStatusExcel = (rows: ItemOsStatusPlacaRow[]) => {
    const stamp = nowStamp();
    const wb = XLSX.utils.book_new();

    const payload = rows.map((row) => ({
      Placa: row.placa || '—',
      Modelo: row.modelo || '—',
      'KM Atual': fmtNum(row.kmAtual),
      'Última Revisão': row.ultimaRevisao,
      'Próximo Evento Previsto': row.proximoEvento,
      'Próximo Item': row.proximoItem,
      'KM para Próxima Troca': Number.isFinite(row.kmParaProxima) ? Math.max(0, Math.round(row.kmParaProxima)).toLocaleString('pt-BR') : '—',
      'Data Próximo Evento': row.proximoEventoData ? row.proximoEventoData.toLocaleDateString('pt-BR') : '—',
      'Dias para Próximo Evento': Number.isFinite(row.diasAteProximo) ? fmtNum(row.diasAteProximo) : '—',
      'Itens Monitorados': row.itensMonitorados.toLocaleString('pt-BR'),
      'Itens com Troca Registrada': row.itensComTroca.toLocaleString('pt-BR'),
      'Itens Vencidos': row.itensVencidos.toLocaleString('pt-BR'),
      'Trocas Precoces': row.trocasPrecoces.toLocaleString('pt-BR'),
      'Itens sem Histórico': row.itensSemHistorico.toLocaleString('pt-BR'),
      'Nível de Risco': row.riscoNivel,
      'Score de Risco': row.riscoScore.toLocaleString('pt-BR'),
      'Alerta Principal': row.alertaPrincipal,
      'Alertas Pendentes': row.alertas.join(' | '),
    }));

    const ws = XLSX.utils.json_to_sheet(payload);
    ws['!cols'] = [
      { wch: 10 },
      { wch: 20 },
      { wch: 12 },
      { wch: 26 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 15 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 34 },
      { wch: 56 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'status_placa_itens_os');
    XLSX.writeFile(wb, `analise_itens_os_status_placa_${stamp.fileStamp}.xlsx`);
  };

  const exportItensOsEstimativaExcel = (rows: ItemOsEstimativaRow[]) => {
    const stamp = nowStamp();
    const wb = XLSX.utils.book_new();

    const payload = rows.map((row) => ({
      Placa: row.placa || '—',
      Modelo: row.modelo || '—',
      Grupo: row.grupo || '—',
      'KM Atual': fmtNum(row.kmAtual),
      'Último Tipo': row.ultimoEventoTipo,
      'Último Evento': row.ultimoEventoData ? row.ultimoEventoData.toLocaleDateString('pt-BR') : '—',
      'Dias sem Evento': Number.isFinite(row.diasSemEvento) ? fmtNum(row.diasSemEvento) : '—',
      'Próximo Tipo': row.proximoTipo,
      Probabilidade: fmtPct(row.probabilidade),
      'Próxima Data': row.proximaData ? row.proximaData.toLocaleDateString('pt-BR') : '—',
      'Dias para Próximo': Number.isFinite(row.diasAteProximo) ? fmtNum(row.diasAteProximo) : '—',
      'Intervalo Médio (dias)': fmtNum(row.intervaloDias),
      'Custo Estimado': fmtBRLZero(row.custoEstimado),
      'Faixa P25': fmtBRLZero(row.custoP25),
      'Faixa P75': fmtBRLZero(row.custoP75),
      'Eventos do Tipo': fmtNum(row.eventosTipo),
      'Eventos Totais': fmtNum(row.eventosTotais),
      'Método Custo': row.metodoCusto,
      Confiança: fmtPct(row.confianca),
      Alerta: row.alerta,
    }));

    const ws = XLSX.utils.json_to_sheet(payload);
    ws['!cols'] = [
      { wch: 10 },
      { wch: 20 },
      { wch: 18 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 13 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 15 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 13 },
      { wch: 10 },
      { wch: 42 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'estimativa_itens_os');
    XLSX.writeFile(wb, `analise_itens_os_estimativa_${stamp.fileStamp}.xlsx`);
  };

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
        { key:'classificacaoOdometro', label:'Classificação Odômetro', fmt:r=>r.classificacaoOdometro, align:'left', w:145, sortGetter: r=>getOdometroBucketOrder(r.classificacaoOdometro) },
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
    } else if (tab === 'itensos') {
      cols.push({ key:'qtdOsComItens', label:'OS com Itens', fmt:r=>fmtNum(r.qtdOsComItens), align:'right', w:95, sortGetter: r=>r.qtdOsComItens });
      cols.push({ key:'qtdItensOs', label:'Qtd Itens', fmt:r=>fmtNum(r.qtdItensOs), align:'right', w:90, sortGetter: r=>r.qtdItensOs });
      cols.push({ key:'qtdTiposItensOs', label:'Tipos de Itens', fmt:r=>fmtNum(r.qtdTiposItensOs), align:'right', w:100, sortGetter: r=>r.qtdTiposItensOs });
      cols.push({ key:'totalItensOsValor', label:'Custo Bruto Itens', fmt:r=>fmtBRL(r.totalItensOsValor), cls:r=>clrV(r.totalItensOsValor, false), align:'right', w:130, sortGetter: r=>r.totalItensOsValor });
      cols.push({ key:'totalItensOsReemb', label:'Reembolso Itens', fmt:r=>fmtBRLZero(r.totalItensOsReemb), align:'right', w:130, sortGetter: r=>r.totalItensOsReemb });
      cols.push({ key:'custoLiqItensOs', label:'Custo Líq. Itens', fmt:r=>fmtBRLZero(r.custoLiqItensOs), cls:r=>clrV(r.custoLiqItensOs, false), align:'right', w:125, sortGetter: r=>r.custoLiqItensOs });
      cols.push({ key:'pctRecuperacaoItensOs', label:'% Recuperação', fmt:r=>fmtPct(r.pctRecuperacaoItensOs), align:'right', w:100, sortGetter: r=>r.pctRecuperacaoItensOs });
      cols.push({ key:'ticketMedioOsComItens', label:'Ticket por OS', fmt:r=>fmtBRL(r.ticketMedioOsComItens), align:'right', w:120, sortGetter: r=>r.ticketMedioOsComItens });
      cols.push({ key:'custoMedioItemOs', label:'Custo Médio Item', fmt:r=>fmtBRL(r.custoMedioItemOs), align:'right', w:120, sortGetter: r=>r.custoMedioItemOs });
      cols.push({ key:'faturamentoTotal', label:'Faturamento', fmt:r=>fmtBRL(r.faturamentoTotal), align:'right', w:125, sortGetter: r=>r.faturamentoTotal });
      cols.push({ key:'pctItensOsFat', label:'% Itens/Fat', fmt:r=>fmtPct(r.pctItensOsFat), cls:r=>clrPctThreshold(r.pctItensOsFat, fatPctAlertThreshold), align:'right', w:100, sortGetter: r=>r.pctItensOsFat });
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

  const tabHasYearDetail = (tab: TabKey) => tab !== 'previsto' && tab !== 'itensos' && tab !== 'resumo' && tab !== 'listagemCto';

  const isMainDataTableVisible = useMemo(
    () => activeTab !== 'resumo'
      && activeTab !== 'listagemCto'
      && !(activeTab === 'itensos' && (activeItemsSubTab === 'estimativa' || activeItemsSubTab === 'status')),
    [activeTab, activeItemsSubTab]
  );

  // Build dynamic columns
  const tabCols = useMemo(
    () => {
      if (!isMainDataTableVisible) return [];
      return getTabColsForTab(activeTab, dynYears, tabHasYearDetail(activeTab) ? !!showYearDetailByTab[activeTab] : true);
    },
    [activeTab, dynYears, fatPctAlertThreshold, showYearDetailByTab, isMainDataTableVisible]
  );

  const groupColWidth = 120;
  const clienteColWidth = groupColWidth;
  const idCols = useMemo(() => getIdCols(kmRedThreshold), [kmRedThreshold]);

  const allCols = useMemo(() => {
    if (!isMainDataTableVisible) return [];
    const idColsAdjusted = idCols.map(col => {
      if (col.key === 'cliente') return { ...col, w: clienteColWidth };
      if (col.key === 'modelo') return { ...col, w: 240 };
      if (col.key === 'grupo') return { ...col, w: groupColWidth };
      return col;
    });
    return [...idColsAdjusted, ...tabCols];
  }, [tabCols, idCols, clienteColWidth, groupColWidth, isMainDataTableVisible]);

  // leftOffsets removed — sticky columns disabled (user requested)

  const textEllipsisCols = useMemo(
    () => new Set(['cliente', 'contrato', 'placa', 'modelo', 'grupo', 'vencimentoContrato']),
    []
  );

  const tableMinWidth = useMemo(() => {
    if (!isMainDataTableVisible) return 0;
    return allCols.reduce((sum, col) => {
      const base = col.w || 90;
      const adjusted = col.align === 'right' ? Math.max(base, 108) : base;
      return sum + adjusted;
    }, 0);
  }, [allCols, isMainDataTableVisible]);

  // Totais das colunas (quando compatível)
  const colTotals = useMemo(() => {
    if (!isMainDataTableVisible || allCols.length === 0) return {} as Record<string, number | null>;

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

      // average for mean columns (Custo/KM, Ticket Médio, Custo KM Líq)
      if (kk.includes('custokm') || kk === 'ticketmedio') {
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
  }, [displayRows, allCols, isMainDataTableVisible]);

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
        const cols = [...idCols, ...getTabColsForTab(tab.key, years, true)];
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
        filterClassificacaoOdometro.length ? `Class. Odômetro: ${filterClassificacaoOdometro.join(', ')}` : '',
        `KM vermelho acima de: ${Math.round(kmRedThreshold).toLocaleString('pt-BR')}`,
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
      filterClassificacaoOdometro.length ? `Class. Odômetro: ${filterClassificacaoOdometro.join(', ')}` : '',
      `KM vermelho acima de: ${Math.round(kmRedThreshold).toLocaleString('pt-BR')}`,
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
      'bg-emerald-700': '#047857',
      'bg-red-700': '#b91c1c',
      'bg-purple-700': '#7e22ce',
      'bg-teal-700': '#0f766e',
    };

    const getPrintKpisForTab = (tab: TabKey) => {
      let totalPassagens = 0;
      let totalPassagemPrevista = 0;
      let veiculosCriticosDiff = 0;
      let veiculosCriticosPct = 0;
      let somaRodagemMedia = 0;
      let totalOcorrenciasManutencao = 0;
      let totalOcorrenciasEfetivas = 0;
      let totalOcorrenciasCanceladas = 0;
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
      let totalItensOsValor = 0;
      let totalItensOsReemb = 0;
      let totalItensOsQtd = 0;
      let totalOsComItens = 0;
      let totalItensTipos = 0;

      for (const row of displayRows) {
        totalPassagens += Number(row.passagemTotal) || 0;
        totalPassagemPrevista += Number(row.passagemIdeal) || 0;
        somaRodagemMedia += Number(row.rodagemMedia) || 0;
        totalOcorrenciasManutencao += Number(row.qtdOcorrenciasTotal) || 0;
        totalOcorrenciasEfetivas += Number(row.qtdOcorrenciasEfetivas) || 0;
        totalOcorrenciasCanceladas += Number(row.qtdOcorrenciasCanceladas) || 0;
        if ((Number(row.diferencaPassagem) || 0) > passagemDiffAlertThreshold) veiculosCriticosDiff++;
        if ((Number(row.pctPassagem) || 0) > passagemPctAlertThreshold) veiculosCriticosPct++;

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
        totalItensOsValor += Number(row.totalItensOsValor) || 0;
        totalItensOsReemb += Number(row.totalItensOsReemb) || 0;
        totalItensOsQtd += Number(row.qtdItensOs) || 0;
        totalOsComItens += Number(row.qtdOsComItens) || 0;
        totalItensTipos += Number(row.qtdTiposItensOs) || 0;
      }

      const totalVeiculos = displayRows.length;
      const pctCriticosDiff = totalVeiculos > 0 ? veiculosCriticosDiff / totalVeiculos : 0;
      const pctCriticosPct = totalVeiculos > 0 ? veiculosCriticosPct / totalVeiculos : 0;
      const rodagemMedia = totalVeiculos > 0 ? somaRodagemMedia / totalVeiculos : 0;
      const pctCancelamentoOcorrencias = totalOcorrenciasManutencao > 0 ? totalOcorrenciasCanceladas / totalOcorrenciasManutencao : 0;
      const pctDesvioPrevReal = totalPrevisto > 0 ? (totalRealizado / totalPrevisto) - 1 : 0;
      const pctRecuperacaoMan = totalManutencao > 0 ? totalReembMan / totalManutencao : 0;
      const pctRecuperacaoSin = totalSinistro > 0 ? totalReembSin / totalSinistro : 0;
      const custoLiqTotalManSin = totalManSin - totalReembManSin;
      const ticketMedioTotal = totalEventosManSin > 0 ? totalManSin / totalEventosManSin : 0;
      const margemManutencao = faturamentoTotal > 0 ? 1 - (totalCustoLiqMan / faturamentoTotal) : 0;
      const impactoManutencao = faturamentoTotal > 0 ? totalCustoLiqMan / faturamentoTotal : 0;
      const impactoSinistro = faturamentoTotal > 0 ? totalCustoLiqSin / faturamentoTotal : 0;
      const custoLiqItensOs = totalItensOsValor - totalItensOsReemb;
      const pctRecuperacaoItensOs = totalItensOsValor > 0 ? totalItensOsReemb / totalItensOsValor : 0;
      const ticketMedioOsItens = totalOsComItens > 0 ? totalItensOsValor / totalOsComItens : 0;
      const custoMedioItemOs = totalItensOsQtd > 0 ? totalItensOsValor / totalItensOsQtd : 0;
      const impactoItensOs = faturamentoTotal > 0 ? totalItensOsValor / faturamentoTotal : 0;

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
      if (tab === 'itensos') {
        return [
          { label: 'Custo Bruto Itens', value: fmtBRL(totalItensOsValor), cls: 'text-red-600' },
          { label: 'Reembolso Itens', value: fmtBRL(totalItensOsReemb), cls: 'text-emerald-600' },
          { label: 'Custo Líq. Itens', value: fmtBRL(custoLiqItensOs), cls: 'text-red-600' },
          { label: '% Recuperação', value: fmtPct(pctRecuperacaoItensOs), cls: 'text-blue-600' },
          { label: 'Ticket por OS', value: fmtBRL(ticketMedioOsItens), cls: 'text-indigo-600' },
          { label: 'Custo Médio Item', value: fmtBRL(custoMedioItemOs), cls: 'text-purple-600' },
          { label: 'Tipos de Itens', value: fmtNum(totalItensTipos), cls: 'text-slate-700' },
          { label: 'Impacto Itens/Fat', value: fmtPct(impactoItensOs), cls: impactoItensOs > fatPctAlertThreshold ? 'text-red-600' : 'text-emerald-600' },
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
        { label: 'Ocorrências Efetivas', value: fmtNum(totalOcorrenciasEfetivas), cls: 'text-emerald-600' },
        { label: '% Cancelamento', value: fmtPct(pctCancelamentoOcorrencias), cls: pctCancelamentoOcorrencias > 0.35 ? 'text-red-600' : 'text-amber-600' },
        { label: 'Passagem Prevista', value: fmtNominal(Math.round(totalPassagemPrevista * 10) / 10), cls: 'text-indigo-600' },
        { label: 'Críticos (Dif.)', value: `${fmtNum(veiculosCriticosDiff)} (${fmtPct(pctCriticosDiff)})`, cls: 'text-red-600' },
        { label: 'Críticos (% Pass.)', value: `${fmtNum(veiculosCriticosPct)} (${fmtPct(pctCriticosPct)})`, cls: 'text-amber-600' },
        { label: 'Casos para Atenção', value: fmtNum(getCriticalCaseCountForTab(tab)), cls: 'text-red-600' },
        { label: 'Rodagem Média', value: fmtNum(Math.round(rodagemMedia)), cls: 'text-blue-600' },
      ];
    };

    const getPrintParametersForTab = (tab: TabKey) => {
      if (tab === 'passagem') {
        return `Alerta de diferença: ${fmtNum(passagemDiffAlertThreshold)} passagens | Alerta percentual: ${fmtPct(passagemPctAlertThreshold)}`;
      }
      if (tab === 'itensos') {
        return `Alerta de impacto itens/faturamento: ${fmtPct(fatPctAlertThreshold)}`;
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
        const cols = [...idCols, ...getTabColsForTab(tab.key, years, true)];
        const bannerColor = colorByBgClass[tab.hdr] || '#334155';
        const header = cols.map((col, idx) => `<th class="${idx < idCols.length ? 'id-col' : 'tab-col'}">${escapeHtml(col.label)}</th>`).join('');
        const kpis = getPrintKpisForTab(tab.key)
          .map(k => `<div class="kpi-chip"><span class="kpi-label">${escapeHtml(k.label)}</span><span class="kpi-value ${escapeHtml(k.cls)}">${escapeHtml(k.value)}</span></div>`)
          .join('');
        const body = displayRows.map((row) => {
          const tds = cols.map((col, idx) => {
            const colClass = col.cls ? col.cls(row) : '';
            const alignClass = col.align === 'right' ? 'num' : 'txt';
            const zoneClass = idx < idCols.length ? 'id-col' : 'tab-col';
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
      'Passagem Total: soma das ocorrências de manutenção não canceladas por veículo.',
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
    itensos: [
      'Consolida itens de ordem de serviço por placa, contrato e vínculo de veículo.',
      'Custo Bruto Itens: soma dos valores dos itens de OS no período.',
      'Custo Líquido Itens = Custo Bruto Itens - Reembolso de Itens.',
      'Ticket por OS = Custo Bruto Itens / quantidade de OS com itens.',
      '% Itens/Fat = Custo Bruto de Itens / Faturamento do veículo.',
      'Na subaba Status por Placa, os itens monitorados e a KM de troca podem ser ajustados em Configurar Regras por Contrato.'
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
                  <p className="text-xs text-slate-500">Configuração manual de custo por contrato/grupo e itens de alerta de troca por KM.</p>
                </div>
                <button type="button" onClick={()=>setShowRulesManager(false)} className="h-9 w-9 rounded-full border border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 overflow-auto">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                  <div className="text-sm font-semibold text-slate-900">Parâmetro de KM</div>
                  <p className="text-xs text-slate-500 mt-0.5">KM acima do limite informado fica em vermelho na tabela e nas exportações.</p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="text-xs font-medium text-slate-500 mb-1 block">KM acima de</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={kmRedThresholdInput}
                        onChange={(e)=>setKmRedThresholdInput(e.target.value)}
                        placeholder="70.000"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                      />
                    </div>
                    <div className="text-xs text-slate-500">
                      Atual: <span className="font-semibold text-slate-700">{Math.round(kmRedThreshold).toLocaleString('pt-BR')} km</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={saveKmRedThreshold}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 px-4 py-2 text-sm font-medium hover:bg-rose-100"
                      >
                        Salvar parâmetro de KM
                      </button>
                    </div>
                  </div>
                </div>

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

                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Alertas de Troca por KM (Status por Placa)</div>
                    <p className="text-xs text-slate-500 mt-0.5">Aqui você define os itens monitorados por Grupo + Modelo, com opção de aplicar as mesmas regras para toda a frota.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="alert-rule-apply-all"
                      type="checkbox"
                      checked={alertRuleApplyAll}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAlertRuleApplyAll(checked);
                        if (checked) {
                          setAlertRuleGrupo('');
                          setAlertRuleModelo('');
                        }
                        resetAlertRuleEditor();
                        setAlertRulesError(null);
                      }}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    <label htmlFor="alert-rule-apply-all" className="text-xs font-medium text-slate-700">Aplicar a todos (todos os grupos e modelos)</label>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                    <div className="lg:col-span-3">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Grupo</label>
                      <SearchableSelect
                        options={allGrupos}
                        value={alertRuleGrupo ? [alertRuleGrupo] : []}
                        onChange={v=>{
                          setAlertRuleGrupo(v[0] || '');
                          setAlertRuleModelo('');
                          resetAlertRuleEditor();
                          setAlertRulesError(null);
                        }}
                        placeholder="Selecione o grupo"
                        allLabel="Selecione o grupo"
                        multiple={false}
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Modelo</label>
                      <SearchableSelect
                        options={modelOptionsForAlertRule}
                        value={alertRuleModelo ? [alertRuleModelo] : []}
                        onChange={v=>{ setAlertRuleModelo(v[0] || ''); resetAlertRuleEditor(); setAlertRulesError(null); }}
                        placeholder="Selecione o modelo"
                        allLabel="Selecione o modelo"
                        multiple={false}
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Item de alerta</label>
                      <input
                        type="text"
                        placeholder="Ex.: Amortecedor"
                        value={alertRuleLabel}
                        onChange={e=>setAlertRuleLabel(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">KM estimada de troca</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="40000"
                        value={alertRuleKm}
                        onChange={e=>setAlertRuleKm(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Termos de busca (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex.: amortecedor, kit amortecedor"
                        value={alertRuleTerms}
                        onChange={e=>setAlertRuleTerms(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                      />
                    </div>

                    <div className="lg:col-span-1">
                      <button
                        type="button"
                        onClick={upsertAlertRule}
                        disabled={!canEditRules}
                        title={!canEditRules ? 'Você não tem permissão para adicionar/editar regras' : undefined}
                        className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${canEditRules ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}`}
                      >
                        <Plus className="w-4 h-4" />
                        {editingAlertRuleId ? 'Atualizar' : 'Adicionar'}
                      </button>
                    </div>
                  </div>

                  {!alertRuleApplyAll && (
                    <p className="text-[11px] text-slate-500">Dica: selecione primeiro o grupo para carregar os modelos disponíveis.</p>
                  )}

                  {editingAlertRuleId && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resetAlertRuleEditor}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Cancelar edição do item
                      </button>
                    </div>
                  )}

                  {alertRulesError && (
                    <p className="text-xs text-rose-600">{alertRulesError}</p>
                  )}

                  {!alertRuleScopeKey && (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-500">
                      Selecione Grupo e Modelo ou marque "Aplicar a todos" para configurar os itens monitorados.
                    </div>
                  )}

                  {alertRuleScopeKey && (
                    <>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs text-slate-600">
                          {alertRulesSelectedScopeUsesCustomConfig
                            ? (alertRuleScopeKey === ALERT_RULE_SCOPE_ALL
                              ? 'Configuração personalizada para toda a frota.'
                              : `Configuração personalizada para ${alertRuleGrupo} / ${alertRuleModelo}.`)
                            : (alertRuleScopeKey === ALERT_RULE_SCOPE_ALL
                              ? 'Usando regras padrão para toda a frota.'
                              : `Usando regras padrão para ${alertRuleGrupo} / ${alertRuleModelo}.`)}
                        </p>
                        <button
                          type="button"
                          onClick={() => restoreDefaultAlertRulesForScope(alertRuleScopeKey)}
                          disabled={!alertRulesSelectedScopeUsesCustomConfig}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Restaurar padrão
                        </button>
                      </div>

                      <div className="overflow-auto max-h-[32vh] rounded-lg border border-slate-200 bg-white">
                        <table className="min-w-full text-xs">
                          <thead className="sticky top-0 bg-slate-100 text-slate-600">
                            <tr>
                              <th className="text-left px-3 py-2 font-semibold">Item</th>
                              <th className="text-right px-3 py-2 font-semibold">KM troca</th>
                              <th className="text-left px-3 py-2 font-semibold">Termos de busca</th>
                              <th className="text-center px-3 py-2 font-semibold">Origem</th>
                              <th className="text-right px-3 py-2 font-semibold">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...alertRulesForSelectedScope]
                              .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true }))
                              .map((rule) => (
                                <tr key={`${alertRuleScopeKey}-${rule.id}`} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="px-3 py-2 text-slate-700">{rule.label}</td>
                                  <td className="px-3 py-2 text-right text-slate-900 font-medium">{Math.round(rule.intervaloKm).toLocaleString('pt-BR')}</td>
                                  <td className="px-3 py-2 text-slate-600 max-w-[420px] truncate" title={(rule.termos || []).join(', ')}>{(rule.termos || []).join(', ') || '—'}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${rule.source === 'default' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-violet-200 bg-violet-50 text-violet-700'}`}>
                                      {rule.source === 'default' ? 'Padrão' : 'Custom'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => canEditRules && startEditAlertRule(alertRuleScopeKey, rule)}
                                      disabled={!canEditRules}
                                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium mr-2 ${canEditRules ? 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-white text-slate-400 border border-slate-200 cursor-not-allowed'}`}
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => canEditRules && deleteAlertRule(alertRuleScopeKey, rule.id)}
                                      disabled={!canEditRules}
                                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium ${canEditRules ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'bg-white text-slate-400 border border-slate-200 cursor-not-allowed'}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />Retirar
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {alertRulesForSelectedScope.length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">Sem itens configurados para este escopo.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-3">
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
              <label className="text-xs font-medium text-slate-500 mb-1 block">Classificação Odômetro</label>
              <SearchableSelect options={opts.classificacaoOdometro} value={filterClassificacaoOdometro} onChange={v=>setFilterClassificacaoOdometro(v)} placeholder="Todas" allLabel="Todas" />
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
          {((filterCTO&&filterCTO.length)||(filterCliente&&filterCliente.length)||(filterPlaca&&filterPlaca.length)||(filterClassificacaoOdometro&&filterClassificacaoOdometro.length)||(filterGrupoModelo&&filterGrupoModelo.length)||(filterVencimento&&filterVencimento.length)||(filterTipoContrato&&filterTipoContrato.length)||(filterSitCTO&&filterSitCTO.length)||(filterSitLoc&&filterSitLoc.length)) && (
            <button onClick={()=>{setFilterCTO([]);setFilterCliente([]);setFilterPlaca([]);setFilterClassificacaoOdometro([]);setFilterGrupoModelo([]);setFilterVencimento([]);setFilterTipoContrato([]);setFilterSitCTO([]);setFilterSitLoc([]);}}
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
              <button key={t.key} onClick={()=>handleTabChange(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive?`${t.color} text-white shadow-md`:'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4" />{t.label}
              </button>
            );
          })}
          {isTabSwitchPending && (
            <span className="text-[11px] text-slate-500">Alternando aba...</span>
          )}
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
                          <th colSpan={5} className="px-3 py-1.5 text-center border-b border-slate-300 border-r border-slate-300">Manutenção</th>
                          <th colSpan={9} className="px-3 py-1.5 text-center border-b border-slate-300 border-r border-slate-300">Sinistro</th>
                          <th colSpan={4} className="px-3 py-1.5 text-center border-b border-slate-300">Status e Prazo</th>
                        </tr>
                        <tr className="sticky top-[27px] z-20 bg-slate-100">
                          <th className="text-left px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('placa')} className="flex items-center gap-1 hover:text-slate-900">Placa {resumoDetailSortIcon('placa')}</button></th>
                          <th className="text-left px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('grupo')} className="flex items-center gap-1 hover:text-slate-900">Grupo {resumoDetailSortIcon('grupo')}</button></th>
                          <th className="text-left px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('modelo')} className="flex items-center gap-1 hover:text-slate-900">Modelo {resumoDetailSortIcon('modelo')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('idadeEmMeses')} className="flex items-center gap-1 justify-end hover:text-slate-900">Idade {resumoDetailSortIcon('idadeEmMeses')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('kmAtual')} className="flex items-center gap-1 justify-end hover:text-slate-900">KM {resumoDetailSortIcon('kmAtual')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('passagemTotal')} className="flex items-center gap-1 justify-end hover:text-slate-900">Pass. Real {resumoDetailSortIcon('passagemTotal')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('passagemIdeal')} className="flex items-center gap-1 justify-end hover:text-slate-900">Pass. Prev. {resumoDetailSortIcon('passagemIdeal')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('diferencaPassagem')} className="flex items-center gap-1 justify-end hover:text-slate-900">Dif Pass. {resumoDetailSortIcon('diferencaPassagem')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('custoKmMan')} className="flex items-center gap-1 justify-end hover:text-slate-900">Custo KM Man. {resumoDetailSortIcon('custoKmMan')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('custoKmManual')} className="flex items-center gap-1 justify-end hover:text-slate-900">Custo KM Prev. {resumoDetailSortIcon('custoKmManual')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('difCustoKm')} className="flex items-center gap-1 justify-end hover:text-slate-900">Dif Custo KM {resumoDetailSortIcon('difCustoKm')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('custoKmLiqMan')} className="flex items-center gap-1 justify-end hover:text-slate-900">Custo KM Líq. {resumoDetailSortIcon('custoKmLiqMan')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('custoManRealizado')} className="flex items-center gap-1 justify-end hover:text-slate-900">Custo Man Real. {resumoDetailSortIcon('custoManRealizado')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('totalReembMan')} className="flex items-center gap-1 justify-end hover:text-slate-900">Reemb. Man. {resumoDetailSortIcon('totalReembMan')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('pctReembolsadoMan')} className="flex items-center gap-1 justify-end hover:text-slate-900">% Reemb Man {resumoDetailSortIcon('pctReembolsadoMan')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('pctManFat')} className="flex items-center gap-1 justify-end hover:text-slate-900">% Man/Fat {resumoDetailSortIcon('pctManFat')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('pctCustoLiqManFat')} className="flex items-center gap-1 justify-end hover:text-slate-900">% Liq Man/Fat {resumoDetailSortIcon('pctCustoLiqManFat')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('totalSinistro')} className="flex items-center gap-1 justify-end hover:text-slate-900">Sinistro {resumoDetailSortIcon('totalSinistro')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('totalReembSin')} className="flex items-center gap-1 justify-end hover:text-slate-900">Reemb. Sin. {resumoDetailSortIcon('totalReembSin')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('pctReembolsadoSin')} className="flex items-center gap-1 justify-end hover:text-slate-900">% Reembolsável {resumoDetailSortIcon('pctReembolsadoSin')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('pctCustoLiqSinFat')} className="flex items-center gap-1 justify-end hover:text-slate-900">Sin Líq %Fat {resumoDetailSortIcon('pctCustoLiqSinFat')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('sinistralidadeOperacional')} className="flex items-center gap-1 justify-end hover:text-slate-900">Sin Op. {resumoDetailSortIcon('sinistralidadeOperacional')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('qtdSinistros')} className="flex items-center gap-1 justify-end hover:text-slate-900">Qtd Sin. {resumoDetailSortIcon('qtdSinistros')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('indiceFrequenciaSinistro')} className="flex items-center gap-1 justify-end hover:text-slate-900">Índ. Freq. {resumoDetailSortIcon('indiceFrequenciaSinistro')}</button></th>
                          <th className="text-right px-3 py-2"><button type="button" onClick={() => handleResumoDetailSort('gravidadeMediaSinistro')} className="flex items-center gap-1 justify-end hover:text-slate-900">Gravidade {resumoDetailSortIcon('gravidadeMediaSinistro')}</button></th>
                          <th className="text-right px-3 py-2 border-r border-slate-200"><button type="button" onClick={() => handleResumoDetailSort('indiceSeveridadeDano')} className="flex items-center gap-1 justify-end hover:text-slate-900">Severidade {resumoDetailSortIcon('indiceSeveridadeDano')}</button></th>
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
                              case 'pctManFat': return Number(row.pctManFat) || 0;
                              case 'pctCustoLiqManFat': return Number(row.pctCustoLiqManFat) || 0;
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
                              case 'qtdSinistros': return Number(row.qtdSinistros) || 0;
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
                            // soma de campos numéricos
                            acc.kmAtual += Number(r.kmAtual) || 0;
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
                            acc.custoLiqMan += Number(r.custoLiqMan) || 0;
                            acc.valorVeiculoFipe += Number(r.valorVeiculoFipe) || 0;
                            acc.pctReembolsadoSin += Number(r.pctReembolsadoSin) || 0;
                            acc.idadeEmMeses += Number(r.idadeEmMeses) || 0;
                            // acumula rodagem media para depois calcular media aritmetica
                            acc.rodagemMediaSum += Number(r.rodagemMedia) || 0;
                            // somar franquia contratada e estimativa de km fim
                            acc.franquiaBancoSum += Number(r.franquiaBanco) || 0;
                            acc.kmEstimadoFim += Number(r.kmEstimadoFimContrato) || 0;
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
                            custoLiqMan: 0,
                            valorVeiculoFipe: 0,
                            pctReembolsadoSin: 0,
                            idadeEmMeses: 0,
                            kmAtual: 0,
                            rodagemMediaSum: 0,
                            franquiaBancoSum: 0,
                            kmEstimadoFim: 0,
                          });

                          filteredRows.forEach(item => {
                            const r = item.row as VehicleRow;
                            const status = item.statusInfo.status;
                            const passagemDesvio = (Number(r.diferencaPassagem) || 0) > passagemDiffAlertThreshold || (Number(r.pctPassagem) || 0) > passagemPctAlertThreshold;
                            const difCustoKm = r.custoKmManual == null ? NaN : (Number(r.custoKmMan) || 0) - (Number(r.custoKmManual) || 0);
                            const sinistralidadeOperacional = (Number(r.faturamentoTotal) || 0) > 0 ? (Number(r.totalSinistro) || 0) / (Number(r.faturamentoTotal) || 0) : NaN;
                            const indiceFrequenciaSinistro = Number(r.qtdSinistros) || 0;
                            const gravidadeMediaSinistro = indiceFrequenciaSinistro > 0 ? (Number(r.totalSinistro) || 0) / indiceFrequenciaSinistro : NaN;
                            const indiceSeveridadeDano = (Number(r.valorVeiculoFipe) || 0) > 0 ? (Number(r.totalSinistro) || 0) / (Number(r.valorVeiculoFipe) || 0) : NaN;
                            const vencido = Number.isFinite(r.prazoRestDays) && r.prazoRestDays < 0;
                            const vence90d = Number.isFinite(r.prazoRestDays) && r.prazoRestDays >= 0 && r.prazoRestDays <= 90;
                            const placaClass = 'px-3 py-2 font-medium text-slate-800';
                            const modeloClass = 'px-3 py-2 text-slate-600';
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
                                <td className={modeloClass}>{r.modelo || '—'}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${numClass}`}>{fmtInt(r.idadeEmMeses)}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${numClass}`}>{r.kmAtual > 0 ? r.kmAtual.toLocaleString('pt-BR') : '—'}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtNominal(r.passagemTotal)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtNominal(r.passagemIdeal)}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${passagemDesvio ? desvioClass : numClass}`}>{fmtNominal(r.diferencaPassagem)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtKM2(r.custoKmMan)}</td>
                                <td className={`px-3 py-2 text-right ${r.custoKmManual == null ? 'text-slate-400' : numClass}`}>{r.custoKmManual == null ? '—' : fmtKM2(r.custoKmManual)}</td>
                                <td className={`px-3 py-2 text-right ${difCustoKmClass}`}>{isFinite(difCustoKm) ? fmtKM2(difCustoKm) : '—'}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${numClass}`}>{fmtKM2(r.custoKmLiqMan)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtBRLZero(r.custoManRealizado)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtBRLZero(r.totalReembMan)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtPct(r.pctReembolsadoMan)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtPct(r.pctManFat)}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${numClass}`}>{fmtPct(r.pctCustoLiqManFat)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtBRLZero(r.totalSinistro)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtBRLZero(r.totalReembSin)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtPct(r.pctReembolsadoSin)}</td>
                                <td className={`px-3 py-2 text-right ${sinLiqFatClass}`}>{fmtPct(r.pctCustoLiqSinFat)}</td>
                                <td className={`px-3 py-2 text-right ${sinOpClass}`}>{isFinite(sinistralidadeOperacional) ? fmtPct(sinistralidadeOperacional) : 'N/D'}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtNum(Number(r.qtdSinistros) || 0)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{fmtNum(indiceFrequenciaSinistro)}</td>
                                <td className={`px-3 py-2 text-right ${numClass}`}>{isFinite(gravidadeMediaSinistro) ? fmtBRLZero(gravidadeMediaSinistro) : 'N/D'}</td>
                                <td className={`px-3 py-2 text-right border-r border-slate-200 ${severidadeClass}`}>{isFinite(indiceSeveridadeDano) ? fmtPct(indiceSeveridadeDano) : 'N/D'}</td>
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
                          const totalKmAtual = totals.kmAtual;
                          const totalRodagemMedia = filteredRows.length > 0 ? totals.rodagemMediaSum / filteredRows.length : NaN;
                          const totalFranquiaContratada = totals.franquiaBancoSum;
                          const totalKmEstimadoFim = totals.kmEstimadoFim;

                          const totalPctReembMan = totals.custoManRealizado > 0 ? totals.totalReembMan / totals.custoManRealizado : 0;
                          const totalPctReembSin = totals.totalSinistro > 0 ? totals.totalReembSin / totals.totalSinistro : 0;
                          const totalSinLiqPctFat = totals.faturamentoTotal > 0 ? totals.custoLiqSin / totals.faturamentoTotal : NaN;
                          const totalSinistralidadeOperacional = totals.faturamentoTotal > 0 ? totals.totalSinistro / totals.faturamentoTotal : NaN;
                          const totalPctManFat = totals.faturamentoTotal > 0 ? totals.custoManRealizado / totals.faturamentoTotal : NaN;
                          const totalPctCustoLiqManFat = totals.faturamentoTotal > 0 ? totals.custoLiqMan / totals.faturamentoTotal : NaN;
                          const totalIndiceFrequenciaSinistro = filteredRows.length > 0 ? totals.qtdSinistros / filteredRows.length : 0;
                          const totalGravidadeMediaSinistro = totals.qtdSinistros > 0 ? totals.totalSinistro / totals.qtdSinistros : NaN;
                          const totalIndiceSeveridadeDano = totals.valorVeiculoFipe > 0 ? totals.totalSinistro / totals.valorVeiculoFipe : NaN;

                          // linha de totais (regras: textos em — exceto primeira coluna; médias para idade/rodagem; somas para KM, passagens, franquia, km estimado)
                          rowsElems.push(
                            <tr key="_totals" className="border-t border-slate-200 bg-slate-50 font-semibold">
                              <td className="px-3 py-2">Totais (Placas: {totalPlacasFiltradas.toLocaleString('pt-BR')})</td>
                              <td className="px-3 py-2">—</td>
                              <td className="px-3 py-2">—</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{isFinite(totalIdadeMedia) ? fmtInt(totalIdadeMedia) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{totalKmAtual > 0 ? totalKmAtual.toLocaleString('pt-BR') : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtNominal(totals.passagemTotal)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtNominal(totals.passagemIdeal)}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{fmtNominal(totals.diferencaPassagem)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalCustoKmManMedio) ? fmtKM2(totalCustoKmManMedio) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalCustoKmPrevMedio) ? fmtKM2(totalCustoKmPrevMedio) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalDifCustoKmMedio) ? fmtKM2(totalDifCustoKmMedio) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{isFinite(totalCustoKmLiqMedio) ? fmtKM2(totalCustoKmLiqMedio) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtBRLZero(totals.custoManRealizado)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtBRLZero(totals.totalReembMan)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtPct(totalPctReembMan)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalPctManFat) ? fmtPct(totalPctManFat) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{isFinite(totalPctCustoLiqManFat) ? fmtPct(totalPctCustoLiqManFat) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtBRLZero(totals.totalSinistro)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtBRLZero(totals.totalReembSin)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtPct(totalPctReembSin)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalSinLiqPctFat) ? fmtPct(totalSinLiqPctFat) : 'N/D'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalSinistralidadeOperacional) ? fmtPct(totalSinistralidadeOperacional) : 'N/D'}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{totals.qtdSinistros.toLocaleString('pt-BR')}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{fmtPct(totalIndiceFrequenciaSinistro)}</td>
                              <td className="px-3 py-2 text-right text-slate-800">{isFinite(totalGravidadeMediaSinistro) ? fmtBRLZero(totalGravidadeMediaSinistro) : 'N/D'}</td>
                              <td className="px-3 py-2 text-right text-slate-800 border-r border-slate-200">{isFinite(totalIndiceSeveridadeDano) ? fmtPct(totalIndiceSeveridadeDano) : 'N/D'}</td>
                              <td className="px-3 py-2">{isFinite(totalRodagemMedia) ? fmtNominal(totalRodagemMedia) : '—'}</td>
                              <td className="px-3 py-2 text-right">{totalFranquiaContratada > 0 ? totalFranquiaContratada.toLocaleString('pt-BR') : '—'}</td>
                              <td className="px-3 py-2 text-right">{totalKmEstimadoFim > 0 ? totalKmEstimadoFim.toLocaleString('pt-BR') : '—'}</td>
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
            {activeTab === 'itensos' && (
              <div className="mb-4 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setActiveItemsSubTab('resumo')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activeItemsSubTab === 'resumo' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Resumo de Itens
                </button>
                <button
                  type="button"
                  onClick={() => setActiveItemsSubTab('status')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activeItemsSubTab === 'status' ? 'bg-cyan-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Status por Placa
                </button>
                <button
                  type="button"
                  onClick={() => setActiveItemsSubTab('estimativa')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activeItemsSubTab === 'estimativa' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Estimativa de Manutenção
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
              {(
                activeTab === 'itensos' && activeItemsSubTab === 'estimativa'
                  ? itensOsEstimativaKpis
                  : activeTab === 'itensos' && activeItemsSubTab === 'status'
                    ? itensOsStatusKpis
                    : tabKpis
              ).map((card) => {
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

            {activeTab === 'itensos' && activeItemsSubTab === 'resumo' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mb-4">
                {[
                  { title: 'Itens por Custo', firstCol: 'Item', data: itensOsRankings.topItensCusto, accent: 'text-rose-700' },
                  { title: 'Itens por Reembolso', firstCol: 'Item', data: itensOsRankings.topItensReembolso, accent: 'text-emerald-700' },
                  { title: 'Fornecedores por Custo', firstCol: 'Fornecedor', data: itensOsRankings.topFornecedores, accent: 'text-indigo-700' },
                  { title: 'Grupos de Despesa', firstCol: 'Grupo', data: itensOsRankings.topGruposDespesa, accent: 'text-slate-700' },
                ].map((block) => {
                  // obter estado de ordenação por bloco (default por custo desc)
                  const sortState = miniTableSortMap[block.title] || { key: 'valor', dir: 'desc' };
                  const sortedData = [...block.data].sort((a, b) => {
                    const dir = sortState.dir === 'asc' ? 1 : -1;
                    const getter = (it: any, k: string) => {
                      if (k === 'label') return String(it.label || '').toLowerCase();
                      if (k === 'valor') return Number(it.valor) || 0;
                      if (k === 'reemb') return Number(it.reemb) || 0;
                      if (k === 'qtd') return Number(it.qtd) || 0;
                      if (k === 'osQtd') return Number(it.osQtd) || 0;
                      if (k === 'placasQtd') return Number(it.placasQtd) || 0;
                      if (k === 'pct') return (Number(it.valor) || 0) > 0 ? (Number(it.reemb) || 0) / (Number(it.valor) || 0) : 0;
                      return 0;
                    };
                    const va = getter(a, sortState.key);
                    const vb = getter(b, sortState.key);
                    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
                    return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) * dir;
                  });

                  const totalValor = sortedData.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
                  const totalReemb = sortedData.reduce((acc, item) => acc + (Number(item.reemb) || 0), 0);
                  const totalQtd = sortedData.reduce((acc, item) => acc + (Number(item.qtd) || 0), 0);
                  const totalOs = sortedData.reduce((acc, item) => acc + (Number(item.osQtd) || 0), 0);
                  const totalPct = totalValor > 0 ? totalReemb / totalValor : 0;

                  return (
                    <div key={block.title} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{block.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">{fmtNum(sortedData.length)} registro(s)</span>
                          <button
                            type="button"
                            onClick={() => exportItensOsMiniTabelaExcel(block.title, sortedData)}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-slate-300 bg-white text-slate-500 hover:text-emerald-700 hover:border-emerald-300"
                            title={`Exportar ${block.title} para Excel`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-auto max-h-[320px]">
                        <table className="min-w-full text-xs">
                          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                            <tr>
                              <th className="text-left px-3 py-1.5"><button type="button" onClick={() => toggleMiniTableSort(block.title, 'label')} className="flex items-center gap-1 hover:text-slate-900">{block.firstCol}{miniTableSortIcon(block.title, 'label')}</button></th>
                              <th className="text-right px-3 py-1.5"><button type="button" onClick={() => toggleMiniTableSort(block.title, 'valor')} className="flex items-center gap-1 justify-end hover:text-slate-900">Custo{miniTableSortIcon(block.title, 'valor')}</button></th>
                              <th className="text-right px-3 py-1.5"><button type="button" onClick={() => toggleMiniTableSort(block.title, 'reemb')} className="flex items-center gap-1 justify-end hover:text-slate-900">Reembolso{miniTableSortIcon(block.title, 'reemb')}</button></th>
                              <th className="text-right px-3 py-1.5"><button type="button" onClick={() => toggleMiniTableSort(block.title, 'pct')} className="flex items-center gap-1 justify-end hover:text-slate-900">% Reemb.{miniTableSortIcon(block.title, 'pct')}</button></th>
                              <th className="text-right px-3 py-1.5"><button type="button" onClick={() => toggleMiniTableSort(block.title, 'qtd')} className="flex items-center gap-1 justify-end hover:text-slate-900">Qtd{miniTableSortIcon(block.title, 'qtd')}</button></th>
                              <th className="text-right px-3 py-1.5"><button type="button" onClick={() => toggleMiniTableSort(block.title, 'osQtd')} className="flex items-center gap-1 justify-end hover:text-slate-900">OS{miniTableSortIcon(block.title, 'osQtd')}</button></th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedData.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-3 py-5 text-center text-slate-400">Sem dados para o recorte atual.</td>
                              </tr>
                            )}
                            {sortedData.map((item, idx) => {
                              const pctReemb = item.valor > 0 ? item.reemb / item.valor : 0;
                              return (
                                <tr key={`${block.title}-${item.label}-${idx}`} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="px-3 py-1.5 text-slate-700 max-w-[260px] truncate" title={item.label}>{item.label}</td>
                                  <td className={`px-3 py-1.5 text-right font-semibold ${block.accent}`}>{fmtBRLZero(item.valor)}</td>
                                  <td className="px-3 py-1.5 text-right text-emerald-700">{fmtBRLZero(item.reemb)}</td>
                                  <td className="px-3 py-1.5 text-right text-slate-700">{fmtPct(pctReemb)}</td>
                                  <td className="px-3 py-1.5 text-right text-slate-700">{fmtNum(item.qtd)}</td>
                                  <td className="px-3 py-1.5 text-right text-slate-700">{fmtNum(item.osQtd)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="sticky bottom-0 z-10 bg-slate-50 border-t border-slate-200">
                            <tr className="font-semibold text-slate-700">
                              <td className="px-3 py-1.5">Total</td>
                              <td className="px-3 py-1.5 text-right">{fmtBRLZero(totalValor)}</td>
                              <td className="px-3 py-1.5 text-right text-emerald-700">{fmtBRLZero(totalReemb)}</td>
                              <td className="px-3 py-1.5 text-right">{fmtPct(totalPct)}</td>
                              <td className="px-3 py-1.5 text-right">{fmtNum(totalQtd)}</td>
                              <td className="px-3 py-1.5 text-right">{fmtNum(totalOs)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'itensos' && activeItemsSubTab === 'status' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Status por Placa</h3>
                    <p className="text-[11px] text-slate-500">
                      Vida útil por KM dos itens críticos: amortecedor 60k, disco 40k, embreagem 60k, pastilha 20k e pneu 40k.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">{fmtNum(itensOsStatusRows.length)} placa(s)</span>
                    <button
                      type="button"
                      onClick={() => exportItensOsStatusExcel(itensOsStatusRows)}
                      className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-slate-300 bg-white text-slate-500 hover:text-cyan-700 hover:border-cyan-300"
                      title="Exportar status por placa para Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-auto" style={{ maxHeight: '58vh' }}>
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2">Placa</th>
                        <th className="text-left px-3 py-2">Modelo</th>
                        <th className="text-right px-3 py-2">KM Atual</th>
                        <th className="text-left px-3 py-2">Última Troca Mapeada</th>
                        <th className="text-left px-3 py-2">Próximo Evento Previsto</th>
                        <th className="text-center px-3 py-2">Risco</th>
                        <th className="text-left px-3 py-2">Alertas Pendentes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensOsStatusRows.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-slate-400">Sem dados suficientes para o status por placa no recorte atual.</td>
                        </tr>
                      )}
                      {itensOsStatusRows.map((row) => {
                        const kmClass = row.kmAtual >= 100000 ? 'text-rose-700 font-semibold' : 'text-slate-700';
                        const riscoClass = row.riscoNivel === 'ALTO'
                          ? 'border-rose-200 bg-rose-50 text-rose-700'
                          : row.riscoNivel === 'MEDIO'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700';

                        return (
                          <tr key={`status-placa-${row.placa}-${row.modelo}`} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/40 hover:bg-cyan-50/30">
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                                {row.placa || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-700 max-w-[200px] truncate" title={row.modelo || '—'}>{row.modelo || '—'}</td>
                            <td className={`px-3 py-2 text-right ${kmClass}`}>{fmtNum(row.kmAtual)}</td>
                            <td className="px-3 py-2 text-slate-700 max-w-[260px] truncate" title={row.ultimaRevisao}>{row.ultimaRevisao}</td>
                            <td className="px-3 py-2 text-slate-700 max-w-[280px] truncate" title={row.proximoEvento}>{row.proximoEvento}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riscoClass}`}>
                                {row.riscoNivel}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1.5 max-w-[420px]">
                                {row.alertas.slice(0, 3).map((alerta, idx) => {
                                  const text = alerta.toLowerCase();
                                  const badgeClass = text.includes('sem alertas')
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : text.includes('atras') || text.includes('km elevado') || (idx === 0 && row.riscoNivel === 'ALTO')
                                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                                      : 'border-amber-200 bg-amber-50 text-amber-700';

                                  return (
                                    <span key={`${row.placa}-alerta-${idx}`} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                                      {alerta}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'itensos' && activeItemsSubTab === 'estimativa' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Estimativa de Próximo Evento por Placa</h3>
                    <p className="text-[11px] text-slate-500">
                      Probabilidade e custo estimado com base no histórico real de OS (preventiva/corretiva).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">{fmtNum(sortedItensOsEstimativaRows.length)} placa(s)</span>
                    <button
                      type="button"
                      onClick={() => exportItensOsEstimativaExcel(sortedItensOsEstimativaRows)}
                      className="inline-flex items-center justify-center h-6 w-6 rounded-md border border-slate-300 bg-white text-slate-500 hover:text-indigo-700 hover:border-indigo-300"
                      title="Exportar estimativa para Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-auto" style={{ maxHeight: '58vh' }}>
                  <table className="min-w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('placa')} className="flex items-center gap-1 hover:text-slate-900">Placa{estimativaSortIcon('placa')}</button></th>
                        <th className="text-left px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('modelo')} className="flex items-center gap-1 hover:text-slate-900">Modelo{estimativaSortIcon('modelo')}</button></th>
                        <th className="text-right px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('kmAtual')} className="flex items-center gap-1 justify-end hover:text-slate-900">KM Atual{estimativaSortIcon('kmAtual')}</button></th>
                        <th className="text-left px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('ultimoEventoTipo')} className="flex items-center gap-1 hover:text-slate-900">Último Tipo{estimativaSortIcon('ultimoEventoTipo')}</button></th>
                        <th className="text-left px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('ultimoEventoData')} className="flex items-center gap-1 hover:text-slate-900">Último Evento{estimativaSortIcon('ultimoEventoData')}</button></th>
                        <th className="text-right px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('diasSemEvento')} className="flex items-center gap-1 justify-end hover:text-slate-900">Dias sem Evento{estimativaSortIcon('diasSemEvento')}</button></th>
                        <th className="text-left px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('proximoTipo')} className="flex items-center gap-1 hover:text-slate-900">Próximo Tipo{estimativaSortIcon('proximoTipo')}</button></th>
                        <th className="text-right px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('probabilidade')} className="flex items-center gap-1 justify-end hover:text-slate-900">Probabilidade{estimativaSortIcon('probabilidade')}</button></th>
                        <th className="text-left px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('proximaData')} className="flex items-center gap-1 hover:text-slate-900">Próxima Data{estimativaSortIcon('proximaData')}</button></th>
                        <th className="text-right px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('diasAteProximo')} className="flex items-center gap-1 justify-end hover:text-slate-900">Dias p/ Próx{estimativaSortIcon('diasAteProximo')}</button></th>
                        <th className="text-right px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('custoEstimado')} className="flex items-center gap-1 justify-end hover:text-slate-900">Custo Est.{estimativaSortIcon('custoEstimado')}</button></th>
                        <th className="text-right px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('custoP75')} className="flex items-center gap-1 justify-end hover:text-slate-900">Faixa P25-P75{estimativaSortIcon('custoP75')}</button></th>
                        <th className="text-center px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('metodoCusto')} className="flex items-center gap-1 justify-center hover:text-slate-900">Método{estimativaSortIcon('metodoCusto')}</button></th>
                        <th className="text-right px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('confianca')} className="flex items-center gap-1 justify-end hover:text-slate-900">Confiança{estimativaSortIcon('confianca')}</button></th>
                        <th className="text-left px-3 py-2"><button type="button" onClick={() => toggleEstimativaSort('alerta')} className="flex items-center gap-1 hover:text-slate-900">Alerta{estimativaSortIcon('alerta')}</button></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedItensOsEstimativaRows.length === 0 && (
                        <tr>
                          <td colSpan={15} className="px-3 py-8 text-center text-slate-400">Sem dados suficientes para estimativa no recorte atual.</td>
                        </tr>
                      )}
                      {pagedItensOsEstimativaRows.map((row) => {
                        const probClass = row.probabilidade >= 0.7 ? 'text-emerald-700' : row.probabilidade >= 0.55 ? 'text-amber-700' : 'text-slate-700';
                        const confiancaClass = row.confianca >= 0.7 ? 'text-emerald-700' : row.confianca >= 0.45 ? 'text-amber-700' : 'text-rose-700';
                        const diasClass = Number.isFinite(row.diasAteProximo) && row.diasAteProximo < 0 ? 'text-rose-700 font-medium' : 'text-slate-700';

                        return (
                          <tr key={`${row.placa}-${row.modelo}-${row.proximoTipo}`} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/40 hover:bg-indigo-50/40">
                            <td className="px-3 py-2 font-medium text-slate-800">{row.placa || '—'}</td>
                            <td className="px-3 py-2 text-slate-700 max-w-[220px] truncate" title={row.modelo || '—'}>{row.modelo || '—'}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{fmtNum(row.kmAtual)}</td>
                            <td className="px-3 py-2 text-slate-700">{row.ultimoEventoTipo}</td>
                            <td className="px-3 py-2 text-slate-700">{row.ultimoEventoData ? row.ultimoEventoData.toLocaleDateString('pt-BR') : '—'}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{Number.isFinite(row.diasSemEvento) ? fmtNum(row.diasSemEvento) : '—'}</td>
                            <td className="px-3 py-2 text-slate-700">{row.proximoTipo}</td>
                            <td className={`px-3 py-2 text-right font-medium ${probClass}`}>{fmtPct(row.probabilidade)}</td>
                            <td className="px-3 py-2 text-slate-700">{row.proximaData ? row.proximaData.toLocaleDateString('pt-BR') : '—'}</td>
                            <td className={`px-3 py-2 text-right ${diasClass}`}>{Number.isFinite(row.diasAteProximo) ? fmtNum(row.diasAteProximo) : '—'}</td>
                            <td className="px-3 py-2 text-right text-indigo-700 font-semibold">{fmtBRLZero(row.custoEstimado)}</td>
                            <td className="px-3 py-2 text-right text-slate-700">{`${fmtBRLZero(row.custoP25)} - ${fmtBRLZero(row.custoP75)}`}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{row.metodoCusto}</td>
                            <td className={`px-3 py-2 text-right font-medium ${confiancaClass}`}>{fmtPct(row.confianca)}</td>
                            <td className="px-3 py-2 text-slate-700 max-w-[260px] truncate" title={row.alerta}>{row.alerta}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    Página {estimativaPage.toLocaleString('pt-BR')} de {estimativaTotalPages.toLocaleString('pt-BR')} - {fmtNum(sortedItensOsEstimativaRows.length)} registro(s)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEstimativaPage(prev => Math.max(1, prev - 1))}
                      disabled={estimativaPage <= 1}
                      className="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-400"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstimativaPage(prev => Math.min(estimativaTotalPages, prev + 1))}
                      disabled={estimativaPage >= estimativaTotalPages}
                      className="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-400"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Table ── */}
            {!(activeTab === 'itensos' && (activeItemsSubTab === 'estimativa' || activeItemsSubTab === 'status')) && (
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
                      <th colSpan={idCols.length} className="bg-slate-700 text-white text-center py-1.5 text-[12px] font-semibold uppercase tracking-wide border-r border-white/20">
                        Identificação
                      </th>
                      {/* Tab header group */}
                      <th colSpan={tabCols.length} className={`${curTab.hdr} text-white text-center py-1.5 text-[12px] font-semibold uppercase tracking-wide`}>
                        {curTab.label}{dynYears.length > 0 ? ` (${dynYears[0]} - ${dynYears[dynYears.length-1]})` : ''}
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
                              mode: activeTab === 'sinistro' ? 'sinistro' : activeTab === 'mansin' ? 'mansin' : activeTab === 'faturamento' ? 'faturamento' : activeTab === 'itensos' ? 'itensos' : 'manutencao' 
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
            )}
          </>
        )}

        <MaintDetailModal
          open={!!maintDetailTarget}
          placa={maintDetailTarget?.placa || ''}
          rows={maintDetailTarget?.mode === 'faturamento' ? fatDetailRows : maintDetailTarget?.mode === 'itensos' ? itensOsDetailRows : maintDetailData.rows}
          resumoPorTipo={maintDetailTarget?.mode === 'manutencao' ? maintDetailData.resumoPorTipo : []}
          mode={maintDetailTarget?.mode || 'manutencao'}
          onClose={() => setMaintDetailTarget(null)}
        />

      </div>
    </div>
  );
}
