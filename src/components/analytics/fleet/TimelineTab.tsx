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
}

function fmtDecimal(v: number) { return new Intl.NumberFormat('pt-BR').format(v); }

const EVENT_COLORS: Record<string, string> = {
  'LOCAÇÃO': '#10b981',
  'DEVOLUÇÃO': '#ef4444',
  'MANUTENÇÃO': '#f59e0b',
  'SINISTRO': '#8b5cf6',
  'MOVIMENTAÇÃO': '#3b82f6',
  'default': '#94a3b8'
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  'LOCAÇÃO': <Play size={14} className="text-emerald-500" />,
  'DEVOLUÇÃO': <Square size={14} className="text-rose-500" />,
  'MANUTENÇÃO': <Wrench size={14} className="text-amber-500" />,
  'SINISTRO': <Wrench size={14} className="text-purple-500" />,
  'MOVIMENTAÇÃO': <MapPin size={14} className="text-blue-500" />
};

export default function TimelineTab({ timeline, filteredData, frota }: TimelineTabProps) {
  const [expandedPlates, setExpandedPlates] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 15;

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
        .sort((a, b) => new Date(a.DataEvento || a.Data).getTime() - new Date(b.DataEvento || b.Data).getTime());

      const { totalDays, locacaoDays, manutencaoDays } = calcStateDurationsDays(sortedEvents);
      const utilization = totalDays > 0 ? Math.min(100, Math.max(0, (locacaoDays / totalDays) * 100)) : 0;

      return {
        placa,
        modelo: veiculoInfo?.Modelo || 'N/A',
        status: veiculoInfo?.Status || 'N/A',
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
                    {eventos.slice(0, 20).map((evento, idx) => {
                      const tipo = normalizeEventName(evento.TipoEvento || evento.Evento || 'Evento') || 'OUTRO';
                      const date = new Date(evento.DataEvento || evento.Data);
                      const formattedDate = isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleDateString('pt-BR');
                      const icon = EVENT_ICONS[tipo] || <Clock size={14} className="text-slate-400" />;
                      
                      return (
                        <div key={idx} className="relative pl-6">
                          <div className="absolute left-0 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                            {icon}
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-slate-700">{tipo}</span>
                              <span className="text-xs text-slate-400">{formattedDate}</span>
                            </div>
                            {(evento.Detalhe1 || evento.Descricao) && (
                              <p className="text-xs text-slate-500 mt-1">{evento.Detalhe1 || evento.Descricao}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {eventos.length > 20 && (
                      <div className="pl-6 text-sm text-slate-500">
                        +{eventos.length - 20} eventos anteriores...
                      </div>
                    )}
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
