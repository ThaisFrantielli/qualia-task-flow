import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Reply, 
  ReplyAll, 
  Forward, 
  Trash2, 
  Archive, 
  Star,
  Paperclip,
  Download,
  ClipboardList,
  MoreHorizontal
} from 'lucide-react';
import { EmailMessage, EmailAttachment } from '@/types/email';
import { useEmailDetail } from '@/hooks/useEmails';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface EmailDetailProps {
  email: EmailMessage;
  accountId: string;
  onBack: () => void;
  onReply: (email: EmailMessage) => void;
  onCreateTask: (email: EmailMessage) => void;
  onDelete?: (email: EmailMessage) => void;
  onArchive?: (email: EmailMessage) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function AttachmentItem({ attachment }: { attachment: EmailAttachment }) {
  const handleDownload = () => {
    // TODO: Implement actual download
    console.log('Downloading attachment:', attachment.filename);
  };

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={handleDownload}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EmailDetail({
  email,
  accountId,
  onBack,
  onReply,
  onCreateTask,
  onDelete,
  onArchive
}: EmailDetailProps) {
  const { data: fullEmail, isLoading } = useEmailDetail({
    accountId,
    messageId: email.id,
    enabled: !!email.id
  });

  const displayEmail = fullEmail || email;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onReply(displayEmail)}>
            <Reply className="h-4 w-4 mr-2" />
            Responder
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => onCreateTask(displayEmail)}
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            Criar Tarefa
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onReply(displayEmail)}>
                <ReplyAll className="h-4 w-4 mr-2" />
                Responder a Todos
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Forward className="h-4 w-4 mr-2" />
                Encaminhar
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Star className="h-4 w-4 mr-2" />
                Marcar com Estrela
              </DropdownMenuItem>
              {onArchive && (
                <DropdownMenuItem onClick={() => onArchive(displayEmail)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(displayEmail)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Subject */}
          <h1 className="text-xl font-semibold">{displayEmail.subject}</h1>

          {/* Headers */}
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <span className="text-muted-foreground w-16">De:</span>
              <span className="font-medium">
                {displayEmail.from.name ? (
                  <>
                    {displayEmail.from.name}{' '}
                    <span className="text-muted-foreground font-normal">
                      &lt;{displayEmail.from.email}&gt;
                    </span>
                  </>
                ) : (
                  displayEmail.from.email
                )}
              </span>
            </div>
            
            <div className="flex items-start">
              <span className="text-muted-foreground w-16">Para:</span>
              <span>
                {displayEmail.to?.map(addr => addr.name || addr.email).join(', ') || 'Você'}
              </span>
            </div>
            
            {displayEmail.cc && displayEmail.cc.length > 0 && (
              <div className="flex items-start">
                <span className="text-muted-foreground w-16">CC:</span>
                <span>
                  {displayEmail.cc.map(addr => addr.name || addr.email).join(', ')}
                </span>
              </div>
            )}
            
            <div className="flex items-start">
              <span className="text-muted-foreground w-16">Data:</span>
              <span>
                {format(new Date(displayEmail.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-border" />

          {/* Body */}
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : fullEmail?.bodyHtml ? (
            <div 
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: fullEmail.bodyHtml }}
            />
          ) : fullEmail?.body ? (
            <div className="whitespace-pre-wrap text-sm">
              {fullEmail.body}
            </div>
          ) : (
            <p className="text-muted-foreground italic">
              Conteúdo do email não disponível
            </p>
          )}

          {/* Attachments */}
          {fullEmail?.attachments && fullEmail.attachments.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos ({fullEmail.attachments.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {fullEmail.attachments.map((attachment) => (
                  <AttachmentItem key={attachment.id} attachment={attachment} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
