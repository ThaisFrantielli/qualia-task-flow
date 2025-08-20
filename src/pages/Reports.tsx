import { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { Download, FileText, Filter, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';
import type { Database } from '@/integrations/supabase/types';



const Reports = () => {
  const { tasks, loading, error } = useTasks();
  const { projects } = useProjects();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando relatórios...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Erro: {error.message || String(error)}</p>
        </div>
      </div>
    );
  }

  // Get unique assignees for filter
  const uniqueAssignees = Array.from(new Set(tasks.map(task => task.assignee_name).filter(Boolean)));

  // Filtrar tarefas
  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    const matchesProject = filterProject === 'all' || task.project_id === filterProject;
    const matchesAssignee = filterAssignee === 'all' || task.assignee_name === filterAssignee;
    
    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const taskDate = new Date(task.created_at);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      matchesDate = taskDate >= startDate && taskDate <= endDate;
    }
    
    return matchesStatus && matchesPriority && matchesProject && matchesAssignee && matchesDate;
  });

  // Estatísticas
  const stats = {
    total: filteredTasks.length,
    todo: filteredTasks.filter(t => t.status === 'todo').length,
    progress: filteredTasks.filter(t => t.status === 'progress').length,
    done: filteredTasks.filter(t => t.status === 'done').length,
    late: filteredTasks.filter(t => t.status === 'late').length,
    highPriority: filteredTasks.filter(t => t.priority === 'high').length,
    mediumPriority: filteredTasks.filter(t => t.priority === 'medium').length,
    lowPriority: filteredTasks.filter(t => t.priority === 'low').length,
  };

  const exportToExcel = () => {
    const exportData = filteredTasks.map(task => ({
      'ID': task.id,
      'Título': task.title,
      'Descrição': task.description || '',
      'Status': getStatusLabel(task.status),
      'Prioridade': getPriorityLabel(task.priority),
      'Projeto': task.project?.name || 'Sem projeto',
      'Responsável': task.assignee_name || 'Não atribuído',
      'Data de Criação': new Date(task.created_at).toLocaleDateString('pt-BR'),
      'Data de Vencimento': task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : '',
      'Subtarefas': task.subtasks?.length || 0,
      'Subtarefas Concluídas': task.subtasks?.filter(s => s.completed).length || 0,
      'Comentários': task.comments?.length || 0,
      'Anexos': task.attachments?.length || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Tarefas');
    
    const fileName = `relatorio_tarefas_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo': return 'A Fazer';
      case 'progress': return 'Em Andamento';
      case 'done': return 'Concluído';
      case 'late': return 'Atrasado';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios</h1>
          <p className="text-gray-600">Análise detalhada das suas tarefas e projetos</p>
        </div>
        <Button onClick={exportToExcel} className="flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Exportar Excel</span>
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-quality p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Filter className="w-5 h-5" />
          <span>Filtros</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Filtro por Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Todos os Status</option>
            <option value="todo">A Fazer</option>
            <option value="progress">Em Andamento</option>
            <option value="done">Concluído</option>
            <option value="late">Atrasado</option>
          </select>

          {/* Filtro por Prioridade */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>

          {/* Filtro por Projeto */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Todos os Projetos</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          {/* Novo filtro por Responsável */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Todos os Responsáveis</option>
            {uniqueAssignees.map((assignee) =>
              assignee != null ? (
                <option key={assignee} value={String(assignee)}>
                  {assignee}
                </option>
              ) : null
            )}
          </select>

          {/* Data Início */}
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Data início"
          />

          {/* Data Fim */}
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Data fim"
          />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="status">Por Status</TabsTrigger>
          <TabsTrigger value="priority">Por Prioridade</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">
                  Tarefas filtradas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                <BarChart3 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.done}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? `${Math.round((stats.done / stats.total) * 100)}%` : '0%'} do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.progress}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? `${Math.round((stats.progress / stats.total) * 100)}%` : '0%'} do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
                <BarChart3 className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.late}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? `${Math.round((stats.late / stats.total) * 100)}%` : '0%'} do total
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">A Fazer</CardTitle>
                <CardDescription>Tarefas pendentes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-600">{stats.todo}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Em Andamento</CardTitle>
                <CardDescription>Tarefas em execução</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.progress}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Concluídas</CardTitle>
                <CardDescription>Tarefas finalizadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.done}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Atrasadas</CardTitle>
                <CardDescription>Tarefas em atraso</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.late}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="priority" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alta Prioridade</CardTitle>
                <CardDescription>Tarefas urgentes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{stats.highPriority}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Média Prioridade</CardTitle>
                <CardDescription>Tarefas normais</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{stats.mediumPriority}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Baixa Prioridade</CardTitle>
                <CardDescription>Tarefas menos urgentes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.lowPriority}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
