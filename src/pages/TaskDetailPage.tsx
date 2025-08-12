// src/pages/TaskDetailPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
// CORREÇÃO: Usar nosso hook 'useTask' que já é otimizado e tipado!
import { useTask } from '@/hooks/useTasks'; 
import TaskDetailsContent from '@/components/tasks/TaskDetailsContent';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getStatusLabel, getPriorityLabel, isOverdue } from '@/lib/utils';
// CORREÇÃO: Importar o tipo correto que o useTask retorna
import type { TaskWithDetails } from '@/types'; 

const TaskDetailPage = () => {
  const { taskId } = useParams<{ taskId: string }>();

  // CORREÇÃO: Simplificar a busca de dados usando nosso hook 'useTask'.
  // O 'enabled: !!taskId' garante que a query só rode se o taskId existir.
  const { data: task, isLoading, isError, refetch } = useTask(taskId || '');

  // Estado de carregamento
  if (isLoading) {
    return (
        <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-3/4" />
            <div className="space-y-4 mt-8"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
        </div>
    );
  }

  // Estado de erro ou se a tarefa não for encontrada
  if (isError || !task) {
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

  // Se chegou aqui, 'task' é um objeto válido e não nulo.
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b flex justify-between items-center">
        <Link to="/tasks" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para a Lista
        </Link>
        <div className="flex items-center gap-2">
            {/* O TypeScript agora sabe que task.priority e task.status existem */}
            <Badge>{getPriorityLabel(task.priority)}</Badge>
            <Badge variant="outline">{getStatusLabel(task.status)}</Badge>
            {isOverdue(task as any) && <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Atrasada</Badge>}
        </div>
      </div>

      <div className="p-6">
        <h1 className="text-3xl font-bold">{task.title}</h1>
        {/* Agora acessamos o projeto de forma segura, pois TaskWithDetails o inclui */}
        {task.project?.name && <p className="text-muted-foreground mt-1">No projeto: {task.project.name}</p>}
      </div>
      
      {/* CORREÇÃO FINAL: Esta linha agora é 100% segura. 
          O TypeScript sabe que 'task' é do tipo 'TaskWithDetails',
          que é o que o 'TaskDetailsContent' espera. */}
      <TaskDetailsContent task={task as TaskWithDetails} onUpdate={refetch} />
    </div>
  );
};

export default TaskDetailPage;