import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/types/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User, Clock } from "lucide-react";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
    clientes: {
        nome_fantasia: string | null;
        razao_social: string | null;
    } | null;
    profiles: {
        full_name: string | null;
        email: string | null;
    } | null;
};

interface TicketCardProps {
    ticket: Ticket;
    onClick?: () => void;
}

const statusColors: Record<string, string> = {
    aguardando_triagem: "bg-yellow-500",
    em_atendimento: "bg-blue-500",
    aguardando_setor: "bg-purple-500",
    resolvido: "bg-green-500",
    fechado: "bg-gray-500",
};

const priorityColors: Record<string, string> = {
    baixa: "bg-gray-400",
    media: "bg-blue-400",
    alta: "bg-orange-500",
    urgente: "bg-red-500",
};

export function TicketCard({ ticket, onClick }: TicketCardProps) {
    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
        >
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-mono">
                            {ticket.numero_ticket}
                        </span>
                        <CardTitle className="text-base font-medium line-clamp-1">
                            {ticket.titulo}
                        </CardTitle>
                    </div>
                    <Badge className={`${priorityColors[ticket.prioridade || "media"]} text-white`}>
                        {ticket.prioridade}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
                <div className="flex items-center text-sm text-muted-foreground">
                    <User className="w-4 h-4 mr-2" />
                    <span className="truncate">
                        {ticket.clientes?.nome_fantasia || ticket.clientes?.razao_social || "Cliente não identificado"}
                    </span>
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                    <Badge variant="outline" className={`${statusColors[ticket.status || "aguardando_triagem"]} text-white border-none`}>
                        {ticket.status?.replace("_", " ")}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}
