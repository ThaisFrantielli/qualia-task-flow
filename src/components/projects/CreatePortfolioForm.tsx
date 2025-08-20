import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolios } from '@/hooks/usePortfolios';

interface CreatePortfolioFormProps {
  onCreated?: () => void;
  onClose?: () => void;
}

export const CreatePortfolioForm: React.FC<CreatePortfolioFormProps> = ({ onCreated, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { portfolios } = usePortfolios();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.from('portfolios').insert({ name, description, color });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setName('');
      setDescription('');
      setColor('#6366f1');
      if (onCreated) onCreated();
      if (onClose) onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-2">
      <div>
        <label className="block text-sm font-medium">Nome do Portfólio</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Descrição</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Cor</label>
        <input
          type="color"
          value={color}
          onChange={e => setColor(e.target.value)}
          className="w-10 h-10 p-0 border-none bg-transparent"
        />
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        {onClose && (
          <button type="button" className="px-4 py-2 rounded-md border" onClick={onClose}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
};
