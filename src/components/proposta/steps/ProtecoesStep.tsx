import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, DollarSign, Percent } from 'lucide-react';
import type { Proposta } from '@/types/proposta';

interface ProtecoesStepProps {
  data: Partial<Proposta>;
  onChange: (data: Partial<Proposta>) => void;
}

export function ProtecoesStep({ data, onChange }: ProtecoesStepProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Proteções Incluídas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="protecao_roubo">Roubo</Label>
              <Switch
                id="protecao_roubo"
                checked={data.protecao_roubo ?? true}
                onCheckedChange={(v) => onChange({ protecao_roubo: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="protecao_furto">Furto</Label>
              <Switch
                id="protecao_furto"
                checked={data.protecao_furto ?? true}
                onCheckedChange={(v) => onChange({ protecao_furto: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="protecao_colisao">Colisão</Label>
              <Switch
                id="protecao_colisao"
                checked={data.protecao_colisao ?? true}
                onCheckedChange={(v) => onChange({ protecao_colisao: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="protecao_incendio">Incêndio</Label>
              <Switch
                id="protecao_incendio"
                checked={data.protecao_incendio ?? true}
                onCheckedChange={(v) => onChange({ protecao_incendio: v })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Limites de Cobertura (R$)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Danos Materiais</Label>
              <Input
                type="number"
                step="1000"
                value={data.limite_danos_materiais || 100000}
                onChange={(e) =>
                  onChange({ limite_danos_materiais: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Danos Morais</Label>
              <Input
                type="number"
                step="1000"
                value={data.limite_danos_morais || 100000}
                onChange={(e) =>
                  onChange({ limite_danos_morais: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Danos Pessoais</Label>
              <Input
                type="number"
                step="1000"
                value={data.limite_danos_pessoais || 100000}
                onChange={(e) =>
                  onChange({ limite_danos_pessoais: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>APP por Passageiro</Label>
              <Input
                type="number"
                step="1000"
                value={data.limite_app_passageiro || 10000}
                onChange={(e) =>
                  onChange({ limite_app_passageiro: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Taxas e Custos Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Taxa Administração Multas (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={(data.taxa_administracao_multas || 0.1) * 100}
                onChange={(e) =>
                  onChange({
                    taxa_administracao_multas: parseFloat(e.target.value) / 100,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Taxa Reembolsáveis (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={(data.taxa_reembolsaveis || 0.1) * 100}
                onChange={(e) =>
                  onChange({
                    taxa_reembolsaveis: parseFloat(e.target.value) / 100,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Remoção Forçada (R$)</Label>
              <Input
                type="number"
                step="100"
                value={data.custo_remocao_forcada || 2000}
                onChange={(e) =>
                  onChange({ custo_remocao_forcada: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Lavagem Simples (R$)</Label>
              <Input
                type="number"
                step="10"
                value={data.custo_lavagem_simples || 50}
                onChange={(e) =>
                  onChange({ custo_lavagem_simples: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Higienização (R$)</Label>
              <Input
                type="number"
                step="50"
                value={data.custo_higienizacao || 300}
                onChange={(e) =>
                  onChange({ custo_higienizacao: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
