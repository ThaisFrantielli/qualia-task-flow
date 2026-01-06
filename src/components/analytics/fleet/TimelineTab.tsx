import { useMemo, useState } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, LabelList } from 'recharts';
import { Clock, Calendar, Car, Wrench, TrendingUp, ChevronRight, Play, Square, History, Filter, Search, FileSpreadsheet, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { calcStateDurationsDays, normalizeEventName } from '@/lib/analytics/fleetTimeline';

type AnyObject = { [k: string]: any };

interface TimelineTabProps {
  timeline: AnyObject[];
  filteredData: AnyObject[];
  frota: AnyObject[];
  manutencao?: AnyObject[];
  contratosLocacao?: AnyObject[];
}

function fmtDecimal(v: number) { return new Intl.NumberFormat('pt-BR').format(v); }

function normalizePlacaKey(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizeDateLocal(raw?: string | null): Date | null {
  if (!raw) return null;
  const dateOnly = String(raw).split('T')[0];
  const [y, m, d] = dateOnly.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toISODateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmtDateBR(d: Date | null | undefined): string {
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR');
}

function parseDateAny(raw?: string | null): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // pt-BR: dd/MM/yyyy (opcionalmente com hora)
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    const dd = Number(br[1]);
    const mm = Number(br[2]);
    const yyyy = Number(br[3]);
    const hh = br[4] ? Number(br[4]) : 0;
    const mi = br[5] ? Number(br[5]) : 0;
    const ss = br[6] ? Number(br[6]) : 0;
    const dt = new Date(yyyy, mm - 1, dd, hh, mi, ss, 0);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct;
  return normalizeDateLocal(s);
}

function normalizeStatusText(raw: unknown): string {
  return String(raw ?? '').trim();
}

function isLocacaoEmAndamento(status: unknown): boolean {
  const s = normalizeStatusText(status).toUpperCase();
  return s.includes('ANDAMENTO') || s.includes('ATIVO') || s.includes('VIGENTE');
}

function isLocacaoEncerrada(status: unknown): boolean {
  const s = normalizeStatusText(status).toUpperCase();
  return s.includes('ENCERR') || s.includes('FINALIZ') || s.includes('CANCEL');
}

function diffDaysCeil(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(days));
}

type MaintenanceInterval = {
  kind: 'MANUTENCAO_PERIODO';
  key: string;
  start: Date;
  end: Date | null;
  days: number;
  records: AnyObject[];
};

type EventGroupRow = {
  kind: 'EVENTO_DIA_TIPO';
  key: string;
  tipo: string;
  date: Date;
  count: number;
  items: AnyObject[];
};

type TimelineRow = MaintenanceInterval | EventGroupRow;

function getMaintenanceId(r: AnyObject): string {
  return String(
    r?.NumeroOS ?? r?.OS ?? r?.IdOS ?? r?.IdOcorrencia ?? r?.Ocorrencia ?? r?.CodigoOS ?? r?.Codigo ?? ''
  ).trim();
}

function buildMaintenanceIntervals(records: AnyObject[], now = new Date()): MaintenanceInterval[] {
  const sorted = records
    .map((r) => {
      const start = normalizeDateLocal(r?.DataEntrada ?? r?.DataEntradaOficina ?? r?.Entrada ?? r?.Data);
      const end = normalizeDateLocal(r?.DataSaida ?? r?.DataSaidaOficina ?? r?.Saida);
      return { r, start, end };
    })
    .filter((x): x is { r: AnyObject; start: Date; end: Date | null } => !!x.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const intervals: MaintenanceInterval[] = [];
  for (const item of sorted) {
    const itemStart = item.start;
    const itemEnd = item.end;

    const last = intervals[intervals.length - 1];
    const lastEnd = last?.end ?? null;
    const effectiveLastEnd = lastEnd ?? now;
    const effectiveItemEnd = itemEnd ?? now;

    // Junta intervalos muito próximos (mesmo dia ou dia seguinte)
    const canMerge =
      last &&
      itemStart.getTime() <= effectiveLastEnd.getTime() + 24 * 60 * 60 * 1000;

    if (!canMerge) {
      intervals.push({
        kind: 'MANUTENCAO_PERIODO',
        key: `manut:${toISODateKey(itemStart)}:${getMaintenanceId(item.r) || intervals.length}`,
        start: itemStart,
        end: itemEnd,
        days: diffDaysCeil(itemStart, effectiveItemEnd),
        records: [item.r]
      });
      continue;
    }

    // merge
    last.records.push(item.r);
    // atualiza end (prioriza o maior end conhecido; se algum for aberto, mantém aberto)
    if (!last.end || !itemEnd) {
      last.end = null;
    } else if (itemEnd.getTime() > last.end.getTime()) {
      last.end = itemEnd;
    }
    const newEffectiveEnd = last.end ?? now;
    last.days = diffDaysCeil(last.start, newEffectiveEnd);
    last.key = `manut:${toISODateKey(last.start)}:${intervals.length - 1}`;
  }

  return intervals;
}

const EVENT_COLORS: Record<string, string> = {
  'LOCAÇÃO': '#10b981',
  'DEVOLUÇÃO': '#ef4444',
  'MANUTENÇÃO': '#f59e0b',
  'SINISTRO': '#8b5cf6',
  'MOVIMENTAÇÃO': '#3b82f6',
  'MULTA': '#0ea5e9',
  'default': '#94a3b8'
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  // Tipos vêm normalizados (sem acento) via normalizeEventName()
  'LOCACAO': <Play size={14} className="text-emerald-500" />,
  'DEVOLUCAO': <Square size={14} className="text-rose-500" />,
  'MANUTENCAO': <Wrench size={14} className="text-amber-500" />,
  'SINISTRO': <Wrench size={14} className="text-purple-500" />,
  'MOVIMENTACAO': <MapPin size={14} className="text-blue-500" />,
  'MULTA': <Clock size={14} className="text-sky-500" />,
  'MULTAS': <Clock size={14} className="text-sky-500" />,
};

const EVENT_LABELS: Record<string, string> = {
  LOCACAO: 'LOCAÇÃO',
  DEVOLUCAO: 'DEVOLUÇÃO',
  MANUTENCAO: 'MANUTENÇÃO',
  MOVIMENTACAO: 'MOVIMENTAÇÃO',
};

export default function TimelineTab({ timeline, filteredData, frota, manutencao, contratosLocacao }: TimelineTabProps) {
  const [expandedPlates, setExpandedPlates] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const contratosByPlaca = useMemo(() => {
    const map: Record<string, AnyObject[]> = {};
    const list = Array.isArray(contratosLocacao) ? contratosLocacao : [];

    const pickDate = (c: AnyObject, keys: string[]): Date | null => {
      for (const k of keys) {
        const d = parseDateAny((c as any)[k]);
        if (d) return d;
      }
      return null;
    };

    for (const c of list) {
      const placaKey = normalizePlacaKey(c?.PlacaPrincipal ?? c?.Placa);
      if (!placaKey) continue;
      if (!map[placaKey]) map[placaKey] = [];

      const inicio = pickDate(c, ['DataInicial', 'InicioContrato', 'DataInicio', 'DataInicioContrato', 'DataRetirada', 'DataInicioLocacao']);
      const fimPrevisto = pickDate(c, ['DataPrevistaTermino', 'DataFimPrevista', 'DataFimPrevisto', 'DataFim', 'DataTerminoPrevisto', 'DataFimLocacao']);
      const fimEncerramento = pickDate(c, ['DataEncerramento', 'DataEncerrado', 'DataFimEfetiva', 'DataTermino', 'DataFimLocacao', 'DataFim']);

      map[placaKey].push({
        ...c,
        __inicio: inicio,
        __fimPrevisto: fimPrevisto,
        __fimEncerramento: fimEncerramento,
      });
    }

    for (const placaKey of Object.keys(map)) {
      map[placaKey].sort((a, b) => {
        const at = (a.__inicio as Date | null)?.getTime() || 0;
        const bt = (b.__inicio as Date | null)?.getTime() || 0;
        return bt - at;
      });
    }

    return map;
  }, [contratosLocacao]);

  const resolveContratoFor = (placa: string, d: Date | null) => {
    const placaKey = normalizePlacaKey(placa);
    const arr = contratosByPlaca[placaKey] ?? [];
    const t = d?.getTime() ?? 0;
    if (arr.length === 0) {
      const frotaRow = (Array.isArray(frota) ? frota : []).find((f) => normalizePlacaKey(f?.Placa) === placaKey);
      if (!frotaRow) return null;
      const numero = String(frotaRow?.NumeroContratoLocacao ?? frotaRow?.ContratoLocacao ?? '').trim();
      const cliente = String(frotaRow?.NomeCliente ?? frotaRow?.Cliente ?? '').trim();
      const situacao = String(frotaRow?.SituacaoLocacao ?? frotaRow?.StatusLocacao ?? '').trim();
      const previsto = parseDateAny(frotaRow?.DataPrevistaTerminoLocacao ?? frotaRow?.DataPrevistaTermino);
      const encerramento = parseDateAny(frotaRow?.DataEncerramentoLocacao ?? frotaRow?.DataEncerramento);
      if (!numero && !cliente && !situacao && !previsto && !encerramento) return null;
      return {
        NumeroContrato: numero,
        NomeCliente: cliente,
        SituacaoLocacao: situacao,
        __fimPrevisto: previsto,
        __fimEncerramento: encerramento,
      };
    }

    if (!t) return arr[0] ?? null;

    for (const c of arr) {
      const inicio = c.__inicio as Date | null;
      const fim = (c.__fimEncerramento as Date | null) ?? (c.__fimPrevisto as Date | null) ?? null;
      const ti = inicio?.getTime() ?? 0;
      const tf = fim?.getTime() ?? null;
      if (ti && t >= ti && (tf === null || t <= tf)) return c;
    }

    // fallback: pega o contrato mais recente com início anterior à data
    for (const c of arr) {
      const inicio = c.__inicio as Date | null;
      const ti = inicio?.getTime() ?? 0;
      if (ti && t >= ti) return c;
    }

    return null;
  };

  const manutencaoByPlaca = useMemo(() => {
    const map: Record<string, AnyObject[]> = {};
    if (!Array.isArray(manutencao)) return map;
    for (const r of manutencao) {
      const placa = r?.Placa;
      if (!placa) continue;
      if (!map[placa]) map[placa] = [];
      map[placa].push(r);
    }
    return map;
  }, [manutencao]);

  // Agrupa eventos por placa
  const timelineGrouped = useMemo(() => {
    const placasFiltradas = new Set(filteredData.map(f => f.Placa).filter(Boolean));
    const data = placasFiltradas.size > 0
      ? timeline.filter(t => placasFiltradas.has(t.Placa))
      : timeline;

    const grouped: Record<string, AnyObject[]> = {};
    data.forEach(item => {
      const placa = item.Placa;
      if (!placa) return;
      if (!grouped[placa]) grouped[placa] = [];
      grouped[placa].push(item);
    });

    return Object.entries(grouped).map(([placa, eventos]) => {
      const veiculoInfo = frota.find(f => f.Placa === placa) || filteredData.find(f => f.Placa === placa);

      const sortedEvents = [...eventos]
        .filter(e => !!(e.DataEvento || e.Data))
        .sort((a, b) => {
          const ad = parseDateAny(a.DataEvento || a.Data) ?? new Date(0);
          const bd = parseDateAny(b.DataEvento || b.Data) ?? new Date(0);
          return ad.getTime() - bd.getTime();
        });

      const { totalDays, locacaoDays, manutencaoDays } = calcStateDurationsDays(sortedEvents);
      const utilization = totalDays > 0 ? Math.min(100, Math.max(0, (locacaoDays / totalDays) * 100)) : 0;

      const numeroContratoLocacao = veiculoInfo?.NumeroContratoLocacao || veiculoInfo?.ContratoAtual || veiculoInfo?.NumeroContrato;
      const situacaoLocacao = veiculoInfo?.SituacaoLocacao || veiculoInfo?.StatusLocacao || veiculoInfo?.StatusContrato || veiculoInfo?.Situacao;
      const dataPrevistaTerminoLocacao = veiculoInfo?.DataPrevistaTerminoLocacao || veiculoInfo?.DataFimLocacao;
      const dataEncerramentoLocacao = veiculoInfo?.DataEncerramentoLocacao || veiculoInfo?.DataFimLocacao;

      return {
        placa,
        modelo: veiculoInfo?.Modelo || 'N/A',
        status: veiculoInfo?.Status || 'N/A',
        numeroContratoLocacao: numeroContratoLocacao || null,
        situacaoLocacao: situacaoLocacao || null,
        dataPrevistaTerminoLocacao: dataPrevistaTerminoLocacao || null,
        dataEncerramentoLocacao: dataEncerramentoLocacao || null,
        eventos: sortedEvents,
        totalEvents: sortedEvents.length,
        locacaoDays: Math.round(locacaoDays),
        manutencaoDays: Math.round(manutencaoDays),
        utilization
      };
    }).sort((a, b) => b.totalEvents - a.totalEvents);
  }, [timeline, filteredData, frota]);

  // Filtrar por busca
  const filteredGrouped = useMemo(() => {
    if (!searchTerm) return timelineGrouped;
    const term = searchTerm.toLowerCase();
    return timelineGrouped.filter(g => 
      g.placa.toLowerCase().includes(term) || 
      g.modelo.toLowerCase().includes(term)
    );
  }, [timelineGrouped, searchTerm]);

  // Paginação
  const pageItems = filteredGrouped.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredGrouped.length / pageSize);

  // KPIs
  const kpis = useMemo(() => {
    const totalVehicles = timelineGrouped.length;
    const totalEvents = timeline.length;
    const avgEvents = totalVehicles > 0 ? totalEvents / totalVehicles : 0;
    const avgUtilization = totalVehicles > 0 
      ? timelineGrouped.reduce((sum, g) => sum + g.utilization, 0) / totalVehicles 
      : 0;

    // Distribuição por tipo de evento
    const eventTypes: Record<string, number> = {};
    timeline.forEach(e => {
      const tipo = normalizeEventName(e.TipoEvento || e.Evento || 'Outro') || 'Outro';
      eventTypes[tipo] = (eventTypes[tipo] || 0) + 1;
    });

    return { totalVehicles, totalEvents, avgEvents, avgUtilization, eventTypes };
  }, [timelineGrouped, timeline]);

  // Gráfico de eventos por mês
  const eventsByMonth = useMemo(() => {
    const months: Record<string, number> = {};
    timeline.forEach(e => {
      const date = new Date(e.DataEvento || e.Data);
      if (isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = (months[key] || 0) + 1;
    });
    
    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        eventos: count
      }));
  }, [timeline]);

  // Distribuição de eventos
  const eventDistribution = useMemo(() => {
    return Object.entries(kpis.eventTypes)
      .map(([name, value]) => ({ name, value, color: EVENT_COLORS[name] || EVENT_COLORS.default }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [kpis.eventTypes]);

  const togglePlate = (placa: string) => {
    setExpandedPlates(prev => {
      const next = new Set(prev);
      if (next.has(placa)) next.delete(placa);
      else next.add(placa);
      return next;
    });
  };

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const exportToExcel = () => {
    const data = timeline.map(e => ({
      Placa: e.Placa,
      Modelo: e.Modelo,
      TipoEvento: e.TipoEvento || e.Evento,
      DataEvento: e.DataEvento || e.Data,
      Detalhe1: e.Detalhe1 || e.Descricao,
      Detalhe2: e.Detalhe2
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timeline');
    XLSX.writeFile(wb, `timeline_veiculos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (timeline.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-200 flex items-center justify-center">
            <History className="w-10 h-10 text-slate-400" />
          </div>
          <Title className="text-slate-600">Sem Dados de Timeline</Title>
          <Text className="mt-3 text-slate-500 max-w-md mx-auto">
            Nenhum evento de histórico foi encontrado. Verifique se o arquivo <code className="bg-slate-200 px-2 py-1 rounded text-xs">hist_vida_veiculo_timeline.json</code> está disponível.
          </Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <History className="w-8 h-8" />
              Linha do Tempo da Frota
            </h2>
            <p className="text-slate-300 mt-1">Histórico completo de eventos, locações e manutenções</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{fmtDecimal(kpis.totalEvents)}</div>
              <div className="text-slate-400 text-sm">Eventos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{fmtDecimal(kpis.totalVehicles)}</div>
              <div className="text-slate-400 text-sm">Veículos</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Total Eventos</Text>
              <Metric className="text-blue-600">{fmtDecimal(kpis.totalEvents)}</Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Car className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Veículos</Text>
              <Metric className="text-emerald-600">{fmtDecimal(kpis.totalVehicles)}</Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Média Eventos/Veículo</Text>
              <Metric className="text-purple-600">{kpis.avgEvents.toFixed(1)}</Metric>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <Text className="text-slate-500 text-xs">Utilização Média</Text>
              <Metric className="text-amber-600">{kpis.avgUtilization.toFixed(1)}%</Metric>
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Eventos por mês */}
        <Card className="shadow-lg">
          <Title className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            Eventos por Mês
          </Title>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={eventsByMonth} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEventos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [value, 'Eventos']} />
                <Area 
                  type="monotone" 
                  dataKey="eventos" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorEventos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Distribuição de tipos */}
        <Card className="shadow-lg">
          <Title className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-purple-600" />
            Tipos de Evento
          </Title>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventDistribution} layout="vertical" margin={{ left: 10, right: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [fmtDecimal(value), 'Ocorrências']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                  {eventDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList dataKey="value" position="right" formatter={(v: number) => fmtDecimal(v)} fontSize={10} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Timeline por veículo */}
      <Card className="shadow-lg overflow-hidden">
        <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Title className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-600" />
              Timeline por Veículo
            </Title>
            <Badge color="slate">{fmtDecimal(filteredGrouped.length)} veículos</Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar placa..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                className="pl-9 pr-4 py-2 text-sm border rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border rounded-lg hover:bg-slate-50"
            >
              <FileSpreadsheet size={16} />
              Exportar
            </button>
          </div>
        </div>

        <div className="divide-y">
          {pageItems.map(({ placa, modelo, eventos, totalEvents, locacaoDays, manutencaoDays, utilization }) => (
            <div key={placa} className="hover:bg-slate-50 transition-colors">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => togglePlate(placa)}
              >
                <div className="flex items-center gap-4">
                  <div className={`transition-transform ${expandedPlates.has(placa) ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="font-mono font-bold text-blue-600">{placa}</div>
                    <div className="text-sm text-slate-500">{modelo}</div>
                  </div>
                  <Badge color="slate" className="ml-2">{totalEvents} eventos</Badge>
                </div>
                <div className="flex items-center gap-8 text-sm">
                  <div className="text-center">
                    <div className="text-emerald-600 font-bold">{locacaoDays}d</div>
                    <div className="text-xs text-slate-400">Locado</div>
                  </div>
                  <div className="text-center">
                    <div className="text-amber-600 font-bold">{manutencaoDays}d</div>
                    <div className="text-xs text-slate-400">Manutenção</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-bold ${utilization >= 70 ? 'text-emerald-600' : utilization >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {utilization.toFixed(0)}%
                    </div>
                    <div className="text-xs text-slate-400">Utilização</div>
                  </div>
                </div>
              </div>

              {/* Eventos expandidos */}
              {expandedPlates.has(placa) && (
                <div className="px-4 pb-4 pl-14">
                  <div className="relative border-l-2 border-slate-200 ml-2 space-y-3">
                    {(() => {
                      // Deriva linhas “colapsadas” para validação: manutenção por período + agrupamento de eventos por dia/tipo
                      // 1) Manutenção (via dataset fat_manutencao_unificado)
                      const manutRecords = manutencaoByPlaca[placa] ?? [];
                      const manutIntervals = buildMaintenanceIntervals(manutRecords);

                      const manutDaysDerived = manutIntervals.reduce((sum, it) => sum + (it.days || 0), 0);

                      // 2) Eventos agrupados por dia/tipo (removendo os marcadores de manutenção, para não duplicar)
                      // Multas serão exibidas em um tópico próprio.
                      const groups = new Map<string, { tipo: string; date: Date; items: AnyObject[] }>();
                      for (const ev of [...eventos].slice().reverse()) {
                        // reverse para manter o último evento do dia no topo ao expandir o grupo
                        const tipo = normalizeEventName(ev.TipoEvento || ev.Evento || 'Evento') || 'OUTRO';
                        if (tipo.includes('MANUT')) continue;
                        if (tipo.includes('MULTA')) continue;
                        const d = new Date(ev.DataEvento || ev.Data);
                        if (Number.isNaN(d.getTime())) continue;
                        const key = `${tipo}:${toISODateKey(d)}`;
                        const prev = groups.get(key);
                        if (!prev) groups.set(key, { tipo, date: d, items: [ev] });
                        else prev.items.push(ev);
                      }

                      // 3) Multas (tópico dedicado)
                      const multas = [...eventos]
                        .filter((ev) => (normalizeEventName(ev.TipoEvento || ev.Evento || ''))?.includes('MULTA'))
                        .map((ev) => {
                          const d = new Date(ev.DataEvento || ev.Data);
                          return { ev, d: Number.isNaN(d.getTime()) ? null : d };
                        })
                        .sort((a, b) => (b.d?.getTime() || 0) - (a.d?.getTime() || 0));

                      const eventRows: EventGroupRow[] = Array.from(groups.entries()).map(([key, g]) => ({
                        kind: 'EVENTO_DIA_TIPO',
                        key,
                        tipo: g.tipo,
                        date: g.date,
                        count: g.items.length,
                        items: g.items
                      }));

                      const rows: TimelineRow[] = [...manutIntervals, ...eventRows]
                        .sort((a, b) => {
                          const ad = a.kind === 'MANUTENCAO_PERIODO' ? a.start : a.date;
                          const bd = b.kind === 'MANUTENCAO_PERIODO' ? b.start : b.date;
                          return bd.getTime() - ad.getTime();
                        })
                        .slice(0, 30);

                      return (
                        <>
                          {manutDaysDerived > 0 && (
                            <div className="pl-6 text-xs text-slate-500">
                              Manutenção (OS): <span className="font-semibold text-amber-700">{manutDaysDerived} dias</span> no período (pode diferir do KPI acima)
                            </div>
                          )}

                          {multas.length > 0 && (() => {
                            const multasKey = `multas:${placa}`;
                            const opened = expandedRows.has(multasKey);
                            return (
                              <div className="relative pl-6">
                                <div className="absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                  {EVENT_ICONS['MULTA'] || <Clock size={14} className="text-slate-400" />}
                                </div>
                                <div
                                  className="bg-slate-50 rounded-lg p-3 cursor-pointer border border-slate-100"
                                  onClick={() => toggleRow(multasKey)}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm text-slate-700 truncate">MULTAS</span>
                                        <Badge color="slate" className="shrink-0">{multas.length}</Badge>
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1">
                                        Clique para {opened ? 'ocultar' : 'ver'} todas as multas por data
                                      </div>
                                    </div>
                                    <div className="text-xs text-slate-400 shrink-0">{opened ? 'Ocultar' : 'Abrir'}</div>
                                  </div>

                                  {opened && (
                                    <div className="mt-2 space-y-2">
                                      {multas.map(({ ev, d }, i) => {
                                        const k = `multa:${placa}:${String(ev?.IdOcorrencia || ev?.Ocorrencia || ev?.AutoInfracao || i)}`;
                                        const itemOpen = expandedRows.has(k);
                                        const detail = ev?.Detalhe1 || ev?.Descricao || ev?.DescricaoInfracao || ev?.Detalhe2;
                                        const sub = [
                                          ev?.CodigoInfracao ? `Código: ${ev.CodigoInfracao}` : null,
                                          ev?.OrgaoAutuador ? `Órgão: ${ev.OrgaoAutuador}` : null,
                                          ev?.ValorEvento || ev?.ValorMulta ? `Valor: ${String(ev?.ValorEvento ?? ev?.ValorMulta)}` : null,
                                          ev?.Status ? `Status: ${String(ev.Status)}` : null,
                                        ].filter(Boolean).join(' • ');

                                        return (
                                          <div key={k} className="bg-white rounded border border-slate-200">
                                            <div
                                              className="px-3 py-2 flex items-center justify-between gap-3 cursor-pointer"
                                              onClick={() => toggleRow(k)}
                                            >
                                              <div className="min-w-0">
                                                <div className="text-sm text-slate-700 truncate">
                                                  {d ? d.toLocaleDateString('pt-BR') : '—'}
                                                  {ev?.Ocorrencia ? <span className="text-slate-400"> • {String(ev.Ocorrencia)}</span> : null}
                                                </div>
                                                {detail ? <div className="text-xs text-slate-500 truncate">{String(detail)}</div> : null}
                                              </div>
                                              <div className="text-xs text-slate-400 shrink-0">{itemOpen ? 'Fechar' : 'Detalhar'}</div>
                                            </div>

                                            {itemOpen && (
                                              <div className="px-3 pb-2 text-xs text-slate-600 space-y-1">
                                                {sub ? <div>{sub}</div> : <div className="text-slate-400">(sem campos adicionais)</div>}
                                                {ev?.Detalhe2 ? <div>Obs: {String(ev.Detalhe2)}</div> : null}
                                                {ev?.Usuario ? <div>Usuário: {String(ev.Usuario)}</div> : null}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}

                          {rows.map((row) => {
                            if (row.kind === 'MANUTENCAO_PERIODO') {
                              const endLabel = row.end ? fmtDateBR(row.end) : 'Em aberto';
                              const icon = EVENT_ICONS['MANUTENÇÃO'] || <Wrench size={14} className="text-amber-500" />;
                              const title = `MANUTENÇÃO ${fmtDateBR(row.start)} → ${endLabel}`;
                              const subtitle = `${row.days} dia(s) • ${row.records.length} ocorrência(s)`;

                              const top = row.records[0];
                              const fornecedor = top?.Fornecedor || top?.Oficina;
                              const tipoOcorrencia = top?.TipoOcorrencia || top?.TipoManutencao;

                              return (
                                <div key={row.key} className="relative pl-6">
                                  <div className="absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                    {icon}
                                  </div>
                                  <div
                                    className="bg-amber-50/50 rounded-lg p-3 border border-amber-100 cursor-pointer"
                                    onClick={() => toggleRow(row.key)}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm text-slate-700 truncate">{title}</span>
                                          <Badge color="amber" className="shrink-0">{row.days}d</Badge>
                                          <Badge color="slate" className="shrink-0">{row.records.length} OS</Badge>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 truncate">
                                          {subtitle}
                                          {(fornecedor || tipoOcorrencia) && (
                                            <>
                                              {' • '}
                                              {fornecedor ? `Oficina: ${fornecedor}` : ''}
                                              {fornecedor && tipoOcorrencia ? ' • ' : ''}
                                              {tipoOcorrencia ? `Tipo: ${tipoOcorrencia}` : ''}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs text-slate-400 shrink-0">
                                        {expandedRows.has(row.key) ? 'Ocultar' : 'Detalhar'}
                                      </div>
                                    </div>

                                    {expandedRows.has(row.key) && (
                                      <div className="mt-2 space-y-1">
                                        {row.records.slice(0, 8).map((r, i) => {
                                          const id = getMaintenanceId(r);
                                          const entrada = normalizeDateLocal(r?.DataEntrada ?? r?.DataEntradaOficina);
                                          const saida = normalizeDateLocal(r?.DataSaida ?? r?.DataSaidaOficina);
                                          const fornecedorR = r?.Fornecedor || r?.Oficina;
                                          const tipoR = r?.TipoOcorrencia || r?.TipoManutencao;
                                          const custo = r?.CustoTotalOS ?? r?.ValorTotal;
                                          return (
                                            <div key={`${row.key}:os:${i}`} className="text-xs text-slate-600 flex flex-wrap gap-x-2 gap-y-1">
                                              {id && <span className="font-mono">OS {id}</span>}
                                              <span>• {fmtDateBR(entrada)} → {fmtDateBR(saida)}</span>
                                              {fornecedorR && <span>• {fornecedorR}</span>}
                                              {tipoR && <span>• {tipoR}</span>}
                                              {typeof custo === 'number' || (typeof custo === 'string' && String(custo).trim() !== '') ? (
                                                <span>• Custo: {String(custo)}</span>
                                              ) : null}
                                            </div>
                                          );
                                        })}
                                        {row.records.length > 8 && (
                                          <div className="text-xs text-slate-400">+{row.records.length - 8} ocorrências…</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            // EVENTO_DIA_TIPO
                            const tipo = row.tipo;
                            const tipoNorm = normalizeEventName(tipo);
                            const icon = EVENT_ICONS[tipoNorm] || EVENT_ICONS[tipo] || <Clock size={14} className="text-slate-400" />;
                            const formattedDate = fmtDateBR(row.date);
                            const labelBase = EVENT_LABELS[tipoNorm] ?? tipo;
                            const label = row.count > 1 ? `${labelBase} (${row.count})` : labelBase;
                            const topItem = row.items[0];
                            const topDetail = topItem?.Detalhe1 || topItem?.Descricao;

                            const alwaysExpandable = ['LOCACAO', 'DEVOLUCAO', 'SINISTRO', 'COMPRA', 'MOVIMENTACAO'].includes(tipoNorm);
                            const isExpandable = row.count > 1 || alwaysExpandable;

                            return (
                              <div key={row.key} className="relative pl-6">
                                <div className="absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                                  {icon}
                                </div>
                                <div
                                  className="bg-slate-50 rounded-lg p-3 cursor-pointer"
                                  onClick={() => isExpandable ? toggleRow(row.key) : undefined}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm text-slate-700">{label}</span>
                                    <span className="text-xs text-slate-400">{formattedDate}</span>
                                  </div>
                                  {topDetail && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{topDetail}</p>
                                  )}

                                  {isExpandable && expandedRows.has(row.key) && (
                                    <div className="mt-2 space-y-1">
                                      {row.items.slice(0, 10).map((it, i) => {
                                        const dd = parseDateAny(it.DataEvento || it.Data);
                                        const detail = it.Detalhe1 || it.Descricao || it.DescricaoInfracao;

                                        const contrato = (tipoNorm === 'LOCACAO' || tipoNorm === 'DEVOLUCAO' || tipoNorm === 'SINISTRO')
                                          ? resolveContratoFor(placa, dd)
                                          : null;

                                        const contratoNumero = String(
                                          it?.NumeroContratoLocacao ?? it?.ContratoLocacao ?? it?.NumeroContrato ?? it?.numero_contrato ?? it?.Contrato ?? it?.IdContratoLocacao ?? it?.id_contrato_locacao ??
                                          contrato?.NumeroContratoLocacao ?? contrato?.NumeroContrato ?? contrato?.ContratoLocacao ?? contrato?.IdContratoLocacao ?? ''
                                        ).trim();
                                        const contratoCliente = String(
                                          it?.NomeCliente ?? it?.Cliente ?? it?.cliente ?? contrato?.NomeCliente ?? contrato?.Cliente ?? ''
                                        ).trim();

                                        const situacao = String(
                                          it?.StatusLocacao ?? it?.SituacaoLocacao ?? it?.situacao_locacao ?? it?.Situacao ?? it?.Status ?? it?.status ??
                                          contrato?.StatusLocacao ?? contrato?.SituacaoLocacao ?? contrato?.Status ?? contrato?.situacao ?? ''
                                        ).trim();
                                        const previsto = parseDateAny(it?.DataPrevistaTermino ?? it?.DataFimPrevista ?? contrato?.DataPrevistaTermino ?? contrato?.DataFimPrevista ?? contrato?.DataFim ?? contrato?.__fimPrevisto);
                                        const encerramento = parseDateAny(it?.DataEncerramento ?? it?.DataFimEfetiva ?? contrato?.DataEncerramento ?? contrato?.DataEncerrado ?? contrato?.__fimEncerramento);

                                        const showContrato = (tipoNorm === 'LOCACAO' || tipoNorm === 'DEVOLUCAO') && (contratoNumero || contratoCliente || situacao || previsto || encerramento);
                                        const showSinistro = tipoNorm === 'SINISTRO' && (
                                          it?.IdOcorrencia || it?.id_ocorrencia || it?.Ocorrencia || it?.ocorrencia || it?.NumeroOcorrencia || it?.numero_ocorrencia || it?.Detalhe2
                                        );

                                        return (
                                          <div key={`${row.key}:it:${i}`} className="text-xs text-slate-600 flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                              {detail ? <div className="truncate">{detail}</div> : <div className="text-slate-400">(sem detalhe)</div>}

                                              {showContrato && (
                                                <div className="text-slate-500 mt-0.5">
                                                  {contratoNumero ? <span>Contrato: <span className="font-mono">{contratoNumero}</span></span> : null}
                                                  {contratoNumero && contratoCliente ? <span> • </span> : null}
                                                  {contratoCliente ? <span>Cliente: {contratoCliente}</span> : null}
                                                  {(contratoNumero || contratoCliente) && situacao ? <span> • </span> : null}
                                                  {situacao ? <span>Situação: {situacao}</span> : null}
                                                  {isLocacaoEmAndamento(situacao) && (
                                                    <>
                                                      <span> • </span>
                                                      <span>Término previsto: {fmtDateBR(previsto)}</span>
                                                    </>
                                                  )}
                                                  {isLocacaoEncerrada(situacao) && (
                                                    <>
                                                      <span> • </span>
                                                      <span>Encerramento: {fmtDateBR(encerramento)}</span>
                                                    </>
                                                  )}
                                                </div>
                                              )}

                                              {showSinistro && (
                                                <div className="text-slate-500 mt-0.5">
                                                  {(it?.Ocorrencia || it?.ocorrencia || it?.NumeroOcorrencia || it?.numero_ocorrencia) ? (
                                                    <span>Ocorrência: <span className="font-mono">{String(it?.Ocorrencia ?? it?.ocorrencia ?? it?.NumeroOcorrencia ?? it?.numero_ocorrencia)}</span></span>
                                                  ) : null}
                                                  {(it?.Ocorrencia || it?.ocorrencia || it?.NumeroOcorrencia || it?.numero_ocorrencia) && (it?.IdOcorrencia || it?.id_ocorrencia) ? <span> • </span> : null}
                                                  {(it?.IdOcorrencia || it?.id_ocorrencia) ? <span>ID: <span className="font-mono">{String(it?.IdOcorrencia ?? it?.id_ocorrencia)}</span></span> : null}
                                                  {it?.Detalhe2 ? <span> • {String(it.Detalhe2)}</span> : null}
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-slate-400 shrink-0">{fmtDateBR(dd)}</div>
                                          </div>
                                        );
                                      })}
                                      {row.items.length > 10 && (
                                        <div className="text-xs text-slate-400">+{row.items.length - 10} ocorrências…</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {eventos.length > 0 && rows.length === 0 && (
                            <div className="pl-6 text-sm text-slate-500">Sem eventos válidos para exibição.</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Paginação */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between">
          <Text className="text-slate-500">
            Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, filteredGrouped.length)} de {fmtDecimal(filteredGrouped.length)}
          </Text>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-white"
            >
              ← Anterior
            </button>
            <span className="px-3 py-1 text-sm text-slate-600">
              Página {page + 1} de {totalPages}
            </span>
            <button 
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-white"
            >
              Próxima →
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
