import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Calculator,
  Car,
  ChartLine,
  Download,
  TrendingDown,
  DollarSign,
  Settings,
  MoreVertical,
  Info,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';

import useBIData from '@/hooks/useBIData';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { useDepreciation, type DepreciationMethod, type FipeHistoryPoint } from '@/hooks/useDepreciation';

type AnyRecord = Record<string, unknown>;

const schema = z.object({
  mode: z.enum(['frota', 'manual']),
  selectedVehicles: z.array(z.string()).optional(),
  categoriaVeiculo: z.string().optional(),
  codigoFipe: z.string().optional(),
  modeloReferencia: z.string().optional(),
  anoModelo: z.coerce.number().int().min(0, 'Ano invalido.').max(2100, 'Ano invalido.'),
  precoPP: z.coerce.number().min(0, 'Informe o preco publico.'),
  descontoFrota: z.coerce.number().min(0).max(100),
  prazoMeses: z.coerce.number().int().min(1, 'Prazo minimo de 1 mes.').max(120, 'Prazo maximo de 120 meses.'),
  dataInicial: z.string().optional(),
  dataFinal: z.string().optional(),
  tipoCalculo: z.enum(['exponential', 'linear']),
  taxaManualAnual: z.coerce.number().optional(),
  percentualVendaFipe: z.coerce.number().min(0, 'Percentual minimo de 0%.').max(100, 'Percentual maximo de 100%.'),
});

type FormValues = z.infer<typeof schema>;

type PersistedFipePageState = Partial<FormValues> & {
  vehicleSearch: string;
};

const FIPE_PAGE_STORAGE_KEY = 'analytics:fipe-depreciation:state:v1';

function loadPersistedFipePageState(): PersistedFipePageState {
  if (typeof window === 'undefined') {
    return { vehicleSearch: '' };
  }

  try {
    const raw = window.localStorage.getItem(FIPE_PAGE_STORAGE_KEY);
    if (!raw) return { vehicleSearch: '' };

    const parsed = JSON.parse(raw) as Partial<PersistedFipePageState>;

    return {
      mode: parsed.mode === 'manual' ? 'manual' : 'frota',
      selectedVehicles: Array.isArray(parsed.selectedVehicles) ? parsed.selectedVehicles.filter((item): item is string => typeof item === 'string') : [],
      categoriaVeiculo: typeof parsed.categoriaVeiculo === 'string' ? parsed.categoriaVeiculo : '',
      codigoFipe: typeof parsed.codigoFipe === 'string' ? parsed.codigoFipe : '',
      modeloReferencia: typeof parsed.modeloReferencia === 'string' ? parsed.modeloReferencia : '',
      anoModelo: Number.isFinite(Number(parsed.anoModelo)) ? Number(parsed.anoModelo) : new Date().getFullYear(),
      precoPP: Number.isFinite(Number(parsed.precoPP)) ? Number(parsed.precoPP) : 0,
      descontoFrota: Number.isFinite(Number(parsed.descontoFrota)) ? Number(parsed.descontoFrota) : 0,
      prazoMeses: Number.isFinite(Number(parsed.prazoMeses)) ? Number(parsed.prazoMeses) : 30,
      dataInicial: typeof parsed.dataInicial === 'string' ? parsed.dataInicial : '',
      dataFinal: typeof parsed.dataFinal === 'string' ? parsed.dataFinal : '',
      tipoCalculo: parsed.tipoCalculo === 'linear' ? 'linear' : 'exponential',
      taxaManualAnual: Number.isFinite(Number(parsed.taxaManualAnual)) ? Number(parsed.taxaManualAnual) : undefined,
      percentualVendaFipe: Number.isFinite(Number(parsed.percentualVendaFipe)) ? Number(parsed.percentualVendaFipe) : 80,
      vehicleSearch: typeof parsed.vehicleSearch === 'string' ? parsed.vehicleSearch : '',
    };
  } catch {
    return { vehicleSearch: '' };
  }
}

function persistFipePageState(state: PersistedFipePageState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FIPE_PAGE_STORAGE_KEY, JSON.stringify(state));
}

interface FrotaVehicle {
  key: string;
  id: string;
  codigoFipe: string;
  anoModelo: number;
  modelo: string;
  categoria: string;
  placa: string;
  valorAquisicao: number;
  dataAquisicao?: string;
}

interface FipeRow {
  codigoFipe: string;
  anoModelo: number;
  model: string;
  date: Date;
  value: number;
  mesFipe?: string;
}

const frotaAliases = {
  id: ['IdVeiculo', 'id_veiculo', 'idVeiculo', 'id', 'ID'],
  codigoFipe: ['codigo_fipe', 'CodigoFIPE', 'CodigoFipe', 'fipe_codigo'],
  anoModelo: ['AnoModelo', 'ano_modelo', 'anoModelo', 'ano'],
  modelo: ['Modelo', 'modelo', 'DescricaoModelo', 'descricao_modelo'],
  categoria: ['Categoria', 'categoria', 'GrupoVeiculo', 'grupo_veiculo', 'grupoVeiculo', 'Grupo', 'grupo'],
  placa: ['Placa', 'placa'],
  valorAquisicao: ['ValorCompra', 'valor_compra', 'valorCompra', 'valor_aquisicao', 'ValorAquisicao'],
  dataAquisicao: ['DataCompra', 'data_compra', 'dataCompra', 'DataAquisicao', 'data_aquisicao'],
};

const fipeAliases = {
  codigoFipe: ['codigo_fipe', 'CodigoFIPE', 'CodigoFipe', 'codigofipe'],
  anoModelo: ['ano_modelo', 'AnoModelo', 'anoModelo', 'ano'],
  modelo: ['Modelo', 'modelo', 'DescricaoModelo', 'descricao_modelo', 'NomeModelo'],
  mesFipe: ['MesFIPE', 'mes_fipe', 'mesFipe', 'mes_fipe_referencia', 'mesReferencia'],
  data: ['DataMesFIPE', 'data_mes_fipe', 'data_referencia', 'DataReferencia', 'competencia', 'mes_referencia'],
  valor: ['PrecoFIPE', 'preco_fipe', 'valor_fipe', 'ValorFIPE', 'valor', 'Valor'],
};

function readFirst(row: AnyRecord, candidates: string[]): unknown {
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return undefined;
}

function normalizeCode(value: unknown): string {
  return String(value || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const raw = String(value ?? '')
    .replace(/R\$\s?/gi, '')
    .replace(/\s/g, '')
    .replace(/[^0-9,.-]/g, '');

  if (!raw) return 0;

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  let normalized = raw;

  if (hasComma && hasDot) {
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');

    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = raw.replace(/,/g, '');
    }
  } else if (hasComma) {
    const commaCount = (raw.match(/,/g) || []).length;
    if (commaCount > 1) {
      normalized = raw.replace(/,/g, '');
    } else {
      const decimalPlaces = raw.length - raw.lastIndexOf(',') - 1;
      normalized = decimalPlaces === 3 ? raw.replace(/,/g, '') : raw.replace(',', '.');
    }
  } else if (hasDot) {
    const dotCount = (raw.match(/\./g) || []).length;
    if (dotCount > 1) {
      normalized = raw.replace(/\./g, '');
    } else {
      const decimalPlaces = raw.length - raw.lastIndexOf('.') - 1;
      normalized = decimalPlaces === 3 ? raw.replace(/\./g, '') : raw;
    }
  }

  if (normalized.startsWith('--')) {
    normalized = normalized.replace(/^--+/, '-');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pickMostFrequent(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let best = '';
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }

  return best;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const [, dd, mm, yyyy] = br;
    const converted = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (!Number.isNaN(converted.getTime())) return converted;
  }

  const ym = raw.match(/^(\d{4})[-/]?(\d{2})$/);
  if (ym) {
    const [, yyyy, mm] = ym;
    const converted = new Date(`${yyyy}-${mm}-01T00:00:00`);
    if (!Number.isNaN(converted.getTime())) return converted;
  }

  return null;
}

function toDateInputValue(value: Date): string {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2).replace('.', ',')}%`;
}

function monthDiff(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const total = years * 12 + months;
  return Math.max(1, total);
}

function exportFipeHistoryToExcel(
  history: Array<{ date: Date; value: number; diff: number; diffPct: number; codigoFipe?: string; anoModelo?: number; modelo?: string; mesFipe?: string }>,
  codigoFipe: string,
  anoModelo: number
): void {
  if (history.length === 0) {
    alert('Nenhum dado FIPE para exportar.');
    return;
  }

  const formattedData = history.map((row) => ({
    'Modelo': row.modelo || '-',
    'Codigo FIPE': row.codigoFipe || '-',
    'Ano Modelo': row.anoModelo || '-',
    'Mes FIPE': row.mesFipe || '-',
    'Data': row.date.toLocaleDateString('pt-BR'),
    'Valor (R$)': row.value,
    'Variação (R$)': row.diff,
    'Variação (%)': row.diffPct * 100,
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(formattedData, {
    header: ['Modelo', 'Codigo FIPE', 'Ano Modelo', 'Mes FIPE', 'Data', 'Valor (R$)', 'Variação (R$)', 'Variação (%)'],
  });

  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 12 },
    { wch: 11 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico FIPE');

  const filename = `historico-fipe-${codigoFipe}-${anoModelo}-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// Equivalente ao FRAÇÃOANO do Excel (base 30/360)
function yearFraction(start: Date, end: Date): number {
  const d1 = start.getDate();
  const m1 = start.getMonth() + 1;
  const y1 = start.getFullYear();

  const d2 = end.getDate();
  const m2 = end.getMonth() + 1;
  const y2 = end.getFullYear();

  const days = (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
  return days / 360;
}

export default function FipeDepreciationPage() {
  const {
    data: frotaRaw,
    metadata: frotaMetadata,
    loading: loadingFrota,
    error: errorFrota,
  } = useBIData<AnyRecord[]>('dim_frota', { staleTime: 10 * 60 * 1000 });

  const {
    data: fipeRaw,
    metadata: fipeMetadata,
    loading: loadingFipe,
    error: errorFipe,
  } = useBIData<AnyRecord[]>('dim_precos_fipe', { staleTime: 10 * 60 * 1000, limit: 300000 });

  const vehicles = useMemo<FrotaVehicle[]>(() => {
    if (!Array.isArray(frotaRaw)) return [];

    const mapped = frotaRaw
      .map((row) => {
        const id = String(readFirst(row, frotaAliases.id) || '').trim();
        const codigoFipe = normalizeCode(readFirst(row, frotaAliases.codigoFipe));
        const anoModelo = Math.trunc(toNumber(readFirst(row, frotaAliases.anoModelo)));
        const modelo = String(readFirst(row, frotaAliases.modelo) || '').trim();
        const categoria = String(readFirst(row, frotaAliases.categoria) || '').trim();
        const placa = String(readFirst(row, frotaAliases.placa) || '').trim();
        const valorAquisicao = toNumber(readFirst(row, frotaAliases.valorAquisicao));
        const dataAquisicao = String(readFirst(row, frotaAliases.dataAquisicao) || '').trim() || undefined;

        if (!id || !codigoFipe || !anoModelo || !valorAquisicao) return null;

        return {
          key: `${id}-${codigoFipe}-${anoModelo}`,
          id,
          codigoFipe,
          anoModelo,
          modelo: modelo || 'Modelo nao informado',
          categoria: categoria || 'Categoria nao informada',
          placa,
          valorAquisicao,
          dataAquisicao,
        };
      })
      .filter(Boolean) as FrotaVehicle[];

    return mapped.sort((a, b) => a.modelo.localeCompare(b.modelo));
  }, [frotaRaw]);

  const fipeSeries = useMemo<FipeRow[]>(() => {
    if (!Array.isArray(fipeRaw)) return [];

    return fipeRaw
      .map((row) => {
        const codigoFipe = normalizeCode(readFirst(row, fipeAliases.codigoFipe));
        const anoModelo = Math.trunc(toNumber(readFirst(row, fipeAliases.anoModelo)));
        const model = String(readFirst(row, fipeAliases.modelo) || '').trim();
        const mesFipe = String(readFirst(row, fipeAliases.mesFipe) || '').trim();
        const date = toDate(readFirst(row, fipeAliases.data));
        const value = toNumber(readFirst(row, fipeAliases.valor));

        if (!codigoFipe || !anoModelo || !date || value <= 0) return null;

        return {
          codigoFipe,
          anoModelo,
          model,
          date,
          value,
          mesFipe,
        };
      })
      .filter(Boolean) as FipeRow[];
  }, [fipeRaw]);

  const persistedPageState = loadPersistedFipePageState();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: persistedPageState.mode || 'frota',
      selectedVehicles: persistedPageState.selectedVehicles || [],
      categoriaVeiculo: persistedPageState.categoriaVeiculo || '',
      codigoFipe: persistedPageState.codigoFipe || '',
      modeloReferencia: persistedPageState.modeloReferencia || '',
      anoModelo: persistedPageState.anoModelo || new Date().getFullYear(),
      precoPP: Number.isFinite(persistedPageState.precoPP) ? Number(persistedPageState.precoPP) : 0,
      descontoFrota: Number.isFinite(persistedPageState.descontoFrota) ? Number(persistedPageState.descontoFrota) : 0,
      prazoMeses: Number.isFinite(persistedPageState.prazoMeses) ? Number(persistedPageState.prazoMeses) : 30,
      dataInicial: persistedPageState.dataInicial || '',
      dataFinal: persistedPageState.dataFinal || '',
      tipoCalculo: persistedPageState.tipoCalculo || 'exponential',
      taxaManualAnual: persistedPageState.taxaManualAnual,
      percentualVendaFipe: Number.isFinite(persistedPageState.percentualVendaFipe) ? Number(persistedPageState.percentualVendaFipe) : 80,
    },
  });

  const mode = form.watch('mode');
  const selectedVehicleKeys = form.watch('selectedVehicles') || [];
  const categoriaVeiculo = form.watch('categoriaVeiculo');
  const codigoFipe = form.watch('codigoFipe');
  const modeloReferencia = form.watch('modeloReferencia');
  const anoModelo = form.watch('anoModelo');
  const precoPP = form.watch('precoPP');
  const descontoFrota = form.watch('descontoFrota');

  const acquisitionValueCalculated = useMemo(() => {
    const pp = Number(precoPP);
    const desconto = Number(descontoFrota);
    if (!pp) return 0;
    if (!desconto) return pp;
    return pp * (1 - desconto / 100);
  }, [precoPP, descontoFrota]);

  const acquisitionValue = acquisitionValueCalculated;

  const prazoMeses = form.watch('prazoMeses');
  const dataInicial = form.watch('dataInicial');
  const dataFinal = form.watch('dataFinal');
  const tipoCalculo = form.watch('tipoCalculo');
  const taxaManualAnual = form.watch('taxaManualAnual');
  const percentualVendaFipe = form.watch('percentualVendaFipe');
  const [vehicleSearch, setVehicleSearch] = useState(() => persistedPageState.vehicleSearch || '');
  const [manualModelFocused, setManualModelFocused] = useState(false);
  const [historySortKey, setHistorySortKey] = useState<'modelo' | 'codigoFipe' | 'anoModelo' | 'mesFipe' | 'date' | 'value' | 'diff'>('date');
  const [historySortDir, setHistorySortDir] = useState<'asc' | 'desc'>('desc');
  const deferredVehicleSearch = useDeferredValue(vehicleSearch);
  const deferredModeloReferencia = useDeferredValue(modeloReferencia);

  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
  const [isFormulasExpanded, setIsFormulasExpanded] = useState(false);
  const [historyView, setHistoryView] = useState<'mensal' | 'anual'>('mensal');

  const selectedVehiclesData = useMemo(() => {
    if (selectedVehicleKeys.length === 0) return [];
    const selectedSet = new Set(selectedVehicleKeys);
    return vehicles.filter((vehicle) => selectedSet.has(vehicle.key));
  }, [vehicles, selectedVehicleKeys]);

  const availableCategories = useMemo(() => {
    return Array.from(new Set(vehicles.map((vehicle) => vehicle.categoria).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = normalizeText(deferredVehicleSearch);
    const selectedCategory = String(categoriaVeiculo || '').trim();

    return vehicles.filter((vehicle) => {
      if (selectedCategory && vehicle.categoria !== selectedCategory) return false;
      if (!normalizedSearch) return true;

      const haystack = normalizeText([
        vehicle.placa,
        vehicle.modelo,
        vehicle.categoria,
        vehicle.codigoFipe,
        vehicle.anoModelo,
      ].join(' '));

      return haystack.includes(normalizedSearch);
    });
  }, [vehicles, deferredVehicleSearch, categoriaVeiculo]);

  const visibleVehicles = useMemo(() => filteredVehicles.slice(0, 250), [filteredVehicles]);

  const updateSelectedVehicles = (keys: string[]) => {
    const deduped = Array.from(new Set(keys));
    form.setValue('selectedVehicles', deduped, { shouldValidate: true, shouldDirty: true });
  };

  const toggleVehicleSelection = (vehicleKey: string) => {
    if (selectedVehicleKeys.includes(vehicleKey)) {
      updateSelectedVehicles(selectedVehicleKeys.filter((key) => key !== vehicleKey));
      return;
    }

    updateSelectedVehicles([...selectedVehicleKeys, vehicleKey]);
  };

  useEffect(() => {
    if (mode !== 'frota') return;
    if (selectedVehiclesData.length === 0) return;

    // No modo frota, valorAquisicao da dim_frota já é o preço com desconto.
    // Preenche como precoPP por ora — usuário pode ajustar manualmente.
    const avgAcquisition = selectedVehiclesData.reduce(
      (sum, v) => sum + v.valorAquisicao, 0
    ) / selectedVehiclesData.length;
    form.setValue('precoPP', Number(avgAcquisition.toFixed(2)), { shouldValidate: true });
    form.setValue('descontoFrota', 0, { shouldValidate: true });

    const dominantModel = pickMostFrequent(selectedVehiclesData.map((vehicle) => vehicle.modelo));
    if (dominantModel) {
      form.setValue('modeloReferencia', dominantModel, { shouldValidate: false, shouldDirty: true });
    }

    const codeYearCounts = new Map<string, number>();
    for (const vehicle of selectedVehiclesData) {
      const key = `${vehicle.codigoFipe}|${vehicle.anoModelo}`;
      codeYearCounts.set(key, (codeYearCounts.get(key) || 0) + 1);
    }

    let dominantCodeYear = '';
    let dominantCount = -1;
    for (const [key, count] of codeYearCounts) {
      if (count > dominantCount) {
        dominantCodeYear = key;
        dominantCount = count;
      }
    }

    const representativeVehicle = selectedVehiclesData.find((vehicle) => `${vehicle.codigoFipe}|${vehicle.anoModelo}` === dominantCodeYear) || selectedVehiclesData[0];

    form.setValue('codigoFipe', representativeVehicle.codigoFipe, { shouldValidate: true });
    form.setValue('anoModelo', representativeVehicle.anoModelo, { shouldValidate: true });

    const acquisitionDates = selectedVehiclesData
      .map((vehicle) => (vehicle.dataAquisicao ? toDate(vehicle.dataAquisicao) : null))
      .filter((date): date is Date => Boolean(date));

    if (acquisitionDates.length > 0) {
      const minDate = new Date(Math.min(...acquisitionDates.map((date) => date.getTime())));
      form.setValue('dataInicial', toDateInputValue(minDate));
    }
  }, [mode, selectedVehiclesData, form]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      persistFipePageState({
        mode,
        selectedVehicles: selectedVehicleKeys,
        categoriaVeiculo: categoriaVeiculo || '',
        codigoFipe: codigoFipe || '',
        modeloReferencia: modeloReferencia || '',
        anoModelo: Number.isFinite(anoModelo) ? anoModelo : new Date().getFullYear(),
        precoPP: Number.isFinite(Number(precoPP)) ? Number(precoPP) : 0,
        descontoFrota: Number.isFinite(Number(descontoFrota)) ? Number(descontoFrota) : 0,
        prazoMeses: Number.isFinite(prazoMeses) ? prazoMeses : 30,
        dataInicial: dataInicial || '',
        dataFinal: dataFinal || '',
        tipoCalculo,
        taxaManualAnual: Number.isFinite(Number(taxaManualAnual)) ? Number(taxaManualAnual) : undefined,
        percentualVendaFipe: Number.isFinite(Number(percentualVendaFipe)) ? Number(percentualVendaFipe) : 80,
        vehicleSearch,
      });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [mode, selectedVehicleKeys, categoriaVeiculo, codigoFipe, modeloReferencia, anoModelo, acquisitionValue, precoPP, prazoMeses, dataInicial, dataFinal, tipoCalculo, taxaManualAnual, percentualVendaFipe, vehicleSearch]);

  const handleClearData = () => {
    form.reset({
      mode: 'frota',
      selectedVehicles: [],
      categoriaVeiculo: '',
      codigoFipe: '',
      modeloReferencia: '',
      anoModelo: new Date().getFullYear(),
      precoPP: 0,
      descontoFrota: 0,
      prazoMeses: 30,
      dataInicial: '',
      dataFinal: '',
      tipoCalculo: 'exponential',
      taxaManualAnual: undefined,
      percentualVendaFipe: 80,
    });
    setVehicleSearch('');
  };

  const groupedFipeSeries = useMemo(() => {
    const modelHints = new Map<string, string>();
    for (const vehicle of vehicles) {
      const key = `${vehicle.codigoFipe}|${vehicle.anoModelo}`;
      if (!modelHints.has(key) && vehicle.modelo) {
        modelHints.set(key, vehicle.modelo);
      }
    }

    const groups = new Map<string, { codigoFipe: string; anoModelo: number; model: string; history: FipeHistoryPoint[] }>();

    for (const row of fipeSeries) {
      const key = `${row.codigoFipe}|${row.anoModelo}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          codigoFipe: row.codigoFipe,
          anoModelo: row.anoModelo,
          model: row.model,
          history: [{ date: row.date, value: row.value, codigoFipe: row.codigoFipe, anoModelo: row.anoModelo, modelo: row.model, mesFipe: row.mesFipe }],
        });
      } else {
        if (!existing.model && row.model) {
          existing.model = row.model;
        }
        existing.history.push({ date: row.date, value: row.value, codigoFipe: row.codigoFipe, anoModelo: row.anoModelo, modelo: row.model, mesFipe: row.mesFipe });
      }
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      model: group.model || modelHints.get(`${group.codigoFipe}|${group.anoModelo}`) || '',
      history: group.history.sort((a, b) => a.date.getTime() - b.date.getTime()),
    }));
  }, [fipeSeries, vehicles]);

  const rawFipeModelOptions = useMemo(() => {
    if (!Array.isArray(fipeRaw)) return [];

    return Array.from(
      new Set(
        fipeRaw
          .map((row) => String(readFirst(row, fipeAliases.modelo) || '').trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [fipeRaw]);

  // Pré-computa lista normalizada UMA VEZ (não a cada digitação)
  const allManualModelOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...groupedFipeSeries.map((group) => group.model.trim()).filter(Boolean),
        ...rawFipeModelOptions,
      ]),
    );
  }, [groupedFipeSeries, rawFipeModelOptions]);

  const normalizedModelIndex = useMemo(() => {
    return allManualModelOptions.map((model) => ({
      model,
      normalized: normalizeText(model),
    }));
  }, [allManualModelOptions]);

  const yearCountByModel = useMemo(() => {
    const map = new Map<string, number>();
    for (const group of groupedFipeSeries) {
      const key = normalizeText(group.model);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [groupedFipeSeries]);

  // Filtro rápido: para apenas quando atinge 8 resultados, sem sort caro
  const manualModelSuggestions = useMemo(() => {
    const query = normalizeText(deferredModeloReferencia);
    if (!query) return [];

    const startsWith: { model: string; normalizedModel: string; yearCount: number }[] = [];
    const contains: { model: string; normalizedModel: string; yearCount: number }[] = [];
    const MAX = 8;

    for (const item of normalizedModelIndex) {
      if (startsWith.length >= MAX) break;
      const idx = item.normalized.indexOf(query);
      if (idx === 0) {
        startsWith.push({
          model: item.model,
          normalizedModel: item.normalized,
          yearCount: yearCountByModel.get(item.normalized) || 0,
        });
      } else if (idx > 0 && contains.length < MAX) {
        contains.push({
          model: item.model,
          normalizedModel: item.normalized,
          yearCount: yearCountByModel.get(item.normalized) || 0,
        });
      }
    }

    return [...startsWith, ...contains].slice(0, MAX);
  }, [normalizedModelIndex, yearCountByModel, deferredModeloReferencia]);

  const manualYearOptions = useMemo(() => {
    const normalizedModelReference = normalizeText(deferredModeloReferencia);
    if (!normalizedModelReference) return [];

    // Preferir match EXATO (modelo escolhido na sugestão).
    // Fallback: modelos que CONTÊM a query (não usar includes reverso, pois "VIRTUS"
    // contido em "VIRTUS TSI" faria seleção do modelo errado).
    const exactMatches = groupedFipeSeries.filter(
      (group) => normalizeText(group.model) === normalizedModelReference
    );
    const yearGroups = exactMatches.length > 0
      ? exactMatches
      : groupedFipeSeries.filter((group) => normalizeText(group.model).includes(normalizedModelReference));

    return Array.from(new Map(yearGroups.map((group) => [group.anoModelo, group])).values()).sort((a, b) => a.anoModelo - b.anoModelo);
  }, [groupedFipeSeries, deferredModeloReferencia]);

  const resolvedFipeMatch = useMemo(() => {
    const normalizedCode = normalizeCode(codigoFipe);
    const targetYear = Number(anoModelo);
    const normalizedModelReference = normalizeText(deferredModeloReferencia);
    if (groupedFipeSeries.length === 0) {
      return { history: [] as FipeHistoryPoint[], matchType: 'none' as const };
    }

    const exact = groupedFipeSeries.find((group) => group.codigoFipe === normalizedCode && group.anoModelo === targetYear);
    const manualMode = mode === 'manual';

    if (manualMode && normalizedModelReference) {
      // Preferir EXATO; cair para "contém a query" só se não houver exato.
      // Nunca usar includes reverso (modeloReferenceIncludes(model)) — isso pega
      // variantes mais curtas (ex.: "VIRTUS" quando o usuário escolheu "VIRTUS TSI").
      const exactGroups = groupedFipeSeries.filter(
        (group) => normalizeText(group.model) === normalizedModelReference
      );
      const matchingModelGroups = exactGroups.length > 0
        ? exactGroups
        : groupedFipeSeries.filter((group) => normalizeText(group.model).includes(normalizedModelReference));
      if (matchingModelGroups.length > 0) {
        if (targetYear <= 0) {
          const mergedHistory = matchingModelGroups
            .flatMap((group) => group.history)
            .sort((a, b) => a.date.getTime() - b.date.getTime());

          const dedupedHistory = mergedHistory.filter((point, index, arr) => {
            const previous = arr[index - 1];
            return !previous || previous.date.getTime() !== point.date.getTime() || previous.codigoFipe !== point.codigoFipe || previous.anoModelo !== point.anoModelo;
          });

          return {
            history: dedupedHistory,
            matchType: 'model-approx' as const,
            matchedCode: '',
            matchedYear: 0,
            matchedModel: matchingModelGroups[0].model,
          };
        }

        const selectedModelGroup = matchingModelGroups.find((group) => group.anoModelo === targetYear) || matchingModelGroups[0];

        return {
          history: selectedModelGroup.history,
          matchType: selectedModelGroup.anoModelo === targetYear ? 'exact' as const : 'model-approx' as const,
          matchedCode: selectedModelGroup.codigoFipe,
          matchedYear: selectedModelGroup.anoModelo,
          matchedModel: selectedModelGroup.model,
        };
      }
    }

    if (exact && (!manualMode || exact.history.length > 1)) {
      return {
        history: exact.history,
        matchType: 'exact' as const,
        matchedCode: exact.codigoFipe,
        matchedYear: exact.anoModelo,
        matchedModel: exact.model,
      };
    }

    if (manualMode && normalizedCode) {
      const sameCodeCandidates = groupedFipeSeries
        .filter((group) => {
          if (group.codigoFipe !== normalizedCode || group.history.length === 0) return false;
          if (exact && group.anoModelo === exact.anoModelo) return false;
          return true;
        })
        .sort((a, b) => {
          const yearDiffA = Math.abs(a.anoModelo - targetYear);
          const yearDiffB = Math.abs(b.anoModelo - targetYear);
          return yearDiffA - yearDiffB;
        });

      if (sameCodeCandidates.length > 0) {
        const best = sameCodeCandidates[0];
        return {
          history: best.history,
          matchType: 'same-code-nearest-year' as const,
          matchedCode: best.codigoFipe,
          matchedYear: best.anoModelo,
          matchedModel: best.model,
        };
      }
    }

    if (exact && exact.history.length > 0) {
      return {
        history: exact.history,
        matchType: 'exact' as const,
        matchedCode: exact.codigoFipe,
        matchedYear: exact.anoModelo,
        matchedModel: exact.model,
      };
    }

    return { history: [] as FipeHistoryPoint[], matchType: 'none' as const };
  }, [groupedFipeSeries, codigoFipe, anoModelo, deferredModeloReferencia, mode]);

  useEffect(() => {
    if (mode !== 'manual') return;
    if (!String(deferredModeloReferencia || '').trim()) return;
    if (!resolvedFipeMatch.matchedCode || !resolvedFipeMatch.matchedYear) return;

    const normalizedCurrentCode = normalizeCode(codigoFipe);
    if (normalizedCurrentCode !== resolvedFipeMatch.matchedCode) {
      form.setValue('codigoFipe', resolvedFipeMatch.matchedCode, { shouldValidate: true });
    }

    if (Number(anoModelo) !== resolvedFipeMatch.matchedYear) {
      form.setValue('anoModelo', resolvedFipeMatch.matchedYear, { shouldValidate: true });
    }
  }, [mode, deferredModeloReferencia, resolvedFipeMatch, codigoFipe, anoModelo, form]);

  const effectiveMonths = useMemo(() => {
    const base = Number.isFinite(prazoMeses) ? Math.max(1, Math.round(prazoMeses)) : 30;

    if (!dataFinal) return base;

    const start = toDate(dataInicial) || new Date();
    const end = toDate(dataFinal);
    if (!end) return base;

    if (end <= start) return base;

    return monthDiff(start, end);
  }, [prazoMeses, dataInicial, dataFinal]);

  const dataInicialDate = useMemo(() => toDate(dataInicial), [dataInicial]);
  const dataFinalDate = useMemo(() => toDate(dataFinal), [dataFinal]);

  const currentFipeHistory = useMemo<FipeHistoryPoint[]>(() => {
    return resolvedFipeMatch.history;
  }, [resolvedFipeMatch]);

  // Anos do contrato — FRAÇÃOANO(dataInicial, dataFinal)
  const projectionYears = useMemo(() => {
    const start = dataInicialDate || new Date();
    const end = dataFinalDate;
    if (end && end > start) return yearFraction(start, end);
    return effectiveMonths / 12;
  }, [dataInicialDate, dataFinalDate, effectiveMonths]);

  const annualFipeHistory = useMemo(() => {
    if (currentFipeHistory.length === 0) return [];

    const sorted = [...currentFipeHistory]
      .filter(p => p && p.date instanceof Date)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    if (sorted.length === 0) return [];
    const referenceMonth = sorted[0].date.getMonth();

    const byYear = new Map<number, FipeHistoryPoint>();
    for (const point of currentFipeHistory) {
      if (point && point.date instanceof Date && point.date.getMonth() === referenceMonth) {
        const year = point.date.getFullYear();
        const existing = byYear.get(year);
        if (!existing || point.date > existing.date) {
          byYear.set(year, point);
        }
      }
    }

    return Array.from(byYear.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [currentFipeHistory]);

  const selectedMethod = (tipoCalculo === 'linear' ? 'linear' : 'exponential') as DepreciationMethod;

  const depreciation = useDepreciation({
    acquisitionValue: acquisitionValueCalculated,
    precoPP: Number(precoPP) || acquisitionValueCalculated,
    months: effectiveMonths,
    method: selectedMethod,
    fipeHistory: annualFipeHistory,
    projectionYears,
    startDate: dataInicialDate,
    endDate: dataFinalDate,
    manualAnnualRate: Number.isFinite(Number(taxaManualAnual))
      ? Number(taxaManualAnual) / 100
      : null,
  });

  const saleFipeFactor = useMemo(() => {
    const value = Number(percentualVendaFipe);
    if (!Number.isFinite(value)) return 0.8;
    return Math.min(1, Math.max(0, value / 100));
  }, [percentualVendaFipe]);

  const estimatedFutureSale = useMemo(() => {
    return depreciation.futureValuePP * saleFipeFactor;
  }, [depreciation.futureValuePP, saleFipeFactor]);

  const displayHistory = useMemo(() => {
    const source = historyView === 'anual' ? annualFipeHistory : currentFipeHistory;

    const withDiff = source.map((point, index, arr) => {
      const prev = index > 0 ? arr[index - 1] : null;
      const diff = prev ? point.value - prev.value : 0;
      const diffPct = prev && prev.value > 0 ? diff / prev.value : 0;
      return {
        date: point.date,
        value: point.value,
        diff,
        diffPct,
        codigoFipe: point.codigoFipe,
        anoModelo: point.anoModelo,
        modelo: point.modelo,
        mesFipe: point.mesFipe,
      };
    });

    return [...withDiff].sort((a, b) => {
      const dir = historySortDir === 'asc' ? 1 : -1;
      switch (historySortKey) {
        case 'date':
          return (a.date.getTime() - b.date.getTime()) * dir;
        case 'value':
          return ((a.value || 0) - (b.value || 0)) * dir;
        case 'diff':
          return ((a.diff || 0) - (b.diff || 0)) * dir;
        case 'anoModelo':
          return (((a.anoModelo as number) || 0) - ((b.anoModelo as number) || 0)) * dir;
        case 'modelo':
          return String(a.modelo || '').localeCompare(String(b.modelo || ''), 'pt-BR') * dir;
        case 'codigoFipe':
          return String(a.codigoFipe || '').localeCompare(String(b.codigoFipe || ''), 'pt-BR', { numeric: true }) * dir;
        case 'mesFipe':
          return String(a.mesFipe || '').localeCompare(String(b.mesFipe || ''), 'pt-BR') * dir;
        default:
          return 0;
      }
    });
  }, [historyView, annualFipeHistory, currentFipeHistory, historySortKey, historySortDir]);

  const chartData = useMemo(() => {
    const historical = (historyView === 'anual' ? annualFipeHistory : []).map(p => {
      const refDate = dataInicialDate || new Date();
      const m = -monthDiff(p.date, refDate);
      return {
        month: m,
        label: p.mesFipe || p.date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        projetado: null,
        historico: p.value,
        fipeReferencia: null,
      };
    });

    const projected = depreciation.timeline.map((p) => ({
      month: p.month,
      label: `Mês ${p.month}`,
      projetado: p.value,
      historico: null,
      fipeReferencia: depreciation.latestFipe,
    }));

    return [...historical, ...projected].sort((a, b) => a.month - b.month);
  }, [depreciation.timeline, depreciation.latestFipe, historyView, annualFipeHistory, dataInicialDate]);



  const isLoading = loadingFrota || loadingFipe;
  const hasDataError = Boolean(errorFrota || errorFipe);


  const chartYMin = useMemo(() => {
    const values = [
      depreciation.futureValueEstimated,
      ...(historyView === 'anual' ? annualFipeHistory.map(p => p.value) : [])
    ].filter(v => Number.isFinite(v) && v > 0);
    if (values.length === 0) return 0;
    return Math.floor(Math.min(...values) * 0.85);
  }, [depreciation.futureValueEstimated, historyView, annualFipeHistory]);

  const chartYMax = useMemo(() => {
    const values = [
      acquisitionValueCalculated,
      ...(historyView === 'anual' ? annualFipeHistory.map(p => p.value) : [])
    ].filter(v => Number.isFinite(v) && v > 0);
    if (values.length === 0) return 100000;
    return Math.ceil(Math.max(...values) * 1.05);
  }, [acquisitionValueCalculated, historyView, annualFipeHistory]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1500px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/analytics" className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              <ArrowLeft size={18} className="text-slate-700" />
            </Link>
            <div className="p-2 rounded-xl bg-blue-100">
              <ChartLine className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Depreciacao FIPE</h1>
              <p className="text-xs text-slate-500">Precificação de depreciação para terceirização de frota</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DataUpdateBadge metadata={frotaMetadata} compact />
            <DataUpdateBadge metadata={fipeMetadata} compact />
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-6 py-6 space-y-6">
        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 text-sm">
            Carregando dimensoes dim_frota e dim_precos_fipe...
          </div>
        )}

        {hasDataError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <div>
              <div className="font-semibold">Falha ao carregar dados para analise.</div>
              <div>{errorFrota || errorFipe}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold text-slate-800">Parametros</h2>
              </div>
              <button
                type="button"
                onClick={handleClearData}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar Dados
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => form.setValue('mode', 'frota')}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${mode === 'frota' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Modo Frota
              </button>
              <button
                type="button"
                onClick={() => form.setValue('mode', 'manual')}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${mode === 'manual' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                Modo Manual
              </button>
            </div>

            {mode === 'frota' && (
              <div className="space-y-3 pb-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">Categoria</label>
                  <select
                    value={categoriaVeiculo || ''}
                    onChange={(e) => form.setValue('categoriaVeiculo', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                  >
                    <option value="">Todas as categorias</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">Pesquisar veiculo</label>
                  <input
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                    placeholder="Placa, modelo, categoria, codigo FIPE..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateSelectedVehicles([...selectedVehicleKeys, ...visibleVehicles.map((vehicle) => vehicle.key)])}
                    className="px-2 py-1.5 rounded border border-slate-200 text-[10px] uppercase font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Selecionar filtrados
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedVehicles([])}
                    className="px-2 py-1.5 rounded border border-slate-200 text-[10px] uppercase font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Limpar
                  </button>
                </div>

                <div className="max-h-52 overflow-auto rounded-lg border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                  {visibleVehicles.length > 0 ? visibleVehicles.map((vehicle) => {
                    const checked = selectedVehicleKeys.includes(vehicle.key);
                    return (
                      <label key={vehicle.key} className="flex items-start gap-2 px-3 py-2 hover:bg-white cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleVehicleSelection(vehicle.key)}
                          className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs text-slate-700 leading-relaxed">
                          <span className="font-bold">{vehicle.placa || 'Sem placa'}</span> - {vehicle.modelo} ({vehicle.anoModelo})
                          <br />
                          <span className="text-slate-500 text-[10px] uppercase tracking-wider">{vehicle.categoria} | FIPE {vehicle.codigoFipe}</span>
                        </span>
                      </label>
                    );
                  }) : (
                    <div className="px-3 py-6 text-xs text-center text-slate-400">Nenhum veiculo encontrado.</div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">Modelo de referencia (aproximacao)</label>
              {mode === 'manual' ? (
                <div className="space-y-2 relative">
                  <input
                    value={modeloReferencia || ''}
                    onChange={(e) => {
                      const nextModel = e.target.value;
                      form.setValue('modeloReferencia', nextModel, { shouldValidate: true });
                    }}
                    onFocus={() => setManualModelFocused(true)}
                    onBlur={() => {
                      window.setTimeout(() => setManualModelFocused(false), 120);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                    placeholder="Digite para pesquisar..."
                  />
                  {manualModelFocused && (deferredModeloReferencia ?? '').trim() && manualModelSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                      {manualModelSuggestions.map((suggestion) => {
                        const normalizedQuery = normalizeText(deferredModeloReferencia ?? '');
                        const normalizedModel = normalizeText(suggestion.model);
                        const matchIndex = normalizedQuery ? normalizedModel.indexOf(normalizedQuery) : -1;
                        const hasMatch = matchIndex >= 0;
                        const before = hasMatch ? suggestion.model.slice(0, matchIndex) : suggestion.model;
                        const matchText = hasMatch ? suggestion.model.slice(matchIndex, matchIndex + normalizedQuery.length) : '';
                        const after = hasMatch ? suggestion.model.slice(matchIndex + normalizedQuery.length) : '';

                        return (
                          <button
                            key={suggestion.model}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              form.setValue('modeloReferencia', suggestion.model, { shouldValidate: true });
                              form.setValue('anoModelo', 0, { shouldValidate: true });
                              form.setValue('codigoFipe', '', { shouldValidate: true });
                              setManualModelFocused(false);
                            }}
                            className="w-full text-left px-4 py-2.5 border-b border-slate-50 last:border-b-0 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 text-sm text-slate-800 truncate">
                                {hasMatch ? (
                                  <>
                                    {before}
                                    <span className="font-bold text-blue-700">{matchText}</span>
                                    {after}
                                  </>
                                ) : (
                                  suggestion.model
                                )}
                              </div>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded whitespace-nowrap uppercase">{suggestion.yearCount} anos</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  value={modeloReferencia || ''}
                  onChange={(e) => form.setValue('modeloReferencia', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50/50"
                  placeholder="Ex: ONIX 1.0 LT FLEX"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">Codigo FIPE (opcional)</label>
              <input
                value={codigoFipe || ''}
                onChange={(e) => form.setValue('codigoFipe', e.target.value, { shouldValidate: true })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                placeholder="Ex: 004433-7"
              />
              {form.formState.errors.codigoFipe && <p className="text-[10px] text-rose-600 mt-1">{form.formState.errors.codigoFipe.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Ano modelo</label>
                {mode === 'manual' ? (
                  <select
                    value={Number(anoModelo) > 0 && manualYearOptions.some((option) => option.anoModelo === Number(anoModelo)) ? Number(anoModelo) : ''}
                    onChange={(e) => {
                      const nextYear = e.target.value ? Number(e.target.value) : 0;
                      const nextGroup = manualYearOptions.find((option) => option.anoModelo === nextYear);

                      form.setValue('anoModelo', nextYear, { shouldValidate: true });
                      if (nextGroup) {
                        form.setValue('codigoFipe', nextGroup.codigoFipe, { shouldValidate: true });
                      } else {
                        form.setValue('codigoFipe', '', { shouldValidate: true });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                    disabled={manualYearOptions.length === 0}
                  >
                    <option value="">Todos</option>
                    {manualYearOptions.map((option) => (
                      <option key={`${option.codigoFipe}-${option.anoModelo}`} value={option.anoModelo}>
                        {option.anoModelo}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={Number.isFinite(anoModelo) ? anoModelo : ''}
                    onChange={(e) => form.setValue('anoModelo', Number(e.target.value), { shouldValidate: true })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                )}
                {form.formState.errors.anoModelo && <p className="text-[10px] text-rose-600 mt-1">{form.formState.errors.anoModelo.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Prazo do contrato (meses)</label>
                <input
                  type="number"
                  value={Number.isFinite(prazoMeses) ? prazoMeses : 30}
                  onChange={(e) => form.setValue('prazoMeses', Number(e.target.value), { shouldValidate: true })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Preço Público 0km (R$)</label>
                <input
                  type="number"
                  value={Number(precoPP) > 0 ? Number(precoPP) : ''}
                  onChange={(e) => form.setValue('precoPP', Number(e.target.value), { shouldValidate: true })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                  placeholder="Ex: 127340"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Desconto de Frota (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={Number(descontoFrota) > 0 ? Number(descontoFrota) : ''}
                  onChange={(e) => form.setValue('descontoFrota', Number(e.target.value), { shouldValidate: true })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                  placeholder="Ex: 21,5"
                />
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Preço de Aquisição Real</label>
                <div className="text-lg font-bold text-slate-700 mt-0.5">{formatBRL(acquisitionValueCalculated)}</div>
                <p className="text-[10px] text-slate-400 mt-1">
                  PP - {Number(descontoFrota).toFixed(1)}% = {formatBRL(acquisitionValueCalculated)}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">Início do contrato</label>
                  <input
                    type="date"
                    value={dataInicial || ''}
                    onChange={(e) => form.setValue('dataInicial', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">Fim do contrato</label>
                  <input
                    type="date"
                    value={dataFinal || ''}
                    onChange={(e) => form.setValue('dataFinal', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">Modelo de calculo</label>
                  <select
                    value={tipoCalculo}
                    onChange={(e) => form.setValue('tipoCalculo', e.target.value as 'exponential' | 'linear')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                  >
                    <option value="exponential">Exponencial</option>
                    <option value="linear">Linear</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">Venda FIPE (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={Number.isFinite(Number(percentualVendaFipe)) ? Number(percentualVendaFipe) : ''}
                    onChange={(e) => form.setValue('percentualVendaFipe', Number(e.target.value), { shouldValidate: true })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                className="w-full flex items-center justify-between text-xs text-slate-500 font-semibold py-2 px-1 hover:text-slate-800 transition"
              >
                <div className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5" />
                  Configurações avançadas
                </div>
                {isAdvancedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isAdvancedExpanded && (
                <div className="pt-2 pb-1">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-medium">Taxa anual manual (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={Number.isFinite(Number(taxaManualAnual)) ? Number(taxaManualAnual) : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        form.setValue('taxaManualAnual', value === '' ? undefined : Number(value));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition"
                      placeholder="Sobrescrever taxa FIPE"
                    />
                  </div>
                </div>
              )}
            </div>

            {selectedVehiclesData.length > 0 && mode === 'frota' && (
              <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="font-semibold text-slate-700">Resumo da selecao</div>
                <div>{selectedVehiclesData.length} veiculo(s) selecionado(s)</div>
                <div>Valor medio de aquisicao: {formatBRL(selectedVehiclesData.reduce((sum, vehicle) => sum + vehicle.valorAquisicao, 0) / selectedVehiclesData.length)}</div>
                <div>Modelo predominante: {pickMostFrequent(selectedVehiclesData.map((vehicle) => vehicle.modelo)) || 'nao identificado'}</div>
                <div>Categoria predominante: {pickMostFrequent(selectedVehiclesData.map((vehicle) => vehicle.categoria)) || 'nao identificada'}</div>
              </div>
            )}

            {mode === 'manual' && resolvedFipeMatch.matchType !== 'exact' && resolvedFipeMatch.matchType !== 'none' && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
                <div className="font-semibold">Serie FIPE por aproximacao</div>
                {resolvedFipeMatch.matchType === 'same-code-nearest-year' && (
                  <div>Codigo FIPE encontrado com ano proximo: {resolvedFipeMatch.matchedCode} / {resolvedFipeMatch.matchedYear}.</div>
                )}
                {resolvedFipeMatch.matchType === 'model-approx' && (
                  <div>Usando o modelo mais proximo: {resolvedFipeMatch.matchedModel || 'modelo nao informado'} ({resolvedFipeMatch.matchedCode} / {resolvedFipeMatch.matchedYear}).</div>
                )}
              </div>
            )}

            {depreciation.reason && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 flex gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{depreciation.reason}</span>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-200 transition group min-h-[140px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <Info className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider leading-tight">Taxa Anual Utilizada</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{formatPct(depreciation.annualRate)}</div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Janela histórica: {depreciation.rateYears.toFixed(2).replace('.', ',')} anos | Contrato: {depreciation.projectionYears.toFixed(2).replace('.', ',')} anos
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-200 transition group min-h-[140px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <Car className="w-4 h-4" />
                    </div>
                    <Info className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider leading-tight">Mercado Futuro (PP)</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{formatBRL(depreciation.futureValuePP)}</div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Sobre preço público após {effectiveMonths}m</div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-200 transition group min-h-[140px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition">
                      <Car className="w-4 h-4" />
                    </div>
                    <Info className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider leading-tight">Mercado Futuro (Aquisição)</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{formatBRL(depreciation.futureValueEstimated)}</div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Sobre custo real após {effectiveMonths}m</div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-200 transition group min-h-[140px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <Info className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider leading-tight">Valor de Venda Estimado</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{formatBRL(estimatedFutureSale)}</div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 truncate">
                  Venda PP × {formatPct(saleFipeFactor)} Venda FIPE
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-200 transition group min-h-[140px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <Info className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider leading-tight">Depreciação Total</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{formatBRL(depreciation.depreciationTotal)}</div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Média mensal de {formatBRL(depreciation.depreciationMonthly)}</div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:border-blue-200 transition group min-h-[140px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <Info className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                  <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider leading-tight">GAP vs FIPE Final</div>
                  <div className={`text-xl font-black mt-1 ${depreciation.gapPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPct(depreciation.gapPercent)}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Diferença nominal de {formatBRL(depreciation.gapValue)}</div>
              </div>
            </div>

            <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-200 flex items-center gap-4 transition hover:scale-[1.01] duration-300">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Info className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Insight Estratégico</div>
                <div className="text-sm font-medium leading-relaxed">{depreciation.insight}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Curva Projetada de Depreciação</h3>
                  <p className="text-xs text-slate-500 mt-1">Visualização da desvalorização mensal com base no modelo {selectedMethod === 'exponential' ? 'Exponencial' : 'Linear'}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                    <span className="text-slate-600 font-medium">Projeção (Aquisição)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-1 border-b-2 border-dashed border-emerald-500" />
                    <span className="text-slate-600 font-medium">Referência FIPE</span>
                  </div>
                  {historyView === 'anual' && (
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-500 bg-white" />
                      <span className="text-slate-600 font-medium">Histórico Real</span>
                    </div>
                  )}
                </div>
              </div>

              {depreciation.timeline.length > 0 ? (
                <div className="h-[380px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        dy={10}
                        tickFormatter={(v) => v < 0 ? `${v}m` : (v === 0 ? 'Ini' : `${v}m`)}
                      />
                      <YAxis
                        domain={[chartYMin, chartYMax]}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const pData = payload.find(p => p.dataKey === 'projetado');
                            const rData = payload.find(p => p.dataKey === 'fipeReferencia');
                            const hData = payload.find(p => p.dataKey === 'historico');

                            const projectedValue = pData ? Number(pData.value) : 0;
                            const referenceValue = rData ? Number(rData.value) : 0;
                            const historicalValue = hData ? Number(hData.value) : 0;

                            const diff = projectedValue - referenceValue;
                            const hasProjection = projectedValue > 0;
                            const hasHistory = historicalValue > 0;

                            const labelText = typeof label === 'number'
                              ? (label < 0 ? `Passado (${Math.abs(label)}m)` : `Mês ${label}`)
                              : label;

                            return (
                              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl space-y-2">
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-1.5 mb-1.5">{labelText}</div>
                                <div className="space-y-1">
                                  {hasHistory && (
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-xs text-amber-600 font-medium">FIPE Real (Histórico):</span>
                                      <span className="text-xs font-bold text-slate-900">{formatBRL(historicalValue)}</span>
                                    </div>
                                  )}
                                  {hasProjection && (
                                    <>
                                      <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-blue-600 font-medium">Valor Projetado:</span>
                                        <span className="text-xs font-bold text-slate-900">{formatBRL(projectedValue)}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-slate-500">Referência FIPE:</span>
                                        <span className="text-xs font-bold text-slate-900">{formatBRL(referenceValue)}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-50">
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Diferença:</span>
                                        <span className={`text-[10px] font-black ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {diff >= 0 ? '+' : ''}{formatBRL(diff)}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="projetado"
                        stroke="#2563eb"
                        strokeWidth={4}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        connectNulls
                      />
                      <Line
                        type="stepAfter"
                        dataKey="fipeReferencia"
                        stroke="#10b981"
                        strokeDasharray="6 6"
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                      {historyView === 'anual' && (
                        <Line
                          type="monotone"
                          dataKey="historico"
                          stroke="#f59e0b"
                          strokeWidth={0}
                          dot={{ r: 4, fill: '#fff', stroke: '#f59e0b', strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 h-[380px] flex items-center justify-center text-sm text-slate-400 italic">
                  Aguardando parâmetros para gerar a curva...
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">Resumo do Cálculo</h3>
                </div>
                <div className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded uppercase tracking-wider">Modelo Excel</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <span className="text-slate-500">Preço Público 0km</span>
                    <span className="font-bold text-slate-900">{formatBRL(Number(precoPP))}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <span className="text-slate-500">FIPE Inicial (base taxa)</span>
                    <span className="font-bold text-slate-900">{formatBRL(depreciation.initialFipe)}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <span className="text-slate-500">FIPE Final (disponível)</span>
                    <span className="font-bold text-slate-900">{formatBRL(depreciation.latestFipe)}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50 bg-blue-50/30 -mx-2 px-2 rounded">
                    <span className="text-blue-700 font-medium">Preço de Aquisição Real</span>
                    <span className="font-bold text-blue-700">{formatBRL(acquisitionValueCalculated)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <span className="text-slate-500">Janela histórica FIPE</span>
                    <span className="font-bold text-slate-900">{depreciation.rateYears.toFixed(2).replace('.', ',')} anos</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <span className="text-slate-500">Prazo do contrato</span>
                    <span className="font-bold text-slate-900">{depreciation.projectionYears.toFixed(2).replace('.', ',')} anos</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                    <span className="text-slate-500">Venda após contrato (PP)</span>
                    <span className="font-bold text-slate-900">{formatBRL(depreciation.futureValuePP)}</span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 bg-emerald-50/30 -mx-2 px-2 rounded">
                    <span className="text-emerald-700 font-medium">Valor de Venda Futuro (Estimado)</span>
                    <span className="font-bold text-emerald-700">{formatBRL(estimatedFutureSale)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormulasExpanded(!isFormulasExpanded)}
                  className="flex items-center gap-2 text-[10px] font-bold text-slate-400 hover:text-slate-700 uppercase tracking-widest transition"
                >
                  {isFormulasExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Ver Fórmulas de Cálculo
                </button>

                {isFormulasExpanded && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                    <div className="space-y-1">
                      <div><span className="font-bold">Taxa Anual:</span> (FIPE_fim / FIPE_ini) ^ (1 / prazo_contrato) - 1</div>
                      <div><span className="font-bold">Venda PP:</span> Preço Público * (1 + taxa) ^ prazo_contrato</div>
                    </div>
                    <div className="space-y-1">
                      <div><span className="font-bold">Venda Custo Real:</span> Aquisição * (1 + taxa) ^ prazo_contrato</div>
                      <div><span className="font-bold">Venda Estimada:</span> Venda PP * %_Venda_FIPE</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">Histórico FIPE</h3>
                </div>

                <div className="flex items-center gap-2">
                  {displayHistory.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => setHistoryView('mensal')}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${historyView === 'mensal'
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                          Mensal
                        </button>
                        <button
                          onClick={() => setHistoryView('anual')}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${historyView === 'anual'
                              ? 'bg-white text-blue-700 shadow-sm'
                              : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                          Anual
                        </button>
                      </div>
                      <div className="relative group">
                        <button
                          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition"
                        >
                          Exportar
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30 overflow-hidden">
                          <button
                            onClick={() => exportFipeHistoryToExcel(displayHistory, form.getValues('codigoFipe') || resolvedFipeMatch.matchedCode || '', form.getValues('anoModelo') || resolvedFipeMatch.matchedYear || new Date().getFullYear())}
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition text-left"
                          >
                            <Download className="w-4 h-4" />
                            Excel (.xlsx)
                          </button>
                          <button
                            className="w-full flex items-center gap-3 px-4 py-3 text-xs text-slate-400 cursor-not-allowed transition text-left border-t border-slate-50"
                          >
                            <MoreVertical className="w-4 h-4" />
                            Copiar Dados
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="max-h-[800px] overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full min-w-[1200px] text-sm border-collapse table-auto">
                  <thead className="bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
                    <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      {([
                        { key: 'modelo', label: 'Modelo', align: 'left', width: '25%' },
                        { key: 'codigoFipe', label: 'Código', align: 'left', width: '10%' },
                        { key: 'anoModelo', label: 'Ano', align: 'left', width: '8%' },
                        { key: 'mesFipe', label: 'Mês Ref.', align: 'left', minWidth: '130px' },
                        { key: 'date', label: 'Data', align: 'left', width: '10%' },
                        { key: 'value', label: 'Valor FIPE', align: 'right', width: '15%' },
                        { key: 'diff', label: 'Variação', align: 'right', width: '15%' },
                      ] as const).map((col) => {
                        const isActive = historySortKey === col.key;
                        return (
                          <th
                            key={col.key}
                            style={{ width: (col as any).width, minWidth: (col as any).minWidth }}
                            className={`px-4 py-4 cursor-pointer select-none hover:text-slate-600 transition ${col.align === 'right' ? 'text-right' : ''}`}
                            onClick={() => {
                              if (historySortKey === col.key) {
                                setHistorySortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                              } else {
                                setHistorySortKey(col.key);
                                setHistorySortDir('desc');
                              }
                            }}
                          >
                            <span className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end w-full' : ''}`}>
                              {col.label}
                              {isActive ? (
                                historySortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-30" />
                              )}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {displayHistory.length > 0 ? (() => {
                      let firstTs = Infinity;
                      for (const r of displayHistory) firstTs = Math.min(firstTs, r.date.getTime());
                      return displayHistory.map((row, idx) => {
                        const isFirst = row.date.getTime() === firstTs;
                        const isRateReference =
                          (depreciation.initialDate && row.date.getTime() === depreciation.initialDate.getTime()) ||
                          (depreciation.latestDate && row.date.getTime() === depreciation.latestDate.getTime());

                        return (
                          <tr key={`${row.date.toISOString()}-${idx}`} className={`hover:bg-slate-50 transition group ${isRateReference ? 'bg-amber-50/50' : ''}`}>
                            <td className="px-4 py-3.5 text-slate-600 min-w-0 max-w-[200px] relative">
                              {isRateReference && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
                              <div className="truncate font-medium group-hover:text-slate-900 transition" title={row.modelo || ''}>
                                {row.modelo || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">{row.codigoFipe || '-'}</td>
                            <td className="px-4 py-3.5 text-slate-600">{row.anoModelo || '-'}</td>
                            <td className="px-4 py-3.5 text-slate-600 italic text-[11px]">{row.mesFipe || '-'}</td>
                            <td className="px-4 py-3.5 text-slate-600">
                              <div className="flex items-center gap-2">
                                <span>{row.date.toLocaleDateString('pt-BR')}</span>
                                {isRateReference && <span className="text-[9px] font-black uppercase bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded leading-none">Taxa</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-900 text-right">{formatBRL(row.value)}</td>
                            <td className={`px-4 py-3.5 font-bold text-right text-[11px] ${row.diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {isFirst ? '-' : (
                                <div className="flex flex-col items-end">
                                  <span>{row.diff >= 0 ? '+' : ''}{formatBRL(row.diff)} ({formatPct(row.diffPct)})</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })() : (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-slate-400 italic">
                          Aguardando dados de modelo/ano para exibir histórico...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
