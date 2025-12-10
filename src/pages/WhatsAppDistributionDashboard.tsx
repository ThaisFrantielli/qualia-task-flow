import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Users, MessageSquare, Clock, Zap, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

export default function WhatsAppDistributionDashboard() {
  // Fetch distribution stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['distribution-stats'],
    queryFn: async () => {
      // Get all distribution rules
      const { data: rules } = await supabase
        .from('whatsapp_distribution_rules')
        .select(`
          *,
          agent:agent_id(full_name, email, avatar_url)
        `);

      // Get active conversations per agent
      const { data: conversations } = await supabase
        .from('whatsapp_conversations')
        .select('assigned_agent_id, status, created_at')
        .in('status', ['active', 'waiting', 'open']);

      // Get distribution log (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: logs } = await supabase
        .from('whatsapp_distribution_log')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Process data
      const agentStats = (rules || []).map(rule => {
        const activeConvs = (conversations || []).filter(c => c.assigned_agent_id === rule.agent_id);
        const totalAssigned = (logs || []).filter(l => l.agent_id === rule.agent_id).length;
        const autoAssigned = (logs || []).filter(l => l.agent_id === rule.agent_id && l.distribution_type === 'auto').length;
        
        return {
          agent_id: rule.agent_id,
          agent_name: rule.agent?.full_name || rule.agent?.email || 'Desconhecido',
          avatar_url: rule.agent?.avatar_url,
          is_active: rule.is_active,
          priority: rule.priority,
          max_conversations: rule.max_concurrent_conversations,
          active_conversations: activeConvs.length,
          capacity_used: (activeConvs.length / rule.max_concurrent_conversations) * 100,
          total_assigned_7d: totalAssigned,
          auto_assigned_7d: autoAssigned,
          manual_assigned_7d: totalAssigned - autoAssigned
        };
      });

      // Distribution by day
      const distributionByDay = logs?.reduce((acc: Array<{ date: string; count: number; auto: number; manual: number }>, log) => {
        const date = new Date(log.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const existing = acc.find((d: any) => d.date === date);
        if (existing) {
          existing.count++;
          if (log.distribution_type === 'auto') existing.auto++;
          else existing.manual++;
        } else {
          acc.push({
            date,
            count: 1,
            auto: log.distribution_type === 'auto' ? 1 : 0,
            manual: log.distribution_type === 'manual' ? 1 : 0
          });
        }
        return acc;
      }, [] as any[]) || [];

      // Distribution type pie chart
      const totalLogs = logs?.length || 0;
      const autoLogs = logs?.filter(l => l.distribution_type === 'auto').length || 0;
      const distributionTypes = [
        { name: 'Automática', value: autoLogs },
        { name: 'Manual', value: totalLogs - autoLogs }
      ];

      return {
        agentStats,
        distributionByDay,
        distributionTypes,
        totalActive: rules?.filter(r => r.is_active).length || 0,
        totalAgents: rules?.length || 0,
        totalConversations: conversations?.length || 0,
        totalDistributions7d: totalLogs,
        avgResponseTime: '2.5 min' // Mock - calcular real depois
      };
    },
    refetchInterval: 30000 // Atualiza a cada 30s
  });

  if (isLoading || !stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Dashboard de Distribuição
        </h1>
        <p className="text-muted-foreground mt-1">
          Análise em tempo real de atribuições e performance dos atendentes
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Atendentes Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalActive}</p>
            <p className="text-xs text-muted-foreground">
              de {stats.totalAgents} configurados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              Conversas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalConversations}</p>
            <p className="text-xs text-muted-foreground">em atendimento agora</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-600" />
              Distribuições (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalDistributions7d}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Últimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgResponseTime}</p>
            <p className="text-xs text-muted-foreground">tempo de resposta</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution by Day */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuições por Dia</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.distributionByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="auto" stroke="#22c55e" name="Automática" strokeWidth={2} />
                <Line type="monotone" dataKey="manual" stroke="#3b82f6" name="Manual" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribution Types */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Distribuição</CardTitle>
            <CardDescription>Automática vs Manual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.distributionTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.distributionTypes.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Agent Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance dos Atendentes</CardTitle>
          <CardDescription>Carga de trabalho e distribuições</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.agentStats.map((agent) => (
              <div key={agent.agent_id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <Avatar>
                    <AvatarImage src={agent.avatar_url || undefined} />
                    <AvatarFallback>
                      {agent.agent_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{agent.agent_name}</p>
                      {agent.is_active ? (
                        <Badge className="bg-green-600">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                      <Badge variant="outline">Prioridade {agent.priority}</Badge>
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Capacidade: {agent.active_conversations}/{agent.max_conversations}
                        </span>
                        <span className="font-medium">{agent.capacity_used.toFixed(0)}%</span>
                      </div>
                      <Progress value={agent.capacity_used} className="h-2" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">7d:</span>
                    <Badge variant="outline">{agent.total_assigned_7d} total</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="text-green-600">{agent.auto_assigned_7d} auto</span>
                    <span>•</span>
                    <span className="text-blue-600">{agent.manual_assigned_7d} manual</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assignments by Agent Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Atribuições por Atendente (7 dias)</CardTitle>
          <CardDescription>Comparativo de carga de trabalho</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.agentStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="agent_name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="auto_assigned_7d" fill="#22c55e" name="Automática" />
              <Bar dataKey="manual_assigned_7d" fill="#3b82f6" name="Manual" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
