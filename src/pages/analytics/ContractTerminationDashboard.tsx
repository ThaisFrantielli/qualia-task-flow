import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Line, LabelList
} from 'recharts';
import { ChevronLeft, FileSpreadsheet } from 'lucide-react';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import useChartFilter from '@/hooks/useChartFilter';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
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

// ─── Component ────────────────────────────────────────────────────────
export default function ContractTerminationDashboard() {
  // Load data from API - using dim_contratos_locacao (already JOINed with dim_frota on server)
  const { data: contractsData, loading: loadingContracts } = useBIData<AnyObject[]>('dim_contratos_locacao');
  const { loading: loadingFrota } = useBIData<AnyObject[]>('dim_frota');

  // Filter state (Chart-based)
  const { filters, handleChartClick, clearAllFilters, isValueSelected, getFilterValues } = useChartFilter();

  // Primary filters (Sidebar)
  const [filterTipoCliente, setFilterTipoCliente] = useState<string>('Todos');
  const [filterCliente, setFilterCliente] = useState<string>('Todos');
  const [filterFaixa, setFilterFaixa] = useState<string>('Todos');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const NOW = useMemo(() => new Date(), []);

  // ─── Normalize contracts ───────────────────────────────────────────
  const contracts = useMemo(() => {
    if (!contractsData || !Array.isArray(contractsData)) return [];
    return contractsData.map((c: AnyObject) => {
      const placa = normalizePlate(c.PlacaPrincipal ?? c.placaprincipal ?? c.Placa ?? c.placa ?? '');
      const contratoLocacao = getStr(c.ContratoLocacao, c.NumeroContrato, c.id_contrato_locacao) || 'N/A';
      const contratoComercial = getStr(c.ContratoComercial, c.contratoComercial) || '';
      const nomeCliente = getStr(c.NomeCliente, c.nomecliente, c.Cliente, c.cliente) || 'Sem Cliente';
      const tipoCliente = getStr(c.TipoDeContrato, c.TipoLocacao, c.tipolocacao) || 'Não Definido';
      const modelo = getStr(c.Modelo, c.modelo_veiculo, c.modelo) || 'N/A';
      const grupo = getStr(c.Categoria, c.categoria, c.GrupoVeiculo, c.grupoveiculo) || 'Outros';
      const filial = getStr(c.Filial, c.filial, c.FilialCompra, c.filialcompra) || 'N/A';
      const cidade = getStr(c.CidadeEntrega, c.cidadeentrega, c.CidadeLocacao, c.cidadelocacao, c.Cidade, c.cidade,
        c.LocalizacaoVeiculo, c.localizacaoveiculo) || '';
      const status = getStr(c.SituacaoContratoLocacao, c.SituacaoContrato, c.StatusLocacao, c.statuslocacao) || '';

      const valorLocacao = parseCurrency(c.UltimoValorLocacao ?? c.ValorMensalAtual ?? c.ValorLocacao ?? c.ValorMensal ?? c.valormensal ?? 0);
      const valorCompra = parseCurrency(c.ValorCompra ?? c.valorcompra ?? 0);
      const valorFipe = parseCurrency(c.ValorFipe ?? c.ValorAtualFIPE ?? c.valorFipeAtual ?? c.ValorFipeAtual ?? 0);
      const km = parseNum(c.KmConfirmado ?? c.OdometroConfirmado ?? c.KmInformado ?? c.currentKm ?? 0);
      const idadeEmMeses = parseNum(c.IdadeEmMeses ?? c.IdadeVeiculo ?? c.ageMonths ?? 0);
      const dataCompra = parseBIDate(c.DataCompra ?? c.datacompra ?? c.DataAquisicao ?? c.dataaquisicao ?? null);

      const dataInicio = parseBIDate(c.DataInicial ?? c.DataInicio ?? c.datainicio ?? null);
      const dataFim = parseBIDate(c.DataFinal ?? c.DataTermino ?? c.datatermino ?? c.DataFim ?? c.datafim ?? null);
      const dataEncerramento = parseBIDate(c.DataEncerramento ?? c.dataencerramento ?? null);

      // Determine dias para vencimento
      const refDate = dataFim ?? dataEncerramento;
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
      let faixaIdade = 'Sem Data Compra';
      if (dataCompra) {
        const meses = diffMonths(dataCompra, NOW);
        if (meses <= 12) faixaIdade = '0 a 12m';
        else if (meses <= 24) faixaIdade = '13m a 24m';
        else if (meses <= 36) faixaIdade = '25m a 36m';
        else if (meses <= 48) faixaIdade = '37m a 48m';
        else if (meses <= 60) faixaIdade = '49m a 60m';
        else faixaIdade = 'Acima de 60m';
      } else if (idadeEmMeses > 0) {
        if (idadeEmMeses <= 12) faixaIdade = '0 a 12m';
        else if (idadeEmMeses <= 24) faixaIdade = '13m a 24m';
        else if (idadeEmMeses <= 36) faixaIdade = '25m a 36m';
        else if (idadeEmMeses <= 48) faixaIdade = '37m a 48m';
        else if (idadeEmMeses <= 60) faixaIdade = '49m a 60m';
        else faixaIdade = 'Acima de 60m';
      }

      // Saldo financeiro: para qual ano o contrato vence
      const anoVencimento = refDate ? refDate.getFullYear() : null;

      // IsChecked active
      const isClosed = status.toUpperCase().includes('ENCERR') || status.toUpperCase().includes('CANCEL');

      return {
        placa,
        contratoLocacao,
        contratoComercial,
        nomeCliente,
        tipoCliente,
        modelo,
        grupo,
        filial,
        cidade,
        status,
        valorLocacao,
        valorCompra,
        valorFipe,
        km,
        idadeEmMeses,
        dataCompra,
        dataInicio,
        dataFim,
        dataEncerramento,
        diasParaVencimento,
        faixaVencimento,
        faixaKm,
        faixaIdade,
        anoVencimento,
        isClosed,
      };
    });
  }, [contractsData, NOW]);

  // ─── Filtered contracts ────────────────────────────────────────────
  const filtered = useMemo(() => {
    // Get chart filters
    const chartTipoFilters = getFilterValues('tipoCliente');
    const chartClienteFilters = getFilterValues('nomeCliente');
    const chartFaixaFilters = getFilterValues('faixaVencimento');
    const chartGrupoFilters = getFilterValues('grupo');
    const chartCidadeFilters = getFilterValues('cidade');
    const chartFilialFilters = getFilterValues('filial');
    const chartKmFilters = getFilterValues('faixaKm');
    const chartIdadeFilters = getFilterValues('faixaIdade');
    const chartAnoVencFilters = getFilterValues('anoVencimento');

    return contracts.filter(c => {
      // Basic business rule: only active contracts
      if (c.isClosed) return false;

      // 1. Sidebar Filters
      if (filterTipoCliente !== 'Todos' && c.tipoCliente !== filterTipoCliente) return false;
      if (filterCliente !== 'Todos' && c.nomeCliente !== filterCliente) return false;
      if (filterFaixa !== 'Todos' && c.faixaVencimento !== filterFaixa) return false;

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
      if (chartFaixaFilters.length > 0 && !chartFaixaFilters.includes(c.faixaVencimento)) return false;
      if (chartGrupoFilters.length > 0 && !chartGrupoFilters.includes(c.grupo)) return false;
      if (chartCidadeFilters.length > 0 && !chartCidadeFilters.includes(c.cidade?.toUpperCase().trim())) return false;
      if (chartFilialFilters.length > 0 && !chartFilialFilters.includes(c.filial)) return false;
      if (chartKmFilters.length > 0 && !chartKmFilters.includes(c.faixaKm)) return false;
      if (chartIdadeFilters.length > 0 && !chartIdadeFilters.includes(c.faixaIdade)) return false;
      if (chartAnoVencFilters.length > 0 && !chartAnoVencFilters.includes(String(c.anoVencimento))) return false;

      return true;
    });
  }, [contracts, filterTipoCliente, filterCliente, filterFaixa, dateRange, filters]);

  // ─── Unique clients & types for filters ────────────────────────────
  const uniqueTipos = useMemo(() => {
    const active = contracts.filter(c => !c.isClosed);
    return Array.from(new Set(active.map(c => c.tipoCliente).filter(Boolean))).sort();
  }, [contracts]);

  const uniqueClientes = useMemo(() => {
    const active = contracts.filter(c => !c.isClosed);
    return Array.from(new Set(active.map(c => c.nomeCliente).filter(c => c && c !== 'Sem Cliente'))).sort();
  }, [contracts]);

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
      { label: 'Valor de Locação', value: fmtCompact(totalLocacao) },
      { label: 'Valor de Compra', value: fmtCompact(totalCompra) },
      { label: 'Valor Fipe', value: fmtCompact(totalFipe) },
      { label: '% Loc/Fipe', value: fmtPct(pctLocFipe) },
      { label: '% Loc/Compra', value: fmtPct(pctLocCompra) },
      { label: 'Fipe/Compra', value: fmtPct(pctFipeCompra) },
    ];
  }, [filtered]);

  // ─── Revenue by month ──────────────────────────────────────────────
  const revenueByMonth = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const totals = new Array(12).fill(0);
    const counts = new Array(12).fill(0);

    for (const c of filtered) {
      if (!c.dataInicio || !c.dataFim) continue;
      // Count contracts active in each month of the current year
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(NOW.getFullYear(), m, 1);
        const monthEnd = new Date(NOW.getFullYear(), m + 1, 0);
        if (c.dataInicio <= monthEnd && c.dataFim >= monthStart) {
          totals[m] += c.valorLocacao;
          counts[m] += 1;
        }
      }
    }

    return monthNames.map((month, i) => ({ month, total: Math.round(totals[i]), contracts: counts[i] }));
  }, [filtered, NOW]);

  // ─── Client type distribution ──────────────────────────────────────
  const clientTypeData = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    for (const c of filtered) {
      const tipo = c.tipoCliente || 'Não Definido';
      const prev = map.get(tipo) || { count: 0, value: 0 };
      map.set(tipo, { count: prev.count + 1, value: prev.value + c.valorLocacao });
    }
    return Array.from(map.entries())
      .map(([name, { count, value }]) => ({ name, value: count, amount: fmtBRL(value) }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

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
    return ranges.map(range => ({ range, value: map.get(range) || 0 })).filter(d => d.value > 0);
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

  // ─── KM Index ──────────────────────────────────────────────────────
  const kmIndexData = useMemo(() => {
    const ranges = ['(Em branco)', '0-10mil', '10-20mil', '20-30mil', '30-40mil', '40-50mil',
      '50-60mil', '60-70mil', '70-80mil', '80-90mil', '90-100mil', '100-120mil', '120mil+'];
    const map = new Map<string, number>();
    ranges.forEach(r => map.set(r, 0));
    for (const c of filtered) {
      if (c.faixaKm && map.has(c.faixaKm)) {
        map.set(c.faixaKm, (map.get(c.faixaKm) || 0) + 1);
      }
    }
    return ranges.map(range => ({ range, value: map.get(range) || 0 })).filter(d => d.value > 0);
  }, [filtered]);

  // ─── Vehicle group ─────────────────────────────────────────────────
  const vehicleGroupData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      const g = c.grupo || 'Outros';
      map.set(g, (map.get(g) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([group, value]) => ({ group, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  // ─── Delivery city ─────────────────────────────────────────────────
  const cityData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      let cidade = c.cidade;
      // Try to extract city name from long address strings
      if (cidade && cidade.length > 50) {
        const parts = cidade.split(',');
        if (parts.length >= 2) cidade = parts[parts.length - 2].trim();
      }
      cidade = cidade || '(Em branco)';
      // Normalize to uppercase for grouping
      cidade = cidade.toUpperCase().trim();
      map.set(cidade, (map.get(cidade) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([city, value]) => ({ city, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  // ─── Purchase branch ──────────────────────────────────────────────
  const branchData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      const b = c.filial || '(Em branco)';
      map.set(b, (map.get(b) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([branch, value]) => ({ branch, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // ─── Financial balance by year ─────────────────────────────────────
  const financialBalanceData = useMemo(() => {
    const map = new Map<number, number>();
    for (const c of filtered) {
      if (c.anoVencimento && c.valorCompra > 0) {
        map.set(c.anoVencimento, (map.get(c.anoVencimento) || 0) + c.valorCompra);
      }
    }
    return Array.from(map.entries())
      .filter(([year]) => year >= NOW.getFullYear())
      .map(([year, value]) => ({ year: String(year), value }))
      .sort((a, b) => Number(b.year) - Number(a.year));
  }, [filtered, NOW]);

  // ─── Table (paginated) ─────────────────────────────────────────────
  const [tablePage, setTablePage] = useState(0);
  const PAGE_SIZE = 15;
  const sortedForTable = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Sort by expiration: soonest ending date first
      if (a.diasParaVencimento === null) return 1;
      if (b.diasParaVencimento === null) return -1;
      return a.diasParaVencimento - b.diasParaVencimento;
    });
  }, [filtered]);
  const tableSlice = sortedForTable.slice(tablePage * PAGE_SIZE, (tablePage + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sortedForTable.length / PAGE_SIZE);

  // Visible counts for charts that may have many categories (infinite-scroll style)
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
    fleetByClient: 10,
    vehicleGroup: 10,
    city: 10,
    branch: 10,
    clientType: 20,
  });

  const handleScrollLoad = (key: string) => {
    setVisibleCounts(prev => {
      const current = prev[key] || 0;
      // Cap growth to avoid runaway rendering
      if (current >= 1000) return prev;
      return { ...prev, [key]: current + 10 };
    });
  };

  // ─── Export ────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = sortedForTable.map(c => ({
      'Contrato Locação': c.contratoLocacao,
      'Contrato Comercial': c.contratoComercial,
      'Cliente': c.nomeCliente,
      'Tipo': c.tipoCliente,
      'Modelo': c.modelo,
      'Placa': c.placa,
      'KM': c.km,
      'Valor Locação': c.valorLocacao,
      'Valor Compra': c.valorCompra,
      'Valor FIPE': c.valorFipe,
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
                onChange={e => { setFilterFaixa(e.target.value); setTablePage(0); }}
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
                onChange={e => { setFilterCliente(e.target.value); setTablePage(0); }}
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
                onChange={e => { setFilterTipoCliente(e.target.value); setTablePage(0); }}
              >
                <option value="Todos">Todos</option>
                {uniqueTipos.map(t => <option key={t} value={t}>{t}</option>)}
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
                setDateRange(undefined);
                clearAllFilters();
                setTablePage(0); 
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
          >
            Limpar Filtros
          </button>

          <button
            onClick={handleExport}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2"
          >
            <FileSpreadsheet size={14} />
            Exportar Excel
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto h-screen">
        {/* Header */}
        <div className="bg-[#2e1065] text-white p-4 rounded-t-lg flex justify-between items-center mb-4 shadow-lg">
          <h1 className="text-xl font-bold uppercase tracking-wider text-orange-400">Previsão de Encerramento de Contrato</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs font-light opacity-70">{filtered.length} contratos ativos</span>
            <span className="text-xs font-light opacity-70">Quality</span>
          </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* Row 1: Revenue (Full Width) */}
          <div className="lg:col-span-3 bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Faturamento Locação</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtCompact(v)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: '12px' }}
                    formatter={(value: any, name: string) => name === 'total' ? fmtBRL(value) : value}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar yAxisId="left" dataKey="total" name="Valor Locação" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="contracts" name="Contratos" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Pie, Bar, Bar */}
          <div className="bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Quantidade por Tipo de Cliente</h3>
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientTypeData.slice(0, visibleCounts.clientType)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry: any) => `${entry.name} — ${entry.value}`}
                  >
                    {clientTypeData.slice(0, visibleCounts.clientType).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        opacity={getFilterValues('tipoCliente').length > 0 ? (isValueSelected('tipoCliente', entry.name) ? 1 : 0.3) : 1}
                        cursor="pointer"
                        onClick={(e) => handleChartClick('tipoCliente', entry.name, e as any)}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, _name: any, props: any) => [`${value} — ${props.payload.amount}`, props.payload.name]} />
                  <Legend 
                    verticalAlign="middle" 
                    align="right" 
                    layout="vertical" 
                    iconSize={8} 
                    wrapperStyle={{ fontSize: '10px' }} 
                    onClick={(data) => handleChartClick('tipoCliente', data.value, {} as any)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Contrato - Faixa de Vencimento</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={expirationData}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="range" type="category" width={110} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar 
                    dataKey="value" 
                    fill="#f97316" 
                    radius={[0, 4, 4, 0]} 
                    barSize={15}
                    onClick={(data, _i, e) => handleChartClick('faixaVencimento', data.range, e as any)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="value" position="right" formatter={(v: any) => fmtDecimal(v)} />
                    {expirationData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.range === 'Vencido' ? '#ef4444' : '#f97316'} 
                        opacity={getFilterValues('faixaVencimento').length > 0 ? (isValueSelected('faixaVencimento', entry.range) ? 1 : 0.3) : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Frota - Faixa Idade Veículo</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fleetAgeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="range" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    onClick={(data, _i, e) => handleChartClick('faixaIdade', data.range, e as any)}
                    cursor="pointer"
                  >
                    {fleetAgeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#3b82f6" 
                        opacity={getFilterValues('faixaIdade').length > 0 ? (isValueSelected('faixaIdade', entry.range) ? 1 : 0.4) : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Client Type, Fleet by Client, KM Index */}
          <div className="bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Tipo de Cliente</h3>
            <div className="h-64 overflow-y-auto" onScroll={(e) => { const t = e.currentTarget as HTMLElement; if (t.scrollTop + t.clientHeight >= t.scrollHeight - 40) handleScrollLoad('clientType'); }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={clientTypeData.slice(0, visibleCounts.clientType)}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="#818cf8" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20} 
                    onClick={(data, _i, e) => handleChartClick('tipoCliente', data.name, e as any)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="value" position="right" formatter={(v: any) => fmtDecimal(v)} />
                    {clientTypeData.slice(0, visibleCounts.clientType).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#818cf8" 
                        opacity={getFilterValues('tipoCliente').length > 0 ? (isValueSelected('tipoCliente', entry.name) ? 1 : 0.4) : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Frota por Cliente</h3>
            <div className="h-64 overflow-y-auto" onScroll={(e) => { const t = e.currentTarget as HTMLElement; if (t.scrollTop + t.clientHeight >= t.scrollHeight - 40) handleScrollLoad('fleetByClient'); }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={fleetByClientData.slice(0, visibleCounts.fleetByClient)}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6" 
                    radius={[0, 4, 4, 0]} 
                    barSize={12} 
                    onClick={(data, _i, e) => handleChartClick('nomeCliente', data.name, e as any)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="value" position="right" formatter={(v: any) => fmtDecimal(v)} />
                     {fleetByClientData.slice(0, visibleCounts.fleetByClient).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#3b82f6" 
                        opacity={getFilterValues('nomeCliente').length > 0 ? (isValueSelected('nomeCliente', entry.name) ? 1 : 0.4) : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Frota - Índice de KM</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kmIndexData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="range" tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="#f97316" 
                    radius={[4, 4, 0, 0]} 
                    onClick={(data, _i, e) => handleChartClick('faixaKm', data.range, e as any)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="value" position="top" formatter={(v: any) => fmtDecimal(v)} />
                    {kmIndexData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#f97316" 
                        opacity={getFilterValues('faixaKm').length > 0 ? (isValueSelected('faixaKm', entry.range) ? 1 : 0.4) : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 4: Fleet Group, City */}
          <div className="bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Frota - Grupo de Veículo</h3>
            <div className="h-64 overflow-y-auto" onScroll={(e) => { const t = e.currentTarget as HTMLElement; if (t.scrollTop + t.clientHeight >= t.scrollHeight - 40) handleScrollLoad('vehicleGroup'); }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={vehicleGroupData.slice(0, visibleCounts.vehicleGroup || 10)}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="group" type="category" width={120} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="#0ea5e9" 
                    radius={[0, 4, 4, 0]} 
                    barSize={12} 
                    onClick={(data, _i, e) => handleChartClick('grupo', data.group, e as any)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="value" position="right" formatter={(v: any) => fmtDecimal(v)} />
                    {vehicleGroupData.slice(0, visibleCounts.vehicleGroup || 10).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#0ea5e9" 
                        opacity={getFilterValues('grupo').length > 0 ? (isValueSelected('grupo', entry.group) ? 1 : 0.4) : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Contrato - Cidade de Entrega</h3>
            <div className="h-64 overflow-y-auto" onScroll={(e) => { const t = e.currentTarget as HTMLElement; if (t.scrollTop + t.clientHeight >= t.scrollHeight - 40) handleScrollLoad('city'); }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={cityData.slice(0, visibleCounts.city)}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="city" type="category" width={120} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6" 
                    radius={[0, 4, 4, 0]} 
                    barSize={15} 
                    onClick={(data, _i, e) => handleChartClick('cidade', data.city, e as any)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="value" position="right" formatter={(v: any) => fmtDecimal(v)} />
                    {cityData.slice(0, visibleCounts.city).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#3b82f6" 
                        opacity={getFilterValues('cidade').length > 0 ? (isValueSelected('cidade', entry.city) ? 1 : 0.4) : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 5: Purchase Branch, Financial Balance */}
          <div className="bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Filial de Compra</h3>
            <div className="h-48 overflow-y-auto" onScroll={(e) => { const t = e.currentTarget as HTMLElement; if (t.scrollTop + t.clientHeight >= t.scrollHeight - 40) handleScrollLoad('branch'); }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={branchData.slice(0, visibleCounts.branch)}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="branch" type="category" width={100} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="#0ea5e9" 
                    radius={[0, 4, 4, 0]} 
                    barSize={12} 
                    onClick={(data, _i, e) => handleChartClick('filial', data.branch, e as any)}
                    cursor="pointer"
                  >
                    <LabelList dataKey="value" position="right" formatter={(v: any) => fmtDecimal(v)} />
                     {branchData.slice(0, visibleCounts.branch).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#0ea5e9" 
                        opacity={getFilterValues('filial').length > 0 ? (isValueSelected('filial', entry.branch) ? 1 : 0.4) : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-4 rounded shadow border border-slate-200">
            <h3 className="text-xs font-bold text-slate-600 uppercase mb-4 border-b pb-2">Saldo Financ. Veículo por Ano de Vencimento</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={financialBalanceData}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="year" type="category" width={50} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: any) => fmtBRL(value)} />
                  <Bar 
                    dataKey="value" 
                    fill="#0ea5e9" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20} 
                    onClick={(data, _i, e) => handleChartClick('anoVencimento', data.year, e as any)}
                    cursor="pointer"
                  >
                    {financialBalanceData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill="#0ea5e9" 
                        opacity={getFilterValues('anoVencimento').length > 0 ? (isValueSelected('anoVencimento', entry.year) ? 1 : 0.4) : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Table */}
        <div className="bg-white rounded shadow border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#2e1065] text-white uppercase font-bold">
                <tr>
                  <th className="px-4 py-3">Contrato Locação</th>
                  <th className="px-4 py-3">Contrato Comercial</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Modelo</th>
                  <th className="px-4 py-3">Placa Principal</th>
                  <th className="px-4 py-3">Odômetro</th>
                  <th className="px-4 py-3">Valor Locação</th>
                  <th className="px-4 py-3">Data Fim</th>
                  <th className="px-4 py-3">Dias p/ Venc.</th>
                  <th className="px-4 py-3">Idade Frota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableSlice.map((row, index) => (
                  <tr key={`${row.contratoLocacao}-${row.placa}-${index}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 font-medium text-slate-700">{row.contratoLocacao}</td>
                    <td className="px-4 py-2 text-slate-600">{row.contratoComercial || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{row.nomeCliente}</td>
                    <td className="px-4 py-2 text-slate-600 max-w-[200px] truncate" title={row.modelo}>{row.modelo}</td>
                    <td className="px-4 py-2 text-slate-600">{row.placa || '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{row.km > 0 ? fmtDecimal(row.km) : '—'}</td>
                    <td className="px-4 py-2 text-slate-600 font-medium">{row.valorLocacao > 0 ? fmtBRL(row.valorLocacao) : '—'}</td>
                    <td className="px-4 py-2 text-slate-600">{row.dataFim ? row.dataFim.toLocaleDateString('pt-BR') : '—'}</td>
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
                  </tr>
                ))}
                {tableSlice.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-slate-500" colSpan={10}>
                      Nenhum contrato encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t">
              <span className="text-xs text-slate-500">
                Mostrando {tablePage * PAGE_SIZE + 1}–{Math.min((tablePage + 1) * PAGE_SIZE, sortedForTable.length)} de {sortedForTable.length}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={tablePage === 0}
                  onClick={() => setTablePage(p => p - 1)}
                  className="px-3 py-1 text-xs rounded border bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  disabled={tablePage >= totalPages - 1}
                  onClick={() => setTablePage(p => p + 1)}
                  className="px-3 py-1 text-xs rounded border bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
