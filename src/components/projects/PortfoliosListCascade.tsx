import { useState } from 'react';
import { usePortfolios } from '@/hooks/usePortfolios';
import { Portfolio } from '@/types';
import { PortfolioRow } from './PortfolioRow';
import { CreatePortfolioForm } from './CreatePortfolioForm';
import { EditPortfolioForm } from './EditPortfolioForm';
import { supabase } from '@/integrations/supabase/client';

export const PortfoliosListCascade: React.FC = () => {
  const { portfolios, loading, error } = usePortfolios();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Portfolio | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este portfólio?')) return;
    const { error } = await supabase.from('portfolios').delete().eq('id', id);
    if (error) setActionError(error.message);
  };

  return (
    <div className="border rounded-lg bg-white mb-6">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-bold">Portfólios</h2>
        <button
          className="bg-primary text-white px-3 py-1 rounded-md"
          onClick={() => { setShowForm(f => !f); setEditing(null); }}
        >
          Novo Portfólio
        </button>
      </div>
      {showForm && (
        <div className="p-4 border-b">
          <CreatePortfolioForm onCreated={() => setShowForm(false)} onClose={() => setShowForm(false)} />
        </div>
      )}
      {editing && (
        <div className="p-4 border-b">
          <EditPortfolioForm portfolio={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </div>
      )}
      {loading && <div className="p-4">Carregando portfólios...</div>}
      {error && <div className="p-4 text-red-500">Erro: {error}</div>}
      {actionError && <div className="p-4 text-red-500">Erro: {actionError}</div>}
      <div>
        {portfolios.map(p => (
          <PortfolioRow
            key={p.id}
            portfolio={p}
            expanded={expanded === p.id}
            onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};
