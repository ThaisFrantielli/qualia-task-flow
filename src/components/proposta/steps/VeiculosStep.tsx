import { Plus, Trash2, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useModelosVeiculos } from '@/hooks/useModelosVeiculos';
import type { PropostaVeiculo } from '@/types/proposta';

interface VeiculosStepProps {
  veiculos: Partial<PropostaVeiculo>[];
  onChange: (veiculos: Partial<PropostaVeiculo>[]) => void;
}

export function VeiculosStep({ veiculos, onChange }: VeiculosStepProps) {
  const { modelos } = useModelosVeiculos();

  const addVeiculo = () => {
    onChange([
      ...veiculos,
      {
        modelo_nome: '',
        montadora: '',
        ano_modelo: new Date().getFullYear() + 1,
        valor_aquisicao: 0,
        aluguel_unitario: 0,
        franquia_km: 3000,
        valor_km_excedente: 0.35,
        quantidade: 1,
      },
    ]);
  };

  const updateVeiculo = (index: number, updates: Partial<PropostaVeiculo>) => {
    const updated = [...veiculos];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeVeiculo = (index: number) => {
    onChange(veiculos.filter((_, i) => i !== index));
  };

  const handleModeloSelect = (index: number, modeloId: string) => {
    const modelo = modelos.find((m) => m.id === modeloId);
    if (modelo) {
      updateVeiculo(index, {
        modelo_id: modelo.id,
        modelo_nome: modelo.nome,
        montadora: modelo.montadora,
        ano_modelo: modelo.ano_modelo,
        valor_aquisicao: modelo.valor_final || modelo.preco_publico * (1 - modelo.percentual_desconto),
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const totalMensal = veiculos.reduce(
    (sum, v) => sum + (v.aluguel_unitario || 0) * (v.quantidade || 1),
    0
  );

  const totalVeiculos = veiculos.reduce((sum, v) => sum + (v.quantidade || 1), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Veículos da Proposta</h3>
          <p className="text-sm text-muted-foreground">
            Adicione os veículos que farão parte desta proposta
          </p>
        </div>
        <Button onClick={addVeiculo}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Veículo
        </Button>
      </div>

      {veiculos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum veículo adicionado</p>
            <Button variant="outline" className="mt-4" onClick={addVeiculo}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Veículo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {veiculos.map((veiculo, index) => (
            <Card key={index}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Veículo {index + 1}
                  </CardTitle>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => removeVeiculo(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Selecionar Modelo</Label>
                    <Select
                      value={veiculo.modelo_id || ''}
                      onValueChange={(v) => handleModeloSelect(index, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelos.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.montadora} {m.nome} ({m.ano_modelo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input
                      placeholder="Nome do modelo"
                      value={veiculo.modelo_nome || ''}
                      onChange={(e) =>
                        updateVeiculo(index, { modelo_nome: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Montadora</Label>
                    <Input
                      placeholder="Montadora"
                      value={veiculo.montadora || ''}
                      onChange={(e) =>
                        updateVeiculo(index, { montadora: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min={1}
                      value={veiculo.quantidade || 1}
                      onChange={(e) =>
                        updateVeiculo(index, {
                          quantidade: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Aquisição (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={veiculo.valor_aquisicao || 0}
                      onChange={(e) =>
                        updateVeiculo(index, {
                          valor_aquisicao: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aluguel Unitário (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={veiculo.aluguel_unitario || 0}
                      onChange={(e) =>
                        updateVeiculo(index, {
                          aluguel_unitario: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Franquia KM</Label>
                    <Input
                      type="number"
                      value={veiculo.franquia_km || 3000}
                      onChange={(e) =>
                        updateVeiculo(index, {
                          franquia_km: parseInt(e.target.value) || 3000,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Subtotal ({veiculo.quantidade || 1}x):
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      (veiculo.aluguel_unitario || 0) * (veiculo.quantidade || 1)
                    )}
                    /mês
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {veiculos.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total de veículos: {totalVeiculos}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Mensal</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(totalMensal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
