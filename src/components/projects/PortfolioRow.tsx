import React, { useState } from 'react';
import { ChevronRight, MoreVertical } from 'lucide-react';
import { Portfolio } from '@/types';

interface PortfolioRowProps {
  portfolio: Portfolio;
  onEdit: (portfolio: Portfolio) => void;
  onDelete: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

export const PortfolioRow: React.FC<PortfolioRowProps> = ({ portfolio, onEdit, onDelete, expanded, onToggle }) => {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div className="flex items-center border-b hover:bg-gray-50 group relative">
      <button onClick={onToggle} className="p-2 focus:outline-none">
        <ChevronRight className={`w-5 h-5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <span className="w-3 h-3 rounded-full mr-2" style={{ background: portfolio.color || '#6366f1' }} />
      <span className="font-semibold text-base text-gray-900 truncate" title={portfolio.name}>{portfolio.name}</span>
      {portfolio.description && (
        <span className="text-xs text-gray-500 ml-2 truncate" title={portfolio.description}>{portfolio.description}</span>
      )}
      <button
        className="ml-auto p-2 opacity-0 group-hover:opacity-100 transition"
        onClick={() => setShowMenu(m => !m)}
        tabIndex={-1}
      >
        <MoreVertical className="w-5 h-5 text-gray-400" />
      </button>
      {showMenu && (
        <div className="absolute right-2 top-8 bg-white border rounded shadow z-10 flex flex-col min-w-[120px]">
          <button className="px-4 py-2 text-left hover:bg-gray-100" onClick={() => { setShowMenu(false); onEdit(portfolio); }}>Editar</button>
          <button className="px-4 py-2 text-left text-red-600 hover:bg-gray-100" onClick={() => { setShowMenu(false); onDelete(portfolio.id); }}>Excluir</button>
        </div>
      )}
    </div>
  );
};
