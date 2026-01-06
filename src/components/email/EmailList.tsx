import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Paperclip, Star, Mail, MailOpen } from 'lucide-react';
import { EmailMessage } from '@/types/email';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface EmailListProps {
  emails: EmailMessage[];
  selectedEmail: EmailMessage | null;
  onSelectEmail: (email: EmailMessage) => void;
  isLoading?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

function formatEmailDate(dateString: string): string {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: ptBR });
  }
  
  if (isYesterday(date)) {
    return 'Ontem';
  }
  
  const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysAgo < 7) {
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  }
  
  return format(date, 'dd/MM/yy', { locale: ptBR });
}

export function EmailList({
  emails,
  selectedEmail,
  onSelectEmail,
  isLoading = false,
  selectedIds = [],
  onSelectionChange
}: EmailListProps) {
  const handleCheckboxChange = (emailId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      onSelectionChange([...selectedIds, emailId]);
    } else {
      onSelectionChange(selectedIds.filter(id => id !== emailId));
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
            <Skeleton className="h-4 w-4 mt-1" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Nenhum email encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {emails.map((email) => {
          const isSelected = selectedEmail?.id === email.id;
          const isChecked = selectedIds.includes(email.id);
          
          return (
            <div
              key={email.id}
              onClick={() => onSelectEmail(email)}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                isSelected
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50",
                !email.isRead && "bg-primary/5"
              )}
            >
              {/* Checkbox */}
              {onSelectionChange && (
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => handleCheckboxChange(email.id, checked as boolean)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
              )}
              
              {/* Read indicator */}
              <div className="mt-1">
                {email.isRead ? (
                  <MailOpen className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Mail className="h-4 w-4 text-primary" />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "truncate text-sm",
                    !email.isRead && "font-semibold"
                  )}>
                    {email.from.name || email.from.email}
                  </p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatEmailDate(email.date)}
                  </span>
                </div>
                
                {/* Subject */}
                <p className={cn(
                  "text-sm truncate mt-0.5",
                  !email.isRead ? "font-medium" : "text-muted-foreground"
                )}>
                  {email.subject}
                </p>
                
                {/* Snippet */}
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {email.snippet}
                </p>
                
                {/* Indicators */}
                <div className="flex items-center gap-2 mt-1">
                  {email.hasAttachments && (
                    <Paperclip className="h-3 w-3 text-muted-foreground" />
                  )}
                  {email.isStarred && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
