// src/pages/Tasks.tsx

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTasks, TaskFilters } from '@/hooks/useTasks';
import TasksFilters from '@/components/tasks/TasksFilters';
import { Skeleton } from '@/components/ui/skeleton';
import TasksEmptyState from '@/components/tasks/TasksEmptyState';
import TaskTableRow from '@/components/tasks/TaskTableRow';
import type { TaskWithDetails, Profile, Project } from '@/types';

const TasksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<TaskFilters>({
    searchTerm: searchParams.get('q') || '',
    statusFilter: searchParams.get('status') || 'all',
    priorityFilter: searchParams.get('priority') || 'all',
    assigneeFilter: searchParams.get('assignee') || 'all',
    projectFilter: searchParams.get('project') || 'all',
    tagFilter: searchParams.get('tag') || 'all',
    archiveStatusFilter: (searchParams.get('archived') as TaskFilters['archiveStatusFilter']) || 'unarchived',
  });

  const { data: tasks, isLoading: loading } = useTasks(filters);
  
  // A lógica para calcular filtros únicos está correta.
  const availableAssignees = useMemo(() => {
    if (!tasks) return [];
    const assigneesMap = new Map<string, Profile>();
    tasks.forEach(task => { if (task.assignee) assigneesMap.set(task.assignee.id, task.assignee); });
    return Array.from(assigneesMap.values());
  }, [tasks]);

  const uniqueProjects = useMemo(() => {
    if (!tasks) return [];
    const projectsMap = new Map<string, Project>();
    tasks.forEach(task => { if (task.project) projectsMap.set(task.project.id, task.project); });
    const allProjects: Project = { id: 'all', name: 'Todos os Projetos', created_at: '', updated_at: '', description: null, color: null, user_id: null };
    return [allProjects, ...Array.from(projectsMap.values())];
  }, [tasks]);

  const uniqueTags = useMemo(() => {
    if (!tasks) return [];
    const tagsSet = new Set<string>();
    tasks.forEach(task => { if (task.tags) { String(task.tags).split(',').forEach(tag => { if (tag.trim()) tagsSet.add(tag.trim()); }); } });
    return Array.from(tagsSet);
  }, [tasks]);
  
  const safeTasks = tasks ?? [];
  
  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    if (filters.searchTerm) newSearchParams.set('q', filters.searchTerm);
    if (filters.archiveStatusFilter !== 'unarchived') newSearchParams.set('archived', filters.archiveStatusFilter!);
    setSearchParams(newSearchParams, { replace: true });
  }, [filters, setSearchParams]);

  const handleFilterChange = (filterName: keyof TaskFilters, value: any) => {
    setFilters((prev: TaskFilters) => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '', statusFilter: 'all', priorityFilter: 'all',
      assigneeFilter: 'all', projectFilter: 'all', tagFilter: 'all',
      archiveStatusFilter: 'unarchived',
    });
  };

  const hasFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'searchTerm') return !!value;
      if (key === 'archiveStatusFilter') return value !== 'unarchived';
      return value !== 'all';
    });
  }, [filters]);

  const handleViewDetails = (task: TaskWithDetails) => {
    navigate(`/tasks/${task.id}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Minhas Tarefas</h1><p className="text-gray-600">Visualize e gerencie todas as suas atividades.</p></div>
        <Button onClick={() => navigate('/tasks/new')}><Plus className="mr-2 h-4 w-4" /> Nova Tarefa</Button>
      </div>

      <TasksFilters
        // CORREÇÃO: Usar o operador "nullish coalescing" (??) para fornecer um valor padrão.
        searchTerm={filters.searchTerm ?? ''}
        setSearchTerm={(val) => handleFilterChange('searchTerm', val)}
        statusFilter={filters.statusFilter ?? 'all'}
        setStatusFilter={(val) => handleFilterChange('statusFilter', val)}
        priorityFilter={filters.priorityFilter ?? 'all'}
        setPriorityFilter={(val) => handleFilterChange('priorityFilter', val)}
        assigneeFilter={filters.assigneeFilter ?? 'all'}
        setAssigneeFilter={(val) => handleFilterChange('assigneeFilter', val)}
        projectFilter={filters.projectFilter ?? 'all'}
        setProjectFilter={(val) => handleFilterChange('projectFilter', val)}
        tagFilter={filters.tagFilter ?? 'all'}
        setTagFilter={(val) => handleFilterChange('tagFilter', val)}
        archiveStatusFilter={filters.archiveStatusFilter ?? 'unarchived'}
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
              <TableHead className="w-[45%]">Tarefa</TableHead><TableHead>Status</TableHead><TableHead>Prioridade</TableHead><TableHead>Responsável</TableHead><TableHead className="text-right w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 7 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell></TableRow>))
            ) : safeTasks.length > 0 ? (
              safeTasks.map((task: TaskWithDetails) => (<TaskTableRow key={task.id} task={task} onViewDetails={handleViewDetails} />))
            ) : (
              <TableRow><TableCell colSpan={5}><TasksEmptyState hasFilters={hasFilters} focusMode={false} onCreateTask={() => navigate('/tasks/new')} onClearFilters={clearFilters} /></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TasksPage;