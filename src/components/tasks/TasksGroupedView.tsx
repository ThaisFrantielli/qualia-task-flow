import React from 'react';
import { Filter, FolderOpen, User as UserIcon } from 'lucide-react'; // Renomeado User para UserIcon para evitar conflito de nome
import TaskCard from '../TaskCard';
import { formatDateSafe } from '@/lib/dateUtils';
import type { Task, User } from '@/types'; // Importado o tipo Task e User centralizados

interface TasksGroupedViewProps {
  groupedTasks: Record<string, Task[]>;
  groupBy: 'status' | 'project' | 'assignee';
  onTaskClick: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: string) => void;
  onAssigneeChange: (taskId: string, newAssigneeId: string | null) => Promise<void>; // Adicionado onAssigneeChange
  availableAssignees: User[] | null; // Adicionado availableAssignees
}

const TasksGroupedView: React.FC<TasksGroupedViewProps> = ({
  groupedTasks,
  groupBy,
  onTaskClick,
  availableAssignees // Recebendo a prop
}) => {
  const getGroupTitle = (key: string) => {
    switch (groupBy) {
      case 'status': {
        const statusMap: Record<string, string> = {
          'todo': 'A Fazer',
          'progress': 'Em Andamento',
          'done': 'Concluído',
          'late': 'Atrasado'
        };
        return statusMap[key] || key;
      }
      // Adicionar casos para project e assignee se os títulos forem mapeados
        case 'project': {
          // Pode buscar o nome do projeto se o key for o ID do projeto
          // Por enquanto, apenas retorna a chave
          return key;
        }
        case 'assignee': {
           // Buscar o nome do assignee usando availableAssignees
           const assignee = availableAssignees?.find(a => a.id === key);
           return assignee ? assignee.full_name || 'Não atribuído' : key; // Usa o nome completo ou a chave
        }
      default:
        return key;
    }
  };

  // Verificar se groupedTasks é um objeto não vazio antes de Object.entries
  const hasGroupedTasks = groupedTasks && Object.keys(groupedTasks).length > 0;

  return (
    <div className="space-y-6">
      {hasGroupedTasks ? ( // Renderiza apenas se houver tarefas agrupadas
        Object.entries(groupedTasks).map(([groupKey, groupTasks]) => (
          <div key={groupKey} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {groupBy === 'status' && <Filter className="w-5 h-5 text-gray-500" />}
                {groupBy === 'project' && <FolderOpen className="w-5 h-5 text-gray-500" />}
                {groupBy === 'assignee' && <UserIcon className="w-5 h-5 text-gray-500" />}{/* Usando UserIcon */}
                <h2 className="text-xl font-semibold text-gray-900">
                  {getGroupTitle(groupKey)}
                </h2>
                <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                  {groupTasks.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupTasks.map((task) => {
                // Acessando propriedades com segurança para lidar com nulos/indefinidos
                const subtasksCompleted = 0; // TODO: Fix when subtasks are properly typed
                const subtasksTotal = 0;
                
                return (
                  <div key={task.id} onClick={() => onTaskClick(task)} className="cursor-pointer">
                    <TaskCard
                      id={task.id}
                      title={task.title}
                      description={task.description || undefined}
                      status={task.status as 'todo' | 'progress' | 'done' | 'late'}
                      priority={task.priority as 'low' | 'medium' | 'high'}
                      assignee={{
                        name: task.assignee_name || 'Não atribuído',
                        avatar: task.assignee_avatar || undefined
                      }}
                      dueDate={task.due_date ? formatDateSafe(task.due_date, 'dd/MM/yyyy') : undefined}
                      subtasks={subtasksTotal > 0 ? { completed: subtasksCompleted, total: subtasksTotal } : undefined}
                      comments={0} // TODO: Fix when comments are properly loaded
                      attachments={0} // TODO: Fix when attachments are properly loaded
                      // onStatusChange={(newStatus) => updateTaskStatus(task.id, newStatus)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))
      ) : ( // Exibe uma mensagem ou estado vazio se não houver tarefas agrupadas
         <div className="text-center text-gray-500">Nenhuma tarefa encontrada para os filtros selecionados.</div>
      )}
    </div>
  );
};

export default TasksGroupedView;
