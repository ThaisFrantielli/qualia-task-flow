import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/hooks/useTickets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { 
  Clock, CheckCircle, AlertTriangle, TrendingUp, Users, 
  Calendar as CalendarIcon, BarChart3, PieChartIcon, ChevronDown, ChevronUp,
  Building, ExternalLink, Table
} from "lucide-react";
import { format, subDays, startOfDay, differenceInHours, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatedKPICard } from "@/components/AnimatedKPICard";
import { Skeleton } from "@/components/ui/skeleton";


const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#14b8a6", "#f97316"];

const STATUS_LABELS: Record<string, string> = {
  novo: "Solicitação",
  em_analise: "Em Análise",
  aguardando_departamento: "Aguard. Depto.",
  em_tratativa: "Em Tratativa",
  aguardando_cliente: "Aguard. Cliente",
  aguardando_triagem: "Aguard. Triagem",
  em_atendimento: "Em Atendimento",
  resolvido: "Resolvido",
  fechado: "Fechado",
  aberto: "Aberto",
};

const PRIORITY_COLORS: Record<string, string> = {
  baixa: "#22c55e",
  media: "#3b82f6",
  alta: "#f97316",
  urgente: "#ef4444",
};

const MOTIVO_LABELS: Record<string, string> = {
  "Má qualidade do serviço": "Má qualidade",
  "Demora no atendimento": "Demora",
  "Cobrança indevida": "Cobrança",
  "Problema técnico": "Técnico",
  "Outros": "Outros",
};

export default function TicketsReportsDashboard() {
  const { data: tickets, isLoading } = useTickets();
  const navigate = useNavigate();
  
  // Date range state with manual input
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [dateInputFrom, setDateInputFrom] = useState(format(subDays(new Date(), 30), 'dd/MM/yyyy'));
  const [dateInputTo, setDateInputTo] = useState(format(new Date(), 'dd/MM/yyyy'));
  const [tableOpen, setTableOpen] = useState(true);

  // Parse manual date input
  const handleDateInputChange = (value: string, type: 'from' | 'to') => {
    if (type === 'from') {
      setDateInputFrom(value);
    } else {
      setDateInputTo(value);
    }
    
    // Try to parse DD/MM/YYYY
    const parts = value.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        if (type === 'from') {
          setDateFrom(date);
        } else {
          setDateTo(date);
        }
      }
    }
  };

  const handleCalendarSelect = (date: Date | undefined, type: 'from' | 'to') => {
    if (date) {
      if (type === 'from') {
        setDateFrom(date);
        setDateInputFrom(format(date, 'dd/MM/yyyy'));
      } else {
        setDateTo(date);
        setDateInputTo(format(date, 'dd/MM/yyyy'));
      }
    }
  };

  const stats = useMemo(() => {
    if (!tickets || !dateFrom || !dateTo) return null;

    const periodTickets = tickets.filter((t: any) => {
      const created = new Date(t.created_at);
      return isWithinInterval(created, { start: startOfDay(dateFrom), end: dateTo });
    });

    // KPIs
    const total = periodTickets.length;
    const resolved = periodTickets.filter((t: any) => 
      t.status === "resolvido" || t.status === "fechado"
    ).length;
    const open = total - resolved;
    const now = new Date();
    const overdue = periodTickets.filter((t: any) => {
      if (t.status === "resolvido" || t.status === "fechado") return false;
      const sla = t.sla_resolucao ? new Date(t.sla_resolucao).getTime() : 0;
      return sla > 0 && sla < now.getTime();
    }).length;

    // SLA Compliance
    const ticketsWithSla = periodTickets.filter((t: any) => t.sla_resolucao);
    const slaCompliant = ticketsWithSla.filter((t: any) => {
      if (t.status !== "resolvido" && t.status !== "fechado") return true;
      const resolvedDate = t.data_fechamento ? new Date(t.data_fechamento) : now;
      const sla = new Date(t.sla_resolucao);
      return resolvedDate <= sla;
    }).length;
    const slaRate = ticketsWithSla.length > 0 
      ? Math.round((slaCompliant / ticketsWithSla.length) * 100) 
      : 100;

    // Average resolution time (hours)
    const resolvedTickets = periodTickets.filter((t: any) => 
      t.status === "resolvido" || t.status === "fechado"
    );
    const avgResolutionTime = resolvedTickets.length > 0
      ? Math.round(
          resolvedTickets.reduce((sum: number, t: any) => {
            const created = parseISO(t.created_at);
            const closed = t.data_fechamento ? parseISO(t.data_fechamento) : now;
            return sum + differenceInHours(closed, created);
          }, 0) / resolvedTickets.length
        )
      : 0;

    // Status distribution
    const statusData = Object.entries(
      periodTickets.reduce((acc: Record<string, number>, t: any) => {
        const status = t.status || "novo";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({
      name: STATUS_LABELS[name] || name,
      value,
    }));

    // Department distribution
    const deptData = Object.entries(
      periodTickets.reduce((acc: Record<string, number>, t: any) => {
        const dept = t.departamento || "Não definido";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // Priority distribution
    const priorityData = Object.entries(
      periodTickets.reduce((acc: Record<string, number>, t: any) => {
        const priority = t.prioridade || "media";
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ 
      name, 
      value,
      color: PRIORITY_COLORS[name] || "#888"
    }));

    // Motivo distribution
    const motivoData = Object.entries(
      periodTickets.reduce((acc: Record<string, number>, t: any) => {
        const motivo = t.motivo || "Não especificado";
        acc[motivo] = (acc[motivo] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ 
      name: MOTIVO_LABELS[name] || name, 
      value 
    })).sort((a, b) => b.value - a.value);

    // Daily volume (last 14 days of the range)
    const dailyData = [];
    const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
    const daysToShow = Math.min(daysDiff, 14);
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const day = startOfDay(subDays(dateTo, i));
      const dayEnd = startOfDay(subDays(dateTo, i - 1));
      const dayTickets = periodTickets.filter((t: any) => {
        const created = new Date(t.created_at);
        return created >= day && created < dayEnd;
      });
      dailyData.push({
        date: format(day, "dd/MM", { locale: ptBR }),
        criados: dayTickets.length,
        resolvidos: dayTickets.filter((t: any) => 
          t.status === "resolvido" || t.status === "fechado"
        ).length,
      });
    }

    // Top agents
    const agentData = Object.entries(
      periodTickets.reduce((acc: Record<string, { total: number; resolved: number; name: string }>, t: any) => {
        const agentId = t.atendente_id || "sem_atribuicao";
        const agentName = t.profiles?.full_name || "Sem atribuição";
        if (!acc[agentId]) {
          acc[agentId] = { total: 0, resolved: 0, name: agentName };
        }
        acc[agentId].total++;
        if (t.status === "resolvido" || t.status === "fechado") {
          acc[agentId].resolved++;
        }
        return acc;
      }, {})
    )
      .map(([_, data]) => data)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // NEW: Tickets por cliente
    const clienteData = Object.entries(
      periodTickets.reduce((acc: Record<string, { total: number; name: string; id: string }>, t: any) => {
        const clienteId = t.cliente_id || "sem_cliente";
        const clienteName = t.clientes?.nome_fantasia || t.clientes?.razao_social || "Sem cliente";
        if (!acc[clienteId]) {
          acc[clienteId] = { total: 0, name: clienteName, id: clienteId };
        }
        acc[clienteId].total++;
        return acc;
      }, {})
    )
      .map(([_, data]) => data)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // NEW: Tickets por origem
    const origemData = Object.entries(
      periodTickets.reduce((acc: Record<string, number>, t: any) => {
        const origem = t.origem || "Não definida";
        acc[origem] = (acc[origem] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    return {
      total,
      open,
      resolved,
      overdue,
      slaRate,
      avgResolutionTime,
      statusData,
      deptData,
      priorityData,
      dailyData,
      agentData,
      clienteData,
      origemData,
      motivoData,
      periodTickets,
    };
  }, [tickets, dateFrom, dateTo]);

  if (isLoading || !stats) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Relatórios de Tickets
            </h1>
            <p className="text-muted-foreground text-sm">
              Métricas e análises do sistema de atendimento
            </p>
          </div>
          
          {/* Date Range Picker with Manual Input */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">De</Label>
                <div className="flex items-center gap-1">
                  <Input
                    value={dateInputFrom}
                    onChange={(e) => handleDateInputChange(e.target.value, 'from')}
                    placeholder="DD/MM/YYYY"
                    className="w-28 h-9 text-sm"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={(d: Date | undefined) => handleCalendarSelect(d, 'from')}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Até</Label>
                <div className="flex items-center gap-1">
                  <Input
                    value={dateInputTo}
                    onChange={(e) => handleDateInputChange(e.target.value, 'to')}
                    placeholder="DD/MM/YYYY"
                    className="w-28 h-9 text-sm"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={(d: Date | undefined) => handleCalendarSelect(d, 'to')}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <AnimatedKPICard
            value={stats.total}
            label="Total de Tickets"
            color="primary"
            icon={<BarChart3 className="w-5 h-5" />}
            trend="stable"
          />
          <AnimatedKPICard
            value={stats.open}
            label="Em Aberto"
            color="warning"
            icon={<Clock className="w-5 h-5" />}
            trend="stable"
          />
          <AnimatedKPICard
            value={stats.resolved}
            label="Resolvidos"
            color="success"
            icon={<CheckCircle className="w-5 h-5" />}
            trend="up"
          />
          <AnimatedKPICard
            value={stats.overdue}
            label="SLA Vencido"
            color="danger"
            icon={<AlertTriangle className="w-5 h-5" />}
            trend={stats.overdue > 0 ? "down" : "stable"}
          />
          <AnimatedKPICard
            value={stats.slaRate}
            label={`Taxa SLA (${stats.slaRate}%)`}
            color={stats.slaRate >= 90 ? "success" : stats.slaRate >= 70 ? "warning" : "danger"}
            icon={<TrendingUp className="w-5 h-5" />}
            trend={stats.slaRate >= 90 ? "up" : "down"}
          />
          <AnimatedKPICard
            value={stats.avgResolutionTime}
            label={`Tempo Médio (${stats.avgResolutionTime}h)`}
            color="primary"
            icon={<Clock className="w-5 h-5" />}
            trend="stable"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Volume */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Volume Diário
              </CardTitle>
              <CardDescription>Tickets criados vs resolvidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="criados" 
                      name="Criados"
                      stroke="#3b82f6" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="resolvidos" 
                      name="Resolvidos"
                      stroke="#10b981" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                Distribuição por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => 
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      dataKey="value"
                    >
                      {stats.statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Department Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por Departamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.deptData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                      label
                    >
                      {stats.priorityData.map((entry: any, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Motivo Reclamação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por Motivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.motivoData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 - NEW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tickets por Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Top 10 Clientes (por tickets)
              </CardTitle>
              <CardDescription>Clientes com mais tickets no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.clienteData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={140} 
                      className="text-xs" 
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Tickets" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Agents + Origem */}
          <div className="grid grid-rows-2 gap-6">
            {/* Top Agents */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Top Atendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.agentData.map((agent, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                          {index + 1}
                        </Badge>
                        <span className="text-sm font-medium truncate max-w-[120px]">
                          {agent.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{agent.total} tickets</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {agent.total > 0 
                            ? Math.round((agent.resolved / agent.total) * 100) 
                            : 0}% resolvidos
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {stats.agentData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Nenhum dado disponível
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Por Origem */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Por Origem</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.origemData.slice(0, 5).map((origem, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{origem.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full" 
                            style={{ width: `${(origem.value / stats.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{origem.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabela de Detalhamento */}
        <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  <CardTitle className="text-base">Detalhamento de Tickets</CardTitle>
                  <Badge variant="secondary">{stats.periodTickets.length} registros</Badge>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {tableOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 px-3 font-medium">Número</th>
                        <th className="py-2 px-3 font-medium">Título</th>
                        <th className="py-2 px-3 font-medium">Cliente</th>
                        <th className="py-2 px-3 font-medium">Departamento</th>
                        <th className="py-2 px-3 font-medium">Status</th>
                        <th className="py-2 px-3 font-medium">Prioridade</th>
                        <th className="py-2 px-3 font-medium">Criado em</th>
                        <th className="py-2 px-3 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.periodTickets.map((ticket: any) => (
                        <tr 
                          key={ticket.id} 
                          className="border-b hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                        >
                          <td className="py-2 px-3 font-mono text-xs">{ticket.numero_ticket}</td>
                          <td className="py-2 px-3 truncate max-w-[200px]">{ticket.titulo}</td>
                          <td className="py-2 px-3 truncate max-w-[150px]">
                            {ticket.clientes?.nome_fantasia || ticket.clientes?.razao_social || '-'}
                          </td>
                          <td className="py-2 px-3">{ticket.departamento || '-'}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-xs">
                              {STATUS_LABELS[ticket.status] || ticket.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <Badge 
                              className="text-xs text-white"
                              style={{ backgroundColor: PRIORITY_COLORS[ticket.prioridade] || '#888' }}
                            >
                              {ticket.prioridade}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">
                            {format(new Date(ticket.created_at), 'dd/MM/yy HH:mm')}
                          </td>
                          <td className="py-2 px-3">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
