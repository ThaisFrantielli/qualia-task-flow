// src/pages/CreateTaskPage.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CreateTaskForm from '@/components/CreateTaskForm'; // Seu componente de formulário existente

const CreateTaskPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    toast.success("Tarefa criada com sucesso!");
    navigate('/tasks'); // Volta para a lista de tarefas após o sucesso
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900/50 min-h-full">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/tasks')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a Lista de Tarefas
          </Button>
          <h1 className="text-3xl font-bold">Criar Nova Tarefa</h1>
          <p className="text-muted-foreground mt-1">Preencha os detalhes abaixo para adicionar uma nova tarefa.</p>
        </div>
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-md border">
          {/* 
            O CreateTaskForm agora é um modal, então vamos chamá-lo de forma diferente.
            Para simplificar, vamos reutilizar a lógica dele aqui diretamente 
            ou idealmente refatorar o CreateTaskForm para não ser um Dialog.
            
            Por enquanto, vamos adaptar o uso. A melhor abordagem é ter um formulário reutilizável.
            Vamos assumir que você refatorou CreateTaskForm para ser apenas o <form>.
            Se não, você pode criar um componente `TaskFormContent` e usá-lo tanto no modal quanto aqui.
          */}
          <CreateTaskForm 
            open={true} // Manter sempre "aberto" na página
            onOpenChange={() => {}} // Não faz nada, pois não é um modal aqui
            onTaskCreated={handleSuccess} 
          />
        </div>
      </div>
    </div>
  );
};

export default CreateTaskPage;