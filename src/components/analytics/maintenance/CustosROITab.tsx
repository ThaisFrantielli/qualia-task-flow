import { useMemo, useState } from 'react';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ScatterChart, Scatter, Cell, PieChart, Pie
} from 'recharts';
import { Download, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import useBIData from '@/hooks/useBIData';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';

type CustosDetalhados = {
  IdOrdemServico: number;
  OrdemServico: string;
  Ocorrencia: number;
  Placa: string;
  ModeloVeiculo: string;
  Fornecedor: string;
  Tipo: string;
  CustoPecas: number;
  CustoServicos: number;
  CustoOutros: number;
  CustoTotal: number;
  KmPercorrido: number;
  CustoPorKm: number;
  ValorReembolsavel: number;
  TaxaReembolso: number;
  DataServico: string;
};

type ManutencaoUnificado = {
  Ocorrencia: number;
  Placa: string;
  Modelo: string;
  CategoriaVeiculo: string;
  Fornecedor: string;
  TipoManutencao: string;
  CustoTotalOS: number;
  DataEntrada: string;
  KmPercorrido: number;
};

const CORES_CATEGORIA = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);
}

function getMonthKey(dateString: string): string {
  return dateString.split('T')[0].substring(0, 7);
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[Number(m) - 1]}/${String(y).slice(2)}`;
}

export default function CustosROITab() {
  const [periodo, setPeriodo] = useState<'3m' | '6m' | '12m' | 'all'>('6m');
  
  // Carregar dados
  const { data: custosDetalhados, loading } = useBIData<CustosDetalhados[]>('agg_custos_detalhados.json');
  const { data: manutencoes } = useBIData<ManutencaoUnificado[]>('fat_manutencao_unificado.json');
  const { filters } = useMaintenanceFilters();

  // Filtrar por período
  const dadosFiltrados = useMemo(() => {
    if (!custosDetalhados?.length) return [];

    const now = new Date();
    const mesesAtras = periodo === '3m' ? 3 : periodo === '6m' ? 6 : periodo === '12m' ? 12 : 999;
    const dataLimite = new Date(now.getFullYear(), now.getMonth() - mesesAtras, 1);

    return custosDetalhados.filter(c => {
      const dataServico = new Date(c.DataServico);
      if (dataServico < dataLimite && periodo !== 'all') return false;

      // Aplicar filtros globais
      if (filters.fornecedores?.length > 0 && !filters.fornecedores.includes(c.Fornecedor)) return false;
      if (filters.tiposOcorrencia?.length > 0 && !filters.tiposOcorrencia.includes(c.Tipo)) return false;

      return true;
    });
  }, [custosDetalhados, periodo, filters]);

  // KPIs principais
  const kpis = useMemo(() => {
    if (!dadosFiltrados.length) {
      return {
        custoPecas: 0,
        custoServicos: 0,
        custoTotal: 0,
        custoKmMedio: 0,
        taxaReembolsoMedia: 0,
        preventivaPct: 0,
        corretivaPct: 0,
      };
    }

    const custoPecas = dadosFiltrados.reduce((sum, c) => sum + (c.CustoPecas || 0), 0);
    const custoServicos = dadosFiltrados.reduce((sum, c) => sum + (c.CustoServicos || 0), 0);
    const custoTotal = dadosFiltrados.reduce((sum, c) => sum + (c.CustoTotal || 0), 0);
    
    const comKm = dadosFiltrados.filter(c => c.KmPercorrido > 0);
    const custoKmMedio = comKm.length > 0
      ? comKm.reduce((sum, c) => sum + c.CustoPorKm, 0) / comKm.length
      : 0;

    const taxaReembolsoMedia = dadosFiltrados.reduce((sum, c) => sum + c.TaxaReembolso, 0) / dadosFiltrados.length;

    const preventivas = dadosFiltrados.filter(c => c.Tipo?.toLowerCase().includes('preventiv')).length;
    const corretivas = dadosFiltrados.filter(c => c.Tipo?.toLowerCase().includes('corretiv')).length;
    const total = dadosFiltrados.length;

    return {
      custoPecas,
      custoServicos,
      custoTotal,
      custoKmMedio,
      taxaReembolsoMedia,
      preventivaPct: (preventivas / total) * 100,
      corretivaPct: (corretivas / total) * 100,
    };
  }, [dadosFiltrados]);

  // Evolução mensal (Stacked Bar Chart)
  const evolucaoMensal = useMemo(() => {
    if (!dadosFiltrados.length) return [];

    const porMes = dadosFiltrados.reduce((acc, c) => {
      const mes = getMonthKey(c.DataServico);
      if (!acc[mes]) {
        acc[mes] = { mes, pecas: 0, servicos: 0, outros: 0 };
      }
      acc[mes].pecas += c.CustoPecas || 0;
      acc[mes].servicos += c.CustoServicos || 0;
      acc[mes].outros += c.CustoOutros || 0;
      return acc;
    }, {} as Record<string, { mes: string; pecas: number; servicos: number; outros: number }>);

    return Object.values(porMes)
      .map(m => ({
        mes: monthLabel(m.mes),
        Peças: m.pecas,
        Serviços: m.servicos,
        Outros: m.outros,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [dadosFiltrados]);

  // Scatter Plot: KM × Custo
  const scatterData = useMemo(() => {
    if (!manutencoes?.length) return [];

    return manutencoes
      .filter(m => m.KmPercorrido > 0 && m.CustoTotalOS > 0)
      .map(m => ({
        x: m.KmPercorrido,
        y: m.CustoTotalOS,
        categoria: m.CategoriaVeiculo || 'Outros',
        placa: m.Placa,
      }))
      .slice(0, 200); // Limitar para performance
  }, [manutencoes]);

  // Categorias únicas para scatter
  const categorias = useMemo(() => {
    return Array.from(new Set(scatterData.map(d => d.categoria)));
  }, [scatterData]);

  // Ranking de fornecedores
  const rankingFornecedores = useMemo(() => {
    if (!dadosFiltrados.length) return [];

    const porFornecedor = dadosFiltrados.reduce((acc, c) => {
      const key = c.Fornecedor;
      if (!acc[key]) {
        acc[key] = {
          fornecedor: key,
          custoTotal: 0,
          totalOS: 0,
          taxaReembolsoMedia: 0,
          countReembolso: 0,
        };
      }
      acc[key].custoTotal += c.CustoTotal;
      acc[key].totalOS++;
      if (c.TaxaReembolso > 0) {
        acc[key].taxaReembolsoMedia += c.TaxaReembolso;
        acc[key].countReembolso++;
      }
      return acc;
    }, {} as Record<string, { fornecedor: string; custoTotal: number; totalOS: number; taxaReembolsoMedia: number; countReembolso: number }>);

    return Object.values(porFornecedor)
      .map(f => ({
        fornecedor: f.fornecedor,
        custoTotal: f.custoTotal,
        ticketMedio: f.custoTotal / f.totalOS,
        totalOS: f.totalOS,
        taxaReembolso: f.countReembolso > 0 ? f.taxaReembolsoMedia / f.countReembolso : 0,
      }))
      .sort((a, b) => b.custoTotal - a.custoTotal)
      .slice(0, 10);
  }, [dadosFiltrados]);

  // Top 20 OS mais caras
  const top20OSCaras = useMemo(() => {
    return [...dadosFiltrados]
      .sort((a, b) => b.CustoTotal - a.CustoTotal)
      .slice(0, 20);
  }, [dadosFiltrados]);

  // Exportar para Excel
  const exportarExcel = () => {
    const headers = ['OS', 'Placa', 'Modelo', 'Fornecedor', 'Peças', 'Serviços', 'Total', 'KM', 'Custo/KM', 'Tipo'];
    const rows = top20OSCaras.map(os => [
      os.OrdemServico,
      os.Placa,
      os.ModeloVeiculo,
      os.Fornecedor,
      fmtBRL(os.CustoPecas),
      fmtBRL(os.CustoServicos),
      fmtBRL(os.CustoTotal),
      os.KmPercorrido,
      os.KmPercorrido > 0 ? fmtBRL(os.CustoPorKm) : '-',
      os.Tipo,
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `custos_manutencao_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Text>Carregando análise financeira...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <div className="flex items-center justify-between">
        <div>
          <Title>Custos & ROI - Análise Financeira</Title>
          <Text>Análise detalhada de custos por categoria e fornecedor</Text>
        </div>
        <div className="flex gap-3">
          {/* Filtro de Período */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            {[
              { value: '3m', label: '3M' },
              { value: '6m', label: '6M' },
              { value: '12m', label: '12M' },
              { value: 'all', label: 'Tudo' },
            ].map(p => (
              <button
                key={p.value}
                onClick={() => setPeriodo(p.value as any)}
                className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                  periodo === p.value
                    ? 'bg-white shadow text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportarExcel}
            className="bg-green-100 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-200 transition-all"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* KPIs Principais */}
      <TooltipProvider>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card decoration="top" decorationColor="blue">
            <div className="flex items-center gap-1">
              <Text>Custo Peças</Text>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold">Custo Total de Peças</p>
                  <p className="text-xs mt-1">Soma de todos os gastos com peças de reposição.</p>
                  <p className="text-xs mt-1 font-mono">Fórmula: SUM(CustoPecas)</p>
                  <p className="text-xs mt-1 text-amber-600">Objetivo: Monitorar investimento em componentes</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Metric>{fmtBRL(kpis.custoPecas)}</Metric>
          <Text className="text-xs text-gray-500 mt-1">
            {fmtNum((kpis.custoPecas / kpis.custoTotal) * 100)}% do total
          </Text>
        </Card>

        <Card decoration="top" decorationColor="green">
          <div className="flex items-center gap-1">
            <Text>Custo Serviços</Text>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Custo Total de Mão de Obra</p>
                <p className="text-xs mt-1">Soma de todos os valores gastos com serviços de mão de obra (mecânicos, técnicos, etc) nas ordens de serviço.</p>
                <p className="text-xs mt-1 font-mono">Cálculo: Custo de Serviços de todas as OS</p>
                <p className="text-xs mt-1 text-amber-600">Objetivo: Saber quanto está sendo gasto com trabalho das oficinas além das peças</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Metric>{fmtBRL(kpis.custoServicos)}</Metric>
          <Text className="text-xs text-gray-500 mt-1">
            {fmtNum((kpis.custoServicos / kpis.custoTotal) * 100)}% do total
          </Text>
        </Card>

        <Card decoration="top" decorationColor="amber">
          <div className="flex items-center gap-1">
            <Text>Custo/KM Médio</Text>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Custo Médio por Quilômetro</p>
                <p className="text-xs mt-1">Quanto está sendo gasto em manutenção para cada quilômetro que os veículos rodam. Serve para comparar eficiência de modelos.</p>
                <p className="text-xs mt-1 font-mono">Cálculo: Custo Total de Manutenção ÷ KM Rodados</p>
                <p className="text-xs mt-1 text-amber-600">Objetivo: Saber o custo real de manutenção por uso do veículo</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Metric>{fmtBRL(kpis.custoKmMedio)}</Metric>
          <Text className="text-xs text-gray-500 mt-1">Por quilômetro rodado</Text>
        </Card>

        <Card decoration="top" decorationColor="purple">
          <div className="flex items-center gap-1">
            <Text>Taxa Reembolso Média</Text>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold">Percentual Médio de Reembolso</p>
                <p className="text-xs mt-1">Quanto em média a empresa consegue recuperar dos clientes do valor gasto em manutenção. Exemplo: 80% significa que para cada R$ 100 gastos, R$ 80 são reembolsados.</p>
                <p className="text-xs mt-1 font-mono">Cálculo: (Valor Reembolsável ÷ Custo Total) × 100</p>
                <p className="text-xs mt-1 text-amber-600">Objetivo: Monitorar quanto do custo está sendo recuperado dos contratos</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Metric>{fmtNum(kpis.taxaReembolsoMedia)}%</Metric>
          <Text className="text-xs text-gray-500 mt-1">Reembolso/Total</Text>
        </Card>
      </div>
      </TooltipProvider>

      {/* Row 1: Evolução Mensal + Distribuição Preventiva/Corretiva */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolução Mensal - Stacked Bar */}
        <Card className="lg:col-span-2">
          <Title>Evolução de Custos por Categoria</Title>
          <Text className="mb-4">Distribuição mensal de peças, serviços e outros</Text>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={evolucaoMensal}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" fontSize={11} />
              <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} fontSize={11} />
              <RechartsTooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend />
              <Bar dataKey="Peças" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Serviços" stackId="a" fill="#10b981" />
              <Bar dataKey="Outros" stackId="a" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribuição Preventiva vs Corretiva */}
        <Card>
          <Title>Preventiva vs Corretiva</Title>
          <Text className="mb-4">Distribuição por tipo de manutenção</Text>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Preventiva', value: kpis.preventivaPct, color: '#10b981' },
                  { name: 'Corretiva', value: kpis.corretivaPct, color: '#ef4444' },
                ]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${fmtNum(value)}%`}
              >
                {[{ color: '#10b981' }, { color: '#ef4444' }].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(v: number) => `${fmtNum(v)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row 2: Scatter Plot KM × Custo */}
      <Card>
        <Title>Análise KM Percorrido × Custo Total</Title>
        <Text className="mb-4">Identificação de outliers e padrões por categoria de veículo</Text>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="KM Percorrido"
              label={{ value: 'KM Percorrido', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Custo Total"
              tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
              label={{ value: 'Custo Total (R$)', angle: -90, position: 'insideLeft' }}
            />
            <RechartsTooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <Text className="font-bold">{data.placa}</Text>
                    <Text className="text-xs">Categoria: {data.categoria}</Text>
                    <Text className="text-xs">KM: {fmtNum(data.x)}</Text>
                    <Text className="text-xs">Custo: {fmtBRL(data.y)}</Text>
                  </div>
                );
              }}
            />
            <Legend />
            {categorias.map((cat, idx) => (
              <Scatter
                key={cat}
                name={cat}
                data={scatterData.filter(d => d.categoria === cat)}
                fill={CORES_CATEGORIA[idx % CORES_CATEGORIA.length]}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      {/* Row 3: Ranking Fornecedores */}
      <Card>
        <Title>Ranking de Fornecedores - Top 10</Title>
        <Text className="mb-4">Custo total, ticket médio e taxa de reembolso</Text>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Fornecedor</th>
                <th className="p-2 text-right">Custo Total</th>
                <th className="p-2 text-right">Ticket Médio</th>
                <th className="p-2 text-center">Total OS</th>
                <th className="p-2 text-right">Taxa Reembolso</th>
              </tr>
            </thead>
            <tbody>
              {rankingFornecedores.map((f, idx) => (
                <tr key={f.fornecedor} className="border-t hover:bg-gray-50">
                  <td className="p-2 text-gray-500">{idx + 1}</td>
                  <td className="p-2 font-medium">{f.fornecedor}</td>
                  <td className="p-2 text-right font-bold text-blue-600">
                    {fmtBRL(f.custoTotal)}
                  </td>
                  <td className="p-2 text-right">{fmtBRL(f.ticketMedio)}</td>
                  <td className="p-2 text-center">
                    <Badge color="gray" size="sm">{f.totalOS}</Badge>
                  </td>
                  <td className="p-2 text-right">
                    {f.taxaReembolso > 0 ? `${fmtNum(f.taxaReembolso)}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Row 4: Top 20 OS Mais Caras */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <Title>Top 20 OS Mais Caras - Drill-down Detalhado</Title>
          <Badge color="blue" size="lg">{top20OSCaras.length} OS</Badge>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 text-left">OS</th>
                <th className="p-2 text-left">Placa</th>
                <th className="p-2 text-left">Modelo</th>
                <th className="p-2 text-left">Fornecedor</th>
                <th className="p-2 text-right">Peças</th>
                <th className="p-2 text-right">Serviços</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-right">KM</th>
                <th className="p-2 text-right">Custo/KM</th>
                <th className="p-2 text-left">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {top20OSCaras.map(os => (
                <tr key={os.IdOrdemServico} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-mono text-blue-600">{os.OrdemServico}</td>
                  <td className="p-2 font-medium">{os.Placa}</td>
                  <td className="p-2 text-gray-600">{os.ModeloVeiculo}</td>
                  <td className="p-2 text-xs">{os.Fornecedor}</td>
                  <td className="p-2 text-right">{fmtBRL(os.CustoPecas)}</td>
                  <td className="p-2 text-right">{fmtBRL(os.CustoServicos)}</td>
                  <td className="p-2 text-right font-bold text-red-600">
                    {fmtBRL(os.CustoTotal)}
                  </td>
                  <td className="p-2 text-right text-gray-500">
                    {os.KmPercorrido > 0 ? fmtNum(os.KmPercorrido) : '-'}
                  </td>
                  <td className="p-2 text-right">
                    {os.KmPercorrido > 0 ? fmtBRL(os.CustoPorKm) : '-'}
                  </td>
                  <td className="p-2">
                    <Badge
                      color={os.Tipo?.toLowerCase().includes('preventiv') ? 'green' : 'red'}
                      size="xs"
                    >
                      {os.Tipo}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 font-bold sticky bottom-0">
              <tr>
                <td colSpan={4} className="p-2 text-right">TOTAL:</td>
                <td className="p-2 text-right">
                  {fmtBRL(top20OSCaras.reduce((sum, os) => sum + os.CustoPecas, 0))}
                </td>
                <td className="p-2 text-right">
                  {fmtBRL(top20OSCaras.reduce((sum, os) => sum + os.CustoServicos, 0))}
                </td>
                <td className="p-2 text-right text-red-600">
                  {fmtBRL(top20OSCaras.reduce((sum, os) => sum + os.CustoTotal, 0))}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
