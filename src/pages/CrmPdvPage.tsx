// src/pages/CrmPdvPage.tsx

import React, { useState, useMemo } from 'react';
import { useAtendimentos } from '@/hooks/useAtendimentos';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AtendimentoCard from '@/components/crm/AtendimentoCard';
import AtendimentoDetailModal from '@/components/crm/AtendimentoDetailModal';
import type { Database } from '@/types/supabase';
type Atendimento = Database['public']['Tables']['atendimentos']['Row'];
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '@/constants/ItemTypes';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import AtendimentosFilters from '@/components/crm/AtendimentosFilters';
import AtendimentosTable from '@/components/crm/AtendimentosTable';
import AtendimentosDashboard from '@/components/crm/AtendimentosDashboard';

type KanbanColumnStatus = 'Solicitação' | 'Em Análise' | 'Resolvido';
const kanbanColumns: KanbanColumnStatus[] = ['Solicitação', 'Em Análise', 'Resolvido'];

// Interface para as props do KanbanColumn (sem alterações)
interface KanbanColumnProps {
  title: KanbanColumnStatus;
  atendimentos: Atendimento[];
  onDrop: (item: { id: number, status: KanbanColumnStatus }, newStatus: KanbanColumnStatus) => void;
  onCardClick: (atendimento: Atendimento) => void;
}

// CORREÇÃO: Definição completa e correta do componente KanbanColumn
// O erro foi corrigido garantindo que o componente retorne JSX.
const COLUMN_COLORS: Record<KanbanColumnStatus, string> = {
  'Solicitação': 'bg-blue-50 border-blue-300',
  'Em Análise': 'bg-yellow-50 border-yellow-300',
  'Resolvido': 'bg-green-50 border-green-300',
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, atendimentos, onDrop, onCardClick }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ATENDIMENTO_CARD,
    drop: (item: { id: number, status: KanbanColumnStatus }) => onDrop(item, title),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  // Badge de atrasados: considera atrasado se status não for 'Resolvido' e criado há mais de 3 dias
  const now = Date.now();
  const atrasados = atendimentos.filter(at => at.status !== 'Resolvido' && (now - new Date(at.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000).length;

  return (
    <div
      ref={drop}
      className={`border-2 rounded-lg p-4 w-full md:w-80 flex-shrink-0 transition-colors ${COLUMN_COLORS[title]} ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-center w-full">
          {title} <span className="text-xs text-muted-foreground">({atendimentos.length})</span>
        </h3>
        {atrasados > 0 && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-red-200 text-red-800 text-xs font-bold" title="Atrasados">{atrasados} ⚠️</span>
        )}
      </div>
      <div className="h-full overflow-y-auto pr-2 space-y-4">
        {atendimentos.map((at) => (
          <AtendimentoCard key={at.id} atendimento={at} onClick={() => onCardClick(at)} />
        ))}
      </div>
    </div>
  );
};


const CrmPdvPage = () => {
  const { atendimentos, setAtendimentos, loading, error, refetch } = useAtendimentos();
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);


  // Filtros de busca
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [motivo, setMotivo] = useState('all');
  const [period, setPeriod] = useState('all');

  // Alternância de visualização
  const [view, setView] = useState<'kanban' | 'table'>('kanban');

  // Opções de status, motivo e período (mock, pode ser dinâmico)
  const statusOptions = ['Solicitação', 'Em Análise', 'Resolvido'];
  const motivoOptions = Array.from(new Set(atendimentos.map(a => a.reason).filter(Boolean))) as string[];
  const periodOptions = ['Últimos 7 dias', 'Este mês', 'Últimos 30 dias', 'Todo Período'];

  // Função para limpar filtros
  const handleClear = () => {
    setSearch('');
    setStatus('all');
    setMotivo('all');
    setPeriod('all');
  };

  // Filtragem dos atendimentos
  const filteredAtendimentos = useMemo(() => {
    let filtered = atendimentos;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(a =>
        (a.client_name && a.client_name.toLowerCase().includes(s)) ||
        (a.contact_person && a.contact_person.toLowerCase().includes(s)) ||
        (a.summary && a.summary.toLowerCase().includes(s))
      );
    }
    if (status !== 'all') filtered = filtered.filter(a => a.status === status);
    if (motivo !== 'all') filtered = filtered.filter(a => a.reason === motivo);
    if (period !== 'all') {
      const now = new Date();
      filtered = filtered.filter(a => {
        const created = new Date(a.created_at);
        if (period === 'Últimos 7 dias') return (now.getTime() - created.getTime()) < 8 * 24 * 60 * 60 * 1000;
        if (period === 'Este mês') return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        if (period === 'Últimos 30 dias') return (now.getTime() - created.getTime()) < 31 * 24 * 60 * 60 * 1000;
        return true;
      });
    }
    return filtered;
  }, [atendimentos, search, status, motivo, period]);

  const handleDrop = async (item: { id: number, status: KanbanColumnStatus }, newStatus: KanbanColumnStatus) => {
    if (item.status === newStatus) return;

    const updatePayload: { status: KanbanColumnStatus; resolved_at?: string } = { status: newStatus };
    if (newStatus === 'Resolvido') {
      updatePayload.resolved_at = new Date().toISOString();
    }
    const originalAtendimentos = [...atendimentos];
    setAtendimentos(prev => prev.map(at => (at.id === item.id ? { ...at, status: newStatus } : at)));
    const { error } = await supabase.from('atendimentos').update(updatePayload).eq('id', item.id);
    if (error) {
      toast.error('Falha ao mover atendimento', { description: error.message });
      setAtendimentos(originalAtendimentos);
    } else {
      toast.success(`Atendimento movido para "${newStatus}"`);
    }
  };

  if (loading) return <div className="p-6">Carregando atendimentos...</div>;
  if (error) return <div className="p-6 text-red-500">Erro ao carregar atendimentos: {error}</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Pós-Vendas ({view === 'kanban' ? 'Kanban' : 'Tabela'})</h1>
            <p className="text-muted-foreground">Gerencie o fluxo de atendimentos e reclamações.</p>
          </div>
          <div className="flex gap-2 items-center">
            <Button variant={view === 'kanban' ? 'default' : 'outline'} onClick={() => setView('kanban')}>Kanban</Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} onClick={() => setView('table')}>Tabela</Button>
            <Link to="/pos-vendas/novo">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Atendimento
              </Button>
            </Link>
          </div>
        </div>
        {/* Indicadores principais */}
        <AtendimentosDashboard atendimentos={atendimentos} />
        {/* Filtros de atendimentos */}
        <AtendimentosFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          motivo={motivo}
          onMotivoChange={setMotivo}
          period={period}
          onPeriodChange={setPeriod}
          onClear={handleClear}
          statusOptions={statusOptions}
          motivoOptions={motivoOptions}
          periodOptions={periodOptions}
        />
        {view === 'kanban' ? (
          <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-x-auto pb-4">
            {kanbanColumns.map(columnStatus => (
              <KanbanColumn
                key={columnStatus}
                title={columnStatus}
                atendimentos={filteredAtendimentos.filter(at => at.status === columnStatus)}
                onDrop={handleDrop}
                onCardClick={setSelectedAtendimento}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pb-4">
            <AtendimentosTable atendimentos={filteredAtendimentos} onRowClick={setSelectedAtendimento} />
          </div>
        )}
      </div>
      <AtendimentoDetailModal 
        atendimento={selectedAtendimento}
        onClose={() => setSelectedAtendimento(null)}
        onUpdate={refetch}
      />
    </DndProvider>
  );
};

export default CrmPdvPage;