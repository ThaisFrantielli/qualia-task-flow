import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserPlus,
  Ticket,
  X,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  Hand,
  Eye,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TriagemInlineChat } from "./TriagemInlineChat";
import type { TriagemLead } from "@/hooks/useTriagemRealtime";
import { cn } from "@/lib/utils";

interface TriagemLeadCardV2Props {
  lead: TriagemLead;
  onFalarWhatsapp?: (lead: TriagemLead) => void;
  onEncaminharComercial: (clienteId: string) => void;
  onCriarTicket: (lead: TriagemLead) => void;
  onDescartar: (clienteId: string) => void;
  onAtribuir?: (clienteId: string) => void;
  isEncaminhando?: boolean;
  isDescartando?: boolean;
  isAtribuindo?: boolean;
  currentUserId?: string;
  viewMode?: 'grid' | 'list';
  showSelectionControl?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (leadId: string, checked: boolean) => void;
}

export function TriagemLeadCardV2({
  lead,
  onFalarWhatsapp,
  onEncaminharComercial,
  onCriarTicket,
  onDescartar,
  onAtribuir,
  isEncaminhando,
  isDescartando,
  isAtribuindo,
  currentUserId,
  viewMode = 'grid',
  showSelectionControl = false,
  isSelected = false,
  onToggleSelection
}: TriagemLeadCardV2Props) {
  const [chatOpen, setChatOpen] = useState(false);

  const createdAt = lead.created_at || lead.cadastro_cliente;
  const isWhatsAppLead = lead.origem === 'whatsapp_inbound' || !!lead.whatsapp_number;
  const hasConversation = !!lead.conversation;
  const canContactOnWhatsapp = Boolean(lead.whatsapp_number || lead.telefone || lead.conversation?.id);
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
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {showSelectionControl && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onToggleSelection?.(lead.id, checked === true)}
                aria-label={`Selecionar ${displayName}`}
                className="mt-1"
              />
            )}
            <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate" title={displayName}>
              {displayName}
            </h3>
            {lead.codigo_cliente && (
              <p className="text-xs text-muted-foreground">
                #{lead.codigo_cliente}
              </p>
            )}
            </div>
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
        {/* Modal do Chat */}
        {hasConversation && (
          <Dialog open={chatOpen} onOpenChange={setChatOpen}>
            <DialogContent className="max-w-[600px] p-0 overflow-hidden flex flex-col h-[80vh]">
              <DialogHeader className="p-4 border-b bg-muted/30 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  Conversa com {displayName}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden p-0 m-0">
                <TriagemInlineChat
                  conversationId={lead.conversation!.id}
                  maxHeight="100%"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Info do Lead */}
        {viewMode === 'grid' ? (
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
        ) : (
          <div className="flex gap-4 text-sm mb-2 mt-2 border-t pt-2">
            {lead.email && <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3.5 h-3.5" /><span className="text-xs">{lead.email}</span></div>}
            {(lead.whatsapp_number || lead.telefone) && <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3.5 h-3.5" /><span className="text-xs">{lead.whatsapp_number || lead.telefone}</span></div>}
          </div>
        )}

        {/* Preview da última mensagem */}
        {hasConversation && lead.conversation?.last_message && viewMode === 'grid' && (
          <div className="bg-muted/50 rounded-md p-2 text-xs">
            <p className="text-muted-foreground line-clamp-2">
              {lead.conversation.last_message}
            </p>
          </div>
        )}

        {/* Lista de Ações e Botão de Chat */}
        <div className={cn("flex gap-1.5 pt-2", viewMode === 'grid' ? "flex-col border-t mt-3" : "flex-row flex-wrap items-center mt-2")}>
          {canContactOnWhatsapp && (
            <Button
              variant="outline"
              size="sm"
              className={cn("justify-between", viewMode === 'list' && "w-auto")}
              onClick={() => {
                if (onFalarWhatsapp) {
                  onFalarWhatsapp(lead);
                  return;
                }
                if (hasConversation) {
                  setChatOpen(true);
                }
              }}
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Falar no WhatsApp
              </span>
            </Button>
          )}

          {hasConversation && !onFalarWhatsapp && (
            <Button variant="ghost" size="sm" className={cn("justify-between", viewMode === 'list' && "w-auto")} onClick={() => setChatOpen(true)}>
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Ver conversa
              </span>
            </Button>
          )}

          {!isInProgress && onAtribuir && (
            <Button
              className={cn("justify-start", viewMode === 'grid' && "w-full")}
              variant="secondary"
              size="sm"
              onClick={() => onAtribuir(lead.id)}
              disabled={isAtribuindo}
            >
              {isAtribuindo ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Hand className="w-4 h-4 mr-2" />
              )}
              {isAtribuindo ? 'Assumindo...' : 'Assumir'}
            </Button>
          )}

          <div className="flex gap-1.5">
            <Button
              variant="default"
              size="sm"
              onClick={() => onEncaminharComercial(lead.id)}
              disabled={isEncaminhando}
              className="text-xs"
            >
              {isEncaminhando ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isEncaminhando ? 'Enviando...' : 'Comercial'}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDescartar(lead.id)}
              disabled={isDescartando}
              className="text-xs text-muted-foreground hover:text-destructive px-2"
            >
              {isDescartando ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
