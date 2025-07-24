
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import TaskTableRow from './table/TaskTableRow';
// import type { Database } from '@/integrations/supabase/types'; // Removida esta importação
import type { Task } from '@/types'; // Mantida apenas a importação de Task de src/types/index.ts

// A definição de Task será importada de src/types/index.ts agora
// Removida a definição manual local de Task:
// type Task = Database['public']['Tables']['tasks']['Row'] & {
//   project?: Database['public']['Tables']['projects']['Row'];
//   subtasks?: Database['public']['Tables']['subtasks']['Row'][];
//   comments?: Database['public']['Tables']['comments']['Row'][];
//   attachments?: Database['public']['Tables']['attachments']['Row'][];
// };

interface TaskTableProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: string) => void;
  onArchiveTask?: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onPriorityChange: (taskId: string, newPriority: string) => Promise<void>;
  onAssigneeChange: (taskId: string, newAssigneeId: string | null) => Promise<void>;
  // O tipo de availableAssignees pode precisar ser ajustado para ser compatível com src/types/index.ts se User tiver full_name
  availableAssignees: { id: string; full_name: string | null; avatar_url?: string | null }[]; 
  isLoading: boolean;
}

const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onTaskClick,
  onStatusChange,
  onArchiveTask,
  onDeleteTask,
  onPriorityChange,
  onAssigneeChange,
  availableAssignees,
  isLoading
}) => {
  // Transform availableAssignees to match the type expected by TaskTableRow (que agora usa o tipo de index.ts)
  // O tipo esperado por TaskTableRow para availableAssignees é { id: string; name: string; avatar_url?: string | null }[]
  const formattedAssignees = availableAssignees.map(assignee => ({
    id: assignee.id,
    name: assignee.full_name || '', // Mapeia full_name para name
    avatar_url: assignee.avatar_url,
  }));

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
              onPriorityChange={onPriorityChange}
              onAssigneeChange={onAssigneeChange}
              availableAssignees={formattedAssignees} // Passa o array transformado
              isLoading={isLoading} // Passa o array transformado
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TaskTable;
