import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw } from 'lucide-react';
import { usePricingParameters } from '@/hooks/usePricingParameters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ParametrosTab() {
  const { parameters, isLoading } = usePricingParameters();
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (parameters) {
      setFormData(parameters);
    }
  }, [parameters]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('precificacao_parametros')
        .update(formData)
        .eq('id', parameters?.id);

      if (error) throw error;

      toast.success('Parâmetros salvos com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar parâmetros', {
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (parameters) {
      setFormData(parameters);
      toast.info('Alterações descartadas');
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center">Carregando parâmetros...</div>;
  }

  const formatPercent = (value: number) => (value * 100).toFixed(2);

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Taxas Financeiras */}
        <Card>
          <CardHeader>
            <CardTitle>Taxas Financeiras</CardTitle>
            <CardDescription>Taxas aplicadas sobre o valor de aquisição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Taxa de Financiamento (% mensal)</Label>
              <Input
                type="number"
                step="0.01"
                value={formatPercent(formData.taxa_financiamento || 0)}
                onChange={(e) => handleChange('taxa_financiamento', (parseFloat(e.target.value) / 100).toString())}
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa de Sinistro (% anual)</Label>
              <Input
                type="number"
                step="0.01"
                value={formatPercent(formData.taxa_sinistro || 0)}
                onChange={(e) => handleChange('taxa_sinistro', (parseFloat(e.target.value) / 100).toString())}
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa de Depreciação (% anual)</Label>
              <Input
                type="number"
                step="0.01"
                value={formatPercent(formData.taxa_depreciacao_anual || 0)}
                onChange={(e) => handleChange('taxa_depreciacao_anual', (parseFloat(e.target.value) / 100).toString())}
              />
            </div>
          </CardContent>
        </Card>

        {/* Impostos e Margens */}
        <Card>
          <CardHeader>
            <CardTitle>Impostos e Margens</CardTitle>
            <CardDescription>Percentuais aplicados sobre o aluguel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Impostos (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formatPercent(formData.taxa_impostos || 0)}
                onChange={(e) => handleChange('taxa_impostos', (parseFloat(e.target.value) / 100).toString())}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo Administrativo (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formatPercent(formData.taxa_custo_administrativo || 0)}
                onChange={(e) => handleChange('taxa_custo_administrativo', (parseFloat(e.target.value) / 100).toString())}
              />
            </div>
            <div className="space-y-2">
              <Label>Comissão Comercial (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formatPercent(formData.taxa_comissao_comercial || 0)}
                onChange={(e) => handleChange('taxa_comissao_comercial', (parseFloat(e.target.value) / 100).toString())}
              />
            </div>
          </CardContent>
        </Card>

        {/* Custos Operacionais */}
        <Card>
          <CardHeader>
            <CardTitle>Custos Operacionais</CardTitle>
            <CardDescription>Custos mensais por veículo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Manutenção por KM (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_manutencao_por_km || 0}
                onChange={(e) => handleChange('custo_manutencao_por_km', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço Combustível por Litro (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.preco_combustivel_litro || 0}
                onChange={(e) => handleChange('preco_combustivel_litro', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Consumo Médio (KM/L)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.consumo_medio_km_litro || 0}
                onChange={(e) => handleChange('consumo_medio_km_litro', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Lavagem Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_lavagem_mensal || 0}
                onChange={(e) => handleChange('custo_lavagem_mensal', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telemetria Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_telemetria_mensal || 0}
                onChange={(e) => handleChange('custo_telemetria_mensal', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Custos de Implantação */}
        <Card>
          <CardHeader>
            <CardTitle>Custos de Implantação</CardTitle>
            <CardDescription>Custos únicos por veículo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>KM Mensal Padrão</Label>
              <Input
                type="number"
                value={formData.km_mensal_padrao || 0}
                onChange={(e) => handleChange('km_mensal_padrao', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo Emplacamento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_emplacamento || 0}
                onChange={(e) => handleChange('custo_emplacamento', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Custo Licenciamento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_licenciamento || 0}
                onChange={(e) => handleChange('custo_licenciamento', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Instalação Telemetria (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_instalacao_telemetria || 0}
                onChange={(e) => handleChange('custo_instalacao_telemetria', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Desmobilização (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.custo_desmobilizacao || 0}
                onChange={(e) => handleChange('custo_desmobilizacao', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* IPVA */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>IPVA e Multas</CardTitle>
            <CardDescription>Taxas e multas contratuais</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Taxa IPVA Anual (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formatPercent(formData.taxa_ipva_anual || 0)}
                onChange={(e) => handleChange('taxa_ipva_anual', (parseFloat(e.target.value) / 100).toString())}
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa Admin Multas (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formatPercent(formData.taxa_admin_multas || 0)}
                onChange={(e) => handleChange('taxa_admin_multas', (parseFloat(e.target.value) / 100).toString())}
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa Reembolsáveis (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formatPercent(formData.taxa_reembolsaveis || 0)}
                onChange={(e) => handleChange('taxa_reembolsaveis', (parseFloat(e.target.value) / 100).toString())}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Descartar Alterações
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Parâmetros'}
        </Button>
      </div>
    </div>
  );
}
