import { useState, useRef, useEffect } from "react";
import { useConversationMessages, useSendTriagemMessage } from "@/hooks/useTriagemRealtime";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TriagemInlineChatProps {
  conversationId: string;
  maxHeight?: string;
}

export function TriagemInlineChat({ 
  conversationId, 
  maxHeight = "300px"
}: TriagemInlineChatProps) {
  const { data: messages, isLoading } = useConversationMessages(conversationId);
  const sendMessage = useSendTriagemMessage();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    await sendMessage.mutateAsync({
      conversationId,
      content: newMessage.trim()
    });

    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-background overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="w-4 h-4 text-green-500" />
          Chat WhatsApp
        </div>
        <span className="text-xs text-muted-foreground">
          {messages?.length || 0} mensagens
        </span>
      </div>

      {/* Messages */}
      <ScrollArea 
        ref={scrollRef}
        className="p-3"
        style={{ maxHeight }}
      >
        <div className="space-y-2">
          {messages?.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Nenhuma mensagem ainda
            </div>
          )}
          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                msg.sender_type === 'customer' 
                  ? "bg-muted mr-auto" 
                  : "bg-primary text-primary-foreground ml-auto"
              )}
            >
              <p className="break-words whitespace-pre-wrap">
                {msg.content || "(mensagem vazia)"}
              </p>
              <span className={cn(
                "text-[10px] mt-1 block",
                msg.sender_type === 'customer' 
                  ? "text-muted-foreground" 
                  : "text-primary-foreground/70"
              )}>
                {formatDistanceToNow(new Date(msg.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-2 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite uma mensagem..."
          className="flex-1 text-sm"
          disabled={sendMessage.isPending}
        />
        <Button 
          size="icon" 
          onClick={handleSend}
          disabled={!newMessage.trim() || sendMessage.isPending}
        >
          {sendMessage.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
