import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Filter, Users, Calendar, AlertTriangle, Archive } from 'lucide-react';

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
  // Nova prop para o filtro de arquivamento
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
  // Receber props relacionadas ao filtro de arquivamento
  archiveStatusFilter,
  setArchiveStatusFilter
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

      {/* Grupo de Filtros de Categoria */}
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
          {/* Ajuste de largura aqui */} 
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue>
              {statusFilter === 'all' ? 'Status: Todos' :
               statusFilter === 'todo' ? 'Status: A Fazer' :
               statusFilter === 'progress' ? 'Status: Em Progresso' :
               statusFilter === 'done' ? 'Status: Concluído' :
               statusFilter === 'late' ? 'Status: Atrasado' : 'Status'}
            </SelectValue>
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
          {/* Ajuste de largura aqui */} 
          <SelectTrigger className="w-[180px]">
            {/* Não há ícone padrão para prioridade, manter apenas o texto ou adicionar um */} 
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

        {/* Filtro por Responsável */} 
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          {/* Ajuste de largura aqui */} 
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

        {/* Filtro por Tags */}
        <Select value={tagFilter} onValueChange={setTagFilter}>
          {/* Ajuste de largura aqui */} 
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

        {/* Filtro por Status de Arquivamento */}
        <Select value={archiveStatusFilter} onValueChange={setArchiveStatusFilter}>
          {/* Ajuste de largura aqui */} 
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

      {/* Grupo de Controles de Visualização */}
      <div className="flex flex-wrap gap-4 items-center">
         {/* Controles de Visualização (Lista, Agrupar, Modo Foco) */} 
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

         {/* Agrupar Por - Só aparece quando em modo agrupado */}
         {viewMode === 'grouped' && (
           <Select value={groupBy} onValueChange={setGroupBy}>
             {/* Ajuste de largura aqui */} 
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
  );
};

export default TasksFilters;