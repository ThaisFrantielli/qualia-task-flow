import { useDrop } from "react-dnd";
import { ItemTypes } from "@/constants/ItemTypes";
import KanbanTaskCard from "@/components/KanbanTaskCard";
import { Badge } from "@/components/ui/badge";
import { formatDateSafe } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface TicketsKanbanViewProps {
  tickets: any[];
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onTicketClick: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  novo: "Solicitação",
  em_analise: "Em Análise",
  aguardando_departamento: "Aguard. Depto.",
  em_tratativa: "Em Tratativa",
  aguardando_cliente: "Aguard. Cliente",
  resolvido: "Resolvido",
};

const KANBAN_COLUMNS = Object.keys(STATUS_LABELS);

const COLUMN_COLORS: Record<string, string> = {
  novo: "bg-blue-500/5 border-blue-500/20",
  em_analise: "bg-purple-500/5 border-purple-500/20",
  aguardando_departamento: "bg-orange-500/5 border-orange-500/20",
  em_tratativa: "bg-yellow-500/5 border-yellow-500/20",
  aguardando_cliente: "bg-pink-500/5 border-pink-500/20",
  resolvido: "bg-green-500/5 border-green-500/20",
};

interface KanbanColumnProps {
  status: string;
  tickets: any[];
  onDrop: (item: { id: string; status: string }, newStatus: string) => void;
  onCardClick: (ticketId: string) => void;
}

const KanbanColumn = ({ status, tickets, onDrop, onCardClick }: KanbanColumnProps) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.ATENDIMENTO_CARD,
    drop: (item: { id: string; status: string }) => onDrop(item, status),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  const now = Date.now();
  const overdueCount = tickets.filter((t) => {
    if (t.status === "resolvido" || t.status === "fechado") return false;
    const sla = t.sla_resolucao ? new Date(t.sla_resolucao).getTime() : 0;
    return sla > 0 && sla < now;
  }).length;

  return (
    <div
      ref={drop}
      className={cn(
        "rounded-lg border-2 transition-all duration-200",
        "min-h-[500px] w-full md:w-72 lg:w-80 flex-shrink-0",
        COLUMN_COLORS[status] || "bg-muted/50",
        isOver && "border-primary/50 ring-2 ring-primary/20"
      )}
    >
      <div className="p-3 border-b border-border/50 flex justify-between items-center sticky top-0 bg-inherit rounded-t-lg z-10 backdrop-blur-sm">
        <h3 className="font-medium text-foreground flex items-center gap-2 text-sm">
          {STATUS_LABELS[status] || status}
          <Badge variant="secondary" className="text-xs">
            {tickets.length}
          </Badge>
        </h3>
        {overdueCount > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            {overdueCount} vencidos
          </Badge>
        )}
      </div>

      <div className="p-2 space-y-2 h-[calc(100%-50px)] overflow-y-auto custom-scrollbar">
        {tickets.map((ticket) => (
          <div key={ticket.id} onClick={() => onCardClick(ticket.id)}>
            <KanbanTaskCard
              id={ticket.id}
              cliente={ticket.clientes?.nome_fantasia || "Cliente"}
              resumo={ticket.titulo}
              data={formatDateSafe(ticket.created_at, "dd/MM HH:mm")}
              motivo={ticket.tipo_reclamacao || ticket.prioridade}
              avatar={
                ticket.clientes?.nome_fantasia?.substring(0, 2).toUpperCase() || "?"
              }
              created_at={ticket.created_at}
              priority={ticket.prioridade}
            />
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground opacity-50">
            <p className="text-xs">Nenhum ticket</p>
          </div>
        )}
      </div>
    </div>
  );
};

export function TicketsKanbanView({
  tickets,
  onStatusChange,
  onTicketClick,
}: TicketsKanbanViewProps) {
  const handleDrop = (item: { id: string; status: string }, newStatus: string) => {
    if (item.status !== newStatus) {
      onStatusChange(item.id, newStatus);
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[600px]">
      {KANBAN_COLUMNS.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tickets={tickets.filter((t: any) => t.status === status)}
          onDrop={handleDrop}
          onCardClick={onTicketClick}
        />
      ))}
    </div>
  );
}
