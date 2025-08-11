// src/pages/Tasks.tsx

import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; // 1. Importar useNavigate
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTasks, AllTaskFilters } from '@/hooks/useTasks';
import TasksFilters from '@/components/tasks/TasksFilters';
import { Skeleton } from '@/components/ui/skeleton';
import TasksEmptyState from '@/components/tasks/TasksEmptyState';
import TaskTableRow from '@/components/tasks/TaskTableRow';
import type { Task } from '@/types';

const TasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate(); // 2. Inicializar o hook de navegação

  const [filters, setFilters] = useState<AllTaskFilters>({
    searchTerm: searchParams.get('q') || '',
    statusFilter: searchParams.get('status') || 'all',
    priorityFilter: searchParams.get('priority') || 'all',
    assigneeFilter: searchParams.get('assignee') || 'all',
    projectFilter: searchParams.get('project') || 'all',
    tagFilter: searchParams.get('tag') || 'all',
    archiveStatusFilter: (searchParams.get('archived') as AllTaskFilters['archiveStatusFilter']) || 'active',
  });

  const { tasks, loading, uniqueTags, availableAssignees, uniqueProjects } = useTasks(filters);
  
  // O estado 'selectedTask' para o modal não é mais necessário aqui
  // const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  React.useEffect(() => {
    const newSearchParams = new URLSearchParams();
    if (filters.searchTerm) newSearchParams.set('q', filters.searchTerm);
    if (filters.statusFilter !== 'all') newSearchParams.set('status', filters.statusFilter);
    if (filters.priorityFilter !== 'all') newSearchParams.set('priority', filters.priorityFilter);
    if (filters.assigneeFilter !== 'all') newSearchParams.set('assignee', filters.assigneeFilter);
    if (filters.projectFilter !== 'all') newSearchParams.set('project', filters.projectFilter);
    if (filters.tagFilter !== 'all') newSearchParams.set('tag', filters.tagFilter);
    if (filters.archiveStatusFilter !== 'active') newSearchParams.set('archived', filters.archiveStatusFilter);
    
    setSearchParams(newSearchParams, { replace: true });
  }, [filters, setSearchParams]);

  const handleFilterChange = (filterName: keyof AllTaskFilters, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '', statusFilter: 'all', priorityFilter: 'all',
      assigneeFilter: 'all', projectFilter: 'all', tagFilter: 'all',
      archiveStatusFilter: 'active',
    });
  };

  const hasFilters = useMemo(() => { /* ... sua lógica ... */ return false; }, [filters]);

  // 3. Nova função para navegar para a página de detalhes
  const handleViewDetails = (task: Task) => {
    navigate(`/tasks/${task.id}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Minhas Tarefas</h1>
          <p className="text-gray-600">Visualize e gerencie todas as suas atividades.</p>
        </div>
        <Button onClick={() => alert("Abrir modal de nova tarefa")}>
          <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
        </Button>
      </div>

      <TasksFilters
        searchTerm={filters.searchTerm}
        setSearchTerm={(val) => handleFilterChange('searchTerm', val)}
        statusFilter={filters.statusFilter}
        setStatusFilter={(val) => handleFilterChange('statusFilter', val)}
        priorityFilter={filters.priorityFilter}
        setPriorityFilter={(val) => handleFilterChange('priorityFilter', val)}
        assigneeFilter={filters.assigneeFilter}
        setAssigneeFilter={(val) => handleFilterChange('assigneeFilter', val)}
        projectFilter={filters.projectFilter}
        setProjectFilter={(val) => handleFilterChange('projectFilter', val)}
        tagFilter={filters.tagFilter}
        setTagFilter={(val) => handleFilterChange('tagFilter', val)}
        archiveStatusFilter={filters.archiveStatusFilter}
        setArchiveStatusFilter={(val) => handleFilterChange('archiveStatusFilter', val)}
        uniqueTags={uniqueTags}
        availableAssignees={availableAssignees}
        uniqueProjects={uniqueProjects}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        periodFilter="" setPeriodFilter={() => {}}
        viewMode="list" setViewMode={() => {}}
        focusMode={false} setFocusMode={() => {}}
        groupBy="status" setGroupBy={() => {}}
      />

      <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Tarefa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))
            ) : tasks.length > 0 ? (
              tasks.map(task => (
                // 4. Passar a nova função de navegação para a linha da tabela
                <TaskTableRow 
                  key={task.id} 
                  task={task} 
                  onViewDetails={handleViewDetails}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5}>
                  <TasksEmptyState 
                    hasFilters={hasFilters}
                    focusMode={false}
                    onCreateTask={() => alert("Abrir modal de nova tarefa")}
                    onClearFilters={clearFilters}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 5. O modal de detalhes foi REMOVIDO daqui */}
    </div>
  );
};

export default TasksPage;