// src/components/crm/AtendimentoAttachments.tsx
import React from 'react';
import TaskAttachments from '@/components/task/TaskAttachments';

interface AtendimentoAttachmentsProps {
  atendimentoId: string;
}

const AtendimentoAttachments: React.FC<AtendimentoAttachmentsProps> = ({ atendimentoId }) => {
  // Reutiliza o componente de anexos de tarefa, mas pode customizar se necessário
  return <TaskAttachments taskId={atendimentoId} />;
};

export default AtendimentoAttachments;
