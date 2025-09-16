// src/components/crm/AtendimentosTable.tsx (VERSÃO AJUSTADA PARA O HUB DO CLIENTE)

import React from 'react';
import type { Atendimento } from '@/types'; // <-- Corrigido para importar de @/types
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface AtendimentosTableProps {
  atendimentos: Atendimento[];
  // Tornamos onRowClick opcional, pois a navegação pode ser feita aqui
  onRowClick?: (atendimento: Atendimento) => void;
}

const AtendimentosTable: React.FC<AtendimentosTableProps> = ({ atendimentos, onRowClick }) => {
  const navigate = useNavigate();

  // Função para lidar com o clique: ou usa a prop ou navega para a página de detalhes
  const handleRowClick = (atendimento: Atendimento) => {
    if (onRowClick) {
      onRowClick(atendimento);
    } else {
      // Navega para a página de detalhes do Pós-Vendas
      navigate(`/pos-vendas/${atendimento.id}`);
    }
  };
  
  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {/* AJUSTE: Colunas mais focadas para a visão de detalhes do cliente */}
            <th className="px-4 py-3 text-left font-medium">ID</th>
            <th className="px-4 py-3 text-left font-medium">Contato</th>
            <th className="px-4 py-3 text-left font-medium">Motivo</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Criado em</th>
            <th className="px-4 py-3 text-left font-medium">Análise Final</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {atendimentos.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum atendimento encontrado para este cliente.</td>
            </tr>
          ) : (
            atendimentos.map(at => (
              <tr key={at.id} className="hover:bg-muted cursor-pointer" onClick={() => handleRowClick(at)}>
                {/* AJUSTE: Removida a coluna 'client_name' que era redundante aqui */}
                <td className="px-4 py-2 font-mono text-xs">#{at.id}</td>
                <td className="px-4 py-2 font-medium">{at.contact_person || '-'}</td>
                <td className="px-4 py-2">{at.reason || '-'}</td>
                <td className="px-4 py-2"><Badge variant="outline">{at.status}</Badge></td>
                <td className="px-4 py-2">{new Date(at.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-2">
                  {at.status === 'Resolvido' && at.final_analysis ? (
                    <Badge variant={at.final_analysis === 'Procedente' ? 'default' : at.final_analysis === 'Improcedente' ? 'destructive' : 'secondary'}>
                      {at.final_analysis}
                    </Badge>
                  ) : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AtendimentosTable;