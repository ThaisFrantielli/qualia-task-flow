import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Ticket, X, Clock, Mail, Phone, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TriagemWhatsAppPreview } from "./TriagemWhatsAppPreview";
import type { LeadTriagem } from "@/hooks/useLeadsTriagem";

interface TriagemLeadCardProps {
  lead: LeadTriagem;
  onEncaminharComercial: (clienteId: string) => void;
  onCriarTicket: (lead: LeadTriagem) => void;
  onDescartar: (clienteId: string) => void;
  isEncaminhando?: boolean;
  isDescartando?: boolean;
}

export function TriagemLeadCard({
  lead,
  onEncaminharComercial,
  onCriarTicket,
  onDescartar,
  isEncaminhando,
  isDescartando,
}: TriagemLeadCardProps) {
  const createdAt = lead.created_at || lead.cadastro_cliente;
  const isWhatsAppLead = lead.origem === 'whatsapp_inbound' || !!lead.whatsapp_number;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg">
            {lead.nome_fantasia || lead.razao_social || "Lead sem nome"}
          </CardTitle>
          <div className="flex flex-col items-end gap-1">
            {createdAt && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(createdAt), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </Badge>
            )}
            {isWhatsAppLead && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs border-green-500 text-green-600">
                <MessageSquare className="w-3 h-3" />
                WhatsApp
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações do Lead */}
        <div className="text-sm space-y-2">
          {lead.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {(lead.whatsapp_number || lead.telefone) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>{lead.whatsapp_number || lead.telefone}</span>
            </div>
          )}
          {lead.origem && (
            <div className="text-xs">
              <span className="font-semibold">Origem:</span> {lead.origem}
            </div>
          )}
        </div>

        {/* Preview das mensagens WhatsApp */}
        {isWhatsAppLead && (
          <TriagemWhatsAppPreview 
            clienteId={lead.id} 
            whatsappNumber={lead.whatsapp_number || undefined} 
          />
        )}

        {/* Ações */}
        <div className="flex flex-col gap-2 pt-2 border-t">
          <Button
            className="w-full justify-start"
            variant="default"
            size="sm"
            onClick={() => onEncaminharComercial(lead.id)}
            disabled={isEncaminhando}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Enviar para Comercial
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            size="sm"
            onClick={() => onCriarTicket(lead)}
          >
            <Ticket className="w-4 h-4 mr-2" />
            Criar Ticket (Suporte)
          </Button>
          <Button
            className="w-full justify-start"
            variant="ghost"
            size="sm"
            onClick={() => onDescartar(lead.id)}
            disabled={isDescartando}
          >
            <X className="w-4 h-4 mr-2" />
            Descartar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
