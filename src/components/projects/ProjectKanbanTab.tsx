// src/components/projects/ProjectKanbanTab.tsx
import { useMemo } from 'react';
import { DndProvider, useDrop, useDrag } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDateSafe } from '@/lib/dateUtils';
import { getInitials, cn } from '@/lib/utils';
import { Calendar, AlertTriangle, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { dateToLocalDateOnlyISO } from '@/lib/dateUtils';
import type { TaskWithDetails } from '@/types';

interface ProjectSection {
  id: string;
  name: string;
  color: string | null;
}

interface ProjectKanbanTabProps {
  tasks: TaskWithDetails[];
  sections: ProjectSection[];
  onTaskClick: (taskId: string) => void;
  onTaskUpdate?: () => void;
}

interface TaskCardProps {
  task: TaskWithDetails;
  onClick: () => void;
  onToggleComplete: () => void;
}

function TaskCard({ task, onClick, onToggleComplete }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'PROJECT_TASK',
    item: { id: task.id, section: task.section },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const isCompleted = task.status === 'done';

  return (
    <div
      ref={drag}
      className={cn(
        "group flex items-start gap-2 p-3 bg-card border rounded-lg cursor-pointer hover:shadow-md transition-all",
        isDragging && "opacity-50 shadow-lg",
        isCompleted && "opacity-60"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 mt-0.5 cursor-grab" />
      
      <Checkbox
        checked={isCompleted}
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete();
        }}
        className="mt-0.5"
      />

      <div className="flex-1 min-w-0" onClick={onClick}>
        <h4 className={cn(
          "font-medium text-sm line-clamp-2",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.title}
        </h4>

        <div className="flex items-center gap-2 mt-2">
          {task.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={task.assignee.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {getInitials(task.assignee.full_name)}
              </AvatarFallback>
            </Avatar>
          )}

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
    </div>
  );
}

interface SectionColumnProps {
  section: ProjectSection | { id: string; name: string; color: null };
  tasks: TaskWithDetails[];
  onTaskClick: (taskId: string) => void;
  onDrop: (taskId: string, sectionId: string | null) => void;
  onToggleComplete: (taskId: string) => void;
}

function SectionColumn({ section, tasks, onTaskClick, onDrop, onToggleComplete }: SectionColumnProps) {
  const [{ isOver }, drop] = useDrop({
    accept: 'PROJECT_TASK',
    drop: (item: { id: string; section: string | null }) => {
      const targetSection = section.id === 'general' ? null : section.id;
      if (item.section !== targetSection) {
        onDrop(item.id, targetSection);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const completedCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div
      ref={drop}
      className={cn(
        "flex-1 min-w-[280px] rounded-lg p-3 bg-muted/30 transition-colors",
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        {section.color && (
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: section.color }}
          />
        )}
        <h3 className="font-semibold text-sm flex-1">{section.name}</h3>
        <Badge variant="secondary" className="text-xs">
          {completedCount}/{tasks.length}
        </Badge>
      </div>

      <div className="space-y-2 min-h-[150px]">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task.id)}
            onToggleComplete={() => onToggleComplete(task.id)}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
            Arraste tarefas aqui
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectKanbanTab({ tasks, sections, onTaskClick, onTaskUpdate }: ProjectKanbanTabProps) {
  const tasksBySection = useMemo(() => {
    const grouped: Record<string, TaskWithDetails[]> = { general: [] };
    
    sections.forEach(s => {
      grouped[s.id] = [];
    });

    tasks.forEach(task => {
      const matched = sections.find(s => s.id === task.section || s.name === task.section);
      const sectionId = matched ? matched.id : 'general';
      if (!grouped[sectionId]) {
        grouped[sectionId] = [];
      }
      grouped[sectionId].push(task);
    });

    return grouped;
  }, [tasks, sections]);

  const handleDrop = async (taskId: string, newSection: string | null) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ section: newSection })
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('Tarefa movida!');
      onTaskUpdate?.();
    } catch (err) {
      toast.error('Erro ao mover tarefa');
    }
  };

  const handleToggleComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'done' ? 'todo' : 'done';

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          end_date: newStatus === 'done' ? dateToLocalDateOnlyISO(new Date()) : null
        })
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success(newStatus === 'done' ? 'Tarefa concluída!' : 'Tarefa reaberta');
      onTaskUpdate?.();
    } catch (err) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const allSections = [
    { id: 'general', name: 'Tarefas Gerais', color: null },
    ...sections,
  ];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {allSections.map(section => (
          <SectionColumn
            key={section.id}
            section={section}
            tasks={tasksBySection[section.id] || []}
            onTaskClick={onTaskClick}
            onDrop={handleDrop}
            onToggleComplete={handleToggleComplete}
          />
        ))}
      </div>
    </DndProvider>
  );
}

export default ProjectKanbanTab;
