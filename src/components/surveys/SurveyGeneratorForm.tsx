// src/components/surveys/SurveyGeneratorForm.tsx

import React, { useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import type { Survey } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Upload, Copy, Check, Send } from 'lucide-react';

interface SurveyGeneratorFormProps {
  onSuccess: () => void;
}

const SurveyGeneratorForm: React.FC<SurveyGeneratorFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    type: '' as Survey['type'],
    client_name: '',
    driver_name: '',
    license_plate: '',
    client_email: '',
    client_phone: '',
  });

  const handleChange = (id: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCopyLink = () => { /* ... */ };
  const handleSendWhatsApp = () => { /* ... */ };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type || !formData.client_name) {
      toast.error("Tipo da pesquisa e Titular do Contrato são obrigatórios.");
      return;
    }
    setLoading(true);
    setGeneratedLink(null);
    setIsCopied(false);

    try {
      const { data, error } = await supabase.from('surveys').insert({
        type: formData.type,
        client_name: formData.client_name.trim(),
        driver_name: formData.driver_name.trim() || null,
        license_plate: formData.license_plate.trim() || null,
        client_email: formData.client_email.trim() || null,
        client_phone: formData.client_phone.trim() || null,
        created_by_id: user?.id,
      }).select().single();

      if (error) throw error;

      const link = `${window.location.origin}/pesquisa/${data.id}`;
      setGeneratedLink(link);
      toast.success("Link gerado!", { description: "O link da pesquisa foi criado com sucesso." });
      onSuccess();

    } catch (err: any) { // <-- SINTAXE CORRIGIDA
      toast.error("Erro ao gerar link", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border border-gray-200">
      <h2 className="text-2xl font-semibold mb-6">Gerador de Links de Pesquisa</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ... seu JSX do formulário aqui ... */}
      </form>

      {generatedLink && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border animate-in fade-in-50">
          {/* ... seu JSX do link gerado aqui ... */}
        </div>
      )}
    </div>
  );
};

export default SurveyGeneratorForm;