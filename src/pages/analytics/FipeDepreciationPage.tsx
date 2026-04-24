import { useEffect, useMemo } from 'react';
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

import useBIData from '@/hooks/useBIData';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { useDepreciation, type DepreciationMethod, type FipeHistoryPoint } from '@/hooks/useDepreciation';


type AnyRecord = Record<string, unknown>;

const schema = z.object({
  mode: z.enum(['frota', 'manual']),
  selectedVehicle: z.string().optional(),
  codigoFipe: z.string().min(1, 'Informe o codigo FIPE.'),
  anoModelo: z.coerce.number().int().min(1980, 'Ano invalido.').max(2100, 'Ano invalido.'),
  valorAquisicao: z.coerce.number().positive('Informe um valor de aquisicao valido.'),
  prazoMeses: z.coerce.number().int().min(1, 'Prazo minimo de 1 mes.').max(120, 'Prazo maximo de 120 meses.'),
  dataFinal: z.string().optional(),
  tipoCalculo: z.enum(['exponential', 'linear']),
  taxaManualAnual: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

interface FrotaVehicle {
  key: string;
  id: string;
  codigoFipe: string;
  anoModelo: number;
  modelo: string;
  placa: string;
  valorAquisicao: number;
  dataAquisicao?: string;
}

interface FipeRow {
  codigoFipe: string;
  anoModelo: number;
  date: Date;
  value: number;
}

const frotaAliases = {
  id: ['IdVeiculo', 'id_veiculo', 'idVeiculo', 'id', 'ID'],
  codigoFipe: ['codigo_fipe', 'CodigoFIPE', 'CodigoFipe', 'fipe_codigo'],
  anoModelo: ['AnoModelo', 'ano_modelo', 'anoModelo', 'ano'],
  modelo: ['Modelo', 'modelo', 'DescricaoModelo', 'descricao_modelo'],
  placa: ['Placa', 'placa'],
  valorAquisicao: ['ValorCompra', 'valor_compra', 'valorCompra', 'valor_aquisicao', 'ValorAquisicao'],
  dataAquisicao: ['DataCompra', 'data_compra', 'dataCompra', 'DataAquisicao', 'data_aquisicao'],
};

const fipeAliases = {
  codigoFipe: ['codigo_fipe', 'CodigoFIPE', 'CodigoFipe', 'codigofipe'],
  anoModelo: ['ano_modelo', 'AnoModelo', 'anoModelo', 'ano'],
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
  const cleaned = String(value ?? '').replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
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
  } = useBIData<AnyRecord[]>('dim_precos_fipe', { staleTime: 10 * 60 * 1000 });

  const vehicles = useMemo<FrotaVehicle[]>(() => {
    if (!Array.isArray(frotaRaw)) return [];

    const mapped = frotaRaw
      .map((row) => {
        const id = String(readFirst(row, frotaAliases.id) || '').trim();
        const codigoFipe = normalizeCode(readFirst(row, frotaAliases.codigoFipe));
        const anoModelo = Math.trunc(toNumber(readFirst(row, frotaAliases.anoModelo)));
        const modelo = String(readFirst(row, frotaAliases.modelo) || '').trim();
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
        const date = toDate(readFirst(row, fipeAliases.data));
        const value = toNumber(readFirst(row, fipeAliases.valor));

        if (!codigoFipe || !anoModelo || !date || value <= 0) return null;

        return {
          codigoFipe,
          anoModelo,
          date,
          value,
        };
      })
      .filter(Boolean) as FipeRow[];
  }, [fipeRaw]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: 'frota',
      selectedVehicle: '',
      codigoFipe: '',
      anoModelo: new Date().getFullYear(),
      valorAquisicao: 0,
      prazoMeses: 30,
      dataFinal: '',
      tipoCalculo: 'exponential',
      taxaManualAnual: undefined,
    },
  });

  const mode = form.watch('mode');
  const selectedVehicle = form.watch('selectedVehicle');
  const codigoFipe = form.watch('codigoFipe');
  const anoModelo = form.watch('anoModelo');
  const valorAquisicao = form.watch('valorAquisicao');
  const prazoMeses = form.watch('prazoMeses');
  const dataFinal = form.watch('dataFinal');
  const tipoCalculo = form.watch('tipoCalculo');
  const taxaManualAnual = form.watch('taxaManualAnual');

  useEffect(() => {
    if (mode !== 'frota') return;

    const vehicle = vehicles.find((v) => v.key === selectedVehicle);
    if (!vehicle) return;

    form.setValue('codigoFipe', vehicle.codigoFipe, { shouldValidate: true });
    form.setValue('anoModelo', vehicle.anoModelo, { shouldValidate: true });
    form.setValue('valorAquisicao', vehicle.valorAquisicao, { shouldValidate: true });
  }, [mode, selectedVehicle, vehicles, form]);

  const effectiveMonths = useMemo(() => {
    const base = Number.isFinite(prazoMeses) ? Math.max(1, Math.round(prazoMeses)) : 30;

    if (!dataFinal) return base;

    const end = toDate(dataFinal);
    if (!end) return base;

    const now = new Date();
    if (end <= now) return base;

    return monthDiff(now, end);
  }, [prazoMeses, dataFinal]);

  const currentFipeHistory = useMemo<FipeHistoryPoint[]>(() => {
    const normalizedCode = normalizeCode(codigoFipe);
    if (!normalizedCode || !anoModelo) return [];

    return fipeSeries
      .filter((row) => row.codigoFipe === normalizedCode && row.anoModelo === Number(anoModelo))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((row) => ({ date: row.date, value: row.value }));
  }, [fipeSeries, codigoFipe, anoModelo]);

  const selectedMethod = (tipoCalculo === 'linear' ? 'linear' : 'exponential') as DepreciationMethod;

  const depreciation = useDepreciation({
    acquisitionValue: Number(valorAquisicao) || 0,
    months: effectiveMonths,
    method: selectedMethod,
    fipeHistory: currentFipeHistory,
    manualAnnualRate: Number.isFinite(Number(taxaManualAnual)) ? Number(taxaManualAnual) / 100 : null,
  });

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
        };
      })
      .reverse();
  }, [currentFipeHistory]);

  const chartData = useMemo(() => {
    return depreciation.timeline.map((p) => ({
      month: p.month,
      projetado: p.value,
      fipeAtual: depreciation.latestFipe,
    }));
  }, [depreciation.timeline, depreciation.latestFipe]);

  const selectedVehicleData = useMemo(() => {
    return vehicles.find((v) => v.key === selectedVehicle);
  }, [vehicles, selectedVehicle]);

  const detectedFrotaColumns = useMemo(() => {
    if (!Array.isArray(frotaRaw) || frotaRaw.length === 0) return null;
    const sample = frotaRaw[0] as AnyRecord;

    return {
      id: frotaAliases.id.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      codigoFipe: frotaAliases.codigoFipe.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
      anoModelo: frotaAliases.anoModelo.find((k) => Object.prototype.hasOwnProperty.call(sample, k)) || 'nao encontrado',
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
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Veiculo da frota</label>
                <select
                  value={selectedVehicle || ''}
                  onChange={(e) => form.setValue('selectedVehicle', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  <option value="">Selecione um veiculo</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.key} value={vehicle.key}>
                      {vehicle.placa ? `${vehicle.placa} - ` : ''}{vehicle.modelo} ({vehicle.anoModelo})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-slate-600 font-medium">Codigo FIPE</label>
              <input
                value={codigoFipe || ''}
                onChange={(e) => form.setValue('codigoFipe', e.target.value, { shouldValidate: true })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                placeholder="Ex: 0044821"
              />
              {form.formState.errors.codigoFipe && <p className="text-xs text-red-600">{form.formState.errors.codigoFipe.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-600 font-medium">Ano modelo</label>
                <input
                  type="number"
                  value={Number.isFinite(anoModelo) ? anoModelo : ''}
                  onChange={(e) => form.setValue('anoModelo', Number(e.target.value), { shouldValidate: true })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
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
              <label className="text-xs text-slate-600 font-medium">Valor de aquisicao (R$)</label>
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
                <label className="text-xs text-slate-600 font-medium">Data final (opcional)</label>
                <input
                  type="date"
                  value={dataFinal || ''}
                  onChange={(e) => form.setValue('dataFinal', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
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
              {dataFinal ? ' (calculado com base na data final)' : ''}
            </div>

            {selectedVehicleData && mode === 'frota' && (
              <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="font-semibold text-slate-700">Veiculo selecionado</div>
                <div>{selectedVehicleData.modelo}</div>
                <div>Placa: {selectedVehicleData.placa || 'nao informada'}</div>
                <div>Valor aquisicao: {formatBRL(selectedVehicleData.valorAquisicao)}</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Taxa anual utilizada</div>
                <div className="text-2xl font-bold text-slate-800">{formatPct(depreciation.annualRate)}</div>
                <div className="text-xs text-slate-500">Fonte: {depreciation.annualRateSource === 'fipe' ? 'Historico FIPE' : 'Manual'}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Valor projetado</div>
                <div className="text-2xl font-bold text-slate-800">{formatBRL(depreciation.futureValue)}</div>
                <div className="text-xs text-slate-500">Horizonte: {effectiveMonths} meses</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Depreciacao total</div>
                <div className="text-2xl font-bold text-slate-800">{formatBRL(depreciation.depreciationTotal)}</div>
                <div className="text-xs text-slate-500">Mensal: {formatBRL(depreciation.depreciationMonthly)}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs uppercase text-slate-500 font-semibold">Gap vs FIPE atual</div>
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
                  <p className="text-xs text-slate-500">Formula exponencial: Valor futuro = Valor aquisicao * (1 + taxa anual)^(meses/12)</p>
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
                      <Line type="monotone" dataKey="fipeAtual" name="FIPE atual" stroke="#16a34a" strokeDasharray="5 4" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  Sem dados suficientes para plotar a curva. Ajuste os parametros ou informe taxa manual.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <h3 className="font-semibold text-slate-800">Comparativo de valor</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">FIPE atual</span>
                    <span className="font-semibold text-slate-800">{formatBRL(depreciation.latestFipe)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Valor projetado</span>
                    <span className="font-semibold text-slate-800">{formatBRL(depreciation.futureValue)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Gap absoluto</span>
                    <span className={`font-semibold ${depreciation.gapValue >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatBRL(depreciation.gapValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Gap percentual</span>
                    <span className={`font-semibold ${depreciation.gapPercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatPct(depreciation.gapPercent)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  <div className="font-semibold mb-1">Insight automatico</div>
                  <div>{depreciation.insight}</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Car className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-slate-800">Historico FIPE utilizado</h3>
                </div>

                <div className="max-h-[320px] overflow-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-left text-slate-600">
                        <th className="px-3 py-2">Data</th>
                        <th className="px-3 py-2">Valor</th>
                        <th className="px-3 py-2">Variacao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyWithVariation.length > 0 ? historyWithVariation.map((row, idx) => (
                        <tr key={`${row.date.toISOString()}-${idx}`} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">{row.date.toLocaleDateString('pt-BR')}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{formatBRL(row.value)}</td>
                          <td className={`px-3 py-2 font-medium ${row.diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {idx === historyWithVariation.length - 1 ? '-' : `${formatBRL(row.diff)} (${formatPct(row.diffPct)})`}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-800 mb-2">Verificacao de colunas (dim_frota)</div>
            {detectedFrotaColumns ? (
              <ul className="text-xs text-slate-600 space-y-1">
                <li>id: {detectedFrotaColumns.id}</li>
                <li>codigo FIPE: {detectedFrotaColumns.codigoFipe}</li>
                <li>ano modelo: {detectedFrotaColumns.anoModelo}</li>
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
