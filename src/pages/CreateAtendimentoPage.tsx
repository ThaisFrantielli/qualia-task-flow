// src/pages/CreateAtendimentoPage.tsx

import React from 'react';
import AtendimentoForm from '@/components/crm/AtendimentoForm';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CreateAtendimentoPage: React.FC = () => {
  const navigate = useNavigate();

  // Esta função agora corresponde à nova assinatura da prop onSuccess
  const handleSuccess = (newAtendimentoId: number) => {
    toast.success(`Atendimento #${newAtendimentoId} registrado com sucesso!`);
    navigate('/pos-vendas');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900/50 min-h-full">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/pos-vendas')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Pós-Vendas
          </Button>
          <h1 className="text-3xl font-bold">Registrar Novo Atendimento</h1>
          <p className="text-muted-foreground mt-1">Preencha os detalhes abaixo para criar uma nova solicitação.</p>
        </div>
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-md border">
          <AtendimentoForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
};

export default CreateAtendimentoPage;