import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, Badge } from '@tremor/react';
import { 
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { Users, Building2, Car, TrendingUp, Wallet, Wrench, Download, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type AnyObject = { [k: string]: any };

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtCompact(v: number): string {
  if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function getMonthKey(dateString?: string): string {
  if (!dateString) return '';
  return dateString.split('T')[0].substring(0, 7);
}

function monthLabel(ym: string): string {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[Number(m) - 1]}/${String(y).slice(2)}`;
}

export default function CustomerAnalytics(): JSX.Element {
  const { data: clientesData, loading: loadingClientes } = useBIData<AnyObject[]>('dim_clientes.json');
  const { data: faturamentoData, loading: loadingFat } = useBIData<AnyObject[]>('fat_faturamento_*.json');
  const { data: contratosData } = useBIData<AnyObject[]>('dim_contratos.json');
  const { data: manutencaoData } = useBIData<AnyObject[]>('fat_manutencao_os_*.json');
  const { data: sinistrosData } = useBIData<AnyObject[]>('fat_sinistros_*.json');
  const { data: multasData } = useBIData<AnyObject[]>('fat_multas_*.json');
  useMemo(() => Array.isArray(clientesData) ? clientesData : [], [clientesData]);
  const faturamento = useMemo(() => Array.isArray(faturamentoData) ? faturamentoData : [], [faturamentoData]);
  const contratos = useMemo(() => Array.isArray(contratosData) ? contratosData : [], [contratosData]);
  const manutencao = useMemo(() => Array.isArray(manutencaoData) ? manutencaoData : [], [manutencaoData]);
  const sinistros = useMemo(() => Array.isArray(sinistrosData) ? sinistrosData : [], [sinistrosData]);
  const multas = useMemo(() => Array.isArray(multasData) ? multasData : [], [multasData]);

  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Get unique clients from faturamento
  const clientesList = useMemo(() => {
    const set = new Set<string>();
    faturamento.forEach(f => {
      if (f.Cliente) set.add(f.Cliente);
    });
    contratos.forEach(c => {
      if (c.Cliente) set.add(c.Cliente);
    });
    return Array.from(set).sort();
  }, [faturamento, contratos]);

  const filteredClientes = useMemo(() => {
    if (!searchTerm) return clientesList.slice(0, 50);
    const term = searchTerm.toLowerCase();
    return clientesList.filter(c => c.toLowerCase().includes(term)).slice(0, 50);
  }, [clientesList, searchTerm]);

  // Filter all data by selected client
  const clienteData = useMemo(() => {
    if (!selectedCliente) return null;

    const fatCliente = faturamento.filter(f => f.Cliente === selectedCliente);
    const contratosCliente = contratos.filter(c => c.Cliente === selectedCliente);
    const placasCliente = new Set(contratosCliente.map(c => c.Placa));
    
    const manCliente = manutencao.filter(m => placasCliente.has(m.Placa));
    const sinCliente = sinistros.filter(s => placasCliente.has(s.Placa));
    const mulCliente = multas.filter(m => placasCliente.has(m.Placa));

    // KPIs
    const totalFaturamento = fatCliente.reduce((s, f) => s + (f.ValorTotal || 0), 0);
    const contratosAtivos = contratosCliente.filter(c => c.Status === 'Ativo').length;
    const veiculosLocados = placasCliente.size;
    const ticketMedio = fatCliente.length > 0 ? totalFaturamento / fatCliente.length : 0;
    const custoManutencao = manCliente.reduce((s, m) => s + (m.ValorTotal || 0), 0);
    const custoSinistros = sinCliente.reduce((s, si) => s + (si.ValorSinistro || 0), 0);
    const custoMultas = mulCliente.reduce((s, mu) => s + (mu.ValorMulta || 0), 0);
    const custoTotal = custoManutencao + custoSinistros + custoMultas;
    const percentualCusto = totalFaturamento > 0 ? (custoTotal / totalFaturamento) * 100 : 0;

    // Monthly evolution
    const monthlyMap: Record<string, { receita: number; custo: number }> = {};
    fatCliente.forEach(f => {
      const k = getMonthKey(f.DataEmissao);
      if (!k) return;
      if (!monthlyMap[k]) monthlyMap[k] = { receita: 0, custo: 0 };
      monthlyMap[k].receita += f.ValorTotal || 0;
    });
    manCliente.forEach(m => {
      const k = getMonthKey(m.DataEntrada);
      if (!k) return;
      if (!monthlyMap[k]) monthlyMap[k] = { receita: 0, custo: 0 };
      monthlyMap[k].custo += m.ValorTotal || 0;
    });
    
    const monthlyData = Object.keys(monthlyMap)
      .sort()
      .slice(-12)
      .map(k => ({
        month: k,
        label: monthLabel(k),
        Receita: monthlyMap[k].receita,
        Custo: monthlyMap[k].custo,
        Margem: monthlyMap[k].receita - monthlyMap[k].custo,
      }));

    // Cost distribution
    const custoDistribuicao = [
      { name: 'Manutenção', value: custoManutencao, color: '#f59e0b' },
      { name: 'Sinistros', value: custoSinistros, color: '#ef4444' },
      { name: 'Multas', value: custoMultas, color: '#8b5cf6' },
    ].filter(d => d.value > 0);

    // Vehicles table
    const veiculosTable = contratosCliente.map(c => {
      const placa = c.Placa;
      const manVeiculo = manCliente.filter(m => m.Placa === placa);
      const custoMan = manVeiculo.reduce((s, m) => s + (m.ValorTotal || 0), 0);
      
      return {
        placa,
        status: c.Status,
        valorMensal: c.ValorMensal || 0,
        custoManutencao: custoMan,
        margem: (c.ValorMensal || 0) - custoMan,
        vencimento: c.FimContrato,
      };
    });

    return {
      nome: selectedCliente,
      totalFaturamento,
      contratosAtivos,
      veiculosLocados,
      ticketMedio,
      custoTotal,
      percentualCusto,
      monthlyData,
      custoDistribuicao,
      veiculosTable,
      custoManutencao,
      custoSinistros,
      custoMultas,
    };
  }, [selectedCliente, faturamento, contratos, manutencao, sinistros, multas]);

  const loading = loadingClientes || loadingFat;

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen p-6 flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Building2 className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <Title className="text-slate-900">Análise por Cliente</Title>
            <Text className="text-slate-500">Visão detalhada de faturamento, custos e veículos</Text>
          </div>
        </div>
        <Badge color="amber" className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {clientesList.length} clientes
        </Badge>
      </div>

      {/* Client Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <Text className="mb-2 font-medium">Selecione um Cliente</Text>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Buscar cliente..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 mb-2"
              />
            </div>
            <Select value={selectedCliente} onValueChange={setSelectedCliente}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha um cliente para analisar" />
              </SelectTrigger>
              <SelectContent>
                {filteredClientes.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {!selectedCliente && (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <Title className="text-slate-400">Selecione um cliente</Title>
          <Text className="text-slate-400">Escolha um cliente acima para visualizar sua análise detalhada</Text>
        </Card>
      )}

      {clienteData && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card decoration="top" decorationColor="blue">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                <Text>Faturamento Total</Text>
              </div>
              <Metric className="text-blue-600">{fmtCompact(clienteData.totalFaturamento)}</Metric>
            </Card>
            
            <Card decoration="top" decorationColor="emerald">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <Text>Contratos Ativos</Text>
              </div>
              <Metric className="text-emerald-600">{clienteData.contratosAtivos}</Metric>
            </Card>
            
            <Card decoration="top" decorationColor="violet">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-violet-600" />
                <Text>Veículos</Text>
              </div>
              <Metric className="text-violet-600">{clienteData.veiculosLocados}</Metric>
            </Card>
            
            <Card decoration="top" decorationColor="amber">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-600" />
                <Text>Custo Total</Text>
              </div>
              <Metric className="text-amber-600">{fmtCompact(clienteData.custoTotal)}</Metric>
            </Card>
            
            <Card decoration="top" decorationColor={clienteData.percentualCusto > 20 ? 'rose' : clienteData.percentualCusto > 12 ? 'amber' : 'emerald'}>
              <Text>% Custo/Receita</Text>
              <Metric className={
                clienteData.percentualCusto > 20 ? 'text-rose-600' : 
                clienteData.percentualCusto > 12 ? 'text-amber-600' : 'text-emerald-600'
              }>
                {clienteData.percentualCusto.toFixed(1)}%
              </Metric>
            </Card>
            
            <Card decoration="top" decorationColor="indigo">
              <Text>Ticket Médio</Text>
              <Metric className="text-indigo-600">{fmtBRL(clienteData.ticketMedio)}</Metric>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <Title>Evolução Mensal</Title>
              <Text className="text-slate-500 mb-4">Receita vs Custo nos últimos 12 meses</Text>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={clienteData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={fmtCompact} />
                    <Tooltip formatter={(v: any, name: string) => [fmtBRL(v), name]} />
                    <Legend />
                    <Bar dataKey="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Custo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Margem" stroke="#10b981" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title>Distribuição de Custos</Title>
              <Text className="text-slate-500 mb-4">Manutenção, Sinistros e Multas</Text>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={clienteData.custoDistribuicao} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={100} 
                      paddingAngle={3} 
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {clienteData.custoDistribuicao.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={fmtBRL} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500" />
                    Manutenção
                  </span>
                  <span className="font-medium">{fmtBRL(clienteData.custoManutencao)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-rose-500" />
                    Sinistros
                  </span>
                  <span className="font-medium">{fmtBRL(clienteData.custoSinistros)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-violet-500" />
                    Multas
                  </span>
                  <span className="font-medium">{fmtBRL(clienteData.custoMultas)}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Vehicles Table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Title>Veículos do Cliente</Title>
                <Text className="text-slate-500">{clienteData.veiculosTable.length} veículos</Text>
              </div>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left font-semibold">Placa</th>
                    <th className="p-3 text-center font-semibold">Status</th>
                    <th className="p-3 text-right font-semibold">Valor Mensal</th>
                    <th className="p-3 text-right font-semibold">Custo Man.</th>
                    <th className="p-3 text-right font-semibold">Margem</th>
                    <th className="p-3 text-center font-semibold">Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {clienteData.veiculosTable.map((v, idx) => (
                    <tr key={idx} className="border-t hover:bg-slate-50">
                      <td className="p-3 font-mono font-medium">{v.placa}</td>
                      <td className="p-3 text-center">
                        <Badge color={v.status === 'Ativo' ? 'emerald' : 'slate'} size="sm">
                          {v.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">{fmtBRL(v.valorMensal)}</td>
                      <td className="p-3 text-right text-amber-600">{fmtBRL(v.custoManutencao)}</td>
                      <td className={`p-3 text-right font-medium ${v.margem >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmtBRL(v.margem)}
                      </td>
                      <td className="p-3 text-center">
                        {v.vencimento ? new Date(v.vencimento).toLocaleDateString('pt-BR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
