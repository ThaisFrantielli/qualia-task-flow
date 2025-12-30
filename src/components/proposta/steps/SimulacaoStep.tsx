import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, TrendingUp, Clock, DollarSign, BarChart3 } from 'lucide-react';
import { usePricingParameters } from '@/hooks/usePricingParameters';
import { calcularCenario, calcularFluxoCaixa, type CenarioCalculado } from '@/lib/pricing-formulas';
import type { Proposta, PropostaVeiculo } from '@/types/proposta';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface SimulacaoStepProps {
  proposta: Partial<Proposta>;
  veiculos: Partial<PropostaVeiculo>[];
}

const PRAZOS = [12, 24, 36, 48];

export function SimulacaoStep({ veiculos }: SimulacaoStepProps) {
  const { parameters } = usePricingParameters();
  const [selectedPrazo, setSelectedPrazo] = useState<number>(36);

  const cenarios = useMemo((): CenarioCalculado[] => {
    if (!parameters || veiculos.length === 0) return [];

    return PRAZOS.map((prazo) => {
      return calcularCenario(veiculos, prazo, '100%', parameters);
    });
  }, [parameters, veiculos]);

  const fluxoCaixaData = useMemo(() => {
    if (!parameters || veiculos.length === 0) return [];
    
    const cenario = cenarios.find((c) => c.prazo_meses === selectedPrazo);
    if (!cenario) return [];

    const investimentoTotal = veiculos.reduce(
      (sum, v) => sum + (v.valor_aquisicao || 0) * (v.quantidade || 1),
      0
    );
    const receitaMensal = veiculos.reduce(
      (sum, v) => sum + (v.aluguel_unitario || 0) * (v.quantidade || 1),
      0
    );

    // custos_operacionais and custos_financeiros are total for the contract period, divide by prazo to get monthly
    const custosOperacionaisMensais = (cenario.custos_operacionais || 0) / selectedPrazo;
    const custosFinanceirosMensais = (cenario.custos_financeiros || 0) / selectedPrazo;
    const custosMensais = custosOperacionaisMensais + custosFinanceirosMensais;

    const fluxo = calcularFluxoCaixa(
      selectedPrazo,
      receitaMensal,
      custosMensais,
      investimentoTotal
    );

    return fluxo.map((item) => ({
      mes: `Mês ${item.mes}`,
      receita: parseFloat(item.receita.toFixed(2)),
      custos: parseFloat(item.custos.toFixed(2)),
      resultado: parseFloat(item.resultado.toFixed(2)),
      acumulado: parseFloat(item.acumulado.toFixed(2)),
    }));
  }, [parameters, veiculos, cenarios, selectedPrazo]);

  const breakEvenMes = useMemo(() => {
    const mes = fluxoCaixaData.findIndex((item) => item.acumulado >= 0);
    return mes >= 0 ? mes + 1 : null;
  }, [fluxoCaixaData]);

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
            Comparativo de prazos e análise de viabilidade financeira
          </p>
        </div>
      </div>

      <Tabs defaultValue="cenarios" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cenarios">
            <Calculator className="h-4 w-4 mr-2" />
            Cenários
          </TabsTrigger>
          <TabsTrigger value="fluxo">
            <BarChart3 className="h-4 w-4 mr-2" />
            Fluxo de Caixa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cenarios" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="fluxo" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Análise de Fluxo de Caixa</CardTitle>
                <div className="flex gap-2">
                  {PRAZOS.map((prazo) => (
                    <Badge
                      key={prazo}
                      variant={selectedPrazo === prazo ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedPrazo(prazo)}
                    >
                      {prazo} meses
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {breakEvenMes && (
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Break-even no mês {breakEvenMes}</strong> - A partir deste mês o investimento começa a gerar retorno positivo
                  </AlertDescription>
                </Alert>
              )}

              {/* Gráfico de Fluxo Acumulado */}
              <div>
                <h4 className="text-sm font-medium mb-3">Resultado Acumulado</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={fluxoCaixaData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="acumulado"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      name="Resultado Acumulado"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico de Receitas vs Custos */}
              <div>
                <h4 className="text-sm font-medium mb-3">Receitas e Custos Mensais</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={fluxoCaixaData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Bar dataKey="receita" fill="#10b981" name="Receita" />
                    <Bar dataKey="custos" fill="#ef4444" name="Custos" />
                    <Bar dataKey="resultado" fill="#3b82f6" name="Resultado" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Resumo Financeiro */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Receita Total</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(fluxoCaixaData.reduce((sum, item) => sum + item.receita, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Custos Totais</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(fluxoCaixaData.reduce((sum, item) => sum + item.custos, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Lucro Líquido</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(fluxoCaixaData.reduce((sum, item) => sum + item.resultado, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-1">Break-even</p>
                    <p className="text-lg font-bold text-primary">
                      {breakEvenMes ? `Mês ${breakEvenMes}` : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
