// src/components/surveys/SurveyGeneratorForm.tsx

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Survey } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Copy, Check, Send } from 'lucide-react';

interface PrefillData {
  clienteId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

interface SurveyGeneratorFormProps {
  onSuccess: () => void;
  prefillData?: PrefillData;
}

const SurveyGeneratorForm: React.FC<SurveyGeneratorFormProps> = ({ onSuccess, prefillData }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    type: '' as Survey['type'],
    client_name: prefillData?.clientName || '',
    driver_name: '',
    license_plate: '',
    client_email: prefillData?.clientEmail || '',
    client_phone: prefillData?.clientPhone || '',
    cliente_id: prefillData?.clienteId || '',
  });

  const handleChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // --- FUNÇÕES ATUALIZADAS ---
  const handleCopyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setIsCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar:", err);
      toast.error("Não foi possível copiar o link.", {
        description: "Seu navegador pode estar bloqueando esta ação. Por favor, copie manualmente.",
      });
    }
  };

  const handleSendWhatsApp = () => {
    if (!generatedLink || !formData.client_phone) {
      toast.error("Preencha o número de WhatsApp para enviar.");
      return;
    }
    const message = `Olá, ${formData.client_name}! Agradecemos por ter escolhido a Quality Frotas. Gostaríamos de ouvir sua opinião sobre sua experiência. Por favor, acesse o link: ${generatedLink}`;
    // Remove caracteres não numéricos do telefone
    const phone = formData.client_phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };
  // --- FIM DAS ATUALIZAÇÕES ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type || !formData.client_name) {
      toast.error("Tipo da pesquisa e Titular do Contrato são obrigatórios.");
      return;
    }
    setLoading(true);
    setGeneratedLink(null);

    try {
      const { data, error } = await supabase.from('surveys').insert({
        type: formData.type as 'comercial' | 'entrega' | 'manutencao' | 'devolucao',
        client_name: formData.client_name.trim(),
        driver_name: formData.driver_name.trim() || null,
        license_plate: formData.license_plate.trim() || null,
        client_email: formData.client_email.trim() || null,
        client_phone: formData.client_phone.trim() || null,
        cliente_id: formData.cliente_id || null,
        created_by_id: user?.id,
      }).select().single();

      if (error) throw error;

      const link = `${window.location.origin}/pesquisa/${data.id}`;
      setGeneratedLink(link);
      toast.success("Link gerado com sucesso!");
      onSuccess();
    } catch (err: any) {
      toast.error("Erro ao gerar link", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border border-gray-200">
      <h2 className="text-2xl font-semibold mb-6">Gerador de Links de Pesquisa</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Pesquisa *</Label>
            <Select onValueChange={(value: string) => handleChange('type', value)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comercial">Pós-Contrato (Avaliação Comercial)</SelectItem>
                <SelectItem value="entrega">Entrega de Veículo</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="devolucao">Devolução</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_name">Titular do Contrato *</Label>
            <Input id="client_name" value={formData.client_name} onChange={(e) => handleChange('client_name', e.target.value)} placeholder="Nome completo do titular" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver_name">Condutor do Veículo</Label>
            <Input id="driver_name" value={formData.driver_name} onChange={(e) => handleChange('driver_name', e.target.value)} placeholder="Nome do condutor (se diferente)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="license_plate">Placa do Veículo</Label>
            <Input id="license_plate" value={formData.license_plate} onChange={(e) => handleChange('license_plate', e.target.value)} placeholder="ABC-1234" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_email">Email do Cliente</Label>
            <Input id="client_email" type="email" value={formData.client_email} onChange={(e) => handleChange('client_email', e.target.value)} placeholder="cliente@email.com" />
          </div>
          <div className="space-y-2 col-span-full">
            <Label htmlFor="client_phone">WhatsApp do Cliente</Label>
            <Input id="client_phone" value={formData.client_phone} onChange={(e) => handleChange('client_phone', e.target.value)} placeholder="(11) 99999-9999" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-4">
          <Button type="submit" size="lg" disabled={loading} className="bg-[#37255d] hover:bg-[#2a1d4a]">
            {loading ? 'Gerando...' : 'Gerar Link Individual'}
          </Button>
          <Button type="button" variant="outline" size="lg">
            <Upload className="mr-2 h-4 w-4" />
            Importar em Massa
          </Button>
        </div>
      </form>

      {generatedLink && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border animate-in fade-in-50">
          <Label>Link Gerado:</Label>
          <div className="mt-2 p-2 bg-white border rounded-md text-sm text-gray-700 break-all">
            {generatedLink}
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleCopyLink}>
              {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {isCopied ? 'Copiado!' : 'Copiar Link'}
            </Button>
            <Button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700">
              <Send className="mr-2 h-4 w-4" />
              Enviar por WhatsApp
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyGeneratorForm;
