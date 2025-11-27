// src/pages/CrmPdvPage.tsx

import React, { useState, useMemo } from 'react';
import { useAtendimentos } from '@/hooks/useAtendimentos';
import { supabase } from '@/integrations/supabase/client';
import { dateToLocalISO, formatDateSafe, parseISODateSafe } from '@/lib/dateUtils';
import { Plus, Grid3X3, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KanbanTaskCard from '../components/KanbanTaskCard';
import AtendimentoDetailModal from '@/components/crm/AtendimentoDetailModal';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '@/constants/ItemTypes';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatedKPICard } from '../components/AnimatedKPICard';
import { MobileFirstFilters } from '../components/MobileFirstFilters';
import AtendimentosTable from '@/components/crm/AtendimentosTable';
import { ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { AtendimentoComAssignee } from '@/types';

export type KanbanColumnStatus = 'Solicitação' | 'Em Análise' | 'Resolvido';
const kanbanColumns: KanbanColumnStatus[] = ['Solicitação', 'Em Análise', 'Resolvido'];

// Interface para as props do KanbanColumn (sem alterações)
interface KanbanColumnProps {
  title: KanbanColumnStatus;
  atendimentos: AtendimentoComAssignee[]; // <-- CORREÇÃO
  onDrop: (item: { id: number, status: KanbanColumnStatus }, newStatus: KanbanColumnStatus) => void;
  onCardClick: (atendimento: AtendimentoComAssignee) => void; // <-- CORREÇÃO
}

// CORREÇÃO: Definição completa e correta do componente KanbanColumn
// O erro foi corrigido garantindo que o componente retorne JSX.
const COLUMN_COLORS: Record<KanbanColumnStatus, string> = {
  'Solicitação': 'bg-gradient-to-br from-status-pending/5 to-status-pending/10 border-status-pending/20 shadow-status-pending/5',
  'Em Análise': 'bg-gradient-to-br from-status-analysis/5 to-status-analysis/10 border-status-analysis/20 shadow-status-analysis/5', 
  'Resolvido': 'bg-gradient-to-br from-status-resolved/5 to-status-resolved/10 border-status-resolved/20 shadow-status-resolved/5',
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, atendimentos, onDrop, onCardClick }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ATENDIMENTO_CARD,
    drop: (item: { id: number, status: KanbanColumnStatus }) => onDrop(item, title),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  // Badge de atrasados: considera atrasado se status não for 'Resolvido' e criado há mais de 3 dias
  const now = Date.now();
  const atrasados = atendimentos.filter(at => {
    if (at.status === 'Resolvido') return false;
    const created = parseISODateSafe(at.created_at);
    if (!created) return false;
    return (now - created.getTime()) > 3 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div
      ref={drop}
      className={`
        rounded-lg border-2 transition-all duration-200
        min-h-[500px] w-full md:w-80 flex-shrink-0
        ${COLUMN_COLORS[title]} 
        ${isOver ? 'border-primary/50' : ''}
      `}
    >
      {/* Header da coluna */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">
            {title}
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground">
              {atendimentos.length}
            </span>
            {atrasados > 0 && (
              <span className="px-2 py-1 rounded text-xs bg-priority-urgent/10 text-priority-urgent" title="Atrasados">
                {atrasados}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo da coluna */}
            <div className="p-3 space-y-3 h-full overflow-y-auto">
        {atendimentos.map((at) => (
          <div 
            key={at.id} 
            onClick={() => onCardClick(at)}
          >
            <KanbanTaskCard
              id={at.id}
              cliente={at.cliente?.nome_fantasia || at.cliente?.razao_social || 'Cliente Desconhecido'}
              resumo={at.summary || undefined}
              data={at.created_at ? formatDateSafe(at.created_at, 'dd/MM/yyyy') : '-'}
              motivo={at.reason || '-'}
              avatar={at.client_name ? at.client_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0,2) : '?'}
              created_at={at.created_at}
            />
          </div>
        ))}
        
        {/* Estado vazio */}
        {atendimentos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p className="text-sm">Nenhum atendimento</p>
          </div>
        )}
      </div>
    </div>
  );
};


const CrmPdvPage = () => {
  const { atendimentos, loading, error } = useAtendimentos();
  const [selectedAtendimento, setSelectedAtendimento] = useState<AtendimentoComAssignee | null>(null);
  const navigate = useNavigate();


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
      updatePayload.resolved_at = dateToLocalISO(new Date());
    }
    const { error } = await supabase.from('atendimentos').update(updatePayload).eq('id', item.id);
    if (error) {
      toast.error('Falha ao mover atendimento', { description: error.message });
      // setAtendimentos(originalAtendimentos);
    } else {
      toast.success(`Atendimento movido para "${newStatus}"`);
    }
  };

  if (loading) return (
    <div className="p-6 space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
      <div className="flex gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="flex-1 space-y-3">
            <div className="h-6 bg-muted rounded"></div>
            <div className="space-y-2">
              {[1,2,3].map(j => (
                <div key={j} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  if (error) return <div className="p-6 text-red-500">Erro ao carregar atendimentos: {error}</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          
          {/* Header Limpo */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-foreground mb-1">
                  Pós-Vendas
                </h1>
                <p className="text-muted-foreground">
                  Gerencie atendimentos e solicitações
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center bg-muted rounded-md p-1">
                  <Button 
                    variant={view === 'kanban' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setView('kanban')}
                  >
                    <Grid3X3 className="mr-2 h-4 w-4" />
                    Kanban
                  </Button>
                  <Button 
                    variant={view === 'table' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setView('table')}
                  >
                    <Table2 className="mr-2 h-4 w-4" />
                    Tabela
                  </Button>
                </div>
                
                <Link to="/pos-vendas/novo">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Atendimento
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Métricas */}
          <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
            <AnimatedKPICard 
              value={filteredAtendimentos.filter(a => a.status === 'Solicitação' || a.status === 'Em Análise').length} 
              label="Em Aberto" 
              color="warning"
              icon={<ClockIcon className="w-6 h-6" />}
              trend="up"
              trendValue="+12%"
            />
            <AnimatedKPICard 
              value={filteredAtendimentos.filter(a => a.status === 'Resolvido').length} 
              label="Resolvidos" 
              color="success"
              icon={<CheckCircleIcon className="w-6 h-6" />}
              trend="up"
              trendValue="+25%"
            />
            <AnimatedKPICard 
              value={filteredAtendimentos.filter(a => {
                if (a.status === 'Resolvido') return false;
                const now = Date.now();
                return (now - new Date(a.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000;
              }).length} 
              label="Atrasados" 
              color="danger"
              icon={<ExclamationTriangleIcon className="w-6 h-6" />}
              trend={filteredAtendimentos.filter(a => {
                if (a.status === 'Resolvido') return false;
                const now = Date.now();
                return (now - new Date(a.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000;
              }).length > 3 ? "up" : "down"}
              trendValue={filteredAtendimentos.filter(a => {
                if (a.status === 'Resolvido') return false;
                const now = Date.now();
                return (now - new Date(a.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000;
              }).length > 3 ? "+15%" : "-8%"}
              highlight={filteredAtendimentos.some(a => a.status !== 'Resolvido' && (Date.now() - new Date(a.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000)}
            />
            <AnimatedKPICard 
              value={filteredAtendimentos.length} 
              label="Total" 
              color="primary"
              icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
              trend="stable"
            />
          </div>

          {/* Filtros */}
          <div className="mb-6">
            <MobileFirstFilters
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
          </div>

          {/* Conteúdo Principal */}
          {view === 'kanban' ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {kanbanColumns.map(columnStatus => {
                const colAtendimentos = filteredAtendimentos.filter(at => at.status === columnStatus);
                return (
                  <KanbanColumn
                    key={columnStatus}
                    title={columnStatus}
                    atendimentos={colAtendimentos}
                    onDrop={handleDrop}
                    onCardClick={(atendimento) => navigate(`/pos-vendas/${atendimento.id}`)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="bg-card rounded-lg border p-4">
              <AtendimentosTable atendimentos={filteredAtendimentos} onRowClick={setSelectedAtendimento} />
            </div>
          )}
        </div>

        <AtendimentoDetailModal 
          atendimento={selectedAtendimento}
          onClose={() => setSelectedAtendimento(null)}
          onUpdate={() => { /* refresh list after edit */ }}
        />
      </div>
    </DndProvider>
  );
};

export default CrmPdvPage;