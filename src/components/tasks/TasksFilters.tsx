
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, Users, Calendar, AlertTriangle } from 'lucide-react';

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
  setFocusMode
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
      {/* Filtros por período - Destaque no topo */}
      <div className="flex flex-wrap gap-2 pb-4 border-b">
        <Button
          variant={periodFilter === 'today' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPeriodFilter('today')}
          className="flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Hoje
        </Button>
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
        {/* Busca */}
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
        
        {/* Filtro por Status */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="todo">A Fazer</SelectItem>
            <SelectItem value="progress">Em Progresso</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
            <SelectItem value="late">Atrasado</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro por Prioridade */}
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>

        {/* Filtro por Responsável */}
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[150px]">
            <Users className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {uniqueAssignees.map(assignee => (
              <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro por Tags */}
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {uniqueTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Controles de Visualização */}
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
      </div>
    </div>
  );
};

export default TasksFilters;
