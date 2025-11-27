import React, { useMemo } from 'react';
import { useTickets } from '@/hooks/useTickets';
import { useTasks } from '@/hooks/useTasks';
import { useClienteDetail } from '@/hooks/useClienteDetail';
import { ClienteComContatos } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, CheckSquare, MessageSquare, Calendar, ArrowRight, Clock } from 'lucide-react';
import { formatDateSafe } from '@/lib/dateUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface CustomerTimelineProps {
    customer: ClienteComContatos;
}

type TimelineItem = {
    id: string;
    type: 'ticket' | 'task' | 'atendimento';
    date: string;
    title: string;
    description?: string;
    status?: string;
    icon: React.ReactNode;
    color: string;
    metadata?: any;
};

export const CustomerTimeline: React.FC<CustomerTimelineProps> = ({ customer }) => {
    const { data: tickets, isLoading: ticketsLoading } = useTickets({ cliente_id: customer.id });
    const { tasks, loading: tasksLoading } = useTasks({ cliente_id: customer.id });
    const { detalhes, loading: detalhesLoading } = useClienteDetail(customer);

    const timelineItems = useMemo(() => {
        const items: TimelineItem[] = [];

        if (tickets) {
            tickets.forEach(ticket => {
                items.push({
                    id: ticket.id,
                    type: 'ticket',
                    date: ticket.created_at,
                    title: `Ticket #${ticket.ticket_number || ticket.id.substring(0, 8)}`,
                    description: ticket.description,
                    status: ticket.status,
                    icon: <Ticket className="h-4 w-4" />,
                    color: 'bg-blue-100 text-blue-700 border-blue-200',
                    metadata: ticket
                });
            });
        }

        if (tasks) {
            tasks.forEach(task => {
                items.push({
                    id: task.id,
                    type: 'task',
                    date: task.created_at,
                    title: task.title,
                    description: task.description || undefined,
                    status: task.status,
                    icon: <CheckSquare className="h-4 w-4" />,
                    color: 'bg-green-100 text-green-700 border-green-200',
                    metadata: task
                });
            });
        }

        if (detalhes?.atendimentos) {
            detalhes.atendimentos.forEach(atendimento => {
                items.push({
                    id: atendimento.id.toString(),
                    type: 'atendimento',
                    date: atendimento.contact_start_time || atendimento.created_at,
                    title: `Atendimento #${atendimento.id}`,
                    description: atendimento.descricao || atendimento.summary || atendimento.notes || 'Sem descrição',
                    status: atendimento.status || 'N/A',
                    icon: <MessageSquare className="h-4 w-4" />,
                    color: 'bg-purple-100 text-purple-700 border-purple-200',
                    metadata: atendimento
                });
            });
        }

        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [tickets, tasks, detalhes]);

    const isLoading = ticketsLoading || tasksLoading || detalhesLoading;

    if (isLoading) {
        return (
            <div className="space-y-4 p-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }

    if (timelineItems.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Nenhuma atividade registrada para este cliente.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {timelineItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                    {/* Icon */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${item.color} bg-background z-10`}>
                        {item.icon}
                    </div>

                    {/* Card */}
                    <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 border shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-1">
                            <div className="font-bold text-slate-900">{item.title}</div>
                            <time className="font-caveat font-medium text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateSafe(item.date, 'dd/MM/yyyy HH:mm')}
                            </time>
                        </div>
                        <div className="text-slate-500 text-sm mb-2 line-clamp-2">
                            {item.description}
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs uppercase tracking-wider">
                                {item.type}
                            </Badge>
                            {item.status && (
                                <Badge variant="secondary" className="text-xs">
                                    {item.status}
                                </Badge>
                            )}
                        </div>
                    </Card>
                </div>
            ))}
        </div>
    );
};
