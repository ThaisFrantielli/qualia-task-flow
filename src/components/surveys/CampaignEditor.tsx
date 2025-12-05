import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, GripVertical } from 'lucide-react';
import { SurveyCampaign, surveyTypeLabels } from '@/types/surveys';

interface CampaignEditorProps {
  campaign?: SurveyCampaign | null;
  onSave: (campaign: Partial<SurveyCampaign>) => void;
  onCancel: () => void;
}

export const CampaignEditor = ({ campaign, onSave, onCancel }: CampaignEditorProps) => {
  const [formData, setFormData] = useState<Partial<SurveyCampaign>>({
    name: '',
    description: '',
    type: 'comercial',
    is_active: true,
    welcome_message: '',
    csat_question: '',
    factors_label: 'O que mais influenciou sua nota?',
    influencing_factors: [],
    include_nps: false,
    nps_question: '',
    include_open_feedback: false,
    open_feedback_question: '',
    send_via: 'whatsapp',
    auto_send_delay_hours: 24,
    reminder_enabled: false,
    reminder_delay_hours: 48,
    max_reminders: 2,
    expires_after_days: 7,
  });

  const [newFactor, setNewFactor] = useState('');

  useEffect(() => {
    if (campaign) {
      setFormData({
        ...campaign,
        influencing_factors: campaign.influencing_factors || [],
      });
    }
  }, [campaign]);

  const handleChange = (field: keyof SurveyCampaign, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addFactor = () => {
    if (newFactor.trim()) {
      setFormData(prev => ({
        ...prev,
        influencing_factors: [...(prev.influencing_factors || []), newFactor.trim()],
      }));
      setNewFactor('');
    }
  };

  const removeFactor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      influencing_factors: (prev.influencing_factors || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Campanha *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ex: Pesquisa Comercial"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Pesquisa *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(surveyTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descreva o objetivo desta campanha..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
            <Label>Campanha ativa</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perguntas CSAT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
            <Textarea
              id="welcome_message"
              value={formData.welcome_message || ''}
              onChange={(e) => handleChange('welcome_message', e.target.value)}
              placeholder="Olá! Agradecemos por dedicar um momento para nos avaliar."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="csat_question">Pergunta CSAT (1-5 estrelas) *</Label>
            <Textarea
              id="csat_question"
              value={formData.csat_question}
              onChange={(e) => handleChange('csat_question', e.target.value)}
              placeholder="Em uma escala de 1 a 5, qual o seu nível de satisfação?"
              rows={2}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="factors_label">Rótulo dos Fatores</Label>
            <Input
              id="factors_label"
              value={formData.factors_label || ''}
              onChange={(e) => handleChange('factors_label', e.target.value)}
              placeholder="O que mais influenciou sua nota?"
            />
          </div>

          <div className="space-y-2">
            <Label>Fatores de Influência</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(formData.influencing_factors || []).map((factor, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  <GripVertical className="h-3 w-3 cursor-move" />
                  {factor}
                  <button
                    type="button"
                    onClick={() => removeFactor(index)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newFactor}
                onChange={(e) => setNewFactor(e.target.value)}
                placeholder="Adicionar fator..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFactor())}
              />
              <Button type="button" variant="outline" onClick={addFactor}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perguntas Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.include_nps}
                onCheckedChange={(checked) => handleChange('include_nps', checked)}
              />
              <Label>Incluir pergunta NPS (0-10)</Label>
            </div>
            
            {formData.include_nps && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="nps_question">Pergunta NPS</Label>
                <Textarea
                  id="nps_question"
                  value={formData.nps_question || ''}
                  onChange={(e) => handleChange('nps_question', e.target.value)}
                  placeholder="O quão provável você é de nos recomendar?"
                  rows={2}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.include_open_feedback}
                onCheckedChange={(checked) => handleChange('include_open_feedback', checked)}
              />
              <Label>Incluir pergunta aberta</Label>
            </div>
            
            {formData.include_open_feedback && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="open_feedback_question">Pergunta Aberta</Label>
                <Textarea
                  id="open_feedback_question"
                  value={formData.open_feedback_question || ''}
                  onChange={(e) => handleChange('open_feedback_question', e.target.value)}
                  placeholder="O que poderíamos ter feito melhor?"
                  rows={2}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações de Envio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="send_via">Canal de Envio</Label>
              <Select
                value={formData.send_via}
                onValueChange={(value: 'whatsapp' | 'email' | 'manual') => handleChange('send_via', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="auto_send_delay_hours">Atraso de Envio (horas)</Label>
              <Input
                id="auto_send_delay_hours"
                type="number"
                min="0"
                value={formData.auto_send_delay_hours}
                onChange={(e) => handleChange('auto_send_delay_hours', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.reminder_enabled}
                onCheckedChange={(checked) => handleChange('reminder_enabled', checked)}
              />
              <Label>Enviar lembretes</Label>
            </div>
            
            {formData.reminder_enabled && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div className="space-y-2">
                  <Label>Atraso do Lembrete (horas)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.reminder_delay_hours}
                    onChange={(e) => handleChange('reminder_delay_hours', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máx. de Lembretes</Label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.max_reminders}
                    onChange={(e) => handleChange('max_reminders', parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires_after_days">Expira após (dias)</Label>
            <Input
              id="expires_after_days"
              type="number"
              min="1"
              value={formData.expires_after_days}
              onChange={(e) => handleChange('expires_after_days', parseInt(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {campaign ? 'Salvar Alterações' : 'Criar Campanha'}
        </Button>
      </div>
    </form>
  );
};
