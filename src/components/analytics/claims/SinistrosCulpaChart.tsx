import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { AlertTriangle, User, Building2 } from 'lucide-react';

interface Sinistro {
  IdOcorrencia: number;
  Placa: string;
  MotoristaCulpado?: string;
  ResponsavelCulpado?: string;
  ValorTotal?: number;
}

interface SinistrosCulpaChartProps {
  sinistros: Sinistro[];
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const SinistrosCulpaChart: React.FC<SinistrosCulpaChartProps> = ({ sinistros }) => {
  const culpaData = useMemo(() => {
    const motoristaCulpado = sinistros.filter(
      (s) => s.MotoristaCulpado === 'Sim' || s.MotoristaCulpado === '1'
    );
    const empresaResponsavel = sinistros.filter(
      (s) =>
        (s.ResponsavelCulpado === 'Sim' || s.ResponsavelCulpado === '1') &&
        s.MotoristaCulpado !== 'Sim' &&
        s.MotoristaCulpado !== '1'
    );
    const terceiros = sinistros.filter(
      (s) =>
        s.MotoristaCulpado !== 'Sim' &&
        s.MotoristaCulpado !== '1' &&
        s.ResponsavelCulpado !== 'Sim' &&
        s.ResponsavelCulpado !== '1'
    );

    const valorMotorista = motoristaCulpado.reduce((sum, s) => sum + (s.ValorTotal || 0), 0);
    const valorEmpresa = empresaResponsavel.reduce((sum, s) => sum + (s.ValorTotal || 0), 0);
    const valorTerceiros = terceiros.reduce((sum, s) => sum + (s.ValorTotal || 0), 0);

    return [
      {
        name: 'Motorista Culpado',
        value: motoristaCulpado.length,
        valorTotal: valorMotorista,
        color: '#ef4444',
        icon: User,
        percentual: sinistros.length > 0 ? (motoristaCulpado.length / sinistros.length) * 100 : 0,
      },
      {
        name: 'Empresa Responsável',
        value: empresaResponsavel.length,
        valorTotal: valorEmpresa,
        color: '#f59e0b',
        icon: Building2,
        percentual: sinistros.length > 0 ? (empresaResponsavel.length / sinistros.length) * 100 : 0,
      },
      {
        name: 'Terceiros',
        value: terceiros.length,
        valorTotal: valorTerceiros,
        color: '#10b981',
        icon: AlertTriangle,
        percentual: sinistros.length > 0 ? (terceiros.length / sinistros.length) * 100 : 0,
      },
    ];
  }, [sinistros]);

  const totalValor = useMemo(() => {
    return culpaData.reduce((sum, item) => sum + item.valorTotal, 0);
  }, [culpaData]);

  const totalSinistros = useMemo(() => {
    return culpaData.reduce((sum, item) => sum + item.value, 0);
  }, [culpaData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-bold text-sm" style={{ color: data.color }}>
            {data.name}
          </p>
          <p className="text-sm">Ocorrências: {data.value}</p>
          <p className="text-sm">Valor: {formatCurrency(data.valorTotal)}</p>
          <p className="text-sm text-muted-foreground">
            {data.percentual.toFixed(1)}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  if (sinistros.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Análise de Responsabilidade
          </CardTitle>
          <CardDescription>Distribuição de culpa em sinistros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum sinistro para analisar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Análise de Responsabilidade
        </CardTitle>
        <CardDescription>
          {totalSinistros} sinistro(s) • {formatCurrency(totalValor)} em custos totais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Gráfico de Pizza */}
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={culpaData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentual }) => `${name}: ${percentual.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {culpaData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          {/* Cards de Detalhes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {culpaData.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-2"
                  style={{ borderLeftWidth: '4px', borderLeftColor: item.color }}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5" style={{ color: item.color }} />
                    <span className="text-2xl font-bold">{item.value}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.percentual.toFixed(1)}% dos casos
                    </p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm font-mono">{formatCurrency(item.valorTotal)}</p>
                    <p className="text-xs text-muted-foreground">Custo total</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insights */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">💡 Insights:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              {culpaData[0].percentual > 50 && (
                <li>
                  Alta incidência de culpa do motorista ({culpaData[0].percentual.toFixed(1)}%)
                  - considerar treinamentos preventivos
                </li>
              )}
              {culpaData[1].percentual > 30 && (
                <li>
                  Percentual significativo de responsabilidade empresarial (
                  {culpaData[1].percentual.toFixed(1)}%) - revisar processos de manutenção
                </li>
              )}
              {culpaData[2].percentual > 40 && (
                <li>
                  Maioria dos sinistros causados por terceiros ({culpaData[2].percentual.toFixed(1)}
                  %) - cobertura de seguro adequada
                </li>
              )}
              {culpaData[0].valorTotal / culpaData[0].value > 5000 && (
                <li>
                  Custo médio por sinistro de motorista elevado (
                  {formatCurrency(culpaData[0].valorTotal / culpaData[0].value)})
                </li>
              )}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SinistrosCulpaChart;
