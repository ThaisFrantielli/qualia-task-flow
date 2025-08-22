import { useState } from 'react';
import { usePortfolios } from '@/hooks/usePortfolios';
import { Portfolio } from '@/types';
import { PortfolioListItem } from './PortfolioListItem';
import { CreatePortfolioForm } from './CreatePortfolioForm';
import { EditPortfolioForm } from './EditPortfolioForm';
import { supabase } from '@/integrations/supabase/client';

export const PortfolioSettings: React.FC = () => {
  const { portfolios, loading, error } = usePortfolios();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Portfolio | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Corrigir: remover setDeleting, usar loading local para exclusão


  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este portfólio?')) return;
  // setDeletingId removido
    setActionError(null);
    const { error } = await supabase.from('portfolios').delete().eq('id', id);
  // setDeletingId removido
    if (error) setActionError(error.message);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">Portfólios</h2>
        <button
          className="bg-primary text-white px-3 py-1 rounded-md"
          onClick={() => { setShowForm(f => !f); setEditing(null); }}
        >
          Novo Portfólio
        </button>
      </div>
      {showForm && (
        <div className="mb-4">
          <CreatePortfolioForm onCreated={() => setShowForm(false)} onClose={() => setShowForm(false)} />
        </div>
      )}
      {editing && (
        <div className="mb-4">
          <EditPortfolioForm portfolio={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </div>
      )}
      {loading && <div>Carregando portfólios...</div>}
      {error && <div className="text-red-500">Erro: {error}</div>}
      {actionError && <div className="text-red-500">Erro: {actionError}</div>}
      <ul className="divide-y">
        {portfolios.map(p => (
          <PortfolioListItem
            key={p.id}
            portfolio={p}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
        ))}
      </ul>
    </div>
  );
};
