
import React from 'react';
import { Search, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];

interface TasksFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  filterPriority: string;
  setFilterPriority: (value: string) => void;
  filterProject: string;
  setFilterProject: (value: string) => void;
  groupBy: 'status' | 'project' | 'assignee';
  setGroupBy: (value: 'status' | 'project' | 'assignee') => void;
  viewMode: 'cards' | 'table';
  setViewMode: (value: 'cards' | 'table') => void;
  projects: Project[];
}

const TasksFilters: React.FC<TasksFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
  filterProject,
  setFilterProject,
  groupBy,
  setGroupBy,
  viewMode,
  setViewMode,
  projects
}) => {
  return (
    <div className="bg-white rounded-xl shadow-quality p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Busca */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tarefas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

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

        {/* Agrupar por */}
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as 'status' | 'project' | 'assignee')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          disabled={viewMode === 'table'}
        >
          <option value="status">Agrupar por Status</option>
          <option value="project">Agrupar por Projeto</option>
          <option value="assignee">Agrupar por Responsável</option>
        </select>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <Toggle 
            pressed={viewMode === 'cards'} 
            onPressedChange={() => setViewMode('cards')}
            aria-label="Visualização em cards"
          >
            <LayoutGrid className="w-4 h-4" />
          </Toggle>
          <Toggle 
            pressed={viewMode === 'table'} 
            onPressedChange={() => setViewMode('table')}
            aria-label="Visualização em tabela"
          >
            <TableIcon className="w-4 h-4" />
          </Toggle>
        </div>
      </div>
    </div>
  );
};

export default TasksFilters;
