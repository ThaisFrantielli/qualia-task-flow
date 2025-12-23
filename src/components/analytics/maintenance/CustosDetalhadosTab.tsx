import { useMemo } from 'react';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, ComposedChart, Line } from 'recharts';
import { DollarSign, Wrench, Package } from 'lucide-react';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtBRL(v: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function fmtCompact(v: number): string { if (v >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`; if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`; return `R$ ${v.toFixed(0)}`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

interface CustosDetalhadosTabProps {
  manutencaoData: AnyObject[];
}

export default function CustosDetalhadosTab({ manutencaoData }: CustosDetalhadosTabProps) {
  const { filters } = useMaintenanceFilters();

  const filteredData = useMemo(() => {
    return manutencaoData.filter((r: AnyObject) => {
      if (filters.dateRange?.from && r.DataEntradaOficina) {
        const data = new Date(r.DataEntradaOficina);
        if (data < filters.dateRange.from) return false;
        if (filters.dateRange.to && data > filters.dateRange.to) return false;
      }
      if (filters.fornecedores.length > 0 && !filters.fornecedores.includes(r.Fornecedor)) return false;
      if (filters.tiposOcorrencia.length > 0 && !filters.tiposOcorrencia.includes(r.TipoOcorrencia)) return false;
      if (filters.clientes.length > 0 && !filters.clientes.includes(r.Cliente)) return false;
      if (filters.modelos.length > 0 && !filters.modelos.includes(r.Modelo)) return false;
      return true;
    });
  }, [manutencaoData, filters]);

  const kpis = useMemo(() => {
    const totalPecas = filteredData.reduce((s, r) => s + parseCurrency(r.CustoPecas), 0);
    const totalServicos = filteredData.reduce((s, r) => s + parseCurrency(r.CustoServicos), 0);
    const totalGeral = filteredData.reduce((s, r) => s + parseCurrency(r.CustoTotalOS), 0);
    const count = filteredData.length;

    return {
      totalPecas,
      totalServicos,
      totalGeral,
      avgPecas: count > 0 ? totalPecas / count : 0,
      avgServicos: count > 0 ? totalServicos / count : 0,
      percPecas: totalGeral > 0 ? (totalPecas / totalGeral) * 100 : 0,
      percServicos: totalGeral > 0 ? (totalServicos / totalGeral) * 100 : 0,
    };
  }, [filteredData]);

  const pieData = useMemo(() => {
    return [
      { name: 'Peças', value: kpis.totalPecas },
      { name: 'Serviços', value: kpis.totalServicos },
    ];
  }, [kpis]);

  const evolucaoMensal = useMemo(() => {
    const map: Record<string, { pecas: number; servicos: number }> = {};
    filteredData.forEach(r => {
      const k = getMonthKey(r.DataEntradaOficina);
      if (!k) return;
      if (!map[k]) map[k] = { pecas: 0, servicos: 0 };
      map[k].pecas += parseCurrency(r.CustoPecas);
      map[k].servicos += parseCurrency(r.CustoServicos);
    });

    return Object.keys(map)
      .sort()
      .slice(-12)
      .map(k => ({ mes: monthLabel(k), ...map[k] }));
  }, [filteredData]);

  const topVeiculosPecas = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      const placa = r.Placa || 'N/D';
      map[placa] = (map[placa] || 0) + parseCurrency(r.CustoPecas);
    });

    return Object.entries(map)
      .map(([placa, valor]) => ({ placa, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [filteredData]);

  const topVeiculosServicos = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(r => {
      const placa = r.Placa || 'N/D';
      map[placa] = (map[placa] || 0) + parseCurrency(r.CustoServicos);
    });

    return Object.entries(map)
      .map(([placa, valor]) => ({ placa, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [filteredData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="blue">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <Text>Custo Peças</Text>
          </div>
          <Metric>{fmtCompact(kpis.totalPecas)}</Metric>
          <Text className="text-xs text-slate-500">{kpis.percPecas.toFixed(1)}% do total</Text>
        </Card>
        <Card decoration="top" decorationColor="amber">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-600" />
            <Text>Custo Serviços</Text>
          </div>
          <Metric>{fmtCompact(kpis.totalServicos)}</Metric>
          <Text className="text-xs text-slate-500">{kpis.percServicos.toFixed(1)}% do total</Text>
        </Card>
        <Card decoration="top" decorationColor="emerald">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <Text>Custo Total</Text>
          </div>
          <Metric>{fmtCompact(kpis.totalGeral)}</Metric>
          <Text className="text-xs text-slate-500">Peças + Serviços</Text>
        </Card>
        <Card decoration="top" decorationColor="violet">
          <Text>Ticket Médio</Text>
          <Metric>{fmtBRL((kpis.avgPecas + kpis.avgServicos))}</Metric>
          <Text className="text-xs text-slate-500">Por OS</Text>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Title>Distribuição de Custos</Title>
          <Text className="text-xs text-slate-500 mb-4">Proporção entre peças e serviços</Text>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip formatter={fmtBRL} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <Title>Evolução Mensal</Title>
          <Text className="text-xs text-slate-500 mb-4">Custos de peças e serviços ao longo do tempo</Text>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={fmtCompact} />
                <Tooltip formatter={fmtBRL} />
                <Legend />
                <Bar dataKey="pecas" fill="#3b82f6" name="Peças" radius={[4, 4, 0, 0]} />
                <Bar dataKey="servicos" fill="#f59e0b" name="Serviços" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="pecas" stroke="#1e40af" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Title>Top 10 Veículos - Custo em Peças</Title>
          <div className="mt-4 space-y-2">
            {topVeiculosPecas.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-mono text-sm">{item.placa}</span>
                </div>
                <span className="font-bold text-blue-600">{fmtCompact(item.valor)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Title>Top 10 Veículos - Custo em Serviços</Title>
          <div className="mt-4 space-y-2">
            {topVeiculosServicos.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-amber-50 rounded">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-mono text-sm">{item.placa}</span>
                </div>
                <span className="font-bold text-amber-600">{fmtCompact(item.valor)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
