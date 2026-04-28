import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  Car,
  ChartLine,
  Download,
  TrendingDown,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
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
  valorAquisicao: z.coerce.number().min(0, 'Informe um valor de aquisicao valido.'),
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
      valorAquisicao: Number.isFinite(Number(parsed.valorAquisicao)) ? Number(parsed.valorAquisicao) : 0,
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

function formatDateBR(value: Date | null): string {
  if (!value) return '-';
  return value.toLocaleDateString('pt-BR');
}

function findNearestPoint(points: FipeHistoryPoint[], target: Date): FipeHistoryPoint | null {
  if (points.length === 0) return null;

  let nearest = points[0];
  let nearestDistance = Math.abs(points[0].date.getTime() - target.getTime());

  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    const distance = Math.abs(point.date.getTime() - target.getTime());
    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2).replace('.', ',')}%`;
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

function monthDiff(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const total = years * 12 + months;
  return Math.max(1, total);
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
      valorAquisicao: Number.isFinite(persistedPageState.valorAquisicao) ? Number(persistedPageState.valorAquisicao) : 0,
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
  const valorAquisicao = form.watch('valorAquisicao');
  const prazoMeses = form.watch('prazoMeses');
  const dataInicial = form.watch('dataInicial');
  const dataFinal = form.watch('dataFinal');
  const tipoCalculo = form.watch('tipoCalculo');
  const taxaManualAnual = form.watch('taxaManualAnual');
  const percentualVendaFipe = form.watch('percentualVendaFipe');
  const [vehicleSearch, setVehicleSearch] = useState(() => persistedPageState.vehicleSearch || '');
  const [manualModelFocused, setManualModelFocused] = useState(false);
  const deferredVehicleSearch = useDeferredValue(vehicleSearch);
  const deferredModeloReferencia = useDeferredValue(modeloReferencia);

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

    const avgAcquisition = selectedVehiclesData.reduce((sum, vehicle) => sum + vehicle.valorAquisicao, 0) / selectedVehiclesData.length;
    form.setValue('valorAquisicao', Number(avgAcquisition.toFixed(2)), { shouldValidate: true });

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
        valorAquisicao: Number.isFinite(valorAquisicao) ? valorAquisicao : 0,
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
  }, [mode, selectedVehicleKeys, categoriaVeiculo, codigoFipe, modeloReferencia, anoModelo, valorAquisicao, prazoMeses, dataInicial, dataFinal, tipoCalculo, taxaManualAnual, percentualVendaFipe, vehicleSearch]);

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

  const effectiveYears = useMemo(() => effectiveMonths / 12, [effectiveMonths]);

  const dataInicialDate = useMemo(() => toDate(dataInicial), [dataInicial]);
  const dataFinalDate = useMemo(() => toDate(dataFinal), [dataFinal]);

  const currentFipeHistory = useMemo<FipeHistoryPoint[]>(() => {
    return resolvedFipeMatch.history;
  }, [resolvedFipeMatch]);

  const rateFipeHistory = useMemo<FipeHistoryPoint[]>(() => {
    if (currentFipeHistory.length === 0) return [];

    const firstPoint = currentFipeHistory[0];
    const lastPoint = currentFipeHistory[currentFipeHistory.length - 1];

    const startTarget = dataInicialDate || firstPoint.date;
    const endTarget = dataFinalDate || lastPoint.date;

    const nearestStart = findNearestPoint(currentFipeHistory, startTarget) || firstPoint;
    const nearestEnd = findNearestPoint(currentFipeHistory, endTarget) || lastPoint;

    const ordered = [nearestStart, nearestEnd].sort((a, b) => a.date.getTime() - b.date.getTime());
    if (ordered[0].date.getTime() === ordered[1].date.getTime()) {
      return [ordered[0]];
    }

    return ordered;
  }, [currentFipeHistory, dataInicialDate, dataFinalDate]);

  const rateReferenceSet = useMemo(() => {
    return new Set(rateFipeHistory.map((point) => point.date.getTime()));
  }, [rateFipeHistory]);

  const selectedMethod = (tipoCalculo === 'linear' ? 'linear' : 'exponential') as DepreciationMethod;

  const acquisitionValue = Number(valorAquisicao) || 0;

  const depreciation = useDepreciation({
    acquisitionValue,
    months: effectiveMonths,
    method: selectedMethod,
    fipeHistory: rateFipeHistory,
    rateYears: effectiveYears,
    manualAnnualRate: Number.isFinite(Number(taxaManualAnual)) ? Number(taxaManualAnual) / 100 : null,
  });

  const saleFipeFactor = useMemo(() => {
    const value = Number(percentualVendaFipe);
    if (!Number.isFinite(value)) return 0.8;
    return Math.min(1, Math.max(0, value / 100));
  }, [percentualVendaFipe]);

  const estimatedFutureSale = useMemo(() => {
    return depreciation.futureValue * saleFipeFactor;
  }, [depreciation.futureValue, saleFipeFactor]);

  const historyWithVariation = useMemo(() => {
    return currentFipeHistory
      .map((point, index, arr) => {
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
      })
      .reverse();
  }, [currentFipeHistory]);

  const chartData = useMemo(() => {
    return depreciation.timeline.map((p) => ({
      month: p.month,
      projetado: p.value,
      fipeReferencia: depreciation.latestFipe,
    }));
  }, [depreciation.timeline, depreciation.latestFipe]);

  const detectedFrotaColumns = useMemo(() => {
    if (!Array.isArray(frotaRaw) || frotaRaw.length === 0) return null;
    const sample = frotaRaw[0] as AnyRecord;

    return {
      id: frotaAliases.id.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      codigoFipe: frotaAliases.codigoFipe.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      anoModelo: frotaAliases.anoModelo.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      categoria: frotaAliases.categoria.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      valorAquisicao: frotaAliases.valorAquisicao.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      dataAquisicao: frotaAliases.dataAquisicao.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
    };
  }, [frotaRaw]);

  const detectedFipeColumns = useMemo(() => {
    if (!Array.isArray(fipeRaw) || fipeRaw.length === 0) return null;
    const sample = fipeRaw[0] as AnyRecord;

    return {
      codigoFipe: fipeAliases.codigoFipe.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      anoModelo: fipeAliases.anoModelo.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      modelo: fipeAliases.modelo.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      data: fipeAliases.data.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      valor: fipeAliases.valor.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
    };
  }, [fipeRaw]);

  const isLoading = loadingFrota || loadingFipe;
  const hasDataError = Boolean(errorFrota || errorFipe);

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
              <h1 className="text-xl font-bold text-slate-900">Depreciacao FIPE</h1>
              <p className="text-xs text-slate-500">Projecao de valor futuro com base no historico FIPE e taxa anual</p>
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
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-slate-800">Parametros</h2>
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
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-medium">Categoria</label>
                  <select
                    value={categoriaVeiculo || ''}
                    onChange={(e) => form.setValue('categoriaVeiculo', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    placeholder="Placa, modelo, categoria, codigo FIPE..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateSelectedVehicles([...selectedVehicleKeys, ...visibleVehicles.map((vehicle) => vehicle.key)])}
                    className="px-2 py-1.5 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Selecionar filtrados
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedVehicles([])}
                    className="px-2 py-1.5 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Limpar
                  </button>
                </div>

                <div className="max-h-52 overflow-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {visibleVehicles.length > 0 ? visibleVehicles.map((vehicle) => {
                    const checked = selectedVehicleKeys.includes(vehicle.key);
                    return (
                      <label key={vehicle.key} className="flex items-start gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleVehicleSelection(vehicle.key)}
                          className="mt-0.5"
                        />
                        <span className="text-xs text-slate-700 leading-5">
                          <strong>{vehicle.placa || 'Sem placa'}</strong> - {vehicle.modelo} ({vehicle.anoModelo})
                          <br />
                          <span className="text-slate-500">{vehicle.categoria} | FIPE {vehicle.codigoFipe}</span>
                        </span>
                      </label>
                    );
                  }) : (
                    <div className="px-3 py-4 text-xs text-center text-slate-500">Nenhum veiculo encontrado para os filtros.</div>
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  {selectedVehicleKeys.length} veiculo(s) selecionado(s)
                  {filteredVehicles.length > visibleVehicles.length ? ` | exibindo os primeiros ${visibleVehicles.length} de ${filteredVehicles.length}` : ''}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">Codigo FIPE {mode === 'manual' ? '(opcional)' : ''}</label>
              <input
                value={codigoFipe || ''}
                onChange={(e) => form.setValue('codigoFipe', e.target.value, { shouldValidate: true })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                placeholder="Ex: 0044821"
              />
              {form.formState.errors.codigoFipe && <p className="text-xs text-red-600">{form.formState.errors.codigoFipe.message}</p>}
            </div>

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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    placeholder="Digite para pesquisar o modelo do banco"
                  />
                  {manualModelFocused && (deferredModeloReferencia ?? '').trim() && manualModelSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
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
                            className="w-full text-left px-3 py-2 border-b border-slate-100 last:border-b-0 hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 text-sm text-slate-800 truncate">
                                {hasMatch ? (
                                  <>
                                    {before}
                                    <span className="rounded bg-yellow-100 px-0.5 text-slate-900">{matchText}</span>
                                    {after}
                                  </>
                                ) : (
                                  suggestion.model
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 whitespace-nowrap">{suggestion.yearCount} ano(s)</span>
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  placeholder="Ex: ONIX 1.0 LT FLEX"
                />
              )}
              <p className="text-[11px] text-slate-500">
                {mode === 'manual'
                  ? 'Ao selecionar o modelo, o historico FIPE completo e aberto automaticamente.'
                  : 'No modo manual, quando nao houver serie exata, o sistema busca o modelo/ano mais proximo.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    disabled={manualYearOptions.length === 0}
                  >
                    <option value="">Todos os anos</option>
                    {manualYearOptions.map((option) => (
                      <option key={`${option.codigoFipe}-${option.anoModelo}`} value={option.anoModelo}>
                        Ano modelo {option.anoModelo}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={Number.isFinite(anoModelo) ? anoModelo : ''}
                    onChange={(e) => form.setValue('anoModelo', Number(e.target.value), { shouldValidate: true })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                )}
                {form.formState.errors.anoModelo && <p className="text-xs text-red-600">{form.formState.errors.anoModelo.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Prazo (meses)</label>
                <input
                  type="number"
                  value={Number.isFinite(prazoMeses) ? prazoMeses : 30}
                  onChange={(e) => form.setValue('prazoMeses', Number(e.target.value), { shouldValidate: true })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                {form.formState.errors.prazoMeses && <p className="text-xs text-red-600">{form.formState.errors.prazoMeses.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">Valor base da projecao (R$)</label>
              <input
                type="number"
                value={Number.isFinite(valorAquisicao) ? valorAquisicao : ''}
                onChange={(e) => form.setValue('valorAquisicao', Number(e.target.value), { shouldValidate: true })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              {form.formState.errors.valorAquisicao && <p className="text-xs text-red-600">{form.formState.errors.valorAquisicao.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Data inicial (opcional)</label>
                <input
                  type="date"
                  value={dataInicial || ''}
                  onChange={(e) => form.setValue('dataInicial', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Data final (opcional)</label>
                <input
                  type="date"
                  value={dataFinal || ''}
                  onChange={(e) => form.setValue('dataFinal', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Modelo de calculo</label>
                <select
                  value={tipoCalculo}
                  onChange={(e) => form.setValue('tipoCalculo', e.target.value as 'exponential' | 'linear')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  <option value="exponential">Exponencial (padrao)</option>
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                {form.formState.errors.percentualVendaFipe && <p className="text-xs text-red-600">{form.formState.errors.percentualVendaFipe.message}</p>}
              </div>
            </div>

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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                placeholder="Use quando houver poucos dados FIPE"
              />
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
              Prazo efetivo: <span className="font-semibold text-slate-700">{effectiveMonths} meses</span>
              {dataFinal ? ' (calculado entre a data inicial de referencia e a data final)' : ''}
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

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                <h3 className="font-semibold text-slate-800">Cenario automatizado (modelo Excel)</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Valor FIPE inicial (taxa)</span>
                  <span className="font-semibold text-slate-800">{formatBRL(depreciation.initialFipe)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Valor FIPE final (taxa)</span>
                  <span className="font-semibold text-slate-800">{formatBRL(depreciation.latestFipe)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Data inicial da projecao</span>
                  <span className="font-semibold text-slate-800">{dataInicialDate ? formatDateBR(dataInicialDate) : 'Hoje'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Data final da projecao</span>
                  <span className="font-semibold text-slate-800">{dataFinalDate ? formatDateBR(dataFinalDate) : `${effectiveMonths} meses (prazo)`}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Em anos</span>
                  <span className="font-semibold text-slate-800">{effectiveYears.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Depreciacao anual</span>
                  <span className="font-semibold text-slate-800">{formatPct(depreciation.annualRate)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Valor futuro (base)</span>
                  <span className="font-semibold text-slate-800">{formatBRL(depreciation.futureValue)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Venda FIPE</span>
                  <span className="font-semibold text-slate-800">{formatPct(saleFipeFactor)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Valor de venda futuro (estimado)</span>
                  <span className="font-semibold text-slate-800">{formatBRL(estimatedFutureSale)}</span>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
                <div>Taxa = (Valor final / Valor inicial) ^ (1 / anos) - 1</div>
                <div>Valor futuro = Base * (1 + taxa) ^ tempo</div>
                <div>Venda futura = Valor futuro * Venda FIPE</div>
              </div>

              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <div className="font-semibold mb-1">Insight automatico</div>
                <div>{depreciation.insight}</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Taxa anual utilizada</div>
                <div className="text-2xl font-bold text-slate-800">{formatPct(depreciation.annualRate)}</div>
                <div className="text-xs text-slate-500">Fonte: {depreciation.annualRateSource === 'fipe' ? 'Historico FIPE' : 'Manual'}</div>
                <div className="text-xs text-slate-500">Preco publico base: {formatBRL(acquisitionValue)} | 0km-Fipe</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Valor projetado</div>
                <div className="text-2xl font-bold text-slate-800">{formatBRL(depreciation.futureValue)}</div>
                <div className="text-xs text-slate-500">Tempo: {effectiveYears.toFixed(2).replace('.', ',')} anos</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Venda futura estimada</div>
                <div className="text-2xl font-bold text-slate-800">{formatBRL(estimatedFutureSale)}</div>
                <div className="text-xs text-slate-500">Venda FIPE: {formatPct(saleFipeFactor)}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Depreciacao total</div>
                <div className="text-2xl font-bold text-slate-800">{formatBRL(depreciation.depreciationTotal)}</div>
                <div className="text-xs text-slate-500">Mensal: {formatBRL(depreciation.depreciationMonthly)}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Gap vs FIPE final</div>
                <div className={`text-2xl font-bold ${depreciation.gapPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatPct(depreciation.gapPercent)}
                </div>
                <div className="text-xs text-slate-500">{formatBRL(depreciation.gapValue)}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800">Curva projetada de depreciacao</h3>
                  <p className="text-xs text-slate-500">Taxa = (FIPE final / FIPE inicial)^(1/anos) - 1 | Valor futuro = Base * (1 + taxa)^tempo</p>
                </div>
                <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  Metodo: {selectedMethod === 'exponential' ? 'Exponencial' : 'Linear'}
                </div>
              </div>

              {depreciation.timeline.length > 0 ? (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 12, left: 6, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => formatBRL(Number(v)).replace('R$ ', 'R$ ')} tick={{ fontSize: 12 }} width={100} />
                      <Tooltip formatter={(value: number) => formatBRL(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="projetado" name="Valor projetado" stroke="#2563eb" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="fipeReferencia" name="FIPE final de referencia" stroke="#16a34a" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  Sem dados suficientes para plotar a curva. Ajuste os parametros ou informe taxa manual.
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-slate-800">Historico FIPE completo</h3>
                  </div>
                  {historyWithVariation.length > 0 && (
                    <button
                      onClick={() => exportFipeHistoryToExcel(historyWithVariation, form.getValues('codigoFipe') || resolvedFipeMatch.matchedCode || '', form.getValues('anoModelo') || resolvedFipeMatch.matchedYear || new Date().getFullYear())}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Exportar histórico FIPE para Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Excel</span>
                    </button>
                  )}
                </div>

                <div className="max-h-[560px] overflow-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full min-w-[1100px] text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-left text-slate-600 border-b border-slate-200">
                        <th className="px-2 py-2 font-semibold">Modelo</th>
                        <th className="px-2 py-2 font-semibold">Codigo FIPE</th>
                        <th className="px-2 py-2 font-semibold">Ano</th>
                        <th className="px-2 py-2 font-semibold">Mes FIPE</th>
                        <th className="px-2 py-2 font-semibold">Data</th>
                        <th className="px-2 py-2 font-semibold text-right">Valor</th>
                        <th className="px-2 py-2 font-semibold text-right">Variacao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyWithVariation.length > 0 ? historyWithVariation.map((row, idx) => {
                        const isRateReference = rateReferenceSet.has(row.date.getTime());

                        return (
                          <tr key={`${row.date.toISOString()}-${idx}`} className={`border-t border-slate-100 ${isRateReference ? 'bg-amber-50/70 font-semibold' : ''}`}>
                            <td className="px-2 py-2 text-slate-700 whitespace-nowrap">{row.modelo || '-'}</td>
                            <td className="px-2 py-2 text-slate-700 whitespace-nowrap">{row.codigoFipe || '-'}</td>
                            <td className="px-2 py-2 text-slate-700 whitespace-nowrap">{row.anoModelo || '-'}</td>
                            <td className="px-2 py-2 text-slate-700 whitespace-nowrap">{row.mesFipe || '-'}</td>
                            <td className="px-2 py-2 text-slate-700 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <span>{row.date.toLocaleDateString('pt-BR')}</span>
                                {isRateReference && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">base taxa</span>}
                              </div>
                            </td>
                            <td className="px-2 py-2 font-medium text-slate-800 text-right whitespace-nowrap">{formatBRL(row.value)}</td>
                            <td className={`px-2 py-2 font-medium text-right whitespace-nowrap ${row.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {idx === historyWithVariation.length - 1 ? '-' : `${formatBRL(row.diff)} (${formatPct(row.diffPct)})`}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={7} className="px-2 py-4 text-center text-slate-500">
                            Sem pontos FIPE para o codigo/ano informado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
        </div>

            </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-800 mb-2">Verificacao de colunas (dim_frota)</div>
            {detectedFrotaColumns ? (
              <ul className="text-xs text-slate-600 space-y-1">
                <li>id: {detectedFrotaColumns.id}</li>
                <li>codigo FIPE: {detectedFrotaColumns.codigoFipe}</li>
                <li>ano modelo: {detectedFrotaColumns.anoModelo}</li>
                <li>categoria: {detectedFrotaColumns.categoria}</li>
                <li>valor aquisicao: {detectedFrotaColumns.valorAquisicao}</li>
                <li>data aquisicao: {detectedFrotaColumns.dataAquisicao}</li>
              </ul>
            ) : (
              <div className="text-xs text-slate-500">Nao foi possivel detectar colunas nesta carga.</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-800 mb-2">Verificacao de colunas (dim_precos_fipe)</div>
            {detectedFipeColumns ? (
              <ul className="text-xs text-slate-600 space-y-1">
                <li>codigo FIPE: {detectedFipeColumns.codigoFipe}</li>
                <li>ano modelo: {detectedFipeColumns.anoModelo}</li>
                <li>modelo: {detectedFipeColumns.modelo}</li>
                <li>data referencia: {detectedFipeColumns.data}</li>
                <li>valor FIPE: {detectedFipeColumns.valor}</li>
              </ul>
            ) : (
              <div className="text-xs text-slate-500">Nao foi possivel detectar colunas nesta carga.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
