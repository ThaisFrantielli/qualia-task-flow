import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUpDown, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TicketsTableViewProps {
  tickets: any[];
  onTicketClick: (id: string) => void;
  selectedTickets: string[];
  onSelectionChange: (selected: string[]) => void;
}

type SortField = "numero_ticket" | "titulo" | "status" | "prioridade" | "created_at";
type SortOrder = "asc" | "desc";

const STATUS_LABELS: Record<string, string> = {
  novo: "Solicitação",
  aguardando_triagem: "Aguardando Triagem",
  em_analise: "Em Análise",
  aguardando_departamento: "Aguard. Depto.",
  em_tratativa: "Em Tratativa",
  aguardando_cliente: "Aguard. Cliente",
  resolvido: "Resolvido",
  fechado: "Fechado",
};

const STATUS_COLORS: Record<string, string> = {
  novo: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  aguardando_triagem: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  em_analise: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  aguardando_departamento: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  em_tratativa: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
  aguardando_cliente: "bg-pink-500/10 text-pink-600 border-pink-500/30",
  resolvido: "bg-green-500/10 text-green-600 border-green-500/30",
  fechado: "bg-muted text-muted-foreground border-muted",
};

const PRIORITY_COLORS: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-blue-500/10 text-blue-600",
  alta: "bg-orange-500/10 text-orange-600",
  urgente: "bg-red-500/10 text-red-600",
};

export function TicketsTableView({
  tickets,
  onTicketClick,
  selectedTickets,
  onSelectionChange,
}: TicketsTableViewProps) {
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedTickets = [...tickets].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === "created_at") {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal?.toLowerCase() || "";
    }

    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const toggleSelectAll = () => {
    if (selectedTickets.length === tickets.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tickets.map((t) => t.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedTickets.includes(id)) {
      onSelectionChange(selectedTickets.filter((t) => t !== id));
    } else {
      onSelectionChange([...selectedTickets, id]);
    }
  };

  const isSlaOverdue = (ticket: any) => {
    if (ticket.status === "resolvido" || ticket.status === "fechado") return false;
    const sla = ticket.sla_resolucao ? new Date(ticket.sla_resolucao).getTime() : 0;
    return sla > 0 && sla < Date.now();
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedTickets.length === tickets.length && tickets.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead>
              <SortButton field="numero_ticket">#</SortButton>
            </TableHead>
            <TableHead className="min-w-[200px]">
              <SortButton field="titulo">Título</SortButton>
            </TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>
              <SortButton field="status">Status</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="prioridade">Prioridade</SortButton>
            </TableHead>
            <TableHead>Depto.</TableHead>
            <TableHead>Atendente</TableHead>
            <TableHead>
              <SortButton field="created_at">Criado</SortButton>
            </TableHead>
            <TableHead>SLA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                Nenhum ticket encontrado
              </TableCell>
            </TableRow>
          ) : (
            sortedTickets.map((ticket) => (
              <TableRow
                key={ticket.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedTickets.includes(ticket.id) && "bg-muted/30"
                )}
                onClick={() => onTicketClick(ticket.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedTickets.includes(ticket.id)}
                    onCheckedChange={() => toggleSelect(ticket.id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {ticket.numero_ticket}
                </TableCell>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {ticket.titulo}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                  {ticket.clientes?.nome_fantasia || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", STATUS_COLORS[ticket.status])}>
                    {STATUS_LABELS[ticket.status] || ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", PRIORITY_COLORS[ticket.prioridade || "media"])}>
                    {ticket.prioridade || "média"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {ticket.departamento || "-"}
                </TableCell>
                <TableCell>
                  {ticket.profiles?.full_name ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={ticket.profiles.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {ticket.profiles.full_name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate max-w-[80px]">
                        {ticket.profiles.full_name.split(" ")[0]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(ticket.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {isSlaOverdue(ticket) ? (
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Vencido
                    </Badge>
                  ) : ticket.sla_resolucao ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(ticket.sla_resolucao), "dd/MM HH:mm")}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
