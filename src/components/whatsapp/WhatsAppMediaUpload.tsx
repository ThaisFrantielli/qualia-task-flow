import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, X, ImageIcon, Video, FileText, File } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WHATSAPP } from '@/integrations/whatsapp/config';

interface WhatsAppMediaUploadProps {
  conversationId?: string;
  whatsappNumber: string;
  instanceId?: string;
  onMediaSent?: () => void;
  caption?: string;
}

export function WhatsAppMediaUpload({
  conversationId,
  whatsappNumber,
  instanceId,
  onMediaSent,
  caption
}: WhatsAppMediaUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 16MB for WhatsApp)
      if (file.size > 16 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O tamanho máximo é 16MB.',
          variant: 'destructive'
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSendMedia = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // 1. Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `whatsapp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

      // 3. Determine media type
      const mimeType = selectedFile.type;
      let mediaType = 'document';
      if (mimeType.startsWith('image/')) mediaType = 'image';
      else if (mimeType.startsWith('video/')) mediaType = 'video';
      else if (mimeType.startsWith('audio/')) mediaType = 'audio';

      // 4. Send media via WhatsApp service
      const response = await fetch(`${WHATSAPP.SERVICE_URL}/send-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: whatsappNumber,
          mediaUrl: publicUrl,
          mediaType,
          caption: caption?.trim() || undefined,
          instance_id: instanceId,
          fileName: selectedFile.name,
          mimeType
        })
      });

      if (!response.ok) throw new Error('Falha ao enviar mídia');

      const result = await response.json();

      // 5. Save message with media to database
      if (conversationId) {
        const { data: message } = await supabase
          .from('whatsapp_messages')
          .insert({
            conversation_id: conversationId,
            instance_id: instanceId,
            content: caption?.trim() || `[${mediaType.toUpperCase()}]`,
            sender_type: 'user',
            message_type: mediaType,
            whatsapp_message_id: result.id,
            status: 'sent',
            has_media: true
          })
          .select()
          .single();

        // 6. Save media metadata
        if (message) {
          await supabase.from('whatsapp_media').insert({
            message_id: message.id,
            conversation_id: conversationId,
            media_type: mediaType,
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            mime_type: mimeType,
            storage_url: publicUrl,
            caption: caption?.trim() || null
          });
        }
      }

      toast({
        title: 'Arquivo enviado',
        description: 'Sua mídia foi enviada com sucesso.'
      });

      setSelectedFile(null);
      onMediaSent?.();

    } catch (error: any) {
      console.error('Error sending media:', error);
      toast({
        title: 'Erro ao enviar arquivo',
        description: error.message || 'Não foi possível enviar o arquivo.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getMediaIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (file.type.startsWith('audio/')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        className="hidden"
      />

      {selectedFile ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg flex-1">
          <div className="flex items-center gap-2 flex-1">
            {getMediaIcon(selectedFile)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="default"
              onClick={handleSendMedia}
              disabled={isUploading}
              className="h-7 px-2 text-xs"
            >
              {isUploading ? 'Enviando...' : 'Enviar'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedFile(null)}
              disabled={isUploading}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="h-9 w-9"
          title="Anexar arquivo"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
