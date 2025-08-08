
import React from 'react';
import AtendimentoForm from '@/components/crm/AtendimentoForm';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const CreateAtendimentoPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    toast.success('Atendimento registrado com sucesso!');
    navigate('/crm-pdv'); // Assuming '/crm-pdv' is the path to the CRM dashboard page
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Registrar Novo Atendimento</h1>
      <AtendimentoForm onSuccess={handleSuccess}/>
    </div>
  );
};

export default CreateAtendimentoPage;