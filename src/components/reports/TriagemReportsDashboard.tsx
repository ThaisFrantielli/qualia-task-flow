import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend
} from "recharts";
import { 
  Users, 
  Ticket, 
  TrendingUp, 
  MessageSquare,
  Target,
  AlertTriangle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TriagemReportsDashboardProps {
  dateRange?: { from: Date; to: Date };
}

export function TriagemReportsDashboard({ dateRange }: TriagemReportsDashboardProps) {
  const from = dateRange?.from || subDays(new Date(), 30);
  const to = dateRange?.to || new Date();

  // Buscar dados de triagem
  const { data: triagemData, isLoading: loadingTriagem } = useQuery({
    queryKey: ['triagem-reports', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, status_triagem, origem, created_at, cadastro_cliente, ultimo_atendente_id')
        .gte('cadastro_cliente', from.toISOString().split('T')[0])
        .lte('cadastro_cliente', to.toISOString().split('T')[0]);

      if (error) throw error;
      return data;
    }
  });

  // Buscar dados de tickets
  const { data: ticketsData, isLoading: loadingTickets } = useQuery({
    queryKey: ['tickets-reports', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, status, prioridade, departamento, origem, created_at, sla_primeira_resposta, sla_resolucao, first_response_at, tempo_total_resolucao, atendente_id')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());

      if (error) throw error;
      return data;
    }
  });

  // Buscar dados de oportunidades
  const { data: oppsData, isLoading: loadingOpps } = useQuery({
    queryKey: ['opps-reports', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oportunidades')
        .select('id, status, created_at, user_id, valor_total')
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString());

      if (error) throw error;
      return data;
    }
  });

  // Buscar perfis para nomes de agentes
  const { data: profiles } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name');
      if (error) throw error;
      return data;
    }
  });

  // Calcular métricas
  const metrics = useMemo(() => {
    if (!triagemData || !ticketsData || !oppsData) return null;

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    // Leads por status
    const leadsByStatus = triagemData.reduce((acc, lead) => {
      const status = lead.status_triagem || 'desconhecido';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Leads por origem
    const leadsByOrigem = triagemData.reduce((acc, lead) => {
      const origem = lead.origem || 'outros';
      acc[origem] = (acc[origem] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Tickets por status
    const ticketsByStatus = ticketsData.reduce((acc, ticket) => {
      const status = ticket.status || 'desconhecido';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // SLA compliance
    const slaMetrics = ticketsData.reduce((acc, ticket) => {
      if (ticket.sla_primeira_resposta) {
        acc.totalComSLA++;
        const slaDate = new Date(ticket.sla_primeira_resposta);
        const respondedAt = ticket.first_response_at ? new Date(ticket.first_response_at) : null;
        
        if (respondedAt && respondedAt <= slaDate) {
          acc.slaCumprido++;
        } else if (!respondedAt && new Date() > slaDate) {
          acc.slaViolado++;
        }
      }
      return acc;
    }, { totalComSLA: 0, slaCumprido: 0, slaViolado: 0 });

    // Volume por dia
    const volumeByDay = triagemData.reduce((acc, lead) => {
      const date = lead.cadastro_cliente?.split('T')[0] || '';
      if (date) {
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Performance por agente
    const agentPerformance = ticketsData.reduce((acc, ticket) => {
      if (ticket.atendente_id) {
        const agentName = profileMap.get(ticket.atendente_id) || 'Desconhecido';
        if (!acc[agentName]) {
          acc[agentName] = { total: 0, resolvidos: 0, slaCumprido: 0 };
        }
        acc[agentName].total++;
        if (ticket.status === 'resolvido' || ticket.status === 'fechado') {
          acc[agentName].resolvidos++;
        }
        if (ticket.first_response_at && ticket.sla_primeira_resposta) {
          if (new Date(ticket.first_response_at) <= new Date(ticket.sla_primeira_resposta)) {
            acc[agentName].slaCumprido++;
          }
        }
      }
      return acc;
    }, {} as Record<string, { total: number; resolvidos: number; slaCumprido: number }>);

    return {
      totalLeads: triagemData.length,
      totalTickets: ticketsData.length,
      totalOpps: oppsData.length,
      whatsappLeads: triagemData.filter(l => l.origem === 'whatsapp_inbound').length,
      leadsByStatus,
      leadsByOrigem,
      ticketsByStatus,
      slaMetrics,
      volumeByDay,
      agentPerformance,
      valorTotalOpps: oppsData.reduce((acc, o) => acc + (Number(o.valor_total) || 0), 0)
    };
  }, [triagemData, ticketsData, oppsData, profiles]);

  const isLoading = loadingTriagem || loadingTickets || loadingOpps;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhum dado disponível para o período selecionado.
      </div>
    );
  }

  // Export discarded leads as CSV
  const exportDiscarded = async () => {
    try {
      const { data: discarded, error } = await supabase
        .from('clientes')
        .select('id, nome_fantasia, razao_social, whatsapp_number, cadastro_cliente, descartado_motivo, descartado_em')
        .eq('status_triagem', 'descartado')
        .gte('descartado_em', from.toISOString())
        .lte('descartado_em', to.toISOString());

      if (error) throw error;

      const clientIds = (discarded || []).map((c: any) => c.id);
      let convMap: Record<string, any> = {};
      if (clientIds.length > 0) {
        const { data: convs } = await supabase
          .from('whatsapp_conversations')
          .select('cliente_id, last_message, last_message_at')
          .in('cliente_id', clientIds);

        (convs || []).forEach((cv: any) => {
          convMap[cv.cliente_id] = cv;
        });
      }

      // Build CSV
      const headers = ['descartado_em','cliente_id','nome','whatsapp_number','last_message','last_message_at','motivo'];
      const rows = (discarded || []).map((c: any) => {
        const conv = convMap[c.id];
        return [
          c.descartado_em || '',
          c.id || '',
          (c.nome_fantasia || c.razao_social) || '',
          c.whatsapp_number || '',
          conv?.last_message || '',
          conv?.last_message_at || '',
          c.descartado_motivo || ''
        ];
      });

      const csvContent = [headers, ...rows].map(r => r.map(field => `"${String(field).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_descartados_${from.toISOString().split('T')[0]}_to_${to.toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar descartados:', err);
      alert('Falha ao exportar descartados: ' + (err as any).message);
    }
  };

  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const statusChartData = Object.entries(metrics.leadsByStatus).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count
  }));

  const volumeChartData = Object.entries(metrics.volumeByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date: format(new Date(date), 'dd/MM', { locale: ptBR }),
      leads: count
    }));

  const agentChartData = Object.entries(metrics.agentPerformance)
    .map(([name, data]) => ({
      name: name.split(' ')[0], // Primeiro nome
      total: data.total,
      resolvidos: data.resolvidos,
      sla: Math.round((data.slaCumprido / data.total) * 100) || 0
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const slaCompliance = metrics.slaMetrics.totalComSLA > 0 
    ? Math.round((metrics.slaMetrics.slaCumprido / metrics.slaMetrics.totalComSLA) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={exportDiscarded} variant="outline">Exportar Leads Descartados (CSV)</Button>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalLeads}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{metrics.whatsappLeads}</p>
                <p className="text-xs text-muted-foreground">Via WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalTickets}</p>
                <p className="text-xs text-muted-foreground">Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalOpps}</p>
                <p className="text-xs text-muted-foreground">Oportunidades</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-500" />
              <div>
                <p className="text-2xl font-bold">{slaCompliance}%</p>
                <p className="text-xs text-muted-foreground">SLA Cumprido</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(metrics.valorTotalOpps)}
                </p>
                <p className="text-xs text-muted-foreground">Valor Opps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume por dia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Volume de Leads por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={volumeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status dos leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Leads por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {statusChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance por agente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Performance por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={agentChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total" fill="#3b82f6" />
                <Bar dataKey="resolvidos" name="Resolvidos" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* SLA Alerts */}
      {metrics.slaMetrics.slaViolado > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  {metrics.slaMetrics.slaViolado} ticket(s) com SLA violado
                </p>
                <p className="text-sm text-red-600 dark:text-red-500">
                  Ação imediata necessária para evitar mais violações
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
