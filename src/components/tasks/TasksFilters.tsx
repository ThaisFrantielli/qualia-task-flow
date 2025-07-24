import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, Users, Calendar, AlertTriangle, Archive, ChevronDown } from 'lucide-react'; // Importar ChevronDown para o ícone do select
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Importar tipos
import type { User, Project } from '@/types';

interface TasksFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (assignee: string) => void;
  periodFilter: string;
  setPeriodFilter: (period: string) => void;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
  projectFilter: string;
  setProjectFilter: (project: string) => void;
  availableAssignees: User[] | null; // Pode ser null
  uniqueTags: string[] | null; // Pode ser null
  uniqueProjects: Project[] | null; // Pode ser null
  viewMode: 'list' | 'grouped';
  setViewMode: (mode: 'list' | 'grouped') => void;
  focusMode: boolean;
  setFocusMode: (focus: boolean) => void;
  groupBy: 'status' | 'project' | 'assignee';
  setGroupBy: (groupBy: 'status' | 'project' | 'assignee') => void;
  archiveStatusFilter: 'active' | 'archived' | 'all';
  setArchiveStatusFilter: (filter: 'active' | 'archived' | 'all') => void;
  overdueCount: number; // Added overdueCount
  hasFilters: boolean; // Added hasFilters
  onClearFilters: () => void; // Added onClearFilters
}

const TasksFilters: React.FC<TasksFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  assigneeFilter,
  setAssigneeFilter,
  periodFilter,
  setPeriodFilter,
  tagFilter,
  setTagFilter,
  projectFilter,
  setProjectFilter,
  availableAssignees,
  uniqueTags,
  uniqueProjects,
  viewMode,
  setViewMode,
  focusMode,
  setFocusMode,
  groupBy,
  setGroupBy,
  archiveStatusFilter,
  setArchiveStatusFilter,
  overdueCount, // Destructure overdueCount
  hasFilters, // Destructure hasFilters
  onClearFilters // Destructure onClearFilters
}) => {

  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'low':
        return <span className="w-2 h-2 rounded-full bg-green-500"></span>;
      case 'medium':
        return <span className="w-2 h-2 rounded-full bg-yellow-500"></span>;
      case 'high':
        return <span className="w-2 h-2 rounded-full bg-red-500"></span>;
      default:
        return null;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Baixa';
      case 'medium':
        return 'Média';
      case 'high':
        return 'Alta';
      default:
        return 'Prioridade';
    }
  };


  return (
    <TooltipProvider>
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-4 border border-gray-200">
        {/* Primeira linha de filtros (Busca, Status, Prioridade, Período) */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-grow w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] flex justify-between items-center">
              <SelectValue>
                {statusFilter === 'all' ? 'Todos status' :
                 statusFilter === 'todo' ? 'Status: A Fazer' :
                 statusFilter === 'progress' ? 'Status: Em Progresso' :
                 statusFilter === 'done' ? 'Status: Concluído' : 'Status'}
              </SelectValue>
               <ChevronDown className="h-4 w-4 opacity-50" />{/* Adicionar ícone ao trigger */}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="todo">A Fazer</SelectItem>
              <SelectItem value="progress">Em Progresso</SelectItem>
              <SelectItem value="done">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full md:w-[180px] flex justify-between items-center">
              <SelectValue>
                <div className="flex items-center gap-2">
                   {priorityFilter !== 'all' && getPriorityIndicator(priorityFilter)}
                   {priorityFilter === 'all' ? 'Todas prioridades' : getPriorityLabel(priorityFilter)}
                </div>
              </SelectValue>
               <ChevronDown className="h-4 w-4 opacity-50" />{/* Adicionar ícone ao trigger */}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              <SelectItem value="low">
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Baixa
                </span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span> Média
                </span>
              </SelectItem>
              <SelectItem value="high">
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Alta
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

           <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-full md:w-[180px] flex justify-between items-center">
              <SelectValue>
                {periodFilter === 'all' ? 'Todos períodos' :
                 periodFilter === 'today' ? 'Período: Hoje' :
                 periodFilter === 'week' ? 'Período: Esta Semana' :
                 periodFilter === 'month' ? 'Período: Este Mês' :
                 periodFilter === 'year' ? 'Período: Este Ano' :
                 periodFilter === 'overdue' ? 'Período: Atrasadas' : 'Período'}
              </SelectValue>
              <ChevronDown className="h-4 w-4 opacity-50" />{/* Adicionar ícone ao trigger */}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos períodos</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              {/* <SelectItem value="year">Este Ano</SelectItem> */}
              <SelectItem value="overdue">Atrasadas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Segunda linha de filtros (Responsável, Projeto, Tag, Visualização, Agrupar por, Arquivados) */}
        <div className="flex flex-col md:flex-row items-center gap-4">

           {/* Filtro de Responsável visível */}
           <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-full md:w-[180px] flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <Users className="w-4 h-4" />{/* Ícone antes do texto */}
                <SelectValue>
                  {/* Usar full_name para exibir */}
                  {assigneeFilter === 'all' ? 'Todos responsáveis' : (availableAssignees?.find(a => a.id === assigneeFilter)?.full_name || assigneeFilter)}
                </SelectValue>
              </div>
               <ChevronDown className="h-4 w-4 opacity-50" />{/* Adicionar ícone ao trigger */}
            </SelectTrigger>
            <SelectContent>
              {/* Usar id para o valor, full_name para o texto */}
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {/* <SelectItem value="">Não atribuído</SelectItem> Removido item com valor vazio*/}
              {availableAssignees && availableAssignees.filter(a => a.id !== '' && a.id !== 'all').map(assignee => (
                <SelectItem key={assignee.id} value={assignee.id}>{assignee.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

           {/* Filtro de Projeto visível */}
           <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full md:w-[180px] flex justify-between items-center">
               <div className="flex items-center gap-2">
                  {/* Adicionar ícone para projeto se houver um relevante */}
                 <SelectValue>
                   {projectFilter === 'all' ? 'Todos projetos' : (uniqueProjects?.find(p => p.id === projectFilter)?.name || projectFilter)}
                 </SelectValue>
               </div>
               <ChevronDown className="h-4 w-4 opacity-50" />{/* Adicionar ícone ao trigger */}
            </SelectTrigger>
            <SelectContent>
               <SelectItem value="all">Todos projetos</SelectItem>
              {uniqueProjects && uniqueProjects.filter(p => p.id !== 'all').map(project => (
                 <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

           {/* Filtro de Tag */}
           <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-full md:w-[180px] flex justify-between items-center">
              <SelectValue>
                {tagFilter === 'all' ? 'Todas tags' : (uniqueTags?.find(t => t === tagFilter) || tagFilter)}
              </SelectValue>
              <ChevronDown className="h-4 w-4 opacity-50" />{/* Adicionar ícone ao trigger */}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas tags</SelectItem>
              {uniqueTags && uniqueTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtros de Visualização, Agrupar por, Arquivados */}
           <Select value={viewMode} onValueChange={(value: "list" | "grouped") => setViewMode(value)}>
            <SelectTrigger className="w-full md:w-[180px] flex justify-between items-center">
              <SelectValue>
                 {viewMode === 'list' ? 'Visualização em Lista' : 'Visualização Agrupada'}
              </SelectValue>
              <ChevronDown className="h-4 w-4 opacity-50" />{/* Adicionar ícone ao trigger */}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="list">Visualização em Lista</SelectItem>
              <SelectItem value="grouped">Visualização Agrupada</SelectItem>
            </SelectContent>
          </Select>

          {viewMode === 'grouped' && (
            <Select value={groupBy} onValueChange={(value: "status" | "project" | "assignee") => setGroupBy(value)}>
              <SelectTrigger className="w-full md:w-[180px] flex justify-between items-center">
                <SelectValue placeholder="Agrupar por" />
                <ChevronDown className="h-4 w-4 opacity-50" />{/* Adicionar ícone ao trigger */}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="project">Projeto</SelectItem>
                <SelectItem value="assignee">Responsável</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={archiveStatusFilter} onValueChange={setArchiveStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <Archive className="w-4 h-4" />{/* Ícone antes do texto */}
                <SelectValue>
                  {archiveStatusFilter === 'all' ? 'Todas Tarefas' : archiveStatusFilter === 'active' ? 'Tarefas Ativas' : 'Tarefas Arquivadas'}
                </SelectValue>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />{/* Adicionar ícone ao trigger */}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Tarefas Ativas</SelectItem>
              <SelectItem value="archived">Tarefas Arquivadas</SelectItem>
              <SelectItem value="all">Todas Tarefas</SelectItem>
            </SelectContent>
          </Select>
        </div>

         {/* Botoes de período (Mantidos, mas podem ser movidos/revisados) */}
         {/* <div className="flex flex-wrap gap-2 pb-4 border-b">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={periodFilter === 'today' ? 'default' : 'outline'}
                size="sm'
                onClick={() => setPeriodFilter('today')}
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Hoje
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tarefas vencendo em 23/07/2025</TooltipContent>
          </Tooltip>
          <Button
            variant={periodFilter === 'week' ? 'default' : 'outline'}
            size="sm'
            onClick={() => setPeriodFilter('week')}
          >
            Esta Semana
          </Button>
          <Button
            variant={periodFilter === 'month' ? 'default' : 'outline'}
            size="sm'
            onClick={() => setPeriodFilter('month')}
          >
            Este Mês
          </Button>
          <Button
            variant={periodFilter === 'overdue' ? 'destructive' : 'outline'}
            size="sm'
            onClick={() => setPeriodFilter('overdue')}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Atrasadas
          </Button>
          <Button
            variant={periodFilter === 'all' ? 'default' : 'outline'}
            size="sm'
            onClick={() => setPeriodFilter('all')}
          >
            Todas
          </Button>
        </div> */}

      </div>
    </TooltipProvider>
  );
};
export default TasksFilters;
