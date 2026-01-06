import React, { useState, useEffect, useRef } from 'react';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppConversations';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
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
  MoreVertical,
  Image as ImageIcon,
  Video,
  Mic,
  FileText
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

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
          content: '',
          has_media: true,
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

      // Send directly to local service
      const response = await fetch('http://localhost:3008/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance_id: instanceId,
          phoneNumber: conversation.customer_phone,
          message: '',
          mediaUrl: publicUrl,
            mediaType: file.type || '',
          fileName: file.name,
          conversation_id: conversation.id,
          message_id: messageData.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      toast({
        title: 'Arquivo enviado',
        description: 'O arquivo foi enviado com sucesso!'
      });
      
      setTimeout(() => refetch(), 500);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Erro ao enviar arquivo',
        description: error.message || 'Falha ao enviar arquivo',
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
          content: '',
          has_media: true,
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

      // Send directly to local service
      const response = await fetch('http://localhost:3008/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance_id: instanceId,
          phoneNumber: conversation.customer_phone,
          message: '',
          mediaUrl: publicUrl,
          mediaType: mimeType,
          fileName: fileName,
          conversation_id: conversation.id,
          message_id: messageData.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      toast({
        title: 'Áudio enviado',
        description: 'O áudio foi enviado com sucesso!'
      });
      
      setTimeout(() => refetch(), 500);
    } catch (error: any) {
      console.error('Error sending audio:', error);
      toast({
        title: 'Erro ao enviar áudio',
        description: error.message || 'Falha ao enviar áudio',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

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
      // Insert message in DB first
      const { data: messageData, error: insertError } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversation.id,
          instance_id: instanceId,
          content: newMessage.trim(),
          message_type: 'text',
          sender_type: 'agent',
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send directly to local service
      const response = await fetch('http://localhost:3008/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instance_id: instanceId,
          phoneNumber: conversation.customer_phone,
          message: newMessage.trim(),
          conversation_id: conversation.id,
          message_id: messageData.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      setNewMessage('');
      setTimeout(() => refetch(), 500);
      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi enviada com sucesso!'
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Falha ao enviar mensagem',
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
      <ScrollArea className="flex-1 p-4 min-h-0">
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
                placeholder="Digite uma mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending || instanceStatus !== 'connected'}
                className="flex-1"
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
