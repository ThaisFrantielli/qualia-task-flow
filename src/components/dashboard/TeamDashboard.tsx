// src/components/dashboard/TeamDashboard.tsx
import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useTeamHierarchyFull, useTeamCount } from '@/hooks/useTeamHierarchy';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, cn } from '@/lib/utils';
import { parseISODateSafe } from '@/lib/dateUtils';
import { 
  Users, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TeamMemberStats {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  funcao: string | null;
  total: number;
  done: number;
  progress: number;
  todo: number;
  overdue: number;
  completionRate: number;
}

type PeriodFilter = '7d' | '30d' | '90d' | 'all';

export function TeamDashboard() {
  const { user } = useAuth();
  const { data: teamMembers, isLoading: loadingTeam } = useTeamHierarchyFull();
  const { data: teamCount } = useTeamCount();
  const { tasks, loading: loadingTasks } = useTasks({});
  const [period, setPeriod] = useState<PeriodFilter>('30d');

  // Filtra tarefas por período
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : Infinity;
    
    if (period === 'all') return tasks;
    
    const cutoff = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    return tasks.filter(t => {
      const createdAt = parseISODateSafe(t.created_at);
      return createdAt && createdAt >= cutoff;
    });
  }, [tasks, period]);

  // Calcula estatísticas por membro
  const memberStats = useMemo<TeamMemberStats[]>(() => {
    if (!teamMembers || !filteredTasks) return [];

    return teamMembers.map((member: any) => {
      const memberTasks = filteredTasks.filter(
        t => t.assignee_id === member.id || (t.assignee && (t.assignee as any).id === member.id)
      );
      
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const done = memberTasks.filter(t => t.status === 'done').length;
      const progress = memberTasks.filter(t => t.status === 'progress').length;
      const todo = memberTasks.filter(t => t.status === 'todo').length;
      const overdue = memberTasks.filter(t => {
        if (!t.due_date || t.status === 'done') return false;
        const due = parseISODateSafe(t.due_date);
        return due && due < now;
      }).length;

      return {
        id: member.id,
        full_name: member.full_name,
        email: member.email,
        avatar_url: member.avatar_url,
        funcao: member.funcao,
        total: memberTasks.length,
        done,
        progress,
        todo,
        overdue,
        completionRate: memberTasks.length > 0 ? Math.round((done / memberTasks.length) * 100) : 0,
      };
    })
    .filter(m => m.total > 0)
    .sort((a, b) => b.completionRate - a.completionRate);
  }, [teamMembers, filteredTasks]);

  // KPIs consolidados da equipe
  const teamKPIs = useMemo(() => {
    const teamMemberIds = teamMembers?.map((m: any) => m.id) || [];
    const teamTasks = filteredTasks.filter(
      t => teamMemberIds.includes(t.assignee_id) || 
           (t.assignee && teamMemberIds.includes((t.assignee as any).id))
    );

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const total = teamTasks.length;
    const done = teamTasks.filter(t => t.status === 'done').length;
    const progress = teamTasks.filter(t => t.status === 'progress').length;
    const overdue = teamTasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const due = parseISODateSafe(t.due_date);
      return due && due < now;
    }).length;

    return {
      total,
      done,
      progress,
      overdue,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [teamMembers, filteredTasks]);

  if (!user?.isSupervisor) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
          <p className="text-muted-foreground text-sm">
            Esta visualização está disponível apenas para supervisores e gestores.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loadingTeam || loadingTasks) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-20 mb-2" />
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Filtro de Período */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Dashboard da Equipe
          </h2>
          <p className="text-sm text-muted-foreground">
            {teamCount || 0} membros na sua equipe
          </p>
        </div>
        
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Consolidados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamKPIs.total}</p>
                <p className="text-xs text-muted-foreground">Total de Tarefas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamKPIs.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Conclusão</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamKPIs.progress}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{teamKPIs.overdue}</p>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Membros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Performance Individual</CardTitle>
            </div>
            <Badge variant="secondary">{memberStats.length} ativos</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {memberStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum membro com tarefas no período selecionado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {memberStats.map((member, index) => (
                <div 
                  key={member.id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  {/* Ranking */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    index === 0 && "bg-yellow-500/20 text-yellow-600",
                    index === 1 && "bg-gray-400/20 text-gray-600",
                    index === 2 && "bg-orange-500/20 text-orange-600",
                    index > 2 && "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{member.full_name || 'Sem nome'}</span>
                      {member.funcao && (
                        <Badge variant="outline" className="text-xs">{member.funcao}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{member.total} tarefas</span>
                      <span className="text-success">{member.done} concluídas</span>
                      {member.overdue > 0 && (
                        <span className="text-destructive">{member.overdue} atrasadas</span>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <Progress value={member.completionRate} className="h-1.5 mt-2" />
                  </div>

                  {/* Completion Rate */}
                  <div className="text-right">
                    <span className={cn(
                      "text-lg font-bold",
                      member.completionRate >= 80 && "text-success",
                      member.completionRate >= 50 && member.completionRate < 80 && "text-warning",
                      member.completionRate < 50 && "text-destructive"
                    )}>
                      {member.completionRate}%
                    </span>
                  </div>

                  {/* Action */}
                  <Link to={`/tasks?assignee=${member.id}`}>
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas de Sobrecarga */}
      {memberStats.some(m => m.overdue > 3) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Alertas de Atenção</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {memberStats
                .filter(m => m.overdue > 3)
                .map(member => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded bg-background">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{getInitials(member.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{member.full_name}</span>
                    </div>
                    <Badge variant="destructive">{member.overdue} tarefas atrasadas</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TeamDashboard;
