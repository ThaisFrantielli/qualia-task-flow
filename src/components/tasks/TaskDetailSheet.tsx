// src/components/tasks/TaskDetailSheet.tsx (CÓDIGO CORRETO E COMPLETO PARA COLAR)

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useTask } from '@/hooks/useTasks';
import TaskDetailsContent from './TaskDetailsContent';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getStatusLabel, getPriorityLabel } from '@/lib/utils';

interface TaskDetailSheetProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: () => void;
}

const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({ taskId, open, onOpenChange, onTaskUpdate }) => {
  // O hook useTask busca os detalhes da tarefa usando o taskId
  const { task, isLoading, isError } = useTask(taskId || '');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full md:w-[50vw] max-w-[900px] flex flex-col p-0">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="mt-4 h-64 w-full" />
          </div>
        ) : isError || !task ? (
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold">Tarefa não encontrada</h2>
            <p className="text-muted-foreground">O link pode estar quebrado ou a tarefa foi excluída.</p>
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 border-b">
              <div className="flex justify-between items-center">
                <SheetTitle className="text-2xl font-bold truncate">{task.title}</SheetTitle>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge>{getPriorityLabel(task.priority)}</Badge>
                  <Badge variant="outline">{getStatusLabel(task.status)}</Badge>
                </div>
              </div>
              {task.project?.name && (
                <SheetDescription>No projeto: {task.project.name}</SheetDescription>
              )}
            </SheetHeader>
            <div className="flex-grow overflow-y-auto">
              <TaskDetailsContent task={task} onUpdate={onTaskUpdate} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default TaskDetailSheet;