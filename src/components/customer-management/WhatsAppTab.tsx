import { useState, useEffect, useRef } from 'react';
import { useWhatsAppConversation } from '@/hooks/useWhatsAppConversation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Phone, User, Bot, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { WHATSAPP } from '@/integrations/whatsapp/config';

interface WhatsAppTabProps {
  clienteId: string;
  whatsappNumber: string;
  customerName?: string;
  instanceId?: string;
}

export function WhatsAppTab({ clienteId, whatsappNumber, customerName, instanceId }: WhatsAppTabProps) {
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [serviceOnline, setServiceOnline] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [checkingService, setCheckingService] = useState(true);
  const [connectedNumber, setConnectedNumber] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Debug props
  if (WHATSAPP.DEBUG_LOGS) console.log('🔍 WhatsAppTab props:', { clienteId, whatsappNumber, customerName });

  const { messages, loading, error, sendMessage, clienteInfo, refreshMessages } = useWhatsAppConversation(
    clienteId,
    whatsappNumber,
    instanceId
  );

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (WHATSAPP.DEBUG_LOGS) console.log('📱 Messages changed in component:', messages.length, messages);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Verificar status do serviço WhatsApp
  useEffect(() => {
    const checkService = async () => {
      try {
        setCheckingService(true);
        if (WHATSAPP.DEBUG_LOGS) console.log('Checking WhatsApp service status...');
        const response = await fetch(`${WHATSAPP.SERVICE_URL}/status`);
        if (WHATSAPP.DEBUG_LOGS) console.log('Response status:', response.status, 'OK:', response.ok);

        if (!response.ok) {
          console.log('Response not OK - Service is offline');
          setServiceOnline(false);
          setWhatsappConnected(false);
          return;
        }

        const data = await response.json();
        if (WHATSAPP.DEBUG_LOGS) {
          console.log('WhatsApp status data:', data);
          console.log('isConnected:', data.isConnected);
        }

        // Service is responding (online)
        setServiceOnline(true);
        // WhatsApp connection status
        setWhatsappConnected(data.isConnected === true);
        setConnectedNumber(data.connectedNumber || null);
      } catch (error) {
        if (WHATSAPP.DEBUG_LOGS) console.error('Error checking WhatsApp service:', error);
        setServiceOnline(false);
        setWhatsappConnected(false);
      } finally {
        setCheckingService(false);
      }
    };

    checkService();
    const interval = setInterval(checkService, WHATSAPP.STATUS_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !serviceOnline || !whatsappConnected) return;

    const messageToSend = messageText.trim();
    if (WHATSAPP.DEBUG_LOGS) console.log('🚀 Sending message from component:', messageToSend);

    try {
      setIsSending(true);
      await sendMessage(messageToSend);
      setMessageText('');

      if (WHATSAPP.DEBUG_LOGS) console.log('✅ Message sent successfully from component');

      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi enviada com sucesso.'
      });

      // Force scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);

    } catch (err) {
      if (WHATSAPP.DEBUG_LOGS) console.error('❌ Error in component send:', err);
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

  if (loading || checkingService) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Não bloquear a UI por erro de DB; mostrar banner mais abaixo

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
            <div className="flex items-center gap-2">
              <p className="font-semibold">{customerName || 'Cliente'}</p>
              {clienteInfo?.hasWhatsApp && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  <MessageSquare className="h-3 w-3" />
                  WhatsApp
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Número: {clienteInfo?.whatsappNumber || clienteInfo?.phone || whatsappNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshMessages}
            className="text-xs h-6 px-2"
          >
            🔄
          </Button>
          {WHATSAPP.DEBUG_LOGS && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('🧪 Teste direto - enviando mensagem de teste');
                sendMessage('Mensagem de teste - ' + new Date().toLocaleTimeString());
              }}
              className="text-xs h-6 px-2"
              disabled={!serviceOnline || !whatsappConnected}
            >
              🧪
            </Button>
          )}
          <div className={`h-2 w-2 rounded-full ${serviceOnline && whatsappConnected ? 'bg-green-500' :
            serviceOnline ? 'bg-yellow-500' : 'bg-gray-400'
            }`} />
          <span className="text-sm text-muted-foreground">
            {serviceOnline && whatsappConnected ? 'Online' :
              serviceOnline ? 'Serviço OK' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Alert se serviço offline ou WhatsApp desconectado */}
      {!serviceOnline && (
        <div className="p-3 bg-red-50 border-b border-red-200 flex items-center gap-2">
          <Phone className="h-4 w-4 text-red-600" />
          <p className="text-xs text-red-800">
            Serviço WhatsApp offline. Verifique se o serviço está rodando em {WHATSAPP.SERVICE_URL}.
          </p>
        </div>
      )}
      {serviceOnline && !whatsappConnected && (
        <div className="p-3 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2">
          <Phone className="h-4 w-4 text-yellow-600" />
          <p className="text-xs text-yellow-800">
            WhatsApp desconectado. Escaneie o QR Code na página de configuração para reconectar.
            {connectedNumber ? ` (número do dispositivo: ${connectedNumber})` : ''}
          </p>
        </div>
      )}
      {serviceOnline && whatsappConnected && WHATSAPP.SERVICE_URL.includes(':3006') && (
        <div className="p-3 bg-blue-50 border-b border-blue-200 text-blue-900 text-xs">
          Modo simulado ativo ({WHATSAPP.SERVICE_URL}). Mensagens não são entregues ao destinatário.
          Para enviar de verdade, ajuste VITE_WHATSAPP_SERVICE_URL para http://localhost:3005 e inicie o serviço real (whatsapp-service/index.js).
        </div>
      )}
      {error && (
        <div className="p-3 bg-orange-50 border-b border-orange-200 flex items-center gap-2">
          <Phone className="h-4 w-4 text-orange-600" />
          <p className="text-xs text-orange-800">
            Aviso: não foi possível carregar a conversação do banco ({error}). Você ainda pode enviar mensagens; elas serão exibidas localmente.
          </p>
        </div>
      )}

      {clienteInfo && !clienteInfo.hasWhatsApp && (
        <div className="p-3 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
          <Phone className="h-4 w-4 text-blue-600" />
          <p className="text-xs text-blue-800">
            Cliente não possui WhatsApp cadastrado. Mensagens serão enviadas como SMS se possível.
          </p>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {/* Debug info */}
          {WHATSAPP.DEBUG_LOGS && (
            <div className="text-xs text-muted-foreground text-center border-b pb-2">
              Mensagens: {messages.length} | Status: {loading ? 'Carregando' : 'Pronto'}
            </div>
          )}

          {loading && <p className="text-center text-muted-foreground">Carregando mensagens...</p>}
          {messages.length === 0 && !loading ? (
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
                    className={`max-w-[70%] rounded-lg p-3 ${isCustomer
                      ? 'bg-muted'
                      : 'bg-primary text-primary-foreground'
                      }`}
                  >
                    {!isCustomer && (
                      <p className="text-xs font-semibold mb-1 opacity-80">
                        Você
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={`text-xs mt-1 ${isCustomer ? 'text-muted-foreground' : 'opacity-70'
                        }`}
                    >
                      {message.created_at ? formatTime(message.created_at) : 'Agora'}
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
            disabled={!messageText.trim() || isSending || !serviceOnline || !whatsappConnected}
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
            title={
              !serviceOnline ? 'Serviço WhatsApp offline' :
                !whatsappConnected ? 'WhatsApp desconectado' :
                  'Enviar mensagem'
            }
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {!serviceOnline && '⚠️ Aguardando conexão com o serviço WhatsApp · '}
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}
