// src/components/tasks/TasksKanbanView.tsx
import { useMemo } from 'react';
import { useDrop, useDrag, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDateSafe } from '@/lib/dateUtils';
import { getInitials, cn } from '@/lib/utils';
import { Calendar, AlertTriangle } from 'lucide-react';
import type { TaskWithDetails } from '@/types';

const KANBAN_COLUMNS = [
  { key: 'todo', label: 'A Fazer', color: 'bg-muted' },
  { key: 'progress', label: 'Em Progresso', color: 'bg-primary/10' },
  { key: 'done', label: 'Concluído', color: 'bg-success/10' },
];

interface TasksKanbanViewProps {
  tasks: TaskWithDetails[];
  onTaskClick: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
}

interface TaskCardProps {
  task: TaskWithDetails;
  onClick: () => void;
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'TASK',
    item: { id: task.id, status: task.status },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  const priorityColors = {
    high: 'border-l-destructive',
    medium: 'border-l-warning',
    low: 'border-l-muted-foreground',
  };

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={cn(
        "p-3 bg-card border rounded-lg cursor-pointer hover:shadow-md transition-all border-l-4",
        priorityColors[task.priority as keyof typeof priorityColors] || 'border-l-muted',
        isDragging && "opacity-50 shadow-lg",
        task.status === 'done' && "opacity-60"
      )}
    >
      <h4 className={cn(
        "font-medium text-sm line-clamp-2 mb-2",
        task.status === 'done' && "line-through"
      )}>
        {task.title}
      </h4>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={task.assignee.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {getInitials(task.assignee.full_name)}
              </AvatarFallback>
            </Avatar>
          )}
          
          {task.project && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {task.project.name}
            </Badge>
          )}
        </div>

        {task.due_date && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}>
            {isOverdue && <AlertTriangle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" />
            {formatDateSafe(task.due_date, 'dd/MM')}
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  status: string;
  label: string;
  colorClass: string;
  tasks: TaskWithDetails[];
  onTaskClick: (taskId: string) => void;
  onDrop: (taskId: string, newStatus: string) => void;
}

function KanbanColumn({ status, label, colorClass, tasks, onTaskClick, onDrop }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (item: { id: string; status: string }) => {
      if (item.status !== status) {
        onDrop(item.id, status);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={cn(
        "flex-1 min-w-[280px] rounded-lg p-3 transition-colors",
        colorClass,
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{label}</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>

      <div className="space-y-2 min-h-[200px]">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task.id)}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma tarefa
          </div>
        )}
      </div>
    </div>
  );
}

export function TasksKanbanView({ tasks, onTaskClick, onStatusChange }: TasksKanbanViewProps) {
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, TaskWithDetails[]> = {};
    KANBAN_COLUMNS.forEach(col => {
      grouped[col.key] = [];
    });
    
    tasks.forEach(task => {
      const status = task.status || 'todo';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped['todo'].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleDrop = async (taskId: string, newStatus: string) => {
    await onStatusChange(taskId, newStatus);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map(column => (
          <KanbanColumn
            key={column.key}
            status={column.key}
            label={column.label}
            colorClass={column.color}
            tasks={tasksByStatus[column.key] || []}
            onTaskClick={onTaskClick}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </DndProvider>
  );
}

export default TasksKanbanView;
