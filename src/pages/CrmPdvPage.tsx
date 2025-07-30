// src/pages/CrmPdvPage.tsx

import React, { useState } from 'react';
import { useAtendimentos } from '@/hooks/useAtendimentos';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AtendimentoCard from '@/components/crm/AtendimentoCard';
import AtendimentoForm from '@/components/crm/AtendimentoForm';
import AtendimentoDetailModal from '@/components/crm/AtendimentoDetailModal';
import type { Atendimento } from '@/types';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '@/constants/ItemTypes';
import { toast } from 'sonner';

type KanbanColumnStatus = 'Solicitação' | 'Em Análise' | 'Resolvido';
const kanbanColumns: KanbanColumnStatus[] = ['Solicitação', 'Em Análise', 'Resolvido'];

interface KanbanColumnProps {
  title: KanbanColumnStatus;
  atendimentos: Atendimento[];
  onDrop: (item: Atendimento, newStatus: KanbanColumnStatus) => void;
  onCardClick: (atendimento: Atendimento) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, atendimentos, onDrop, onCardClick }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ATENDIMENTO_CARD,
    drop: (item: Atendimento) => onDrop(item, title),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  return (
    <div ref={drop} className={`bg-gray-100 rounded-lg p-4 w-full md:w-80 flex-shrink-0 transition-colors ${isOver ? 'bg-blue-100' : ''}`}>
      <h3 className="font-semibold text-lg mb-4 text-center">{title} ({atendimentos.length})</h3>
      <div className="h-full overflow-y-auto pr-2 space-y-4">
        {atendimentos.map((at: Atendimento) => (
          <AtendimentoCard key={at.id} atendimento={at} onClick={() => onCardClick(at)} />
        ))}
      </div>
    </div>
  );
};

const CrmPdvPage = () => {
  const { atendimentos, setAtendimentos, loading, error, refetch } = useAtendimentos();
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDrop = async (item: Atendimento, newStatus: KanbanColumnStatus) => {
    const updatePayload: { status: KanbanColumnStatus; resolved_at?: string } = { status: newStatus };
    if (newStatus === 'Resolvido' && item.status !== 'Resolvido') {
      updatePayload.resolved_at = new Date().toISOString();
    }

    const originalAtendimentos = [...atendimentos];
    setAtendimentos((prev: Atendimento[]) =>
      prev.map((at: Atendimento) => (at.id === item.id ? { ...at, ...updatePayload } : at))
    );

    const { error } = await supabase
      .from('atendimentos')
      .update(updatePayload)
      .eq('id', item.id);
    
    if (error) {
      toast.error('Falha ao mover atendimento', { description: error.message });
      setAtendimentos(originalAtendimentos);
    } else {
      toast.success(`Atendimento movido para "${newStatus}"`);
    }
  };
  
  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <h2 className="text-xl font-semibold">Erro ao carregar atendimentos</h2>
        <p>{error}</p>
        <Button onClick={refetch} className="mt-4">Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Pós-Vendas (Kanban)</h1>
            <p className="text-gray-600">Gerencie o fluxo de atendimentos e reclamações.</p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Atendimento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Novo Atendimento</DialogTitle>
                <DialogDescription>Preencha os detalhes da solicitação.</DialogDescription>
              </DialogHeader>
              <AtendimentoForm setOpen={setIsFormOpen} onSuccess={refetch} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-x-auto pb-4">
          {kanbanColumns.map(columnStatus => (
            <KanbanColumn
              key={columnStatus}
              title={columnStatus}
              atendimentos={atendimentos.filter((at: Atendimento) => at.status === columnStatus)}
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