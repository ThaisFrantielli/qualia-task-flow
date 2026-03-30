import { TicketCard } from "./TicketCard";
import { useEffect, useRef, useState } from "react";

interface TicketsGridViewProps {
  tickets: any[];
  onTicketClick: (id: string) => void;
  pageSize?: number; // quantos cards carregar por página
}

export function TicketsGridView({ tickets, onTicketClick, pageSize = 5 }: TicketsGridViewProps) {
  const [visibleCount, setVisibleCount] = useState<number>(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Reset visible count quando a lista de tickets mudar (filtros, refetch etc.)
    setVisibleCount(pageSize);
  }, [tickets, pageSize]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleCount((v) => Math.min(tickets.length, v + pageSize));
        }
      });
    }, { rootMargin: "200px" });

    obs.observe(el);
    return () => obs.disconnect();
  }, [pageSize, tickets.length]);

  if (tickets.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">Nenhum ticket encontrado</p>
        <p className="text-sm">Tente ajustar os filtros ou criar um novo ticket</p>
      </div>
    );
  }

  const toShow = tickets.slice(0, visibleCount);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {toShow.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onClick={() => onTicketClick(ticket.id)}
          />
        ))}
      </div>
      {/* sentinel para scroll infinito */}
      <div ref={sentinelRef} />
    </div>
  );
}
