import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, Users, Calendar, AlertTriangle, Archive } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
  uniqueAssignees: string[];
  uniqueTags: string[];
  viewMode: 'list' | 'grouped';
  setViewMode: (mode: 'list' | 'grouped') => void;
  focusMode: boolean;
  setFocusMode: (focus: boolean) => void;
  groupBy: 'status' | 'project' | 'assignee';
  setGroupBy: (groupBy: 'status' | 'project' | 'assignee') => void;
  archiveStatusFilter: 'active' | 'archived' | 'all';
  setArchiveStatusFilter: (filter: 'active' | 'archived' | 'all') => void;
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
  uniqueAssignees,
  uniqueTags,
  viewMode,
  setViewMode,
  focusMode,
  setFocusMode,
  groupBy,
  setGroupBy,
  archiveStatusFilter,
  setArchiveStatusFilter
}) => {
  return (
    <TooltipProvider>
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap gap-2 pb-4 border-b">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={periodFilter === 'today' ? 'default' : 'outline'}
                size="sm"
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
            size="sm"
            onClick={() => setPeriodFilter('week')}
          >
            Esta Semana
          </Button>
          <Button
            variant={periodFilter === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('month')}
          >
            Este Mês
          </Button>
          <Button
            variant={periodFilter === 'overdue' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('overdue')}
            className="flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Atrasadas
          </Button>
          <Button
            variant={periodFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriodFilter('all')}
          >
            Todas
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue>
                {statusFilter === 'all' ? 'Status: Todos' :
                 statusFilter === 'todo' ? 'Status: A Fazer' :
                 statusFilter === 'progress' ? 'Status: Em Progresso' :
                 statusFilter === 'done' ? 'Status: Concluído' : 'Status'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="todo">A Fazer</SelectItem>
              <SelectItem value="progress">Em Progresso</SelectItem>
              <SelectItem value="done">Concluído</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                {priorityFilter === 'all' ? 'Prioridade: Todas' :
                 priorityFilter === 'low' ? 'Prioridade: Baixa' :
                 priorityFilter === 'medium' ? 'Prioridade: Média' :
                 priorityFilter === 'high' ? 'Prioridade: Alta' : 'Prioridade'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-[180px]">
              <Users className="w-4 h-4 mr-2" />
              <SelectValue>
                {assigneeFilter === 'all' ? 'Todos' : assigneeFilter === 'Não Atribuído' ? 'Não Atribuído' : (uniqueAssignees.find(a => a === assigneeFilter) || assigneeFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {uniqueAssignees.map(assignee => (
                <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                {tagFilter === 'all' ? 'Todas' : (uniqueTags.find(t => t === tagFilter) || tagFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {uniqueTags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={archiveStatusFilter} onValueChange={setArchiveStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Archive className="w-4 h-4 mr-2" />
              <SelectValue>
                {archiveStatusFilter === 'all' ? 'Todas' : archiveStatusFilter === 'active' ? 'Ativas' : 'Arquivadas'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="archived">Arquivadas</SelectItem>
              <SelectItem value="all">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              Lista
            </Button>
            <Button
              variant={viewMode === 'grouped' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grouped')}
            >
              Agrupar
            </Button>
            <Button
              variant={focusMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFocusMode(!focusMode)}
              className="flex items-center gap-2"
            >
              Modo Foco
            </Button>
          </div>

          {viewMode === 'grouped' && (
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Agrupar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="project">Projeto</SelectItem>
                <SelectItem value="assignee">Responsável</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TasksFilters;