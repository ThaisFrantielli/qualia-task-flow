import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  UserPlus, 
  Ticket, 
  X, 
  Clock, 
  Mail, 
  Phone, 
  MessageSquare, 
  ChevronDown,
  Hand,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TriagemInlineChat } from "./TriagemInlineChat";
import type { TriagemLead } from "@/hooks/useTriagemRealtime";
import { cn } from "@/lib/utils";

interface TriagemLeadCardV2Props {
  lead: TriagemLead;
  onEncaminharComercial: (clienteId: string) => void;
  onCriarTicket: (lead: TriagemLead) => void;
  onDescartar: (clienteId: string) => void;
  onAtribuir?: (clienteId: string) => void;
  isEncaminhando?: boolean;
  isDescartando?: boolean;
  isAtribuindo?: boolean;
  currentUserId?: string;
}

export function TriagemLeadCardV2({
  lead,
  onEncaminharComercial,
  onCriarTicket,
  onDescartar,
  onAtribuir,
  isEncaminhando,
  isDescartando,
  isAtribuindo,
  currentUserId
}: TriagemLeadCardV2Props) {
  const [chatOpen, setChatOpen] = useState(false);
  
  const createdAt = lead.created_at || lead.cadastro_cliente;
  const isWhatsAppLead = lead.origem === 'whatsapp_inbound' || !!lead.whatsapp_number;
  const hasConversation = !!lead.conversation;
  const unreadCount = lead.conversation?.unread_count || 0;
  const isAssignedToMe = lead.ultimo_atendente_id === currentUserId;
  const isInProgress = lead.status_triagem === 'em_atendimento';

  const displayName = lead.nome_fantasia || lead.razao_social || lead.whatsapp_number || "Lead sem nome";

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg",
      unreadCount > 0 && "ring-2 ring-green-500/50 shadow-green-500/10",
      isInProgress && isAssignedToMe && "border-primary/50 bg-primary/5"
    )}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate" title={displayName}>
              {displayName}
            </h3>
            {lead.codigo_cliente && (
              <p className="text-xs text-muted-foreground">
                #{lead.codigo_cliente}
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {/* Status Badge */}
            {isInProgress ? (
              <Badge variant="default" className="text-xs">
                Em atendimento
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                Aguardando
              </Badge>
            )}
            
            {/* WhatsApp Badge com contador */}
            {isWhatsAppLead && (
              <Badge 
                variant={unreadCount > 0 ? "destructive" : "outline"} 
                className={cn(
                  "text-xs flex items-center gap-1",
                  unreadCount === 0 && "border-green-500 text-green-600"
                )}
              >
                <MessageSquare className="w-3 h-3" />
                {unreadCount > 0 ? `${unreadCount} nova(s)` : 'WhatsApp'}
              </Badge>
            )}
            
            {/* Tempo */}
            {createdAt && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(createdAt), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Info do Lead */}
        <div className="text-sm space-y-1">
          {lead.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate text-xs">{lead.email}</span>
            </div>
          )}
          {(lead.whatsapp_number || lead.telefone) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs">{lead.whatsapp_number || lead.telefone}</span>
            </div>
          )}
        </div>

        {/* Preview da última mensagem */}
        {hasConversation && lead.conversation?.last_message && (
          <div className="bg-muted/50 rounded-md p-2 text-xs">
            <p className="text-muted-foreground line-clamp-2">
              {lead.conversation.last_message}
            </p>
          </div>
        )}

        {/* Chat inline colapsável */}
        {hasConversation && (
          <Collapsible open={chatOpen} onOpenChange={setChatOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {chatOpen ? 'Fechar conversa' : 'Ver conversa completa'}
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  chatOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <TriagemInlineChat 
                conversationId={lead.conversation!.id}
                maxHeight="250px"
              />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Ações */}
        <div className="flex flex-col gap-1.5 pt-2 border-t">
          {/* Botão de atribuir (se não estiver atribuído) */}
          {!isInProgress && onAtribuir && (
            <Button
              className="w-full justify-start"
              variant="secondary"
              size="sm"
              onClick={() => onAtribuir(lead.id)}
              disabled={isAtribuindo}
            >
              <Hand className="w-4 h-4 mr-2" />
              Assumir atendimento
            </Button>
          )}
          
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant="default"
              size="sm"
              onClick={() => onEncaminharComercial(lead.id)}
              disabled={isEncaminhando}
              className="text-xs"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Comercial
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCriarTicket(lead)}
              className="text-xs"
            >
              <Ticket className="w-3.5 h-3.5 mr-1.5" />
              Ticket
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDescartar(lead.id)}
            disabled={isDescartando}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Descartar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
