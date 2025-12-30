import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertCircle, Save, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePricingParameters } from '@/hooks/usePricingParameters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function CustosImplantacaoTab() {
  const { parameters, isLoading } = usePricingParameters();
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (parameters) {
      setFormData({
        custo_emplacamento: parameters.custo_emplacamento || 0,
        custo_licenciamento: parameters.custo_licenciamento || 0,
        custo_telemetria_mensal: parameters.custo_telemetria_mensal || 0,
      });
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

      toast.success('Custos de implantação salvos com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar custos', {
        description: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (parameters) {
      setFormData({
        custo_emplacamento: parameters.custo_emplacamento || 0,
        custo_licenciamento: parameters.custo_licenciamento || 0,
        custo_telemetria_mensal: parameters.custo_telemetria_mensal || 0,
      });
      toast.info('Alterações descartadas');
    }
  };

  const calcularTotal = () => {
    return Object.values(formData).reduce((sum: number, val: any) => sum + (val || 0), 0);
  };

  if (isLoading) {
    return <div className="p-6 text-center">Carregando custos...</div>;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Custos de Implantação por Veículo</CardTitle>
          <CardDescription>
            Custos únicos aplicados na entrada de cada veículo na frota
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Estes custos são voláteis e podem variar. Configure os valores atuais praticados pela operação.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="emplacamento">Emplacamento (R$)</Label>
              <Input
                id="emplacamento"
                type="number"
                step="0.01"
                value={formData.custo_emplacamento || 0}
                onChange={(e) => handleChange('custo_emplacamento', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenciamento">Licenciamento (R$)</Label>
              <Input
                id="licenciamento"
                type="number"
                step="0.01"
                value={formData.custo_licenciamento || 0}
                onChange={(e) => handleChange('custo_licenciamento', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telemetria">Instalação Telemetria (R$)</Label>
              <Input
                id="telemetria"
                type="number"
                step="0.01"
                value={formData.custo_instalacao_telemetria || 0}
                onChange={(e) => handleChange('custo_instalacao_telemetria', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desmobilizacao">Desmobilização (R$)</Label>
              <Input
                id="desmobilizacao"
                type="number"
                step="0.01"
                value={formData.custo_desmobilizacao || 0}
                onChange={(e) => handleChange('custo_desmobilizacao', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="combustivel">Combustível Inicial (R$)</Label>
              <Input
                id="combustivel"
                type="number"
                step="0.01"
                value={formData.custo_combustivel_inicial || 0}
                onChange={(e) => handleChange('custo_combustivel_inicial', e.target.value)}
              />
            </div>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total de Implantação</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Valor aplicado por veículo na entrada da frota
                  </p>
                </div>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(calcularTotal())}
                </p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Descartar Alterações
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Custos'}
        </Button>
      </div>
    </div>
  );
}
