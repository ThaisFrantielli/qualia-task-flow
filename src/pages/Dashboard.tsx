
import React from 'react';
import { useTasks } from '../hooks/useTasks';
import DashboardCard from '../components/DashboardCard';
import { 
  CheckSquare, 
  Clock, 
  Users, 
  TrendingUp,
  AlertTriangle,
  Calendar
} from 'lucide-react';

const Dashboard = () => {
  const { tasks, loading, error } = useTasks();

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando dados...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Erro: {error}</p>
        </div>
      </div>
    );
  }

  // Calcular estatísticas
  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(task => task.status === 'progress').length;
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const lateTasks = tasks.filter(task => task.status === 'late').length;

  const stats = [
    {
      title: 'Total de Tarefas',
      value: totalTasks,
      subtitle: 'Tarefas ativas',
      icon: CheckSquare,
      color: 'primary' as const,
      trend: { value: '100%', isPositive: true }
    },
    {
      title: 'Em Andamento',
      value: inProgressTasks,
      subtitle: 'Sendo executadas',
      icon: Clock,
      color: 'secondary' as const,
      trend: { value: `${totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0}%`, isPositive: true }
    },
    {
      title: 'Concluídas',
      value: completedTasks,
      subtitle: 'Finalizadas',
      icon: TrendingUp,
      color: 'success' as const,
      trend: { value: `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%`, isPositive: true }
    },
    {
      title: 'Atrasadas',
      value: lateTasks,
      subtitle: 'Requer atenção',
      icon: AlertTriangle,
      color: 'warning' as const,
      trend: { value: `${totalTasks > 0 ? Math.round((lateTasks / totalTasks) * 100) : 0}%`, isPositive: false }
    }
  ];

  // Tarefas recentes (últimas 5)
  const recentTasks = tasks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map(task => ({
      id: task.id,
      title: task.title,
      assignee: task.assignee_name || 'Não atribuído',
      status: task.status === 'done' ? 'Concluída' : 
              task.status === 'progress' ? 'Em andamento' : 
              task.status === 'late' ? 'Atrasada' : 'A fazer',
      dueDate: task.due_date || new Date().toISOString().split('T')[0]
    }));

  // Performance da equipe (agrupado por responsável)
  const teamPerformance = tasks.reduce((acc, task) => {
    const assignee = task.assignee_name || 'Não atribuído';
    if (!acc[assignee]) {
      acc[assignee] = { total: 0, completed: 0 };
    }
    acc[assignee].total++;
    if (task.status === 'done') {
      acc[assignee].completed++;
    }
    return acc;
  }, {} as Record<string, { total: number; completed: number }>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Visão geral das suas tarefas e projetos</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <DashboardCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-quality p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tarefas Recentes</h2>
          <div className="space-y-4">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{task.assignee}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    task.status === 'Concluída' ? 'bg-green-100 text-green-800' :
                    task.status === 'Em andamento' ? 'bg-blue-100 text-blue-800' :
                    task.status === 'Atrasada' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Performance */}
        <div className="bg-white rounded-xl shadow-quality p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Desempenho da Equipe</h2>
          <div className="space-y-4">
            {Object.entries(teamPerformance).slice(0, 5).map(([name, performance]) => {
              const percentage = performance.total > 0 ? Math.round((performance.completed / performance.total) * 100) : 0;
              const initial = name.charAt(0).toUpperCase();
              
              return (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{initial}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{name}</p>
                      <p className="text-sm text-gray-500">{performance.completed} tarefas concluídas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-12 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-green-500 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-1">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
