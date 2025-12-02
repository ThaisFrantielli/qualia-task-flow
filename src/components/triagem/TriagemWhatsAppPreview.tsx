import { useTriagemConversation, useTriagemMessages } from "@/hooks/useTriagemWhatsApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TriagemWhatsAppPreviewProps {
  clienteId?: string;
  whatsappNumber?: string;
}

export function TriagemWhatsAppPreview({ clienteId, whatsappNumber }: TriagemWhatsAppPreviewProps) {
  const { data: conversation, isLoading: convLoading } = useTriagemConversation(clienteId, whatsappNumber);
  const { data: messages, isLoading: msgLoading } = useTriagemMessages(conversation?.id);

  const isLoading = convLoading || msgLoading;

  if (!whatsappNumber && !clienteId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground animate-pulse">
        Carregando mensagens...
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Nenhuma conversa de WhatsApp encontrada
      </div>
    );
  }

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-500" />
            Conversa WhatsApp
          </CardTitle>
          {conversation.unread_count > 0 && (
            <Badge variant="destructive" className="text-xs">
              {conversation.unread_count} não lida(s)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {messages && messages.length > 0 ? (
          <ScrollArea className="h-[150px] pr-2">
            <div className="space-y-2">
              {messages.slice(-5).map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "text-xs p-2 rounded-lg max-w-[85%]",
                    msg.sender_type === 'customer' 
                      ? "bg-muted ml-0 mr-auto" 
                      : "bg-primary/10 ml-auto mr-0 text-right"
                  )}
                >
                  <p className="break-words">{msg.content || "(mensagem vazia)"}</p>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : conversation.last_message ? (
          <div className="text-xs p-2 rounded-lg bg-muted">
            <p className="break-words">{conversation.last_message}</p>
            {conversation.last_message_at && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: ptBR })}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Sem mensagens</p>
        )}
      </CardContent>
    </Card>
  );
}
