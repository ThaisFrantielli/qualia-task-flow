import { useEffect, useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Line, LabelList, ComposedChart
} from 'recharts';
import { ChevronDown, ChevronLeft, ChevronUp, FileSpreadsheet, HelpCircle } from 'lucide-react';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import useChartFilter from '@/hooks/useChartFilter';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { ChartFilterBadges } from '@/components/analytics/ChartFilterBadges';
import { DateRange } from 'react-day-picker';

type AnyObject = { [k: string]: any };
const COLORS = ['#6366f1', '#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

// ─── Helpers ──────────────────────────────────────────────────────────
function parseCurrency(v: any): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v ?? '').replace(/\s/g, '');
  if (!s) return 0;
  // pt-BR: 1.234,56
  if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
    const n = parseFloat(s.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function parseNum(v: any): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  return parseCurrency(s);
}

function pickBestNumeric(...candidates: any[]): number {
  const parsed = candidates
    .map(v => parseNum(v))
    .filter(n => Number.isFinite(n));

  if (parsed.length === 0) return 0;
  const positive = parsed.find(n => n > 0);
  return positive ?? parsed[0];
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtCompact(v: number) {
  if (v >= 1_000_000) return `R$${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(v / 1_000_000)}M`;
  if (v >= 1_000) return `R$${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v / 1000)}k`;
  return `R$${new Intl.NumberFormat('pt-BR').format(Math.round(v))}`;
}

function fmtDecimal(v: number) {
  return new Intl.NumberFormat('pt-BR').format(v);
}

function fmtPct(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

function normalizePlate(v: any): string {
  return String(v ?? '').trim().toUpperCase();
}

function normalizePlateKey(v: any): string {
  return String(v ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeIdKey(v: any): string {
  const s = String(v ?? '').trim();
  return s === '' ? '' : s;
}

function extractPlateKeys(record: AnyObject | null | undefined): string[] {
  if (!record) return [];
  const candidates = [
    record.Placa,
    record.placa,
    record.PLACA,
    record.PlacaPrincipal,
    record.placaprincipal,
    record.placa_principal,
    record.PlacaReserva,
    record.placareserva,
    record.placa_reserva,
  ];
  const keys = candidates
    .map(v => normalizePlateKey(v))
    .filter(Boolean);
  return Array.from(new Set(keys));
}

function scoreVehicleRow(row: AnyObject): number {
  const hasModelo = Boolean(getStr(row.Modelo, row.modelo, row.modelo_veiculo));
  const kmConf = parseNum(row.KmConfirmado ?? row.kmconfirmado ?? row.OdometroConfirmado ?? row.odometroconfirmado ?? row.KM ?? row.km ?? 0);
  const kmInfo = parseNum(row.KmInformado ?? row.kminformado ?? row.OdometroInformado ?? row.odometroinformado ?? 0);
  const idade = parseNum(row.IdadeVeiculo ?? row.IdadeEmMeses ?? row.idadeveiculo ?? row.idadeemmeses ?? 0);
  const status = getStr(row.Status, row.status, row.SituacaoContratoLocacao, row.situacaocontratolocacao).toUpperCase();

  let score = 0;
  if (hasModelo) score += 5;
  if (kmConf > 0) score += 4;
  if (kmInfo > 0) score += 2;
  if (idade > 0) score += 2;
  if (status.includes('LOCADO') || status.includes('ATIVO')) score += 2;
  return score;
}

function getStr(...candidates: any[]): string {
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim() !== '' && c !== 'N/A') return c.trim();
  }
  return '';
}

function parseBIDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const s = String(v).trim();
  if (!s || s === 'N/A' || s === '—' || s === '-') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    return new Date(parseInt(brMatch[3], 10), parseInt(brMatch[2], 10) - 1, parseInt(brMatch[1], 10));
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function diffMonths(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

function parseMonthFilterLabel(label: string): { monthIndex: number; year: number | null } | null {
  const raw = String(label ?? '').trim();
  if (!raw) return null;

  const [monthPart, yearPart] = raw.split('/');
  const normalizedMonth = (monthPart || '').slice(0, 3);
  const monthIndex = MONTH_NAMES.indexOf(normalizedMonth as (typeof MONTH_NAMES)[number]);
  if (monthIndex < 0) return null;

  if (!yearPart) {
    return { monthIndex, year: null };
  }

  const yearNum = Number(yearPart);
  if (!Number.isFinite(yearNum)) {
    return { monthIndex, year: null };
  }

  const fullYear = yearPart.length === 2 ? 2000 + yearNum : yearNum;
  return { monthIndex, year: fullYear };
}

type TableSortKey =
  | 'contratoLocacao'
  | 'contratoComercial'
  | 'nomeCliente'
  | 'tipoCliente'
  | 'modelo'
  | 'placa'
  | 'kmConfirmado'
  | 'kmInformado'
  | 'valorLocacao'
  | 'valorCompra'
  | 'valorFipe'
  | 'pctLocFipe'
  | 'pctLocCompra'
  | 'pctFipeCompra'
  | 'dataInicio'
  | 'dataFim'
  | 'diasParaVencimento'
  | 'faixaIdade'
  | 'idadeEmMeses'
  | 'cidadeEmplacamento';

type SortDirection = 'asc' | 'desc';

function compareTableValues(a: any, b: any, direction: SortDirection) {
  const normalize = (value: any) => {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
    if (value === null || value === undefined || value === '') return null;
    return String(value).toLowerCase();
  };

  const av = normalize(a);
  const bv = normalize(b);
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;

  let result = 0;
  if (typeof av === 'number' && typeof bv === 'number') {
    result = av - bv;
  } else {
    result = String(av).localeCompare(String(bv), 'pt-BR', { numeric: true, sensitivity: 'base' });
  }

  return direction === 'asc' ? result : -result;
}

function monthIntersectsContract(
  contract: { dataInicio: Date | null; dataFim: Date | null; dataEncerramento: Date | null },
  monthIndex: number,
  year: number
) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  const refStart = contract.dataInicio ?? contract.dataEncerramento ?? contract.dataFim;
  const refEnd = contract.dataFim ?? contract.dataEncerramento ?? contract.dataInicio;
  if (!refStart || !refEnd) return false;
  return refStart <= end && refEnd >= start;
}

function isClosedStatus(status: string): boolean {
  const s = (status || '').trim().toUpperCase();
  if (!s) return false;

  // Evita falso positivo para "A ENCERRAR"/"PRE ENCERRAMENTO".
  if (s.includes('A ENCERRAR') || s.includes('PRE ENCERR')) return false;

  return (
    s.includes('ENCERRADO') ||
    s.includes('ENCERRADA') ||
    s.includes('CANCELADO') ||
    s.includes('CANCELADA') ||
    s.includes('FINALIZADO') ||
    s.includes('FINALIZADA')
  );
}

// ─── Component ────────────────────────────────────────────────────────
export default function ContractTerminationDashboard() {
  // Load data from API - using dim_contratos_locacao (already JOINed with dim_frota on server)
  const { data: contractsData, loading: loadingContracts } = useBIData<AnyObject[]>('dim_contratos_locacao');
  const { data: frotaData, loading: loadingFrota } = useBIData<AnyObject[]>('dim_frota');

  // Filter state (Chart-based)
  const { filters, handleChartClick, clearAllFilters, clearFilter, isValueSelected, getFilterValues } = useChartFilter();

  // Primary filters (Sidebar)
  const [filterTipoCliente, setFilterTipoCliente] = useState<string>('Todos');
  const [filterCliente, setFilterCliente] = useState<string>('Todos');
  const [filterFaixa, setFilterFaixa] = useState<string>('Todos');
  const [filterSituacao, setFilterSituacao] = useState<string>('Todos');
  const currentYearDefault = new Date().getFullYear();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(currentYearDefault, 0, 1), to: new Date(currentYearDefault, 11, 31) });
  const [odometroView, setOdometroView] = useState<'odometro' | 'idade'>('odometro');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showDashboardHelp, setShowDashboardHelp] = useState(false);
  const [revenueTableMode, setRevenueTableMode] = useState(false);

  const NOW = useMemo(() => new Date(), []);


  const frotaByPlate = useMemo(() => {
    const map = new Map<string, AnyObject>();
    if (!Array.isArray(frotaData)) return map;
    for (const item of frotaData) {
      const keys = extractPlateKeys(item);
      if (keys.length === 0) continue;
      const itemScore = scoreVehicleRow(item);
      for (const key of keys) {
        const prev = map.get(key);
        if (!prev || itemScore >= scoreVehicleRow(prev)) {
          map.set(key, item);
        }
      }
    }
    return map;
  }, [frotaData]);

  const frotaByVehicleId = useMemo(() => {
    const map = new Map<string, AnyObject>();
    if (!Array.isArray(frotaData)) return map;
    for (const item of frotaData) {
      const idKey = normalizeIdKey(item.IdVeiculo ?? item.idveiculo ?? item.IdVeiculoPrincipal ?? item.idveiculoprincipal);
      if (!idKey) continue;
      const prev = map.get(idKey);
      const itemScore = scoreVehicleRow(item);
      if (!prev || itemScore >= scoreVehicleRow(prev)) {
        map.set(idKey, item);
      }
    }
    return map;
  }, [frotaData]);

  // ─── Normalize contracts ───────────────────────────────────────────
  const contracts = useMemo(() => {
    if (!contractsData || !Array.isArray(contractsData)) return [];
    // First pass: normalize and collect durations to compute averages by tipoCliente
    const durationsByTipo = new Map<string, number[]>();
    const normalized = contractsData.map((c: AnyObject) => {
      const dataInicio = parseBIDate(c.DataInicial ?? c.DataInicio ?? c.datainicio ?? null);
      const dataFim = parseBIDate(c.DataFinal ?? c.DataTermino ?? c.datatermino ?? c.DataFim ?? c.datafim ?? null);
      return { raw: c, dataInicio, dataFim };
    });

    for (const item of normalized) {
      const c = item.raw;
      const tipo = getStr(c.TipoDeContrato, c.TipoLocacao, c.tipolocacao) || 'Não Definido';
      if (item.dataInicio && item.dataFim) {
        const days = diffDays(item.dataInicio, item.dataFim);
        if (!durationsByTipo.has(tipo)) durationsByTipo.set(tipo, []);
        durationsByTipo.get(tipo)!.push(days);
      }
    }

    const avgDurationByTipo = new Map<string, number>();
    for (const [k, arr] of durationsByTipo.entries()) {
      const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      avgDurationByTipo.set(k, avg);
    }

    return contractsData.map((c: AnyObject) => {
      const placaRaw = c.PlacaPrincipal ?? c.placaprincipal ?? c.Placa ?? c.placa ?? c.placa_principal ?? c.PlacaReserva ?? c.placareserva ?? '';
      const placa = normalizePlate(placaRaw);
      const plateKey = normalizePlateKey(placaRaw);
      const candidateKeys = [
        plateKey,
        normalizePlateKey(c.PlacaPrincipal),
        normalizePlateKey(c.placaprincipal),
        normalizePlateKey(c.placa_principal),
        normalizePlateKey(c.Placa),
        normalizePlateKey(c.placa),
        normalizePlateKey(c.PlacaReserva),
        normalizePlateKey(c.placareserva),
      ].filter(Boolean);
      const uniqueKeys = Array.from(new Set(candidateKeys));
      const vehicleIdKey = normalizeIdKey(c.IdVeiculoPrincipal ?? c.idveiculoprincipal ?? c.IdVeiculo ?? c.idveiculo);
      const frotaRow = (vehicleIdKey ? frotaByVehicleId.get(vehicleIdKey) : undefined) || uniqueKeys.map(k => frotaByPlate.get(k)).find(Boolean);
      const contratoLocacao = getStr(c.ContratoLocacao, c.NumeroContrato, c.id_contrato_locacao) || 'N/A';
      const contratoComercial = getStr(c.ContratoComercial, c.contratoComercial) || '';
      const nomeCliente = getStr(c.NomeCliente, c.nomecliente, c.Cliente, c.cliente) || 'Sem Cliente';
      const tipoCliente = getStr(c.TipoDeContrato, c.TipoLocacao, c.tipolocacao) || 'Não Definido';
      const modelo = getStr(
        c.Modelo, c.modelo_veiculo, c.modelo,
        frotaRow?.Modelo, frotaRow?.modelo, frotaRow?.modelo_veiculo
      ) || 'N/A';
      const grupoContrato = getStr(c.Categoria, c.categoria, c.GrupoVeiculo, c.grupoveiculo);
      const grupoFinal = getStr(grupoContrato, frotaRow?.Categoria, frotaRow?.categoria, frotaRow?.GrupoVeiculo, frotaRow?.grupoveiculo) || 'Outros';
      const filial = getStr(c.Filial, c.filial, c.FilialCompra, c.filialcompra) || 'N/A';
      const cidade = getStr(c.CidadeEntrega, c.cidadeentrega, c.CidadeLocacao, c.cidadelocacao, c.Cidade, c.cidade,
        c.LocalizacaoVeiculo, c.localizacaoveiculo) || '';
      const cidadeEmplacamento = getStr(
        c.CidadeLicenciamento,
        c.cidadelicenciamento,
        c.CidadeEmplacamento,
        c.cidadeemplacamento,
        c.CidadeEmplaca,
        c.cidade_emplacamento,
        c.MunicipioEmplacamento,
        c.municipioemplacamento,
        frotaRow?.CidadeLicenciamento,
        frotaRow?.cidadelicenciamento,
        frotaRow?.CidadeEmplacamento,
        frotaRow?.cidadeemplacamento,
        frotaRow?.MunicipioEmplacamento,
        frotaRow?.municipioemplacamento
      ) || '';
      const status = getStr(c.SituacaoContratoLocacao, c.SituacaoContrato, c.StatusLocacao, c.statuslocacao) || '';

      const valorLocacao = parseCurrency(
        c.UltimoValorLocacao ?? c.ValorMensalAtual ?? c.ValorLocacao ?? c.ValorMensal ?? c.valormensal ?? c.monthlyValue ?? c.monthly_value ?? 0
      );

      const valorCompra = parseCurrency(
        c.ValorCompra ?? c.valorcompra ?? c.ValorAquisicao ?? c.valor_aquisicao ?? c.ValorAquisicaoPlanilha ?? c.purchasePrice ?? c.ValorAquisicaoPlano
        ?? frotaRow?.ValorCompra ?? frotaRow?.valorcompra ?? frotaRow?.ValorAquisicao ?? frotaRow?.valor_aquisicao ?? 0
      );

      const valorFipe = parseCurrency(
        c.ValorFipe ?? c.ValorFipeAtual ?? c.valorFipeAtual ?? c.ValorFipeNaCompra ?? c.ValorFipeZeroKmAtual ?? c.ValorAtualFIPE ?? c.currentFipe ?? c.valor_fipe
        ?? frotaRow?.ValorFipe ?? frotaRow?.ValorFipeAtual ?? frotaRow?.valorfipeatual ?? frotaRow?.ValorAtualFIPE ?? frotaRow?.valoratualfipe ?? 0
      );
      // Prioritize values from the fleet row (dim_frota) when available
      const kmConfirmado = pickBestNumeric(
        frotaRow?.KmConfirmado, frotaRow?.kmconfirmado, frotaRow?.OdometroConfirmado, frotaRow?.odometroconfirmado, frotaRow?.odometro_confirmado, frotaRow?.km_confirmado, frotaRow?.KM, frotaRow?.km,
        c.KmConfirmado, c.kmconfirmado, c.OdometroConfirmado, c.odometroconfirmado
      );
      const kmInformado = pickBestNumeric(
        frotaRow?.KmInformado, frotaRow?.kminformado, frotaRow?.OdometroInformado, frotaRow?.odometroinformado, frotaRow?.odometro_informado, frotaRow?.km_informado, frotaRow?.KM, frotaRow?.km,
        c.KmInformado, c.kminformado, c.OdometroInformado, c.odometroinformado, c.currentKm
      );
      const km = kmConfirmado > 0 ? kmConfirmado : kmInformado;
      const pctLocFipe = valorFipe > 0 ? valorLocacao / valorFipe : null;
      const pctLocCompra = valorCompra > 0 ? valorLocacao / valorCompra : null;
      const pctFipeCompra = valorCompra > 0 ? valorFipe / valorCompra : null;
      const idadeEmMeses = pickBestNumeric(
        c.IdadeEmMeses, c.IdadeVeiculo, c.ageMonths,
        frotaRow?.IdadeEmMeses, frotaRow?.idadeemmeses, frotaRow?.IdadeVeiculo, frotaRow?.idadeveiculo, frotaRow?.idade_veiculo_meses, frotaRow?.idade_veiculo
      );
      const dataCompra = parseBIDate(c.DataCompra ?? c.datacompra ?? c.DataAquisicao ?? c.dataaquisicao ?? null);

      const dataInicio = parseBIDate(c.DataInicial ?? c.DataInicio ?? c.datainicio ?? null);
      let dataFim = parseBIDate(c.DataFinal ?? c.DataTermino ?? c.datatermino ?? c.DataFim ?? c.datafim ?? null);
      const dataEncerramento = parseBIDate(c.DataEncerramento ?? c.dataencerramento ?? null);

      // If no explicit end date, try to estimate using average duration per contract type
      let estimated = false;
      let dataFimEfetiva: Date | null = dataFim ?? dataEncerramento;
      if (!dataFimEfetiva && dataInicio) {
        const tipo = getStr(c.TipoDeContrato, c.TipoLocacao, c.tipolocacao) || 'Não Definido';
        const avg = avgDurationByTipo.get(tipo);
        if (avg && Number.isFinite(avg) && avg > 0) {
          const est = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
          est.setDate(est.getDate() + avg);
          dataFimEfetiva = est;
          estimated = true;
        }
      }

      // Determine dias para vencimento using the effective end date
      const refDate = dataFimEfetiva;
      const diasParaVencimento = refDate ? diffDays(NOW, refDate) : null;

      // Classificar faixa de vencimento
      let faixaVencimento = 'Sem Data';
      if (diasParaVencimento !== null) {
        if (diasParaVencimento < 0) faixaVencimento = 'Vencido';
        else if (diasParaVencimento <= 30) faixaVencimento = '4. Até 30 dias';
        else if (diasParaVencimento <= 60) faixaVencimento = '3. 31 a 60 dias';
        else if (diasParaVencimento <= 90) faixaVencimento = '2. 60 a 90 dias';
        else faixaVencimento = '1. Acima 90 dias';
      }

      // Classificar faixa de KM
      let faixaKm = '(Em branco)';
      if (km > 0) {
        if (km < 10000) faixaKm = '0-10mil';
        else if (km < 20000) faixaKm = '10-20mil';
        else if (km < 30000) faixaKm = '20-30mil';
        else if (km < 40000) faixaKm = '30-40mil';
        else if (km < 50000) faixaKm = '40-50mil';
        else if (km < 60000) faixaKm = '50-60mil';
        else if (km < 70000) faixaKm = '60-70mil';
        else if (km < 80000) faixaKm = '70-80mil';
        else if (km < 90000) faixaKm = '80-90mil';
        else if (km < 100000) faixaKm = '90-100mil';
        else if (km < 120000) faixaKm = '100-120mil';
        else faixaKm = '120mil+';
      }

      // Classificar faixa de idade veículo
      const idadeReferencia = idadeEmMeses > 0
        ? idadeEmMeses
        : (dataCompra ? diffMonths(dataCompra, NOW) : 0);

      let faixaIdade = 'Sem Data Compra';
      if (idadeReferencia > 0) {
        if (idadeReferencia <= 12) faixaIdade = '0 a 12m';
        else if (idadeReferencia <= 24) faixaIdade = '13m a 24m';
        else if (idadeReferencia <= 36) faixaIdade = '25m a 36m';
        else if (idadeReferencia <= 48) faixaIdade = '37m a 48m';
        else if (idadeReferencia <= 60) faixaIdade = '49m a 60m';
        else faixaIdade = 'Acima de 60m';
      }

      // Saldo financeiro: para qual ano o contrato vence
      const anoVencimento = refDate ? refDate.getFullYear() : null;

      // IsChecked active
      const isClosed = isClosedStatus(status);

      return {
        raw: c,
        placa,
        contratoLocacao,
        contratoComercial,
        nomeCliente,
        tipoCliente,
        modelo,
        grupo: grupoFinal,
        filial,
        cidade,
        cidadeEmplacamento,
        status,
        valorLocacao,
        valorCompra,
        valorFipe,
        pctLocFipe,
        pctLocCompra,
        pctFipeCompra,
        kmConfirmado,
        kmInformado,
        km,
        idadeEmMeses,
        dataCompra,
        dataInicio,
        dataFim,
        dataFimEstimado: estimated,
        dataEncerramento,
        diasParaVencimento,
        faixaVencimento,
        faixaKm,
        faixaIdade,
        anoVencimento,
        isClosed,
      };
    });
  }, [contractsData, NOW, frotaByPlate, frotaByVehicleId]);

  const baseContracts = useMemo(() => {
    return contracts.filter(c => !c.isClosed);
  }, [contracts]);

  // ─── Filtered contracts ────────────────────────────────────────────
  const filtered = useMemo(() => {
    // Get chart filters
    const chartTipoFilters = getFilterValues('tipoCliente');
    const chartClienteFilters = getFilterValues('nomeCliente');
    const chartModeloFilters = getFilterValues('modelo');
    const chartFaixaFilters = getFilterValues('faixaVencimento');
    const chartGrupoFilters = getFilterValues('grupo');
    const chartCidadeFilters = getFilterValues('cidade');
    const chartFilialFilters = getFilterValues('filial');
    const chartCidadeEmplacFilters = getFilterValues('cidadeEmplacamento');
    const chartMesFilters = getFilterValues('mesAno');
    const chartKmFilters = getFilterValues('faixaKm');
    const chartIdadeFilters = getFilterValues('faixaIdade');
    const chartAnoVencFilters = getFilterValues('anoVencimento');

    const selectedMonthFilters = chartMesFilters
      .map(label => parseMonthFilterLabel(String(label)))
      .filter((item): item is { monthIndex: number; year: number | null } => item !== null);

    return baseContracts.filter(c => {
      // 1. Sidebar Filters
      if (filterTipoCliente !== 'Todos' && c.tipoCliente !== filterTipoCliente) return false;
      if (filterCliente !== 'Todos' && c.nomeCliente !== filterCliente) return false;
      if (filterFaixa !== 'Todos' && c.faixaVencimento !== filterFaixa) return false;
      if (filterSituacao !== 'Todos' && c.status !== filterSituacao) return false;

      // 2. Date Range Filter (Expiration Date)
      if (dateRange?.from || dateRange?.to) {
        const refDate = c.dataFim ?? c.dataEncerramento;
        if (!refDate) return false;
        if (dateRange.from && refDate < dateRange.from) return false;
        if (dateRange.to) {
          const end = new Date(dateRange.to);
          end.setHours(23, 59, 59, 999);
          if (refDate > end) return false;
        }
      }

      // 3. Chart Cross-Filters
      if (chartTipoFilters.length > 0 && !chartTipoFilters.includes(c.tipoCliente)) return false;
      if (chartClienteFilters.length > 0 && !chartClienteFilters.includes(c.nomeCliente)) return false;
      if (chartModeloFilters.length > 0 && !chartModeloFilters.includes(c.modelo)) return false;
      if (chartFaixaFilters.length > 0 && !chartFaixaFilters.includes(c.faixaVencimento)) return false;
      if (chartGrupoFilters.length > 0 && !chartGrupoFilters.includes(c.grupo)) return false;
      if (chartCidadeFilters.length > 0 && !chartCidadeFilters.includes(c.cidade?.toUpperCase().trim())) return false;
      if (chartFilialFilters.length > 0 && !chartFilialFilters.includes(c.filial)) return false;
      if (chartCidadeEmplacFilters.length > 0 && !chartCidadeEmplacFilters.includes(c.cidadeEmplacamento?.toUpperCase().trim())) return false;
      if (
        selectedMonthFilters.length > 0 &&
        !selectedMonthFilters.some(({ monthIndex, year }) => monthIntersectsContract(c, monthIndex, year ?? NOW.getFullYear()))
      ) return false;
      if (chartKmFilters.length > 0 && !chartKmFilters.includes(c.faixaKm)) return false;
      if (chartIdadeFilters.length > 0 && !chartIdadeFilters.includes(c.faixaIdade)) return false;
      if (chartAnoVencFilters.length > 0 && !chartAnoVencFilters.includes(String(c.anoVencimento))) return false;

      return true;
    });
  }, [baseContracts, filterTipoCliente, filterCliente, filterFaixa, filterSituacao, dateRange, filters, NOW]);

  // ─── Unique clients & types for filters ────────────────────────────
  const uniqueTipos = useMemo(() => {
    return Array.from(new Set(baseContracts.map(c => c.tipoCliente).filter(Boolean))).sort();
  }, [baseContracts]);

  const uniqueClientes = useMemo(() => {
    return Array.from(new Set(baseContracts.map(c => c.nomeCliente).filter(c => c && c !== 'Sem Cliente'))).sort();
  }, [baseContracts]);

  const uniqueSituacoes = useMemo(() => {
    return Array.from(new Set(baseContracts.map(c => c.status).filter(Boolean))).sort();
  }, [baseContracts]);

  // ─── KPIs ──────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalContratos = filtered.length;
    const totalLocacao = filtered.reduce((s, c) => s + c.valorLocacao, 0);
    const totalCompra = filtered.reduce((s, c) => s + c.valorCompra, 0);
    const totalFipe = filtered.reduce((s, c) => s + c.valorFipe, 0);
    const pctLocFipe = totalFipe > 0 ? totalLocacao / totalFipe : 0;
    const pctLocCompra = totalCompra > 0 ? totalLocacao / totalCompra : 0;
    const pctFipeCompra = totalCompra > 0 ? totalFipe / totalCompra : 0;

    return [
      { label: 'Contratos Locação', value: fmtDecimal(totalContratos) },
      { label: 'Valor de Locação', value: fmtBRL(totalLocacao) },
      { label: 'Valor de Compra', value: fmtBRL(totalCompra) },
      { label: 'Valor Fipe', value: fmtBRL(totalFipe) },
      { label: '% Loc/Fipe', value: fmtPct(pctLocFipe) },
      { label: '% Loc/Compra', value: fmtPct(pctLocCompra) },
      { label: 'Fipe/Compra', value: fmtPct(pctFipeCompra) },
    ];
  }, [filtered]);

  // ─── Revenue by month ──────────────────────────────────────────────
  const revenueByMonth = useMemo(() => {
    // Build full months sequence based on dateRange (default: current year)
    const from = dateRange?.from ? new Date(dateRange.from.getFullYear(), dateRange.from.getMonth(), 1) : new Date(new Date().getFullYear(), 0, 1);
    const to = dateRange?.to ? new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), 1) : new Date(new Date().getFullYear(), 11, 1);

    const months: Array<{ key: string; year: number; month: number }> = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cursor <= to) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      months.push({ key: `${y}-${String(m).padStart(2, '0')}`, year: y, month: m });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const map = new Map<string, { total: number; contracts: number }>();
    months.forEach(m => map.set(m.key, { total: 0, contracts: 0 }));

    for (const c of filtered) {
      const refDate = c.dataFim ?? c.dataEncerramento;
      if (!refDate) continue;
      const key = `${refDate.getFullYear()}-${String(refDate.getMonth()).padStart(2, '0')}`;
      if (!map.has(key)) continue; // ignore outside selected range
      const prev = map.get(key)!;
      prev.total += c.valorLocacao;
      prev.contracts += 1;
      map.set(key, prev);
    }

    const result = months.map(({ key, year, month }) => ({
      month: `${MONTH_NAMES[month]}/${String(year).slice(-2)}`,
      total: Math.round((map.get(key)?.total) || 0),
      contracts: (map.get(key)?.contracts) || 0,
    }));

    const withoutEmpty = result.filter(r => !(r.total === 0 && r.contracts === 0));
    return withoutEmpty.length ? withoutEmpty : result;
  }, [filtered]);

  // (Gráfico "Tipo de Cliente" removido conforme solicitado)

  // ─── Expiration range ──────────────────────────────────────────────
  const expirationData = useMemo(() => {
    const ranges = ['1. Acima 90 dias', '2. 60 a 90 dias', '3. 31 a 60 dias', '4. Até 30 dias', 'Vencido'];
    const map = new Map<string, number>();
    ranges.forEach(r => map.set(r, 0));
    for (const c of filtered) {
      if (c.faixaVencimento && map.has(c.faixaVencimento)) {
        map.set(c.faixaVencimento, (map.get(c.faixaVencimento) || 0) + 1);
      }
    }
    return ranges.map(range => ({ range, value: map.get(range) || 0 }));
  }, [filtered]);

  // ─── Client type distribution (quantidade, valor, % do total) ──────
  const clientTypeData = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    let totalCount = 0;
    for (const c of filtered) {
      const tipo = c.tipoCliente || 'Não Definido';
      const prev = map.get(tipo) || { count: 0, value: 0 };
      prev.count += 1;
      prev.value += Number(c.valorLocacao || 0);
      map.set(tipo, prev);
      totalCount += 1;
    }

    return Array.from(map.entries()).map(([name, { count, value }]) => ({
      name,
      value: count,
      amount: value,
      percent: totalCount > 0 ? count / totalCount : 0,
    })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // ─── Fleet age ─────────────────────────────────────────────────────
  const fleetAgeData = useMemo(() => {
    const ranges = ['0 a 12m', '13m a 24m', '25m a 36m', '37m a 48m', '49m a 60m', 'Acima de 60m', 'Sem Data Compra'];
    const map = new Map<string, number>();
    ranges.forEach(r => map.set(r, 0));
    for (const c of filtered) {
      if (c.faixaIdade && map.has(c.faixaIdade)) {
        map.set(c.faixaIdade, (map.get(c.faixaIdade) || 0) + 1);
      }
    }
    return ranges.map(range => ({ range, value: map.get(range) || 0 }));
  }, [filtered]);

  // ─── Fleet by client (top 10) ──────────────────────────────────────
  const fleetByClientData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      const name = c.nomeCliente || 'Sem Cliente';
      map.set(name, (map.get(name) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);
  // ─── Modelos por Categoria (para gráfico 'Veículos por Modelo') ───
  const modelosPorCategoria = useMemo(() => {
    const categoryMap: Record<string, Record<string, number>> = {};
    for (const c of filtered) {
      const modelo = String(c.modelo || 'Não Definido');
      const categoria = String(c.grupo || 'Outros');
      if (!categoryMap[categoria]) categoryMap[categoria] = {};
      categoryMap[categoria][modelo] = (categoryMap[categoria][modelo] || 0) + 1;
    }
    return Object.entries(categoryMap).map(([categoria, modelos]) => {
      const total = Object.values(modelos).reduce((s, v) => s + v, 0);
      const modelosArr = Object.entries(modelos).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
      return { categoria, total, modelos: modelosArr };
    }).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const modelosHierarchicalData = useMemo(() => {
    const data: Array<{ name: string; label: string; value: number; isCategory?: boolean; categoria?: string }> = [];
    modelosPorCategoria.forEach(({ categoria, total, modelos }) => {
      data.push({ name: categoria, label: categoria, value: total, isCategory: true, categoria });
      if (expandedCategories.includes(categoria)) {
        modelos.forEach(m => data.push({ name: m.name, label: `- ${m.name}`, value: m.value, isCategory: false, categoria }));
      }
    });
    return data;
  }, [modelosPorCategoria, expandedCategories]);

    const toggleCategory = (categoria: string) => {
      setExpandedCategories(prev =>
        prev.includes(categoria) ? prev.filter(c => c !== categoria) : [...prev, categoria]
      );
    };

  // ─── Odômetro (para gráfico de classificação) ─────────────────────
  const odometroData = useMemo(() => {
    const ranges: Record<string, number> = {
      '(Em branco)': 0,
      '0-10mil': 0, '10-20mil': 0, '20-30mil': 0, '30-40mil': 0, '40-50mil': 0,
      '50-60mil': 0, '60-70mil': 0, '70-80mil': 0, '80-90mil': 0, '90-100mil': 0,
      '100-120mil': 0, '120mil+': 0
    };
    for (const c of filtered) {
      const km = Number(c.km || 0);
      if (!km || km <= 0) {
        ranges['(Em branco)']++;
        continue;
      }
      if (km < 10000) ranges['0-10mil']++;
      else if (km < 20000) ranges['10-20mil']++;
      else if (km < 30000) ranges['20-30mil']++;
      else if (km < 40000) ranges['30-40mil']++;
      else if (km < 50000) ranges['40-50mil']++;
      else if (km < 60000) ranges['50-60mil']++;
      else if (km < 70000) ranges['60-70mil']++;
      else if (km < 80000) ranges['70-80mil']++;
      else if (km < 90000) ranges['80-90mil']++;
      else if (km < 100000) ranges['90-100mil']++;
      else if (km < 120000) ranges['100-120mil']++;
      else ranges['120mil+']++;
    }
    return Object.entries(ranges).map(([name, value]) => ({ name, value }));
  }, [filtered]);
  // ─── Cidade de Emplacamento (vindo de dim_frota) ─────────────────
  const branchData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      const b = (c.cidadeEmplacamento || '(Em branco)') as string;
      const key = (typeof b === 'string' ? b.toUpperCase().trim() : String(b));
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([branch, value]) => ({ branch, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // ─── Table (paginação clássica) ───────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortState, setSortState] = useState<{ key: TableSortKey; direction: SortDirection }>({ key: 'diasParaVencimento', direction: 'asc' });
  const sortedForTable = useMemo(() => {
    return [...filtered].sort((a, b) => compareTableValues(a[sortState.key], b[sortState.key], sortState.direction));
  }, [filtered, sortState]);
  const totalRows = sortedForTable.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const startIndex = totalRows === 0 ? 0 : (currentPageSafe - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);
  const tableSlice = sortedForTable.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtered, sortState, pageSize]);

  // Debug: log sample rows to help diagnose missing KM values (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      try {
        // Log a few samples
        // eslint-disable-next-line no-console
        console.debug('ContractTerminationDashboard samples', {
          contractsCount: contracts.length,
          frotaCount: (Array.isArray(frotaData) ? frotaData.length : 0),
          tableSliceSample: tableSlice.slice(0, 8).map(r => ({ contrato: r.contratoLocacao, placa: r.placa, kmConfirmado: r.kmConfirmado, kmInformado: r.kmInformado, km: r.km }))
        });
      } catch (e) {
        // ignore
      }
    }
  }, [contracts, frotaData, tableSlice]);

  const toggleTableSort = (key: TableSortKey) => {
    setSortState(prev => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'desc' }
    );
  };

  const renderSortIcon = (field: TableSortKey) => {
    if (sortState.key !== field) return <ChevronDown className="w-3 h-3 opacity-35" />;
    return sortState.direction === 'asc'
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };

  // Visible counts para painéis (infinite-scroll)

  // ─── Export ────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = sortedForTable.map(c => ({
      'Contrato Locação': c.contratoLocacao,
      'Contrato Comercial': c.contratoComercial,
      'Cliente': c.nomeCliente,
      'Tipo': c.tipoCliente,
      'Modelo': c.modelo,
      'Placa': c.placa,
      'Valor Locação': c.valorLocacao,
      'Valor Compra': c.valorCompra,
      'Valor FIPE': c.valorFipe,
      '% Loc/Fipe': c.pctLocFipe != null ? c.pctLocFipe : null,
      '% Loc/Compra': c.pctLocCompra != null ? c.pctLocCompra : null,
      'Fipe/Compra': c.pctFipeCompra != null ? c.pctFipeCompra : null,
      'Odômetro Confirmado': c.kmConfirmado,
      'Odômetro Informado': c.kmInformado,
      'Data Início': c.dataInicio ? c.dataInicio.toISOString().slice(0, 10) : '',
      'Data Fim': c.dataFim ? c.dataFim.toISOString().slice(0, 10) : '',
      'Dias p/ Vencimento': c.diasParaVencimento,
      'Faixa Vencimento': c.faixaVencimento,
      'Grupo Veículo': c.grupo,
      'Filial': c.filial,
      'Cidade': c.cidade,
      'Faixa Idade': c.faixaIdade,
      'Faixa KM': c.faixaKm,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Previsão Encerramento');
    XLSX.writeFile(wb, 'previsao_encerramento.xlsx');
  };

  const handleExportRevenue = () => {
    if (!Array.isArray(revenueByMonth)) return;
    const rows = revenueByMonth.map(r => ({
      Mes: r.month,
      'Valor Locacao': r.total,
      Contratos: r.contracts,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Valor Locacao');
    XLSX.writeFile(wb, 'valor_locacao_por_mes.xlsx');
  };

  // exibimos todos os labels (sempre)

  // labelCollisionMeta deixado intencionalmente caso heurísticas adicionais sejam reativadas no futuro

  const renderRevenueLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (x == null || y == null || width == null || value == null) return null;

    const label = fmtCompact(Number(value || 0));
    const approxCharWidth = 7; // aproximação para cálculo de largura do fundo
    const textWidth = Math.max(40, String(label).length * approxCharWidth);
    const rectX = Number(x) + Number(width) / 2 - textWidth / 2;
    const rectY = Number(y) - 12;
    const rectHeight = 18;

    return (
      <g>
        <rect x={rectX} y={rectY} rx={6} width={textWidth} height={rectHeight} fill="#ffffff" stroke="#e6edf3" />
        <text
          x={Number(x) + Number(width) / 2}
          y={rectY + rectHeight - 6}
          textAnchor="middle"
          fill="#334155"
          fontSize={11}
          fontWeight={600}
        >
          {label}
        </text>
      </g>
    );
  };

  const renderContractsLabel = (props: any) => {
    const { x, y, value, index } = props;
    const idx = Number(index ?? -1);
    if (idx < 0 || x == null || y == null || value == null) return null;

    const dy = idx % 2 === 0 ? -12 : 14;
    const label = fmtDecimal(Number(value || 0));
    const approxCharWidth = 8;
    const textWidth = Math.max(28, String(label).length * approxCharWidth);
    const rectX = Number(x) - textWidth / 2;
    const rectY = Number(y) + dy - 14;
    const rectHeight = 18;

    return (
      <g>
        <rect x={rectX} y={rectY} rx={6} width={textWidth} height={rectHeight} fill="#fff7ed" stroke="#f3d8c1" />
        <text
          x={Number(x)}
          y={rectY + rectHeight - 4}
          textAnchor="middle"
          fill="#c2410c"
          fontSize={11}
          fontWeight={700}
        >
          {label}
        </text>
      </g>
    );
  };

  // ─── Loading ───────────────────────────────────────────────────────
  if (loadingContracts || loadingFrota) {
    return <AnalyticsLoading message="Carregando previsão de encerramento..." kpiCount={7} chartCount={3} />;
  }

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex bg-slate-100 min-h-screen">
      {/* Left Filters Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 p-4 flex-shrink-0 hidden xl:block">
        <Link to="/analytics" className="flex items-center text-slate-500 mb-6 cursor-pointer hover:text-slate-800 transition-colors">
          <ChevronLeft size={16} />
          <span className="ml-1 text-sm font-medium">Voltar</span>
        </Link>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-orange-500 uppercase mb-2">Vencimento (Período)</label>
            <DateRangePicker 
              value={dateRange} 
              onChange={setDateRange} 
              className="w-full h-9"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-orange-500 uppercase mb-2">Previsão Encerramento</label>
            <div className="relative">
              <select
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white appearance-none pr-8"
                value={filterFaixa}
                onChange={e => { setFilterFaixa(e.target.value); setCurrentPage(1); }}
              >
                <option value="Todos">Todos</option>
                <option value="4. Até 30 dias">Até 30 dias</option>
                <option value="3. 31 a 60 dias">31 a 60 dias</option>
                <option value="2. 60 a 90 dias">60 a 90 dias</option>
                <option value="1. Acima 90 dias">Acima 90 dias</option>
                <option value="Vencido">Vencido</option>
              </select>
              <div className="absolute right-2 top-2.5 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-orange-500 uppercase mb-2">Cliente</label>
            <div className="relative">
              <select
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white appearance-none pr-8"
                value={filterCliente}
                onChange={e => { setFilterCliente(e.target.value); setCurrentPage(1); }}
              >
                <option value="Todos">Todos</option>
                {uniqueClientes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-2 top-2.5 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-orange-500 uppercase mb-2">Tipo Cliente</label>
            <div className="relative">
              <select
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white appearance-none pr-8"
                value={filterTipoCliente}
                onChange={e => { setFilterTipoCliente(e.target.value); setCurrentPage(1); }}
              >
                <option value="Todos">Todos</option>
                {uniqueTipos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="absolute right-2 top-2.5 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-orange-500 uppercase mb-2">Situação Contrato</label>
            <div className="relative">
              <select
                className="w-full p-2 border border-slate-300 rounded text-sm bg-white appearance-none pr-8"
                value={filterSituacao}
                onChange={e => { setFilterSituacao(e.target.value); setCurrentPage(1); }}
              >
                <option value="Todos">Todos</option>
                {uniqueSituacoes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="absolute right-2 top-2.5 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <button
            onClick={() => { 
                setFilterTipoCliente('Todos'); 
                setFilterCliente('Todos'); 
                setFilterFaixa('Todos'); 
                setFilterSituacao('Todos');
                setDateRange(undefined);
                clearAllFilters();
                setCurrentPage(1); 
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
          >
            Limpar Filtros
          </button>

          {/* Export button removed from sidebar as requested */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto h-screen">
        {/* Header */}
        <div className="bg-[#2e1065] text-white p-4 rounded-t-lg flex justify-between items-center mb-4 shadow-lg">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold uppercase tracking-wider text-orange-400">Previsão de Encerramento de Contrato</h1>
            <button
              onClick={() => setShowDashboardHelp(true)}
              title="Como este dashboard é calculado"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-orange-200 transition-colors hover:bg-white/20 hover:text-orange-100"
            >
              <HelpCircle size={14} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-light opacity-70">{filtered.length} contratos ativos</span>
            <span className="text-xs font-light opacity-70">Quality</span>
          </div>
        </div>

        {/* Banner de qualidade removido conforme solicitado */}

        <div className="mb-4">
          <ChartFilterBadges
            filters={filters}
            onClearFilter={(key, value) => {
              if (value) clearFilter(key, value);
              else clearFilter(key);
            }}
            onClearAll={clearAllFilters}
            labelMap={{
              mesAno: 'Mês',
              faixaVencimento: 'Vencimento',
              tipoCliente: 'Tipo Cliente',
              nomeCliente: 'Cliente',
              grupo: 'Grupo',
              cidade: 'Cidade',
              filial: 'Filial',
              cidadeEmplacamento: 'Cidade de Emplacamento',
              faixaKm: 'Faixa KM',
              faixaIdade: 'Faixa Idade',
              anoVencimento: 'Ano Vencimento',
            }}
          />
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
          {kpis.map((kpi, index) => (
            <div key={index} className="bg-[#2e1065] text-white p-3 rounded shadow flex flex-col items-center justify-center text-center min-h-[80px] transition-transform hover:scale-105">
              <span className="text-[10px] uppercase font-bold tracking-wide text-orange-200 mb-1">{kpi.label}</span>
              <span className="text-lg font-bold">{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="space-y-4 mb-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">Valor Locacao</h3>
                <p className="mt-1 text-xs text-slate-500">Receita mensal e volume de contratos no mesmo eixo temporal.</p>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-600" />
                  Valor Locacao
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-[2px] w-4 rounded bg-orange-600" />
                  Contratos
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRevenueTableMode(prev => !prev)}
                    className="ml-2 text-xs px-2 py-1 rounded-md bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                    title={revenueTableMode ? 'Voltar ao gráfico' : 'Ver em tabela'}
                  >
                    {revenueTableMode ? 'Voltar ao gráfico' : 'Ver em tabela'}
                  </button>
                  <button
                    onClick={handleExportRevenue}
                    title="Exportar tabela (Excel)"
                    className="ml-1 p-1 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="h-[340px] w-full">
              {revenueTableMode ? (
                <div className="p-2 overflow-auto bg-white rounded border border-slate-100 h-full">
                  {!Array.isArray(revenueByMonth) || revenueByMonth.length === 0 ? (
                    <div className="text-sm text-slate-500">Nenhum dado disponível.</div>
                  ) : (
                    <table className="min-w-full text-sm table-auto">
                      <thead className="text-xs text-slate-600 border-b">
                        <tr>
                          <th className="py-1 text-left px-2">Mês</th>
                          <th className="py-1 text-right px-2">Valor Locação</th>
                          <th className="py-1 text-right px-2">Contratos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenueByMonth.map((r, i) => {
                          const selected = isValueSelected('mesAno', r.month);
                          return (
                            <tr
                              key={i}
                              onClick={(e) => {
                                if (selected) clearFilter('mesAno', r.month);
                                else handleChartClick('mesAno', r.month, e as unknown as React.MouseEvent);
                              }}
                              className={`${i % 2 === 0 ? 'bg-transparent' : 'bg-slate-50'} hover:bg-slate-100 cursor-pointer ${selected ? 'bg-amber-50 ring-1 ring-amber-200' : ''}`}
                              title={selected ? 'Filtro ativo: clique para remover' : 'Clique para filtrar por este mês'}
                            >
                              <td className="px-2 py-1 text-slate-700">{r.month}</td>
                              <td className="px-2 py-1 text-right font-medium">{fmtBRL(Number(r.total || 0))}</td>
                              <td className="px-2 py-1 text-right">{fmtDecimal(Number(r.contracts || 0))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={revenueByMonth} margin={{ top: 60, right: 28, bottom: 12, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: '#334155' }}
                      axisLine={false}
                      tickLine={false}
                      width={70}
                      tickFormatter={(v: number) => fmtCompact(Number(v || 0))}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tick={{ fontSize: 11, fill: '#9a3412' }}
                    />
                    <Tooltip
                      cursor={{ fill: '#e2e8f0', fillOpacity: 0.35 }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === 'Contratos') return [fmtDecimal(Number(value || 0)), 'Contratos'];
                        return [fmtBRL(Number(value || 0)), 'Valor Locacao'];
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="total"
                      name="Valor Locacao"
                      fill="#4f46e5"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={44}
                      cursor="pointer"
                      onClick={(data: any, _index: number, event: any) => handleChartClick('mesAno', data.month, event)}
                    >
                      <LabelList dataKey="total" content={renderRevenueLabel} />
                    </Bar>
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="contracts"
                      name="Contratos"
                      stroke="#ea580c"
                      strokeWidth={2.25}
                      dot={{ r: 3, strokeWidth: 2, fill: '#fff7ed' }}
                      activeDot={{ r: 4.5 }}
                    >
                      <LabelList dataKey="contracts" content={renderContractsLabel} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow border border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Contrato - Faixa de Vencimento</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={expirationData} margin={{ right: 90 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="range" type="category" width={120} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: any) => [fmtDecimal(Number(value || 0)), 'Quantidade']} />
                    <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={16} onClick={(data, _i, e) => handleChartClick('faixaVencimento', data.range, e as any)} cursor="pointer">
                      <LabelList dataKey="value" position="right" formatter={(v: any) => fmtDecimal(v)} />
                      {expirationData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.range === 'Vencido' ? '#ef4444' : '#f97316'}
                          opacity={getFilterValues('faixaVencimento').length > 0 ? (isValueSelected('faixaVencimento', entry.range) ? 1 : 0.3) : 1}
                          cursor="pointer"
                          onClick={(e: any) => handleChartClick('faixaVencimento', entry.range, e)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow border border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Tipo de Cliente</h3>
              <div className="h-72 flex items-center justify-center overflow-visible">
                {clientTypeData.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Nenhum dado disponível.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={clientTypeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={90}
                        paddingAngle={4}
                        label={(entry: any) => `${entry.name} — ${entry.value}`}
                        onClick={(e: any) => handleChartClick('tipoCliente', e.name, e as any)}
                      >
                        {clientTypeData.map((entry, index) => (
                          <Cell
                            key={`cell-ct-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            opacity={getFilterValues('tipoCliente').length > 0 ? (isValueSelected('tipoCliente', entry.name) ? 1 : 0.4) : 1}
                            cursor="pointer"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        allowEscapeViewBox={{ x: true, y: true }}
                        formatter={(value: any, _name: any, props: any) => {
                          const amount = props.payload?.amount ?? 0;
                          const pct = props.payload?.percent ? `${Math.round(props.payload.percent * 100)}%` : `${Math.round(((value || 0) / (clientTypeData.reduce((s, r) => s + r.value, 0) || 1)) * 100)}%`;
                          return [`${value} — ${fmtBRL(Number(amount || 0))}`, pct];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-600 uppercase mb-1">Veículos por Modelo</h3>
                  <div className="text-xs text-slate-500">Agrupados por categoria de veículo</div>
                </div>
                <button onClick={() => setExpandedCategories(prev => prev.length === modelosPorCategoria.length ? [] : modelosPorCategoria.map(c => c.categoria))} className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 transition-colors">
                  {expandedCategories.length === modelosPorCategoria.length ? '− Colapsar Todas' : '+ Expandir Todas'}
                </button>
              </div>
              <div className="h-[400px] mt-1 overflow-y-auto pr-2">
                                <ResponsiveContainer width="100%" height={Math.max(300, modelosHierarchicalData.length * 28)}>
                                    <BarChart data={modelosHierarchicalData} layout="vertical" margin={{ left: 0, right: 80, top: 6 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                                        <XAxis type="number" hide />
                                      <YAxis dataKey="label" type="category" width={240} tick={{ fontSize: 10 }} />
                                        <Tooltip formatter={(value: any) => [String(value), 'Veículos']} />
                                        <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={16}
                                            onClick={(data: any, _index: number, event: any) => {
                                                if (data.isCategory) {
                                                    toggleCategory(data.categoria);
                                                } else {
                                                    const modeloName = String(data.name || '').trim();
                                                    handleChartClick('modelo', modeloName, event as unknown as React.MouseEvent);
                                                    if (!((event?.ctrlKey) || (event?.metaKey))) {
                                                        document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' });
                                                    }
                                                }
                                            }}
                                            cursor="pointer">
                                            {modelosHierarchicalData.map((entry, idx) => (
                                              <Cell
                                                key={`cell-modelo-${idx}`}
                                                fill={entry.isCategory ? '#7c3aed' : '#a78bfa'}
                                              />
                                            ))}
                                            <LabelList dataKey="value" position="right" formatter={(v: any) => String(v)} fontSize={10} fill="#0f172a" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
            </div>

            <div className="bg-white p-4 rounded shadow border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold">Classificação por Odômetro</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOdometroView('odometro')} className={`text-xs px-2 py-1 rounded ${odometroView === 'odometro' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-500 border border-transparent'}`}>Odômetro</button>
                  <button onClick={() => setOdometroView('idade')} className={`text-xs px-2 py-1 rounded ${odometroView === 'idade' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'text-slate-500 border border-transparent'}`}>Idade (m)</button>
                </div>
              </div>
              <div className="text-xs text-slate-500 mb-3">Distribuição de veículos por faixa de quilometragem confirmada</div>
              <div className="h-[400px] mt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={odometroView === 'odometro' ? odometroData : fleetAgeData} margin={{ left: 20, right: 60, bottom: 36, top: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={odometroView === 'odometro' ? 'name' : 'range'} tick={{ fontSize: 11 }} angle={odometroView === 'odometro' ? -45 : 0} textAnchor={odometroView === 'odometro' ? 'end' : 'middle'} height={odometroView === 'odometro' ? 64 : 48} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: any) => [`${value} veículos`, 'Quantidade']} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32} fill="#06b6d4" onClick={(data: any, _index: number, event: any) => { const key = odometroView === 'odometro' ? 'odometro' : 'idade'; handleChartClick(key, data.name, event as unknown as React.MouseEvent); if (!((event?.ctrlKey) || (event?.metaKey))) document.getElementById('detail-table')?.scrollIntoView({ behavior: 'smooth' }); }} cursor="pointer">
                      <LabelList dataKey="value" position="top" formatter={(v: any) => v > 0 ? String(v) : ''} fontSize={11} fill="#0f172a" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow border border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Frota por Cliente</h3>
              <div className="h-64 overflow-y-auto overflow-x-hidden">
                <div style={{ height: Math.max(260, fleetByClientData.length * 28) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={fleetByClientData} margin={{ left: 6, right: 88, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={190} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: any) => [fmtDecimal(Number(value || 0)), 'Quantidade']} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} onClick={(data, _i, e) => handleChartClick('nomeCliente', data.name, e as any)} cursor="pointer">
                      <LabelList dataKey="value" position="right" formatter={(v: any) => fmtDecimal(v)} />
                      {fleetByClientData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill="#3b82f6"
                          opacity={getFilterValues('nomeCliente').length > 0 ? (isValueSelected('nomeCliente', entry.name) ? 1 : 0.4) : 1}
                          cursor="pointer"
                          onClick={(e: any) => handleChartClick('nomeCliente', entry.name, e)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded shadow border border-slate-200">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Cidade de Emplacamento</h3>
              <div className="h-64 overflow-y-auto overflow-x-hidden">
                <div style={{ height: Math.max(260, branchData.length * 28) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={branchData} margin={{ left: 6, right: 88, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="branch" type="category" width={190} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: any) => [fmtDecimal(Number(value || 0)), 'Quantidade']} />
                    <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={12} onClick={(data, _i, e) => handleChartClick('cidadeEmplacamento', data.branch, e as any)} cursor="pointer">
                      <LabelList dataKey="value" position="right" formatter={(v: any) => fmtDecimal(v)} />
                      {branchData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill="#0ea5e9"
                          opacity={getFilterValues('cidadeEmplacamento').length > 0 ? (isValueSelected('cidadeEmplacamento', entry.branch) ? 1 : 0.4) : 1}
                          cursor="pointer"
                          onClick={(e: any) => handleChartClick('cidadeEmplacamento', entry.branch, e)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Table */}
        <div className="bg-white rounded shadow border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-slate-50/80">
            <h3 className="text-xs font-bold text-slate-700 uppercase">Detalhamento dos Contratos</h3>
            <div className="flex items-center gap-2">
              {/* Informativo de exibição incremental removido conforme solicitado */}
              <button
                onClick={handleExport}
                className="text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1"
              >
                <FileSpreadsheet size={12} />
                Exportar Detalhamento
              </button>
            </div>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[72vh]">
            <table className="w-full text-xs text-left min-w-[1860px]">
              <thead className="bg-[#2e1065] text-white uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('contratoLocacao')}>
                    <span className="inline-flex items-center gap-1">Contrato Locação {renderSortIcon('contratoLocacao')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('contratoComercial')}>
                    <span className="inline-flex items-center gap-1">Contrato Comercial {renderSortIcon('contratoComercial')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('nomeCliente')}>
                    <span className="inline-flex items-center gap-1">Cliente {renderSortIcon('nomeCliente')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('tipoCliente')}>
                    <span className="inline-flex items-center gap-1">Tipo Cliente {renderSortIcon('tipoCliente')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('modelo')}>
                    <span className="inline-flex items-center gap-1">Modelo {renderSortIcon('modelo')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('placa')}>
                    <span className="inline-flex items-center gap-1">Placa Principal {renderSortIcon('placa')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('kmConfirmado')}>
                    <span className="inline-flex items-center gap-1">Odômetro Confirmado {renderSortIcon('kmConfirmado')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('kmInformado')}>
                    <span className="inline-flex items-center gap-1">Odômetro Informado {renderSortIcon('kmInformado')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('valorLocacao')}>
                    <span className="inline-flex items-center gap-1">Valor Locação {renderSortIcon('valorLocacao')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('valorCompra')}>
                    <span className="inline-flex items-center gap-1">Valor Compra {renderSortIcon('valorCompra')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('valorFipe')}>
                    <span className="inline-flex items-center gap-1">Valor FIPE {renderSortIcon('valorFipe')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('pctLocFipe')}>
                    <span className="inline-flex items-center gap-1">% LOC/FIPE {renderSortIcon('pctLocFipe')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('pctLocCompra')}>
                    <span className="inline-flex items-center gap-1">% LOC/COMPRA {renderSortIcon('pctLocCompra')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('pctFipeCompra')}>
                    <span className="inline-flex items-center gap-1">FIPE/COMPRA {renderSortIcon('pctFipeCompra')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('cidadeEmplacamento')}>
                    <span className="inline-flex items-center gap-1">Cidade Emplacamento {renderSortIcon('cidadeEmplacamento')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('dataInicio')}>
                    <span className="inline-flex items-center gap-1">Data Início Contrato {renderSortIcon('dataInicio')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('dataFim')}>
                    <span className="inline-flex items-center gap-1">Data Fim Contrato {renderSortIcon('dataFim')}</span>
                  </th>
                  {/* coluna 'Data Fim Efetiva' removida */}
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('diasParaVencimento')}>
                    <span className="inline-flex items-center gap-1">Dias p/ Venc. {renderSortIcon('diasParaVencimento')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('faixaIdade')}>
                    <span className="inline-flex items-center gap-1">Idade Frota {renderSortIcon('faixaIdade')}</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer select-none whitespace-nowrap" onClick={() => toggleTableSort('idadeEmMeses')}>
                    <span className="inline-flex items-center gap-1">Idade Frota (meses) {renderSortIcon('idadeEmMeses')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableSlice.map((row, index) => (
                  <tr key={`${row.contratoLocacao}-${row.placa}-${index}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 font-medium text-slate-700">{row.contratoLocacao}</td>
                    <td className="px-4 py-2 text-slate-600">{row.contratoComercial || '—'}</td>
                    <td className={`px-4 py-2 ${row.nomeCliente === 'Sem Cliente' ? 'bg-amber-50 text-amber-800' : 'text-slate-600'}`}>{row.nomeCliente}</td>
                    <td className={`px-4 py-2 text-slate-600`}>{row.tipoCliente}</td>
                    <td className={`px-4 py-2 max-w-[200px] truncate ${!row.modelo ? 'bg-amber-50 text-amber-800' : 'text-slate-600'}`} title={row.modelo}>{row.modelo || '—'}</td>
                    <td className={`px-4 py-2 ${!row.placa ? 'bg-amber-50 text-amber-800' : 'text-slate-600'}`}>{row.placa || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{row.kmConfirmado > 0 ? fmtDecimal(row.kmConfirmado) : '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{row.kmInformado > 0 ? fmtDecimal(row.kmInformado) : '—'}</td>
                    <td className="px-4 py-2 text-slate-600 font-medium">{row.valorLocacao > 0 ? fmtBRL(row.valorLocacao) : '—'}</td>
                    <td className="px-4 py-2 text-slate-600 font-medium">{row.valorCompra > 0 ? fmtBRL(row.valorCompra) : '—'}</td>
                    <td className="px-4 py-2 text-slate-600 font-medium">{row.valorFipe > 0 ? fmtBRL(row.valorFipe) : '—'}</td>
                    <td className="px-4 py-2 text-slate-600 font-medium">{row.pctLocFipe != null ? fmtPct(row.pctLocFipe) : '—'}</td>
                    <td className="px-4 py-2 text-slate-600 font-medium">{row.pctLocCompra != null ? fmtPct(row.pctLocCompra) : '—'}</td>
                    <td className="px-4 py-2 text-slate-600 font-medium">{row.pctFipeCompra != null ? fmtPct(row.pctFipeCompra) : '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{row.cidadeEmplacamento || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{row.dataInicio ? row.dataInicio.toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{row.dataFim ? row.dataFim.toLocaleDateString('pt-BR') : '—'}</td>
                    {/* coluna 'Data Fim Efetiva' removida */}
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.diasParaVencimento === null ? 'bg-slate-100 text-slate-500' :
                        row.diasParaVencimento < 0 ? 'bg-red-100 text-red-700' :
                        row.diasParaVencimento <= 30 ? 'bg-amber-100 text-amber-700' :
                        row.diasParaVencimento <= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {row.diasParaVencimento !== null ? `${row.diasParaVencimento}d` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{row.faixaIdade}</td>
                    <td className="px-4 py-2 text-slate-600">{row.idadeEmMeses > 0 ? `${fmtDecimal(row.idadeEmMeses)} m` : '—'}</td>
                  </tr>
                ))}
                {tableSlice.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-slate-500" colSpan={20}>
                      Nenhum contrato encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Mostrando {totalRows === 0 ? 0 : startIndex + 1} a {endIndex} de {totalRows} linhas
              </span>
              <label className="flex items-center gap-2">
                <span>Por página</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 rounded border border-slate-300 bg-white px-2 text-xs"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPageSafe <= 1}
                className="h-7 rounded border border-slate-300 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span>Página {currentPageSafe} de {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPageSafe >= totalPages}
                className="h-7 rounded border border-slate-300 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>

        {showDashboardHelp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
            onClick={() => setShowDashboardHelp(false)}
          >
            <div
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 border-b border-blue-100 bg-blue-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-blue-900">💡 Como os Dados São Calculados</h2>
                    <p className="mt-1 text-sm text-blue-700">Entenda os cálculos e a lógica do dashboard de previsão de encerramento.</p>
                  </div>
                  <button
                    onClick={() => setShowDashboardHelp(false)}
                    className="text-2xl leading-none text-slate-400 hover:text-slate-600"
                    aria-label="Fechar ajuda"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-5 text-sm text-slate-700">
                <div className="rounded border-l-4 border-blue-400 bg-blue-50 p-4">
                  <h3 className="font-semibold text-slate-900">1. Base e escopo</h3>
                  <p className="mt-1">O dashboard usa a base <strong>Contratos locação</strong> e complementa dados com <strong>dim_frota</strong> para enriquecer modelo, odômetro, grupo e idade da frota.</p>
                </div>

                <div className="rounded border-l-4 border-violet-400 bg-violet-50 p-4">
                  <h3 className="font-semibold text-slate-900">2. Data de referência de encerramento</h3>
                  <p className="mt-1">A previsão prioriza <strong>Data Fim</strong> do contrato. Quando disponível, também considera data de encerramento. Se faltar data final, o sistema pode estimar uma data com base na duração média do tipo de contrato.</p>
                </div>

                <div className="rounded border-l-4 border-amber-400 bg-amber-50 p-4">
                  <h3 className="font-semibold text-slate-900">3. Gráfico Valor Locação</h3>
                  <ol className="mt-1 list-decimal list-inside space-y-1">
                    <li><strong>Barras:</strong> soma do valor de locação mensal por mês previsto de encerramento.</li>
                    <li><strong>Linha:</strong> quantidade de contratos que encerram no mesmo mês.</li>
                    <li>Os eixos são separados para comparar valor financeiro e volume sem distorção.</li>
                  </ol>
                </div>

                <div className="rounded border-l-4 border-emerald-400 bg-emerald-50 p-4">
                  <h3 className="font-semibold text-slate-900">4. Filtros cruzados</h3>
                  <p className="mt-1">Cliques nos gráficos ativam filtros cruzados (mês, faixa de vencimento, cliente, grupo, cidade, etc.), atualizando todos os cards e a tabela em conjunto.</p>
                </div>
              </div>

              <div className="border-t bg-slate-50 p-4">
                <button
                  onClick={() => setShowDashboardHelp(false)}
                  className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
