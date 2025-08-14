// src/components/tasks/TasksFilters.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { AllTaskFilters } from '@/types';

// Props simplificadas
interface TasksFiltersProps {
  filters: AllTaskFilters;
  onFilterChange: (filterName: keyof AllTaskFilters, value: string) => void;
  onClearFilters: () => void;
}

const TasksFilters: React.FC<TasksFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  // A lógica de filtros únicos (assignees, projects) pode ser adicionada de volta aqui se necessário
  // Por enquanto, vamos manter simples para resolver os erros.

  return (
    <div className="bg-card p-4 rounded-lg border space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={filters.searchTerm}
            onChange={(e) => onFilterChange('searchTerm', e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filters.statusFilter} onValueChange={(v) => onFilterChange('statusFilter', v)}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="todo">A Fazer</SelectItem>
            <SelectItem value="progress">Em Progresso</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.priorityFilter} onValueChange={(v) => onFilterChange('priorityFilter', v)}>
          <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Prioridades</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={onClearFilters}>Limpar Filtros</Button>
      </div>
    </div>
  );
};

export default TasksFilters;