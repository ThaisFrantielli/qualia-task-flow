import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Ticket, 
  TrendingUp, 
  ArrowRightLeft, 
  Ban, 
  User,
  Phone,
  FileText
} from 'lucide-react';
import type { Database } from '@/types';

type WhatsAppConversation = Database['public']['Tables']['whatsapp_conversations']['Row'];

interface WhatsAppQuickActionsProps {
  conversation: WhatsAppConversation | null;
  onActionComplete: () => void;
}

export const WhatsAppQuickActions: React.FC<WhatsAppQuickActionsProps> = ({
  conversation,
  onActionComplete
}) => {
  const { toast } = useToast();
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [showOportunidadeDialog, setShowOportunidadeDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Ticket form state
  const [ticketForm, setTicketForm] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'media',
    departamento: 'suporte'
  });

  // Oportunidade form state
  const [oportunidadeForm, setOportunidadeForm] = useState({
    titulo: '',
    descricao: '',
    valor: ''
  });

  const handleCreateTicket = async () => {
    if (!conversation || !ticketForm.titulo) return;
    
    setLoading(true);
    try {
      // Generate ticket number
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .like('numero_ticket', `TKT-${year}-%`);
      
      const nextNum = (count || 0) + 1;
      const numeroTicket = `TKT-${year}-${String(nextNum).padStart(4, '0')}`;

      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          numero_ticket: numeroTicket,
          titulo: ticketForm.titulo,
          descricao: ticketForm.descricao,
          prioridade: ticketForm.prioridade,
          departamento: ticketForm.departamento as any,
          cliente_id: conversation.cliente_id,
          status: 'aberto',
          origem: 'whatsapp'
        })
        .select()
        .single();

      if (error) throw error;

      // Link conversation to ticket
      await supabase
        .from('whatsapp_conversations')
        .update({ 
          ticket_id: ticket.id,
          status: 'active'
        })
        .eq('id', conversation.id);

      toast({
        title: 'Ticket criado',
        description: `Ticket ${numeroTicket} criado com sucesso`
      });

      setShowTicketDialog(false);
      setTicketForm({ titulo: '', descricao: '', prioridade: 'media', departamento: 'suporte' });
      onActionComplete();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar ticket',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOportunidade = async () => {
    if (!conversation || !oportunidadeForm.titulo) return;
    
    setLoading(true);
    try {
      // Get default funil
      const { data: funil } = await supabase
        .from('funis')
        .select('id')
        .eq('tipo', 'vendas')
        .eq('ativo', true)
        .limit(1)
        .single();

      // Get first stage
      const { data: estagio } = await supabase
        .from('funil_estagios')
        .select('id')
        .eq('funil_id', funil?.id)
        .order('ordem', { ascending: true })
        .limit(1)
        .single();

      const { error } = await supabase
        .from('oportunidades')
        .insert({
          titulo: oportunidadeForm.titulo,
          descricao: oportunidadeForm.descricao,
          valor_total: oportunidadeForm.valor ? parseFloat(oportunidadeForm.valor) : 0,
          cliente_id: conversation.cliente_id,
          funil_id: funil?.id,
          estagio_id: estagio?.id,
          status: 'aberta'
        });

      if (error) throw error;

      // Update conversation status
      await supabase
        .from('whatsapp_conversations')
        .update({ status: 'active' })
        .eq('id', conversation.id);

      toast({
        title: 'Oportunidade criada',
        description: 'Oportunidade encaminhada para comercial'
      });

      setShowOportunidadeDialog(false);
      setOportunidadeForm({ titulo: '', descricao: '', valor: '' });
      onActionComplete();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar oportunidade',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!conversation) return;
    
    if (!confirm('Tem certeza que deseja descartar esta conversa como spam?')) return;

    setLoading(true);
    try {
      await supabase
        .from('whatsapp_conversations')
        .update({ status: 'closed' })
        .eq('id', conversation.id);

      toast({
        title: 'Conversa descartada',
        description: 'A conversa foi marcada como spam'
      });

      onActionComplete();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!conversation) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Selecione uma conversa
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Client Info */}
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{conversation.customer_name || 'Não identificado'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>+{conversation.customer_phone || conversation.whatsapp_number}</span>
            </div>
            {(conversation as any).ticket_id && (
              <Badge variant="outline" className="mt-2">
                <Ticket className="h-3 w-3 mr-1" />
                Ticket vinculado
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid gap-2">
            <Button
              variant="default"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setTicketForm(prev => ({
                  ...prev,
                  titulo: `Atendimento WhatsApp - ${conversation.customer_name || conversation.customer_phone}`
                }));
                setShowTicketDialog(true);
              }}
              disabled={loading}
            >
              <Ticket className="h-4 w-4 mr-2" />
              Criar Ticket
            </Button>

            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setOportunidadeForm(prev => ({
                  ...prev,
                  titulo: `Lead WhatsApp - ${conversation.customer_name || conversation.customer_phone}`
                }));
                setShowOportunidadeDialog(true);
              }}
              disabled={loading}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Criar Oportunidade
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => setShowTransferDialog(true)}
              disabled={loading}
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transferir
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDiscard}
              disabled={loading}
            >
              <Ban className="h-4 w-4 mr-2" />
              Descartar (Spam)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Ticket</DialogTitle>
            <DialogDescription>
              Crie um ticket de suporte a partir desta conversa
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={ticketForm.titulo}
                onChange={(e) => setTicketForm(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Título do ticket"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={ticketForm.descricao}
                onChange={(e) => setTicketForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o problema ou solicitação"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={ticketForm.prioridade}
                  onValueChange={(v) => setTicketForm(prev => ({ ...prev, prioridade: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Departamento</Label>
                <Select
                  value={ticketForm.departamento}
                  onValueChange={(v) => setTicketForm(prev => ({ ...prev, departamento: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suporte">Suporte</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="operacional">Operacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTicket} disabled={loading || !ticketForm.titulo}>
              {loading ? 'Criando...' : 'Criar Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Oportunidade Dialog */}
      <Dialog open={showOportunidadeDialog} onOpenChange={setShowOportunidadeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Oportunidade</DialogTitle>
            <DialogDescription>
              Crie uma oportunidade comercial a partir desta conversa
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={oportunidadeForm.titulo}
                onChange={(e) => setOportunidadeForm(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Título da oportunidade"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={oportunidadeForm.descricao}
                onChange={(e) => setOportunidadeForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Detalhes da oportunidade"
                rows={3}
              />
            </div>

            <div>
              <Label>Valor Estimado (R$)</Label>
              <Input
                type="number"
                value={oportunidadeForm.valor}
                onChange={(e) => setOportunidadeForm(prev => ({ ...prev, valor: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOportunidadeDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOportunidade} disabled={loading || !oportunidadeForm.titulo}>
              {loading ? 'Criando...' : 'Criar Oportunidade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferir Conversa</DialogTitle>
            <DialogDescription>
              Selecione um atendente para transferir esta conversa
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 text-center text-muted-foreground">
            Funcionalidade em desenvolvimento
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsAppQuickActions;
