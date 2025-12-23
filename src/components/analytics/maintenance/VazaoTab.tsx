import { useMemo } from 'react';
import { Card, Text, Metric } from '@tremor/react';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ReferenceLine 
} from 'recharts';
import { ArrowDown, ArrowUp, Scale, TrendingUp } from 'lucide-react';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { ChartDrillDownHeader, GranularityLevel } from '@/components/analytics/ChartDrillDownHeader';

type ManutencaoUnificadoData = {
  IdOrdemServico?: number;
  IdOcorrencia?: number;
  TipoEvento?: string; // 'Chegada' ou 'Conclusao'
  DataEvento?: string;
  Chegadas?: number;
  Conclusoes?: number;
  Placa?: string;
  Modelo?: string;
  TipoOcorrencia?: string;
  Fornecedor?: string;
  Cliente?: string;
  CustoTotalOS?: number;
  LeadTimeTotal?: number;
  LeadTimeOficina?: number;
  CustoPecas?: number;
  CustoServicos?: number;
};

type Props = {
  vazaoData: ManutencaoUnificadoData[];
};

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR').format(v);
}

// Array de meses em pt-BR para formatação manual
const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Função para obter a data de hoje às 23:59:59 no timezone local
function getTodayEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

// Função para normalizar data para meia-noite no timezone local
function parseLocalDate(dateString: string): Date {
  // Remove parte do horário se existir e pega apenas YYYY-MM-DD
  const dateOnly = String(dateString).split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  // Cria data no timezone local (não UTC) - isso evita problemas de timezone
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

// Formata label da data conforme a granularidade
function formatLabel(dateObj: Date, dimension: 'year' | 'month' | 'day'): string {
  if (dimension === 'year') {
    return dateObj.getFullYear().toString();
  } else if (dimension === 'month') {
    // Formato: "Fev/24" ao invés de "fev. de 24"
    return `${MONTHS_PT[dateObj.getMonth()]}/${String(dateObj.getFullYear()).slice(2)}`;
  } else {
    // Formato: "23/12"
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }
}

function aggregateByPeriod(
  data: ManutencaoUnificadoData[], 
  dimension: 'year' | 'month' | 'day',
  dateRange?: { from?: Date; to?: Date }
): any[] {
  const todayEnd = getTodayEnd();
  
  // Determinar data mínima para filtro (se não houver dateRange, usar 90 dias para 'day', 24 meses para 'month')
  let minDate: Date | null = null;
  if (dateRange?.from) {
    minDate = new Date(dateRange.from);
    minDate.setHours(0, 0, 0, 0);
  } else {
    // Padrões baseados na granularidade
    if (dimension === 'day') {
      minDate = new Date();
      minDate.setDate(minDate.getDate() - 90);
      minDate.setHours(0, 0, 0, 0);
    } else if (dimension === 'month') {
      minDate = new Date();
      minDate.setMonth(minDate.getMonth() - 24);
      minDate.setHours(0, 0, 0, 0);
    }
    // Para 'year' não limitamos por padrão
  }
  
  let maxDate: Date = todayEnd;
  if (dateRange?.to) {
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999);
    // Usar o menor entre dateRange.to e hoje (nunca permitir datas futuras)
    maxDate = toDate < todayEnd ? toDate : todayEnd;
  }
  
  // Filtra dados: exclui datas futuras e aplica range
  const validData = data.filter(d => {
    if (!d.DataEvento) return false;
    
    const dataEvento = parseLocalDate(d.DataEvento);
    
    // CRÍTICO: Nunca permitir datas futuras
    if (dataEvento > todayEnd) return false;
    
    // Aplicar filtro de data mínima
    if (minDate && dataEvento < minDate) return false;
    
    // Aplicar filtro de data máxima
    if (dataEvento > maxDate) return false;
    
    return true;
  });
  
  const grouped: Record<string, { 
    Chegadas: number; 
    Conclusoes: number; 
    SaldoPeriodo: number;
    date: string;
  }> = {};
  
  validData.forEach(d => {
    const dataStr = String(d.DataEvento!).split('T')[0]; // YYYY-MM-DD
    let key: string;
    
    if (dimension === 'year') {
      key = dataStr.substring(0, 4); // YYYY
    } else if (dimension === 'month') {
      key = dataStr.substring(0, 7); // YYYY-MM
    } else {
      key = dataStr; // YYYY-MM-DD
    }
    
    if (!grouped[key]) {
      grouped[key] = { Chegadas: 0, Conclusoes: 0, SaldoPeriodo: 0, date: key };
    }
    
    grouped[key].Chegadas += d.Chegadas || 0;
    grouped[key].Conclusoes += d.Conclusoes || 0;
  });
  
  // Calculate saldo (chegadas - conclusoes)
  Object.values(grouped).forEach(item => {
    item.SaldoPeriodo = item.Chegadas - item.Conclusoes;
  });
  
  // Sort by date
  const sorted = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => {
      // Construir Date local a partir da chave
      let dateObj: Date;
      if (dimension === 'year') {
        const year = Number(key);
        dateObj = new Date(year, 0, 1);
      } else if (dimension === 'month') {
        const [y, m] = key.split('-');
        dateObj = new Date(Number(y), Number(m) - 1, 1);
      } else {
        const [y, m, d] = key.split('-');
        dateObj = new Date(Number(y), Number(m) - 1, Number(d));
      }

      return {
        ...values,
        label: formatLabel(dateObj, dimension),
        _dateObj: dateObj,
      };
    })
    // Filtro final de segurança: remover qualquer data futura que tenha passado
    .filter(item => item._dateObj <= todayEnd);
  
  return sorted;
}

export default function VazaoTab({ vazaoData }: Props) {
  const { filters, setTimeGranularity } = useMaintenanceFilters();
  
  // Apply global filters to vazaoData
  const filteredData = useMemo(() => {
    const todayEnd = getTodayEnd();
    
    return vazaoData.filter((r: ManutencaoUnificadoData) => {
      // CRÍTICO: Filtrar datas futuras imediatamente
      if (r.DataEvento) {
        const dataEvento = parseLocalDate(r.DataEvento);
        if (dataEvento > todayEnd) return false;
      }
      
      // Date range filter
      if (filters.dateRange?.from && r.DataEvento) {
        const dataEvento = parseLocalDate(r.DataEvento);
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        
        if (dataEvento < fromDate) return false;
        
        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (dataEvento > toDate) return false;
        }
      }
      
      // Apply all global filters
      if (filters.fornecedores.length > 0 && r.Fornecedor && !filters.fornecedores.includes(r.Fornecedor)) return false;
      if (filters.modelos.length > 0 && r.Modelo && !filters.modelos.includes(r.Modelo)) return false;
      if (filters.tiposOcorrencia.length > 0 && r.TipoOcorrencia && !filters.tiposOcorrencia.includes(r.TipoOcorrencia)) return false;
      if (filters.clientes.length > 0 && r.Cliente && !filters.clientes.includes(r.Cliente)) return false;
      if (filters.placas.length > 0 && r.Placa && !filters.placas.includes(r.Placa)) return false;
      
      return true;
    });
  }, [vazaoData, filters]);
  
  const chartData = useMemo(() => {
    const aggregated = aggregateByPeriod(filteredData, filters.timeGranularity, filters.dateRange);
    
    // Calculate accumulated balance
    let accumulated = 0;
    return aggregated.map(d => {
      accumulated += d.SaldoPeriodo || 0;
      return { ...d, SaldoAcumulado: accumulated };
    });
  }, [filteredData, filters.timeGranularity, filters.dateRange]);
  
  const kpis = useMemo(() => {
    const totalChegadas = chartData.reduce((s, d) => s + (d.Chegadas || 0), 0);
    const totalConclusoes = chartData.reduce((s, d) => s + (d.Conclusoes || 0), 0);
    const saldoPeriodo = totalChegadas - totalConclusoes;
    const saldoAcumulado = chartData.length > 0 ? (chartData[chartData.length - 1].SaldoAcumulado || 0) : 0;
    
    return { totalChegadas, totalConclusoes, saldoPeriodo, saldoAcumulado };
  }, [chartData]);

  const handleLevelChange = (level: GranularityLevel) => {
    setTimeGranularity(level);
  };
  
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
        <ChartDrillDownHeader
          title="Chegadas vs Conclusões"
          description="Comparativo de entradas e saídas da oficina"
          currentLevel={filters.timeGranularity}
          onLevelChange={handleLevelChange}
        />
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" type="category" fontSize={11} tickMargin={8} />
              <YAxis fontSize={11} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(v: any, name: string) => [fmtNum(v), name === 'Chegadas' ? '↓ Chegadas' : '↑ Conclusões']}
              />
              <Legend />
              <Bar dataKey="Chegadas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={filters.timeGranularity === 'day' ? 12 : 24} />
              <Bar dataKey="Conclusoes" fill="#10b981" radius={[4, 4, 0, 0]} barSize={filters.timeGranularity === 'day' ? 12 : 24} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      
      {/* Chart 2: Period Balance */}
      <Card>
        <ChartDrillDownHeader
          title="Saldo do Período"
          description="Diferença entre chegadas e conclusões (positivo = acúmulo)"
          currentLevel={filters.timeGranularity}
          onLevelChange={handleLevelChange}
        />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
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
                barSize={filters.timeGranularity === 'day' ? 10 : 20}
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
        <ChartDrillDownHeader
          title="Saldo Acumulado (Running Total)"
          description="Quantidade total de veículos em oficina ao longo do tempo"
          currentLevel={filters.timeGranularity}
          onLevelChange={handleLevelChange}
        />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
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
