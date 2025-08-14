// src/components/tasks/TaskLifecyclePanel.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, PlayCircle, CheckCircle, Clock } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTask } from '@/hooks/useTasks';
import type { TaskWithDetails } from '@/types';
import { toast } from 'sonner';

interface TaskLifecyclePanelProps {
  task: TaskWithDetails;
  onUpdate: () => void;
}

// Componente de item individual para manter o código limpo
const InfoItem: React.FC<{ icon: React.ElementType; label: string; value: string; color?: string }> = ({ icon: Icon, label, value, color = 'text-gray-900' }) => (
  <div className="flex items-center gap-3">
    <Icon className={`h-5 w-5 text-gray-400`} />
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-medium ${color}`}>{value}</p>
    </div>
  </div>
);

const TaskLifecyclePanel: React.FC<TaskLifecyclePanelProps> = ({ task, onUpdate }) => {
  const { updateTask, isLoading } = useTask(task.id);

  const handleStartTask = async () => {
    try {
      await updateTask({ start_date: new Date().toISOString(), status: 'progress' });
      toast.success("Tarefa iniciada!");
      onUpdate();
    } catch (error) {
      toast.error("Não foi possível iniciar a tarefa.");
    }
  };

  const handleCompleteTask = async () => {
    if (!task.start_date) {
        toast.error("Você precisa iniciar a tarefa antes de concluí-la.");
        return;
    }
    try {
      await updateTask({ end_date: new Date().toISOString(), status: 'done' });
      toast.success("Tarefa concluída!");
      onUpdate();
    } catch (error) {
      toast.error("Não foi possível concluir a tarefa.");
    }
  };
  
  const calculateDuration = () => {
    if (!task.start_date || !task.end_date) return 'N/A';
    return formatDistanceToNowStrict(new Date(task.start_date), { 
      addSuffix: false, // para não mostrar "há 2 dias"
      locale: ptBR,
      unit: 'day' // pode ser 'hour', 'minute', etc.
    });
  };

  return (
    <div className="bg-muted/50 p-4 rounded-lg">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
        {/* Criado em */}
        <InfoItem icon={Clock} label="Criado em" value={format(new Date(task.created_at), 'dd/MM/yyyy')} />
        
        {/* Prazo */}
        <InfoItem icon={Calendar} label="Prazo" value={task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : 'N/A'} />

        {/* Iniciado */}
        {task.start_date ? (
          <InfoItem icon={PlayCircle} label="Iniciado em" value={format(new Date(task.start_date), 'dd/MM/yy HH:mm')} color="text-blue-600" />
        ) : (
          <Button variant="outline" size="sm" onClick={handleStartTask} disabled={isLoading || task.status === 'done'}>
            <PlayCircle className="mr-2 h-4 w-4" /> Iniciar Tarefa
          </Button>
        )}

        {/* Concluído */}
        {task.end_date ? (
          <InfoItem icon={CheckCircle} label="Concluído em" value={format(new Date(task.end_date), 'dd/MM/yy HH:mm')} color="text-green-600" />
        ) : (
          <Button variant="outline" size="sm" onClick={handleCompleteTask} disabled={isLoading || task.status === 'done' || !task.start_date}>
            <CheckCircle className="mr-2 h-4 w-4" /> Concluir Tarefa
          </Button>
        )}

        {/* Duração */}
        <InfoItem icon={Clock} label="Tempo Gasto" value={calculateDuration()} />
      </div>
    </div>
  );
};

export default TaskLifecyclePanel;