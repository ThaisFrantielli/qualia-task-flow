import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Clock, AlertTriangle } from "lucide-react";
import { useDrag } from "react-dnd";
import { ItemTypes } from "@/constants/ItemTypes";
import { cn } from "@/lib/utils";

interface TicketKanbanCardProps {
  id: string;
  numero_ticket: string;
  titulo: string;
  cliente: string;
  prioridade: string;
  departamento?: string;
  analise_final?: string;
  created_at: string;
  status: string;
  onClick: () => void;
}

const PRIORITY_BORDER: Record<string, string> = {
  urgente: "border-l-red-500",
  alta: "border-l-orange-500",
  media: "border-l-blue-500",
  baixa: "border-l-emerald-500",
};

const PRIORITY_BADGE: Record<string, string> = {
  urgente: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  alta: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  media: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  baixa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
};

export function TicketKanbanCard({
  id,
  numero_ticket,
  titulo,
  cliente,
  prioridade,
  departamento,
  created_at,
  status,
  onClick
}: TicketKanbanCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.ATENDIMENTO_CARD,
    item: { id, status },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const borderColor = PRIORITY_BORDER[prioridade] || PRIORITY_BORDER.media;
  const badgeColor = PRIORITY_BADGE[prioridade] || PRIORITY_BADGE.media;

  // Simple overdue check
  const hoursOld = (Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60);
  const isOverdue = prioridade === "urgente" ? hoursOld > 4 : 
                    prioridade === "alta" ? hoursOld > 24 : 
                    prioridade === "media" ? hoursOld > 48 : hoursOld > 72;
  const showOverdue = isOverdue && status !== "resolvido" && status !== "fechado";

  return (
    <Card
      ref={drag}
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-l-4 bg-card",
        borderColor,
        isDragging ? "opacity-50 scale-95" : "opacity-100"
      )}
    >
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-muted-foreground">{numero_ticket}</span>
          <Badge className={cn("text-[10px] h-5 px-2 border-0", badgeColor)}>
            {prioridade}
          </Badge>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium line-clamp-2 leading-snug">{titulo}</h4>

        {/* Cliente */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{cliente || "Não identificado"}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
          </div>
          
          {showOverdue && (
            <div className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Atrasado</span>
            </div>
          )}
          
          {departamento && !showOverdue && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
              {departamento}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
