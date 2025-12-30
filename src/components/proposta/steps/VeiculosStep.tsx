import { Plus, Trash2, Car, Calculator, Info } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useModelosVeiculos } from '@/hooks/useModelosVeiculos';
import { useKmPackages } from '@/hooks/useKmPackages';
import { usePricingParameters } from '@/hooks/usePricingParameters';
import { calcularAluguelSugerido } from '@/lib/pricing-formulas';
import { useState } from 'react';
import type { PropostaVeiculo } from '@/types/proposta';

interface VeiculosStepProps {
  veiculos: Partial<PropostaVeiculo>[];
  onChange: (veiculos: Partial<PropostaVeiculo>[]) => void;
}

export function VeiculosStep({ veiculos, onChange }: VeiculosStepProps) {
  const { modelos } = useModelosVeiculos();
  const { data: kmPackages = [] } = useKmPackages();
  const { parameters: params } = usePricingParameters();
  const [showBreakdown, setShowBreakdown] = useState<number | null>(null);

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
      const valorAquisicao = modelo.valor_final || modelo.preco_publico * (1 - modelo.percentual_desconto);
      
      // Calcular aluguel sugerido automaticamente
      let aluguelSugerido = 0;
      if (params && valorAquisicao > 0) {
        aluguelSugerido = calcularAluguelSugerido(valorAquisicao, 36, params);
      }

      updateVeiculo(index, {
        modelo_id: modelo.id,
        modelo_nome: modelo.nome,
        montadora: modelo.montadora,
        ano_modelo: modelo.ano_modelo,
        valor_aquisicao: valorAquisicao,
        aluguel_unitario: aluguelSugerido,
      });
    }
  };

  const handleKmPackageSelect = (index: number, packageId: string) => {
    const pkg = kmPackages.find((p) => p.id === packageId);
    if (pkg) {
      updateVeiculo(index, {
        franquia_km: pkg.is_ilimitado ? 0 : pkg.km_mensal,
        valor_km_excedente: pkg.valor_km_adicional,
      });
    }
  };

  const calcularBreakdown = (valorAquisicao: number) => {
    if (!params || valorAquisicao === 0) return null;
    
    const depreciacaoMensal = (valorAquisicao * params.taxa_depreciacao_anual) / 12;
    const custoFinanceiro = valorAquisicao * params.taxa_financiamento;
    const custoSinistro = (valorAquisicao * params.taxa_sinistro) / 12;
    const baseAluguel = depreciacaoMensal + custoFinanceiro + custoSinistro;
    const margemTotal = params.taxa_impostos + params.taxa_custo_administrativo + params.taxa_comissao_comercial;
    const aluguelFinal = baseAluguel * (1 + margemTotal);

    return {
      depreciacaoMensal,
      custoFinanceiro,
      custoSinistro,
      baseAluguel,
      margemTotal: margemTotal * 100,
      aluguelFinal,
    };
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
                  <div className="space-y-2 col-span-2">
                    <Label>Pacote de KM</Label>
                    <Select
                      value={String(veiculo.franquia_km || '')}
                      onValueChange={(v) => handleKmPackageSelect(index, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o pacote de KM" />
                      </SelectTrigger>
                      <SelectContent>
                        {kmPackages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.nome} {!pkg.is_ilimitado && `- R$ ${pkg.valor_km_adicional.toFixed(2)}/km adicional`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span>Aluguel Unitário (R$)</span>
                      {veiculo.valor_aquisicao && veiculo.valor_aquisicao > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowBreakdown(showBreakdown === index ? null : index)}
                        >
                          <Calculator className="h-3 w-3 mr-1" />
                          {showBreakdown === index ? 'Ocultar' : 'Ver'} Cálculo
                        </Button>
                      )}
                    </Label>
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
                    <Label>Franquia KM (manual se necessário)</Label>
                    <Input
                      type="number"
                      value={veiculo.franquia_km || 3000}
                      onChange={(e) =>
                        updateVeiculo(index, {
                          franquia_km: parseInt(e.target.value) || 3000,
                        })
                      }
                      disabled={false}
                    />
                  </div>
                </div>

                {/* Breakdown de Cálculo */}
                {showBreakdown === index && veiculo.valor_aquisicao && veiculo.valor_aquisicao > 0 && (() => {
                  const breakdown = calcularBreakdown(veiculo.valor_aquisicao);
                  if (!breakdown) return null;
                  return (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold mb-2">Composição do Aluguel Sugerido:</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <span className="text-muted-foreground">Depreciação Mensal:</span>
                            <span className="font-medium">{formatCurrency(breakdown.depreciacaoMensal)}</span>
                            
                            <span className="text-muted-foreground">Custo Financeiro:</span>
                            <span className="font-medium">{formatCurrency(breakdown.custoFinanceiro)}</span>
                            
                            <span className="text-muted-foreground">Custo Sinistro:</span>
                            <span className="font-medium">{formatCurrency(breakdown.custoSinistro)}</span>
                            
                            <span className="text-muted-foreground">Base Aluguel:</span>
                            <span className="font-medium">{formatCurrency(breakdown.baseAluguel)}</span>
                            
                            <span className="text-muted-foreground">Margens ({breakdown.margemTotal.toFixed(1)}%):</span>
                            <span className="font-medium text-primary">{formatCurrency(breakdown.aluguelFinal - breakdown.baseAluguel)}</span>
                          </div>
                          <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                            <span>Aluguel Sugerido:</span>
                            <span className="text-primary">{formatCurrency(breakdown.aluguelFinal)}</span>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  );
                })()}

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
