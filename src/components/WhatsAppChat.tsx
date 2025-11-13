import React, { useState, useEffect, useRef } from 'react';
import { useWhatsAppConversations, useWhatsAppMessages } from '../hooks/useWhatsAppConversations';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  CheckCheck,
  Check,
  MessageSquare,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { formatDateSafe, parseISODateSafe } from '@/lib/dateUtils';

interface WhatsAppChatProps {
  customerId?: string;
  className?: string;
}

interface ContactOption {
  telefone: string;
  nome?: string;
  observacoes?: string;
}



const formatMessageDate = (date: string) => {
  const messageDate = parseISODateSafe(date) || new Date(date);

  if (isToday(messageDate)) {
    return format(messageDate, 'HH:mm');
  } else if (isYesterday(messageDate)) {
    return 'Ontem';
  } else {
    return formatDateSafe(messageDate, 'dd/MM/yyyy');
  }
};

const formatMessageTime = (date: string) => {
  return formatDateSafe(date, 'HH:mm');
};

const getCustomerInitials = (name: string | null, phone: string) => {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  return phone.slice(-2);
};

export const WhatsAppChat: React.FC<WhatsAppChatProps> = ({ 
  customerId, 
  className 
}) => {
  const { conversations, loading: convLoading, error: convError } = useWhatsAppConversations(customerId);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { messages, loading: msgLoading, error: msgError, refetch: refetchMessages } = useWhatsAppMessages(selectedConversationId || undefined);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [contactOptions, setContactOptions] = useState<ContactOption[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Select first conversation automatically if none selected
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  // Função para abrir WhatsApp Web
  const openWhatsApp = (phoneNumber: string, contactName: string, clientName: string) => {
    const displayName = contactName !== clientName ? `${contactName} (${clientName})` : clientName;
    const message = encodeURIComponent(`Olá ${contactName}! Como posso ajudá-lo hoje?`);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "WhatsApp aberto",
      description: `Abrindo conversa com ${displayName}`,
    });
  };

  const handleStartConversation = async () => {
    if (!customerId) return;

    try {
      // Buscar dados do cliente e seus contatos
      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .select(`
          razao_social, 
          nome_fantasia, 
          whatsapp_number,
          cliente_contatos (
            id,
            nome_contato,
            telefone_contato,
            departamento
          )
        `)
        .eq('id', customerId)
        .single();

      if (clienteError || !cliente) {
        toast({
          title: "Erro",
          description: "Não foi possível encontrar os dados do cliente.",
          variant: "destructive",
        });
        return;
      }

      const clientName = cliente.nome_fantasia || cliente.razao_social || 'Cliente';
      
      // Filtrar contatos que têm telefone
      const contatosComTelefone = cliente.cliente_contatos?.filter(
        (contato: any) => contato.telefone_contato && contato.telefone_contato.trim()
      ) || [];

      // Se há múltiplos contatos, abrir modal para seleção
      if (contatosComTelefone.length > 1) {
        const mappedContacts: ContactOption[] = contatosComTelefone.map(contato => ({
          telefone: contato.telefone_contato || '',
          nome: contato.nome_contato || undefined,
          observacoes: contato.departamento || undefined
        }));
        setContactOptions(mappedContacts);
        setShowContactSelector(true);
        return;
      }

      let phoneNumber = '';
      let contactName = '';
      
      if (contatosComTelefone.length === 1) {
        phoneNumber = contatosComTelefone[0].telefone_contato?.replace(/\D/g, '') || '';
        contactName = contatosComTelefone[0].nome_contato || 'Contato';
      } else {
        phoneNumber = cliente.whatsapp_number || '';
        contactName = clientName;
        
        if (!phoneNumber) {
          const userPhone = prompt(
            `${clientName} não possui contatos com telefone cadastrados.\nDigite o número do WhatsApp com código do país (ex: 5561999887766):`
          );
          
          if (!userPhone) return;
          
          phoneNumber = userPhone.replace(/\D/g, '');
          
          await supabase
            .from('clientes')
            .update({ whatsapp_number: phoneNumber })
            .eq('id', customerId);
        }
      }

      openWhatsApp(phoneNumber, contactName, clientName);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a conversa.",
        variant: "destructive",
      });
    }
  };

    const handleContactSelection = (index: number) => {
    if (index < 0 || index >= contactOptions.length || !customerId) return;
    
    const selectedContact = contactOptions[index];
    openWhatsApp(
      selectedContact.telefone.replace(/\D/g, ''),
      selectedContact.nome || 'Contato',
      customerId
    );
    
    setShowContactSelector(false);
    setContactOptions([]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId) return;

    setIsSending(true);
    try {
      const selectedConv = conversations.find(c => c.id === selectedConversationId);
      if (!selectedConv) return;

      const SUPABASE_URL = 'https://apqrjkobktjcyrxhqwtm.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwcXJqa29ia3RqY3lyeGhxd3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzOTI4NzUsImV4cCI6MjA2Njk2ODg3NX0.99HhMrWfMStRH1p607RjOt6ChklI0iBjg8AGk_QUSbw';
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: (selectedConv as any).customer_phone,
          message: newMessage.trim(),
          conversationId: selectedConversationId
        }),
      });

      if (response.ok) {
        setNewMessage('');
        // Refresh messages after sending
        setTimeout(() => {
          refetchMessages();
        }, 500);
        
        toast({
          title: "Mensagem enviada",
          description: "Sua mensagem foi enviada com sucesso!",
        });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
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

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    const convAny = conv as any;
    return (
      (convAny.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      convAny.customer_phone?.includes(searchTerm) ||
      (convAny.last_message?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  return (
    <div className={cn("flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-background", className)}>
      {/* Sidebar de conversas - 30% */}
      <div className="w-1/3 border-r bg-background flex flex-col">
        {/* Header das conversas */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Conversas</h2>
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Botão Iniciar Conversa */}
        <div className="p-4 border-b">
          <Button 
            onClick={handleStartConversation}
            className="w-full"
            variant="default"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Iniciar Conversa
          </Button>
        </div>

        {/* Lista de conversas */}
        <ScrollArea className="flex-1">
          {convLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-pulse space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 p-3">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : convError ? (
            <div className="p-4 text-center text-destructive">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Erro ao carregar conversas</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
                    conv.id === selectedConversationId ? "bg-primary/10 border-l-2 border-primary" : ""
                  )}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getCustomerInitials((conv as any).customer_name, (conv as any).customer_phone)}
                      </AvatarFallback>
                    </Avatar>
                    {(conv as any).is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">
                        {(conv as any).customer_name || `+${(conv as any).customer_phone || ''}`}
                      </h3>
                      {conv.last_message_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatMessageDate(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground truncate">
                        {(conv as any).last_message || 'Nenhuma mensagem'}
                      </p>
                      {(conv as any).unread_count > 0 && (
                        <Badge variant="default" className="bg-primary text-primary-foreground text-xs min-w-[20px] h-5 flex items-center justify-center">
                          {(conv as any).unread_count > 99 ? '99+' : (conv as any).unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Área de mensagens - 70% */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header com info do contato */}
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getCustomerInitials((selectedConversation as any).customer_name, (selectedConversation as any).customer_phone)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {(selectedConversation as any).customer_name || 'Cliente WhatsApp'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    +{(selectedConversation as any).customer_phone || ''}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Área de mensagens */}
            <ScrollArea className="flex-1 p-4" style={{ backgroundColor: '#f0f2f5' }}>
              {msgLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-pulse text-muted-foreground">Carregando mensagens...</div>
                </div>
              ) : msgError ? (
                <div className="flex items-center justify-center h-full text-destructive">
                  <div>Erro ao carregar mensagens</div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma mensagem ainda</p>
                    <p className="text-sm">Envie a primeira mensagem para iniciar a conversa</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.sender_type === 'customer' ? 'justify-start' : 'justify-end'
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg p-3 shadow-sm",
                          msg.sender_type === 'customer' 
                            ? 'bg-white border' 
                            : 'bg-primary text-primary-foreground'
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={cn(
                            "text-xs",
                            msg.sender_type === 'customer' ? 'text-muted-foreground' : 'text-primary-foreground/70'
                          )}>
                            {formatMessageTime(msg.created_at || '')}
                          </span>
                          {msg.sender_type === 'user' && (
                            <div className="flex">
                              {(msg as any).status === 'delivered' ? (
                                <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
                              ) : (
                                <Check className="h-3 w-3 text-primary-foreground/70" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input de mensagem */}
            <div className="p-4 border-t bg-background">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Digite uma mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSending}
                    className="resize-none min-h-[44px]"
                  />
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  size="sm"
                  className="min-w-[44px] h-[44px]"
                >
                  {isSending ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Bem-vindo ao WhatsApp</h3>
              <p>Selecione uma conversa para começar a conversar</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Seleção de Contatos */}
      <Dialog open={showContactSelector} onOpenChange={setShowContactSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Contato</DialogTitle>
            <DialogDescription>
              O cliente possui múltiplos contatos de WhatsApp. Selecione qual deseja usar:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {contactOptions.map((contact, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start p-4 h-auto"
                onClick={() => handleContactSelection(index)}
              >
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">+{contact.telefone}</span>
                  </div>
                  {contact.nome && (
                    <span className="text-sm text-muted-foreground">{contact.nome}</span>
                  )}
                  {contact.observacoes && (
                    <span className="text-xs text-muted-foreground italic">
                      {contact.observacoes}
                    </span>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppChat;
