import { useMemo, useState } from "react";
import { useTickets } from "@/hooks/useTickets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { 
  Clock, CheckCircle, AlertTriangle, TrendingUp, Users, 
  Calendar, BarChart3, PieChartIcon
} from "lucide-react";
import { format, subDays, startOfDay, differenceInHours, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatedKPICard } from "@/components/AnimatedKPICard";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#ec4899"];

const STATUS_LABELS: Record<string, string> = {
  novo: "Solicitação",
  em_analise: "Em Análise",
  aguardando_departamento: "Aguard. Depto.",
  em_tratativa: "Em Tratativa",
  aguardando_cliente: "Aguard. Cliente",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

export default function TicketsReportsDashboard() {
  const { data: tickets, isLoading } = useTickets();
  const [period, setPeriod] = useState("30");

  const stats = useMemo(() => {
    if (!tickets) return null;

    const now = new Date();
    const periodStart = subDays(now, parseInt(period));
    const periodTickets = tickets.filter((t: any) => 
      new Date(t.created_at) >= periodStart
    );

    // KPIs
    const total = periodTickets.length;
    const resolved = periodTickets.filter((t: any) => 
      t.status === "resolvido" || t.status === "fechado"
    ).length;
    const open = total - resolved;
    const overdue = periodTickets.filter((t: any) => {
      if (t.status === "resolvido" || t.status === "fechado") return false;
      const sla = t.sla_resolucao ? new Date(t.sla_resolucao).getTime() : 0;
      return sla > 0 && sla < now.getTime();
    }).length;

    // SLA Compliance
    const ticketsWithSla = periodTickets.filter((t: any) => t.sla_resolucao);
    const slaCompliant = ticketsWithSla.filter((t: any) => {
      if (t.status !== "resolvido" && t.status !== "fechado") return true;
      const resolved = t.data_fechamento ? new Date(t.data_fechamento) : now;
      const sla = new Date(t.sla_resolucao);
      return resolved <= sla;
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
    ).map(([name, value]) => ({ name, value }));

    // Priority distribution
    const priorityData = Object.entries(
      periodTickets.reduce((acc: Record<string, number>, t: any) => {
        const priority = t.prioridade || "media";
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value }));

    // Daily volume (last 14 days)
    const dailyData = [];
    for (let i = 13; i >= 0; i--) {
      const day = startOfDay(subDays(now, i));
      const dayEnd = startOfDay(subDays(now, i - 1));
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
    };
  }, [tickets, period]);

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
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
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
                      {stats.priorityData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Agents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Top Atendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
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
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum dado disponível
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
