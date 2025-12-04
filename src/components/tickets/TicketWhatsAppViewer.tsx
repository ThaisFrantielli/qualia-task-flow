import { useTriagemConversation, useTriagemMessages } from "@/hooks/useTriagemWhatsApp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TicketWhatsAppViewerProps {
    clienteId?: string;
    whatsappNumber?: string;
}

export function TicketWhatsAppViewer({ clienteId, whatsappNumber }: TicketWhatsAppViewerProps) {
    const { data: conversation, isLoading: convLoading } = useTriagemConversation(clienteId, whatsappNumber);
    const { data: messages, isLoading: msgLoading } = useTriagemMessages(conversation?.id);

    const isLoading = convLoading || msgLoading;

    if (!whatsappNumber && !clienteId) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhum cliente ou número vinculado.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p>Carregando histórico...</p>
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p>Nenhuma conversa de WhatsApp encontrada.</p>
            </div>
        );
    }

    return (
        <Card className="h-[500px] flex flex-col border-none shadow-none bg-transparent">
            <CardHeader className="pb-2 pt-0 px-0">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Badge variant={conversation.is_online ? "default" : "secondary"} className="gap-1">
                            {conversation.is_online ? "Online" : "Offline"}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                            {conversation.whatsapp_number}
                        </span>
                    </CardTitle>
                    {conversation.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                            {conversation.unread_count} não lida(s)
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-0 pb-0 flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-4 p-1">
                        {messages && messages.length > 0 ? (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "flex flex-col max-w-[80%]",
                                        msg.sender_type === 'customer'
                                            ? "mr-auto items-start"
                                            : "ml-auto items-end"
                                    )}
                                >
                                    <div className={cn(
                                        "p-3 rounded-lg text-sm",
                                        msg.sender_type === 'customer'
                                            ? "bg-muted text-foreground rounded-tl-none"
                                            : "bg-primary text-primary-foreground rounded-tr-none"
                                    )}>
                                        <p className="break-words whitespace-pre-wrap">{msg.content || "(mensagem vazia)"}</p>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 px-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                <p>Nenhuma mensagem no histórico.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
