import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
interface WhatsAppConversation {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  status: string | null;
  created_at: string | null;
}

interface AtendimentoQueueProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAssign: (id: string) => void;
  loading: boolean;
  filter: string;
}

const formatDate = (date: string | null) => {
  if (!date) return '';
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ontem';
  return format(d, 'dd/MM');
};

const getInitials = (name: string | null, phone: string | null) => {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (phone) return phone.slice(-2);
  return '??';
};

export const AtendimentoQueue: React.FC<AtendimentoQueueProps> = ({
  conversations,
  selectedId,
  onSelect,
  onAssign,
  loading,
  filter
}) => {
  if (loading) {
    return (
      <div className="p-3 space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          {filter === 'all' ? 'Nenhuma conversa' : 'Nenhuma conversa nesta fila'}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {filter === 'queue' && 'Aguardando novas mensagens'}
          {filter === 'unread' && 'Todas as mensagens lidas'}
          {filter === 'mine' && 'Assuma uma conversa para atender'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => {
        const isSelected = conv.id === selectedId;
        const hasUnread = (conv.unread_count || 0) > 0;
        const isWaiting = conv.status === 'waiting' || conv.status === 'open';

        return (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "p-3 cursor-pointer transition-colors hover:bg-muted/50 group relative",
              isSelected && "bg-primary/5 border-l-2 border-l-primary",
              hasUnread && !isSelected && "bg-yellow-50/50 dark:bg-yellow-900/10"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={cn(
                    "text-xs font-medium",
                    hasUnread ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {getInitials(conv.customer_name, conv.customer_phone)}
                  </AvatarFallback>
                </Avatar>
                {hasUnread && (
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-sm truncate",
                    hasUnread ? "font-semibold" : "font-medium"
                  )}>
                    {conv.customer_name || conv.customer_phone || 'Cliente'}
                  </p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDate(conv.last_message_at)}
                  </span>
                </div>

                <p className={cn(
                  "text-xs truncate mt-0.5",
                  hasUnread ? "text-foreground" : "text-muted-foreground"
                )}>
                  {conv.last_message || 'Sem mensagens'}
                </p>

                <div className="flex items-center gap-1.5 mt-1.5">
                  {hasUnread && (
                    <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                      {conv.unread_count}
                    </Badge>
                  )}
                  {isWaiting && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-yellow-600 border-yellow-300">
                      Aguardando
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Assign button on hover */}
            {isWaiting && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign(conv.id);
                }}
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Assumir
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
};
