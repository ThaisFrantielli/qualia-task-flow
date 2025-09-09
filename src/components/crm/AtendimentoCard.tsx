// src/components/crm/AtendimentoCard.tsx

import React from 'react';

// --- CORREÇÃO APLICADA AQUI ---
// O tipo 'AtendimentoComAssignee' provavelmente vem de um arquivo de tipos,
// e não do hook 'useAtendimentos'.
//
// LINHA ANTIGA (INCORRETA):
// import { AtendimentoComAssignee } from '@/hooks/useAtendimentos';
//
// LINHA NOVA (CORRIGIDA):
import { AtendimentoComAssignee } from '@/types/index'; // Ou apenas '@/types', dependendo da sua configuração

// Props que o componente espera receber
interface AtendimentoCardProps {
  atendimento: AtendimentoComAssignee;
  onClick: (id: string) => void; // Exemplo de função para quando o card for clicado
}

/**
 * Componente para exibir um resumo de um atendimento em um card.
 */
const AtendimentoCard: React.FC<AtendimentoCardProps> = ({ atendimento, onClick }) => {
  // Desestruturando os dados do atendimento para facilitar o uso
  const { id, descricao, cliente, assignee } = atendimento;

  return (
    <div 
      className="p-4 mb-4 border rounded-lg shadow-sm cursor-pointer hover:bg-gray-50"
      onClick={() => onClick(id)}
    >
      <div className="flex justify-between items-start">
        {/* Usando um fallback '??' caso o cliente não tenha nome */}
        <h3 className="font-bold text-lg">{cliente?.nome ?? 'Cliente não identificado'}</h3>
        
        {/* Exibindo a foto do responsável (assignee) se existir */}
        {assignee?.avatar_url && (
          <img 
            src={assignee.avatar_url}
            alt={assignee.full_name ?? 'Avatar'}
            className="w-10 h-10 rounded-full"
          />
        )}
      </div>

      <p className="text-gray-700 mt-2 truncate">
        {descricao ?? 'Sem descrição'}
      </p>

      <div className="mt-4 text-sm text-gray-500">
        <p>Responsável: {assignee?.full_name ?? 'Não atribuído'}</p>
      </div>
    </div>
  );
};

export default AtendimentoCard;