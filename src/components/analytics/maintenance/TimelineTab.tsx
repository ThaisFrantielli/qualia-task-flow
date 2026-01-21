import { useMemo, useState } from 'react';
import { Card, Title, Text, Badge, Metric } from '@tremor/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, X } from 'lucide-react';
import useBIData from '@/hooks/useBIData';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';

type ManutencaoUnificado = {
  Ocorrencia: number;
  Placa: string;
  Modelo: string;
  Fornecedor: string;
  FornecedorOcorrencia?: string;
  DataEntrada: string;
  DataSaida?: string;
  DataConclusaoOcorrencia?: string;
  LeadTimeTotalDias: number;
  StatusOS: string; // Compatibilidade
  SituacaoOcorrencia?: string; // Novo campo
  StatusSimplificado?: string; // Novo campo
  SituacaoOrdemServico?: string;
  TipoManutencao: string;
  CustoTotalOS: number;
  ValorTotal?: number;
  TipoOcorrencia?: string; // Compatibilidade
  Tipo?: string; // Novo campo
  IdTipo?: number; // Novo campo
};

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR');
}

export default function TimelineTab() {
  const { data: manutencoes, loading } = useBIData<ManutencaoUnificado[]>('fat_manutencao_unificado.json');
  const { filters } = useMaintenanceFilters();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<'30d' | '90d' | '6m' | '1y'>('90d');

  // Aplicar filtros globais
  const filteredManutencoes = useMemo(() => {
    if (!manutencoes?.length) return [];
    
    return manutencoes.filter((m: ManutencaoUnificado) => {
      // Filtro de data range
      if (filters.dateRange?.from && m.DataEntrada) {
        const dataEntrada = new Date(m.DataEntrada);
        if (dataEntrada < new Date(filters.dateRange.from)) return false;
      }
      if (filters.dateRange?.to && m.DataEntrada) {
        const dataEntrada = new Date(m.DataEntrada);
        if (dataEntrada > new Date(filters.dateRange.to)) return false;
      }
      
      // Filtro de fornecedores
      if (filters.fornecedores?.length && m.Fornecedor) {
        if (!filters.fornecedores.includes(m.Fornecedor) && 
            !filters.fornecedores.includes(m.FornecedorOcorrencia || '')) {
          return false;
        }
      }
      
      // Filtro de modelos
      if (filters.modelos?.length && m.Modelo) {
        if (!filters.modelos.includes(m.Modelo)) return false;
      }
      
      // Filtro de placas
      if (filters.placas?.length && m.Placa) {
        if (!filters.placas.includes(m.Placa)) return false;
      }
      
      // Filtro de tipos de ocorrência
      if (filters.tiposOcorrencia?.length) {
        const tipo = m.Tipo || m.TipoOcorrencia;
        if (tipo && !filters.tiposOcorrencia.includes(tipo)) return false;
      }
      
      // Filtro de status
      if (filters.status?.length) {
        const status = m.SituacaoOcorrencia || m.StatusSimplificado || m.StatusOS || m.SituacaoOrdemServico || '';
        if (!filters.status.includes(status)) return false;
      }
      
      return true;
    });
  }, [manutencoes, filters]);

  // Calcular período baseado no filtro
  const dateRange = useMemo(() => {
    const hoje = new Date();
    let inicio: Date;
    
    switch (periodFilter) {
      case '30d':
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 30);
        break;
      case '90d':
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 90);
        break;
      case '6m':
        inicio = new Date(hoje);
        inicio.setMonth(hoje.getMonth() - 6);
        break;
      case '1y':
        inicio = new Date(hoje);
        inicio.setFullYear(hoje.getFullYear() - 1);
        break;
      default:
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 90);
    }
    
    return { inicio, fim: hoje };
  }, [periodFilter]);

  // Calcular ocupação diária (veículos em manutenção por dia)
  const ocupacaoDiaria = useMemo(() => {
    if (!filteredManutencoes.length) return [];
    
    const diasMap = new Map<string, Set<string>>();
    const hoje = dateRange.fim;
    const inicio = dateRange.inicio;
    
    // Inicializar todos os dias do período com 0
    for (let d = new Date(inicio); d <= hoje; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      diasMap.set(dateKey, new Set());
    }
    
    // Para cada manutenção, adicionar a placa a todos os dias que ela esteve em manutenção
    filteredManutencoes.forEach((m: ManutencaoUnificado) => {
      const dataEntrada = new Date(m.DataEntrada);
      const dataSaida = m.DataSaida || m.DataConclusaoOcorrencia ? 
        new Date(m.DataSaida || m.DataConclusaoOcorrencia!) : 
        hoje;
      
      // Se ainda está em aberto, considera até hoje
      const fim = dataSaida > hoje ? hoje : dataSaida;
      
      // Adicionar placa a cada dia do período
      for (let d = new Date(Math.max(dataEntrada.getTime(), inicio.getTime())); 
           d <= fim && d <= hoje; 
           d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        const placasNoDia = diasMap.get(dateKey);
        if (placasNoDia) {
          placasNoDia.add(m.Placa);
        }
      }
    });
    
    // Converter para array ordenado
    return Array.from(diasMap.entries())
      .map(([date, placas]) => ({
        date,
        quantidade: placas.size,
        dataFormatada: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredManutencoes, dateRange]);

  // Calcular manutenções ativas no dia selecionado
  const manutencoesNoDia = useMemo(() => {
    if (!selectedDay || !filteredManutencoes.length) return [];
    
    const selectedDate = new Date(selectedDay);
    
    return filteredManutencoes.filter((m: ManutencaoUnificado) => {
      const dataEntrada = new Date(m.DataEntrada);
      const dataSaida = m.DataSaida || m.DataConclusaoOcorrencia ? 
        new Date(m.DataSaida || m.DataConclusaoOcorrencia!) : 
        new Date();
      
      // Verificar se o veículo estava em manutenção neste dia
      return dataEntrada <= selectedDate && selectedDate <= dataSaida;
    })
    .map((m: ManutencaoUnificado) => {
      // Calcular dias parados até o dia selecionado
      const dataEntrada = new Date(m.DataEntrada);
      const diasAteData = Math.floor((new Date(selectedDay).getTime() - dataEntrada.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        ...m,
        DiasParadoAteData: diasAteData
      };
    });
  }, [selectedDay, filteredManutencoes]);

  // KPIs do período
  const kpis = useMemo(() => {
    if (!filteredManutencoes.length) {
      return {
        mediaOcupacao: 0,
        picoOcupacao: 0,
        totalVeiculos: 0,
        tempoMedioManutencao: 0
      };
    }
    
    const ocupacoes = ocupacaoDiaria.map(d => d.quantidade);
    const mediaOcupacao = ocupacoes.reduce((a, b) => a + b, 0) / ocupacoes.length;
    const picoOcupacao = Math.max(...ocupacoes);
    
    const veiculosUnicos = new Set(filteredManutencoes.map(m => m.Placa));
    const totalVeiculos = veiculosUnicos.size;
    
    const tempoMedioManutencao = filteredManutencoes
      .filter(m => m.LeadTimeTotalDias > 0)
      .reduce((sum, m) => sum + m.LeadTimeTotalDias, 0) / 
      (filteredManutencoes.filter(m => m.LeadTimeTotalDias > 0).length || 1);
    
    return {
      mediaOcupacao: Math.round(mediaOcupacao * 10) / 10,
      picoOcupacao,
      totalVeiculos,
      tempoMedioManutencao: Math.round(tempoMedioManutencao * 10) / 10
    };
  }, [ocupacaoDiaria, filteredManutencoes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros de Período */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <Title>Linha do Tempo - Ocupação de Oficinas</Title>
          </div>
          <div className="flex gap-2">
            {(['30d', '90d', '6m', '1y'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodFilter(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  periodFilter === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period === '30d' && 'Últimos 30 dias'}
                {period === '90d' && 'Últimos 90 dias'}
                {period === '6m' && 'Últimos 6 meses'}
                {period === '1y' && 'Último ano'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* KPIs do Período */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="blue">
          <Text>Média de Ocupação</Text>
          <div className="flex items-baseline gap-2">
            <Metric>{kpis.mediaOcupacao}</Metric>
            <Text>veículos/dia</Text>
          </div>
        </Card>
        <Card decoration="top" decorationColor="orange">
          <Text>Pico de Ocupação</Text>
          <div className="flex items-baseline gap-2">
            <Metric>{kpis.picoOcupacao}</Metric>
            <Text>veículos</Text>
          </div>
        </Card>
        <Card decoration="top" decorationColor="cyan">
          <Text>Total de Veículos</Text>
          <div className="flex items-baseline gap-2">
            <Metric>{kpis.totalVeiculos}</Metric>
            <Text>únicos</Text>
          </div>
        </Card>
        <Card decoration="top" decorationColor="green">
          <Text>Tempo Médio</Text>
          <div className="flex items-baseline gap-2">
            <Metric>{kpis.tempoMedioManutencao}</Metric>
            <Text>dias</Text>
          </div>
        </Card>
      </div>

      {/* Gráfico de Ocupação Diária */}
      <Card>
        <Title>Veículos em Manutenção por Dia</Title>
        <Text className="mb-4">Clique em um ponto para ver detalhes do dia</Text>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart 
            data={ocupacaoDiaria}
            onClick={(e: any) => {
              if (e?.activePayload?.[0]) {
                setSelectedDay(e.activePayload[0].payload.date);
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id="colorQuantidade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="dataFormatada" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ value: 'Veículos', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px'
              }}
              formatter={(value: any, _name: any) => [value, 'Veículos em Manutenção']}
            />
            <Area
              type="monotone"
              dataKey="quantidade"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorQuantidade)"
              dot={{ fill: '#3b82f6', r: 3, cursor: 'pointer' }}
              activeDot={{ r: 6, cursor: 'pointer' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Detalhamento do Dia Selecionado */}
      {selectedDay && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Title>Detalhamento - {new Date(selectedDay).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}</Title>
              <Text className="mt-1">
                {manutencoesNoDia.length} {manutencoesNoDia.length === 1 ? 'veículo' : 'veículos'} em manutenção neste dia
              </Text>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Placa</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Modelo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fornecedor</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Data Entrada</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Dias até esta Data</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Custo</th>
                </tr>
              </thead>
              <tbody>
                {manutencoesNoDia.map((m: any, idx: number) => (
                  <tr 
                    key={`${m.Ocorrencia}-${idx}`}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.Placa || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{m.Modelo || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{m.Fornecedor || m.FornecedorOcorrencia || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(m.DataEntrada)}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge color={m.DiasParadoAteData > 10 ? 'red' : m.DiasParadoAteData > 5 ? 'yellow' : 'green'}>
                        {m.DiasParadoAteData} dias
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{m.TipoManutencao || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge color={
                        (m.SituacaoOcorrencia || m.StatusSimplificado || m.StatusOS || '').toLowerCase().includes('conclu') ? 'green' :
                        (m.SituacaoOcorrencia || m.StatusSimplificado || m.StatusOS || '').toLowerCase().includes('cancel') ? 'red' :
                        'amber'
                      }>
                        {m.SituacaoOcorrencia || m.StatusSimplificado || m.StatusOS || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {fmtBRL(m.CustoTotalOS || m.ValorTotal || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {manutencoesNoDia.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum veículo em manutenção neste dia
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
