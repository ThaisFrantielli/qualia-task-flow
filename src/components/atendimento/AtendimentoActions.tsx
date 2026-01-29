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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TransferDialog } from './TransferDialog';
import {
  Ticket,
  TrendingUp,
  Users,
  Trash2,
  Phone,
  MessageSquare,
  UserCheck
} from 'lucide-react';
import {
  TICKET_ORIGEM_OPTIONS,
  TICKET_MOTIVO_OPTIONS,
  TICKET_DEPARTAMENTO_OPTIONS
} from '@/constants/ticketOptions';

export interface WhatsAppConversation {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  unread_count: number | null;
  status: string | null;
  cliente_id: string | null;
  assigned_agent_id: string | null;
  assigned_at: string | null;
}

interface AtendimentoActionsProps {
  conversation: WhatsAppConversation | null;
  onActionComplete: () => void;
}

const DISCARD_REASONS = [
  'Spam / Propaganda',
  'Número errado',
  'Cliente não responde',
  'Duplicado',
  'Teste',
  'Outro'
];

export const AtendimentoActions: React.FC<AtendimentoActionsProps> = ({
  conversation,
  onActionComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState('');
  const [discardReasonType, setDiscardReasonType] = useState('');
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
      const { data: insertedTicket, error } = await supabase
        .from('tickets')
        .insert({
          // Do not send a formatted string for `numero_ticket` (DB expects numeric or is auto-generated).
          titulo: ticketForm.titulo || `Atendimento - ${conversation.customer_name || conversation.customer_phone}`,
          sintese: ticketForm.sintese,
          prioridade: ticketForm.prioridade,
          origem: ticketForm.origem,
          motivo_id: ticketForm.motivo || null,
          departamento: ticketForm.departamento as any,
          placa: ticketForm.placa,
          fase: 'Análise do caso',
          status: 'aguardando_triagem',
          cliente_id: conversation.cliente_id,
          atendente_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation status
      await supabase
        .from('whatsapp_conversations')
        .update({ status: 'closed' })
        .eq('id', conversation.id);

      toast({
        title: 'Ticket criado',
        description: insertedTicket?.numero_ticket ? `Ticket ${insertedTicket.numero_ticket} criado com sucesso` : `Ticket criado com sucesso`
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
        status: 'aberta',
        user_id: user?.id
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
      // Save to triagem_descartes for audit
      const { error: auditError } = await supabase
        .from('triagem_descartes')
        .insert({
          cliente_id: conversation.cliente_id,
          conversation_id: conversation.id,
          atendente_id: user?.id,
          motivo: discardReasonType === 'Outro' ? discardReason : discardReasonType,
          origem: 'central_atendimento'
        });

      if (auditError) {
        console.error('Audit error:', auditError);
        // Continue even if audit fails
      }

      // Update conversation status
      await supabase
        .from('whatsapp_conversations')
        .update({ status: 'closed' })
        .eq('id', conversation.id);

      // Update client status if linked
      if (conversation.cliente_id) {
        await supabase
          .from('clientes')
          .update({
            status_triagem: 'descartado',
            descartado_motivo: discardReasonType === 'Outro' ? discardReason : discardReasonType,
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
      setDiscardReasonType('');
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

  const isAssignedToMe = conversation?.assigned_agent_id === user?.id;

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
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[10px]">
                  {conversation.status === 'active' ? 'Em atendimento' : 
                   conversation.status === 'waiting' ? 'Aguardando' : 
                   conversation.status === 'open' ? 'Aberto' : conversation.status}
                </Badge>
                {isAssignedToMe && (
                  <Badge className="text-[10px] bg-green-500">
                    <UserCheck className="h-2.5 w-2.5 mr-0.5" />
                    Meu
                  </Badge>
                )}
              </div>
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
            onClick={() => setTransferDialogOpen(true)}
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
        <DialogContent className="w-[90vw] md:w-[50vw] max-w-[900px] max-h-[90vh] overflow-y-auto">
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
              <Label>Tipo de descarte</Label>
              <Select
                value={discardReasonType}
                onValueChange={setDiscardReasonType}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {DISCARD_REASONS.map(reason => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {discardReasonType === 'Outro' && (
              <div>
                <Label>Descreva o motivo</Label>
                <Textarea
                  value={discardReason}
                  onChange={(e) => setDiscardReason(e.target.value)}
                  placeholder="Informe o motivo..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDiscardDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDiscard} 
                disabled={isLoading || !discardReasonType}
              >
                Confirmar Descarte
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        conversationId={conversation.id}
        customerName={conversation.customer_name}
        currentAgentId={conversation.assigned_agent_id}
        onTransferComplete={onActionComplete}
      />
    </>
  );
};
