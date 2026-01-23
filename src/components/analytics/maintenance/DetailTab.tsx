import { useMemo, useState } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Clock, TrendingUp, AlertCircle, Filter } from 'lucide-react';
import useBIData from '@/hooks/useBIData';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';

type ManutencaoUnificado = {
  Ocorrencia: number;
  Placa: string;
  Modelo: string;
  Fornecedor: string;
  FornecedorOcorrencia?: string;
  Cliente: string;
  DataEntrada: string;
  DataSaida?: string;
  DataConclusaoOcorrencia?: string;
  LeadTimeTotalDias: number;
  DiasParado?: number;
  StatusOS: string; // Compatibilidade
  SituacaoOcorrencia?: string; // Novo campo
  StatusSimplificado?: string; // Novo campo
  SituacaoOrdemServico?: string;
  TipoManutencao: string;
  TipoOcorrencia?: string; // Compatibilidade
  Tipo?: string; // Novo campo
  IdTipo?: number; // Novo campo
  CustoTotalOS: number;
  ValorTotal?: number;
  Odometro?: number;
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

export default function DetailTab() {
  const { data: manutencoes, loading } = useBIData<ManutencaoUnificado[]>('fat_manutencao_unificado.json');
  const { filters: globalFilters } = useMaintenanceFilters();
  
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [tipoFilter, setTipoFilter] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [custoFilter, setCustoFilter] = useState<string>('Todos');
  const [leadTimeFilter, setLeadTimeFilter] = useState<string>('Todos');

  // Aplicar filtros globais
  const filteredManutencoes = useMemo(() => {
    if (!manutencoes?.length) return [];
    
    return manutencoes.filter((m: ManutencaoUnificado) => {
      // Filtro de data range
      if (globalFilters.dateRange?.from && m.DataEntrada) {
        const dataEntrada = new Date(m.DataEntrada);
        if (dataEntrada < new Date(globalFilters.dateRange.from)) return false;
      }
      if (globalFilters.dateRange?.to && m.DataEntrada) {
        const dataEntrada = new Date(m.DataEntrada);
        if (dataEntrada > new Date(globalFilters.dateRange.to)) return false;
      }
      
      // Filtros globais
      if (globalFilters.fornecedores?.length && m.Fornecedor) {
        if (!globalFilters.fornecedores.includes(m.Fornecedor) && 
            !globalFilters.fornecedores.includes(m.FornecedorOcorrencia || '')) {
          return false;
        }
      }
      
      if (globalFilters.modelos?.length && m.Modelo) {
        if (!globalFilters.modelos.includes(m.Modelo)) return false;
      }
      
      if (globalFilters.placas?.length && m.Placa) {
        if (!globalFilters.placas.includes(m.Placa)) return false;
      }
      
      if (globalFilters.tiposOcorrencia?.length) {
        const tipo = m.Tipo || m.TipoOcorrencia;
        if (tipo && !globalFilters.tiposOcorrencia.includes(tipo)) return false;
      }
      
      if (globalFilters.status?.length) {
        const status = m.SituacaoOcorrencia || m.StatusSimplificado || m.StatusOS || m.SituacaoOrdemServico || '';
        if (!globalFilters.status.includes(status)) return false;
      }
      
      // Filtros rápidos
      if (tipoFilter !== 'Todos' && m.TipoManutencao !== tipoFilter) return false;
      
      if (statusFilter !== 'Todos') {
        const status = m.SituacaoOcorrencia || m.StatusSimplificado || m.StatusOS || m.SituacaoOrdemServico || '';
        const isAberta = !status.toLowerCase().includes('conclu') && !status.toLowerCase().includes('cancel');
        if (statusFilter === 'Aberta' && !isAberta) return false;
        if (statusFilter === 'Concluída' && status.toLowerCase() !== 'concluída' && !status.toLowerCase().includes('conclu')) return false;
        if (statusFilter === 'Cancelada' && !status.toLowerCase().includes('cancel')) return false;
      }
      
      const custo = m.CustoTotalOS || m.ValorTotal || 0;
      if (custoFilter === '<R$500' && custo >= 500) return false;
      if (custoFilter === 'R$500-1k' && (custo < 500 || custo >= 1000)) return false;
      if (custoFilter === 'R$1k-3k' && (custo < 1000 || custo >= 3000)) return false;
      if (custoFilter === '>R$3k' && custo < 3000) return false;
      
      const leadTime = m.LeadTimeTotalDias || m.DiasParado || 0;
      if (leadTimeFilter === '<3d' && leadTime >= 3) return false;
      if (leadTimeFilter === '3-7d' && (leadTime < 3 || leadTime >= 7)) return false;
      if (leadTimeFilter === '7-15d' && (leadTime < 7 || leadTime >= 15)) return false;
      if (leadTimeFilter === '>15d' && leadTime < 15) return false;
      
      return true;
    });
  }, [manutencoes, globalFilters, tipoFilter, statusFilter, custoFilter, leadTimeFilter]);

  // KPIs de resumo
  const kpis = useMemo(() => {
    if (!filteredManutencoes.length) {
      return {
        totalOS: 0,
        custoMedio: 0,
        leadTimeMedio: 0,
        custoTotal: 0
      };
    }
    
    const custoTotal = filteredManutencoes.reduce((sum, m) => sum + (m.CustoTotalOS || m.ValorTotal || 0), 0);
    const custoMedio = custoTotal / filteredManutencoes.length;
    
    const comLeadTime = filteredManutencoes.filter(m => (m.LeadTimeTotalDias || m.DiasParado || 0) > 0);
    const leadTimeMedio = comLeadTime.reduce((sum, m) => sum + (m.LeadTimeTotalDias || m.DiasParado || 0), 0) / (comLeadTime.length || 1);
    
    return {
      totalOS: filteredManutencoes.length,
      custoMedio: Math.round(custoMedio),
      leadTimeMedio: Math.round(leadTimeMedio * 10) / 10,
      custoTotal
    };
  }, [filteredManutencoes]);

  // Evolução temporal (agrupado por mês)
  const evolucaoTemporal = useMemo(() => {
    if (!filteredManutencoes.length) return [];
    
    const porMes = new Map<string, { os: number; custo: number }>();
    
    filteredManutencoes.forEach((m: ManutencaoUnificado) => {
      if (!m.DataEntrada) return;
      
      const mes = m.DataEntrada.substring(0, 7); // YYYY-MM
      const atual = porMes.get(mes) || { os: 0, custo: 0 };
      
      porMes.set(mes, {
        os: atual.os + 1,
        custo: atual.custo + (m.CustoTotalOS || m.ValorTotal || 0)
      });
    });
    
    return Array.from(porMes.entries())
      .map(([mes, dados]) => ({
        mes,
        mesFormatado: new Date(mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        osAbertas: dados.os,
        custoTotal: Math.round(dados.custo)
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12); // Últimos 12 meses
  }, [filteredManutencoes]);

  // Distribuição por fornecedor (top 10)
  const porFornecedor = useMemo(() => {
    if (!filteredManutencoes.length) return [];
    
    const map = new Map<string, number>();
    
    filteredManutencoes.forEach((m: ManutencaoUnificado) => {
      const fornecedor = m.Fornecedor || m.FornecedorOcorrencia || 'N/D';
      map.set(fornecedor, (map.get(fornecedor) || 0) + 1);
    });
    
    return Array.from(map.entries())
      .map(([fornecedor, quantidade]) => ({ fornecedor, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [filteredManutencoes]);

  // Distribuição por tipo
  const porTipo = useMemo(() => {
    if (!filteredManutencoes.length) return [];
    
    const map = new Map<string, number>();
    
    filteredManutencoes.forEach((m: ManutencaoUnificado) => {
      const tipo = m.TipoManutencao || 'Outros';
      map.set(tipo, (map.get(tipo) || 0) + 1);
    });
    
    return Array.from(map.entries())
      .map(([tipo, quantidade]) => ({ tipo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredManutencoes]);

  // Distribuição por modelo (top 10)
  const porModelo = useMemo(() => {
    if (!filteredManutencoes.length) return [];
    
    const map = new Map<string, number>();
    
    filteredManutencoes.forEach((m: ManutencaoUnificado) => {
      const modelo = m.Modelo || 'N/D';
      map.set(modelo, (map.get(modelo) || 0) + 1);
    });
    
    return Array.from(map.entries())
      .map(([modelo, quantidade]) => ({ modelo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [filteredManutencoes]);

  const pageItems = useMemo(() => 
    filteredManutencoes.slice(page * pageSize, (page + 1) * pageSize), 
    [filteredManutencoes, page]
  );
  
  const totalPages = Math.ceil(filteredManutencoes.length / pageSize);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="blue">
          <div className="flex items-center justify-between">
            <div>
              <Text>Total de OS</Text>
              <Metric>{kpis.totalOS}</Metric>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
        
        <Card decoration="top" decorationColor="green">
          <div className="flex items-center justify-between">
            <div>
              <Text>Custo Médio</Text>
              <Metric>{fmtBRL(kpis.custoMedio)}</Metric>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        
        <Card decoration="top" decorationColor="orange">
          <div className="flex items-center justify-between">
            <div>
              <Text>Lead Time Médio</Text>
              <Metric>{kpis.leadTimeMedio} dias</Metric>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
        
        <Card decoration="top" decorationColor="purple">
          <div className="flex items-center justify-between">
            <div>
              <Text>Custo Total</Text>
              <Metric>{fmtBRL(kpis.custoTotal)}</Metric>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros Rápidos */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <Title>Filtros Rápidos</Title>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Tipo Manutenção */}
          <div>
            <Text className="mb-2">Tipo Manutenção</Text>
            <select 
              value={tipoFilter} 
              onChange={(e) => { setTipoFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Todos">Todos</option>
              <option value="Preventiva">Preventiva</option>
              <option value="Corretiva">Corretiva</option>
              <option value="Preditiva">Preditiva</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
          
          {/* Status OS */}
          <div>
            <Text className="mb-2">Status OS</Text>
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Todos">Todos</option>
              <option value="Aberta">Aberta</option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
          
          {/* Faixa de Custo */}
          <div>
            <Text className="mb-2">Faixa de Custo</Text>
            <select 
              value={custoFilter} 
              onChange={(e) => { setCustoFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Todos">Todos</option>
              <option value="<R$500">&lt; R$ 500</option>
              <option value="R$500-1k">R$ 500 - 1k</option>
              <option value="R$1k-3k">R$ 1k - 3k</option>
              <option value=">R$3k">&gt; R$ 3k</option>
            </select>
          </div>
          
          {/* Faixa de Lead Time */}
          <div>
            <Text className="mb-2">Faixa de Lead Time</Text>
            <select 
              value={leadTimeFilter} 
              onChange={(e) => { setLeadTimeFilter(e.target.value); setPage(0); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Todos">Todos</option>
              <option value="<3d">&lt; 3 dias</option>
              <option value="3-7d">3-7 dias</option>
              <option value="7-15d">7-15 dias</option>
              <option value=">15d">&gt; 15 dias</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Gráfico de Evolução Temporal */}
      <Card>
        <Title>Evolução Mensal de OS e Custos</Title>
        <Text className="mb-4">Últimos 12 meses</Text>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={evolucaoTemporal}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mesFormatado" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px'
              }}
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="osAbertas" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="OS Abertas"
              dot={{ fill: '#3b82f6', r: 4 }}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="custoTotal" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Custo Total (R$)"
              dot={{ fill: '#10b981', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Distribuições */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Por Fornecedor */}
        <Card>
          <Title>Top 10 Fornecedores</Title>
          <Text className="mb-4">Por volume de OS</Text>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={porFornecedor} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="fornecedor" type="category" width={120} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="quantidade" name="OS">
                {porFornecedor.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Por Tipo */}
        <Card>
          <Title>Distribuição por Tipo</Title>
          <Text className="mb-4">Preventiva vs Corretiva</Text>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={porTipo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="quantidade" name="OS">
                {porTipo.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Por Modelo */}
        <Card className="md:col-span-2">
          <Title>Top 10 Modelos com Mais Manutenções</Title>
          <Text className="mb-4">Identifique os veículos que mais demandam manutenção</Text>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={porModelo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="modelo" type="category" width={150} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="quantidade" name="OS">
                {porModelo.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <Title>Detalhamento de OS</Title>
          <Text className="text-gray-500">{filteredManutencoes.length} registros</Text>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Data Entrada</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Placa</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Modelo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fornecedor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Lead Time</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Custo</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((m: ManutencaoUnificado, idx: number) => {
                const leadTime = m.LeadTimeTotalDias || m.DiasParado || 0;
                const custo = m.CustoTotalOS || m.ValorTotal || 0;
                const status = m.SituacaoOcorrencia || m.StatusSimplificado || m.StatusOS || m.SituacaoOrdemServico || '';
                
                return (
                  <tr 
                    key={`${m.Ocorrencia}-${idx}`}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700">{fmtDate(m.DataEntrada)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.Placa || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{m.Modelo || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{m.Fornecedor || m.FornecedorOcorrencia || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge color={
                        m.TipoManutencao === 'Preventiva' ? 'green' :
                        m.TipoManutencao === 'Corretiva' ? 'orange' :
                        m.TipoManutencao === 'Preditiva' ? 'blue' :
                        'gray'
                      }>
                        {m.TipoManutencao || 'Outros'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge color={
                        status.toLowerCase().includes('conclu') ? 'green' :
                        status.toLowerCase().includes('cancel') ? 'red' :
                        'yellow'
                      }>
                        {status || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <Badge color={
                        leadTime > 15 ? 'red' :
                        leadTime > 7 ? 'orange' :
                        leadTime > 3 ? 'yellow' :
                        'green'
                      }>
                        {leadTime} dias
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {fmtBRL(custo)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredManutencoes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum registro encontrado com os filtros aplicados
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Text className="text-gray-500">
              Página {page + 1} de {totalPages} • {filteredManutencoes.length} registros
            </Text>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
