import { TicketCard } from "./TicketCard";

interface TicketsGridViewProps {
  tickets: any[];
  onTicketClick: (id: string) => void;
}

export function TicketsGridView({ tickets, onTicketClick }: TicketsGridViewProps) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">Nenhum ticket encontrado</p>
        <p className="text-sm">Tente ajustar os filtros ou criar um novo ticket</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          onClick={() => onTicketClick(ticket.id)}
        />
      ))}
    </div>
  );
}
