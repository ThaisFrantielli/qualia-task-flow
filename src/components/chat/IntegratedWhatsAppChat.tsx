import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Send, 
  Loader2, 
  MessageSquare, 
  Phone, 
  RefreshCw,
  CheckCheck,
  Check,
  Clock,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface IntegratedWhatsAppChatProps {
  clienteId?: string;
  ticketId?: string;
  whatsappNumber?: string;
  maxHeight?: string;
  showHeader?: boolean;
  onMessageSent?: () => void;
}

interface Message {
  id: string;
  content: string;
  sender_type: string;
  sender_name?: string;
  created_at: string;
  status?: string;
  message_type: string;
}

export function IntegratedWhatsAppChat({ 
  clienteId,
  ticketId,
  whatsappNumber,
  maxHeight = "400px",
  showHeader = true,
  onMessageSent
}: IntegratedWhatsAppChatProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Buscar conversa
  const { data: conversation, isLoading: convLoading, refetch: refetchConv } = useQuery({
    queryKey: ['whatsapp-conversation', clienteId, whatsappNumber],
    queryFn: async () => {
      let query = supabase
        .from('whatsapp_conversations')
        .select('*');

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      } else if (whatsappNumber) {
        query = query.eq('whatsapp_number', whatsappNumber);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!(clienteId || whatsappNumber),
  });

  // Buscar mensagens
  const { data: messages, isLoading: msgLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['whatsapp-messages', conversation?.id],
    queryFn: async () => {
      if (!conversation?.id) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversation?.id,
    refetchInterval: 5000, // Atualiza a cada 5s
  });

  // Enviar mensagem
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!conversation) throw new Error('Conversa não encontrada');

      const targetPhone = conversation.whatsapp_number || conversation.customer_phone;

      // Salvar mensagem localmente primeiro
      const { data: savedMessage, error: saveError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation.id,
          instance_id: conversation.instance_id,
          sender_type: 'agent',
          sender_id: user?.id,
          sender_name: user?.email,
          content: content,
          message_type: 'text',
          status: 'sending'
        })
        .select()
        .single();

      if (saveError) throw saveError;

      // Tentar enviar via WhatsApp
      try {
        const { error } = await supabase.functions.invoke('whatsapp-send', {
          body: {
            instance_id: conversation.instance_id,
            to: targetPhone,
            message: content
          }
        });

        if (error) {
          await supabase
            .from('whatsapp_messages')
            .update({ status: 'failed' })
            .eq('id', savedMessage.id);
          throw error;
        }

        // Marcar como enviada
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'sent' })
          .eq('id', savedMessage.id);

        // Atualizar conversa
        await supabase
          .from('whatsapp_conversations')
          .update({
            last_message: content,
            last_message_at: new Date().toISOString(),
            unread_count: 0
          })
          .eq('id', conversation.id);

        return savedMessage;
      } catch (err) {
        console.error('Erro ao enviar:', err);
        throw err;
      }
    },
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
      onMessageSent?.();
      
      // Se tem ticket, registrar interação
      if (ticketId) {
        supabase
          .from('ticket_interacoes')
          .insert({
            ticket_id: ticketId,
            tipo: 'mensagem_whatsapp',
            mensagem: `Mensagem enviada via WhatsApp`,
            usuario_id: user?.id
          });
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar: ' + error.message);
    }
  });

  // Marcar como lido ao abrir
  useEffect(() => {
    if (conversation?.id && conversation.unread_count > 0) {
      supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversation.id);
      
      // Marcar mensagens como lidas
      supabase
        .from('whatsapp_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversation.id)
        .is('read_at', null);
    }
  }, [conversation?.id, conversation?.unread_count]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Real-time subscription
  useEffect(() => {
    if (!conversation?.id) return;

    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `conversation_id=eq.${conversation.id}` },
        () => refetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation?.id, refetchMessages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage.mutate(newMessage.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent':
        return <Check className="w-3 h-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-destructive" />;
      case 'sending':
        return <Clock className="w-3 h-3 text-muted-foreground animate-pulse" />;
      default:
        return null;
    }
  };

  if (convLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
        <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Nenhuma conversa WhatsApp encontrada</p>
        <p className="text-xs mt-1">O cliente ainda não iniciou uma conversa</p>
      </div>
    );
  }

  return (
    <Card className="flex flex-col border shadow-sm">
      {showHeader && (
        <CardHeader className="pb-2 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">
                  {conversation.customer_name || 'Cliente'}
                </CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  {conversation.whatsapp_number || conversation.customer_phone}
                  {conversation.is_online && (
                    <Badge variant="default" className="text-[10px] h-4 bg-green-500">
                      Online
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                refetchConv();
                refetchMessages();
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0 flex flex-col flex-1">
        {/* Messages */}
        <ScrollArea 
          ref={scrollRef}
          className="flex-1 p-4"
          style={{ maxHeight }}
        >
          <div className="space-y-3">
            {msgLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages?.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhuma mensagem ainda
              </div>
            ) : (
              messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    msg.sender_type === 'customer' 
                      ? "mr-auto" 
                      : "ml-auto items-end"
                  )}
                >
                  <div className={cn(
                    "px-3 py-2 rounded-xl text-sm",
                    msg.sender_type === 'customer' 
                      ? "bg-muted rounded-tl-sm" 
                      : "bg-primary text-primary-foreground rounded-tr-sm"
                  )}>
                    <p className="break-words whitespace-pre-wrap">
                      {msg.content || "(mensagem vazia)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 px-1">
                    <span className={cn(
                      "text-[10px]",
                      msg.sender_type === 'customer' 
                        ? "text-muted-foreground" 
                        : "text-muted-foreground"
                    )}>
                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                    {msg.sender_type !== 'customer' && getStatusIcon(msg.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t bg-muted/20">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite uma mensagem..."
              className="flex-1"
              disabled={sendMessage.isPending}
            />
            <Button 
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMessage.isPending}
              size="icon"
            >
              {sendMessage.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
