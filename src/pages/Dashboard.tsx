// Updated Dashboard.tsx with polished layout and refined design
import { useTasks } from '@/hooks/useTasks';
import { parseISODateSafe } from '@/lib/dateUtils';
import { useUsers } from '@/hooks/useUsers';
import CardBlock from '@/components/dashboard/DashboardCards';
import RecentTasks from '@/components/dashboard/RecentTasks';
import TeamPerformance from '@/components/dashboard/TeamPerformance';
import ProductivityMetrics from '@/components/dashboard/ProductivityMetrics';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { Target, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const { tasks, loading: tasksLoading } = useTasks({});
  const { users, loading: usersLoading } = useUsers();

  if (tasksLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const safeTasks = tasks ?? [];
  const total = safeTasks.length;
  const done = safeTasks.filter((t: any) => t.status === 'done').length;
  const progress = safeTasks.filter((t: any) => t.status === 'progress').length;
  const overdue = safeTasks.filter((t: any) => {
    if (!t.due_date || t.status === 'done') return false;
    const due = parseISODateSafe(t.due_date) || new Date(t.due_date);
    const today = new Date();
    today.setHours(0,0,0,0);
    return due < today;
  }).length;

  const percentDone = total ? Math.round((done / total) * 100) : 0;
  const percentProgress = total ? Math.round((progress / total) * 100) : 0;
  const percentOverdue = total ? Math.round((overdue / total) * 100) : 0;

  const cards = [
    {
      key: 'total',
      title: 'Total de Tarefas',
      value: total,
      icon: <Target className="h-6 w-6 text-gray-700" />,
      delta: `+${percentDone}%`,
      accent: '#F8F9FF',
    },
    {
      key: 'done',
      title: 'Concluídas',
      value: done,
      icon: <CheckCircle className="h-6 w-6 text-white" />,
      delta: `+${percentDone}%`,
      accent: '#322E5C',
    },
    {
      key: 'progress',
      title: 'Em andamento',
      value: progress,
      icon: <Clock className="h-6 w-6 text-white" />,
      delta: `+${percentProgress}%`,
      accent: '#3B82F6',
    },
    {
      key: 'overdue',
      title: 'Atrasadas',
      value: overdue,
      icon: <AlertTriangle className="h-6 w-6 text-white" />,
      delta: percentOverdue > 0 ? `-${percentOverdue}%` : '0%',
      accent: '#FFEDEE',
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">Acompanhe suas tarefas, progresso e desempenho da equipe.</p>
        </div>
        <Link
          to="/tasks"
          className="text-sm font-medium text-primary hover:opacity-80 transition"
        >
          Ver Todas as Tarefas
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex bg-gray-100 p-1 rounded-xl w-fit shadow-inner">
          <TabsTrigger
            value="overview"
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-primary"
          >
            Visão Geral
          </TabsTrigger>

          <TabsTrigger
            value="productivity"
            className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow data-[state=active]:text-primary"
          >
            Produtividade
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-8 pt-6">
          <CardBlock items={cards} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <RecentTasks tasks={safeTasks} users={users} />
            </div>
            <div>
              <TeamPerformance tasks={safeTasks} users={users} />
            </div>
          </div>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="pt-6">
          <ProductivityMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
