import React, { useState, useMemo } from 'react';
import { useTickets, useUpdateTicket } from '@/hooks/useTickets';
import { formatDateSafe } from '@/lib/dateUtils';
import { Plus, Grid3X3, Table2, Clock, CheckCircle, AlertTriangle, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import KanbanTaskCard from '../components/KanbanTaskCard';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '@/constants/ItemTypes';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AnimatedKPICard } from '../components/AnimatedKPICard';
import { MobileFirstFilters } from '../components/MobileFirstFilters';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { startOfDay, startOfWeek, startOfMonth, parseISO, isAfter } from 'date-fns';

// Mapeamento de status para labels amigáveis
const STATUS_LABELS: Record<string, string> = {
  'novo': 'Solicitação',
  'em_analise': 'Em Análise',
  'aguardando_departamento': 'Aguardando Depto.',
  'em_tratativa': 'Em Tratativa',
  'aguardando_cliente': 'Aguardando Cliente',
  'resolvido': 'Resolvido'
};

const KANBAN_COLUMNS = Object.keys(STATUS_LABELS);

const COLUMN_COLORS: Record<string, string> = {
  'novo': 'bg-blue-500/5 border-blue-500/20',
  'em_analise': 'bg-purple-500/5 border-purple-500/20',
  'aguardando_departamento': 'bg-orange-500/5 border-orange-500/20',
  'em_tratativa': 'bg-yellow-500/5 border-yellow-500/20',
  'aguardando_cliente': 'bg-pink-500/5 border-pink-500/20',
  'resolvido': 'bg-green-500/5 border-green-500/20'
};

interface KanbanColumnProps {
  status: string;
  tickets: any[];
  onDrop: (item: { id: string, status: string }, newStatus: string) => void;
  onCardClick: (ticketId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, tickets, onDrop, onCardClick }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ATENDIMENTO_CARD, // Reusing existing item type or create new one
    drop: (item: { id: string, status: string }) => onDrop(item, status),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  const now = Date.now();
  const atrasados = tickets.filter(t => {
    if (t.status === 'resolvido' || t.status === 'fechado') return false;
    // Lógica de SLA simplificada para visualização
    const sla = t.sla_resolucao ? new Date(t.sla_resolucao).getTime() : 0;
    return sla > 0 && sla < now;
  }).length;

  return (
    <div
      ref={drop}
      className={`
        rounded-lg border-2 transition-all duration-200
        min-h-[500px] w-full md:w-80 flex-shrink-0
        ${COLUMN_COLORS[status] || 'bg-gray-100 dark:bg-gray-800'} 
        ${isOver ? 'border-primary/50 ring-2 ring-primary/20' : ''}
      `}
    >
      <div className="p-3 border-b border-border/50 flex justify-between items-center sticky top-0 bg-inherit rounded-t-lg z-10 backdrop-blur-sm">
        <h3 className="font-medium text-foreground flex items-center gap-2">
          {STATUS_LABELS[status] || status}
          <Badge variant="secondary" className="text-xs">{tickets.length}</Badge>
        </h3>
        {atrasados > 0 && (
          <Badge variant="destructive" className="text-xs" title="Tickets vencidos">
            {atrasados} vencidos
          </Badge>
        )}
      </div>

      <div className="p-3 space-y-3 h-[calc(100%-50px)] overflow-y-auto custom-scrollbar">
        {tickets.map((ticket) => (
          <div key={ticket.id} onClick={() => onCardClick(ticket.id)}>
            <KanbanTaskCard
              id={ticket.id}
              cliente={ticket.clientes?.nome_fantasia || 'Cliente Desconhecido'}
              resumo={ticket.titulo}
              data={formatDateSafe(ticket.created_at, 'dd/MM HH:mm')}
              motivo={ticket.tipo_reclamacao || ticket.prioridade}
              avatar={ticket.clientes?.nome_fantasia?.substring(0, 2).toUpperCase() || '?'}
              created_at={ticket.created_at}
              priority={ticket.prioridade}
            />
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground opacity-50">
            <p className="text-sm">Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CrmPdvPage = () => {
  const { data: tickets, isLoading, error } = useTickets();
  const updateTicket = useUpdateTicket();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'kanban' | 'table'>('kanban');

  // Novos estados para filtros
  const [motivo, setMotivo] = useState('all');
  const [period, setPeriod] = useState('all');

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    let filtered = tickets;

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((t: any) =>
        t.titulo?.toLowerCase().includes(s) ||
        t.clientes?.nome_fantasia?.toLowerCase().includes(s) ||
        t.numero_ticket?.toString().includes(s)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t: any) => t.status === statusFilter);
    }

    if (motivo !== 'all') {
      filtered = filtered.filter((t: any) => t.tipo_reclamacao === motivo);
    }

    if (period !== 'all') {
      const now = new Date();
      let startDate: Date | null = null;

      switch (period) {
        case 'Hoje':
          startDate = startOfDay(now);
          break;
        case 'Esta Semana':
          startDate = startOfWeek(now, { weekStartsOn: 0 });
          break;
        case 'Este Mês':
          startDate = startOfMonth(now);
          break;
      }

      if (startDate) {
        filtered = filtered.filter((t: any) => {
          if (!t.created_at) return false;
          const ticketDate = parseISO(t.created_at);
          return isAfter(ticketDate, startDate) || ticketDate.getTime() === startDate.getTime();
        });
      }
    }

    return filtered;
  }, [tickets, search, statusFilter, motivo, period]);

  const handleDrop = async (item: { id: string, status: string }, newStatus: string) => {
    if (item.status === newStatus || !user?.id) return;

    try {
      await updateTicket.mutateAsync({
        ticketId: item.id,
        updates: { status: newStatus },
        userId: user.id
      });
      toast.success(`Ticket movido para ${STATUS_LABELS[newStatus]}`);
    } catch (error) {
      toast.error("Erro ao mover ticket");
    }
  };

  if (isLoading) return <div className="p-8 flex justify-center"><Clock className="animate-spin w-8 h-8" /></div>;
  if (error) return <div className="p-8 text-red-500">Erro ao carregar tickets</div>;

  const totalTickets = filteredTickets.length;
  const resolvidos = filteredTickets.filter((t: any) => t.status === 'resolvido').length;
  const emAberto = totalTickets - resolvidos;
  const atrasados = filteredTickets.filter((t: any) => {
    if (t.status === 'resolvido' || t.status === 'fechado') return false;
    const sla = t.sla_resolucao ? new Date(t.sla_resolucao).getTime() : 0;
    return sla > 0 && sla < Date.now();
  }).length;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Pós-Vendas</h1>
              <p className="text-muted-foreground">Gestão de tickets e solicitações de clientes</p>
            </div>
            <div className="flex items-center gap-2">
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
              <Button onClick={() => navigate('/pos-vendas/novo')}>
                <Plus className="mr-2 h-4 w-4" /> Novo Ticket
              </Button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AnimatedKPICard
              value={emAberto}
              label="Em Aberto"
              color="warning"
              icon={<Clock className="w-6 h-6" />}
              trend="stable"
            />
            <AnimatedKPICard
              value={resolvidos}
              label="Resolvidos"
              color="success"
              icon={<CheckCircle className="w-6 h-6" />}
              trend="up"
              trendValue="+5%"
            />
            <AnimatedKPICard
              value={atrasados}
              label="Vencidos"
              color="danger"
              icon={<AlertTriangle className="w-6 h-6" />}
              trend={atrasados > 0 ? "down" : "stable"}
            />
            <AnimatedKPICard
              value={totalTickets}
              label="Total"
              color="primary"
              icon={<ClipboardList className="w-6 h-6" />}
              trend="stable"
            />
          </div>

          {/* Filters */}
          <MobileFirstFilters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            statusOptions={Object.keys(STATUS_LABELS).map(k => STATUS_LABELS[k])}
            motivo={motivo}
            onMotivoChange={setMotivo}
            period={period}
            onPeriodChange={setPeriod}
            motivoOptions={['Contestação de Cobrança', 'Demora na Aprovação', 'Má Qualidade', 'Outros']} // Exemplo
            periodOptions={['Hoje', 'Esta Semana', 'Este Mês', 'Todos']}
            onClear={() => {
              setSearch('');
              setStatusFilter('all');
              setMotivo('all');
              setPeriod('all');
            }}
          />

          {/* Kanban Board */}
          {view === 'kanban' ? (
            <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
              {KANBAN_COLUMNS.map(status => (
                <KanbanColumn
                  key={status}
                  status={status}
                  tickets={filteredTickets.filter((t: any) => t.status === status)}
                  onDrop={handleDrop}
                  onCardClick={(id) => navigate(`/pos-vendas/${id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-lg border p-4">
              <p className="text-center text-muted-foreground">Visualização em tabela em desenvolvimento...</p>
              {/* Implementar tabela se necessário */}
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
};

export default CrmPdvPage;