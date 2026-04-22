import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppConversations';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TemplatePicker } from '@/components/whatsapp/TemplatePicker';
import {
  Send,
  MessageSquare,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Paperclip,
  Smile,
  MoreVertical,
  Image as ImageIcon,
  Video,
  Mic,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';

type ChatPanelConversation = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  whatsapp_number?: string | null;
};

interface WhatsAppChatPanelProps {
  conversation: ChatPanelConversation | null;
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

const getFunctionErrorMessage = async (error: any) => {
  const fallback = error?.message || 'Falha ao enviar mensagem';
  const context = error?.context;

  if (!context || typeof context.json !== 'function') {
    return fallback;
  }

  try {
    const payload = await context.json();
    if (payload?.error) return String(payload.error);
    if (payload?.message) return String(payload.message);
    return fallback;
  } catch {
    return fallback;
  }
};

const toFriendlySendError = (rawError: string | null | undefined): string => {
  const fallback = 'Falha ao enviar mensagem';
  const message = String(rawError || '').trim();
  if (!message) return fallback;

  if (/no\s+lid\s+for\s+user/i.test(message)) {
    return 'Número de destino inválido ou não registrado no WhatsApp';
  }

  if (/não está registrado no WhatsApp/i.test(message) || /not registered/i.test(message)) {
    return 'Este número não está registrado no WhatsApp';
  }

  if (/circuit\s*breaker\s*open/i.test(message)) {
    return 'Envio temporariamente pausado. Tentando novamente em breve.';
  }

  if (/instance not connected/i.test(message)) {
    return 'Instância WhatsApp desconectada. Reconecte antes de enviar.';
  }

  return message;
};

const isCircuitBreakerOpenError = (rawError: string | null | undefined) =>
  /circuit\s*breaker\s*open/i.test(String(rawError || ''));

const getMessageFailureReason = (msg: any): string | null => {
  const metadataError = msg?.metadata && typeof msg.metadata === 'object'
    ? (msg.metadata as any).error || (msg.metadata as any).last_error || (msg.metadata as any).error_message
    : null;

  const raw = msg?.last_error || msg?.error_message || metadataError || null;
  if (!raw) return null;
  return toFriendlySendError(String(raw));
};

const getDeliveryIcon = (status: string | null | undefined) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-amber-500" />;
    case 'sent':
      return <Check className="h-3 w-3 text-primary-foreground/70" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-primary-foreground/70" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-400" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-red-400" />;
    default:
      return <Check className="h-3 w-3 text-primary-foreground/70" />;
  }
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [localPendingMessages, setLocalPendingMessages] = useState<any[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const sendLockRef = useRef(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<{
    clienteId: string | null;
    nome: string;
    tags: string[];
    lastTicket?: { id: string; title: string | null; status: string | null } | null;
    lastOpportunity?: { id: string; title: string | null; status: string | null } | null;
    lastAtendimento?: { id: string; summary: string | null; status: string | null } | null;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom on new messages (include local pending messages)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, localPendingMessages]);

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

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const hasCircuitBreakerOpen = useMemo(() => {
    const now = Date.now();

    return messages.some((message: any) => {
      if (message?.sender_type === 'customer') return false;

      const rawReason = message?.last_error || message?.error_message || '';
      if (!isCircuitBreakerOpenError(rawReason)) return false;

      const marker = message?.failed_at || message?.updated_at || message?.created_at;
      if (!marker) return true;

      const diffMs = now - new Date(marker).getTime();
      return Number.isFinite(diffMs) && diffMs >= 0 && diffMs <= 60_000;
    });
  }, [messages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !conversation || !instanceId) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${conversation.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

      // Insert message in DB first
      const { data: messageData, error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation.id,
          instance_id: instanceId,
          content: '[Mídia]',
          has_media: true,
          media_url: publicUrl,
          media_type: file.type,
          file_name: file.name,
          metadata: {
            media_url: publicUrl,
            media_type: file.type,
            file_name: file.name
          },
          message_type: (file.type || '').startsWith('image/') ? 'image' : 
                        (file.type || '').startsWith('video/') ? 'video' : 
                        (file.type || '').startsWith('audio/') ? 'audio' : 'document',
          sender_type: 'agent',
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: sendError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          instance_id: instanceId,
          phoneNumber: conversation.customer_phone,
          message: '',
          mediaUrl: publicUrl,
          mediaType: file.type || '',
          fileName: file.name,
          conversationId: conversation.id,
          message_id: messageData.id,
        }
      });

      if (sendError) {
        throw new Error(toFriendlySendError(await getFunctionErrorMessage(sendError)));
      }

      toast({
        title: 'Arquivo enviado',
        description: 'O arquivo foi enviado com sucesso!'
      });
      
      refetch();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro ao enviar arquivo',
        description: toFriendlySendError(error.message || 'Falha ao enviar arquivo'),
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      // Clear all file inputs
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (audioInputRef.current) audioInputRef.current.value = '';
      if (documentInputRef.current) documentInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to use audio/ogg first (better WhatsApp compatibility), fallback to webm
      const mimeType = MediaRecorder.isTypeSupported('audio/ogg; codecs=opus') 
        ? 'audio/ogg; codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await sendAudioMessage(audioBlob, mimeType);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer with 2-minute max limit
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop at 2 minutes (120 seconds)
          if (newTime >= 120) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      toast({
        title: 'Gravando áudio',
        description: 'Clique novamente para enviar (máx. 2min)'
      });
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Erro ao gravar',
        description: 'Não foi possível acessar o microfone',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const sendAudioMessage = async (audioBlob: Blob, mimeType: string) => {
    if (!conversation || !instanceId) return;

    setIsUploading(true);
    try {
      const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const fileName = `audio_${Date.now()}.${extension}`;
      const filePath = `${conversation.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, audioBlob, {
          contentType: mimeType
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

      // Insert message in DB first
      const { data: messageData, error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation.id,
          instance_id: instanceId,
          content: '[Áudio]',
          has_media: true,
          media_url: publicUrl,
          media_type: mimeType,
          file_name: fileName,
          metadata: {
            media_url: publicUrl,
            media_type: mimeType,
            file_name: fileName
          },
          message_type: 'audio',
          sender_type: 'agent',
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: sendError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          instance_id: instanceId,
          phoneNumber: conversation.customer_phone,
          message: '',
          mediaUrl: publicUrl,
          mediaType: mimeType,
          fileName,
          conversationId: conversation.id,
          message_id: messageData.id,
        }
      });

      if (sendError) {
        throw new Error(toFriendlySendError(await getFunctionErrorMessage(sendError)));
      }

      toast({
        title: 'Áudio enviado',
        description: 'O áudio foi enviado com sucesso!'
      });
      
      refetch();
    } catch (error: any) {
      console.error('Error sending audio:', error);
      toast({
        title: 'Erro ao enviar áudio',
        description: toFriendlySendError(error.message || 'Falha ao enviar áudio'),
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (sendLockRef.current) return;
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
    sendLockRef.current = true;
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistic UI: add a local pending message immediately with a temp ID
    const tempId = `local-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      conversation_id: conversation.id,
      instance_id: instanceId,
      content: messageContent,
      message_type: 'text',
      sender_type: 'agent',
      status: 'pending',
      created_at: new Date().toISOString()
    };
    setLocalPendingMessages(prev => [...prev, tempMsg]);

    try {
      // Insert message in DB first — this fires the realtime INSERT event.
      // We immediately promote the temp entry to the real DB id so that
      // combinedMessages deduplication removes the duplicate.
      const { data: messageData, error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation.id,
          instance_id: instanceId,
          content: messageContent,
          message_type: 'text',
          sender_type: 'agent',
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Replace the temp entry with the real DB id so the realtime event
      // for this same id will be deduped by combinedMessages.
      setLocalPendingMessages(prev =>
        prev.map(m => m.id === tempId ? { ...messageData } : m)
      );

      // whatsapp-send receives the existing message_id and only UPDATES it
      // (no second INSERT), so no duplication happens from this side.
      const { error: sendError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          instance_id: instanceId,
          phoneNumber: conversation.customer_phone,
          message: messageContent,
          conversationId: conversation.id,
          message_id: messageData.id,
        }
      });

      if (sendError) {
        throw new Error(toFriendlySendError(await getFunctionErrorMessage(sendError)));
      }

      // The realtime subscription in useWhatsAppMessages will push the
      // real message into `messages`. Remove the local optimistic entry
      // so combinedMessages shows only one copy.
      setLocalPendingMessages(prev => prev.filter(m => m.id !== messageData.id));

    } catch (error: any) {
      // On error, remove the optimistic message and restore the input
      setLocalPendingMessages(prev => prev.filter(m => m.id !== tempId && !String(m.id).startsWith('local-')));
      setNewMessage(messageContent);
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar',
        description: toFriendlySendError(error.message || 'Falha ao enviar mensagem'),
        variant: 'destructive'
      });
    } finally {
      sendLockRef.current = false;
      setIsSending(false);
    }
  };

  const handleRetryMessage = async (msg: any) => {
    if (!conversation || !instanceId) return;

    if (instanceStatus !== 'connected') {
      toast({
        title: 'Instância desconectada',
        description: 'Conecte a instância para reenviar mensagens.',
        variant: 'destructive'
      });
      return;
    }

    const phoneNumber = conversation.customer_phone || conversation.whatsapp_number;
    if (!phoneNumber) {
      toast({
        title: 'Número indisponível',
        description: 'Esta conversa não possui telefone válido para reenvio.',
        variant: 'destructive'
      });
      return;
    }

    setRetryingMessageId(msg.id);
    try {
      const metadata = msg.metadata && typeof msg.metadata === 'object' ? (msg.metadata as any) : null;
      const mediaUrl = msg.media_url || metadata?.media_url || null;
      const mediaType = msg.media_type || metadata?.media_type || null;
      const fileName = msg.file_name || metadata?.file_name || null;

      const { error: sendError } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          instance_id: instanceId,
          phoneNumber,
          message: msg.content || '',
          mediaUrl,
          mediaType,
          fileName,
          conversationId: conversation.id,
          message_id: msg.id,
        }
      });

      if (sendError) {
        throw new Error(toFriendlySendError(await getFunctionErrorMessage(sendError)));
      }

      toast({
        title: 'Reenvio iniciado',
        description: 'A mensagem voltou para a fila de envio.'
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Falha no reenvio',
        description: toFriendlySendError(error?.message),
        variant: 'destructive'
      });
    } finally {
      setRetryingMessageId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const loadCustomerProfile = async () => {
    const phone = conversation?.customer_phone || conversation?.whatsapp_number;
    if (!phone) return;

    setIsProfileLoading(true);
    try {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id, nome_fantasia, razao_social, status_triagem')
        .or(`whatsapp_number.eq.${phone},telefone.eq.${phone}`)
        .maybeSingle();

      if (!cliente?.id) {
        setCustomerProfile({
          clienteId: null,
          nome: conversation?.customer_name || phone,
          tags: ['Sem cadastro'],
          lastTicket: null,
          lastOpportunity: null,
          lastAtendimento: null,
        });
        return;
      }

      const [ticketRes, opportunityRes, atendimentoRes] = await Promise.all([
        supabase
          .from('tickets')
          .select('id, titulo, status')
          .eq('cliente_id', cliente.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('oportunidades')
          .select('id, titulo, status')
          .eq('cliente_id', cliente.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('atendimentos')
          .select('id, summary, status')
          .eq('cliente_id', cliente.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const tags: string[] = [];
      if ((cliente.status_triagem || '').toLowerCase() === 'vip') tags.push('VIP');
      if (ticketRes.data) tags.push('Recorrente');
      if (tags.length === 0) tags.push('Ativo');

      setCustomerProfile({
        clienteId: cliente.id,
        nome: cliente.nome_fantasia || cliente.razao_social || conversation?.customer_name || phone,
        tags,
        lastTicket: ticketRes.data ? { id: ticketRes.data.id, title: ticketRes.data.titulo, status: ticketRes.data.status } : null,
        lastOpportunity: opportunityRes.data ? { id: opportunityRes.data.id, title: opportunityRes.data.titulo, status: opportunityRes.data.status } : null,
        lastAtendimento: atendimentoRes.data ? { id: atendimentoRes.data.id, summary: atendimentoRes.data.summary, status: atendimentoRes.data.status } : null,
      });
    } finally {
      setIsProfileLoading(false);
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

  // Combine backend messages with local optimistic pending messages.
  // Deduplicate by ID so that when the realtime event fires for a message
  // already in localPendingMessages, only one copy is rendered.
  const combinedMessages = (() => {
    const seen = new Set<string>();
    const merged: any[] = [];
    // messages (from DB/realtime) take precedence over local optimistic copies
    for (const msg of [...(messages || []), ...localPendingMessages]) {
      if (!msg?.id || seen.has(String(msg.id))) continue;
      seen.add(String(msg.id));
      merged.push(msg);
    }
    return merged.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  })();

  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  combinedMessages.forEach(msg => {
    const dateKey = formatDateHeader(msg.created_at || '');
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  return (
    <div className="h-full flex flex-col bg-[#f0f2f5] dark:bg-muted/30">
      {/* Header */}
      <div className="p-3 border-b bg-background flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(conversation.customer_name, conversation.customer_phone)}
            </AvatarFallback>
          </Avatar>
          <div>
            <button
              className="font-semibold text-sm text-left hover:underline"
              onClick={() => {
                setIsProfileOpen(true);
                loadCustomerProfile();
              }}
            >
              {conversation.customer_name || 'Cliente WhatsApp'}
            </button>
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

      {hasCircuitBreakerOpen && (
        <div className="px-3 py-2 border-b bg-amber-50 text-amber-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>Envio temporariamente pausado. Tentando novamente em breve.</span>
        </div>
      )}

      <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <SheetContent side="right" className="w-full sm:w-[420px]">
          <SheetHeader>
            <SheetTitle>Perfil do Cliente</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {isProfileLoading ? (
              <p className="text-sm text-muted-foreground">Carregando perfil...</p>
            ) : !customerProfile ? (
              <p className="text-sm text-muted-foreground">Sem dados para este cliente.</p>
            ) : (
              <>
                <div>
                  <h4 className="text-base font-semibold">{customerProfile.nome}</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {customerProfile.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Último ticket</p>
                    <p>{customerProfile.lastTicket?.title || 'Nenhum ticket encontrado'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Última oportunidade</p>
                    <p>{customerProfile.lastOpportunity?.title || 'Nenhuma oportunidade encontrada'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Último atendimento</p>
                    <p>{customerProfile.lastAtendimento?.summary || 'Nenhum atendimento encontrado'}</p>
                  </div>
                </div>

                {customerProfile.clienteId && (
                  <Button asChild className="w-full">
                    <a href={`/hub-cliente/${customerProfile.clienteId}`}>Abrir Hub do Cliente</a>
                  </Button>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-muted-foreground">Carregando mensagens...</div>
          </div>
        ) : combinedMessages.length === 0 ? (
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
                    (() => {
                      const msgAny = msg as any;
                      const failureReason = getMessageFailureReason(msgAny);

                      return (
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
                        {/* Show media if present */}
                        {msg.metadata && (msg.metadata as any).media_url && (
                          <div className="mb-2">
                            {msg.message_type === 'image' && (
                              <img 
                                src={(msg.metadata as any).media_url} 
                                alt={(msg.metadata as any).file_name || 'Image'}
                                className="rounded max-w-full max-h-64 object-contain"
                                loading="lazy"
                              />
                            )}
                            {msg.message_type === 'video' && (
                              <video 
                                src={(msg.metadata as any).media_url} 
                                controls 
                                className="rounded max-w-full max-h-64"
                              />
                            )}
                            {msg.message_type === 'audio' && (
                              <audio 
                                src={(msg.metadata as any).media_url} 
                                controls 
                                className="max-w-full"
                              />
                            )}
                            {msg.message_type === 'document' && (
                              <a 
                                href={(msg.metadata as any).media_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded",
                                  msg.sender_type === 'customer' 
                                    ? 'bg-muted hover:bg-muted/80' 
                                    : 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                                )}
                              >
                                <Paperclip className="h-4 w-4" />
                                <span className="text-sm">{(msg.metadata as any).file_name || 'Documento'}</span>
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Show text content if present */}
                        {msg.content && msg.content.trim() && (
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        )}

                        {msg.sender_type !== 'customer' && msgAny.status === 'failed' && (
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] text-red-200">
                              {failureReason || 'Falha no envio'}
                            </p>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-6 px-2 text-[11px]"
                              onClick={() => handleRetryMessage(msgAny)}
                              disabled={retryingMessageId === msg.id || instanceStatus !== 'connected'}
                            >
                              {retryingMessageId === msg.id ? 'Reenviando...' : 'Reenviar'}
                            </Button>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={cn(
                            "text-[10px]",
                            msg.sender_type === 'customer' ? 'text-muted-foreground' : 'text-primary-foreground/70'
                          )}>
                            {formatTime(msg.created_at || '')}
                          </span>
                          {msg.sender_type !== 'customer' && getDeliveryIcon(msgAny.status)}
                        </div>
                      </div>
                    </div>
                      );
                    })()
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-background relative shrink-0">
        {showEmojiPicker && (
          <div className="absolute bottom-16 right-4 z-50 shadow-xl rounded-lg">
            <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={400} />
          </div>
        )}
        
        {showAttachMenu && (
          <div className="absolute bottom-16 left-4 z-50 bg-background border rounded-lg shadow-xl p-2 space-y-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }}
            >
              <ImageIcon className="h-4 w-4 text-blue-600" />
              Imagem
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={() => { videoInputRef.current?.click(); setShowAttachMenu(false); }}
            >
              <Video className="h-4 w-4 text-purple-600" />
              Vídeo
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={() => { audioInputRef.current?.click(); setShowAttachMenu(false); }}
            >
              <Mic className="h-4 w-4 text-red-600" />
              Áudio
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start gap-2"
              onClick={() => { documentInputRef.current?.click(); setShowAttachMenu(false); }}
            >
              <FileText className="h-4 w-4 text-gray-600" />
              Documento
            </Button>
          </div>
        )}
        
        <input
          type="file"
          ref={imageInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileUpload}
        />
        <input
          type="file"
          ref={videoInputRef}
          className="hidden"
          accept="video/*"
          onChange={handleFileUpload}
        />
        <input
          type="file"
          ref={audioInputRef}
          className="hidden"
          accept="audio/*"
          onChange={handleFileUpload}
        />
        <input
          type="file"
          ref={documentInputRef}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
          onChange={handleFileUpload}
        />

        <div className="flex items-center gap-2">
          {!isRecording ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 shrink-0"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                disabled={isUploading || instanceStatus !== 'connected'}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder={instanceStatus !== 'connected' ? 'Instância desconectada' : 'Digite uma mensagem...'}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending || instanceStatus !== 'connected'}
                className="flex-1"
              />
              <TemplatePicker
                onSelect={(message) => setNewMessage(message)}
                clientName={conversation.customer_name || undefined}
                customerData={{
                  nome: conversation.customer_name || '',
                  telefone: conversation.customer_phone || conversation.whatsapp_number || ''
                }}
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 shrink-0"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile className="h-4 w-4" />
              </Button>
              {newMessage.trim() ? (
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || instanceStatus !== 'connected'}
                  size="icon"
                  className="h-9 w-9 shrink-0"
                >
                  {isSending ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <Button
                  onClick={startRecording}
                  disabled={isUploading || instanceStatus !== 'connected'}
                  size="icon"
                  className="h-9 w-9 shrink-0"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="h-3 w-3 bg-red-600 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  Gravando... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <Button
                onClick={stopRecording}
                size="icon"
                className="h-9 w-9 shrink-0 bg-red-600 hover:bg-red-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChatPanel;
