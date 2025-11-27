import { useTickets } from "@/hooks/useTickets";
import { TicketCard } from "@/components/tickets/TicketCard";
import { CreateTicketDialog } from "@/components/tickets/CreateTicketDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

export default function TicketsPage() {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const { data: tickets, isLoading } = useTickets(
        statusFilter !== "all" ? { status: statusFilter } : undefined
    );
    const navigate = useNavigate();

    const filteredTickets = tickets?.filter(ticket =>
        ticket.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.numero_ticket.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.clientes?.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Tickets</h1>
                <CreateTicketDialog />
            </div>

            <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar tickets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="aguardando_triagem">Aguardando Triagem</SelectItem>
                        <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div>Carregando...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTickets?.map((ticket) => (
                        <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                        />
                    ))}
                    {filteredTickets?.length === 0 && (
                        <div className="col-span-full text-center py-10 text-muted-foreground">
                            Nenhum ticket encontrado.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
