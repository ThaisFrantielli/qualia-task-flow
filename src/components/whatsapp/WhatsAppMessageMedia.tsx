import { useState } from 'react';
import { FileText, Download, Image as ImageIcon, Video, Music, File, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';

interface MediaAttachment {
  id: string;
  media_type: 'image' | 'video' | 'audio' | 'document';
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_url: string;
  thumbnail_url: string | null;
  caption: string | null;
}

interface WhatsAppMessageMediaProps {
  media: MediaAttachment;
  className?: string;
}

export function WhatsAppMessageMedia({ media, className = '' }: WhatsAppMessageMediaProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Tamanho desconhecido';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getMediaIcon = () => {
    switch (media.media_type) {
      case 'image': return <ImageIcon className="h-5 w-5" />;
      case 'video': return <Video className="h-5 w-5" />;
      case 'audio': return <Music className="h-5 w-5" />;
      case 'document': return <FileText className="h-5 w-5" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(media.storage_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = media.file_name || `download_${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
    }
  };

  // Image thumbnail
  if (media.media_type === 'image') {
    return (
      <>
        <div className={`relative group cursor-pointer ${className}`}>
          <img
            src={media.storage_url}
            alt={media.caption || 'Imagem'}
            className="max-w-xs max-h-64 rounded-lg object-cover"
            onClick={() => setIsPreviewOpen(true)}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
            <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {media.caption && (
            <p className="text-sm mt-2">{media.caption}</p>
          )}
        </div>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Pré-visualização da Imagem</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              <img
                src={media.storage_url}
                alt={media.caption || 'Imagem'}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
              {media.caption && (
                <p className="text-sm text-muted-foreground">{media.caption}</p>
              )}
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Baixar Imagem
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Video player
  if (media.media_type === 'video') {
    return (
      <div className={className}>
        <video
          src={media.storage_url}
          controls
          className="max-w-xs max-h-64 rounded-lg"
          preload="metadata"
        >
          Seu navegador não suporta vídeos.
        </video>
        {media.caption && (
          <p className="text-sm mt-2">{media.caption}</p>
        )}
      </div>
    );
  }

  // Audio player
  if (media.media_type === 'audio') {
    return (
      <div className={`flex items-center gap-3 p-3 bg-muted rounded-lg max-w-xs ${className}`}>
        <Music className="h-8 w-8 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <audio src={media.storage_url} controls className="w-full" preload="metadata">
            Seu navegador não suporta áudios.
          </audio>
          {media.caption && (
            <p className="text-xs mt-1 truncate">{media.caption}</p>
          )}
        </div>
      </div>
    );
  }

  // Document/File card
  return (
    <Card className={`p-4 max-w-xs ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-muted rounded-lg flex-shrink-0">
          {getMediaIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {media.file_name || 'Documento'}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(media.file_size)}
          </p>
          {media.caption && (
            <p className="text-xs mt-1 text-muted-foreground">{media.caption}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownload}
          className="flex-1"
        >
          <Download className="h-3 w-3 mr-2" />
          Baixar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(media.storage_url, '_blank')}
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}
