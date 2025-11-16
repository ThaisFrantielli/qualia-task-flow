import React, { useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import TaskCard from './TaskCard';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const DragDropKanban: React.FC = () => {
  const { tasks, updateTask, createTask } = useTasks();
  const { user } = useAuth();
  const dragCounter = useRef(0);

  const columns = [
    { id: 'todo', title: 'A Fazer', color: 'bg-gray-400' },
    { id: 'progress', title: 'Em Progresso', color: 'bg-blue-500' },
    { id: 'done', title: 'Concluído', color: 'bg-green-500' },
    { id: 'late', title: 'Atrasado', color: 'bg-red-500' }
  ];

  const handleDragStart = (e: React.DragEvent, taskId: string, fromStatus: string) => {
    try {
      const payload = JSON.stringify({ id: taskId, from: fromStatus });
      // set both types to be robust across browsers
      e.dataTransfer.setData('application/json', payload);
      e.dataTransfer.setData('text/plain', payload);
      e.dataTransfer.effectAllowed = 'move';
    } catch (err) {
      console.error('Erro iniciando drag:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    const element = e.currentTarget as HTMLElement;
    element.classList.add('bg-blue-50', 'border-blue-300');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      const element = e.currentTarget as HTMLElement;
      element.classList.remove('bg-blue-50', 'border-blue-300');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    const element = e.currentTarget as HTMLElement;
    element.classList.remove('bg-blue-50', 'border-blue-300');
    try {
      // Try application/json first, fallback to text/plain
      let raw = e.dataTransfer.getData('application/json');
      if (!raw) raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const payload = JSON.parse(raw) as { id: string; from: string };
      const targetColumn = (e.currentTarget as HTMLElement).getAttribute('data-column');
      if (!payload?.id || !targetColumn) return;
      if (payload.from === targetColumn) return; // nothing to do

      // call updateTask to change status
      if (updateTask) {
        try {
          await updateTask({ id: payload.id, updates: { status: targetColumn } as any });
          toast.success('Tarefa movida');
        } catch (err: any) {
          console.error('Erro ao atualizar tarefa:', err);
          toast.error('Erro ao mover tarefa', { description: err?.message || String(err) });
        }
      }
    } catch (err) {
      console.error('Erro ao processar drop:', err);
    }
  };

  const getTasksForStatus = (status: string) => {
    return tasks.filter(task => task.status === status && !task.archived);
  };

  return (
    <div className="flex gap-6 overflow-x-auto p-6">
      {columns.map((column) => {
        const columnTasks = getTasksForStatus(column.id);
        
        return (
          <div
            key={column.id}
            className="bg-gray-50 rounded-lg p-4 min-h-[600px] w-80 border-2 border-transparent transition-all duration-200"
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e)}
            data-column={column.id}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                <h2 className="font-semibold text-gray-900">{column.title}</h2>
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 min-h-[120px] flex flex-col justify-center">
              {columnTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400 select-none">
                  <svg width="48" height="48" fill="none" viewBox="0 0 48 48" className="mx-auto mb-2 opacity-60">
                    <circle cx="24" cy="24" r="22" stroke="#e5e7eb" strokeWidth="2" fill="#f9fafb" />
                    <path d="M16 24h16M24 16v16" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className="block text-sm">
                    {column.id === 'todo' && 'Nenhuma tarefa a fazer.'}
                    {column.id === 'progress' && 'Nenhuma tarefa em progresso.'}
                    {column.id === 'done' && 'Tudo concluído por aqui! ✨'}
                    {column.id === 'late' && 'Sem tarefas atrasadas.'}
                  </span>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id, task.status)}
                    className="cursor-move hover:shadow-lg transition-shadow"
                  >
                    <TaskCard
                      id={task.id}
                      title={task.title}
                      description={task.description || ''}
                      status={task.status as 'todo' | 'progress' | 'done' | 'late'}
                      priority={task.priority as 'low' | 'medium' | 'high'}
                      assignee={{
                        name: task.assignee_name || 'Não atribuído',
                        avatar: task.assignee_avatar || undefined
                      }}
                      dueDate={task.due_date || undefined}
                      subtasks={{
                        completed: task.subtasks?.filter((st: { completed: boolean }) => st.completed).length || 0,
                        total: task.subtasks?.length || 0
                      }}
                      comments={task.comments?.length || 0}
                      attachments={task.attachments?.length || 0}
                    />
                  </div>
                ))
              )}
            </div>

            <button
              onClick={async () => {
                try {
                  const taskData: any = { title: 'Nova tarefa (sem título)', status: column.id, priority: 'medium' };
                  if (user?.id) taskData.user_id = user.id;
                  await createTask(taskData);
                  toast.success('Tarefa criada');
                } catch (err: any) {
                  console.error('Erro criando tarefa:', err);
                  toast.error('Erro ao criar tarefa', { description: err?.message || String(err) });
                }
              }}
              className="w-full mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar tarefa</span>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default DragDropKanban;
