// src/components/tasks/TasksFilters.tsx

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useTeams } from '@/hooks/useTeams';
import type { AllTaskFilters } from '@/types';

interface TasksFiltersProps {
  filters: Partial<AllTaskFilters>;
  onFilterChange: (filterName: keyof AllTaskFilters, value: string) => void;
  onClearFilters: () => void;
}

const TasksFilters: React.FC<TasksFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const { teams } = useTeams();

  return (
    <div className="bg-card p-4 rounded-lg border space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={'searchTerm' in filters ? (filters.searchTerm as string) || '' : ''}
            onChange={(e) => onFilterChange('searchTerm' as keyof AllTaskFilters, e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={'statusFilter' in filters ? (filters.statusFilter as string) || 'all' : 'all'} onValueChange={(v) => onFilterChange('statusFilter' as keyof AllTaskFilters, v)}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="todo">A Fazer</SelectItem>
            <SelectItem value="progress">Em Progresso</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <Select value={'priorityFilter' in filters ? (filters.priorityFilter as string) || 'all' : 'all'} onValueChange={(v) => onFilterChange('priorityFilter' as keyof AllTaskFilters, v)}>
          <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Prioridades</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
        <Select value={'teamFilter' in filters ? (filters.teamFilter as string) || 'all' : 'all'} onValueChange={(v) => onFilterChange('teamFilter' as keyof AllTaskFilters, v)}>
          <SelectTrigger><SelectValue placeholder="Equipe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Equipes</SelectItem>
            {teams.map((team: any) => (
              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TasksFilters;