import React, { useState, useEffect, useRef } from 'react';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppConversations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Send,
  MessageSquare,
  Clock,
  CheckCheck,
  Check,
  Paperclip,
  Smile,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import type { Database } from '@/types';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

interface WhatsAppChatPanelProps {
  conversation: WhatsAppConversation | null;
  instanceId?: string;
}

const formatTime = (date: string) => format(new Date(date), 'HH:mm');

const formatDateHeader = (date: string) => {
  const d = new Date(date);
  if (isToday(d)) return 'Hoje';
  if (isYesterday(d)) return 'Ontem';
  return format(d, 'dd/MM/yyyy');
};

const getInitials = (name: string | null, phone: string | null) => {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  if (phone) return phone.slice(-2);
  return '??';
};

export const WhatsAppChatPanel: React.FC<WhatsAppChatPanelProps> = ({
  conversation,
  instanceId
}) => {
  const { messages, loading, refetch } = useWhatsAppMessages(conversation?.id);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [instanceStatus, setInstanceStatus] = useState<string>('unknown');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get instance status
  useEffect(() => {
    if (!instanceId) return;

    const targetInstanceId = instanceId;

    const fetchStatus = async () => {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('status')
        .eq('id', targetInstanceId)
        .single();
      if (data) setInstanceStatus(data.status || 'unknown');
    };

    fetchStatus();

    const channel = supabase
      .channel(`instance-status-${targetInstanceId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'whatsapp_instances', filter: `id=eq.${targetInstanceId}` },
        (payload) => setInstanceStatus((payload.new as any).status)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation) return;

    if (instanceStatus !== 'connected') {
      toast({
        title: 'Instância desconectada',
        description: 'Não é possível enviar mensagens.',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    try {
      const SUPABASE_URL = 'https://apqrjkobktjcyrxhqwtm.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw';

      const response = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: conversation.customer_phone,
          message: newMessage.trim(),
          conversationId: conversation.id,
          instance_id: instanceId
        }),
      });

      if (response.ok) {
        setNewMessage('');
        setTimeout(() => refetch(), 500);
        toast({
          title: 'Mensagem enviada',
          description: 'Sua mensagem foi enviada com sucesso!'
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao enviar mensagem');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-1">Nenhuma conversa selecionada</h3>
          <p className="text-sm">Selecione uma conversa para visualizar as mensagens</p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  messages.forEach(msg => {
    const dateKey = formatDateHeader(msg.created_at || '');
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  return (
    <div className="flex-1 flex flex-col bg-[#f0f2f5] dark:bg-muted/30">
      {/* Header */}
      <div className="p-3 border-b bg-background flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(conversation.customer_name, conversation.customer_phone)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm">
              {conversation.customer_name || 'Cliente WhatsApp'}
            </h3>
            <p className="text-xs text-muted-foreground">
              +{conversation.customer_phone || conversation.whatsapp_number}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              instanceStatus === 'connected' ? 'text-green-600 border-green-600' : 'text-muted-foreground'
            )}
          >
            {instanceStatus === 'connected' ? 'Conectado' : 'Desconectado'}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground">Carregando mensagens...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma mensagem ainda</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group, gi) => (
              <div key={gi}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <Badge variant="secondary" className="text-xs font-normal">
                    {group.date}
                  </Badge>
                </div>

                {/* Messages */}
                <div className="space-y-1">
                  {group.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender_type === 'customer' ? 'justify-start' : 'justify-end'
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
                          msg.sender_type === 'customer'
                            ? 'bg-background border rounded-tl-none'
                            : 'bg-primary text-primary-foreground rounded-tr-none'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={cn(
                            "text-[10px]",
                            msg.sender_type === 'customer' ? 'text-muted-foreground' : 'text-primary-foreground/70'
                          )}>
                            {formatTime(msg.created_at || '')}
                          </span>
                          {msg.sender_type !== 'customer' && (
                            (msg as any).status === 'delivered' ? (
                              <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                            ) : (
                              <Check className="h-3 w-3 text-primary-foreground/70" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-background">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Digite uma mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending || instanceStatus !== 'connected'}
            className="flex-1"
          />
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <Smile className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isSending || instanceStatus !== 'connected'}
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            {isSending ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChatPanel;
