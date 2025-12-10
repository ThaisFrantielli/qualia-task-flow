import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, DonutChart } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, TrendingUp, TrendingDown, DollarSign, Car, AlertTriangle } from 'lucide-react';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  if (typeof v === 'string') {
    const s = v.replace(/[R$\s.]/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function fmtCompact(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function getMonthKey(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return '';
  return dateString.split('T')[0].substring(0, 7);
}

function monthLabel(ym: string): string {
  if (!ym || ym.length < 7) return ym;
  const [y, m] = ym.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${months[Number(m) - 1]}/${String(y).slice(2)}`;
}

export default function ClientsDashboard(): JSX.Element {
  const { data: rawRentabilidade, loading: loadingRent } = useBIData<AnyObject[]>('dim_rentabilidade.json');
  const { data: rawChurn } = useBIData<AnyObject[]>('dim_churn.json');
  const { data: rawContratos } = useBIData<AnyObject[]>('dim_contratos.json');

  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const rentabilidade: AnyObject[] = useMemo(() => {
    if (Array.isArray(rawRentabilidade)) return rawRentabilidade;
    return (rawRentabilidade as any)?.data || [];
  }, [rawRentabilidade]);

  const churn: AnyObject[] = useMemo(() => {
    if (Array.isArray(rawChurn)) return rawChurn;
    return (rawChurn as any)?.data || [];
  }, [rawChurn]);

  const contratos: AnyObject[] = useMemo(() => {
    if (Array.isArray(rawContratos)) return rawContratos;
    return (rawContratos as any)?.data || [];
  }, [rawContratos]);

  // KPIs
  const kpis = useMemo(() => {
    const totalClientes = rentabilidade.length;
    const totalVeiculos = rentabilidade.reduce((s, r) => s + (r.QuantidadeVeiculos || 0), 0);
    const totalReceita = rentabilidade.reduce((s, r) => s + parseCurrency(r.FaturamentoTotal), 0);
    const avgVeiculosPorCliente = totalClientes > 0 ? totalVeiculos / totalClientes : 0;
    const avgReceitaPorCliente = totalClientes > 0 ? totalReceita / totalClientes : 0;

    // Churn calculation
    const encerramentos = churn.filter(c => c.TipoEvento === 'Encerrado').length;
    const iniciados = churn.filter(c => c.TipoEvento === 'Iniciado').length;
    const churnRate = iniciados > 0 ? (encerramentos / iniciados) * 100 : 0;

    return { totalClientes, totalVeiculos, totalReceita, avgVeiculosPorCliente, avgReceitaPorCliente, churnRate, encerramentos, iniciados };
  }, [rentabilidade, churn]);

  // Top 10 Clientes por Receita
  const topClientesByReceita = useMemo(() => {
    return [...rentabilidade]
      .sort((a, b) => parseCurrency(b.FaturamentoTotal) - parseCurrency(a.FaturamentoTotal))
      .slice(0, 10)
      .map(r => ({
        name: r.Cliente || 'Desconhecido',
        value: parseCurrency(r.FaturamentoTotal),
        veiculos: r.QuantidadeVeiculos || 0
      }));
  }, [rentabilidade]);

  // Top 10 Clientes por Rentabilidade
  const topClientesByRentabilidade = useMemo(() => {
    return [...rentabilidade]
      .filter(r => parseCurrency(r.Rentabilidade) !== 0)
      .sort((a, b) => parseCurrency(b.Rentabilidade) - parseCurrency(a.Rentabilidade))
      .slice(0, 10)
      .map(r => ({
        name: r.Cliente || 'Desconhecido',
        value: parseCurrency(r.Rentabilidade),
        receita: parseCurrency(r.FaturamentoTotal)
      }));
  }, [rentabilidade]);

  // Curva ABC
  const curvaABC = useMemo(() => {
    const sorted = [...rentabilidade].sort((a, b) => parseCurrency(b.FaturamentoTotal) - parseCurrency(a.FaturamentoTotal));
    const total = sorted.reduce((s, r) => s + parseCurrency(r.FaturamentoTotal), 0);
    
    let acumulado = 0;
    let a = 0, b = 0, c = 0;
    
    sorted.forEach(r => {
      acumulado += parseCurrency(r.FaturamentoTotal);
      const pct = (acumulado / total) * 100;
      if (pct <= 80) a++;
      else if (pct <= 95) b++;
      else c++;
    });

    return [
      { name: 'A (80%)', value: a, color: '#10b981' },
      { name: 'B (15%)', value: b, color: '#f59e0b' },
      { name: 'C (5%)', value: c, color: '#ef4444' }
    ];
  }, [rentabilidade]);

  // Evolução Churn (por mês)
  const churnEvolution = useMemo(() => {
    const map: Record<string, { iniciados: number; encerrados: number }> = {};
    
    churn.forEach(c => {
      const k = getMonthKey(c.DataEvento);
      if (!k) return;
      if (!map[k]) map[k] = { iniciados: 0, encerrados: 0 };
      if (c.TipoEvento === 'Iniciado') map[k].iniciados++;
      else if (c.TipoEvento === 'Encerrado') map[k].encerrados++;
    });

    return Object.keys(map).sort().slice(-12).map(k => ({
      mes: monthLabel(k),
      Iniciados: map[k].iniciados,
      Encerrados: map[k].encerrados,
      Saldo: map[k].iniciados - map[k].encerrados
    }));
  }, [churn]);

  // Detalhes do cliente selecionado
  const clienteDetail = useMemo((): AnyObject | null => {
    if (!selectedClient) return null;
    const cliente = rentabilidade.find((r: AnyObject) => r.Cliente === selectedClient);
    if (!cliente) return null;
    const contratosCliente = contratos.filter((c: AnyObject) => c.Cliente === selectedClient);
    return { ...cliente, contratosLista: contratosCliente };
  }, [selectedClient, rentabilidade, contratos]);

  if (loadingRent) {
    return (
      <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Carregando dados de clientes...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Title className="text-slate-900">Dashboard de Clientes</Title>
          <Text className="mt-1 text-slate-500">Análise de carteira, rentabilidade e churn</Text>
        </div>
        <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4" /> Hub Clientes
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card decoration="top" decorationColor="blue" className="bg-white shadow-sm">
          <Text className="text-slate-500">Clientes Ativos</Text>
          <Metric className="text-slate-900">{kpis.totalClientes}</Metric>
        </Card>
        <Card decoration="top" decorationColor="emerald" className="bg-white shadow-sm">
          <Text className="text-slate-500">Veículos Totais</Text>
          <Metric className="text-slate-900">{kpis.totalVeiculos.toLocaleString()}</Metric>
        </Card>
        <Card decoration="top" decorationColor="violet" className="bg-white shadow-sm">
          <Text className="text-slate-500">Receita Total</Text>
          <Metric className="text-slate-900">{fmtCompact(kpis.totalReceita)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="amber" className="bg-white shadow-sm">
          <Text className="text-slate-500">Veículos/Cliente</Text>
          <Metric className="text-slate-900">{kpis.avgVeiculosPorCliente.toFixed(1)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="cyan" className="bg-white shadow-sm">
          <Text className="text-slate-500">Receita/Cliente</Text>
          <Metric className="text-slate-900">{fmtCompact(kpis.avgReceitaPorCliente)}</Metric>
        </Card>
        <Card decoration="top" decorationColor="rose" className="bg-white shadow-sm">
          <Text className="text-slate-500">Churn Rate</Text>
          <Metric className={kpis.churnRate > 10 ? 'text-red-600' : 'text-slate-900'}>
            {kpis.churnRate.toFixed(1)}%
          </Metric>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Clientes Receita */}
        <Card className="bg-white shadow-sm">
          <Title className="text-slate-900">Top 10 por Receita</Title>
          <Text className="text-slate-500 text-sm mb-4">Clique para ver detalhes</Text>
          <div className="space-y-2">
            {topClientesByReceita.map((item, idx) => (
              <div
                key={idx}
                className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${
                  selectedClient === item.name ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelectedClient(selectedClient === item.name ? null : item.name)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 text-slate-600 rounded-full w-5 h-5 flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-slate-700 truncate max-w-[150px]">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-900">{fmtCompact(item.value)}</span>
                  <span className="text-xs text-slate-400 ml-2">{item.veiculos} veíc.</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Clientes Rentabilidade */}
        <Card className="bg-white shadow-sm">
          <Title className="text-slate-900">Top 10 por Rentabilidade</Title>
          <Text className="text-slate-500 text-sm mb-4">Margem líquida por cliente</Text>
          <div className="space-y-2">
            {topClientesByRentabilidade.map((item, idx) => (
              <div
                key={idx}
                className={`flex justify-between items-center p-2 rounded cursor-pointer transition-colors ${
                  selectedClient === item.name ? 'bg-emerald-100 border-l-4 border-emerald-500' : 'hover:bg-slate-50'
                }`}
                onClick={() => setSelectedClient(selectedClient === item.name ? null : item.name)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 text-slate-600 rounded-full w-5 h-5 flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm text-slate-700 truncate max-w-[150px]">{item.name}</span>
                </div>
                <span className={`text-sm font-medium ${item.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {fmtCompact(item.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Curva ABC */}
        <Card className="bg-white shadow-sm">
          <Title className="text-slate-900">Curva ABC de Clientes</Title>
          <Text className="text-slate-500 text-sm mb-4">Distribuição por faturamento</Text>
          <DonutChart
            className="h-52"
            data={curvaABC}
            category="value"
            index="name"
            colors={['emerald', 'amber', 'rose']}
            valueFormatter={(v) => `${v} clientes`}
          />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {curvaABC.map((item, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-50">
                <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
                <div className="text-xs text-slate-500">{item.name}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Churn Evolution */}
      <Card className="bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Title className="text-slate-900">Evolução de Contratos (Churn)</Title>
            <Text className="text-slate-500 text-sm">Novos vs Encerramentos - últimos 12 meses</Text>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-slate-600">Iniciados: {kpis.iniciados}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-sm text-slate-600">Encerrados: {kpis.encerramentos}</span>
            </div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={churnEvolution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="mes" fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
              <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#64748b" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="Iniciados" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Encerrados" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Cliente Detail Modal */}
      {clienteDetail && (
        <Card className="bg-white shadow-sm border-2 border-blue-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <Title className="text-slate-900">{clienteDetail.Cliente}</Title>
              <Text className="text-slate-500">Detalhes do cliente selecionado</Text>
            </div>
            <button
              onClick={() => setSelectedClient(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Car className="w-4 h-4" /> Veículos
              </div>
              <div className="text-xl font-bold text-slate-900">{clienteDetail.QuantidadeVeiculos || 0}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <DollarSign className="w-4 h-4" /> Faturamento
              </div>
              <div className="text-xl font-bold text-slate-900">{fmtCompact(parseCurrency(clienteDetail.FaturamentoTotal))}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <TrendingUp className="w-4 h-4" /> Rentabilidade
              </div>
              <div className={`text-xl font-bold ${parseCurrency(clienteDetail.Rentabilidade) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmtCompact(parseCurrency(clienteDetail.Rentabilidade))}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <AlertTriangle className="w-4 h-4" /> Custos Multas
              </div>
              <div className="text-xl font-bold text-amber-600">{fmtCompact(parseCurrency(clienteDetail.CustosMultas))}</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
