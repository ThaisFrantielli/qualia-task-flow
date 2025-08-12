// src/components/TaskDetailsModal.tsx

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import TaskDetailsContent from './tasks/TaskDetailsContent'; // <-- Reutilizando o componente!
import { useTask } from '@/hooks/useTasks'; // <-- Usando o hook correto para buscar os dados
import type { TaskWithDetails } from '@/types'; // <-- Importando o tipo correto

interface TaskDetailsModalProps {
  taskId: string | null; // O modal agora só precisa do ID da tarefa
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdate: () => void; // Função para notificar a página principal que a tarefa foi atualizada
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ taskId, open, onOpenChange, onTaskUpdate }) => {
  // 1. Busca os dados da tarefa AQUI, usando o ID.
  // O 'enabled: !!taskId' garante que a busca só acontece se tivermos um ID.
  const { data: task, isLoading, isError } = useTask(taskId || '');

  const renderContent = () => {
    // 2. Mostra um estado de carregamento enquanto a tarefa está sendo buscada.
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    // 3. Mostra um estado de erro se a busca falhar.
    if (isError || !task) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-destructive">Não foi possível carregar a tarefa.</p>
        </div>
      );
    }
    
    // 4. Se tudo deu certo, renderiza o componente de conteúdo, passando a tarefa carregada.
    //    Isso garante que TaskDetailsContent SEMPRE receberá uma tarefa válida.
    return (
      <TaskDetailsContent task={task as TaskWithDetails} onUpdate={onTaskUpdate} />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 sm:rounded-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b">
          {/* O título pode ser dinâmico ou estático */}
          <DialogTitle className="text-2xl font-semibold">
            {isLoading ? 'Carregando...' : task?.title || 'Detalhes da Tarefa'}
          </DialogTitle>
          {task?.project?.name && (
              <DialogDescription>No projeto: {task.project.name}</DialogDescription>
          )}
        </DialogHeader>
        
        {/* O conteúdo é renderizado pela nossa função de controle */}
        {renderContent()}

      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;