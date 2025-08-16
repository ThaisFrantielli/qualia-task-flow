// src/pages/TaskDetailPage.tsx

import { useParams, Link } from 'react-router-dom';
import { useTask } from '@/hooks/useTasks';
import TaskDetailsContent from '@/components/tasks/TaskDetailsContent';
import { ArrowLeft } from 'lucide-react'; // 'AlertTriangle' removido
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button'; // <-- IMPORTAÇÃO DO BOTÃO ADICIONADA
import { getStatusLabel, getPriorityLabel, isOverdue } from '@/lib/utils';

const TaskDetailPage = () => {
  const { taskId } = useParams<{ taskId: string }>();
  // FIXED: Changed from 'data: task' to 'task' to match the hook's return type
  const { task, isLoading, isError, refetch } = useTask(taskId || '');

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="mt-4 h-48 w-full" />
      </div>
    );
  }
  
  if (isError || !task) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold">Tarefa não encontrada</h2>
        <p>O link pode estar quebrado ou a tarefa foi excluída.</p>
        {/* Agora o <Button> funciona */}
        <Link to="/tasks"><Button variant="outline" className="mt-4">Voltar para a Lista</Button></Link>
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
          {isOverdue(task) && <Badge variant="destructive">Atrasada</Badge>}
        </div>
      </div>
      <div className="p-6">
        <h1 className="text-3xl font-bold">{task.title}</h1>
        {task.project?.name && <p className="text-muted-foreground mt-1">No projeto: {task.project.name}</p>}
      </div>
      
      <TaskDetailsContent 
        task={task} 
        onUpdate={refetch} 
      />
    </div>
  );
};

export default TaskDetailPage;