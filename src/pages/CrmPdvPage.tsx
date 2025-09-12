// src/pages/CrmPdvPage.tsx

import React, { useState, useMemo } from 'react';
import { useAtendimentos } from '@/hooks/useAtendimentos';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MoreHorizontal, Grid3X3, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KanbanTaskCard from '../components/KanbanTaskCard';
import AtendimentoDetailModal from '@/components/crm/AtendimentoDetailModal';
import type { Database } from '@/types/supabase';
type Atendimento = Database['public']['Tables']['atendimentos']['Row'];
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
  const atrasados = atendimentos.filter(at => at.status !== 'Resolvido' && (now - new Date(at.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000).length;

  return (
    <div
      ref={drop}
      className={`
        group relative rounded-xl border-2 transition-all duration-300 ease-out 
        min-h-[600px] w-full md:w-80 flex-shrink-0 backdrop-blur-sm
        ${COLUMN_COLORS[title]} 
        ${isOver ? 'ring-2 ring-primary/50 scale-[1.02] shadow-xl' : 'shadow-lg hover:shadow-xl'}
      `}
    >
      {/* Header da coluna */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md rounded-t-xl border-b border-border/50 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${
              title === 'Solicitação' ? 'from-status-pending to-status-pending/70' :
              title === 'Em Análise' ? 'from-status-analysis to-status-analysis/70' :
              'from-status-resolved to-status-resolved/70'
            } animate-pulse-glow`} />
            <h3 className="font-bold text-lg text-card-foreground">
              {title}
            </h3>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`
              px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm
              ${title === 'Solicitação' ? 'bg-status-pending/10 text-status-pending border border-status-pending/20' :
                title === 'Em Análise' ? 'bg-status-analysis/10 text-status-analysis border border-status-analysis/20' :
                'bg-status-resolved/10 text-status-resolved border border-status-resolved/20'}
            `}>
              {atendimentos.length}
            </span>
            {atrasados > 0 && (
              <span className="px-2 py-1 rounded-full bg-priority-urgent/10 text-priority-urgent text-xs font-bold animate-pulse-glow" title="Atrasados">
                {atrasados} ⚠️
              </span>
            )}
            <Button variant="ghost" size="sm" className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo da coluna */}
      <div className="px-4 pb-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        <div className="space-y-3">
          {atendimentos.map((at) => (
            <div 
              key={at.id} 
              onClick={() => onCardClick(at)} 
              className="cursor-pointer transform transition-transform duration-200 hover:scale-[1.02]"
            >
              <KanbanTaskCard
                id={at.id}
                cliente={at.client_name || 'Cliente Desconhecido'}
                resumo={at.summary || undefined}
                data={at.created_at ? new Date(at.created_at).toLocaleDateString('pt-BR') : '-'}
                motivo={at.reason || '-'}
                avatar={at.client_name ? at.client_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0,2) : '?'}
                created_at={at.created_at}
              />
            </div>
          ))}
          
          {/* Estado vazio */}
          {atendimentos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center
                ${title === 'Solicitação' ? 'bg-status-pending/10' :
                  title === 'Em Análise' ? 'bg-status-analysis/10' :
                  'bg-status-resolved/10'}
              `}>
                <ClipboardDocumentListIcon className={`w-6 h-6 
                  ${title === 'Solicitação' ? 'text-status-pending' :
                    title === 'Em Análise' ? 'text-status-analysis' :
                    'text-status-resolved'}
                `} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Nenhum atendimento</p>
              <p className="text-xs text-muted-foreground">Arraste cards para cá</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


const CrmPdvPage = () => {
  const { atendimentos, setAtendimentos, loading, error, refetch } = useAtendimentos();
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
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

  // Dados simulados de sparkline para mostrar tendências
  const sparklineData = {
    emAberto: [12, 15, 13, 18, 16, filteredAtendimentos.filter(a => a.status === 'Solicitação' || a.status === 'Em Análise').length],
    resolvidos: [8, 10, 12, 15, 18, filteredAtendimentos.filter(a => a.status === 'Resolvido').length],
    atrasados: [2, 1, 3, 4, 2, filteredAtendimentos.filter(a => {
      if (a.status === 'Resolvido') return false;
      const now = Date.now();
      return (now - new Date(a.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000;
    }).length]
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="max-w-7xl mx-auto px-8 py-8">
          
          {/* Header Premium */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                    <ClipboardDocumentListIcon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      Pós-Vendas
                    </h1>
                    <p className="text-muted-foreground font-medium">
                      Gerencie o fluxo de atendimentos com visibilidade total
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="flex items-center bg-muted/30 rounded-lg p-1 backdrop-blur-sm">
                  <Button 
                    variant={view === 'kanban' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setView('kanban')}
                    className={view === 'kanban' ? 'shadow-md' : ''}
                  >
                    <Grid3X3 className="mr-2 h-4 w-4" />
                    Kanban
                  </Button>
                  <Button 
                    variant={view === 'table' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setView('table')}
                    className={view === 'table' ? 'shadow-md' : ''}
                  >
                    <Table2 className="mr-2 h-4 w-4" />
                    Tabela
                  </Button>
                </div>
                
                <Link to="/pos-vendas/novo">
                  <Button className="shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Atendimento
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Métricas Animadas */}
          <div className="flex gap-6 mb-8 overflow-x-auto pb-2">
            <AnimatedKPICard 
              value={filteredAtendimentos.filter(a => a.status === 'Solicitação' || a.status === 'Em Análise').length} 
              label="Em Aberto" 
              color="warning"
              icon={<ClockIcon className="w-6 h-6" />}
              trend="up"
              trendValue="+12%"
              sparklineData={sparklineData.emAberto}
            />
            <AnimatedKPICard 
              value={filteredAtendimentos.filter(a => a.status === 'Resolvido').length} 
              label="Resolvidos" 
              color="success"
              icon={<CheckCircleIcon className="w-6 h-6" />}
              trend="up"
              trendValue="+25%"
              sparklineData={sparklineData.resolvidos}
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
              sparklineData={sparklineData.atrasados}
              highlight={filteredAtendimentos.some(a => a.status !== 'Resolvido' && (Date.now() - new Date(a.created_at).getTime()) > 3 * 24 * 60 * 60 * 1000)}
            />
            <AnimatedKPICard 
              value={filteredAtendimentos.length} 
              label="Total" 
              color="primary"
              icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
              trend="stable"
              sparklineData={[45, 48, 52, 49, 53, filteredAtendimentos.length]}
            />
          </div>

          {/* Filtros Mobile-First */}
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

          {/* Conteúdo Principal */}
          {view === 'kanban' ? (
            <div className="flex gap-6 overflow-x-auto pb-4 min-h-[600px]">
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
            <div className="bg-card rounded-xl border shadow-lg p-6">
              <AtendimentosTable atendimentos={filteredAtendimentos} onRowClick={setSelectedAtendimento} />
            </div>
          )}
        </div>

        <AtendimentoDetailModal 
          atendimento={selectedAtendimento}
          onClose={() => setSelectedAtendimento(null)}
          onUpdate={refetch}
        />
      </div>
    </DndProvider>
  );
};

export default CrmPdvPage;