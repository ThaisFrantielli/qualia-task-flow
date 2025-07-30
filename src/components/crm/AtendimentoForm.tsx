// src/components/crm/AtendimentoForm.tsx

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface AtendimentoFormProps {
  setOpen: (open: boolean) => void;
  onSuccess: () => void;
}

const AtendimentoForm: React.FC<AtendimentoFormProps> = ({ setOpen, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  // Formulário simplificado para o registro inicial
  const [formData, setFormData] = useState({
    client_name: '',      // Nome da Empresa
    contact_person: '',   // Nome da Pessoa
    client_phone: '',     // WhatsApp
    summary: '',          // Resumo inicial
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name.trim() || !formData.contact_person.trim()) {
      toast.error('O nome da empresa e da pessoa de contato são obrigatórios.');
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.from('atendimentos').insert({
        ...formData,
        assignee_id: user?.id, // Atribui o ticket a quem o criou
        status: 'Solicitação', // Status inicial fixo
      });

      if (error) throw error;

      toast.success('Novo atendimento registrado com sucesso!');
      onSuccess();
      setOpen(false);
    } catch (error: any) {
      toast.error('Erro ao registrar atendimento', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="client_name" className="text-right">Cliente (Empresa)</Label>
          <Input id="client_name" value={formData.client_name} onChange={handleChange} className="col-span-3" placeholder="Nome da empresa cliente" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="contact_person" className="text-right">Contato (Pessoa)</Label>
          <Input id="contact_person" value={formData.contact_person} onChange={handleChange} className="col-span-3" placeholder="Nome de quem fez a solicitação" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="client_phone" className="text-right">WhatsApp</Label>
          <Input id="client_phone" value={formData.client_phone} onChange={handleChange} className="col-span-3" placeholder="(XX) XXXXX-XXXX" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="summary" className="text-right">Resumo Inicial</Label>
          <Textarea id="summary" value={formData.summary} onChange={handleChange} className="col-span-3" placeholder="Descreva a solicitação inicial do cliente..." />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Registrar Atendimento'}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default AtendimentoForm;