import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolios } from '@/hooks/usePortfolios';

interface PortfolioListItemProps {
  portfolio: {
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
  };
  onEdit: (portfolio: any) => void;
  onDelete: (id: string) => void;
}

export const PortfolioListItem: React.FC<PortfolioListItemProps> = ({ portfolio, onEdit, onDelete }) => {
  return (
    <li className="py-2 flex items-center gap-2 group">
      <span className="w-4 h-4 rounded-full" style={{ background: portfolio.color || '#6366f1' }} />
      <span className="font-medium">{portfolio.name}</span>
      {portfolio.description && <span className="text-xs text-gray-500 ml-2">{portfolio.description}</span>}
      <button
        className="ml-auto text-xs text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition"
        onClick={() => onEdit(portfolio)}
      >Editar</button>
      <button
        className="text-xs text-red-500 hover:underline opacity-0 group-hover:opacity-100 transition"
        onClick={() => onDelete(portfolio.id)}
      >Excluir</button>
    </li>
  );
};
