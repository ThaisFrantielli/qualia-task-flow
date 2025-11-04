import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortfolios } from '@/hooks/usePortfolios';
import { useProjectMembers } from '@/hooks/useProjectMembers';
import { useProfiles } from '@/hooks/useProfiles';

const EditProjectPage = () => {
  const { id: routeId } = useParams();
  const id = routeId ?? '';
  const navigate = useNavigate();
  type ProjectType = {
    color: string | null;
    created_at: string;
    description: string | null;
    id: string;
    name: string;
    portfolio_id: string | null;
    updated_at: string;
    user_id: string | null;
    privacy: string | null;
    status: string | null;
    customColor: string | null;
    notes: string | null;
  };
  const [, setProject] = useState<ProjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#A1A1AA');
  const [error, setError] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [status, setStatus] = useState<string>('ativo');
  const [customColor, setCustomColor] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [teamEditMode, setTeamEditMode] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Portfólios
  const { portfolios } = usePortfolios();
  // Equipe
  const { members, refetch: refetchMembers } = useProjectMembers(id);
  const { profiles } = useProfiles();
  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
      if (error) {
        setError('Erro ao carregar projeto');
      } else {
        setProject({
          ...data,
          customColor: (data.customcolor ?? null),
        });
        setName(data.name || '');
        setDescription(data.description || '');
        setColor(data.color || '#A1A1AA');
        setPortfolioId(data.portfolio_id || null);
  setPrivacy((data.privacy as 'public' | 'private') || 'public');
  setStatus((data.status as string) || 'ativo');
  setCustomColor((data.customcolor as string) || '');
  setNotes((data.notes as string) || '');
      }
      setLoading(false);
    };
    fetchProject();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('projects').update({
      name,
      description,
      color,
      privacy,
      status,
      customColor,
      notes
    }).eq('id', id);
    if (error) {
      setError('Erro ao salvar alterações');
    } else {
      navigate('/projects');
    }
  };

  // Salvar portfólio
  const handleSavePortfolio = async () => {
    setSavingPortfolio(true);
  const { error } = await supabase.from('projects').update({ portfolio_id: portfolioId }).eq('id', id);
    setSavingPortfolio(false);
    if (!error) {
      setProject((prev: any) => ({ ...prev, portfolio_id: portfolioId }));
    }
  };

  // Salvar equipe
  const handleSaveTeam = async () => {
    // Remove todos os membros antigos e adiciona os novos
  await supabase.from('project_members').delete().eq('project_id', id);
    if (selectedMembers.length > 0) {
  await supabase.from('project_members').insert(selectedMembers.map(uid => ({ project_id: id, user_id: uid, role: 'member' })));
    }
    refetchMembers();
    setTeamEditMode(false);
  };

  if (loading) {
    return <Skeleton className="h-40 w-full rounded-xl" />;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Editar Projeto</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-4 mb-8">
        <label className="flex flex-col gap-1">
          Nome
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border rounded px-2 py-1"
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          Descrição
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Cor
          <input
            type="color"
            value={color}
            onChange={e => setColor(e.target.value)}
            className="w-12 h-8 border rounded"
          />
        </label>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Salvar</button>
        {error && <div className="text-red-500">{error}</div>}
      </form>

      {/* Gerenciamento de Portfólio */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Portfólio</h2>
        <div className="flex gap-2 items-center">
          <span className="font-medium">Selecionar Portfólio:</span>
          <select
            value={portfolioId || ''}
            onChange={e => setPortfolioId(e.target.value || null)}
            className="border rounded px-2 py-1"
          >
            <option value="">Nenhum</option>
            {portfolios.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            className="ml-2 px-3 py-1 rounded bg-blue-500 text-white"
            onClick={handleSavePortfolio}
            disabled={savingPortfolio}
          >Salvar</button>
        </div>
      </div>

      {/* Gerenciamento de Equipe */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Equipe</h2>
        <div>
          <span className="font-medium">Membros:</span>
          {!teamEditMode ? (
            <ul className="list-disc ml-6 mb-2">
              {members.map(m => {
                const user = profiles.find(p => p.id === m.user_id);
                return <li key={m.user_id}>{user?.full_name || m.user_id}</li>;
              })}
            </ul>
          ) : (
            <div className="flex flex-col gap-2 mb-2">
              {profiles.map(p => (
                <label key={p.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(p.id)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedMembers(prev => [...prev, p.id]);
                      } else {
                        setSelectedMembers(prev => prev.filter(id => id !== p.id));
                      }
                    }}
                  />
                  {p.full_name || p.email}
                </label>
              ))}
            </div>
          )}
          <button
            className="px-3 py-1 rounded bg-blue-500 text-white mr-2"
            onClick={() => {
              setTeamEditMode(!teamEditMode);
              setSelectedMembers(members.map(m => m.user_id));
            }}
          >{teamEditMode ? 'Cancelar' : 'Editar Equipe'}</button>
          {teamEditMode && (
            <button
              className="px-3 py-1 rounded bg-green-500 text-white"
              onClick={handleSaveTeam}
            >Salvar Equipe</button>
          )}
        </div>
      </div>

      {/* Configurações Avançadas */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Configurações Avançadas</h2>
        <form className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            Privacidade
            <select value={privacy} onChange={e => setPrivacy(e.target.value as 'public' | 'private')} className="border rounded px-2 py-1">
              <option value="public">Público</option>
              <option value="private">Privado</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Status
            <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-2 py-1">
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Cor personalizada
            <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} className="w-12 h-8 border rounded" />
          </label>
          <label className="flex flex-col gap-1">
            Observações
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="border rounded px-2 py-1" />
          </label>
        </form>
      </div>
    </div>
  );
};

export default EditProjectPage;
