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
      {/* Breadcrumbs */}
      <div className="p-4 border-b">
        <nav className="flex items-center text-sm text-muted-foreground mb-2" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1">
            <li>
              <Link to="/projects" className="hover:underline flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                Projetos
              </Link>
            </li>
            {task.project?.id && (
              <li>
                <span className="mx-2">/</span>
                <Link to={`/projects/${task.project.id}`} className="hover:underline">{task.project.name}</Link>
              </li>
            )}
            <li>
              <span className="mx-2">/</span>
              <span className="font-semibold text-foreground">{task.title}</span>
            </li>
          </ol>
        </nav>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{task.title}</h1>
            {task.project?.name && <p className="text-muted-foreground mt-1">No projeto: {task.project.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge>{getPriorityLabel(task.priority)}</Badge>
            <Badge variant="outline">{getStatusLabel(task.status)}</Badge>
            {isOverdue(task) && <Badge variant="destructive">Atrasada</Badge>}
          </div>
        </div>
      </div>
      <TaskDetailsContent 
        task={task} 
        onUpdate={refetch} 
      />
    </div>
  );
};

export default TaskDetailPage;