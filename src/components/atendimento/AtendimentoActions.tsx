import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Ticket,
  TrendingUp,
  Users,
  Trash2,
  Phone,
  MessageSquare
} from 'lucide-react';
import {
  TICKET_ORIGEM_OPTIONS,
  TICKET_MOTIVO_OPTIONS,
  TICKET_DEPARTAMENTO_OPTIONS
} from '@/constants/ticketOptions';
interface WhatsAppConversation {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  unread_count: number | null;
  status: string | null;
  cliente_id: string | null;
}

interface AtendimentoActionsProps {
  conversation: WhatsAppConversation | null;
  onActionComplete: () => void;
}

export const AtendimentoActions: React.FC<AtendimentoActionsProps> = ({
  conversation,
  onActionComplete
}) => {
  const { toast } = useToast();
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    titulo: '',
    sintese: '',
    prioridade: 'media',
    origem: 'Whatsapp',
    motivo: '',
    departamento: '',
    placa: ''
  });

  const handleCreateTicket = async () => {
    if (!conversation) return;
    
    setIsLoading(true);
    try {
      // Generate ticket number
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .like('numero_ticket', `TKT-${year}-%`);
      
      const nextNum = (count || 0) + 1;
      const numeroTicket = `TKT-${year}-${String(nextNum).padStart(4, '0')}`;

      const { error } = await supabase.from('tickets').insert({
        numero_ticket: numeroTicket,
        titulo: ticketForm.titulo || `Atendimento - ${conversation.customer_name || conversation.customer_phone}`,
        sintese: ticketForm.sintese,
        prioridade: ticketForm.prioridade,
        origem: ticketForm.origem,
        motivo: ticketForm.motivo as any,
        departamento: ticketForm.departamento as any,
        placa: ticketForm.placa,
        fase: 'Análise do caso',
        status: 'aguardando_triagem',
        cliente_id: conversation.cliente_id
      });

      if (error) throw error;

      // Update conversation status
      await supabase
        .from('whatsapp_conversations')
        .update({ status: 'closed' })
        .eq('id', conversation.id);

      toast({
        title: 'Ticket criado',
        description: `Ticket ${numeroTicket} criado com sucesso`
      });

      setTicketDialogOpen(false);
      setTicketForm({
        titulo: '',
        sintese: '',
        prioridade: 'media',
        origem: 'Whatsapp',
        motivo: '',
        departamento: '',
        placa: ''
      });
      onActionComplete();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOpportunity = async () => {
    if (!conversation) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('oportunidades').insert({
        titulo: `Oportunidade - ${conversation.customer_name || conversation.customer_phone}`,
        cliente_id: conversation.cliente_id,
        status: 'aberta'
      });

      if (error) throw error;

      await supabase
        .from('whatsapp_conversations')
        .update({ status: 'closed' })
        .eq('id', conversation.id);

      toast({
        title: 'Oportunidade criada',
        description: 'Lead encaminhado para comercial'
      });

      onActionComplete();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!conversation) return;

    setIsLoading(true);
    try {
      await supabase
        .from('whatsapp_conversations')
        .update({ status: 'closed' })
        .eq('id', conversation.id);

      if (conversation.cliente_id) {
        await supabase
          .from('clientes')
          .update({
            status_triagem: 'descartado',
            descartado_motivo: discardReason,
            descartado_em: new Date().toISOString()
          })
          .eq('id', conversation.cliente_id);
      }

      toast({
        title: 'Conversa descartada',
        description: 'Lead marcado como descartado'
      });

      setDiscardDialogOpen(false);
      setDiscardReason('');
      onActionComplete();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!conversation) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">
            Selecione uma conversa para ver as ações disponíveis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {conversation.customer_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {conversation.customer_name || 'Cliente'}
              </p>
              <Badge variant="outline" className="text-[10px] mt-0.5">
                {conversation.status === 'active' ? 'Em atendimento' : 
                 conversation.status === 'waiting' ? 'Aguardando' : conversation.status}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            {conversation.customer_phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>+{conversation.customer_phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{conversation.unread_count || 0} não lidas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Ações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            className="w-full justify-start h-9" 
            variant="outline"
            onClick={() => {
              setTicketForm({
                ...ticketForm,
                titulo: `Atendimento - ${conversation.customer_name || conversation.customer_phone || 'Cliente'}`
              });
              setTicketDialogOpen(true);
            }}
          >
            <Ticket className="h-4 w-4 mr-2" />
            Criar Ticket
          </Button>

          <Button 
            className="w-full justify-start h-9" 
            variant="outline"
            onClick={handleCreateOpportunity}
            disabled={isLoading}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Enviar p/ Comercial
          </Button>

          <Button 
            className="w-full justify-start h-9" 
            variant="outline"
            disabled
          >
            <Users className="h-4 w-4 mr-2" />
            Transferir
          </Button>

          <Button 
            className="w-full justify-start h-9 text-destructive hover:text-destructive" 
            variant="outline"
            onClick={() => setDiscardDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Descartar
          </Button>
        </CardContent>
      </Card>

      {/* Ticket Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={ticketForm.titulo}
                onChange={(e) => setTicketForm({ ...ticketForm, titulo: e.target.value })}
                placeholder="Assunto do ticket"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origem *</Label>
                <Select
                  value={ticketForm.origem}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, origem: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TICKET_ORIGEM_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departamento *</Label>
                <Select
                  value={ticketForm.departamento}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, departamento: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TICKET_DEPARTAMENTO_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Motivo *</Label>
                <Select
                  value={ticketForm.motivo}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, motivo: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {TICKET_MOTIVO_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={ticketForm.prioridade}
                  onValueChange={(value) => setTicketForm({ ...ticketForm, prioridade: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Placa do Veículo</Label>
              <Input
                value={ticketForm.placa}
                onChange={(e) => setTicketForm({ ...ticketForm, placa: e.target.value })}
                placeholder="ABC-1234"
              />
            </div>

            <div>
              <Label>Síntese *</Label>
              <Textarea
                value={ticketForm.sintese}
                onChange={(e) => setTicketForm({ ...ticketForm, sintese: e.target.value })}
                placeholder="Descreva o problema..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTicketDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTicket} disabled={isLoading}>
                Criar Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard Dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar Conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo do descarte</Label>
              <Textarea
                value={discardReason}
                onChange={(e) => setDiscardReason(e.target.value)}
                placeholder="Informe o motivo..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDiscardDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDiscard} disabled={isLoading}>
                Confirmar Descarte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
