import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Clock, Building, AlertTriangle } from "lucide-react";
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

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  urgente: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", border: "border-l-red-500" },
  alta: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400", border: "border-l-orange-500" },
  media: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", border: "border-l-blue-500" },
  baixa: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-400", border: "border-l-green-500" },
};

const PRIORITY_BADGE_COLORS: Record<string, string> = {
  urgente: "bg-red-500 text-white",
  alta: "bg-orange-500 text-white",
  media: "bg-blue-500 text-white",
  baixa: "bg-green-500 text-white",
};

export function TicketKanbanCard({
  id,
  numero_ticket,
  titulo,
  cliente,
  prioridade,
  departamento,
  analise_final,
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

  const priorityConfig = PRIORITY_CONFIG[prioridade] || PRIORITY_CONFIG.media;
  const priorityBadgeColor = PRIORITY_BADGE_COLORS[prioridade] || PRIORITY_BADGE_COLORS.media;

  // Calculate if overdue (simple check based on creation time > 48h for urgente, 72h for alta, etc.)
  const hoursOld = (Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60);
  const isOverdue = prioridade === "urgente" ? hoursOld > 4 : 
                    prioridade === "alta" ? hoursOld > 24 : 
                    prioridade === "media" ? hoursOld > 48 : hoursOld > 72;

  return (
    <Card
      ref={drag}
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md border-l-4",
        priorityConfig.border,
        isDragging ? "opacity-50 scale-95" : "opacity-100"
      )}
    >
      <div className="p-3 space-y-2">
        {/* Header: Number + Priority */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground">
            {numero_ticket}
          </span>
          <Badge className={cn("text-[10px] h-5 px-2", priorityBadgeColor)}>
            {prioridade}
          </Badge>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium line-clamp-2 text-foreground">
          {titulo}
        </h4>

        {/* Cliente */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{cliente || "Cliente não identificado"}</span>
        </div>

        {/* Metadata row */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
          </div>
          {isOverdue && status !== "resolvido" && status !== "fechado" && (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Atrasado</span>
            </div>
          )}
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-1">
          {departamento && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              <Building className="h-2.5 w-2.5 mr-1" />
              {departamento}
            </Badge>
          )}
          {analise_final && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200">
              {analise_final.length > 15 ? analise_final.slice(0, 15) + "..." : analise_final}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
