// src/components/tasks/TaskLifecyclePanel.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, PlayCircle, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNowStrict, formatDistanceStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateSafe, parseISODateSafe, dateToLocalISO } from '@/lib/dateUtils';
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
  const { updateTask, startTask, isLoading } = useTask(task.id);

  const handleStartTask = async () => {
    try {
      await startTask();
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
      await updateTask({ end_date: dateToLocalISO(new Date()), status: 'done' });
      toast.success("Tarefa concluída!");
      onUpdate();
    } catch (error) {
      toast.error("Não foi possível concluir a tarefa.");
    }
  };
  
  const calculateDuration = () => {
    const start = parseISODateSafe(task.start_date);
    const end = parseISODateSafe(task.end_date);
    if (!start) return 'N/A';
    if (start && end) {
      return formatDistanceStrict(start, end, { locale: ptBR });
    }
    return formatDistanceToNowStrict(start, { addSuffix: false, locale: ptBR });
  };

  return (
    <div className="bg-muted/50 p-4 rounded-lg">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
        {/* Criado em */}
          <InfoItem icon={Clock} label="Criado em" value={formatDateSafe(task.created_at, 'dd/MM/yyyy')} />
        
        {/* Prazo */}
          <InfoItem icon={Calendar} label="Prazo" value={task.due_date ? formatDateSafe(task.due_date, 'dd/MM/yyyy') : 'N/A'} />

        {/* Iniciado */}
        {task.start_date ? (
          <InfoItem icon={PlayCircle} label="Iniciado em" value={formatDateSafe(task.start_date, 'dd/MM/yy HH:mm')} color="text-blue-600" />
        ) : (
          <Button variant="outline" size="sm" onClick={handleStartTask} disabled={isLoading || task.status === 'done'}>
            <PlayCircle className="mr-2 h-4 w-4" /> Iniciar Tarefa
          </Button>
        )}

        {/* Concluído */}
        {task.end_date ? (
          <InfoItem icon={CheckCircle} label="Concluído em" value={formatDateSafe(task.end_date, 'dd/MM/yy HH:mm')} color="text-green-600" />
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