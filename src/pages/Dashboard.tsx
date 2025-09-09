// src/pages/Dashboard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, AlertTriangle, Target } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import ProductivityMetrics from '@/components/dashboard/ProductivityMetrics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import type { Task } from '@/types';

const Dashboard = () => {
  // --- CORREÇÃO APLICADA AQUI ---
  // 1. Desestruturamos 'tasks' e 'loading' diretamente do hook.
  // 2. Renomeamos 'loading' para 'tasksLoading' para evitar conflito com 'projectsLoading'.
  const { tasks, loading: tasksLoading } = useTasks({});

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // O '?? []' garante que, se 'tasks' for undefined, usamos um array vazio para evitar erros.
  const safeTasks = tasks ?? [];
  
  const totalTasks = safeTasks.length;
  const completedTasks = safeTasks.filter((task: Task) => task.status === 'done').length;
  const inProgressTasks = safeTasks.filter((task: Task) => task.status === 'progress').length;
  const overdueTasks = safeTasks.filter((task: Task) => {
    if (!task.due_date || task.status === 'done') return false;
    // Compara apenas a data, ignorando a hora
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(task.due_date) < today;
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral da sua produtividade</p>
        </div>
        <div className="flex space-x-2">
          <Link to="/tasks">
            <Button variant="outline">Ver Todas as Tarefas</Button>
          </Link>
          <Link to="/reports">
            <Button>Relatórios</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="productivity">Produtividade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalTasks}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle><CheckCircle className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{completedTasks}</div><p className="text-xs text-muted-foreground">{completionRate}% de conclusão</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Em Progresso</CardTitle><Clock className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold">{inProgressTasks}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Atrasadas</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{overdueTasks}</div></CardContent>
            </Card>
          </div>
          {/* O resto do componente continua igual... */}
        </TabsContent>
        <TabsContent value="productivity">
          <ProductivityMetrics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;