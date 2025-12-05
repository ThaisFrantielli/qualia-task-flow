import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { MessageSquare, UserPlus, Clock } from 'lucide-react';
import type { Database } from '@/types';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

interface WhatsAppConversationQueueProps {
  conversations: WhatsAppConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAssign: (conversationId: string) => void;
  loading?: boolean;
  filter: 'all' | 'queue' | 'mine' | 'unread';
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

export const WhatsAppConversationQueue: React.FC<WhatsAppConversationQueueProps> = ({
  conversations,
  selectedId,
  onSelect,
  onAssign,
  loading,
  filter
}) => {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
        <p className="text-sm">Nenhuma conversa {filter === 'queue' ? 'na fila' : filter === 'unread' ? 'não lida' : ''}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {conversations.map((conv) => {
          const isSelected = conv.id === selectedId;
          const hasUnread = (conv.unread_count || 0) > 0;
          const isWaiting = conv.status === 'waiting' || conv.status === 'open';

          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                "hover:bg-muted/50 group",
                isSelected && "bg-primary/10 border-l-2 border-primary",
                hasUnread && !isSelected && "bg-accent/30"
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(conv.customer_name, conv.customer_phone)}
                  </AvatarFallback>
                </Avatar>
                {conv.is_online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn(
                    "font-medium truncate text-sm",
                    hasUnread && "text-foreground"
                  )}>
                    {conv.customer_name || `+${conv.customer_phone || conv.whatsapp_number}`}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(conv.last_message_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={cn(
                    "text-xs truncate",
                    hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {conv.last_message || 'Nenhuma mensagem'}
                  </p>
                  
                  <div className="flex items-center gap-1.5">
                    {hasUnread && (
                      <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs">
                        {(conv.unread_count || 0) > 99 ? '99+' : conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>

                {isWaiting && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                      <Clock className="h-3 w-3 mr-1" />
                      Aguardando
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssign(conv.id);
                      }}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Assumir
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default WhatsAppConversationQueue;
