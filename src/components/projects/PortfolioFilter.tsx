import React from 'react';
import { usePortfolios } from '@/hooks/usePortfolios';

interface PortfolioFilterProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export const PortfolioFilter: React.FC<PortfolioFilterProps> = ({ selected, onSelect }) => {
  const { portfolios, loading, error } = usePortfolios();

  if (loading) return <div className="text-sm text-gray-400">Carregando portfólios...</div>;
  if (error) return <div className="text-sm text-red-500">Erro ao carregar portfólios</div>;
  if (!portfolios.length) return <div className="text-sm text-gray-400">Nenhum portfólio cadastrado</div>;

  return (
    <select
      value={selected || ''}
      onChange={e => onSelect(e.target.value || null)}
      className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">Todos os portfólios</option>
      {portfolios.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
};
