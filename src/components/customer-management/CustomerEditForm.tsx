import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomerEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: number;
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    status: string | null;
    department: string | null;
    reason: string | null;
    lead_source: string | null;
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
    status: customer.status || 'Solicitação',
    department: customer.department || '',
    reason: customer.reason || '',
    lead_source: customer.lead_source || '',
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
          updated_at: new Date().toISOString(),
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
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solicitação">Solicitação</SelectItem>
                  <SelectItem value="Em Análise">Em Análise</SelectItem>
                  <SelectItem value="Resolvido">Resolvido</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Select value={formData.department} onValueChange={(value) => handleChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vendas">Vendas</SelectItem>
                  <SelectItem value="Suporte">Suporte</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                  <SelectItem value="Técnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lead_source">Origem do Lead</Label>
              <Select value={formData.lead_source} onValueChange={(value) => handleChange('lead_source', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Website">Website</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Indicação">Indicação</SelectItem>
                  <SelectItem value="Redes Sociais">Redes Sociais</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo</Label>
            <Select value={formData.reason} onValueChange={(value) => handleChange('reason', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Reclamação">Reclamação</SelectItem>
                <SelectItem value="Sugestão">Sugestão</SelectItem>
                <SelectItem value="Dúvida">Dúvida</SelectItem>
                <SelectItem value="Solicitação">Solicitação</SelectItem>
                <SelectItem value="Elogio">Elogio</SelectItem>
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