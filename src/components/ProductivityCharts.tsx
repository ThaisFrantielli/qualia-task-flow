
import React from 'react';
import { useTasks } from '@/hooks/useTasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const ProductivityCharts: React.FC = () => {
  const { tasks } = useTasks();

  // Status distribution data
  const statusData = [
    { name: 'A Fazer', value: tasks.filter(t => t.status === 'todo').length, color: '#6b7280' },
    { name: 'Em Progresso', value: tasks.filter(t => t.status === 'progress').length, color: '#3b82f6' },
    { name: 'Concluído', value: tasks.filter(t => t.status === 'done').length, color: '#10b981' },
    { name: 'Atrasado', value: tasks.filter(t => t.status === 'late').length, color: '#ef4444' }
  ];

  // Priority distribution data
  const priorityData = [
    { name: 'Alta', value: tasks.filter(t => t.priority === 'high').length, color: '#ef4444' },
    { name: 'Média', value: tasks.filter(t => t.priority === 'medium').length, color: '#f59e0b' },
    { name: 'Baixa', value: tasks.filter(t => t.priority === 'low').length, color: '#10b981' }
  ];

  // Assignee productivity data
  const assigneeData = () => {
    const assigneeCounts: { [key: string]: { total: number; completed: number } } = {};
    
    tasks.forEach(task => {
      const assignee = task.assignee_name || 'Não atribuído';
      if (!assigneeCounts[assignee]) {
        assigneeCounts[assignee] = { total: 0, completed: 0 };
      }
      assigneeCounts[assignee].total++;
      if (task.status === 'done') {
        assigneeCounts[assignee].completed++;
      }
    });

    return Object.entries(assigneeCounts).map(([name, data]) => ({
      name,
      total: data.total,
      completed: data.completed,
      completion: Math.round((data.completed / data.total) * 100)
    }));
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Overview Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTasks}</div>
          <p className="text-xs text-muted-foreground">
            {completedTasks} concluídas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionPercentage}%</div>
          <p className="text-xs text-muted-foreground">
            Das tarefas totais
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Progresso</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {tasks.filter(t => t.status === 'progress').length}
          </div>
          <p className="text-xs text-muted-foreground">
            Tarefas ativas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {tasks.filter(t => t.status === 'late').length}
          </div>
          <p className="text-xs text-muted-foreground">
            Precisam atenção
          </p>
        </CardContent>
      </Card>

      {/* Status Distribution Chart */}
      <Card className="col-span-full md:col-span-2">
        <CardHeader>
          <CardTitle>Distribuição por Status</CardTitle>
          <CardDescription>
            Visualização do status atual das tarefas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Priority Distribution Chart */}
      <Card className="col-span-full md:col-span-2">
        <CardHeader>
          <CardTitle>Distribuição por Prioridade</CardTitle>
          <CardDescription>
            Como as tarefas estão categorizadas por prioridade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priorityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8">
                {priorityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Team Productivity Chart */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Produtividade da Equipe</CardTitle>
          <CardDescription>
            Taxa de conclusão por membro da equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={assigneeData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'completed' ? `${value} concluídas` : `${value} total`,
                  name === 'completed' ? 'Concluídas' : 'Total'
                ]}
              />
              <Bar dataKey="total" fill="#e5e7eb" name="total" />
              <Bar dataKey="completed" fill="#10b981" name="completed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductivityCharts;
