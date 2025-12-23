import { useMemo, useState } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

type FaturamentoItem = {
  DataEmissao?: string;
  ValorTotal?: number;
  Cliente?: string;
};

type ManutencaoItem = {
  DataEntrada?: string;
  ValorTotal?: number;
  Placa?: string;
  Modelo?: string;
};

type SinistroItem = {
  DataSinistro?: string;
  ValorSinistro?: number;
  ValorRecuperado?: number;
};

type Props = {
  faturamentoData: FaturamentoItem[];
  manutencaoData: ManutencaoItem[];
  sinistrosData: SinistroItem[];
};

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtCompact(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function getYear(dateStr?: string): number | null {
  if (!dateStr) return null;
  const year = parseInt(dateStr.split('-')[0] || dateStr.split('/')[2]);
  return isNaN(year) ? null : year;
}

function getClassificacao(percentual: number): { label: string; color: 'emerald' | 'amber' | 'rose'; icon: React.ReactNode } {
  if (percentual < 12) return { label: 'Saudável', color: 'emerald', icon: <CheckCircle className="w-4 h-4" /> };
  if (percentual < 20) return { label: 'Atenção', color: 'amber', icon: <AlertTriangle className="w-4 h-4" /> };
  return { label: 'Crítico', color: 'rose', icon: <XCircle className="w-4 h-4" /> };
}

export default function ProjecaoRepactuacaoTab({ faturamentoData, manutencaoData, sinistrosData }: Props) {
  const [filtroGrupo, setFiltroGrupo] = useState<string>('todos');
  
  const yearlyData = useMemo(() => {
    const years = [2023, 2024, 2025];
    
    return years.map(year => {
      const fatAno = faturamentoData.filter(f => getYear(f.DataEmissao) === year);
      const manAno = manutencaoData.filter(m => getYear(m.DataEntrada) === year);
      const sinAno = sinistrosData.filter(s => getYear(s.DataSinistro) === year);
      
      const faturamento = fatAno.reduce((s, f) => s + (f.ValorTotal || 0), 0);
      const qtdVeiculos = new Set(manAno.map(m => m.Placa)).size || new Set(fatAno.map(f => f.Cliente)).size;
      const gastoManutencao = manAno.reduce((s, m) => s + (m.ValorTotal || 0), 0);
      const gastoSinistro = sinAno.reduce((s, si) => s + (si.ValorSinistro || 0), 0);
      const reembolsoSinistro = sinAno.reduce((s, si) => s + (si.ValorRecuperado || 0), 0);
      const gastoLiquido = gastoManutencao + gastoSinistro - reembolsoSinistro;
      const percentual = faturamento > 0 ? (gastoLiquido / faturamento) * 100 : 0;
      
      return {
        ano: year,
        faturamento,
        qtdVeiculos,
        gastoManutencao,
        gastoSinistro,
        reembolso: reembolsoSinistro,
        gastoLiquido,
        percentual,
        classificacao: getClassificacao(percentual),
      };
    });
  }, [faturamentoData, manutencaoData, sinistrosData]);
  
  const totais = useMemo(() => {
    const faturamento = yearlyData.reduce((s, y) => s + y.faturamento, 0);
    const gastoLiquido = yearlyData.reduce((s, y) => s + y.gastoLiquido, 0);
    const percentual = faturamento > 0 ? (gastoLiquido / faturamento) * 100 : 0;
    
    return {
      faturamento,
      qtdVeiculos: yearlyData.reduce((s, y) => s + y.qtdVeiculos, 0),
      gastoManutencao: yearlyData.reduce((s, y) => s + y.gastoManutencao, 0),
      gastoSinistro: yearlyData.reduce((s, y) => s + y.gastoSinistro, 0),
      reembolso: yearlyData.reduce((s, y) => s + y.reembolso, 0),
      gastoLiquido,
      percentual,
      classificacao: getClassificacao(percentual),
    };
  }, [yearlyData]);
  
  // Projeção simples baseada na média dos últimos 2 anos
  const projecao = useMemo(() => {
    const lastTwo = yearlyData.slice(-2);
    const avgGrowth = lastTwo.length > 1 
      ? (lastTwo[1].faturamento - lastTwo[0].faturamento) / lastTwo[0].faturamento 
      : 0.05;
    const avgPercent = lastTwo.reduce((s, y) => s + y.percentual, 0) / lastTwo.length;
    
    const base = yearlyData[yearlyData.length - 1];
    
    return [2026, 2027].map((year, idx) => {
      const growth = Math.pow(1 + avgGrowth, idx + 1);
      const faturamento = base.faturamento * growth;
      const gastoLiquido = faturamento * (avgPercent / 100);
      
      return {
        ano: year,
        faturamento,
        gastoLiquido,
        percentual: avgPercent,
        classificacao: getClassificacao(avgPercent),
      };
    });
  }, [yearlyData]);
  
  const chartData = useMemo(() => {
    return [...yearlyData, ...projecao].map(d => ({
      ano: d.ano.toString(),
      Faturamento: d.faturamento,
      'Gasto Líquido': d.gastoLiquido,
      '% Custo': d.percentual,
      isProjecao: d.ano >= 2026,
    }));
  }, [yearlyData, projecao]);

  return (
    <div className="space-y-6">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => setFiltroGrupo('todos')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            filtroGrupo === 'todos' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos Grupos
        </button>
        {['Hatch', 'Sedan', 'SUV', 'Pick-up', 'VUC'].map(grupo => (
          <button 
            key={grupo}
            onClick={() => setFiltroGrupo(grupo)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filtroGrupo === grupo 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {grupo}
          </button>
        ))}
      </div>
      
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="blue">
          <Text>Faturamento Total</Text>
          <Metric className="text-blue-600">{fmtCompact(totais.faturamento)}</Metric>
          <Text className="text-xs text-slate-500 mt-1">Últimos 3 anos</Text>
        </Card>
        
        <Card decoration="top" decorationColor="amber">
          <Text>Gasto Líquido</Text>
          <Metric className="text-amber-600">{fmtCompact(totais.gastoLiquido)}</Metric>
          <Text className="text-xs text-slate-500 mt-1">Manutenção + Sinistros - Reembolsos</Text>
        </Card>
        
        <Card decoration="top" decorationColor={totais.classificacao.color}>
          <Text>% Gasto / Faturamento</Text>
          <Metric className={`text-${totais.classificacao.color}-600`}>{totais.percentual.toFixed(1)}%</Metric>
          <Badge color={totais.classificacao.color} className="mt-2">
            {totais.classificacao.icon}
            <span className="ml-1">{totais.classificacao.label}</span>
          </Badge>
        </Card>
        
        <Card decoration="top" decorationColor="violet">
          <Text>Veículos Atendidos</Text>
          <Metric className="text-violet-600">{totais.qtdVeiculos}</Metric>
          <Text className="text-xs text-slate-500 mt-1">Únicos no período</Text>
        </Card>
      </div>
      
      {/* Chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title>Evolução Faturamento vs Custos</Title>
            <Text className="text-slate-500">Análise histórica e projeção 2026-2027</Text>
          </div>
          <Badge color="indigo" className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Projeção ativa
          </Badge>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ano" fontSize={12} />
              <YAxis yAxisId="left" fontSize={12} tickFormatter={fmtCompact} />
              <YAxis yAxisId="right" orientation="right" fontSize={12} domain={[0, 30]} tickFormatter={v => `${v}%`} />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  name === '% Custo' ? `${value.toFixed(1)}%` : fmtBRL(value),
                  name
                ]}
              />
              <Legend />
              <Bar 
                yAxisId="left" 
                dataKey="Faturamento" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                opacity={0.9}
              />
              <Bar 
                yAxisId="left" 
                dataKey="Gasto Líquido" 
                fill="#f59e0b" 
                radius={[4, 4, 0, 0]}
                opacity={0.9}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="% Custo" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ fill: '#ef4444', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      
      {/* Historical Table */}
      <Card>
        <Title>Resumo por Ano</Title>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 text-left font-semibold">Ano</th>
                <th className="p-3 text-right font-semibold">Faturamento</th>
                <th className="p-3 text-right font-semibold">Qtd Veículos</th>
                <th className="p-3 text-right font-semibold">Gasto Man.</th>
                <th className="p-3 text-right font-semibold">Gasto Sinistro</th>
                <th className="p-3 text-right font-semibold">Reembolso</th>
                <th className="p-3 text-right font-semibold">Gasto Líquido</th>
                <th className="p-3 text-right font-semibold">%</th>
                <th className="p-3 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.map(row => (
                <tr key={row.ano} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-medium">{row.ano}</td>
                  <td className="p-3 text-right">{fmtBRL(row.faturamento)}</td>
                  <td className="p-3 text-right">{row.qtdVeiculos}</td>
                  <td className="p-3 text-right">{fmtBRL(row.gastoManutencao)}</td>
                  <td className="p-3 text-right">{fmtBRL(row.gastoSinistro)}</td>
                  <td className="p-3 text-right text-emerald-600">-{fmtBRL(row.reembolso)}</td>
                  <td className="p-3 text-right font-medium">{fmtBRL(row.gastoLiquido)}</td>
                  <td className="p-3 text-right font-bold">{row.percentual.toFixed(1)}%</td>
                  <td className="p-3 text-center">
                    <Badge color={row.classificacao.color} size="sm">
                      {row.classificacao.label}
                    </Badge>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold">
                <td className="p-3">TOTAL</td>
                <td className="p-3 text-right">{fmtBRL(totais.faturamento)}</td>
                <td className="p-3 text-right">-</td>
                <td className="p-3 text-right">{fmtBRL(totais.gastoManutencao)}</td>
                <td className="p-3 text-right">{fmtBRL(totais.gastoSinistro)}</td>
                <td className="p-3 text-right text-emerald-600">-{fmtBRL(totais.reembolso)}</td>
                <td className="p-3 text-right">{fmtBRL(totais.gastoLiquido)}</td>
                <td className="p-3 text-right">{totais.percentual.toFixed(1)}%</td>
                <td className="p-3 text-center">
                  <Badge color={totais.classificacao.color} size="sm">
                    {totais.classificacao.label}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Projection Table */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          <Title>Projeção 2026-2027</Title>
        </div>
        <Text className="text-slate-500 mb-4">Baseada na tendência dos últimos 2 anos</Text>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50">
              <tr>
                <th className="p-3 text-left font-semibold">Ano</th>
                <th className="p-3 text-right font-semibold">Faturamento Projetado</th>
                <th className="p-3 text-right font-semibold">Gasto Líquido Projetado</th>
                <th className="p-3 text-right font-semibold">% Estimado</th>
                <th className="p-3 text-center font-semibold">Tendência</th>
              </tr>
            </thead>
            <tbody>
              {projecao.map(row => (
                <tr key={row.ano} className="border-t hover:bg-indigo-50/50">
                  <td className="p-3 font-medium">{row.ano}</td>
                  <td className="p-3 text-right">{fmtBRL(row.faturamento)}</td>
                  <td className="p-3 text-right">{fmtBRL(row.gastoLiquido)}</td>
                  <td className="p-3 text-right font-bold">{row.percentual.toFixed(1)}%</td>
                  <td className="p-3 text-center">
                    <Badge color={row.classificacao.color} size="sm">
                      {row.classificacao.label}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
