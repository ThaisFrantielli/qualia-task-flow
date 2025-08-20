// src/components/crm/AtendimentosTable.tsx
import React from 'react';
import type { Database } from '@/types/supabase';
type Atendimento = Database['public']['Tables']['atendimentos']['Row'];
import { Badge } from '@/components/ui/badge';

interface AtendimentosTableProps {
  atendimentos: Atendimento[];
  onRowClick: (atendimento: Atendimento) => void;
}

const AtendimentosTable: React.FC<AtendimentosTableProps> = ({ atendimentos, onRowClick }) => {
  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-4 py-2 text-left">Cliente</th>
            <th className="px-4 py-2 text-left">Contato</th>
            <th className="px-4 py-2 text-left">Motivo</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Criado em</th>
            <th className="px-4 py-2 text-left">Resolução</th>
          </tr>
        </thead>
        <tbody>
          {atendimentos.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum atendimento encontrado.</td>
            </tr>
          )}
          {atendimentos.map(at => (
            <tr key={at.id} className="hover:bg-muted cursor-pointer" onClick={() => onRowClick(at)}>
              <td className="px-4 py-2 font-medium">{at.client_name}</td>
              <td className="px-4 py-2">{at.contact_person}</td>
              <td className="px-4 py-2">{at.reason}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AtendimentosTable;
