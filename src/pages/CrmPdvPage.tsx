// src/pages/CrmPdvPage.tsx

import React, { useState } from 'react';
import { useAtendimentos } from '@/hooks/useAtendimentos';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AtendimentoCard from '@/components/crm/AtendimentoCard';
import AtendimentoDetailModal from '@/components/crm/AtendimentoDetailModal';
import type { Atendimento } from '@/types';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '@/constants/ItemTypes';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

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
const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, atendimentos, onDrop, onCardClick }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ATENDIMENTO_CARD,
    drop: (item: { id: number, status: KanbanColumnStatus }) => onDrop(item, title),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  // A declaração 'return' estava faltando ou incorreta na versão com erro.
  return (
    <div 
      ref={drop} 
      className={`bg-muted/50 rounded-lg p-4 w-full md:w-80 flex-shrink-0 transition-colors ${isOver ? 'bg-primary/10' : ''}`}
    >
      <h3 className="font-semibold text-lg mb-4 text-center">{title} ({atendimentos.length})</h3>
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
            <h1 className="text-3xl font-bold">Pós-Vendas (Kanban)</h1>
            <p className="text-muted-foreground">Gerencie o fluxo de atendimentos e reclamações.</p>
          </div>
          <Link to="/pos-vendas/novo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Atendimento
            </Button>
          </Link>
        </div>
        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-x-auto pb-4">
          {kanbanColumns.map(columnStatus => (
            <KanbanColumn
              key={columnStatus}
              title={columnStatus}
              atendimentos={atendimentos.filter(at => at.status === columnStatus)}
              onDrop={handleDrop}
              onCardClick={setSelectedAtendimento}
            />
          ))}
        </div>
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