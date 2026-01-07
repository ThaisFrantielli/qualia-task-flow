import { useMemo } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { 
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import useBIData from '@/hooks/useBIData';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';

type ManutencaoUnificado = {
  Ocorrencia: number;
  DataEntrada: string;
  DataSaida: string;
  DataConclusao: string;
  LeadTimeTotalDias: number;
  IsCancelada: boolean;
  Fornecedor?: string;
  Modelo?: string;
  TipoOcorrencia?: string;
  Cliente?: string;
  Placa?: string;
};

function monthLabel(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m) - 1]}/${y}`;
}

export default function FluxoTab() {
  const { data: rawData, loading } = useBIData<ManutencaoUnificado>('fat_manutencao_unificado');
  const { filters } = useMaintenanceFilters();

  const dadosFiltrados = useMemo(() => {
    if (!Array.isArray(rawData)) return [];

    // Filtrar datas futuras
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    return rawData.filter(m => {
      // Filtro de data futura
      if (m.DataEntrada) {
        const dataEntrada = new Date(m.DataEntrada);
        if (dataEntrada > hoje) return false;
      }

      // Filtros globais
      if (filters.fornecedores?.length > 0 && m.Fornecedor && !filters.fornecedores.includes(m.Fornecedor)) return false;
      if (filters.modelos?.length > 0 && m.Modelo && !filters.modelos.includes(m.Modelo)) return false;
      if (filters.tiposOcorrencia?.length > 0 && m.TipoOcorrencia && !filters.tiposOcorrencia.includes(m.TipoOcorrencia)) return false;
      if (filters.clientes?.length > 0 && m.Cliente && !filters.clientes.includes(m.Cliente)) return false;
      if (filters.placas?.length > 0 && m.Placa && !filters.placas.includes(m.Placa)) return false;

      // Filtro de data range
      if (filters.dateRange?.from && m.DataEntrada) {
        const dataEntrada = new Date(m.DataEntrada);
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (dataEntrada < fromDate) return false;

        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (dataEntrada > toDate) return false;
        }
      }

      return true;
    });
  }, [rawData, filters]);

  // Análise mensal: Chegadas vs Concluídas
  const dadosMensais = useMemo(() => {
    if (!dadosFiltrados.length) return [];

    const porMes: Record<string, { chegadas: number; concluidas: number }> = {};

    dadosFiltrados.forEach(m => {
      // Chegadas (por data de entrada)
      if (m.DataEntrada) {
        const mesChegada = m.DataEntrada.substring(0, 7); // YYYY-MM
        if (!porMes[mesChegada]) porMes[mesChegada] = { chegadas: 0, concluidas: 0 };
        porMes[mesChegada].chegadas += 1;
      }

      // Concluídas (por data de conclusão)
      if (m.DataConclusao || m.DataSaida) {
        const dataConclusao = m.DataConclusao || m.DataSaida;
        const mesConclusao = dataConclusao.substring(0, 7);
        if (!porMes[mesConclusao]) porMes[mesConclusao] = { chegadas: 0, concluidas: 0 };
        porMes[mesConclusao].concluidas += 1;
      }
    });

    return Object.entries(porMes)
      .map(([mes, valores]) => ({
        mes: monthLabel(mes),
        mesKey: mes,
        chegadas: valores.chegadas,
        concluidas: valores.concluidas,
        saldo: valores.chegadas - valores.concluidas,
      }))
      .sort((a, b) => a.mesKey.localeCompare(b.mesKey))
      .slice(-24); // Últimos 24 meses
  }, [dadosFiltrados]);

  // Saldo Acumulado (Running Total)
  const dadosAcumulados = useMemo(() => {
    let acumulado = 0;
    return dadosMensais.map(d => {
      acumulado += d.saldo;
      return {
        ...d,
        saldoAcumulado: acumulado,
      };
    });
  }, [dadosMensais]);

  // KPIs
  const kpis = useMemo(() => {
    if (!dadosAcumulados.length) {
      return { 
        saldoAtual: 0, 
        saldoMesAnterior: 0, 
        variacao: 0,
        chegadasMes: 0,
        concluidasMes: 0,
        taxaConclusao: 0,
      };
    }

    const mesAtual = dadosAcumulados[dadosAcumulados.length - 1];
    const mesAnterior = dadosAcumulados.length > 1 ? dadosAcumulados[dadosAcumulados.length - 2] : null;

    const saldoAtual = mesAtual.saldoAcumulado;
    const saldoMesAnterior = mesAnterior ? mesAnterior.saldoAcumulado : 0;
    const variacao = saldoAtual - saldoMesAnterior;

    const chegadasMes = mesAtual.chegadas;
    const concluidasMes = mesAtual.concluidas;
    const taxaConclusao = chegadasMes > 0 ? (concluidasMes / chegadasMes) * 100 : 0;

    return {
      saldoAtual,
      saldoMesAnterior,
      variacao,
      chegadasMes,
      concluidasMes,
      taxaConclusao,
    };
  }, [dadosAcumulados]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>Carregando análise de fluxo...</Text>
        </div>
      </div>
    );
  }

  if (!dadosFiltrados.length) {
    return (
      <Card className="text-center p-12">
        <Activity className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
        <Title>Sem Dados de Fluxo</Title>
        <Text className="mt-2">Ajuste os filtros ou aguarde a sincronização dos dados</Text>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Title>Análise de Fluxo - Chegadas vs Concluídas</Title>
        <Text>Acompanhamento do volume de entrada e saída de ordens de serviço ao longo do tempo</Text>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor={kpis.saldoAtual > 100 ? "red" : kpis.saldoAtual > 50 ? "yellow" : "green"}>
          <Text>Saldo Acumulado</Text>
          <Metric className="mt-2">{kpis.saldoAtual}</Metric>
          <div className="flex items-center gap-2 mt-2">
            {kpis.variacao > 0 ? (
              <TrendingUp className="w-4 h-4 text-red-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-green-500" />
            )}
            <Text className={`text-xs ${kpis.variacao > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {kpis.variacao > 0 ? '+' : ''}{kpis.variacao} vs mês anterior
            </Text>
          </div>
        </Card>

        <Card decoration="top" decorationColor="blue">
          <Text>Chegadas Mês Atual</Text>
          <Metric className="mt-2">{kpis.chegadasMes}</Metric>
          <Text className="text-xs text-gray-500 mt-2">Novas OS abertas</Text>
        </Card>

        <Card decoration="top" decorationColor="green">
          <Text>Concluídas Mês Atual</Text>
          <Metric className="mt-2">{kpis.concluidasMes}</Metric>
          <Text className="text-xs text-gray-500 mt-2">OS finalizadas</Text>
        </Card>

        <Card decoration="top" decorationColor={kpis.taxaConclusao >= 100 ? "green" : "orange"}>
          <Text>Taxa de Conclusão</Text>
          <Metric className="mt-2">{kpis.taxaConclusao.toFixed(0)}%</Metric>
          <div className="mt-2">
            {kpis.taxaConclusao >= 100 ? (
              <Badge color="green">Concluindo mais que entra</Badge>
            ) : (
              <Badge color="orange">Acumulando pendências</Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Gráfico: Chegadas vs Concluídas */}
      <Card>
        <Title>Chegadas vs Concluídas por Mês</Title>
        <Text className="mb-4">Comparação entre o volume de OS abertas e concluídas mensalmente</Text>

        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={dadosMensais}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'chegadas') return [value, 'Chegadas'];
                if (name === 'concluidas') return [value, 'Concluídas'];
                return [value, name];
              }}
            />
            <Bar dataKey="chegadas" fill="#3b82f6" name="Chegadas" radius={[4, 4, 0, 0]} />
            <Bar dataKey="concluidas" fill="#10b981" name="Concluídas" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico: Saldo do Período */}
      <Card>
        <Title>Saldo do Período (Chegadas - Concluídas)</Title>
        <Text className="mb-4">Diferença mensal entre entrada e saída de OS. Valores positivos indicam acúmulo de pendências</Text>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dadosMensais}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip 
              formatter={(value: number) => [value > 0 ? `+${value}` : value, 'Saldo']}
            />
            <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} />
            <Bar dataKey="saldo" radius={[4, 4, 0, 0]}>
              {dadosMensais.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.saldo > 0 ? '#ef4444' : '#10b981'} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico: Saldo Acumulado (Running Total) */}
      <Card>
        <Title>Saldo Acumulado - Running Total</Title>
        <Text className="mb-4">Evolução do acúmulo de OS abertas menos concluídas ao longo do tempo</Text>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dadosAcumulados}>
            <defs>
              <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip 
              formatter={(value: number) => [value, 'Saldo Acumulado']}
            />
            <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" />
            <Area 
              type="monotone" 
              dataKey="saldoAcumulado" 
              stroke="#f59e0b" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSaldo)" 
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <Text className="text-sm font-medium text-yellow-800">
            💡 <strong>Como interpretar:</strong> Se a linha está subindo, significa que estão entrando mais OS do que sendo concluídas. 
            Se está descendo, a equipe está reduzindo o backlog de pendências.
          </Text>
        </div>
      </Card>
    </div>
  );
}
