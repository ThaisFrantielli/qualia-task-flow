import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { AlertTriangle, User, Building2, ShieldCheck } from 'lucide-react';

interface Sinistro {
  IdOcorrencia?: number;
  Placa?: string;
  MotoristaCulpado?: string;
  ResponsavelCulpado?: string;
  Culpabilidade?: string;
  ValorTotal?: number;
  ValorSinistro?: number;
  ValorOrcado?: number;
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

// Função robusta para obter valor do sinistro
function getValor(s: Sinistro): number {
  if (typeof s.ValorTotal === 'number' && s.ValorTotal > 0) return s.ValorTotal;
  if (typeof s.ValorSinistro === 'number' && s.ValorSinistro > 0) return s.ValorSinistro;
  if (typeof s.ValorOrcado === 'number' && s.ValorOrcado > 0) return s.ValorOrcado;
  // Tentar parsear strings
  const parseVal = (v: any) => {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
  };
  return parseVal(s.ValorTotal) || parseVal(s.ValorSinistro) || parseVal(s.ValorOrcado) || 0;
}

// Função robusta para determinar culpabilidade
function getCulpa(s: Sinistro): 'Motorista' | 'Empresa' | 'Terceiros' {
  // Primeiro verificar campo Culpabilidade direto
  if (s.Culpabilidade) {
    const c = s.Culpabilidade.toLowerCase().trim();
    if (c.includes('motorista') || c.includes('condutor')) return 'Motorista';
    if (c.includes('empresa') || c.includes('responsavel') || c.includes('responsável')) return 'Empresa';
    if (c.includes('terceiro')) return 'Terceiros';
  }
  // Fallback para campos booleanos
  if (s.MotoristaCulpado === 'Sim' || s.MotoristaCulpado === '1' || s.MotoristaCulpado === 'true') return 'Motorista';
  if (s.ResponsavelCulpado === 'Sim' || s.ResponsavelCulpado === '1' || s.ResponsavelCulpado === 'true') return 'Empresa';
  return 'Terceiros';
}

const SinistrosCulpaChart: React.FC<SinistrosCulpaChartProps> = ({ sinistros }) => {
  const culpaData = useMemo(() => {
    const motoristaCulpado = sinistros.filter(s => getCulpa(s) === 'Motorista');
    const empresaResponsavel = sinistros.filter(s => getCulpa(s) === 'Empresa');
    const terceiros = sinistros.filter(s => getCulpa(s) === 'Terceiros');

    const valorMotorista = motoristaCulpado.reduce((sum, s) => sum + getValor(s), 0);
    const valorEmpresa = empresaResponsavel.reduce((sum, s) => sum + getValor(s), 0);
    const valorTerceiros = terceiros.reduce((sum, s) => sum + getValor(s), 0);

    return [
      {
        name: 'Motorista',
        value: motoristaCulpado.length,
        valorTotal: valorMotorista,
        color: '#ef4444',
        icon: User,
        percentual: sinistros.length > 0 ? (motoristaCulpado.length / sinistros.length) * 100 : 0,
      },
      {
        name: 'Empresa',
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
        icon: ShieldCheck,
        percentual: sinistros.length > 0 ? (terceiros.length / sinistros.length) * 100 : 0,
      },
    ].filter(d => d.value > 0); // Remover categorias vazias
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
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Análise de Responsabilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">Nenhum sinistro para analisar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Análise de Responsabilidade
        </CardTitle>
        <CardDescription>
          {totalSinistros} sinistro(s) • {formatCurrency(totalValor)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Gráfico de Pizza Compacto */}
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={culpaData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {culpaData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>

          {/* Cards de Detalhes Compactos */}
          <div className="grid grid-cols-3 gap-2">
            {culpaData.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="border rounded-lg p-2 space-y-1"
                  style={{ borderLeftWidth: '3px', borderLeftColor: item.color }}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4" style={{ color: item.color }} />
                    <span className="text-lg font-bold">{item.value}</span>
                  </div>
                  <p className="text-xs font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.percentual.toFixed(0)}%</p>
                </div>
              );
            })}
          </div>

          {/* Insights Compactos */}
          {culpaData.some(d => d.percentual > 40) && (
            <div className="bg-muted rounded-lg p-3 text-xs">
              <p className="font-medium mb-1">💡 Insight:</p>
              {culpaData[0]?.percentual > 40 && (
                <p className="text-muted-foreground">
                  Alta incidência de culpa do motorista ({culpaData[0].percentual.toFixed(0)}%) - considerar treinamentos
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SinistrosCulpaChart;
