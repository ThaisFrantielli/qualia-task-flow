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
import { useTicketMotivos, useTicketDepartamentos, useTicketCustomFields } from '@/hooks/useTicketOptions';
import { useFunis } from '@/hooks/useFunis';

export interface WhatsAppConversation {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  unread_count: number | null;
  status: string | null;
  cliente_id: string | null;
  assigned_agent_id: string | null;
  assigned_at: string | null;
  assigned_agent_name?: string | null;
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
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [ticketForm, setTicketForm] = useState({
    titulo: '',
    sintese: '',
    prioridade: 'media',
    origem: 'Whatsapp',
    motivo: '',
    departamento: '',
    placa: ''
  });
  const { data: ticketMotivos } = useTicketMotivos();
  const { data: ticketDepartamentos } = useTicketDepartamentos();
  const { data: ticketCustomFields } = useTicketCustomFields();
  const { data: funis } = useFunis();

  const motivoOptions = (ticketMotivos && ticketMotivos.length > 0)
    ? ticketMotivos.filter((m) => m.is_active).map((m) => ({ value: m.id, label: m.label }))
    : TICKET_MOTIVO_OPTIONS;

  const departamentoOptions = (ticketDepartamentos && ticketDepartamentos.length > 0)
    ? ticketDepartamentos.filter((d) => d.is_active).map((d) => ({ value: d.label, label: d.label }))
    : TICKET_DEPARTAMENTO_OPTIONS;

  const activeCustomFields = (ticketCustomFields || []).filter((field) => field.is_active);

  const normalizeOptions = (options: any): Array<{ value: string; label: string }> => {
    if (!Array.isArray(options)) return [];
    return options
      .map((option) => {
        if (typeof option === 'string') return { value: option, label: option };
        if (option && typeof option === 'object') {
          return {
            value: String(option.value ?? option.label ?? ''),
            label: String(option.label ?? option.value ?? ''),
          };
        }
        return null;
      })
      .filter((option): option is { value: string; label: string } => !!option && !!option.value);
  };

  const isUuid = (value: string | null | undefined) =>
    Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value));

  const handleCreateTicket = async () => {
    if (!conversation) return;

    const missingCustomRequired = activeCustomFields
      .filter((field) => field.is_required)
      .some((field) => {
        const value = customFieldValues[field.field_key];
        if (Array.isArray(value)) return value.length === 0;
        return value === undefined || value === null || value === '';
      });

    if (missingCustomRequired) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha os campos customizados obrigatórios antes de criar o ticket.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const selectedMotivo = motivoOptions.find((option) => option.value === ticketForm.motivo);
      const motivoId = isUuid(ticketForm.motivo) ? ticketForm.motivo : null;
      const motivoEnum = !motivoId ? (selectedMotivo?.label || ticketForm.motivo || null) : null;

      const { data: insertedTicket, error } = await supabase
        .from('tickets')
        .insert({
          // Do not send a formatted string for `numero_ticket` (DB expects numeric or is auto-generated).
          titulo: ticketForm.titulo || `Atendimento - ${conversation.customer_name || conversation.customer_phone}`,
          sintese: ticketForm.sintese,
          prioridade: ticketForm.prioridade,
          origem: ticketForm.origem,
          motivo: motivoEnum as any,
          motivo_id: motivoId,
          departamento: ticketForm.departamento as any,
          placa: ticketForm.placa,
          custom_fields: customFieldValues,
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
      setCustomFieldValues({});
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
      const funilVendas = funis?.find((funil) => funil.tipo === 'vendas');

      if (!funilVendas) {
        throw new Error('Nenhum funil de vendas ativo encontrado para criar a oportunidade.');
      }

      const { data: estagios, error: estagioError } = await supabase
        .from('funil_estagios')
        .select('id')
        .eq('funil_id', funilVendas.id)
        .order('ordem', { ascending: true })
        .limit(1);

      if (estagioError) throw estagioError;

      const primeiroEstagioId = estagios?.[0]?.id;
      if (!primeiroEstagioId) {
        throw new Error('O funil de vendas não possui estágios configurados.');
      }

      const { error } = await supabase.from('oportunidades').insert({
        titulo: `Oportunidade - ${conversation.customer_name || conversation.customer_phone}`,
        cliente_id: conversation.cliente_id,
        funil_id: funilVendas.id,
        estagio_id: primeiroEstagioId,
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

  const handleAssumeToMe = async () => {
    if (!conversation || !user?.id) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({
          status: 'active',
          assigned_agent_id: user.id,
          assigned_at: new Date().toISOString()
        })
        .eq('id', conversation.id);

      if (error) throw error;

      toast({
        title: 'Conversa atribuída',
        description: 'Agora esta conversa está atribuída para você.'
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
            {conversation.assigned_agent_id && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserCheck className="h-3 w-3" />
                <span>
                  Responsável: {conversation.assigned_agent_name || (isAssignedToMe ? 'Você' : 'Outro colaborador')}
                </span>
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

          {!isAssignedToMe && (
            <Button
              className="w-full justify-start h-9"
              variant="outline"
              onClick={handleAssumeToMe}
              disabled={isLoading}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Assumir para mim
            </Button>
          )}

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
                    {departamentoOptions.map(opt => (
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
                    {motivoOptions.map(opt => (
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

            {activeCustomFields.length > 0 && (
              <div className="space-y-3 rounded-md border border-dashed p-3">
                <div>
                  <p className="text-sm font-medium">Campos Customizados</p>
                  <p className="text-xs text-muted-foreground">Campos configurados no painel de tickets.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeCustomFields.map((field) => {
                    const value = customFieldValues[field.field_key];
                    const fieldOptions = normalizeOptions(field.options as any);

                    if (field.field_type === 'textarea') {
                      return (
                        <div key={field.id} className="space-y-2 md:col-span-2">
                          <Label>{field.label}{field.is_required ? ' *' : ''}</Label>
                          <Textarea
                            value={value || ''}
                            onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))}
                            placeholder={field.placeholder || ''}
                            className="resize-none"
                          />
                        </div>
                      );
                    }

                    if (field.field_type === 'select') {
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label>{field.label}{field.is_required ? ' *' : ''}</Label>
                          <Select
                            value={value || ''}
                            onValueChange={(selected) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: selected }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={field.placeholder || 'Selecione...'} />
                            </SelectTrigger>
                            <SelectContent>
                              {fieldOptions.map((option) => (
                                <SelectItem key={`${field.field_key}-${option.value}`} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }

                    if (field.field_type === 'multiselect') {
                      const selectedValues = Array.isArray(value)
                        ? value
                        : (typeof value === 'string' && value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []);

                      return (
                        <div key={field.id} className="space-y-2">
                          <Label>{field.label}{field.is_required ? ' *' : ''}</Label>
                          {fieldOptions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {fieldOptions.map((option) => {
                                const isSelected = selectedValues.includes(option.value);
                                return (
                                  <button
                                    key={`${field.field_key}-${option.value}`}
                                    type="button"
                                    className={`px-2 py-1 text-xs rounded border transition-colors ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                                    onClick={() => {
                                      const nextValues = isSelected
                                        ? selectedValues.filter((item) => item !== option.value)
                                        : [...selectedValues, option.value];
                                      setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: nextValues }));
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <Input
                              value={selectedValues.join(', ')}
                              onChange={(e) => {
                                const list = e.target.value
                                  .split(',')
                                  .map((item) => item.trim())
                                  .filter(Boolean);
                                setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: list }));
                              }}
                              placeholder={field.placeholder || 'Informe valores separados por vírgula'}
                            />
                          )}
                        </div>
                      );
                    }

                    if (field.field_type === 'checkbox') {
                      return (
                        <div key={field.id} className="space-y-2">
                          <Label>{field.label}{field.is_required ? ' *' : ''}</Label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(value)}
                              onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.checked }))}
                            />
                            Ativar
                          </label>
                        </div>
                      );
                    }

                    const inputType = field.field_type === 'number'
                      ? 'number'
                      : field.field_type === 'date'
                        ? 'date'
                        : field.field_type === 'datetime'
                          ? 'datetime-local'
                          : 'text';

                    return (
                      <div key={field.id} className="space-y-2">
                        <Label>{field.label}{field.is_required ? ' *' : ''}</Label>
                        <Input
                          type={inputType}
                          value={value || ''}
                          onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))}
                          placeholder={field.placeholder || ''}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
