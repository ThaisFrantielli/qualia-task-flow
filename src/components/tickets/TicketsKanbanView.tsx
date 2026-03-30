import { useDrop } from "react-dnd";
import { useState, useRef, useEffect } from "react";
import { ItemTypes } from "@/constants/ItemTypes";
import { TicketKanbanCard } from "./TicketKanbanCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { KANBAN_COLUMNS, normalizeStatusToColumn, STATUS_LABELS } from "@/lib/ticketPhases";

interface TicketsKanbanViewProps {
  tickets: any[];
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onTicketClick: (id: string) => void;
}

const COLUMN_COLORS: Record<string, { bg: string; border: string; header: string }> = {
  novo: { bg: "bg-blue-50/50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800", header: "text-blue-700 dark:text-blue-400" },
  em_analise: { bg: "bg-purple-50/50 dark:bg-purple-950/20", border: "border-purple-200 dark:border-purple-800", header: "text-purple-700 dark:text-purple-400" },
  aguardando_departamento: { bg: "bg-orange-50/50 dark:bg-orange-950/20", border: "border-orange-200 dark:border-orange-800", header: "text-orange-700 dark:text-orange-400" },
  em_tratativa: { bg: "bg-yellow-50/50 dark:bg-yellow-950/20", border: "border-yellow-200 dark:border-yellow-800", header: "text-yellow-700 dark:text-yellow-400" },
  aguardando_cliente: { bg: "bg-pink-50/50 dark:bg-pink-950/20", border: "border-pink-200 dark:border-pink-800", header: "text-pink-700 dark:text-pink-400" },
  resolvido: { bg: "bg-green-50/50 dark:bg-green-950/20", border: "border-green-200 dark:border-green-800", header: "text-green-700 dark:text-green-400" },
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

  const colors = COLUMN_COLORS[status] || COLUMN_COLORS.novo;
  // Paginação/infinite-scroll por coluna
  const [visibleCount, setVisibleCount] = useState<number>(5);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Reset quando tickets mudam (filtros/refetch)
    setVisibleCount(5);
  }, [tickets]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const rootEl = contentRef.current; // observe relative to the column scroll container
    if (!sentinel || !rootEl) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((v: number) => Math.min(tickets.length, v + 5));
        }
      });
    }, { root: rootEl, rootMargin: '200px' });

    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [tickets.length]);

  return (
    <div
      ref={drop}
      className={cn(
        "rounded-xl border transition-all duration-200 flex flex-col",
        "min-h-[500px] w-full md:w-72 lg:w-80 flex-shrink-0 min-h-0",
        colors.bg,
        colors.border,
        isOver && "ring-2 ring-primary/30 border-primary/50"
      )}
    >
      {/* Column Header */}
      <div className={cn(
        "p-3 border-b flex justify-between items-center sticky top-0 rounded-t-xl z-10",
        colors.border
      )}>
        <h3 className={cn("font-semibold text-sm flex items-center gap-2", colors.header)}>
          {STATUS_LABELS[status] || status}
          <Badge variant="secondary" className="text-xs h-5 px-1.5 font-normal">
            {tickets.length}
          </Badge>
        </h3>
        {overdueCount > 0 && (
          <Badge 
            variant="destructive" 
            className="text-[10px] h-5 px-1.5 gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200"
          >
            <AlertTriangle className="h-3 w-3" />
            {overdueCount}
          </Badge>
        )}
      </div>

      {/* Column Content */}
      <div ref={contentRef} className="p-2 space-y-2 flex-1 overflow-y-auto custom-scrollbar max-h-[520px]">
        {tickets.slice(0, visibleCount).map((ticket) => (
          <TicketKanbanCard
            key={ticket.id}
            id={ticket.id}
            numero_ticket={ticket.numero_ticket}
            titulo={ticket.titulo}
            cliente={ticket.clientes?.nome_fantasia || ticket.clientes?.razao_social || ""}
            prioridade={ticket.prioridade || "media"}
            departamento={ticket.departamento}
            analise_final={ticket.analise_final}
            created_at={ticket.created_at}
            status={ticket.status}
            onClick={() => onCardClick(ticket.id)}
          />
        ))}

        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground opacity-60">
            <p className="text-xs">Nenhum ticket</p>
          </div>
        )}

        {/* sentinel para carregar mais quando usuário scrollar até o fim da coluna */}
        <div ref={sentinelRef} className="h-px w-full pointer-events-none opacity-0" aria-hidden="true" />
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
    // newStatus here is the canonical column key (ex: 'em_analise')
    // We'll send the canonical column key to the parent; the parent can map to a DB value.
    if (item.status !== newStatus) {
      onStatusChange(item.id, newStatus);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
      {KANBAN_COLUMNS.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tickets={tickets.filter((t: any) => normalizeStatusToColumn(t.status) === status)}
          onDrop={handleDrop}
          onCardClick={onTicketClick}
        />
      ))}
    </div>
  );
}

