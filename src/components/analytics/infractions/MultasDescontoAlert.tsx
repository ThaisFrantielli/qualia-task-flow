import React, { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, DollarSign, TrendingDown, CheckCircle, ExternalLink } from 'lucide-react';

interface Multa {
  IdOcorrencia: number;
  Ocorrencia: string;
  Placa: string;
  Modelo?: string;
  DataInfracao: string;
  DataLimitePagamento?: string;
  DescricaoInfracao?: string;
  CodigoInfracao?: string;
  OrgaoAutuador?: string;
  ValorMulta?: number;
  ValorDesconto?: number;
  Pontuacao?: number;
  Status?: string;
  Condutor?: string;
  AutoInfracao?: string;
}

interface MultasDescontoAlertProps {
  multas: Multa[];
  diasAlerta?: number; // Dias antes do vencimento para alertar
}

const MultasDescontoAlert: React.FC<MultasDescontoAlertProps> = ({ multas, diasAlerta = 7 }) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Analisar multas com desconto disponível próximas do vencimento
  const multasUrgentes = useMemo(() => {
    return multas
      .filter((m) => {
        if (!m.DataLimitePagamento) return false;
        if (!m.ValorDesconto || !m.ValorMulta) return false;
        if (m.ValorDesconto >= m.ValorMulta) return false; // Sem desconto real
        if (m.Status && (m.Status.toLowerCase().includes('paga') || m.Status.toLowerCase().includes('cancelada'))) return false;

        const prazo = new Date(m.DataLimitePagamento);
        prazo.setHours(0, 0, 0, 0);
        const diasRestantes = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

        return diasRestantes >= 0 && diasRestantes <= diasAlerta;
      })
      .map((m) => {
        const prazo = new Date(m.DataLimitePagamento!);
        prazo.setHours(0, 0, 0, 0);
        const diasRestantes = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const economia = (m.ValorMulta || 0) - (m.ValorDesconto || 0);
        const percentualDesconto = m.ValorMulta ? ((economia / m.ValorMulta) * 100).toFixed(0) : '0';

        return {
          ...m,
          diasRestantes,
          economia,
          percentualDesconto,
          urgencia: diasRestantes <= 2 ? 'critica' : diasRestantes <= 5 ? 'alta' : 'media',
        };
      })
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [multas, diasAlerta, hoje]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalMultas = multasUrgentes.length;
    const economiaTotal = multasUrgentes.reduce((sum, m) => sum + m.economia, 0);
    const valorTotal = multasUrgentes.reduce((sum, m) => sum + (m.ValorMulta || 0), 0);
    const valorComDesconto = multasUrgentes.reduce((sum, m) => sum + (m.ValorDesconto || 0), 0);
    const criticas = multasUrgentes.filter((m) => m.urgencia === 'critica').length;
    const altas = multasUrgentes.filter((m) => m.urgencia === 'alta').length;

    return { totalMultas, economiaTotal, valorTotal, valorComDesconto, criticas, altas };
  }, [multasUrgentes]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getUrgenciaColor = (urgencia: string): 'destructive' | 'secondary' | 'outline' => {
    switch (urgencia) {
      case 'critica':
        return 'destructive';
      case 'alta':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getUrgenciaLabel = (urgencia: string): string => {
    switch (urgencia) {
      case 'critica':
        return 'URGENTE';
      case 'alta':
        return 'Atenção';
      default:
        return 'Moderado';
    }
  };

  if (multasUrgentes.length === 0) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-100">
          Nenhuma multa com desconto vencendo
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Todas as multas com desconto estão em dia ou já foram pagas. Continue monitorando
          regularmente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alerta Principal */}
      <Alert variant={stats.criticas > 0 ? 'destructive' : 'default'}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          {stats.criticas > 0 ? '🚨 AÇÃO URGENTE NECESSÁRIA' : '⚠️ Atenção: Descontos Expirando'}
        </AlertTitle>
        <AlertDescription>
          <div className="space-y-2 mt-2">
            <p>
              <strong>{stats.totalMultas}</strong> multa(s) com desconto disponível por até{' '}
              <strong>{diasAlerta} dias</strong>.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <TrendingDown className="h-3 w-3 mr-1" />
                Economia potencial: {formatCurrency(stats.economiaTotal)}
              </Badge>
              {stats.criticas > 0 && (
                <Badge variant="destructive">
                  <Clock className="h-3 w-3 mr-1" />
                  {stats.criticas} crítica(s) (≤2 dias)
                </Badge>
              )}
              {stats.altas > 0 && (
                <Badge variant="outline" className="border-orange-500 text-orange-600">
                  <Clock className="h-3 w-3 mr-1" />
                  {stats.altas} urgente(s) (≤5 dias)
                </Badge>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Card com Lista Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Multas com Desconto Vencendo
          </CardTitle>
          <CardDescription>
            Pague antes do prazo e economize {formatCurrency(stats.economiaTotal)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {multasUrgentes.map((multa) => (
              <div
                key={multa.IdOcorrencia}
                className={`border rounded-lg p-4 space-y-3 ${
                  multa.urgencia === 'critica'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950'
                    : multa.urgencia === 'alta'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                    : ''
                }`}
              >
                {/* Cabeçalho */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant={getUrgenciaColor(multa.urgencia)}
                        className={multa.urgencia === 'alta' ? 'border-orange-500 text-orange-600' : ''}
                      >
                        {getUrgenciaLabel(multa.urgencia)}
                      </Badge>
                      {multa.diasRestantes === 0 && (
                        <Badge variant="destructive">HOJE É O ÚLTIMO DIA</Badge>
                      )}
                      {multa.diasRestantes === 1 && (
                        <Badge variant="destructive">VENCE AMANHÃ</Badge>
                      )}
                    </div>
                    <p className="font-bold text-lg">
                      {multa.Placa} • {multa.Modelo || 'Veículo'}
                    </p>
                    <p className="text-sm text-muted-foreground">{multa.Ocorrencia}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(multa.economia)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Economia ({multa.percentualDesconto}%)
                    </p>
                  </div>
                </div>

                {/* Detalhes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Valor Original</p>
                    <p className="font-mono">{formatCurrency(multa.ValorMulta || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Com Desconto</p>
                    <p className="font-mono text-green-600">
                      {formatCurrency(multa.ValorDesconto || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Prazo</p>
                    <p className="font-medium">
                      {multa.diasRestantes === 0 ? (
                        <span className="text-red-600 font-bold">HOJE</span>
                      ) : (
                        `${multa.diasRestantes} dia(s)`
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Vencimento</p>
                    <p className="font-mono">{formatDate(multa.DataLimitePagamento)}</p>
                  </div>
                </div>

                {/* Infração */}
                {multa.DescricaoInfracao && (
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground mb-1">Infração</p>
                    <p className="text-sm">{multa.DescricaoInfracao}</p>
                    {multa.CodigoInfracao && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Código: {multa.CodigoInfracao}
                      </p>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    {multa.Condutor && <span>Condutor: {multa.Condutor}</span>}
                    {multa.AutoInfracao && (
                      <span className="ml-3 font-mono">AIT: {multa.AutoInfracao}</span>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="gap-2">
                    Ver Detalhes
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Resumo Final */}
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  💰 Total a Economizar
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Pague {stats.totalMultas} multa(s) com desconto
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.economiaTotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  De {formatCurrency(stats.valorTotal)} → {formatCurrency(stats.valorComDesconto)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultasDescontoAlert;
