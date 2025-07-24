
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import TaskTableRow from './table/TaskTableRow';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'] & {
  project?: Database['public']['Tables']['projects']['Row'];
  subtasks?: Database['public']['Tables']['subtasks']['Row'][];
  comments?: Database['public']['Tables']['comments']['Row'][];
  attachments?: Database['public']['Tables']['attachments']['Row'][];
};

interface TaskTableProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onArchiveTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onPriorityChange: (taskId: string, newPriority: string) => Promise<void>; // Added onPriorityChange
  onAssigneeChange: (taskId: string, newAssigneeId: string | null) => Promise<void>; // Added onAssigneeChange
  availableAssignees: { id: string; full_name: string | null; avatar_url?: string | null }[]; // Added availableAssignees
  isLoading: boolean; // Added isLoading
}

const TaskTable: React.FC<TaskTableProps> = ({ 
  tasks, 
  onTaskClick, 
  onStatusChange, 
  onArchiveTask, 
  onDeleteTask,
  onPriorityChange, // Destructure onPriorityChange
  onAssigneeChange, // Destructure onAssigneeChange
  availableAssignees, // Destructure availableAssignees
  isLoading // Destructure isLoading
}) => {
  return (
    <div className="bg-white rounded-xl shadow-quality overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Tarefa</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Projeto</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TaskTableRow
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
              onStatusChange={onStatusChange}
              onArchiveTask={onArchiveTask}
              onDeleteTask={onDeleteTask}
              onPriorityChange={onPriorityChange} // Pass down onPriorityChange
              onAssigneeChange={onAssigneeChange} // Pass down onAssigneeChange
              availableAssignees={availableAssignees} // Pass down availableAssignees
              isLoading={isLoading} // Pass down isLoading
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskTable;
