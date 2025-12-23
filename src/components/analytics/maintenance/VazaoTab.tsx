import { useMemo, useState } from 'react';
import { Card, Title, Text, Metric } from '@tremor/react';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ReferenceLine 
} from 'recharts';
import { ArrowDown, ArrowUp, Scale, TrendingUp } from 'lucide-react';

type VazaoData = {
  Data?: string;
  Chegadas?: number;
  Conclusoes?: number;
  SaldoPeriodo?: number;
};

type Props = {
  vazaoData: VazaoData[];
  fornecedores: string[];
  tiposManutencao: string[];
  clientes: string[];
};

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR').format(v);
}

function aggregateByPeriod(data: VazaoData[], dimension: 'dia' | 'semana' | 'mes'): any[] {
  // Filter out items without Data
  const validData = data.filter(d => d.Data);
  
  if (dimension === 'dia') {
    return validData.map(d => ({
      ...d,
      Chegadas: d.Chegadas || 0,
      Conclusoes: d.Conclusoes || 0,
      SaldoPeriodo: d.SaldoPeriodo || 0,
      label: new Date(d.Data!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    }));
  }
  
  const grouped: Record<string, { Chegadas: number; Conclusoes: number; SaldoPeriodo: number }> = {};
  
  validData.forEach(d => {
    const dataStr = d.Data!;
    const date = new Date(dataStr);
    let key: string;
    
    if (dimension === 'semana') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = dataStr.substring(0, 7);
    }
    
    if (!grouped[key]) {
      grouped[key] = { Chegadas: 0, Conclusoes: 0, SaldoPeriodo: 0 };
    }
    grouped[key].Chegadas += d.Chegadas || 0;
    grouped[key].Conclusoes += d.Conclusoes || 0;
    grouped[key].SaldoPeriodo += d.SaldoPeriodo || 0;
  });
  
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({
      Data: key,
      label: dimension === 'mes' 
        ? new Date(key + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        : new Date(key).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      ...values,
    }));
}

export default function VazaoTab({ vazaoData, fornecedores, tiposManutencao, clientes }: Props) {
  const [dimensao, setDimensao] = useState<'dia' | 'semana' | 'mes'>('dia');
  
  const chartData = useMemo(() => {
    const aggregated = aggregateByPeriod(vazaoData.slice(-90), dimensao);
    
    // Calculate accumulated balance
    let accumulated = 0;
    return aggregated.map(d => {
      accumulated += d.SaldoPeriodo || 0;
      return { ...d, SaldoAcumulado: accumulated };
    });
  }, [vazaoData, dimensao]);
  
  const kpis = useMemo(() => {
    const totalChegadas = chartData.reduce((s, d) => s + (d.Chegadas || 0), 0);
    const totalConclusoes = chartData.reduce((s, d) => s + (d.Conclusoes || 0), 0);
    const saldoPeriodo = totalChegadas - totalConclusoes;
    const saldoAcumulado = chartData.length > 0 ? (chartData[chartData.length - 1].SaldoAcumulado || 0) : 0;
    
    return { totalChegadas, totalConclusoes, saldoPeriodo, saldoAcumulado };
  }, [chartData]);
  
  const lastPeriods = chartData.slice(-30);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="blue" className="bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-blue-600" />
            <Text>Chegadas na Oficina</Text>
          </div>
          <Metric className="text-blue-600">{fmtNum(kpis.totalChegadas)}</Metric>
        </Card>
        
        <Card decoration="top" decorationColor="emerald" className="bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-center gap-2">
            <ArrowUp className="w-5 h-5 text-emerald-600" />
            <Text>Conclusões de Serviço</Text>
          </div>
          <Metric className="text-emerald-600">{fmtNum(kpis.totalConclusoes)}</Metric>
        </Card>
        
        <Card decoration="top" decorationColor={kpis.saldoPeriodo > 0 ? 'rose' : 'emerald'} className={`bg-gradient-to-br ${kpis.saldoPeriodo > 0 ? 'from-rose-50' : 'from-emerald-50'} to-white`}>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-slate-600" />
            <Text>Saldo do Período</Text>
          </div>
          <Metric className={kpis.saldoPeriodo > 0 ? 'text-rose-600' : 'text-emerald-600'}>
            {kpis.saldoPeriodo > 0 ? '+' : ''}{fmtNum(kpis.saldoPeriodo)}
          </Metric>
        </Card>
        
        <Card decoration="top" decorationColor={kpis.saldoAcumulado > 0 ? 'amber' : 'emerald'} className={`bg-gradient-to-br ${kpis.saldoAcumulado > 0 ? 'from-amber-50' : 'from-emerald-50'} to-white`}>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-600" />
            <Text>Saldo Acumulado</Text>
          </div>
          <Metric className={kpis.saldoAcumulado > 0 ? 'text-amber-600' : 'text-emerald-600'}>
            {kpis.saldoAcumulado > 0 ? '+' : ''}{fmtNum(kpis.saldoAcumulado)}
          </Metric>
        </Card>
      </div>
      
      {/* Chart 1: Arrivals vs Completions */}
      <Card>
        <Title>Chegadas vs Conclusões</Title>
        <Text className="text-slate-500 mb-4">Comparativo de entradas e saídas da oficina</Text>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={lastPeriods}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" type="category" fontSize={11} tickMargin={8} />
              <YAxis fontSize={11} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(v: any, name: string) => [fmtNum(v), name === 'Chegadas' ? '↓ Chegadas' : '↑ Conclusões']}
              />
              <Legend />
              <Bar dataKey="Chegadas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={dimensao === 'dia' ? 12 : 24} />
              <Bar dataKey="Conclusoes" fill="#10b981" radius={[4, 4, 0, 0]} barSize={dimensao === 'dia' ? 12 : 24} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      
      {/* Chart 2: Period Balance */}
      <Card>
        <Title>Saldo do Período</Title>
        <Text className="text-slate-500 mb-4">Diferença entre chegadas e conclusões (positivo = acúmulo)</Text>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={lastPeriods}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" type="category" fontSize={11} tickMargin={8} />
              <YAxis fontSize={11} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(v: any) => [fmtNum(v), 'Saldo']}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Bar 
                dataKey="SaldoPeriodo" 
                fill="#6366f1"
                radius={[4, 4, 4, 4]} 
                barSize={dimensao === 'dia' ? 10 : 20}
              />
              <Line 
                type="monotone" 
                dataKey="SaldoPeriodo" 
                stroke="#6366f1" 
                strokeWidth={2} 
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      
      {/* Chart 3: Accumulated Balance */}
      <Card>
        <Title>Saldo Acumulado (Running Total)</Title>
        <Text className="text-slate-500 mb-4">Quantidade total de veículos em oficina ao longo do tempo</Text>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={lastPeriods}>
              <defs>
                <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" type="category" fontSize={11} tickMargin={8} />
              <YAxis fontSize={11} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(v: any) => [fmtNum(v), 'Acumulado']}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <Area 
                type="monotone" 
                dataKey="SaldoAcumulado" 
                stroke="#f59e0b" 
                strokeWidth={2}
                fill="url(#colorAcumulado)"
              />
              <Line 
                type="monotone" 
                dataKey="SaldoAcumulado" 
                stroke="#f59e0b" 
                strokeWidth={3} 
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
