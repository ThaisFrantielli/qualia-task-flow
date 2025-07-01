
import React from 'react';
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
  // Mock data for dashboard
  const stats = [
    {
      title: 'Total de Tarefas',
      value: 48,
      subtitle: 'Tarefas ativas',
      icon: CheckSquare,
      color: 'primary' as const,
      trend: { value: '12%', isPositive: true }
    },
    {
      title: 'Em Andamento',
      value: 15,
      subtitle: 'Sendo executadas',
      icon: Clock,
      color: 'secondary' as const,
      trend: { value: '8%', isPositive: true }
    },
    {
      title: 'Concluídas',
      value: 23,
      subtitle: 'Este mês',
      icon: TrendingUp,
      color: 'success' as const,
      trend: { value: '15%', isPositive: true }
    },
    {
      title: 'Atrasadas',
      value: 5,
      subtitle: 'Requer atenção',
      icon: AlertTriangle,
      color: 'warning' as const,
      trend: { value: '3%', isPositive: false }
    }
  ];

  const recentTasks = [
    {
      id: '1',
      title: 'Implementar sistema de notificações',
      assignee: 'João Silva',
      status: 'Em andamento',
      dueDate: '2024-07-05'
    },
    {
      id: '2',
      title: 'Revisar documentação do projeto',
      assignee: 'Maria Santos',
      status: 'Concluída',
      dueDate: '2024-07-03'
    },
    {
      id: '3',
      title: 'Testes de integração',
      assignee: 'Pedro Costa',
      status: 'A fazer',
      dueDate: '2024-07-08'
    }
  ];

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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">J</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">João Silva</p>
                  <p className="text-sm text-gray-500">5 tarefas concluídas</p>
                </div>
              </div>
              <div className="text-right">
                <div className="w-12 h-2 bg-gray-200 rounded-full">
                  <div className="w-10 h-2 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-500 mt-1">83%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">M</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Maria Santos</p>
                  <p className="text-sm text-gray-500">3 tarefas concluídas</p>
                </div>
              </div>
              <div className="text-right">
                <div className="w-12 h-2 bg-gray-200 rounded-full">
                  <div className="w-8 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-500 mt-1">67%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">P</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Pedro Costa</p>
                  <p className="text-sm text-gray-500">4 tarefas concluídas</p>
                </div>
              </div>
              <div className="text-right">
                <div className="w-12 h-2 bg-gray-200 rounded-full">
                  <div className="w-10 h-2 bg-yellow-500 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-500 mt-1">75%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
