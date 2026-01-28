import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, ExternalLink, Clock, User, Building } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const priorityColors: Record<string, string> = {
  baixa: "bg-green-500",
  media: "bg-blue-500",
  alta: "bg-orange-500",
  urgente: "bg-red-500",
};

const statusColors: Record<string, string> = {
  aguardando_triagem: "bg-yellow-500",
  em_atendimento: "bg-blue-500",
  aguardando_setor: "bg-purple-500",
  resolvido: "bg-green-500",
  fechado: "bg-gray-500",
  aberto: "bg-blue-400",
};

interface TicketItemProps {
  ticket: any;
  onClick: () => void;
}

const TicketItem: React.FC<TicketItemProps> = ({ ticket, onClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg hover:bg-muted/30 transition-colors">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                  }}
                >
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {ticket.numero_ticket}
                    </span>
                    <span className="font-medium text-sm truncate">
                      {ticket.titulo}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`${priorityColors[ticket.prioridade || "media"]} text-white text-[10px]`}>
                  {ticket.prioridade}
                </Badge>
                <Badge variant="outline" className={`${statusColors[ticket.status || "aguardando_triagem"]} text-white border-none text-[10px]`}>
                  {ticket.fase || ticket.status?.replace("_", " ")}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t mt-1 ml-9">
            <div className="grid grid-cols-2 gap-3 text-sm pt-3">
              {ticket.departamento && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  <span>{ticket.departamento}</span>
                </div>
              )}
              {ticket.profiles?.full_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span>{ticket.profiles.full_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{format(new Date(ticket.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
              {ticket.sintese && (
                <div className="col-span-2 text-muted-foreground pt-1">
                  <span className="text-xs">{ticket.sintese}</span>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface OportunidadeItemProps {
  oportunidade: any;
  onClick: () => void;
}

const OportunidadeItem: React.FC<OportunidadeItemProps> = ({ oportunidade, onClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg hover:bg-muted/30 transition-colors">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                  }}
                >
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {oportunidade.titulo}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(Number(oportunidade.valor_total) || 0)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={oportunidade.status === 'aberta' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {oportunidade.status}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t mt-1 ml-9">
            <div className="grid grid-cols-2 gap-3 text-sm pt-3">
              {oportunidade.created_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Criada em {format(new Date(oportunidade.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              )}
              {oportunidade.descricao && (
                <div className="col-span-2 text-muted-foreground pt-1">
                  <span className="text-xs">{oportunidade.descricao}</span>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface CustomerNegociosCollapsibleProps {
  tickets: any[];
  oportunidades: any[];
  ticketsLoading: boolean;
  oportunidadesLoading: boolean;
}

export const CustomerNegociosCollapsible: React.FC<CustomerNegociosCollapsibleProps> = ({
  tickets,
  oportunidades,
  ticketsLoading,
  oportunidadesLoading,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      {/* Opportunities */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Oportunidades</CardTitle>
            {oportunidades.length > 0 && (
              <Badge variant="secondary">{oportunidades.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {oportunidadesLoading ? (
            <div className="flex justify-center p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : oportunidades.length > 0 ? (
            <div className="space-y-2">
              {oportunidades.map((opp: any) => (
                <OportunidadeItem
                  key={opp.id}
                  oportunidade={opp}
                  onClick={() => navigate(`/oportunidades?id=${opp.id}`)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma oportunidade.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tickets */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Tickets</CardTitle>
            {tickets && tickets.length > 0 && (
              <Badge variant="secondary">{tickets.length}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {ticketsLoading ? (
            <div className="flex justify-center p-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : tickets && tickets.length > 0 ? (
            <div className="space-y-2">
              {tickets.map((ticket: any) => (
                <TicketItem
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum ticket.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
