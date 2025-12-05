import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskProgressBar } from '@/components/tasks/TaskProgressBar';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ListTodo,
  Users,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectMetricsDashboardProps {
  projectId: string;
  tasks: any[];
  members?: any[];
}

export function ProjectMetricsDashboard({ tasks, members = [] }: ProjectMetricsDashboardProps) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'progress').length;
  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    return new Date(t.due_date) < new Date();
  }).length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;

  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;

  // Calcular taxa de conclusão nos últimos 7 dias
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  const recentlyCompleted = tasks.filter(t => {
    if (t.status !== 'done' || !t.updated_at) return false;
    return new Date(t.updated_at) >= last7Days;
  }).length;

  const metrics = [
    {
      label: 'Total de Tarefas',
      value: totalTasks,
      icon: ListTodo,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Concluídas',
      value: completedTasks,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Em Progresso',
      value: inProgressTasks,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Atrasadas',
      value: overdueTasks,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Métricas principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', metric.bgColor)}>
                  <metric.icon className={cn('h-5 w-5', metric.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progresso geral e insights */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progresso Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <TaskProgressBar 
                total={totalTasks} 
                completed={completedTasks} 
                size="lg"
                className="justify-start"
              />
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-lg font-semibold">{todoTasks}</p>
                  <p className="text-xs text-muted-foreground">A Fazer</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{inProgressTasks}</p>
                  <p className="text-xs text-muted-foreground">Em Andamento</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{completedTasks}</p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm">Últimos 7 dias</span>
              </div>
              <span className="text-sm font-medium">{recentlyCompleted} concluídas</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm">Alta prioridade</span>
              </div>
              <span className="text-sm font-medium">{highPriorityTasks} pendentes</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm">Equipe</span>
              </div>
              <span className="text-sm font-medium">{members.length} membros</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
