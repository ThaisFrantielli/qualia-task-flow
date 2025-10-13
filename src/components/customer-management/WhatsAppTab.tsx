import { useState, useEffect, useRef } from 'react';
import { useWhatsAppConversation } from '@/hooks/useWhatsAppConversation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Phone, User, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppTabProps {
  clienteId: string;
  whatsappNumber: string;
  customerName?: string;
}

export function WhatsAppTab({ clienteId, whatsappNumber, customerName }: WhatsAppTabProps) {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { messages, loading, error, sendMessage } = useWhatsAppConversation(
    clienteId,
    whatsappNumber
  );

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      setIsSending(true);
      await sendMessage(messageText.trim());
      setMessageText('');
      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi enviada com sucesso.'
      });
    } catch (err) {
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar a mensagem. Tente novamente.',
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

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR
      });
    } catch {
      return '';
    }
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'customer':
        return <User className="h-4 w-4" />;
      case 'bot':
        return <Bot className="h-4 w-4" />;
      default:
        return <Phone className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-destructive">
        <p>Erro ao carregar conversação: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>
              <Phone className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{customerName || 'Cliente'}</p>
            <p className="text-sm text-muted-foreground">
              WhatsApp: {whatsappNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Nenhuma mensagem ainda. Inicie a conversa!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isCustomer = message.sender_type === 'customer';
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isCustomer ? 'justify-start' : 'justify-end'}`}
                >
                  {isCustomer && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10">
                        {getSenderIcon(message.sender_type)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isCustomer
                        ? 'bg-muted'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {!isCustomer && message.sender_name && (
                      <p className="text-xs font-semibold mb-1 opacity-80">
                        {message.sender_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        isCustomer ? 'text-muted-foreground' : 'opacity-70'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>

                  {!isCustomer && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10">
                        {getSenderIcon(message.sender_type)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isSending}
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}
