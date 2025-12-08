// src/components/projects/ProjectAnalytics.tsx
import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { parseISODateSafe, formatDateSafe } from '@/lib/dateUtils';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import type { TaskWithDetails } from '@/types';

interface ProjectSection {
  id: string;
  name: string;
  color: string | null;
}

interface ProjectAnalyticsProps {
  tasks: TaskWithDetails[];
  sections: ProjectSection[];
}

export function ProjectAnalytics({ tasks, sections }: ProjectAnalyticsProps) {
  // KPIs básicos
  const kpis = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const progress = tasks.filter(t => t.status === 'progress').length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdue = tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const due = parseISODateSafe(t.due_date);
      return due && due < now;
    }).length;

    return {
      total,
      done,
      progress,
      todo,
      overdue,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [tasks]);

  // Dados por seção
  const sectionData = useMemo(() => {
    const allSections = [
      { id: 'general', name: 'Tarefas Gerais', color: 'hsl(var(--muted-foreground))' },
      ...sections.map(s => ({ ...s, color: s.color || 'hsl(var(--primary))' })),
    ];

    return allSections.map(section => {
      const sectionTasks = tasks.filter(t => (t.section || 'general') === section.id);
      const done = sectionTasks.filter(t => t.status === 'done').length;
      
      return {
        name: section.name,
        total: sectionTasks.length,
        done,
        pending: sectionTasks.length - done,
        rate: sectionTasks.length > 0 ? Math.round((done / sectionTasks.length) * 100) : 0,
        color: section.color,
      };
    }).filter(s => s.total > 0);
  }, [tasks, sections]);

  // Dados para gráfico de pizza (status)
  const statusData = useMemo(() => [
    { name: 'Concluídas', value: kpis.done, color: 'hsl(var(--success))' },
    { name: 'Em Progresso', value: kpis.progress, color: 'hsl(var(--primary))' },
    { name: 'A Fazer', value: kpis.todo, color: 'hsl(var(--muted-foreground))' },
    { name: 'Atrasadas', value: kpis.overdue, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0), [kpis]);

  // Progresso por semana (últimas 4 semanas)
  const weeklyProgress = useMemo(() => {
    const weeks: { week: string; completed: number; created: number }[] = [];
    const now = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const completed = tasks.filter(t => {
        const endDate = parseISODateSafe(t.end_date);
        return endDate && endDate >= weekStart && endDate < weekEnd;
      }).length;

      const created = tasks.filter(t => {
        const createdAt = parseISODateSafe(t.created_at);
        return createdAt && createdAt >= weekStart && createdAt < weekEnd;
      }).length;

      weeks.push({
        week: formatDateSafe(weekStart, 'dd/MM'),
        completed,
        created,
      });
    }

    return weeks;
  }, [tasks]);

  // Velocidade média (tarefas concluídas por semana)
  const velocity = useMemo(() => {
    const totalCompleted = weeklyProgress.reduce((acc, w) => acc + w.completed, 0);
    return Math.round(totalCompleted / 4);
  }, [weeklyProgress]);

  // Estimativa de conclusão
  const estimatedCompletion = useMemo(() => {
    const remaining = kpis.total - kpis.done;
    if (velocity === 0 || remaining === 0) return null;
    
    const weeksNeeded = Math.ceil(remaining / velocity);
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + (weeksNeeded * 7));
    
    return {
      weeks: weeksNeeded,
      date: completionDate,
    };
  }, [kpis, velocity]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
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
                <p className="text-2xl font-bold">{kpis.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Concluído</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{velocity}</p>
                <p className="text-xs text-muted-foreground">Velocity/sem</p>
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
                <p className="text-2xl font-bold">{kpis.overdue}</p>
                <p className="text-xs text-muted-foreground">Atrasadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estimativa de Conclusão */}
      {estimatedCompletion && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Previsão de Conclusão</p>
                  <p className="text-sm text-muted-foreground">
                    Com a velocidade atual de {velocity} tarefas/semana
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">
                  {formatDateSafe(estimatedCompletion.date, 'dd/MM/yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  ~{estimatedCompletion.weeks} semanas restantes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Progresso Semanal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Progresso Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="week" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name="Concluídas"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Criadas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progresso por Seção */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progresso por Seção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sectionData.map((section, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: section.color }}
                    />
                    <span className="text-sm font-medium">{section.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {section.done}/{section.total} ({section.rate}%)
                  </span>
                </div>
                <Progress value={section.rate} className="h-2" />
              </div>
            ))}

            {sectionData.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma seção com tarefas
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectAnalytics;
