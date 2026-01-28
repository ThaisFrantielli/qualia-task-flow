import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/hooks/useTickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  PieChart, Pie, Cell, Legend
} from "recharts";
import { 
  Clock, CheckCircle, AlertTriangle, TrendingUp, 
  Calendar as CalendarIcon, BarChart3, ChevronDown, ChevronUp,
  Building, ExternalLink, Table, Download, ArrowUpDown, Phone, MessageSquare
} from "lucide-react";
import { format, subDays, startOfDay, differenceInHours, parseISO, isWithinInterval, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatedKPICard } from "@/components/AnimatedKPICard";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx";

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
  Encerrada: "Encerrada",
  Aberta: "Aberta",
};

const ANALISE_FINAL_LABELS: Record<string, string> = {
  procedente: "Procedente",
  improcedente: "Improcedente",
  duvida: "Dúvida",
  Procedente: "Procedente",
  Improcedente: "Improcedente",
  Dúvida: "Dúvida",
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
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Toggle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Format tempo de atendimento
  const formatTempoAtendimento = (minutos: number | null) => {
    if (!minutos || minutos <= 0) return "-";
    if (minutos < 60) return `${minutos}m`;
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas < 24) return `${horas}h ${mins}m`;
    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;
    return `${dias}d ${horasRestantes}h`;
  };

  // Export to Excel with all BI fields
  const exportToExcel = () => {
    if (!stats?.periodTickets) return;
    
    const exportData = stats.periodTickets.map((t: any) => {
      const tempoMin = t.data_conclusao && t.created_at 
        ? differenceInMinutes(new Date(t.data_conclusao), new Date(t.created_at))
        : null;
      
      return {
        "ID": t.numero_ticket,
        "Data de Criação": format(new Date(t.created_at), "dd/MM/yyyy HH:mm"),
        "Status": STATUS_LABELS[t.status] || t.status,
        "Placa": t.placa || "-",
        "Cliente": t.clientes?.nome_fantasia || t.clientes?.razao_social || "-",
        "Departamento": t.departamento || "-",
        "Análise Final": ANALISE_FINAL_LABELS[t.analise_final] || t.analise_final || "-",
        "Motivo de Reclamação": t.motivo || "-",
        "Resumo": t.sintese_caso || t.descricao || "-",
        "Resolução": t.resolucao || "-",
        "Ativo/Receptivo": t.ativo_receptivo || "Receptivo",
        "Canal": t.canal || t.origem || "WhatsApp",
        "Data de Atualização": t.updated_at ? format(new Date(t.updated_at), "dd/MM/yyyy HH:mm") : "-",
        "Tempo de Atendimento": formatTempoAtendimento(tempoMin),
        "Atendente": t.profiles?.full_name || "-",
        "Prioridade": t.prioridade,
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");
    XLSX.writeFile(wb, `relatorio_pos_vendas_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  // Parse manual date input
  const handleDateInputChange = (value: string, type: 'from' | 'to') => {
    if (type === 'from') {
      setDateInputFrom(value);
    } else {
      setDateInputTo(value);
    }
    
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
      t.status === "resolvido" || t.status === "fechado" || t.status === "Encerrada"
    ).length;
    const open = total - resolved;
    const now = new Date();
    const overdue = periodTickets.filter((t: any) => {
      if (t.status === "resolvido" || t.status === "fechado" || t.status === "Encerrada") return false;
      const sla = t.sla_resolucao ? new Date(t.sla_resolucao).getTime() : 0;
      return sla > 0 && sla < now.getTime();
    }).length;

    // Count reclamações (tickets with motivo)
    const reclamacoes = periodTickets.filter((t: any) => t.motivo).length;

    // Count dúvidas (based on analise_final)
    const duvidas = periodTickets.filter((t: any) => 
      t.analise_final?.toLowerCase() === 'duvida' || t.analise_final?.toLowerCase() === 'dúvida'
    ).length;

    // Average resolution time (hours)
    const resolvedTickets = periodTickets.filter((t: any) => 
      t.status === "resolvido" || t.status === "fechado" || t.status === "Encerrada"
    );
    const avgResolutionTime = resolvedTickets.length > 0
      ? Math.round(
          resolvedTickets.reduce((sum: number, t: any) => {
            const created = parseISO(t.created_at);
            const closed = t.data_conclusao ? parseISO(t.data_conclusao) : now;
            return sum + differenceInHours(closed, created);
          }, 0) / resolvedTickets.length
        )
      : 0;

    // Análise Final distribution
    const analiseData = Object.entries(
      periodTickets.reduce((acc: Record<string, number>, t: any) => {
        const analise = t.analise_final || "Não definido";
        const label = ANALISE_FINAL_LABELS[analise] || analise;
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).filter(d => d.name !== "Não definido" || d.value > 0);

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

    // Motivo distribution
    const motivoData = Object.entries(
      periodTickets.reduce((acc: Record<string, number>, t: any) => {
        const motivo = t.motivo || "Não especificado";
        acc[motivo] = (acc[motivo] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 12);

    // Monthly volume
    const monthlyData: Record<string, number> = {};
    periodTickets.forEach((t: any) => {
      const month = format(new Date(t.created_at), 'MMM', { locale: ptBR });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });
    const volumeData = Object.entries(monthlyData).map(([month, count]) => ({ month, count }));

    // Ativo/Receptivo distribution
    const ativoReceptivoData = Object.entries(
      periodTickets.reduce((acc: Record<string, number>, t: any) => {
        const tipo = t.ativo_receptivo || "Receptivo";
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    // Canal distribution (WhatsApp vs Atendimento)
    const canalData = Object.entries(
      periodTickets.reduce((acc: Record<string, number>, t: any) => {
        const canal = t.canal || t.origem || "WhatsApp";
        acc[canal] = (acc[canal] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    // Tickets por cliente
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
      .slice(0, 15);

    return {
      total,
      open,
      resolved,
      overdue,
      reclamacoes,
      duvidas,
      avgResolutionTime,
      statusData,
      deptData,
      analiseData,
      volumeData,
      motivoData,
      ativoReceptivoData,
      canalData,
      clienteData,
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
              Pós-Vendas - Relatórios
            </h1>
            <p className="text-muted-foreground text-sm">
              Dashboard de atendimentos e reclamações
            </p>
          </div>
          
          {/* Date Range Picker */}
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
                        onSelect={(d) => handleCalendarSelect(d as Date | undefined, 'from')}
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
                        onSelect={(d) => handleCalendarSelect(d as Date | undefined, 'to')}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <AnimatedKPICard
            value={stats.total}
            label="Total de Atendimentos"
            color="primary"
            icon={<BarChart3 className="w-5 h-5" />}
            trend="stable"
          />
          <AnimatedKPICard
            value={stats.reclamacoes}
            label="Reclamações"
            color="warning"
            icon={<AlertTriangle className="w-5 h-5" />}
            trend="stable"
          />
          <AnimatedKPICard
            value={stats.duvidas}
            label="Dúvidas"
            color="primary"
            icon={<MessageSquare className="w-5 h-5" />}
            trend="stable"
          />
          <AnimatedKPICard
            value={stats.resolved}
            label="Encerrados"
            color="success"
            icon={<CheckCircle className="w-5 h-5" />}
            trend="up"
          />
          <AnimatedKPICard
            value={stats.open}
            label="Em Aberto"
            color="warning"
            icon={<Clock className="w-5 h-5" />}
            trend="stable"
          />
          <AnimatedKPICard
            value={stats.avgResolutionTime}
            label="Tempo Médio (h)"
            color="primary"
            icon={<TrendingUp className="w-5 h-5" />}
            trend="stable"
          />
        </div>

        {/* Charts Row 1 - Volume + Análise Final + Departamentos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Volume Mensal */}
          <Card className="lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Volume Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.volumeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Análise Final */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Análise Final</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.analiseData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Departamentos */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reclamações por Departamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.deptData.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 - Clientes + Ativo/Receptivo + Canal + Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top Clientes */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="h-4 w-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[280px]">
                <div className="space-y-1.5 pr-4">
                  {stats.clienteData.map((cliente, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                    >
                      <span className="text-sm truncate max-w-[180px]">{cliente.name}</span>
                      <Badge variant="secondary" className="font-mono">{cliente.total}</Badge>
                    </div>
                  ))}
                  {stats.clienteData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem dados</p>
                  )}
                  <div className="flex items-center justify-between py-1.5 px-2 border-t mt-2 font-semibold">
                    <span className="text-sm">Total</span>
                    <Badge variant="default">{stats.total}</Badge>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Ativo vs Receptivo */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ativo / Receptivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.ativoReceptivoData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#14b8a6" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Canal */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Canal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.canalData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Encerrada/Aberta */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-6 h-[180px]">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
                  <div className="text-sm text-muted-foreground">Encerrada</div>
                </div>
                <div className="h-16 w-px bg-border" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">{stats.open}</div>
                  <div className="text-sm text-muted-foreground">Aberta</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Motivos de Reclamação */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Motivos de Reclamações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.motivoData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs" 
                    tick={{ fontSize: 9 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Detalhamento */}
        <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4" />
                  <CardTitle className="text-sm font-medium">Detalhamento</CardTitle>
                  <Badge variant="secondary" className="text-xs">{stats.periodTickets.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={exportToExcel}>
                    <Download className="h-4 w-4 mr-1" />
                    Exportar Excel
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      {tableOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ScrollArea className="h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card border-b">
                      <tr className="text-left text-muted-foreground text-xs">
                        <th className="py-2 px-2 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort("numero_ticket")}>
                          <span className="flex items-center gap-1">ID <ArrowUpDown className="h-3 w-3" /></span>
                        </th>
                        <th className="py-2 px-2 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort("created_at")}>
                          <span className="flex items-center gap-1">Data <ArrowUpDown className="h-3 w-3" /></span>
                        </th>
                        <th className="py-2 px-2 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort("status")}>
                          <span className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></span>
                        </th>
                        <th className="py-2 px-2 font-medium">Placa</th>
                        <th className="py-2 px-2 font-medium cursor-pointer hover:text-foreground" onClick={() => handleSort("cliente")}>
                          <span className="flex items-center gap-1">Cliente <ArrowUpDown className="h-3 w-3" /></span>
                        </th>
                        <th className="py-2 px-2 font-medium">Departamento</th>
                        <th className="py-2 px-2 font-medium">Análise</th>
                        <th className="py-2 px-2 font-medium">Motivo</th>
                        <th className="py-2 px-2 font-medium">Resumo</th>
                        <th className="py-2 px-2 font-medium">Resolução</th>
                        <th className="py-2 px-2 font-medium">Canal</th>
                        <th className="py-2 px-2 font-medium">Tempo</th>
                        <th className="py-2 px-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...stats.periodTickets]
                        .sort((a: any, b: any) => {
                          let aVal = "", bVal = "";
                          switch (sortField) {
                            case "numero_ticket":
                              aVal = a.numero_ticket || "";
                              bVal = b.numero_ticket || "";
                              break;
                            case "cliente":
                              aVal = a.clientes?.nome_fantasia || a.clientes?.razao_social || "";
                              bVal = b.clientes?.nome_fantasia || b.clientes?.razao_social || "";
                              break;
                            case "status":
                              aVal = a.status || "";
                              bVal = b.status || "";
                              break;
                            case "created_at":
                              return sortDirection === "asc"
                                ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                                : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                            default:
                              return 0;
                          }
                          return sortDirection === "asc"
                            ? aVal.localeCompare(bVal)
                            : bVal.localeCompare(aVal);
                        })
                        .map((ticket: any) => {
                          const tempoMin = ticket.data_conclusao && ticket.created_at 
                            ? differenceInMinutes(new Date(ticket.data_conclusao), new Date(ticket.created_at))
                            : null;
                          
                          return (
                            <tr 
                              key={ticket.id} 
                              className="border-b border-border/50 hover:bg-muted/30 cursor-pointer text-xs"
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                            >
                              <td className="py-1.5 px-2 font-mono">{ticket.numero_ticket}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap">
                                {format(new Date(ticket.created_at), 'dd/MM/yy HH:mm')}
                              </td>
                              <td className="py-1.5 px-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] ${
                                    ticket.status === 'resolvido' || ticket.status === 'fechado' || ticket.status === 'Encerrada'
                                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400'
                                      : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400'
                                  }`}
                                >
                                  {STATUS_LABELS[ticket.status] || ticket.status}
                                </Badge>
                              </td>
                              <td className="py-1.5 px-2">{ticket.placa || '-'}</td>
                              <td className="py-1.5 px-2 truncate max-w-[120px]">
                                {ticket.clientes?.nome_fantasia || ticket.clientes?.razao_social || '-'}
                              </td>
                              <td className="py-1.5 px-2 truncate max-w-[100px]">{ticket.departamento || '-'}</td>
                              <td className="py-1.5 px-2">
                                {ticket.analise_final && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] ${
                                      ticket.analise_final.toLowerCase().includes('procedente') && !ticket.analise_final.toLowerCase().includes('improcedente')
                                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400'
                                        : ticket.analise_final.toLowerCase().includes('improcedente')
                                        ? 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400'
                                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400'
                                    }`}
                                  >
                                    {ANALISE_FINAL_LABELS[ticket.analise_final] || ticket.analise_final}
                                  </Badge>
                                )}
                              </td>
                              <td className="py-1.5 px-2 truncate max-w-[120px]">{ticket.motivo || '-'}</td>
                              <td className="py-1.5 px-2 truncate max-w-[150px]">{ticket.sintese_caso || ticket.descricao || '-'}</td>
                              <td className="py-1.5 px-2 truncate max-w-[120px]">{ticket.resolucao || '-'}</td>
                              <td className="py-1.5 px-2">{ticket.canal || ticket.origem || 'WhatsApp'}</td>
                              <td className="py-1.5 px-2 whitespace-nowrap">{formatTempoAtendimento(tempoMin)}</td>
                              <td className="py-1.5 px-2">
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </td>
                            </tr>
                          );
                        })}
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