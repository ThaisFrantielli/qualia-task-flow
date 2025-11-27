import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { dateToLocalISO } from '@/lib/dateUtils';
import { Database } from '@/types/supabase';

interface CustomerEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: number;
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    status: Database["public"]["Enums"]["tipo_status_atendimento"] | null;
    department: Database["public"]["Enums"]["tipo_departamento"] | null;
    reason: Database["public"]["Enums"]["tipo_motivo_reclamacao"] | null;
    lead_source: Database["public"]["Enums"]["tipo_origem_lead"] | null;
    summary: string | null;
    resolution_details: string | null;
    assignee_id: string | null;
  };
  onSave: () => void;
}

const CustomerEditForm: React.FC<CustomerEditFormProps> = ({
  isOpen,
  onClose,
  customer,
  onSave
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_name: customer.client_name || '',
    client_email: customer.client_email || '',
    client_phone: customer.client_phone || '',
    status: customer.status || 'Solicitação' as Database["public"]["Enums"]["tipo_status_atendimento"],
    department: customer.department || 'Central de Atendimento' as Database["public"]["Enums"]["tipo_departamento"],
    reason: customer.reason || 'Dúvida' as Database["public"]["Enums"]["tipo_motivo_reclamacao"],
    lead_source: customer.lead_source || 'Site' as Database["public"]["Enums"]["tipo_origem_lead"],
    summary: customer.summary || '',
    resolution_details: customer.resolution_details || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('atendimentos')
        .update({
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
          status: formData.status,
          department: formData.department,
          reason: formData.reason,
          lead_source: formData.lead_source,
          summary: formData.summary,
          resolution_details: formData.resolution_details,
          updated_at: dateToLocalISO(new Date()),
        })
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: "Cliente atualizado",
        description: "Os dados do cliente foram atualizados com sucesso.",
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar os dados do cliente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Nome do Cliente</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => handleChange('client_name', e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="client_email">Email</Label>
              <Input
                id="client_email"
                type="email"
                value={formData.client_email}
                onChange={(e) => handleChange('client_email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_phone">Telefone</Label>
              <Input
                id="client_phone"
                value={formData.client_phone}
                onChange={(e) => handleChange('client_phone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: Database["public"]["Enums"]["tipo_status_atendimento"]) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solicitação">Solicitação</SelectItem>
                  <SelectItem value="Em Análise">Em Análise</SelectItem>
                  <SelectItem value="Resolvido">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Select value={formData.department} onValueChange={(value: Database["public"]["Enums"]["tipo_departamento"]) => handleChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manutenção">Manutenção</SelectItem>
                  <SelectItem value="Central de Atendimento">Central de Atendimento</SelectItem>
                  <SelectItem value="Documentação">Documentação</SelectItem>
                  <SelectItem value="Operação">Operação</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                  <SelectItem value="Departamento Pessoal">Departamento Pessoal</SelectItem>
                  <SelectItem value="Aberto Erroneamente">Aberto Erroneamente</SelectItem>
                  <SelectItem value="Dúvida">Dúvida</SelectItem>
                  <SelectItem value="Operação - Filial SP">Operação - Filial SP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead_source">Origem do Lead</Label>
              <Select value={formData.lead_source} onValueChange={(value: Database["public"]["Enums"]["tipo_origem_lead"]) => handleChange('lead_source', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cliente (Base)">Cliente (Base)</SelectItem>
                  <SelectItem value="Tráfego Pago">Tráfego Pago</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Site">Site</SelectItem>
                  <SelectItem value="Ligação">Ligação</SelectItem>
                  <SelectItem value="Redes Sociais">Redes Sociais</SelectItem>
                  <SelectItem value="Blip ChatBot">Blip ChatBot</SelectItem>
                  <SelectItem value="E-mail">E-mail</SelectItem>
                  <SelectItem value="Encerrado - Manutenção">Encerrado - Manutenção</SelectItem>
                  <SelectItem value="Fechada">Fechada</SelectItem>
                  <SelectItem value="Perdida">Perdida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Select value={formData.reason} onValueChange={(value: Database["public"]["Enums"]["tipo_motivo_reclamacao"]) => handleChange('reason', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Contestação de Cobrança">Contestação de Cobrança</SelectItem>
                <SelectItem value="Demora na Aprovação do Orçamento">Demora na Aprovação do Orçamento</SelectItem>
                <SelectItem value="Agendamento Errôneo">Agendamento Errôneo</SelectItem>
                <SelectItem value="Má Qualidade de Serviço">Má Qualidade de Serviço</SelectItem>
                <SelectItem value="Problemas Com Fornecedor">Problemas Com Fornecedor</SelectItem>
                <SelectItem value="Demora em atendimento">Demora em atendimento</SelectItem>
                <SelectItem value="Atendimento Ineficaz">Atendimento Ineficaz</SelectItem>
                <SelectItem value="Multas e Notificações">Multas e Notificações</SelectItem>
                <SelectItem value="Problemas na Entrega">Problemas na Entrega</SelectItem>
                <SelectItem value="Problemas Com Veículo Reserva">Problemas Com Veículo Reserva</SelectItem>
                <SelectItem value="Atendimento Comercial">Atendimento Comercial</SelectItem>
                <SelectItem value="Oportunidade Aberta Erroneamente">Oportunidade Aberta Erroneamente</SelectItem>
                <SelectItem value="Cobrança Indevida">Cobrança Indevida</SelectItem>
                <SelectItem value="Dúvida">Dúvida</SelectItem>
                <SelectItem value="Erro de processo interno">Erro de processo interno</SelectItem>
                <SelectItem value="Troca definitiva de veículo">Troca definitiva de veículo</SelectItem>
                <SelectItem value="Problema recorrente">Problema recorrente</SelectItem>
                <SelectItem value="Solicitação de Reembolso">Solicitação de Reembolso</SelectItem>
                <SelectItem value="Problemas com Terceiro">Problemas com Terceiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Resumo</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => handleChange('summary', e.target.value)}
              placeholder="Descrição do atendimento..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resolution_details">Detalhes da Resolução</Label>
            <Textarea
              id="resolution_details"
              value={formData.resolution_details}
              onChange={(e) => handleChange('resolution_details', e.target.value)}
              placeholder="Como foi resolvido o atendimento..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerEditForm;