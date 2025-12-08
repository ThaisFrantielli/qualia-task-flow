import React from 'react';
import { Ticket, Target, Calendar, ListTodo } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ClienteStats } from '@/hooks/useClienteStats';

interface CustomerSummaryCardsProps {
  stats: ClienteStats | undefined;
  loading?: boolean;
}

export const CustomerSummaryCards: React.FC<CustomerSummaryCardsProps> = ({ stats, loading }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  const formatLastContact = (date: string | null) => {
    if (!date) return 'Nenhum';
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-muted/50 rounded-lg p-3 animate-pulse h-20" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Tickets',
      value: stats?.ticketsAbertos ?? 0,
      subValue: `de ${stats?.ticketsTotal ?? 0} total`,
      icon: Ticket,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      label: 'Oportunidades',
      value: formatCurrency(stats?.valorTotalOportunidades ?? 0),
      subValue: `${stats?.oportunidadesAbertas ?? 0} abertas`,
      icon: Target,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'Último Contato',
      value: formatLastContact(stats?.ultimoContato ?? null),
      subValue: '',
      icon: Calendar,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Tarefas',
      value: stats?.tarefasPendentes ?? 0,
      subValue: 'pendentes',
      icon: ListTodo,
      color: 'text-purple-600 bg-purple-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-card border rounded-lg p-3 flex items-start gap-3"
        >
          <div className={`p-2 rounded-lg ${card.color}`}>
            <card.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="font-semibold text-sm truncate">{card.value}</p>
            {card.subValue && (
              <p className="text-xs text-muted-foreground">{card.subValue}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
