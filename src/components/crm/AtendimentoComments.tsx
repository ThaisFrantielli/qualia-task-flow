// src/components/crm/AtendimentoComments.tsx
import React from 'react';
import TaskComments from '@/components/TaskComments';

interface AtendimentoCommentsProps {
  atendimentoId: string;
}

const AtendimentoComments: React.FC<AtendimentoCommentsProps> = ({ atendimentoId }) => {
  // Usa contextType 'pos_venda' para garantir notificações e menções corretas
  return <TaskComments taskId={atendimentoId} contextType="pos_venda" />;
};

export default AtendimentoComments;
