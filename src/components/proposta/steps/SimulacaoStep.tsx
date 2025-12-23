import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { usePricingParameters } from '@/hooks/usePricingParameters';
import { calcularCenario, type CenarioCalculado } from '@/lib/pricing-formulas';
import type { Proposta, PropostaVeiculo } from '@/types/proposta';

interface SimulacaoStepProps {
  proposta: Partial<Proposta>;
  veiculos: Partial<PropostaVeiculo>[];
}

const PRAZOS = [12, 24, 36, 48];

export function SimulacaoStep({ veiculos }: SimulacaoStepProps) {
  const { parameters } = usePricingParameters();

  const cenarios = useMemo((): CenarioCalculado[] => {
    if (!parameters || veiculos.length === 0) return [];

    return PRAZOS.map((prazo) => {
      return calcularCenario(veiculos, prazo, '100%', parameters);
    });
  }, [parameters, veiculos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const bestROI = cenarios.reduce(
    (best, c) => (c.roi_anual > best.roi_anual ? c : best),
    cenarios[0] || { roi_anual: 0, prazo_meses: 0 }
  );

  if (veiculos.length === 0) {
    return (
      <div className="text-center py-12">
        <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          Adicione veículos para ver a simulação de cenários
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Simulação de Cenários</h3>
          <p className="text-sm text-muted-foreground">
            Comparativo de prazos de contrato
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investimento</p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    veiculos.reduce(
                      (sum, v) =>
                        sum + (v.valor_aquisicao || 0) * (v.quantidade || 1),
                      0
                    )
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Mensal</p>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    veiculos.reduce(
                      (sum, v) =>
                        sum + (v.aluguel_unitario || 0) * (v.quantidade || 1),
                      0
                    )
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Melhor ROI</p>
                <p className="text-xl font-bold text-primary">
                  {bestROI.prazo_meses} meses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cenarios.map((cenario) => (
          <Card
            key={cenario.prazo_meses}
            className={
              cenario.prazo_meses === bestROI.prazo_meses
                ? 'border-primary bg-primary/5'
                : ''
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {cenario.prazo_meses} meses
                </CardTitle>
                {cenario.prazo_meses === bestROI.prazo_meses && (
                  <Badge>Melhor</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Valor Contrato</p>
                <p className="font-semibold">
                  {formatCurrency(cenario.valor_contrato_total)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Margem Líquida</p>
                <p
                  className={`font-semibold ${
                    cenario.margem_liquida >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatCurrency(cenario.margem_liquida)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">ROI Anual</p>
                <p
                  className={`font-semibold ${
                    cenario.roi_anual >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatPercent(cenario.roi_anual)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Payback</p>
                <p className="font-semibold">
                  {cenario.payback_meses > 0
                    ? `${cenario.payback_meses} meses`
                    : 'N/A'}
                </p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">% Locação/Inv.</p>
                <p className="font-semibold">
                  {formatPercent(cenario.percentual_locacao_investimento)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        * Cálculos baseados nos parâmetros de precificação configurados
      </p>
    </div>
  );
}
