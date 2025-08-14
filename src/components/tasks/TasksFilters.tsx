// src/components/tasks/TasksFilters.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Users, Folder, Tag } from 'lucide-react';
import type { Profile, Project } from '@/types';

interface TasksFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  assigneeFilter: string;
  setAssigneeFilter: (assignee: string) => void;
  projectFilter: string;
  setProjectFilter: (project: string) => void;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
  
  availableAssignees: Profile[] | null;
  uniqueTags: string[] | null;
  uniqueProjects: Project[] | null;

  // --- A CORREÇÃO ESTÁ AQUI ---
  // Trocamos 'unarchived' por 'active' para corresponder ao resto da aplicação.
  archiveStatusFilter: 'active' | 'archived' | 'all';
  setArchiveStatusFilter: (filter: 'active' | 'archived' | 'all') => void;

  hasFilters: boolean;
  onClearFilters: () => void;
  
  // As props abaixo podem ser mantidas para futuras implementações
  periodFilter: string;
  setPeriodFilter: (period: string) => void;
  viewMode: 'list' | 'grouped';
  setViewMode: (mode: 'list' | 'grouped') => void;
  focusMode: boolean;
  setFocusMode: (focus: boolean) => void;
  groupBy: 'status' | 'project' | 'assignee';
  setGroupBy: (groupBy: 'status' | 'project' | 'assignee') => void;
}

const TasksFilters: React.FC<TasksFiltersProps> = ({
  searchTerm, setSearchTerm,
  statusFilter, setStatusFilter,
  priorityFilter, setPriorityFilter,
  assigneeFilter, setAssigneeFilter,
  tagFilter, setTagFilter,
  projectFilter, setProjectFilter,
  availableAssignees, uniqueTags, uniqueProjects,
  hasFilters, onClearFilters,
}) => {

  return (
    <div className="bg-card p-4 rounded-lg border space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Filtrar por status..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="todo">A Fazer</SelectItem>
            <SelectItem value="progress">Em Progresso</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
            <SelectItem value="late">Atrasado</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger><SelectValue placeholder="Filtrar por prioridade..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Prioridades</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Assignee */}
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger>
             <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Responsável..." />
              </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Responsáveis</SelectItem>
            {availableAssignees?.map(user => (
              <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Project */}
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger>
             <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Projeto..." />
              </div>
          </SelectTrigger>
          <SelectContent>
             {/* Adicionando manualmente a opção "Todos" caso ela não venha do hook */}
            <SelectItem value="all">Todos os Projetos</SelectItem>
            {uniqueProjects?.map(proj => (
              <SelectItem key={proj.id} value={proj.id}>{proj.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tags */}
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger>
            <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Tag..." />
              </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Tags</SelectItem>
            {uniqueTags?.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>
      {hasFilters && (
        <div className="pt-2">
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Limpar todos os filtros
          </Button>
        </div>
      )}
    </div>
  );
};

export default TasksFilters;