// src/components/crm/AtendimentoComments.tsx
import React from 'react';
import TaskComments from '@/components/TaskComments';

interface AtendimentoCommentsProps {
  atendimentoId: string;
}

const AtendimentoComments: React.FC<AtendimentoCommentsProps> = ({ atendimentoId }) => {
  // Reutiliza o componente de comentários de tarefa, mas pode customizar se necessário
  return <TaskComments taskId={atendimentoId} />;
};

export default AtendimentoComments;
