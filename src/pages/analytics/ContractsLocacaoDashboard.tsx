import { useMemo, useState } from 'react';
import { Card, Text, Title } from '@tremor/react';
import { CalendarClock, Clock3, FileText, Layers3 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import useBIDataBatch, { getBatchTable } from '@/hooks/useBIDataBatch';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import { AnalyticsLayout, AnalyticsSection, AnalyticsTabs } from '@/components/analytics/AnalyticsLayout';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { KPIGrid, KPICard } from '@/components/analytics/charts/KPICard';
import { DistributionList } from '@/components/analytics/charts/DistributionChart';
import { TimeSeriesChart } from '@/components/analytics/charts/TimeSeriesChart';
import { fmtBRL, fmtInteger, monthLabel } from '@/lib/analytics/formatters';

type AnyRow = Record<string, unknown>;

type StatusFilter = 'TODOS' | 'ABERTOS' | 'VIGENTES' | 'ENCERRADOS' | 'VENCENDO_90';

type ContractRow = {
  key: string;
  idContratoLocacao: string;
  contratoLocacao: string;
  contratoComercial: string;
  cliente: string;
  tipoContrato: string;
  situacaoRaw: string;
  categoriaStatus: 'VIGENTE' | 'ABERTO_VENCIDO' | 'ABERTO_PRE_INICIO' | 'ENCERRADO';
  placa: string;
  modelo: string;
  grupo: string;
  inicio: Date | null;
  fim: Date | null;
  encerramento: Date | null;
  fimEfetivo: Date | null;
  valorMensal: number;
  periodoMesesOrigem: number | null;
  duracaoMeses: number | null;
  mesesDecorridos: number | null;
  mesesRestantes: number | null;
  diasParaVencer: number | null;
  isAberto: boolean;
  isVigente: boolean;
  isEncerrado: boolean;
};

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/\s/g, '').replace(/[^0-9,.-]/g, '');
  if (!cleaned) return 0;

  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    const n = Number(cleaned.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    const n = Number(cleaned.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  if (/^-?\d+,\d+$/.test(cleaned)) {
    const n = Number(cleaned.replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(cleaned);
  if (Number.isFinite(n)) return n;

  const fallback = Number(cleaned.replace(',', '.'));
  return Number.isFinite(fallback) ? fallback : 0;
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const parsed = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const parsed = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function normalizePlate(value: unknown): string {
  return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

function normalizeToken(value: unknown): string {
  return String(value ?? '').toUpperCase().replace(/\s+/g, '').trim();
}

function pickFirstString(row: AnyRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    const asString = String(value).trim();
    if (asString) return asString;
  }
  return '';
}

function toMonthToken(date: Date | null): string {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function diffMonthsApprox(from: Date, to: Date): number {
  const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 0) return 0;
  const months = Math.round(days / 30.44);
  return Math.max(1, months);
}

function formatDateBR(date: Date | null): string {
  if (!date) return '-';
  return date.toLocaleDateString('pt-BR');
}

function isClosedStatus(status: string): boolean {
  const s = normalizeText(status);
  if (!s) return false;
  if (s.includes('A ENCERRAR') || s.includes('PRE ENCERR')) return false;

  return (
    s.includes('ENCERR') ||
    s.includes('CANCEL') ||
    s.includes('FINALIZ') ||
    s.includes('INATIV')
  );
}

function intersectsRange(start: Date | null, end: Date | null, range?: DateRange): boolean {
  if (!range?.from && !range?.to) return true;

  const intervalStart = start ?? end;
  const intervalEnd = end ?? start;

  if (!intervalStart || !intervalEnd) return true;

  if (range.from && intervalEnd.getTime() < range.from.getTime()) return false;
  if (range.to && intervalStart.getTime() > range.to.getTime()) return false;

  return true;
}

function durationBand(months: number | null): string {
  if (months === null) return 'Sem vigencia';
  if (months <= 12) return '0 a 12 meses';
  if (months <= 24) return '13 a 24 meses';
  if (months <= 36) return '25 a 36 meses';
  if (months <= 48) return '37 a 48 meses';
  if (months <= 60) return '49 a 60 meses';
  return 'Acima de 60 meses';
}

function remainingBand(daysToEnd: number | null): string {
  if (daysToEnd === null) return 'Sem data final';
  if (daysToEnd < 0) return 'Vencido sem encerrar';
  if (daysToEnd <= 30) return '0 a 30 dias';
  if (daysToEnd <= 60) return '31 a 60 dias';
  if (daysToEnd <= 90) return '61 a 90 dias';
  if (daysToEnd <= 180) return '91 a 180 dias';
  return 'Acima de 180 dias';
}

function SelectField(props: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  minWidth?: string;
}) {
  const { label, value, options, onChange, minWidth = '180px' } = props;

  return (
    <label className="flex flex-col gap-1" style={{ minWidth }}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildMonthTokens(from: Date, to: Date): string[] {
  const tokens: string[] = [];
  let cursor = startOfMonth(from);
  const last = startOfMonth(to);

  while (cursor.getTime() <= last.getTime()) {
    tokens.push(toMonthToken(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return tokens;
}

export default function ContractsLocacaoDashboard() {
  const now = useMemo(() => new Date(), []);

  const [activeTab, setActiveTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS');
  const [tipoFilter, setTipoFilter] = useState('TODOS');
  const [clienteFilter, setClienteFilter] = useState('TODOS');
  const [searchText, setSearchText] = useState('');
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(20);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const current = new Date();
    return {
      from: new Date(current.getFullYear(), 0, 1),
      to: current,
    };
  });

  const { results, metadata, loading, error, refetch } = useBIDataBatch(
    ['dim_contratos_locacao'],
    undefined,
    { params: { limit: 100000 } }
  );

  const contratosRaw = useMemo(() => getBatchTable<AnyRow>(results, 'dim_contratos_locacao'), [results]);

  const contratos = useMemo<ContractRow[]>(() => {
    return contratosRaw.map((row, index) => {
      const idContratoLocacao = String(row.IdContratoLocacao ?? row.idcontratolocacao ?? '').trim();
      const contratoLocacao = pickFirstString(row, [
        'ContratoLocacao',
        'NumeroContratoLocacao',
        'NumeroContrato',
        'contratolocacao',
      ]);
      const contratoComercial = pickFirstString(row, ['ContratoComercial', 'contratocomercial', 'RefContratoCliente']);
      const cliente = pickFirstString(row, ['NomeCliente', 'nomecliente', 'Cliente', 'cliente']) || 'Sem cliente';
      const tipoContrato = pickFirstString(row, ['TipoDeContrato', 'TipoLocacao', 'tipolocacao']) || 'Nao definido';
      const situacaoRaw = pickFirstString(row, ['SituacaoContratoLocacao', 'statuslocacao', 'SituacaoContrato']) || 'Sem status';

      const inicio = parseDate(row.DataInicial ?? row.Inicio ?? row.DataInicio ?? row.inicio);
      const fim = parseDate(row.DataFinal ?? row.Fim ?? row.DataTermino ?? row.fim);
      const encerramento = parseDate(row.DataEncerramento ?? row.dataencerramento);
      const fimEfetivo = encerramento ?? fim;

      const valorMensal = parseNumber(
        row.ValorMensalAtual ?? row.UltimoValorLocacao ?? row.ValorLocacao ?? row.VlrLocacao ?? row.valormensalatual
      );

      const isEncerrado = isClosedStatus(situacaoRaw);
      const isAberto = !isEncerrado;

      const started = !inicio || inicio.getTime() <= now.getTime();
      const endNotReached = !fimEfetivo || fimEfetivo.getTime() >= now.getTime();
      const isVigente = isAberto && started && endNotReached;

      const diasParaVencer = isAberto && fimEfetivo ? diffDays(now, fimEfetivo) : null;

      const categoriaStatus: ContractRow['categoriaStatus'] = (() => {
        if (isEncerrado) return 'ENCERRADO';
        if (isVigente) return 'VIGENTE';
        if (!started) return 'ABERTO_PRE_INICIO';
        return 'ABERTO_VENCIDO';
      })();

      const duracaoMesesOrigem = parseNumber(row.PeriodoemMeses ?? row.periodoemmeses);
      const duracaoMeses =
        duracaoMesesOrigem > 0
          ? Math.round(duracaoMesesOrigem)
          : (inicio && fimEfetivo ? diffMonthsApprox(inicio, fimEfetivo) : null);

      const mesesDecorridos = (() => {
        if (!inicio) return null;
        const endRef = fimEfetivo && fimEfetivo.getTime() < now.getTime() ? fimEfetivo : now;
        if (endRef.getTime() < inicio.getTime()) return 0;
        return diffMonthsApprox(inicio, endRef);
      })();

      const mesesRestantes = (() => {
        if (!isAberto || !fimEfetivo) return null;
        if (fimEfetivo.getTime() <= now.getTime()) return 0;
        return diffMonthsApprox(now, fimEfetivo);
      })();

      const placa = normalizePlate(row.PlacaPrincipal ?? row.placaprincipal ?? row.Placa ?? row.placa);
      const modelo = pickFirstString(row, ['Modelo', 'modelo', 'modelo_veiculo']);
      const grupo = pickFirstString(row, ['Categoria', 'GrupoVeiculo', 'grupoveiculo']);

      const fallbackKey = normalizeToken(`${contratoLocacao}-${contratoComercial}-${placa}-${index}`);
      const key = normalizeToken(idContratoLocacao) || normalizeToken(contratoLocacao) || fallbackKey;

      return {
        key,
        idContratoLocacao,
        contratoLocacao: contratoLocacao || '-',
        contratoComercial: contratoComercial || '-',
        cliente,
        tipoContrato,
        situacaoRaw,
        categoriaStatus,
        placa: placa || '-',
        modelo: modelo || '-',
        grupo: grupo || '-',
        inicio,
        fim,
        encerramento,
        fimEfetivo,
        valorMensal,
        periodoMesesOrigem: duracaoMesesOrigem > 0 ? duracaoMesesOrigem : null,
        duracaoMeses,
        mesesDecorridos,
        mesesRestantes,
        diasParaVencer,
        isAberto,
        isVigente,
        isEncerrado,
      };
    });
  }, [contratosRaw, now]);

  const clienteOptions = useMemo(() => {
    const all = Array.from(new Set(contratos.map((item) => item.cliente))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
    return [{ label: 'Todos', value: 'TODOS' }, ...all.map((cliente) => ({ label: cliente, value: cliente }))];
  }, [contratos]);

  const tipoOptions = useMemo(() => {
    const all = Array.from(new Set(contratos.map((item) => item.tipoContrato))).sort((a, b) =>
      a.localeCompare(b, 'pt-BR')
    );
    return [{ label: 'Todos', value: 'TODOS' }, ...all.map((tipo) => ({ label: tipo, value: tipo }))];
  }, [contratos]);

  const contratosFiltrados = useMemo(() => {
    const search = normalizeText(searchText);

    return contratos.filter((contrato) => {
      if (clienteFilter !== 'TODOS' && contrato.cliente !== clienteFilter) return false;
      if (tipoFilter !== 'TODOS' && contrato.tipoContrato !== tipoFilter) return false;

      if (statusFilter === 'ABERTOS' && !contrato.isAberto) return false;
      if (statusFilter === 'VIGENTES' && !contrato.isVigente) return false;
      if (statusFilter === 'ENCERRADOS' && !contrato.isEncerrado) return false;
      if (
        statusFilter === 'VENCENDO_90' &&
        !(contrato.isAberto && contrato.diasParaVencer !== null && contrato.diasParaVencer >= 0 && contrato.diasParaVencer <= 90)
      ) {
        return false;
      }

      if (!intersectsRange(contrato.inicio, contrato.fimEfetivo, dateRange)) return false;

      if (search) {
        const haystack = normalizeText(
          `${contrato.contratoLocacao} ${contrato.contratoComercial} ${contrato.cliente} ${contrato.placa} ${contrato.modelo}`
        );
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [contratos, clienteFilter, tipoFilter, statusFilter, dateRange, searchText]);

  const totalContratos = contratosFiltrados.length;
  const contratosAbertos = contratosFiltrados.filter((item) => item.isAberto).length;
  const contratosVigentes = contratosFiltrados.filter((item) => item.isVigente).length;
  const contratosEncerrados = contratosFiltrados.filter((item) => item.isEncerrado).length;

  const vencendo30 = contratosFiltrados.filter(
    (item) => item.isAberto && item.diasParaVencer !== null && item.diasParaVencer >= 0 && item.diasParaVencer <= 30
  ).length;

  const vencendo90 = contratosFiltrados.filter(
    (item) => item.isAberto && item.diasParaVencer !== null && item.diasParaVencer >= 0 && item.diasParaVencer <= 90
  ).length;

  const ticketMedioVigente = (() => {
    const vigentesComValor = contratosFiltrados.filter((item) => item.isVigente && item.valorMensal > 0);
    if (!vigentesComValor.length) return 0;
    const total = vigentesComValor.reduce((sum, item) => sum + item.valorMensal, 0);
    return total / vigentesComValor.length;
  })();

  const mrrVigente = contratosFiltrados
    .filter((item) => item.isVigente)
    .reduce((sum, item) => sum + item.valorMensal, 0);

  const prazoMedio = (() => {
    const withDuration = contratosFiltrados.map((item) => item.duracaoMeses).filter((item): item is number => item !== null);
    if (!withDuration.length) return 0;
    return withDuration.reduce((sum, value) => sum + value, 0) / withDuration.length;
  })();

  const encerramentosPrevistos12m = (() => {
    const futureLimit = new Date(now.getFullYear(), now.getMonth() + 12, now.getDate());
    return contratosFiltrados.filter(
      (item) => item.isAberto && item.fimEfetivo && item.fimEfetivo.getTime() >= now.getTime() && item.fimEfetivo.getTime() <= futureLimit.getTime()
    ).length;
  })();

  const flowSeries = useMemo(() => {
    if (!contratosFiltrados.length) return [];

    const minStart = contratosFiltrados
      .map((item) => item.inicio)
      .filter((item): item is Date => Boolean(item))
      .reduce<Date | null>((acc, date) => (acc && acc.getTime() < date.getTime() ? acc : date), null);

    const maxEnd = contratosFiltrados
      .map((item) => item.fimEfetivo)
      .filter((item): item is Date => Boolean(item))
      .reduce<Date | null>((acc, date) => (acc && acc.getTime() > date.getTime() ? acc : date), null);

    const from = dateRange?.from ?? minStart ?? new Date(now.getFullYear(), 0, 1);
    const to = dateRange?.to ?? maxEnd ?? now;

    const monthTokens = buildMonthTokens(from, to);

    const map = new Map<string, {
      date: string;
      label: string;
      abertos: number;
      encerrados: number;
      vigentesMes: number;
      ticketMes: number;
    }>();

    for (const token of monthTokens) {
      map.set(token, {
        date: token,
        label: monthLabel(token),
        abertos: 0,
        encerrados: 0,
        vigentesMes: 0,
        ticketMes: 0,
      });
    }

    for (const contrato of contratosFiltrados) {
      const tokenInicio = toMonthToken(contrato.inicio);
      if (tokenInicio) {
        const row = map.get(tokenInicio);
        if (row) row.abertos += 1;
      }

      const tokenEnc = toMonthToken(contrato.encerramento ?? (contrato.isEncerrado ? contrato.fimEfetivo : null));
      if (tokenEnc) {
        const row = map.get(tokenEnc);
        if (row) row.encerrados += 1;
      }
    }

    for (const token of monthTokens) {
      const row = map.get(token);
      if (!row) continue;

      const [yearRaw, monthRaw] = token.split('-');
      const monthDate = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);
      const monthIni = startOfMonth(monthDate);
      const monthFim = endOfMonth(monthDate);

      const ativosNoMes = contratosFiltrados.filter((contrato) => {
        const ini = contrato.inicio;
        const fimEfetivo = contrato.fimEfetivo;

        if (ini && ini.getTime() > monthFim.getTime()) return false;
        if (fimEfetivo && fimEfetivo.getTime() < monthIni.getTime()) return false;
        return contrato.isAberto || contrato.isEncerrado;
      });

      row.vigentesMes = ativosNoMes.length;

      const ativosComValor = ativosNoMes.filter((item) => item.valorMensal > 0);
      row.ticketMes = ativosComValor.length
        ? ativosComValor.reduce((sum, item) => sum + item.valorMensal, 0) / ativosComValor.length
        : 0;
    }

    return monthTokens
      .map((token) => map.get(token))
      .filter((item): item is { date: string; label: string; abertos: number; encerrados: number; vigentesMes: number; ticketMes: number } => Boolean(item));
  }, [contratosFiltrados, dateRange, now]);

  const forecastSeries = useMemo(() => {
    const horizon = 12;

    const baseTokens: string[] = [];
    const start = startOfMonth(now);
    for (let i = 0; i < horizon; i += 1) {
      const cursor = new Date(start.getFullYear(), start.getMonth() + i, 1);
      baseTokens.push(toMonthToken(cursor));
    }

    const map = new Map<string, { date: string; label: string; qtd: number; mrrEncerrando: number }>();
    for (const token of baseTokens) {
      map.set(token, {
        date: token,
        label: monthLabel(token),
        qtd: 0,
        mrrEncerrando: 0,
      });
    }

    for (const contrato of contratosFiltrados) {
      if (!contrato.isAberto || !contrato.fimEfetivo) continue;
      if (contrato.fimEfetivo.getTime() < now.getTime()) continue;

      const token = toMonthToken(contrato.fimEfetivo);
      const row = map.get(token);
      if (!row) continue;

      row.qtd += 1;
      row.mrrEncerrando += contrato.valorMensal;
    }

    return baseTokens.map((token) => map.get(token)).filter((item): item is { date: string; label: string; qtd: number; mrrEncerrando: number } => Boolean(item));
  }, [contratosFiltrados, now]);

  const statusDistribution = useMemo(() => {
    const map = new Map<string, number>();

    for (const contrato of contratosFiltrados) {
      const label = (() => {
        if (contrato.categoriaStatus === 'VIGENTE') return 'Vigente';
        if (contrato.categoriaStatus === 'ENCERRADO') return 'Encerrado';
        if (contrato.categoriaStatus === 'ABERTO_PRE_INICIO') return 'Aberto (pre-inicio)';
        return 'Aberto vencido';
      })();

      map.set(label, (map.get(label) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [contratosFiltrados]);

  const durationDistribution = useMemo(() => {
    const map = new Map<string, number>();

    for (const contrato of contratosFiltrados) {
      const band = durationBand(contrato.duracaoMeses);
      map.set(band, (map.get(band) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [contratosFiltrados]);

  const remainingDistribution = useMemo(() => {
    const map = new Map<string, number>();

    for (const contrato of contratosFiltrados) {
      if (!contrato.isAberto) continue;
      const band = remainingBand(contrato.diasParaVencer);
      map.set(band, (map.get(band) ?? 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [contratosFiltrados]);

  const contratosAVencer = useMemo(() => {
    return contratosFiltrados
      .filter((item) => item.isAberto && item.diasParaVencer !== null)
      .sort((a, b) => (a.diasParaVencer ?? Number.POSITIVE_INFINITY) - (b.diasParaVencer ?? Number.POSITIVE_INFINITY));
  }, [contratosFiltrados]);

  const topVencimentos = contratosAVencer.slice(0, 40);

  const totalPages = Math.max(1, Math.ceil(contratosFiltrados.length / detailPageSize));
  const currentPage = Math.min(detailPage, totalPages);
  const startIndex = (currentPage - 1) * detailPageSize;
  const endIndex = Math.min(startIndex + detailPageSize, contratosFiltrados.length);
  const pageRows = contratosFiltrados.slice(startIndex, endIndex);

  if (loading) {
    return <AnalyticsLoading message="Carregando painel de contratos de locacao..." />;
  }

  if (error) {
    return (
      <AnalyticsLayout
        title="Contratos de Locacao"
        subtitle="Falha ao carregar dados de contratos"
      >
        <Card>
          <Title>Erro ao carregar dados</Title>
          <Text className="mt-2 text-sm text-slate-600">{error}</Text>
          <button
            onClick={refetch}
            className="mt-4 inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700"
          >
            Tentar novamente
          </button>
        </Card>
      </AnalyticsLayout>
    );
  }

  if (!contratos.length) {
    return (
      <AnalyticsLayout
        title="Contratos de Locacao"
        subtitle="Nenhum contrato encontrado na base"
      >
        <Card>
          <Title>Sem dados</Title>
          <Text className="mt-2 text-sm text-slate-600">
            Verifique a sincronizacao da tabela dim_contratos_locacao.
          </Text>
        </Card>
      </AnalyticsLayout>
    );
  }

  return (
    <AnalyticsLayout
      title="Contratos de Locacao"
      subtitle="Status contratual, vencimentos, duracao, previsao de encerramento e ticket medio vigente"
      metadata={metadata}
      hubLabel="Contratos"
      hubColor="emerald"
      hubIcon={<FileText className="h-4 w-4" />}
      actions={
        <button
          onClick={refetch}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Atualizar dados
        </button>
      }
      filters={
        <>
          <DateRangePicker value={dateRange} onChange={setDateRange} className="bg-white" numberOfMonths={2} />

          <SelectField
            label="Status"
            value={statusFilter}
            options={[
              { label: 'Todos', value: 'TODOS' },
              { label: 'Abertos', value: 'ABERTOS' },
              { label: 'Vigentes', value: 'VIGENTES' },
              { label: 'Encerrados', value: 'ENCERRADOS' },
              { label: 'Vencendo em ate 90 dias', value: 'VENCENDO_90' },
            ]}
            onChange={(value) => {
              setStatusFilter(value as StatusFilter);
              setDetailPage(1);
            }}
          />

          <SelectField
            label="Tipo de contrato"
            value={tipoFilter}
            options={tipoOptions}
            minWidth="220px"
            onChange={(value) => {
              setTipoFilter(value);
              setDetailPage(1);
            }}
          />

          <SelectField
            label="Cliente"
            value={clienteFilter}
            options={clienteOptions}
            minWidth="240px"
            onChange={(value) => {
              setClienteFilter(value);
              setDetailPage(1);
            }}
          />

          <label className="flex flex-col gap-1 min-w-[260px]">
            <span className="text-xs font-medium text-slate-600">Busca textual</span>
            <input
              type="text"
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
                setDetailPage(1);
              }}
              placeholder="Contrato, cliente, placa ou modelo"
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
            />
          </label>
        </>
      }
    >
      <AnalyticsTabs
        tabs={['Visao geral', 'Vencimentos e previsao', 'Lista de contratos']}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pills"
      />

      {activeTab === 0 && (
        <>
          <AnalyticsSection title="KPIs contratuais" subtitle="Retrato da carteira filtrada">
            <KPIGrid columns={5}>
              <KPICard
                title="Total de contratos"
                value={totalContratos}
                unit="number"
                icon={<FileText className="h-4 w-4" />}
              />
              <KPICard
                title="Contratos abertos"
                value={contratosAbertos}
                unit="number"
                icon={<Layers3 className="h-4 w-4" />}
              />
              <KPICard
                title="Contratos vigentes"
                value={contratosVigentes}
                unit="number"
                icon={<Clock3 className="h-4 w-4" />}
              />
              <KPICard
                title="Contratos encerrados"
                value={contratosEncerrados}
                unit="number"
                icon={<CalendarClock className="h-4 w-4" />}
              />
              <KPICard
                title="Vencendo em 30 dias"
                value={vencendo30}
                unit="number"
                icon={<CalendarClock className="h-4 w-4" />}
              />
              <KPICard
                title="Vencendo em 90 dias"
                value={vencendo90}
                unit="number"
                icon={<CalendarClock className="h-4 w-4" />}
              />
              <KPICard
                title="Ticket medio vigente"
                value={ticketMedioVigente}
                unit="currency"
                subtitle="Media do valor mensal dos contratos vigentes"
              />
              <KPICard
                title="MRR vigente"
                value={mrrVigente}
                unit="currency"
                subtitle="Soma mensal da carteira vigente"
              />
              <KPICard
                title="Prazo medio contratual"
                value={prazoMedio}
                unit="number"
                decimals={1}
                subtitle="Meses de duracao"
              />
              <KPICard
                title="Encerrando nos proximos 12m"
                value={encerramentosPrevistos12m}
                unit="number"
                subtitle="Previsao baseada em data final/encerramento"
              />
            </KPIGrid>
          </AnalyticsSection>

          <AnalyticsSection title="Distribuicoes" subtitle="Status e tempo de contrato">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <DistributionList
                  data={statusDistribution}
                  title="Status contratual"
                  formatValue={fmtInteger}
                  showPercent={true}
                  className="h-[320px]"
                />

                <DistributionList
                  data={durationDistribution}
                  title="Contratos por tempo total"
                  formatValue={fmtInteger}
                  showPercent={true}
                  className="h-[320px]"
                />

                <DistributionList
                  data={remainingDistribution}
                  title="Contratos abertos por prazo restante"
                  formatValue={fmtInteger}
                  showPercent={true}
                  className="h-[320px]"
                />
              </div>
          </AnalyticsSection>
        </>
      )}

      {activeTab === 1 && (
        <>
          <AnalyticsSection title="Abertura x encerramento mensal" subtitle="Fluxo de contratos ao longo do tempo">
            <TimeSeriesChart
              data={flowSeries}
              title="Contratos iniciados e encerrados"
              subtitle="Comparativo mensal de eventos de contrato"
              primaryKey="abertos"
              secondaryKey="encerrados"
              primaryLabel="Abertos no mes"
              secondaryLabel="Encerrados no mes"
              primaryType="bar"
              secondaryType="line"
              primaryColor="#2563eb"
              secondaryColor="#dc2626"
              formatPrimary={fmtInteger}
              formatSecondary={fmtInteger}
              height={330}
            />
          </AnalyticsSection>

          <AnalyticsSection title="Carteira vigente e ticket medio" subtitle="Evolucao mensal da base contratual">
            <TimeSeriesChart
              data={flowSeries}
              title="Quantidade vigente x ticket medio"
              subtitle="Numero de contratos ativos no mes e valor medio mensal"
              primaryKey="vigentesMes"
              secondaryKey="ticketMes"
              primaryLabel="Contratos vigentes no mes"
              secondaryLabel="Ticket medio no mes"
              primaryType="bar"
              secondaryType="line"
              primaryColor="#0f766e"
              secondaryColor="#7c3aed"
              formatPrimary={fmtInteger}
              formatSecondary={fmtBRL}
              height={330}
            />
          </AnalyticsSection>

          <AnalyticsSection title="Previsao de encerramento" subtitle="Proximos 12 meses">
            <TimeSeriesChart
              data={forecastSeries}
              title="Contratos previstos para encerrar"
              subtitle="Quantidade e valor mensal associado aos contratos que vencem"
              primaryKey="qtd"
              secondaryKey="mrrEncerrando"
              primaryLabel="Qtd encerrando"
              secondaryLabel="MRR encerrando"
              primaryType="bar"
              secondaryType="line"
              primaryColor="#f97316"
              secondaryColor="#1d4ed8"
              formatPrimary={fmtInteger}
              formatSecondary={fmtBRL}
              height={330}
            />
          </AnalyticsSection>

          <AnalyticsSection title="Quais vencem primeiro" subtitle="Lista ordenada por dias para vencimento">
            <Card>
              <div className="overflow-auto">
                <table className="min-w-[1100px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="px-3 py-2">Contrato</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Situacao</th>
                      <th className="px-3 py-2">Inicio</th>
                      <th className="px-3 py-2">Fim previsto</th>
                      <th className="px-3 py-2 text-right">Dias p/ vencer</th>
                      <th className="px-3 py-2 text-right">Valor mensal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVencimentos.map((item) => (
                      <tr key={item.key} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800">{item.contratoLocacao}</div>
                          <div className="text-xs text-slate-500">{item.contratoComercial}</div>
                        </td>
                        <td className="px-3 py-2">{item.cliente}</td>
                        <td className="px-3 py-2">{item.tipoContrato}</td>
                        <td className="px-3 py-2">{item.situacaoRaw}</td>
                        <td className="px-3 py-2">{formatDateBR(item.inicio)}</td>
                        <td className="px-3 py-2">{formatDateBR(item.fimEfetivo)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${(item.diasParaVencer ?? 999999) <= 30 ? 'text-rose-700' : (item.diasParaVencer ?? 999999) <= 90 ? 'text-amber-700' : 'text-slate-700'}`}>
                          {item.diasParaVencer === null ? '-' : fmtInteger(item.diasParaVencer)}
                        </td>
                        <td className="px-3 py-2 text-right">{fmtBRL(item.valorMensal)}</td>
                      </tr>
                    ))}
                    {topVencimentos.length === 0 && (
                      <tr>
                        <td className="px-3 py-8 text-center text-slate-500" colSpan={8}>
                          Nenhum contrato aberto com data de vencimento para os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </AnalyticsSection>
        </>
      )}

      {activeTab === 2 && (
        <AnalyticsSection title="Lista completa de contratos" subtitle="Tempo contratual, situacao e previsao de encerramento por contrato">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <Text className="text-xs text-slate-500">
                Exibindo {contratosFiltrados.length ? startIndex + 1 : 0}-{endIndex} de {contratosFiltrados.length} contratos
              </Text>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600">Itens por pagina</label>
                <select
                  value={detailPageSize}
                  onChange={(event) => {
                    setDetailPageSize(Number(event.target.value));
                    setDetailPage(1);
                  }}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                >
                  {[10, 20, 30, 50].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="min-w-[1400px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2">Contrato</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Situacao</th>
                    <th className="px-3 py-2">Inicio</th>
                    <th className="px-3 py-2">Fim previsto</th>
                    <th className="px-3 py-2">Encerramento</th>
                    <th className="px-3 py-2 text-right">Tempo total (meses)</th>
                    <th className="px-3 py-2 text-right">Tempo decorrido (meses)</th>
                    <th className="px-3 py-2 text-right">Tempo restante (meses)</th>
                    <th className="px-3 py-2 text-right">Dias p/ vencer</th>
                    <th className="px-3 py-2 text-right">Ticket mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item) => (
                    <tr key={item.key} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-800">{item.contratoLocacao}</div>
                        <div className="text-xs text-slate-500">{item.contratoComercial}</div>
                      </td>
                      <td className="px-3 py-2">{item.cliente}</td>
                      <td className="px-3 py-2">{item.tipoContrato}</td>
                      <td className="px-3 py-2">{item.situacaoRaw}</td>
                      <td className="px-3 py-2">{formatDateBR(item.inicio)}</td>
                      <td className="px-3 py-2">{formatDateBR(item.fim)}</td>
                      <td className="px-3 py-2">{formatDateBR(item.encerramento)}</td>
                      <td className="px-3 py-2 text-right">{item.duracaoMeses === null ? '-' : fmtInteger(item.duracaoMeses)}</td>
                      <td className="px-3 py-2 text-right">{item.mesesDecorridos === null ? '-' : fmtInteger(item.mesesDecorridos)}</td>
                      <td className="px-3 py-2 text-right">{item.mesesRestantes === null ? '-' : fmtInteger(item.mesesRestantes)}</td>
                      <td className={`px-3 py-2 text-right ${(item.diasParaVencer ?? 999999) <= 30 ? 'text-rose-700 font-semibold' : ''}`}>
                        {item.diasParaVencer === null ? '-' : fmtInteger(item.diasParaVencer)}
                      </td>
                      <td className="px-3 py-2 text-right">{fmtBRL(item.valorMensal)}</td>
                    </tr>
                  ))}
                  {!pageRows.length && (
                    <tr>
                      <td className="px-3 py-8 text-center text-slate-500" colSpan={12}>
                        Nenhum contrato para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setDetailPage((page) => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
                className="h-8 rounded-md border border-slate-300 px-3 text-xs disabled:opacity-40"
              >
                Pagina anterior
              </button>

              <Text className="text-xs text-slate-500">
                Pagina {currentPage} de {totalPages}
              </Text>

              <button
                onClick={() => setDetailPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 rounded-md border border-slate-300 px-3 text-xs disabled:opacity-40"
              >
                Proxima pagina
              </button>
            </div>
          </Card>
        </AnalyticsSection>
      )}
    </AnalyticsLayout>
  );
}
