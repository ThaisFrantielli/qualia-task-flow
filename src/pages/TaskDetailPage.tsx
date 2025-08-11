// src/pages/TaskDetailPage.tsx

import React, { useState, useEffect, useCallback } from 'react'; // <-- CORREÇÃO AQUI
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { Task } from '@/types';
import TaskDetailsContent from '@/components/tasks/TaskDetailsContent';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // Adicionado Button
import { getStatusLabel, getPriorityLabel, isOverdue } from '@/lib/utils';

const TaskDetailPage = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*, project:projects(name), assignee:profiles(full_name, avatar_url)')
      .eq('id', taskId)
      .single();
    
    if (error) {
      toast.error("Erro ao carregar tarefa", { description: error.message });
      setTask(null);
    } else {
      const formattedTask = {
          ...data,
          assignee_name: data.assignee?.full_name,
          assignee_avatar: data.assignee?.avatar_url
      };
      setTask(formattedTask as any);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  if (loading) {
    return (
        <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-3/4" />
            <div className="space-y-4 mt-8"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
        </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 text-center mt-16">
        <h2 className="text-xl font-semibold">Tarefa não encontrada</h2>
        <p className="text-muted-foreground mt-2">O link pode estar quebrado ou a tarefa foi excluída.</p>
        <Link to="/tasks" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para a Lista de Tarefas
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b flex justify-between items-center">
        <Link to="/tasks" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para a Lista
        </Link>
        <div className="flex items-center gap-2">
            <Badge>{getPriorityLabel(task.priority)}</Badge>
            <Badge variant="outline">{getStatusLabel(task.status)}</Badge>
            {isOverdue(task) && <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Atrasada</Badge>}
        </div>
      </div>

      <div className="p-6">
        <h1 className="text-3xl font-bold">{task.title}</h1>
        {task.project?.name && <p className="text-muted-foreground mt-1">No projeto: {task.project.name}</p>}
      </div>
      
      <TaskDetailsContent task={task} onUpdate={fetchTask} />
    </div>
  );
};

export default TaskDetailPage;